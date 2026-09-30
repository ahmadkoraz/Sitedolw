import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { jobSiteService } from '../../services/firebase/firestore/jobSiteService';
import { projectService } from '../../services/firebase/firestore/projectService';
import { auditService } from '../../services/firebase/firestore/auditService';
import { JobSiteModal } from './JobSiteModal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import type { JobSite, Project } from '../../types';
import {
  MapPin,
  Plus,
  Search,
  Filter,
  Edit2,
  Building,
  Loader2,
  AlertCircle,
  ExternalLink,
  Info,
} from 'lucide-react';

interface JobSiteListProps {
  onNavigateToProjects?: () => void;
}

export const JobSiteList: React.FC<JobSiteListProps> = ({ onNavigateToProjects }) => {
  const { user, userProfile, company, isAdmin, isSuperAdmin, role } = useAuth();

  const [jobSites, setJobSites] = useState<JobSite[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedForEdit, setSelectedForEdit] = useState<JobSite | null>(null);

  // RBAC: SUPER_ADMIN, ADMIN, PROJECT_MANAGER can manage Job Sites per Firestore rules
  const canManageSites =
    isAdmin || isSuperAdmin || role === 'PROJECT_MANAGER';

  const loadData = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    setError(null);
    try {
      const [sites, projs] = await Promise.all([
        jobSiteService.getJobSitesByCompany(company.companyId),
        projectService.getProjectsByCompany(company.companyId),
      ]);
      setJobSites(sites);
      setProjects(projs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job sites.');
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveSite = async (siteData: JobSite) => {
    if (!company || !user || !userProfile) return;
    const isEdit = Boolean(selectedForEdit);

    if (isEdit) {
      await jobSiteService.updateJobSite(company.companyId, siteData.jobSiteId, siteData);
    } else {
      await jobSiteService.createJobSite(company.companyId, siteData);
    }

    await auditService.logEvent({
      companyId: company.companyId,
      actorUserId: user.uid,
      actorRole: userProfile.role,
      action: isEdit ? 'JOB_SITE_UPDATED' : 'JOB_SITE_CREATED',
      resourceType: 'jobSite',
      resourceId: siteData.jobSiteId,
      after: {
        name: siteData.name,
        projectId: siteData.projectId,
        radiusMeters: siteData.radiusMeters,
        enforceGeofence: siteData.enforceGeofence,
        status: siteData.status,
      },
    });

    await loadData();
  };

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.projectId, p])), [projects]);

  const filteredSites = useMemo(() => {
    return jobSites.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (projectFilter !== 'all' && s.projectId !== projectFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = s.name.toLowerCase().includes(q);
        const addrMatch = s.address.toLowerCase().includes(q);
        const cityMatch = s.city.toLowerCase().includes(q);
        if (!nameMatch && !addrMatch && !cityMatch) return false;
      }
      return true;
    });
  }, [jobSites, statusFilter, projectFilter, searchQuery]);

  const hasNoProjects = projects.length === 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Page Header */}
      <PageHeader
        title="Job Sites & Geofences"
        description="Configure physical construction sites, geofence perimeters, and location-based verification"
        badge={
          <Badge variant="neutral" size="sm">
            {jobSites.length} Active Sites
          </Badge>
        }
      >
        {canManageSites && (
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            disabled={hasNoProjects}
            title={hasNoProjects ? 'Please create a project first before adding job sites' : undefined}
            onClick={() => {
              setSelectedForEdit(null);
              setIsModalOpen(true);
            }}
          >
            New Job Site
          </Button>
        )}
      </PageHeader>

      {/* Project Dependency Guide Banner */}
      {!loading && hasNoProjects && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-slate-100 font-semibold mb-0.5">Project Dependency Notice</strong>
              In SITEFLOW, job sites cannot exist without a valid parent Project contract. Create a project contract first before setting up site geofences.
            </div>
          </div>
          {onNavigateToProjects && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToProjects}
              className="shrink-0 self-start sm:self-auto"
            >
              Go to Projects
            </Button>
          )}
        </div>
      )}

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
              placeholder="Search by job site name, city, or address..."
              className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-10 pr-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>Project:</span>
            </div>
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

            <div className="flex items-center gap-1.5 text-xs text-slate-400 ml-2">
              <span>Status:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Sites Grid */}
      {loading ? (
        <Card className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <span className="text-xs text-slate-400">Loading job sites...</span>
        </Card>
      ) : filteredSites.length === 0 ? (
        <EmptyState
          icon={<MapPin className="w-8 h-8 text-slate-500" />}
          title={searchQuery || statusFilter !== 'all' ? 'No matching sites' : hasNoProjects ? 'No projects available' : 'No job sites configured'}
          description={
            searchQuery || statusFilter !== 'all'
              ? 'No job sites match your active search filters.'
              : hasNoProjects
              ? 'Create a project contract first before adding construction job site locations.'
              : 'Add your first construction site location to start verifying worker attendance.'
          }
          action={
            hasNoProjects && onNavigateToProjects ? (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Building className="w-4 h-4" />}
                onClick={onNavigateToProjects}
              >
                Create Project Contract
              </Button>
            ) : canManageSites && !hasNoProjects ? (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setSelectedForEdit(null);
                  setIsModalOpen(true);
                }}
              >
                Add First Job Site
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSites.map((site) => {
            const project = projectMap.get(site.projectId);
            return (
              <Card
                key={site.jobSiteId}
                hover
                className="flex flex-col justify-between"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        size="sm"
                        variant={site.status === 'active' ? 'success' : site.status === 'closed' ? 'neutral' : 'warning'}
                        dot
                      >
                        {site.status}
                      </Badge>
                      {site.enforceGeofence ? (
                        <Badge size="sm" variant="amber">
                          Geofenced ({site.radiusMeters}m)
                        </Badge>
                      ) : (
                        <Badge size="sm" variant="neutral">
                          Open Site
                        </Badge>
                      )}
                    </div>

                    {canManageSites && (
                      <button
                        onClick={() => {
                          setSelectedForEdit(site);
                          setIsModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition cursor-pointer"
                        title="Edit Job Site"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <h3 className="text-base font-semibold text-slate-100 tracking-tight mb-1 truncate">
                    {site.name}
                  </h3>

                  <div className="text-xs text-slate-400 mb-3 truncate flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{site.address}, {site.city}, {site.province}</span>
                  </div>

                  {project && (
                    <div className="mb-3 px-3 py-2 bg-slate-900/60 rounded-lg border border-slate-800/80 text-xs flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-slate-200 font-medium truncate">{project.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
                        ({project.code})
                      </span>
                    </div>
                  )}

                  {/* Geofence Radar Preview */}
                  <div className="h-20 w-full bg-slate-950/60 border border-slate-800/80 rounded-lg relative flex items-center justify-center overflow-hidden mb-2">
                    <div
                      className="rounded-full border border-dashed border-amber-500/50 bg-amber-500/5 flex items-center justify-center"
                      style={{
                        width: `${Math.min(90, Math.max(25, (site.radiusMeters / 1000) * 90))}%`,
                        height: `${Math.min(80, Math.max(25, (site.radiusMeters / 1000) * 80))}%`,
                      }}
                    >
                      <div className="w-3 h-3 rounded-full bg-amber-400 flex items-center justify-center shadow-xs">
                        <div className="w-1 h-1 rounded-full bg-slate-950" />
                      </div>
                    </div>

                    <div className="absolute top-2 right-2.5 text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      R = {site.radiusMeters}m
                    </div>
                  </div>
                </div>

                {/* Footer Coordinates & External Navigation Link */}
                <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950/20 rounded-b-xl flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-mono text-slate-400">
                    {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}
                  </span>

                  <a
                    href={`https://maps.google.com/?q=${site.latitude},${site.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium transition-colors"
                  >
                    <span>View Map</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {company && (
        <JobSiteModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveSite}
          initialSite={selectedForEdit}
          projects={projects}
          companyId={company.companyId}
        />
      )}
    </div>
  );
};
