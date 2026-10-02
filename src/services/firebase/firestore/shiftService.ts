/**
 * @license
 * SITEFLOW Shift & Scheduling Service
 * Multi-tenant shift store under `/companies/{companyId}/shifts/{shiftId}`.
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
} from 'firebase/firestore';
import { db, firebaseStatus } from '../firebaseApp';
import { handleFirestoreError, OperationType } from '../errorHandler';
import type { Shift, ShiftStatus } from '../../../types';

const SANDBOX_SHIFTS_KEY = 'siteflow_sandbox_shifts';

export const shiftService = {
  /**
   * Fetch shifts for a company tenant with optional filters
   */
  async getShiftsByCompany(
    companyId: string,
    filters?: {
      employeeId?: string;
      assignedUserId?: string;
      projectId?: string;
      jobSiteId?: string;
      status?: ShiftStatus;
    }
  ): Promise<Shift[]> {
    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${companyId}/shifts`;
      try {
        const ref = collection(db, 'companies', companyId, 'shifts');
        const constraints = [];
        if (filters?.assignedUserId) constraints.push(where('assignedUserId', '==', filters.assignedUserId));
        if (filters?.employeeId) constraints.push(where('employeeId', '==', filters.employeeId));
        if (filters?.projectId) constraints.push(where('projectId', '==', filters.projectId));
        if (filters?.jobSiteId) constraints.push(where('jobSiteId', '==', filters.jobSiteId));
        if (filters?.status) constraints.push(where('status', '==', filters.status));
        constraints.push(orderBy('startTime', 'asc'));

        const q = query(ref, ...constraints);
        const snap = await getDocs(q);
        return snap.docs.map((d) => d.data() as Shift);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_SHIFTS_KEY);
      if (raw) {
        const all: Shift[] = JSON.parse(raw);
        return all
          .filter((s) => {
            if (s.companyId !== companyId) return false;
            if (filters?.assignedUserId && s.assignedUserId !== filters.assignedUserId) return false;
            if (filters?.employeeId && s.employeeId !== filters.employeeId) return false;
            if (filters?.projectId && s.projectId !== filters.projectId) return false;
            if (filters?.jobSiteId && s.jobSiteId !== filters.jobSiteId) return false;
            if (filters?.status && s.status !== filters.status) return false;
            return true;
          })
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      }
      return [];
    }
  },

  /**
   * Fetch a single shift
   */
  async getShift(companyId: string, shiftId: string): Promise<Shift | null> {
    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${companyId}/shifts/${shiftId}`;
      try {
        const ref = doc(db, 'companies', companyId, 'shifts', shiftId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          return snap.data() as Shift;
        }
        return null;
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
      }
    } else {
      const shifts = await this.getShiftsByCompany(companyId);
      return shifts.find((s) => s.shiftId === shiftId) || null;
    }
  },

  /**
   * Create a scheduled shift
   */
  async createShift(companyId: string, shiftData: Shift): Promise<void> {
    if (!shiftData.employeeId?.trim()) throw new Error('Worker assignment is required for shift.');
    if (!shiftData.projectId?.trim()) throw new Error('Project selection is required for shift.');
    if (!shiftData.jobSiteId?.trim()) throw new Error('Job site selection is required for shift.');
    if (!shiftData.startTime || !shiftData.endTime) {
      throw new Error('Shift start and end times are required.');
    }
    const startMs = new Date(shiftData.startTime).getTime();
    const endMs = new Date(shiftData.endTime).getTime();
    if (isNaN(startMs) || isNaN(endMs)) {
      throw new Error('Shift start and end times must be valid ISO date strings.');
    }
    if (startMs >= endMs) {
      throw new Error('Shift start time must be chronologically earlier than shift end time.');
    }
    if (!shiftData.assignedBy?.trim()) {
      throw new Error('Operator identity (UID) is required to assign a shift.');
    }
    const validStatuses: ShiftStatus[] = ['scheduled', 'in_progress', 'completed', 'cancelled', 'absent'];
    if (!validStatuses.includes(shiftData.status)) {
      throw new Error(`Invalid shift status '${shiftData.status}'. Must be one of: ${validStatuses.join(', ')}`);
    }

    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${companyId}/shifts/${shiftData.shiftId}`;
      try {
        const ref = doc(db, 'companies', companyId, 'shifts', shiftData.shiftId);
        const cleanData = Object.fromEntries(
          Object.entries(shiftData).filter(([_, v]) => v !== undefined)
        );
        await setDoc(ref, cleanData);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_SHIFTS_KEY);
      const all: Shift[] = raw ? JSON.parse(raw) : [];
      all.push(shiftData);
      localStorage.setItem(SANDBOX_SHIFTS_KEY, JSON.stringify(all));
    }
  },

  /**
   * Update a shift
   */
  async updateShift(
    companyId: string,
    shiftId: string,
    updates: Partial<Omit<Shift, 'shiftId' | 'companyId' | 'createdAt'>>
  ): Promise<void> {
    if (updates.status) {
      const validStatuses: ShiftStatus[] = ['scheduled', 'in_progress', 'completed', 'cancelled', 'absent'];
      if (!validStatuses.includes(updates.status)) {
        throw new Error(`Invalid shift status '${updates.status}'. Must be one of: ${validStatuses.join(', ')}`);
      }
    }
    if (updates.startTime && updates.endTime) {
      const startMs = new Date(updates.startTime).getTime();
      const endMs = new Date(updates.endTime).getTime();
      if (startMs >= endMs) {
        throw new Error('Shift start time must be chronologically earlier than shift end time.');
      }
    }

    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${companyId}/shifts/${shiftId}`;
      try {
        const ref = doc(db, 'companies', companyId, 'shifts', shiftId);
        const cleanPayload = Object.fromEntries(
          Object.entries(payload).filter(([_, v]) => v !== undefined)
        );
        await updateDoc(ref, cleanPayload);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_SHIFTS_KEY);
      if (raw) {
        let all: Shift[] = JSON.parse(raw);
        all = all.map((s) => (s.shiftId === shiftId ? { ...s, ...payload } : s));
        localStorage.setItem(SANDBOX_SHIFTS_KEY, JSON.stringify(all));
      }
    }
  },

  /**
   * Update shift status (e.g., 'completed', 'cancelled')
   */
  async setShiftStatus(companyId: string, shiftId: string, status: ShiftStatus): Promise<void> {
    return this.updateShift(companyId, shiftId, { status });
  },
};
