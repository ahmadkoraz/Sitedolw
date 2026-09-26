/**
 * @license
 * SITEFLOW Authoritative Attendance & Geofenced Timecard Service
 * Multi-tenant time entries under `/companies/{companyId}/timeEntries/{timeEntryId}`.
 * Authoritative timestamping via Firebase serverTimestamp().
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db, firebaseStatus } from '../firebaseApp';
import { handleFirestoreError, OperationType } from '../errorHandler';
import { auditService } from './auditService';
import { verifyGeofence } from '../../../utils/geofence';
import type {
  TimeEntry,
  TimeEntryStatus,
  LocationSnapshot,
  BreakEntry,
  JobSite,
  UserRole,
} from '../../../types';

const SANDBOX_TIME_ENTRIES_KEY = 'siteflow_sandbox_time_entries';

export const attendanceService = {
  /**
   * Clock In with purpose-limited GPS verification and server timestamp
   */
  async clockIn(params: {
    companyId: string;
    employeeId: string;
    userId: string;
    actorRole: UserRole | string;
    projectId: string;
    jobSite: JobSite;
    shiftId?: string;
    workerLocation: { latitude: number; longitude: number; accuracy: number };
    isSupervisorOverride?: boolean;
    overrideReason?: string;
    overriddenBy?: string;
    notes?: string;
  }): Promise<TimeEntry> {
    const { isWithin, distanceMeters } = verifyGeofence(
      params.workerLocation.latitude,
      params.workerLocation.longitude,
      params.jobSite.latitude,
      params.jobSite.longitude,
      params.jobSite.radiusMeters
    );

    // Geofence enforcement policy
    if (!isWithin && params.jobSite.enforceGeofence && !params.isSupervisorOverride) {
      // Record audit failure event
      await auditService.logEvent({
        companyId: params.companyId,
        actorUserId: params.userId,
        actorRole: params.actorRole,
        action: 'GEOFENCE_FAILED',
        resourceType: 'timeEntry',
        resourceId: params.jobSite.jobSiteId,
        metadata: {
          jobSiteName: params.jobSite.name,
          distanceMeters,
          radiusMeters: params.jobSite.radiusMeters,
          note: 'Clock in rejected: Device is outside required site geofence radius.',
        },
      });

      throw new Error(
        `Geofence verification failed. You are ${distanceMeters}m away from ${params.jobSite.name} (Site radius: ${params.jobSite.radiusMeters}m). A supervisor override is required to clock in off-site.`
      );
    }

    const timeEntryId = `time_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const nowIso = new Date().toISOString();

    const locationSnapshot: LocationSnapshot = {
      latitude: params.workerLocation.latitude,
      longitude: params.workerLocation.longitude,
      accuracyMeters: params.workerLocation.accuracy,
      isWithinGeofence: isWithin,
      distanceToSiteMeters: distanceMeters,
    };

    const initialStatus: TimeEntryStatus = !isWithin ? 'flagged' : 'clocked_in';

    const newEntry: TimeEntry = {
      timeEntryId,
      companyId: params.companyId,
      employeeId: params.employeeId,
      userId: params.userId,
      projectId: params.projectId,
      jobSiteId: params.jobSite.jobSiteId,
      shiftId: params.shiftId,
      clockInTime: nowIso,
      clockInServerTimestamp: db && firebaseStatus.isConfigured ? serverTimestamp() : nowIso,
      clockInLocation: locationSnapshot,
      breaks: [],
      status: initialStatus,
      totalWorkMinutes: 0,
      totalBreakMinutes: 0,
      isSupervisorOverride: Boolean(params.isSupervisorOverride),
      overrideReason: params.overrideReason,
      overriddenBy: params.overriddenBy,
      notes: params.notes,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${params.companyId}/timeEntries/${timeEntryId}`;
      try {
        const ref = doc(db, 'companies', params.companyId, 'timeEntries', timeEntryId);
        await setDoc(ref, newEntry);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_TIME_ENTRIES_KEY);
      const all: TimeEntry[] = raw ? JSON.parse(raw) : [];
      all.unshift(newEntry);
      localStorage.setItem(SANDBOX_TIME_ENTRIES_KEY, JSON.stringify(all));
    }

    // Audit log event
    await auditService.logEvent({
      companyId: params.companyId,
      actorUserId: params.userId,
      actorRole: params.actorRole,
      action: params.isSupervisorOverride ? 'SUPERVISOR_OVERRIDE' : 'CLOCK_IN',
      resourceType: 'timeEntry',
      resourceId: timeEntryId,
      after: {
        status: newEntry.status,
        jobSiteId: newEntry.jobSiteId,
        isWithinGeofence: isWithin,
        distanceMeters,
      },
      metadata: {
        jobSiteName: params.jobSite.name,
        isSupervisorOverride: params.isSupervisorOverride,
        overrideReason: params.overrideReason,
      },
    });

    return newEntry;
  },

  /**
   * Start a work break
   */
  async startBreak(params: {
    companyId: string;
    timeEntryId: string;
    userId: string;
    actorRole: UserRole | string;
    breakType: 'paid' | 'unpaid' | 'lunch';
  }): Promise<void> {
    const entry = await this.getTimeEntry(params.companyId, params.timeEntryId);
    if (!entry) throw new Error('Active attendance record not found.');
    if (entry.status !== 'clocked_in' && entry.status !== 'flagged') {
      throw new Error('Cannot start a break while not clocked in.');
    }

    const breakId = `brk_${Date.now()}`;
    const newBreak: BreakEntry = {
      breakId,
      type: params.breakType,
      startTime: new Date().toISOString(),
    };

    const updatedBreaks = [...entry.breaks, newBreak];
    const payload = {
      breaks: updatedBreaks,
      status: 'on_break' as TimeEntryStatus,
      updatedAt: new Date().toISOString(),
    };

    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${params.companyId}/timeEntries/${params.timeEntryId}`;
      try {
        const ref = doc(db, 'companies', params.companyId, 'timeEntries', params.timeEntryId);
        await updateDoc(ref, payload);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_TIME_ENTRIES_KEY);
      if (raw) {
        let all: TimeEntry[] = JSON.parse(raw);
        all = all.map((t) => (t.timeEntryId === params.timeEntryId ? { ...t, ...payload } : t));
        localStorage.setItem(SANDBOX_TIME_ENTRIES_KEY, JSON.stringify(all));
      }
    }

    await auditService.logEvent({
      companyId: params.companyId,
      actorUserId: params.userId,
      actorRole: params.actorRole,
      action: 'BREAK_START',
      resourceType: 'timeEntry',
      resourceId: params.timeEntryId,
      metadata: { breakType: params.breakType },
    });
  },

  /**
   * End the active break
   */
  async endBreak(params: {
    companyId: string;
    timeEntryId: string;
    userId: string;
    actorRole: UserRole | string;
  }): Promise<void> {
    const entry = await this.getTimeEntry(params.companyId, params.timeEntryId);
    if (!entry) throw new Error('Active attendance record not found.');
    if (entry.status !== 'on_break') {
      throw new Error('No active break in progress to end.');
    }

    const nowIso = new Date().toISOString();
    const updatedBreaks = entry.breaks.map((b) => {
      if (!b.endTime) {
        const startMs = new Date(b.startTime).getTime();
        const endMs = new Date(nowIso).getTime();
        const durationMinutes = Math.max(1, Math.round((endMs - startMs) / 60000));
        return { ...b, endTime: nowIso, durationMinutes };
      }
      return b;
    });

    const totalBreakMinutes = updatedBreaks.reduce(
      (acc, curr) => acc + (curr.durationMinutes || 0),
      0
    );

    const payload = {
      breaks: updatedBreaks,
      totalBreakMinutes,
      status: 'clocked_in' as TimeEntryStatus,
      updatedAt: nowIso,
    };

    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${params.companyId}/timeEntries/${params.timeEntryId}`;
      try {
        const ref = doc(db, 'companies', params.companyId, 'timeEntries', params.timeEntryId);
        await updateDoc(ref, payload);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_TIME_ENTRIES_KEY);
      if (raw) {
        let all: TimeEntry[] = JSON.parse(raw);
        all = all.map((t) => (t.timeEntryId === params.timeEntryId ? { ...t, ...payload } : t));
        localStorage.setItem(SANDBOX_TIME_ENTRIES_KEY, JSON.stringify(all));
      }
    }

    await auditService.logEvent({
      companyId: params.companyId,
      actorUserId: params.userId,
      actorRole: params.actorRole,
      action: 'BREAK_END',
      resourceType: 'timeEntry',
      resourceId: params.timeEntryId,
      metadata: { totalBreakMinutes },
    });
  },

  /**
   * Clock Out with purpose-limited GPS verification and total hours computation
   */
  async clockOut(params: {
    companyId: string;
    timeEntryId: string;
    userId: string;
    actorRole: UserRole | string;
    jobSite: JobSite;
    workerLocation?: { latitude: number; longitude: number; accuracy: number };
    notes?: string;
  }): Promise<void> {
    const entry = await this.getTimeEntry(params.companyId, params.timeEntryId);
    if (!entry) throw new Error('Active attendance record not found.');
    if (entry.status === 'clocked_out') {
      throw new Error('Shift is already clocked out.');
    }

    const nowIso = new Date().toISOString();

    // Close any unended break if open
    let updatedBreaks = [...entry.breaks];
    if (entry.status === 'on_break') {
      updatedBreaks = updatedBreaks.map((b) => {
        if (!b.endTime) {
          const startMs = new Date(b.startTime).getTime();
          const endMs = new Date(nowIso).getTime();
          const durationMinutes = Math.max(1, Math.round((endMs - startMs) / 60000));
          return { ...b, endTime: nowIso, durationMinutes };
        }
        return b;
      });
    }

    const totalBreakMinutes = updatedBreaks.reduce(
      (acc, curr) => acc + (curr.durationMinutes || 0),
      0
    );

    // Compute total elapsed working minutes (excluding breaks)
    const clockInMs = new Date(entry.clockInTime).getTime();
    const clockOutMs = new Date(nowIso).getTime();
    const totalElapsedMinutes = Math.max(0, Math.round((clockOutMs - clockInMs) / 60000));
    const totalWorkMinutes = Math.max(0, totalElapsedMinutes - totalBreakMinutes);

    let clockOutLocation: LocationSnapshot | undefined = undefined;
    if (params.workerLocation) {
      const { isWithin, distanceMeters } = verifyGeofence(
        params.workerLocation.latitude,
        params.workerLocation.longitude,
        params.jobSite.latitude,
        params.jobSite.longitude,
        params.jobSite.radiusMeters
      );
      clockOutLocation = {
        latitude: params.workerLocation.latitude,
        longitude: params.workerLocation.longitude,
        accuracyMeters: params.workerLocation.accuracy,
        isWithinGeofence: isWithin,
        distanceToSiteMeters: distanceMeters,
      };
    }

    const payload = {
      clockOutTime: nowIso,
      clockOutServerTimestamp: db && firebaseStatus.isConfigured ? serverTimestamp() : nowIso,
      clockOutLocation,
      breaks: updatedBreaks,
      totalBreakMinutes,
      totalWorkMinutes,
      status: 'clocked_out' as TimeEntryStatus,
      notes: params.notes || entry.notes,
      updatedAt: nowIso,
    };

    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${params.companyId}/timeEntries/${params.timeEntryId}`;
      try {
        const ref = doc(db, 'companies', params.companyId, 'timeEntries', params.timeEntryId);
        await updateDoc(ref, payload);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_TIME_ENTRIES_KEY);
      if (raw) {
        let all: TimeEntry[] = JSON.parse(raw);
        all = all.map((t) => (t.timeEntryId === params.timeEntryId ? { ...t, ...payload } : t));
        localStorage.setItem(SANDBOX_TIME_ENTRIES_KEY, JSON.stringify(all));
      }
    }

    await auditService.logEvent({
      companyId: params.companyId,
      actorUserId: params.userId,
      actorRole: params.actorRole,
      action: 'CLOCK_OUT',
      resourceType: 'timeEntry',
      resourceId: params.timeEntryId,
      after: { totalWorkMinutes, totalBreakMinutes },
    });
  },

  /**
   * Fetch a single time entry
   */
  async getTimeEntry(companyId: string, timeEntryId: string): Promise<TimeEntry | null> {
    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${companyId}/timeEntries/${timeEntryId}`;
      try {
        const ref = doc(db, 'companies', companyId, 'timeEntries', timeEntryId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          return snap.data() as TimeEntry;
        }
        return null;
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_TIME_ENTRIES_KEY);
      if (raw) {
        const all: TimeEntry[] = JSON.parse(raw);
        return all.find((t) => t.timeEntryId === timeEntryId) || null;
      }
      return null;
    }
  },

  /**
   * Retrieve active clock-in session for a specific employee
   */
  async getActiveTimeEntry(companyId: string, employeeId: string): Promise<TimeEntry | null> {
    const entries = await this.getTimeEntries(companyId, { employeeId });
    return (
      entries.find(
        (t) => t.status === 'clocked_in' || t.status === 'on_break' || t.status === 'flagged'
      ) || null
    );
  },

  /**
   * Fetch time entries with filtering
   */
  async getTimeEntries(
    companyId: string,
    filters?: {
      employeeId?: string;
      projectId?: string;
      jobSiteId?: string;
      status?: TimeEntryStatus;
    }
  ): Promise<TimeEntry[]> {
    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${companyId}/timeEntries`;
      try {
        const ref = collection(db, 'companies', companyId, 'timeEntries');
        const constraints = [];
        if (filters?.employeeId) constraints.push(where('employeeId', '==', filters.employeeId));
        if (filters?.projectId) constraints.push(where('projectId', '==', filters.projectId));
        if (filters?.jobSiteId) constraints.push(where('jobSiteId', '==', filters.jobSiteId));
        if (filters?.status) constraints.push(where('status', '==', filters.status));
        constraints.push(orderBy('clockInTime', 'desc'));

        const q = query(ref, ...constraints);
        const snap = await getDocs(q);
        return snap.docs.map((d) => d.data() as TimeEntry);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_TIME_ENTRIES_KEY);
      if (raw) {
        const all: TimeEntry[] = JSON.parse(raw);
        return all
          .filter((t) => {
            if (t.companyId !== companyId) return false;
            if (filters?.employeeId && t.employeeId !== filters.employeeId) return false;
            if (filters?.projectId && t.projectId !== filters.projectId) return false;
            if (filters?.jobSiteId && t.jobSiteId !== filters.jobSiteId) return false;
            if (filters?.status && t.status !== filters.status) return false;
            return true;
          })
          .sort((a, b) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime());
      }
      return [];
    }
  },

  /**
   * Manual correction / supervisor adjustment of time records
   */
  async updateTimeEntryManual(params: {
    companyId: string;
    timeEntryId: string;
    editorUserId: string;
    editorRole: UserRole | string;
    updates: Partial<Pick<TimeEntry, 'clockInTime' | 'clockOutTime' | 'totalWorkMinutes' | 'notes' | 'status'>>;
    reason: string;
  }): Promise<void> {
    const existing = await this.getTimeEntry(params.companyId, params.timeEntryId);
    if (!existing) throw new Error('Time entry record not found.');

    const payload = {
      ...params.updates,
      isSupervisorOverride: true,
      overrideReason: params.reason,
      overriddenBy: params.editorUserId,
      updatedAt: new Date().toISOString(),
    };

    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${params.companyId}/timeEntries/${params.timeEntryId}`;
      try {
        const ref = doc(db, 'companies', params.companyId, 'timeEntries', params.timeEntryId);
        await updateDoc(ref, payload);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_TIME_ENTRIES_KEY);
      if (raw) {
        let all: TimeEntry[] = JSON.parse(raw);
        all = all.map((t) => (t.timeEntryId === params.timeEntryId ? { ...t, ...payload } : t));
        localStorage.setItem(SANDBOX_TIME_ENTRIES_KEY, JSON.stringify(all));
      }
    }

    await auditService.logEvent({
      companyId: params.companyId,
      actorUserId: params.editorUserId,
      actorRole: params.editorRole,
      action: 'ATTENDANCE_EDITED',
      resourceType: 'timeEntry',
      resourceId: params.timeEntryId,
      before: {
        clockInTime: existing.clockInTime,
        clockOutTime: existing.clockOutTime,
        totalWorkMinutes: existing.totalWorkMinutes,
        status: existing.status,
      },
      after: payload,
      metadata: { reason: params.reason },
    });
  },
};
