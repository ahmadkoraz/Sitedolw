import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { projectService } from '../../services/firebase/firestore/projectService';
import { employeeService } from '../../services/firebase/firestore/employeeService';
import { auditService } from '../../services/firebase/firestore/auditService';
import { ProjectModal } from './ProjectModal';
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
  CheckCircle2,
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

  const statusBadges: Record<string, string> = {
    planning: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    in_progress: 'bg-[#2E9B5B]/15 text-[#2E9B5B] border-[#2E9B5B]/30',
    on_hold: 'bg-amber-500/15 text-[#F5C400] border-[#F5C400]/30',
    completed: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    archived: 'bg-[#444444] text-[#A0A0A0]',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-white flex items-center gap-2.5">
            <Building className="w-6 h-6 text-[#F5C400]" />
            Projects & Construction Contracts
          </h1>
          <p className="text-xs text-[#A0A0A0] mt-1">
            Master project contracts, assigned project managers, and milestone schedules
          </p>
        </div>

        {canManageProjects && (
          <button
            onClick={() => {
              setSelectedForEdit(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#F5C400] hover:bg-[#e0b400] text-black font-bold text-xs uppercase tracking-wider rounded transition cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-[#F5C400]/15"
          >
            <Plus className="w-4 h-4" />
            Create Project
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
            placeholder="Search by project name, project code, or client..."
            className="w-full bg-[#111111] border border-[#2C2C2C] rounded pl-9 pr-3 py-2 text-xs text-white placeholder-[#555555] focus:outline-none focus:border-[#F5C400]"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[#A0A0A0]">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#111111] border border-[#2C2C2C] rounded px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#F5C400]"
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

      {/* Projects Grid */}
      {loading ? (
        <div className="py-16 text-center text-[#A0A0A0] flex flex-col items-center justify-center gap-3 bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg">
          <Loader2 className="w-8 h-8 text-[#F5C400] animate-spin" />
          <span className="text-xs uppercase tracking-wider font-semibold">Loading Projects...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="py-16 text-center text-[#777777] bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-6">
          <Building className="w-12 h-12 mx-auto text-[#444444] mb-2" />
          <h3 className="text-sm font-bold text-white uppercase tracking-tight mb-1">
            No Projects Registered
          </h3>
          <p className="text-xs text-[#666666] max-w-sm mx-auto mb-4">
            {searchQuery || statusFilter !== 'all'
              ? 'No projects match your active search filters.'
              : 'Add your first construction contract to link job sites and schedule workforce shifts.'}
          </p>
          {canManageProjects && (
            <button
              onClick={() => {
                setSelectedForEdit(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-[#F5C400] hover:bg-[#e0b400] text-black font-bold text-xs uppercase tracking-wider rounded transition cursor-pointer"
            >
              Add First Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const pm = project.managerId ? employeeMap.get(project.managerId) : null;
            return (
              <div
                key={project.projectId}
                className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-5 flex flex-col justify-between hover:border-[#3C3C3C] transition-all shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-[#F5C400] bg-[#111111] px-2 py-0.5 rounded border border-[#F5C400]/25">
                      {project.code}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          statusBadges[project.status] || 'bg-[#333333] text-[#A0A0A0]'
                        }`}
                      >
                        {project.status.replace('_', ' ')}
                      </span>

                      {canManageProjects && (
                        <button
                          onClick={() => {
                            setSelectedForEdit(project);
                            setIsModalOpen(true);
                          }}
                          className="p-1 hover:bg-[#2C2C2C] text-[#A0A0A0] hover:text-[#F5C400] rounded transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white uppercase tracking-tight mb-1 truncate">
                    {project.name}
                  </h3>

                  {project.clientName && (
                    <div className="text-xs text-[#A0A0A0] mb-3 truncate">
                      Client: <span className="text-white font-medium">{project.clientName}</span>
                    </div>
                  )}

                  {project.description && (
                    <p className="text-xs text-[#777777] line-clamp-2 mb-4 leading-relaxed">
                      {project.description}
                    </p>
                  )}

                  <div className="space-y-2 text-xs text-[#A0A0A0] bg-[#111111] p-3 rounded border border-[#252525] mb-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#F5C400]" />
                        Project Lead:
                      </span>
                      <span className="font-semibold text-white truncate">
                        {pm ? `${pm.firstName} ${pm.lastName}` : 'Unassigned'}
                      </span>
                    </div>

                    {(project.startDate || project.endDate) && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#F5C400]" />
                          Timeline:
                        </span>
                        <span className="font-mono text-white text-[11px]">
                          {project.startDate || 'TBD'} &rarr; {project.endDate || 'TBD'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#252525] flex items-center justify-between text-[11px] text-[#777777]">
                  <span className="font-mono">ID: {project.projectId.slice(0, 14)}</span>
                  <span className="text-[#2E9B5B] flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Shifts
                  </span>
                </div>
              </div>
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
