import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { employeeService } from '../services/firebase/firestore/employeeService';
import { invitationService } from '../services/firebase/firestore/invitationService';
import { auditService } from '../services/firebase/firestore/auditService';
import { projectService } from '../services/firebase/firestore/projectService';
import { jobSiteService } from '../services/firebase/firestore/jobSiteService';
import { attendanceService } from '../services/firebase/firestore/attendanceService';
import { InvitationModal } from '../features/invitations/InvitationModal';
import { WorkforceDashboardWidget } from '../components/WorkforceDashboardWidget';
import { TimeClockCard } from '../features/attendance/TimeClockCard';
import { AttendanceHistory } from '../features/attendance/AttendanceHistory';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import type { Employee, Invitation, AuditLog, Project, JobSite, TimeEntry } from '../types';
import {
  Users,
  Building,
  MapPin,
  Clock,
  Calendar,
  Mail,
  ArrowRight,
  Shield,
  Activity,
  HardHat,
  Plus,
  Briefcase,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigateTab: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateTab }) => {
  const { user, userProfile, company, isAdmin, isSuperAdmin, role } = useAuth();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [jobSites, setJobSites] = useState<JobSite[]>([]);
  const [activeEntries, setActiveEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const isManagement =
    isAdmin || isSuperAdmin || role === 'SUPERVISOR' || role === 'PROJECT_MANAGER';

  const loadData = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    try {
      if (isManagement) {
        const [empData, invData, logData, projData, siteData, liveEntries] = await Promise.all([
          employeeService.getEmployeesByCompany(company.companyId),
          invitationService.getInvitations(company.companyId),
          auditService.getAuditLogs(company.companyId, 6),
          projectService.getProjectsByCompany(company.companyId),
          jobSiteService.getJobSitesByCompany(company.companyId),
          attendanceService.getTimeEntries(company.companyId, { status: 'clocked_in' }),
        ]);
        setEmployees(empData);
        setInvitations(invData);
        setRecentLogs(logData);
        setProjects(projData);
        setJobSites(siteData);
        setActiveEntries(liveEntries);
      }
    } catch (err) {
      console.error('Error loading dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [company, isManagement]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived real metrics
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.status === 'active').length;
  const currentlyWorking = activeEntries.filter((e) => e.status === 'clocked_in').length;
  const totalProjects = projects.length;
  const totalJobSites = jobSites.length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatLogAction = (action: string) => {
    return action
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // -------------------------------------------------------------
  // MANAGEMENT / ADMIN / SUPERVISOR DASHBOARD
  // -------------------------------------------------------------
  if (isManagement) {
    return (
      <div className="space-y-8 animate-fade-in">
        {/* EXECUTIVE HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant={isSuperAdmin ? 'amber' : 'neutral'} size="sm">
                {role || 'MANAGEMENT'}
              </Badge>
              <span className="text-xs text-slate-400">
                {company?.name} · Operations Hub
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
              {getGreeting()}, {userProfile?.firstName || 'Operator'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Real-time overview of active workforce, field attendance, and site operations.
            </p>
          </div>

          {/* Quick Actions Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Clock className="w-4 h-4 text-amber-400" />}
              onClick={() => onNavigateTab('attendance')}
            >
              Timecards
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Calendar className="w-4 h-4 text-amber-400" />}
              onClick={() => onNavigateTab('shifts')}
            >
              Dispatch
            </Button>
            {(isAdmin || isSuperAdmin) && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Mail className="w-4 h-4" />}
                onClick={() => setShowInviteModal(true)}
              >
                Invite Team
              </Button>
            )}
          </div>
        </div>

        {/* PRIMARY OPERATIONS METRIC CARDS (100% REAL DATA) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Workforce"
            value={totalEmployees}
            subtext={`${activeEmployees} active for dispatch`}
            icon={<Users className="w-5 h-5 text-amber-400" />}
            onClick={() => onNavigateTab('employees')}
          />
          <MetricCard
            label="Currently On-Site"
            value={currentlyWorking}
            subtext={currentlyWorking > 0 ? `${currentlyWorking} clocked-in now` : 'No active shifts right now'}
            icon={<Clock className="w-5 h-5 text-emerald-400" />}
            iconBgColor="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            onClick={() => onNavigateTab('attendance')}
          />
          <MetricCard
            label="Active Projects"
            value={totalProjects}
            subtext={totalProjects === 1 ? '1 project under contract' : `${totalProjects} projects under contract`}
            icon={<Building className="w-5 h-5 text-blue-400" />}
            iconBgColor="bg-blue-500/10 text-blue-400 border border-blue-500/20"
            onClick={() => onNavigateTab('projects')}
          />
          <MetricCard
            label="Configured Job Sites"
            value={totalJobSites}
            subtext={`${totalJobSites} GPS geofences configured`}
            icon={<MapPin className="w-5 h-5 text-amber-400" />}
            onClick={() => onNavigateTab('jobsites')}
          />
        </div>

        {/* LIVE WORKFORCE RADAR WIDGET */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-100 tracking-tight">
                Live Field Workforce
              </h2>
              <p className="text-xs text-slate-400">
                Active time entries, current shift durations, and site assignments
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => onNavigateTab('attendance')}
            >
              Full Roster
            </Button>
          </div>
          <WorkforceDashboardWidget onNavigateTab={onNavigateTab} />
        </div>

        {/* SPLIT SECTION: PROJECTS / SITES & RECENT COMPLIANCE AUDIT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Projects & Sites Snapshot */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-amber-400" />
                    <span>Active Projects</span>
                  </CardTitle>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Job sites and field status across client contracts
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  onClick={() => onNavigateTab('projects')}
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {projects.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    <Building className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                    No active projects found. Create your first project to organize job sites.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/80">
                    {projects.slice(0, 4).map((proj) => {
                      const projSites = jobSites.filter((s) => s.projectId === proj.projectId);
                      return (
                        <div
                          key={proj.projectId}
                          className="p-4 flex items-center justify-between hover:bg-slate-900/40 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 shrink-0 font-mono text-xs font-semibold">
                              {proj.code ? proj.code.slice(0, 4) : 'PRJ'}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-medium text-slate-200 truncate">
                                {proj.name}
                              </h4>
                              <p className="text-xs text-slate-400 truncate flex items-center gap-2 mt-0.5">
                                <span>{proj.clientName || 'Direct Client'}</span>
                                {projSites.length > 0 && (
                                  <>
                                    <span>·</span>
                                    <span>{projSites.length} site{projSites.length > 1 ? 's' : ''}</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              size="sm"
                              variant={
                                proj.status === 'in_progress'
                                  ? 'success'
                                  : proj.status === 'completed'
                                  ? 'info'
                                  : 'neutral'
                              }
                            >
                              {proj.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Compliance & Activity Stream */}
          <div>
            <Card className="h-full flex flex-col justify-between">
              <div>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-amber-400" />
                      <span>Security & Audit</span>
                    </CardTitle>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Immutable trail of admin actions
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    onClick={() => onNavigateTab('audit')}
                  >
                    All Logs
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {recentLogs.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500">
                      <Activity className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                      No recent administrative events recorded.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/80">
                      {recentLogs.map((log) => (
                        <div key={log.auditId} className="p-3.5 hover:bg-slate-900/40 transition-colors text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-slate-200">
                              {formatLogAction(log.action)}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center justify-between">
                            <span className="truncate">Resource: {log.resourceType}</span>
                            <Badge size="sm" variant="neutral">
                              {log.actorRole}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </div>
            </Card>
          </div>
        </div>

        {/* Invitation Modal */}
        {company && (
          <InvitationModal
            isOpen={showInviteModal}
            onClose={() => {
              setShowInviteModal(false);
              loadData();
            }}
            companyId={company.companyId}
          />
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // REGULAR FIELD WORKER DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      {/* Field Worker Header */}
      <div className="pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2 mb-1.5">
          <Badge variant="amber" size="sm">
            Worker Portal
          </Badge>
          <span className="text-xs text-slate-400">
            {company?.name}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
          {getGreeting()}, {userProfile?.firstName || 'Operator'}
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Use the punch terminal below to record attendance at your assigned job site.
        </p>
      </div>

      {/* 1. Large Ergonomic Time Clock Terminal */}
      <TimeClockCard onAttendanceChanged={loadData} />

      {/* 2. Worker Attendance Records */}
      <div className="pt-4">
        <AttendanceHistory allowManualEdit={false} />
      </div>
    </div>
  );
};
