import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { attendanceService } from '../../services/firebase/firestore/attendanceService';
import { employeeService } from '../../services/firebase/firestore/employeeService';
import { projectService } from '../../services/firebase/firestore/projectService';
import { jobSiteService } from '../../services/firebase/firestore/jobSiteService';
import { formatDistance } from '../../utils/geofence';
import type { TimeEntry, Employee, Project, JobSite } from '../../types';
import {
  Clock,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Edit2,
  RefreshCw,
  Loader2,
  Building,
  User,
  X,
  Save,
} from 'lucide-react';

interface AttendanceHistoryProps {
  allowManualEdit?: boolean;
}

export const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({
  allowManualEdit = true,
}) => {
  const { user, userProfile, company, isAdmin, isSuperAdmin, role } = useAuth();

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [jobSites, setJobSites] = useState<JobSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedWorkerId, setSelectedWorkerId] = useState('all');
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Manual Adjustment Modal
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editClockIn, setEditClockIn] = useState('');
  const [editClockOut, setEditClockOut] = useState('');
  const [editWorkMinutes, setEditWorkMinutes] = useState(0);
  const [editReason, setEditReason] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const isSupervisorOrAdmin =
    isAdmin || isSuperAdmin || role === 'SUPERVISOR' || role === 'PROJECT_MANAGER';

  const loadData = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    setError(null);
    try {
      const [allEntries, allEmployees, allProjects, allSites] = await Promise.all([
        // If regular employee, only load their own records
        isSupervisorOrAdmin
          ? attendanceService.getTimeEntries(company.companyId)
          : attendanceService.getTimeEntries(company.companyId, { employeeId: userProfile?.uid }),
        employeeService.getEmployeesByCompany(company.companyId),
        projectService.getProjectsByCompany(company.companyId),
        jobSiteService.getJobSitesByCompany(company.companyId),
      ]);

      setEntries(allEntries);
      setEmployees(allEmployees);
      setProjects(allProjects);
      setJobSites(allSites);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance records.');
    } finally {
      setLoading(false);
    }
  }, [company, isSupervisorOrAdmin, userProfile?.uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Lookup Maps
  const employeeMap = useMemo(() => new Map(employees.map((e) => [e.userId || e.employeeId, e])), [employees]);
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.projectId, p])), [projects]);
  const jobSiteMap = useMemo(() => new Map(jobSites.map((s) => [s.jobSiteId, s])), [jobSites]);

  // Filtered Entries
  const filteredEntries = useMemo(() => {
    return entries.filter((t) => {
      if (selectedWorkerId !== 'all' && t.employeeId !== selectedWorkerId) return false;
      if (selectedProjectId !== 'all' && t.projectId !== selectedProjectId) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const emp = employeeMap.get(t.employeeId);
        const site = jobSiteMap.get(t.jobSiteId);
        const nameMatch = emp ? `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) : false;
        const siteMatch = site ? site.name.toLowerCase().includes(q) : false;
        if (!nameMatch && !siteMatch) return false;
      }

      return true;
    });
  }, [entries, selectedWorkerId, selectedProjectId, statusFilter, searchQuery, employeeMap, jobSiteMap]);

  const handleOpenEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditClockIn(entry.clockInTime ? entry.clockInTime.slice(0, 16) : '');
    setEditClockOut(entry.clockOutTime ? entry.clockOutTime.slice(0, 16) : '');
    setEditWorkMinutes(entry.totalWorkMinutes);
    setEditReason('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !user || !editingEntry || !userProfile) return;
    if (!editReason.trim()) {
      setError('A mandatory reason is required for manual time adjustments.');
      return;
    }

    setSavingEdit(true);
    try {
      await attendanceService.updateTimeEntryManual({
        companyId: company.companyId,
        timeEntryId: editingEntry.timeEntryId,
        editorUserId: user.uid,
        editorRole: role || 'SUPERVISOR',
        reason: editReason.trim(),
        updates: {
          clockInTime: editClockIn ? new Date(editClockIn).toISOString() : editingEntry.clockInTime,
          clockOutTime: editClockOut ? new Date(editClockOut).toISOString() : editingEntry.clockOutTime,
          totalWorkMinutes: Number(editWorkMinutes),
        },
      });

      setEditingEntry(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update time entry.');
    } finally {
      setSavingEdit(false);
    }
  };

  const formatHoursMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-tight text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#F5C400]" />
            {isSupervisorOrAdmin ? 'Workforce Attendance & Timecards' : 'My Shift History'}
          </h2>
          <p className="text-xs text-[#A0A0A0] mt-1">
            Authoritative time records, geofence audit compliance, and break logs
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="px-3 py-2 bg-[#252525] hover:bg-[#303030] text-white text-xs font-semibold rounded cursor-pointer transition flex items-center gap-1.5 self-start sm:self-auto border border-[#3C3C3C]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#F5C400]' : ''}`} />
          Refresh Records
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-[#D92D20]/15 border border-[#D92D20]/40 rounded-lg text-xs text-[#D92D20] flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-[#A0A0A0] absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by worker name or job site..."
            className="w-full bg-[#111111] border border-[#2C2C2C] rounded pl-9 pr-3 py-2 text-xs text-white placeholder-[#555555] focus:outline-none focus:border-[#F5C400]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isSupervisorOrAdmin && (
            <select
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              className="bg-[#111111] border border-[#2C2C2C] rounded px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#F5C400]"
            >
              <option value="all">All Workers</option>
              {employees.map((emp) => (
                <option key={emp.employeeId} value={emp.userId || emp.employeeId}>
                  {emp.firstName} {emp.lastName} ({emp.employeeNumber})
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-[#111111] border border-[#2C2C2C] rounded px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#F5C400]"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.projectId} value={p.projectId}>
                {p.code} &mdash; {p.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#111111] border border-[#2C2C2C] rounded px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#F5C400]"
          >
            <option value="all">All Statuses</option>
            <option value="clocked_in">Clocked In</option>
            <option value="on_break">On Break</option>
            <option value="clocked_out">Clocked Out</option>
            <option value="flagged">Flagged Geofence</option>
          </select>
        </div>
      </div>

      {/* Timecards List */}
      <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-[#A0A0A0] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[#F5C400] animate-spin" />
            <span className="text-xs uppercase tracking-wider font-semibold">Loading Timecards...</span>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-16 text-center text-[#777777] px-4">
            <Clock className="w-12 h-12 mx-auto text-[#444444] mb-2" />
            <p className="text-xs uppercase tracking-wider font-semibold text-white mb-1">
              No Attendance Records Found
            </p>
            <p className="text-xs text-[#666666]">
              {searchQuery || statusFilter !== 'all' || selectedWorkerId !== 'all'
                ? 'No records match your selected filters.'
                : 'No shifts have been clocked in yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#151515] border-b border-[#2C2C2C] text-[#A0A0A0] uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Worker</th>
                  <th className="py-3 px-4">Job Site & Project</th>
                  <th className="py-3 px-4">Clock In (GPS)</th>
                  <th className="py-3 px-4">Clock Out</th>
                  <th className="py-3 px-4">Breaks</th>
                  <th className="py-3 px-4">Net Work Time</th>
                  <th className="py-3 px-4">Status</th>
                  {isSupervisorOrAdmin && allowManualEdit && (
                    <th className="py-3 px-4 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252525]">
                {filteredEntries.map((entry) => {
                  const emp = employeeMap.get(entry.employeeId);
                  const project = projectMap.get(entry.projectId);
                  const site = jobSiteMap.get(entry.jobSiteId);

                  const clockInDate = new Date(entry.clockInTime);
                  const clockOutDate = entry.clockOutTime ? new Date(entry.clockOutTime) : null;

                  return (
                    <tr key={entry.timeEntryId} className="hover:bg-[#222222] transition-colors">
                      {/* Worker */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#111111] border border-[#333333] flex items-center justify-center font-bold text-[10px] text-[#A0A0A0] shrink-0">
                            {emp ? `${emp.firstName[0]}${emp.lastName[0]}` : 'U'}
                          </div>
                          <div>
                            <div className="font-semibold text-white">
                              {emp ? `${emp.firstName} ${emp.lastName}` : entry.employeeId}
                            </div>
                            <div className="text-[10px] text-[#777777] font-mono">
                              {emp?.employeeNumber || 'WORKER'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Site & Project */}
                      <td className="py-3.5 px-4">
                        <div className="text-white font-medium">{site?.name || 'Job Site'}</div>
                        <div className="text-[11px] text-[#A0A0A0] flex items-center gap-1">
                          <Building className="w-3 h-3 text-[#F5C400]" />
                          {project ? `${project.code}` : 'General Project'}
                        </div>
                      </td>

                      {/* Clock In */}
                      <td className="py-3.5 px-4">
                        <div className="text-white font-mono font-medium">
                          {clockInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[10px] text-[#777777]">
                          {clockInDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </div>
                        {entry.clockInLocation && (
                          <div className="mt-1">
                            {entry.clockInLocation.isWithinGeofence ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-[#2E9B5B]">
                                <CheckCircle2 className="w-3 h-3" />
                                On Site ({formatDistance(entry.clockInLocation.distanceToSiteMeters)})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] text-[#D92D20] font-semibold">
                                <ShieldAlert className="w-3 h-3" />
                                Outside ({formatDistance(entry.clockInLocation.distanceToSiteMeters)})
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Clock Out */}
                      <td className="py-3.5 px-4">
                        {clockOutDate ? (
                          <>
                            <div className="text-white font-mono font-medium">
                              {clockOutDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-[10px] text-[#777777]">
                              {clockOutDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </div>
                          </>
                        ) : (
                          <span className="text-amber-400 font-mono text-[11px] animate-pulse">
                            &bull; Active
                          </span>
                        )}
                      </td>

                      {/* Breaks */}
                      <td className="py-3.5 px-4 font-mono text-[#A0A0A0]">
                        {entry.totalBreakMinutes > 0 ? (
                          <span>{entry.totalBreakMinutes} min</span>
                        ) : (
                          <span className="text-[#555555]">0 min</span>
                        )}
                      </td>

                      {/* Net Work Time */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-white font-bold text-xs">
                          {formatHoursMinutes(entry.totalWorkMinutes)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              entry.status === 'clocked_in'
                                ? 'bg-[#2E9B5B]/15 text-[#2E9B5B] border border-[#2E9B5B]/30'
                                : entry.status === 'on_break'
                                ? 'bg-amber-500/15 text-[#F5C400] border border-[#F5C400]/30'
                                : entry.status === 'flagged'
                                ? 'bg-[#D92D20]/15 text-[#D92D20] border border-[#D92D20]/30'
                                : 'bg-[#333333] text-[#A0A0A0]'
                            }`}
                          >
                            {entry.status.replace('_', ' ')}
                          </span>

                          {entry.isSupervisorOverride && (
                            <span
                              className="text-[9px] text-[#F5C400] bg-amber-500/10 px-1 rounded border border-[#F5C400]/20"
                              title={entry.overrideReason}
                            >
                              Override Applied
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      {isSupervisorOrAdmin && allowManualEdit && (
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleOpenEdit(entry)}
                            title="Supervisor Adjustment"
                            className="p-1.5 hover:bg-[#2C2C2C] text-[#A0A0A0] hover:text-[#F5C400] rounded cursor-pointer transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Time Entry Adjustment Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg max-w-md w-full p-6 text-white shadow-2xl relative">
            <button
              onClick={() => setEditingEntry(null)}
              className="absolute top-4 right-4 text-[#A0A0A0] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold uppercase tracking-tight text-white mb-1 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-[#F5C400]" />
              Supervisor Timecard Adjustment
            </h3>
            <p className="text-xs text-[#A0A0A0] mb-4">
              All manual changes are logged into the compliance audit trail.
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                  Clock In Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={editClockIn}
                  onChange={(e) => setEditClockIn(e.target.value)}
                  className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F5C400]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                  Clock Out Time
                </label>
                <input
                  type="datetime-local"
                  value={editClockOut}
                  onChange={(e) => setEditClockOut(e.target.value)}
                  className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F5C400]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                  Total Working Minutes
                </label>
                <input
                  type="number"
                  required
                  value={editWorkMinutes}
                  onChange={(e) => setEditWorkMinutes(Number(e.target.value))}
                  className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F5C400]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white mb-1">
                  Adjustment Justification Reason <span className="text-[#F5C400]">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="E.g. Worker phone battery died at 16:30 on site; confirmed departure time with Superintendent."
                  className="w-full bg-[#111111] border border-[#333333] rounded p-2.5 text-xs text-white focus:outline-none focus:border-[#F5C400]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#2C2C2C]">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="px-4 py-2 bg-[#252525] hover:bg-[#303030] text-xs font-semibold text-white rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || !editReason.trim()}
                  className="px-5 py-2 bg-[#F5C400] hover:bg-[#e0b400] text-black text-xs font-bold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingEdit ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      Save & Audit Log
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
