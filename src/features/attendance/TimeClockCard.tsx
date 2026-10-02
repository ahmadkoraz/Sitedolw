import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { projectService } from '../../services/firebase/firestore/projectService';
import { jobSiteService } from '../../services/firebase/firestore/jobSiteService';
import { attendanceService } from '../../services/firebase/firestore/attendanceService';
import { employeeService } from '../../services/firebase/firestore/employeeService';
import {
  getPurposeLimitedPosition,
  verifyGeofence,
  formatDistance,
} from '../../utils/geofence';
import type { Project, JobSite, TimeEntry, Employee } from '../../types';
import {
  Clock,
  MapPin,
  Play,
  Square,
  Coffee,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Loader2,
  ShieldAlert,
  Info,
  Building,
} from 'lucide-react';

interface TimeClockCardProps {
  onAttendanceChanged?: () => void;
}

export const TimeClockCard: React.FC<TimeClockCardProps> = ({ onAttendanceChanged }) => {
  const { user, userProfile, company, role } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [jobSites, setJobSites] = useState<JobSite[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedJobSiteId, setSelectedJobSiteId] = useState('');

  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [clockActionLoading, setClockActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // GPS State
  const [gpsLoading, setGpsLoading] = useState(false);
  const [currentGps, setCurrentGps] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Supervisor override modal
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [shiftNotes, setShiftNotes] = useState('');

  // 1. Load active time entry and available projects/sites
  const loadInitialData = useCallback(async () => {
    if (!company || !userProfile || !user) return;
    setLoading(true);
    try {
      const [projList, siteList, empRecord] = await Promise.all([
        projectService.getProjectsByCompany(company.companyId),
        jobSiteService.getJobSitesByCompany(company.companyId),
        employeeService.getEmployeeByUserId(company.companyId, user.uid),
      ]);

      setCurrentEmployee(empRecord);
      const effectiveEmpId = empRecord?.employeeId || userProfile.uid;
      const currentActive = await attendanceService.getActiveTimeEntry(company.companyId, {
        userId: user.uid,
        employeeId: effectiveEmpId,
      });

      setProjects(projList);
      setJobSites(siteList);
      setActiveEntry(currentActive);

      if (currentActive) {
        setSelectedProjectId(currentActive.projectId);
        setSelectedJobSiteId(currentActive.jobSiteId);
      } else if (siteList.length > 0) {
        setSelectedJobSiteId(siteList[0].jobSiteId);
        setSelectedProjectId(siteList[0].projectId || projList[0]?.projectId || '');
      }
    } catch (err) {
      console.error('Failed to load attendance prerequisites:', err);
    } finally {
      setLoading(false);
    }
  }, [company, userProfile, user]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // 2. Live Elapsed Shift Timer
  useEffect(() => {
    if (!activeEntry || activeEntry.status === 'clocked_out') {
      setElapsedSeconds(0);
      return;
    }

    const calculateElapsed = () => {
      const startMs = new Date(activeEntry.clockInTime).getTime();
      const nowMs = Date.now();
      const diffSecs = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      setElapsedSeconds(diffSecs);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeEntry]);

  // 3. Acquire purpose-limited GPS coordinates for site verification
  const checkCurrentLocation = async () => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const pos = await getPurposeLimitedPosition();
      setCurrentGps(pos);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to acquire GPS location.';
      setGpsError(msg);
    } finally {
      setGpsLoading(false);
    }
  };

  const selectedSite = jobSites.find((s) => s.jobSiteId === selectedJobSiteId);

  // Compute geofence status if coordinates are available
  const geofenceStatus =
    currentGps && selectedSite
      ? verifyGeofence(
          currentGps.latitude,
          currentGps.longitude,
          selectedSite.latitude,
          selectedSite.longitude,
          selectedSite.radiusMeters
        )
      : null;

  // Handle Clock In
  const handleClockIn = async (isOverride = false) => {
    if (!company || !user || !userProfile) return;
    if (!selectedSite) {
      setError('Please select a valid job site to clock in.');
      return;
    }

    setError(null);
    setClockActionLoading(true);

    try {
      // 1. Purpose-limited GPS acquisition
      let gps = currentGps;
      if (!gps) {
        gps = await getPurposeLimitedPosition();
        setCurrentGps(gps);
      }

      // 2. Clock in service call
      const entry = await attendanceService.clockIn({
        companyId: company.companyId,
        employeeId: currentEmployee?.employeeId || userProfile.uid,
        userId: user.uid,
        actorRole: role || 'EMPLOYEE',
        projectId: selectedProjectId || selectedSite.projectId,
        jobSite: selectedSite,
        workerLocation: gps,
        isSupervisorOverride: isOverride,
        overrideReason: isOverride ? overrideReason : undefined,
        overriddenBy: isOverride ? user.uid : undefined,
      });

      setActiveEntry(entry);
      setShowOverrideModal(false);
      setOverrideReason('');
      if (onAttendanceChanged) onAttendanceChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to clock in.';
      setError(msg);
      if (msg.includes('Geofence verification failed') && selectedSite.enforceGeofence) {
        setShowOverrideModal(true);
      }
    } finally {
      setClockActionLoading(false);
    }
  };

  // Handle Start Break
  const handleStartBreak = async (breakType: 'paid' | 'unpaid' | 'lunch') => {
    if (!company || !user || !activeEntry) return;
    setError(null);
    setClockActionLoading(true);
    try {
      await attendanceService.startBreak({
        companyId: company.companyId,
        timeEntryId: activeEntry.timeEntryId,
        userId: user.uid,
        actorRole: role || 'EMPLOYEE',
        breakType,
      });
      await loadInitialData();
      if (onAttendanceChanged) onAttendanceChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start break.');
    } finally {
      setClockActionLoading(false);
    }
  };

  // Handle End Break
  const handleEndBreak = async () => {
    if (!company || !user || !activeEntry) return;
    setError(null);
    setClockActionLoading(true);
    try {
      await attendanceService.endBreak({
        companyId: company.companyId,
        timeEntryId: activeEntry.timeEntryId,
        userId: user.uid,
        actorRole: role || 'EMPLOYEE',
      });
      await loadInitialData();
      if (onAttendanceChanged) onAttendanceChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end break.');
    } finally {
      setClockActionLoading(false);
    }
  };

  // Handle Clock Out
  const handleClockOut = async () => {
    if (!company || !user || !activeEntry || !selectedSite) return;
    setError(null);
    setClockActionLoading(true);

    try {
      let gps = currentGps;
      try {
        gps = await getPurposeLimitedPosition();
      } catch (e) {
        console.warn('Clock out position capture skipped or timed out:', e);
      }

      await attendanceService.clockOut({
        companyId: company.companyId,
        timeEntryId: activeEntry.timeEntryId,
        userId: user.uid,
        actorRole: role || 'EMPLOYEE',
        jobSite: selectedSite,
        workerLocation: gps || undefined,
        notes: shiftNotes.trim() || undefined,
      });

      setActiveEntry(null);
      setShiftNotes('');
      setCurrentGps(null);
      await loadInitialData();
      if (onAttendanceChanged) onAttendanceChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clock out.');
    } finally {
      setClockActionLoading(false);
    }
  };

  // Format Timer HH:MM:SS
  const formatTimer = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-xl p-8 text-center text-[#A0A0A0] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-[#F5C400] animate-spin" />
        <span className="text-xs uppercase tracking-wider font-semibold">Initializing Time Clock...</span>
      </div>
    );
  }

  const isClockedIn = Boolean(activeEntry && activeEntry.status === 'clocked_in');
  const isOnBreak = Boolean(activeEntry && activeEntry.status === 'on_break');
  const isFlagged = Boolean(activeEntry && activeEntry.status === 'flagged');

  return (
    <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Top Industrial Accent Bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#F5C400] via-amber-400 to-[#F5C400]" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider ${
                isOnBreak
                  ? 'bg-amber-500/20 text-[#F5C400] border border-[#F5C400]/40'
                  : isClockedIn || isFlagged
                  ? 'bg-[#2E9B5B]/20 text-[#2E9B5B] border border-[#2E9B5B]/40'
                  : 'bg-[#333333] text-[#A0A0A0]'
              }`}
            >
              {isOnBreak
                ? 'ON BREAK'
                : isFlagged
                ? 'CLOCKED IN (FLAGGED)'
                : isClockedIn
                ? 'CLOCKED IN'
                : 'OFF SHIFT'}
            </span>
            <span className="text-xs text-[#A0A0A0] font-mono">
              Server Time: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-[#F5C400]" />
            Field Time Clock
          </h2>
        </div>

        {/* Live Shift Stopwatch */}
        <div className="bg-[#111111] border border-[#2C2C2C] rounded-lg px-5 py-3 text-center sm:text-right shadow-inner">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#777777] block mb-0.5">
            Shift Elapsed Time
          </span>
          <span className="font-mono text-2xl sm:text-3xl font-black text-[#F5C400] tracking-wider block">
            {formatTimer(elapsedSeconds)}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-5 p-3.5 bg-[#D92D20]/15 border border-[#D92D20]/40 rounded-lg text-xs text-[#D92D20] flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Project & Job Site Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1.5 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-[#F5C400]" />
            Assigned Project
          </label>
          <select
            disabled={isClockedIn || isOnBreak}
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              // auto-filter site
              const matchingSites = jobSites.filter((s) => s.projectId === e.target.value);
              if (matchingSites.length > 0) setSelectedJobSiteId(matchingSites[0].jobSiteId);
            }}
            className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3.5 py-2.5 text-xs font-medium text-white focus:outline-none focus:border-[#F5C400] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {projects.length === 0 && <option value="">No projects registered</option>}
            {projects.map((p) => (
              <option key={p.projectId} value={p.projectId}>
                {p.code} &mdash; {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#F5C400]" />
            Target Job Site & Geofence
          </label>
          <select
            disabled={isClockedIn || isOnBreak}
            value={selectedJobSiteId}
            onChange={(e) => setSelectedJobSiteId(e.target.value)}
            className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3.5 py-2.5 text-xs font-medium text-white focus:outline-none focus:border-[#F5C400] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {jobSites.length === 0 && <option value="">No job sites configured</option>}
            {jobSites.map((s) => (
              <option key={s.jobSiteId} value={s.jobSiteId}>
                {s.name} ({s.radiusMeters}m radius)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Purpose-Limited GPS Geofence Verification Status Box */}
      {selectedSite && (
        <div className="mb-6 p-4 bg-[#141414] border border-[#2A2A2A] rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222222]">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-[#F5C400]" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                GPS Site Verification
              </span>
              {selectedSite.enforceGeofence && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-[#F5C400] border border-[#F5C400]/30">
                  Enforced
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={checkCurrentLocation}
              disabled={gpsLoading}
              className="text-xs text-[#F5C400] hover:underline font-semibold flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              {gpsLoading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" /> Acquiring GPS...
                </>
              ) : (
                'Verify GPS Position'
              )}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="text-[#A0A0A0]">
              <span className="text-white font-medium">{selectedSite.name}: </span>
              {selectedSite.address}, {selectedSite.city}
            </div>

            {geofenceStatus ? (
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold ${
                  geofenceStatus.isWithin
                    ? 'bg-[#2E9B5B]/20 text-[#2E9B5B] border border-[#2E9B5B]/40'
                    : 'bg-[#D92D20]/20 text-[#D92D20] border border-[#D92D20]/40'
                }`}
              >
                {geofenceStatus.isWithin ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified: Inside Site ({formatDistance(geofenceStatus.distanceMeters)})
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Outside Geofence: {formatDistance(geofenceStatus.distanceMeters)} away
                  </>
                )}
              </div>
            ) : (
              <span className="text-[11px] text-[#666666] italic flex items-center gap-1">
                <Info className="w-3 h-3" />
                GPS will be captured at the moment of Clock In for verification.
              </span>
            )}
          </div>

          {gpsError && (
            <p className="mt-2 text-xs text-[#D92D20]">{gpsError}</p>
          )}
        </div>
      )}

      {/* BIG FIELD ACTION BUTTONS (Glove-Friendly) */}
      {!isClockedIn && !isOnBreak ? (
        <div>
          <button
            onClick={() => handleClockIn(false)}
            disabled={clockActionLoading || jobSites.length === 0}
            className="w-full py-5 bg-[#F5C400] hover:bg-[#e0b400] active:scale-[0.99] text-black font-black text-lg uppercase tracking-wider rounded-lg transition shadow-xl shadow-[#F5C400]/20 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {clockActionLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Play className="w-6 h-6 fill-current" />
                Clock In to Job Site
              </>
            )}
          </button>
          <p className="text-center text-[11px] text-[#666666] uppercase tracking-wider mt-2.5">
            Purpose-limited GPS coordinates are captured at clock event &bull; No continuous tracking
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Break Toggle */}
            {isOnBreak ? (
              <button
                onClick={handleEndBreak}
                disabled={clockActionLoading}
                className="py-4 bg-[#2E9B5B] hover:bg-[#26844d] active:scale-[0.99] text-white font-bold text-sm uppercase tracking-wider rounded-lg transition shadow-lg shadow-[#2E9B5B]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {clockActionLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    End Break & Resume Work
                  </>
                )}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => handleStartBreak('lunch')}
                  disabled={clockActionLoading}
                  className="flex-1 py-4 bg-[#252525] hover:bg-[#303030] text-white border border-[#3C3C3C] font-bold text-xs uppercase tracking-wider rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Coffee className="w-4 h-4 text-[#F5C400]" />
                  Lunch Break
                </button>
                <button
                  onClick={() => handleStartBreak('paid')}
                  disabled={clockActionLoading}
                  className="flex-1 py-4 bg-[#252525] hover:bg-[#303030] text-white border border-[#3C3C3C] font-bold text-xs uppercase tracking-wider rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Coffee className="w-4 h-4 text-[#2E9B5B]" />
                  15m Rest Break
                </button>
              </div>
            )}

            {/* Clock Out */}
            <button
              onClick={handleClockOut}
              disabled={clockActionLoading}
              className="py-4 bg-[#D92D20] hover:bg-[#b8251a] active:scale-[0.99] text-white font-black text-sm uppercase tracking-wider rounded-lg transition shadow-lg shadow-[#D92D20]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {clockActionLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Square className="w-5 h-5 fill-current" />
                  Clock Out & End Shift
                </>
              )}
            </button>
          </div>

          <div>
            <input
              type="text"
              value={shiftNotes}
              onChange={(e) => setShiftNotes(e.target.value)}
              placeholder="Optional shift notes / work completed (e.g. Framing second floor completed)"
              className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-xs text-white placeholder-[#555555] focus:outline-none focus:border-[#F5C400]"
            />
          </div>
        </div>
      )}

      {/* Supervisor Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#1C1C1C] border border-[#F5C400]/40 rounded-lg max-w-md w-full p-6 text-white shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#F5C400]/20 border border-[#F5C400]/40 flex items-center justify-center text-[#F5C400]">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold uppercase tracking-tight text-white">
                  Geofence Supervisor Override
                </h3>
                <p className="text-xs text-[#A0A0A0]">Worker is located outside designated site radius</p>
              </div>
            </div>

            <p className="text-xs text-[#A0A0A0] leading-relaxed mb-4">
              Attendance at <strong>{selectedSite?.name}</strong> strictly enforces geofencing. To proceed with an off-site clock-in, a verified operational reason must be supplied for compliance and audit logging.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-white mb-1.5">
                Override Justification <span className="text-[#F5C400]">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="E.g. Dispatched to pick up structural lumber; off-site staging area authorized by Superintendent."
                className="w-full bg-[#111111] border border-[#333333] rounded p-2.5 text-xs text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#2C2C2C]">
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="px-4 py-2 bg-[#252525] hover:bg-[#303030] text-xs font-semibold text-white rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!overrideReason.trim() || clockActionLoading}
                onClick={() => handleClockIn(true)}
                className="px-5 py-2 bg-[#F5C400] hover:bg-[#e0b400] text-black text-xs font-bold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {clockActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Authorize Override & Clock In'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
