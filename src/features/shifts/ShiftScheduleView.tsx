import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { shiftService } from '../../services/firebase/firestore/shiftService';
import { employeeService } from '../../services/firebase/firestore/employeeService';
import { projectService } from '../../services/firebase/firestore/projectService';
import { jobSiteService } from '../../services/firebase/firestore/jobSiteService';
import { auditService } from '../../services/firebase/firestore/auditService';
import { ShiftModal } from './ShiftModal';
import type { Shift, Employee, Project, JobSite } from '../../types';
import {
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  User,
  MapPin,
  Building,
  Edit2,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export const ShiftScheduleView: React.FC = () => {
  const { user, userProfile, company, isAdmin, isSuperAdmin, role } = useAuth();

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [jobSites, setJobSites] = useState<JobSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [workerFilter, setWorkerFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedForEdit, setSelectedForEdit] = useState<Shift | null>(null);

  const canManageShifts =
    isAdmin || isSuperAdmin || role === 'SUPERVISOR' || role === 'PROJECT_MANAGER';

  const loadData = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    setError(null);
    try {
      const [shiftList, empList, projList, siteList] = await Promise.all([
        canManageShifts
          ? shiftService.getShiftsByCompany(company.companyId)
          : (user?.uid ? shiftService.getShiftsByCompany(company.companyId, { assignedUserId: user.uid }) : Promise.resolve([])),
        canManageShifts
          ? employeeService.getEmployeesByCompany(company.companyId)
          : Promise.resolve([]),
        projectService.getProjectsByCompany(company.companyId),
        jobSiteService.getJobSitesByCompany(company.companyId),
      ]);

      setShifts(shiftList);
      setEmployees(empList);
      setProjects(projList);
      setJobSites(siteList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shift schedule.');
    } finally {
      setLoading(false);
    }
  }, [company, canManageShifts, userProfile?.uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveShift = async (shiftData: Shift) => {
    if (!company || !user || !userProfile) return;
    const isEdit = Boolean(selectedForEdit);

    if (isEdit) {
      await shiftService.updateShift(company.companyId, shiftData.shiftId, shiftData);
    } else {
      await shiftService.createShift(company.companyId, shiftData);
    }

    await auditService.logEvent({
      companyId: company.companyId,
      actorUserId: user.uid,
      actorRole: userProfile.role,
      action: isEdit ? 'SHIFT_UPDATED' : 'SHIFT_CREATED',
      resourceType: 'shift',
      resourceId: shiftData.shiftId,
      after: {
        title: shiftData.title,
        employeeId: shiftData.employeeId,
        startTime: shiftData.startTime,
        endTime: shiftData.endTime,
      },
    });

    await loadData();
  };

  const employeeMap = useMemo(() => new Map(employees.map((e) => [e.userId || e.employeeId, e])), [employees]);
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.projectId, p])), [projects]);
  const jobSiteMap = useMemo(() => new Map(jobSites.map((s) => [s.jobSiteId, s])), [jobSites]);

  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      if (workerFilter !== 'all' && s.employeeId !== workerFilter) return false;
      if (projectFilter !== 'all' && s.projectId !== projectFilter) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const emp = employeeMap.get(s.employeeId);
        const site = jobSiteMap.get(s.jobSiteId);
        const nameMatch = emp ? `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) : false;
        const titleMatch = s.title.toLowerCase().includes(q);
        const siteMatch = site ? site.name.toLowerCase().includes(q) : false;
        if (!nameMatch && !titleMatch && !siteMatch) return false;
      }

      return true;
    });
  }, [shifts, workerFilter, projectFilter, statusFilter, searchQuery, employeeMap, jobSiteMap]);

  const statusStyles: Record<string, string> = {
    scheduled: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    in_progress: 'bg-[#2E9B5B]/15 text-[#2E9B5B] border-[#2E9B5B]/30',
    completed: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    cancelled: 'bg-[#D92D20]/15 text-[#D92D20] border-[#D92D20]/30',
    absent: 'bg-amber-500/15 text-[#F5C400] border-[#F5C400]/30',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-white flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-[#F5C400]" />
            {canManageShifts ? 'Workforce Dispatch & Shift Scheduling' : 'My Assigned Shifts'}
          </h1>
          <p className="text-xs text-[#A0A0A0] mt-1">
            Site coverage assignments, trade worker schedules, and daily shift rosters
          </p>
        </div>

        {canManageShifts && (
          <button
            onClick={() => {
              setSelectedForEdit(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#F5C400] hover:bg-[#e0b400] text-black font-bold text-xs uppercase tracking-wider rounded transition cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-[#F5C400]/15"
          >
            <Plus className="w-4 h-4" />
            Dispatch Shift
          </button>
        )}
      </div>

      {error && (
        <div className="p-3.5 bg-[#D92D20]/15 border border-[#D92D20]/40 rounded-lg text-xs text-[#D92D20] flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-[#A0A0A0] absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by worker name, shift title, or job site..."
            className="w-full bg-[#111111] border border-[#2C2C2C] rounded pl-9 pr-3 py-2 text-xs text-white placeholder-[#555555] focus:outline-none focus:border-[#F5C400]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManageShifts && (
            <select
              value={workerFilter}
              onChange={(e) => setWorkerFilter(e.target.value)}
              className="bg-[#111111] border border-[#2C2C2C] rounded px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#F5C400]"
            >
              <option value="all">All Workers</option>
              {employees.map((emp) => (
                <option key={emp.employeeId} value={emp.userId || emp.employeeId}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          )}

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
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
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Shifts List / Table */}
      <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-[#A0A0A0] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[#F5C400] animate-spin" />
            <span className="text-xs uppercase tracking-wider font-semibold">Loading Shifts...</span>
          </div>
        ) : filteredShifts.length === 0 ? (
          <div className="py-16 text-center text-[#777777] p-6">
            <Calendar className="w-12 h-12 mx-auto text-[#444444] mb-2" />
            <h3 className="text-sm font-bold text-white uppercase tracking-tight mb-1">
              No Shifts Scheduled
            </h3>
            <p className="text-xs text-[#666666] max-w-sm mx-auto mb-4">
              {searchQuery || workerFilter !== 'all' || statusFilter !== 'all'
                ? 'No shifts match your selected filter criteria.'
                : 'No shifts scheduled yet. Dispatch trade workers to designated job sites.'}
            </p>
            {canManageShifts && (
              <button
                onClick={() => {
                  setSelectedForEdit(null);
                  setIsModalOpen(true);
                }}
                className="px-4 py-2 bg-[#F5C400] hover:bg-[#e0b400] text-black font-bold text-xs uppercase tracking-wider rounded transition cursor-pointer"
              >
                Dispatch First Shift
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#151515] border-b border-[#2C2C2C] text-[#A0A0A0] uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Shift Details</th>
                  <th className="py-3 px-4">Assigned Worker</th>
                  <th className="py-3 px-4">Job Site & Project</th>
                  <th className="py-3 px-4">Shift Window</th>
                  <th className="py-3 px-4">Hours</th>
                  <th className="py-3 px-4">Status</th>
                  {canManageShifts && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252525]">
                {filteredShifts.map((shift) => {
                  const emp = employeeMap.get(shift.employeeId);
                  const project = projectMap.get(shift.projectId);
                  const site = jobSiteMap.get(shift.jobSiteId);

                  const startDate = new Date(shift.startTime);
                  const endDate = new Date(shift.endTime);

                  return (
                    <tr key={shift.shiftId} className="hover:bg-[#222222] transition-colors">
                      {/* Title & Notes */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white text-xs">{shift.title}</div>
                        {shift.notes && (
                          <div className="text-[11px] text-[#777777] line-clamp-1 mt-0.5 max-w-xs">
                            {shift.notes}
                          </div>
                        )}
                      </td>

                      {/* Worker */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#111111] border border-[#333333] flex items-center justify-center font-bold text-[10px] text-[#A0A0A0] shrink-0">
                            {emp ? `${emp.firstName[0]}${emp.lastName[0]}` : 'W'}
                          </div>
                          <div>
                            <span className="font-semibold text-white block">
                              {emp ? `${emp.firstName} ${emp.lastName}` : shift.employeeId}
                            </span>
                            <span className="text-[10px] text-[#777777] font-mono">
                              {emp?.employeeNumber || 'WORKER'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Site & Project */}
                      <td className="py-3.5 px-4">
                        <div className="text-white font-medium flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#F5C400]" />
                          {site?.name || 'Assigned Site'}
                        </div>
                        <div className="text-[10px] text-[#777777] flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3 text-[#A0A0A0]" />
                          {project ? `${project.code}` : 'General Project'}
                        </div>
                      </td>

                      {/* Timing */}
                      <td className="py-3.5 px-4">
                        <div className="text-white font-mono">
                          {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &rarr;{' '}
                          {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[10px] text-[#777777]">
                          {startDate.toLocaleDateString([], {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </td>

                      {/* Hours */}
                      <td className="py-3.5 px-4 font-mono text-[#F5C400] font-bold">
                        {shift.scheduledHours} hrs
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            statusStyles[shift.status] || 'bg-[#333333] text-[#A0A0A0]'
                          }`}
                        >
                          {shift.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Actions */}
                      {canManageShifts && (
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedForEdit(shift);
                              setIsModalOpen(true);
                            }}
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

      {/* Modal */}
      {company && (
        <ShiftModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveShift}
          initialShift={selectedForEdit}
          employees={employees}
          projects={projects}
          jobSites={jobSites}
          companyId={company.companyId}
        />
      )}
    </div>
  );
};
