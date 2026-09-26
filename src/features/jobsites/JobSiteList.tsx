import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { jobSiteService } from '../../services/firebase/firestore/jobSiteService';
import { projectService } from '../../services/firebase/firestore/projectService';
import { auditService } from '../../services/firebase/firestore/auditService';
import { JobSiteModal } from './JobSiteModal';
import type { JobSite, Project } from '../../types';
import {
  MapPin,
  Plus,
  Search,
  Filter,
  Sliders,
  Edit2,
  Building,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export const JobSiteList: React.FC = () => {
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

  const canManageSites =
    isAdmin || isSuperAdmin || role === 'PROJECT_MANAGER' || role === 'SUPERVISOR';

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
        radiusMeters: siteData.radiusMeters,
        enforceGeofence: siteData.enforceGeofence,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-white flex items-center gap-2.5">
            <MapPin className="w-6 h-6 text-[#F5C400]" />
            Job Sites & Geofencing Perimeters
          </h1>
          <p className="text-xs text-[#A0A0A0] mt-1">
            Physical project locations, GPS coordinates, and automated radius enforcement rules
          </p>
        </div>

        {canManageSites && (
          <button
            onClick={() => {
              setSelectedForEdit(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#F5C400] hover:bg-[#e0b400] text-black font-bold text-xs uppercase tracking-wider rounded transition cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-[#F5C400]/15"
          >
            <Plus className="w-4 h-4" />
            Add Job Site
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
            placeholder="Search by site name, address, or city..."
            className="w-full bg-[#111111] border border-[#2C2C2C] rounded pl-9 pr-3 py-2 text-xs text-white placeholder-[#555555] focus:outline-none focus:border-[#F5C400]"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[#A0A0A0]">
            <Filter className="w-3.5 h-3.5" />
            <span>Project:</span>
          </div>
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
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Grid of Job Sites */}
      {loading ? (
        <div className="py-16 text-center text-[#A0A0A0] flex flex-col items-center justify-center gap-3 bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg">
          <Loader2 className="w-8 h-8 text-[#F5C400] animate-spin" />
          <span className="text-xs uppercase tracking-wider font-semibold">Loading Job Sites...</span>
        </div>
      ) : filteredSites.length === 0 ? (
        <div className="py-16 text-center text-[#777777] bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-6">
          <MapPin className="w-12 h-12 mx-auto text-[#444444] mb-2" />
          <h3 className="text-sm font-bold text-white uppercase tracking-tight mb-1">
            No Job Sites Found
          </h3>
          <p className="text-xs text-[#666666] max-w-sm mx-auto mb-4">
            {searchQuery || statusFilter !== 'all' || projectFilter !== 'all'
              ? 'No job sites match your filter parameters.'
              : 'Add your first construction site location to start verifying worker attendance.'}
          </p>
          {canManageSites && (
            <button
              onClick={() => {
                setSelectedForEdit(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-[#F5C400] hover:bg-[#e0b400] text-black font-bold text-xs uppercase tracking-wider rounded transition cursor-pointer"
            >
              Add First Job Site
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSites.map((site) => {
            const project = projectMap.get(site.projectId);
            return (
              <div
                key={site.jobSiteId}
                className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-5 flex flex-col justify-between hover:border-[#3C3C3C] transition-all shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          site.status === 'active' ? 'bg-[#2E9B5B]' : 'bg-[#666666]'
                        }`}
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#A0A0A0]">
                        {site.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {site.enforceGeofence ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/15 text-[#F5C400] border border-[#F5C400]/30">
                          Geofenced ({site.radiusMeters}m)
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-[#333333] text-[#A0A0A0]">
                          Open Site
                        </span>
                      )}

                      {canManageSites && (
                        <button
                          onClick={() => {
                            setSelectedForEdit(site);
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
                    {site.name}
                  </h3>

                  <div className="text-xs text-[#A0A0A0] mb-3 truncate">
                    {site.address}, {site.city}, {site.province}
                  </div>

                  {project && (
                    <div className="mb-3 px-2.5 py-1.5 bg-[#111111] rounded border border-[#252525] text-xs flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-[#F5C400]" />
                      <span className="text-white font-medium truncate">{project.name}</span>
                      <span className="text-[10px] text-[#777777] font-mono shrink-0">
                        ({project.code})
                      </span>
                    </div>
                  )}

                  {/* Geofence Radar Preview */}
                  <div className="h-20 w-full bg-[#111111] border border-[#252525] rounded relative flex items-center justify-center overflow-hidden mb-3">
                    <div
                      className="rounded-full border border-dashed border-[#F5C400]/50 bg-[#F5C400]/5 flex items-center justify-center"
                      style={{
                        width: `${Math.min(90, Math.max(25, (site.radiusMeters / 1000) * 90))}%`,
                        height: `${Math.min(80, Math.max(25, (site.radiusMeters / 1000) * 80))}%`,
                      }}
                    >
                      <div className="w-3 h-3 rounded-full bg-[#F5C400] flex items-center justify-center shadow-xs">
                        <div className="w-1 h-1 rounded-full bg-black" />
                      </div>
                    </div>

                    <div className="absolute top-1.5 right-2 text-[9px] font-mono text-[#F5C400]">
                      R = {site.radiusMeters}m
                    </div>
                  </div>
                </div>

                {/* Footer Coordinates & External Navigation Link */}
                <div className="pt-3 border-t border-[#252525] flex items-center justify-between text-[11px] text-[#777777]">
                  <span className="font-mono">
                    {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}
                  </span>

                  <a
                    href={`https://maps.google.com/?q=${site.latitude},${site.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#F5C400] hover:underline flex items-center gap-1 text-[11px] font-semibold"
                  >
                    View Map
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
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
