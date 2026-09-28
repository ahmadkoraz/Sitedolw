import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { shiftService } from '../../services/firebase/firestore/shiftService';
import { employeeService } from '../../services/firebase/firestore/employeeService';
import { projectService } from '../../services/firebase/firestore/projectService';
import { jobSiteService } from '../../services/firebase/firestore/jobSiteService';
import { auditService } from '../../services/firebase/firestore/auditService';
import { ShiftModal } from './ShiftModal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Avatar } from '../../components/ui/Avatar';
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
  HardHat,
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
  }, [company, canManageShifts, user?.uid]);

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
        status: shiftData.status,
      },
    });

    await loadData();
  };

  const employeeMap = useMemo(() => new Map(employees.map((e) => [e.employeeId, e])), [employees]);
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.projectId, p])), [projects]);
  const jobSiteMap = useMemo(() => new Map(jobSites.map((s) => [s.jobSiteId, s])), [jobSites]);

  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (workerFilter !== 'all' && s.employeeId !== workerFilter) return false;
      if (projectFilter !== 'all' && s.projectId !== projectFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = s.title.toLowerCase().includes(q);
        const emp = employeeMap.get(s.employeeId);
        const workerMatch = emp ? `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) : false;
        if (!titleMatch && !workerMatch) return false;
      }
      return true;
    });
  }, [shifts, statusFilter, workerFilter, projectFilter, searchQuery, employeeMap]);

  const getStatusBadgeVariant = (status: string): 'success' | 'amber' | 'info' | 'neutral' => {
    switch (status) {
      case 'in_progress':
        return 'success';
      case 'scheduled':
        return 'info';
      case 'completed':
        return 'neutral';
      case 'cancelled':
        return 'amber';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Page Header */}
      <PageHeader
        title={canManageShifts ? 'Shifts & Dispatch Schedule' : 'My Scheduled Shifts'}
        description={
          canManageShifts
            ? 'Coordinate trade crews, assign site locations, and manage operational shift windows'
            : 'View your upcoming assigned shifts and designated job site locations'
        }
        badge={
          <Badge variant="neutral" size="sm">
            {shifts.length} Total Shifts
          </Badge>
        }
      >
        {canManageShifts && (
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setSelectedForEdit(null);
              setIsModalOpen(true);
            }}
          >
            Dispatch Shift
          </Button>
        )}
      </PageHeader>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by shift title, employee name, or notes..."
              className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-10 pr-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canManageShifts && (
              <select
                value={workerFilter}
                onChange={(e) => setWorkerFilter(e.target.value)}
                className="bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                <option value="all">All Workers</option>
                {employees.map((e) => (
                  <option key={e.employeeId} value={e.employeeId}>
                    {e.firstName} {e.lastName}
                  </option>
                ))}
              </select>
            )}

            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
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
              className="bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Shifts Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <span className="text-xs text-slate-400">Loading scheduled shifts...</span>
          </div>
        ) : filteredShifts.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-8 h-8 text-slate-500" />}
            title={searchQuery || workerFilter !== 'all' || statusFilter !== 'all' ? 'No matching shifts' : 'No shifts scheduled'}
            description={
              searchQuery || workerFilter !== 'all' || statusFilter !== 'all'
                ? 'No shifts match your selected filter criteria.'
                : 'No shifts scheduled yet. Dispatch trade workers to designated job sites.'
            }
            action={
              canManageShifts && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => {
                    setSelectedForEdit(null);
                    setIsModalOpen(true);
                  }}
                >
                  Dispatch First Shift
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800/80 text-slate-400 uppercase tracking-wider text-[11px] font-medium">
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
              <tbody className="divide-y divide-slate-800/60">
                {filteredShifts.map((shift) => {
                  const emp = employeeMap.get(shift.employeeId);
                  const project = projectMap.get(shift.projectId);
                  const site = jobSiteMap.get(shift.jobSiteId);

                  const startDate = new Date(shift.startTime);
                  const endDate = new Date(shift.endTime);

                  return (
                    <tr key={shift.shiftId} className="hover:bg-slate-900/40 transition-colors">
                      {/* Title & Notes */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-100 text-xs">{shift.title}</div>
                        {shift.notes && (
                          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 max-w-xs">
                            {shift.notes}
                          </div>
                        )}
                      </td>

                      {/* Worker */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Avatar
                            name={emp ? `${emp.firstName} ${emp.lastName}` : 'Worker'}
                            src={emp?.profilePhotoUrl}
                            size="sm"
                          />
                          <div>
                            <span className="font-medium text-slate-200 block">
                              {emp ? `${emp.firstName} ${emp.lastName}` : shift.employeeId}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {emp?.employeeNumber || 'WORKER'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Site & Project */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-200 font-medium flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{site?.name || 'Assigned Site'}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{project ? `${project.code} - ${project.name}` : 'General Project'}</span>
                        </div>
                      </td>

                      {/* Shift Window */}
                      <td className="py-3.5 px-4 font-mono text-slate-300 text-[11px]">
                        <div>
                          {startDate.toLocaleDateString([], {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="text-slate-500 text-[10px]">
                          {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &rarr;{' '}
                          {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Hours */}
                      <td className="py-3.5 px-4 font-semibold text-slate-200">
                        {shift.scheduledHours}h
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <Badge
                          size="sm"
                          variant={getStatusBadgeVariant(shift.status)}
                        >
                          {shift.status.replace('_', ' ')}
                        </Badge>
                      </td>

                      {/* Actions */}
                      {canManageShifts && (
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedForEdit(shift);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition cursor-pointer"
                            title="Edit Shift"
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
      </Card>

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
