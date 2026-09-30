import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { projectService } from '../../services/firebase/firestore/projectService';
import { employeeService } from '../../services/firebase/firestore/employeeService';
import { auditService } from '../../services/firebase/firestore/auditService';
import { ProjectModal } from './ProjectModal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import type { Project, Employee } from '../../types';
import {
  Building,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Edit2,
  AlertCircle,
  Loader2,
  Briefcase,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export const ProjectList: React.FC = () => {
  const { user, userProfile, company, isAdmin, isSuperAdmin, role } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedForEdit, setSelectedForEdit] = useState<Project | null>(null);

  const canManageProjects =
    isAdmin || isSuperAdmin || role === 'PROJECT_MANAGER';

  const loadData = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    setError(null);
    try {
      const [projs, emps] = await Promise.all([
        projectService.getProjectsByCompany(company.companyId),
        employeeService.getEmployeesByCompany(company.companyId),
      ]);
      setProjects(projs);
      setEmployees(emps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects.');
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveProject = async (projectData: Project) => {
    if (!company || !user || !userProfile) return;
    const isEdit = Boolean(selectedForEdit);

    if (isEdit) {
      await projectService.updateProject(company.companyId, projectData.projectId, projectData);
    } else {
      await projectService.createProject(company.companyId, projectData);
    }

    await auditService.logEvent({
      companyId: company.companyId,
      actorUserId: user.uid,
      actorRole: userProfile.role,
      action: isEdit ? 'PROJECT_UPDATED' : 'PROJECT_CREATED',
      resourceType: 'project',
      resourceId: projectData.projectId,
      after: {
        name: projectData.name,
        code: projectData.code,
        status: projectData.status,
      },
    });

    await loadData();
  };

  const employeeMap = useMemo(() => new Map(employees.map((e) => [e.employeeId, e])), [employees]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = p.name.toLowerCase().includes(q);
        const codeMatch = p.code.toLowerCase().includes(q);
        const clientMatch = p.clientName ? p.clientName.toLowerCase().includes(q) : false;
        if (!nameMatch && !codeMatch && !clientMatch) return false;
      }
      return true;
    });
  }, [projects, statusFilter, searchQuery]);

  const getStatusBadgeVariant = (status: string): 'success' | 'amber' | 'info' | 'neutral' => {
    switch (status) {
      case 'active':
      case 'in_progress':
        return 'success';
      case 'planning':
        return 'info';
      case 'on_hold':
        return 'amber';
      case 'completed':
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Page Header */}
      <PageHeader
        title="Project Contracts"
        description="Oversee project scopes, assigned lead managers, and project schedules"
        badge={
          <Badge variant="neutral" size="sm">
            {projects.length} Total Contracts
          </Badge>
        }
      >
        {canManageProjects && (
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setSelectedForEdit(null);
              setIsModalOpen(true);
            }}
          >
            New Project
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

      {/* Search and Filters Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by project name, project code, or client..."
              className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-10 pr-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>Status:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            >
              <option value="all">All Statuses</option>
              <option value="planning">Planning</option>
              <option value="in_progress">In Progress</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Projects Grid */}
      {loading ? (
        <Card className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <span className="text-xs text-slate-400">Loading project contracts...</span>
        </Card>
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={<Building className="w-8 h-8 text-slate-500" />}
          title={searchQuery || statusFilter !== 'all' ? 'No matching projects' : 'No projects registered'}
          description={
            searchQuery || statusFilter !== 'all'
              ? 'No projects match your active search filters.'
              : 'Add your first construction contract to link job sites and schedule workforce shifts.'
          }
          action={
            canManageProjects && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setSelectedForEdit(null);
                  setIsModalOpen(true);
                }}
              >
                Add First Project
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const pm = project.managerId ? employeeMap.get(project.managerId) : null;
            return (
              <Card
                key={project.projectId}
                hover
                className="flex flex-col justify-between"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="font-mono text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">
                      {project.code}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <Badge
                        size="sm"
                        variant={getStatusBadgeVariant(project.status)}
                      >
                        {project.status.replace('_', ' ')}
                      </Badge>

                      {canManageProjects && (
                        <button
                          onClick={() => {
                            setSelectedForEdit(project);
                            setIsModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition cursor-pointer"
                          title="Edit Project"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-semibold text-slate-100 tracking-tight mb-1 truncate">
                    {project.name}
                  </h3>

                  {project.clientName && (
                    <div className="text-xs text-slate-400 mb-3 truncate flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Client: <strong className="text-slate-200 font-medium">{project.clientName}</strong></span>
                    </div>
                  )}

                  {project.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                      {project.description}
                    </p>
                  )}

                  <div className="space-y-2 text-xs text-slate-400 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 mb-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        Lead Manager:
                      </span>
                      <span className="font-medium text-slate-200 truncate">
                        {pm ? `${pm.firstName} ${pm.lastName}` : 'Unassigned'}
                      </span>
                    </div>

                    {(project.startDate || project.endDate) && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          Timeline:
                        </span>
                        <span className="font-mono text-slate-300 text-[11px]">
                          {project.startDate || 'TBD'} &rarr; {project.endDate || 'TBD'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950/20 rounded-b-xl flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-mono">ID: {project.projectId.slice(0, 14)}</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Shifts
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {company && (
        <ProjectModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveProject}
          initialProject={selectedForEdit}
          employees={employees}
          companyId={company.companyId}
        />
      )}
    </div>
  );
};
