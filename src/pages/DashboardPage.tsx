import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { employeeService } from '../services/firebase/firestore/employeeService';
import { invitationService } from '../services/firebase/firestore/invitationService';
import { auditService } from '../services/firebase/firestore/auditService';
import { projectService } from '../services/firebase/firestore/projectService';
import { jobSiteService } from '../services/firebase/firestore/jobSiteService';
import { InvitationModal } from '../features/invitations/InvitationModal';
import { WorkforceDashboardWidget } from '../components/WorkforceDashboardWidget';
import { TimeClockCard } from '../features/attendance/TimeClockCard';
import { AttendanceHistory } from '../features/attendance/AttendanceHistory';
import type { Employee, Invitation, AuditLog, Project, JobSite } from '../types';
import {
  Users,
  UserCheck,
  Mail,
  Activity,
  HardHat,
  ArrowRight,
  Shield,
  Building2,
  Calendar,
  Clock,
  MapPin,
  Building,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigateTab: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateTab }) => {
  const { userProfile, company, isAdmin, isSuperAdmin, role } = useAuth();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [jobSites, setJobSites] = useState<JobSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const isManagement =
    isAdmin || isSuperAdmin || role === 'SUPERVISOR' || role === 'PROJECT_MANAGER';

  const loadData = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    try {
      if (isManagement) {
        const [empData, invData, logData, projData, siteData] = await Promise.all([
          employeeService.getEmployeesByCompany(company.companyId),
          invitationService.getInvitations(company.companyId),
          auditService.getAuditLogs(company.companyId, 5),
          projectService.getProjectsByCompany(company.companyId),
          jobSiteService.getJobSitesByCompany(company.companyId),
        ]);
        setEmployees(empData);
        setInvitations(invData);
        setRecentLogs(logData);
        setProjects(projData);
        setJobSites(siteData);
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

  // Derived metrics (strictly real data, 0 if empty)
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.status === 'active').length;
  const totalProjects = projects.length;
  const totalJobSites = jobSites.length;

  // -------------------------------------------------------------
  // MANAGEMENT / ADMIN / SUPERVISOR DASHBOARD
  // -------------------------------------------------------------
  if (isManagement) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#242424] pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#F5C400]/15 text-[#F5C400] border border-[#F5C400]/30">
                {role}
              </span>
              <span className="text-xs text-[#A0A0A0]">Workforce & Field Operations Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2.5">
              <Building2 className="w-7 h-7 text-[#F5C400]" />
              {company?.name || 'Company Dashboard'}
            </h1>
            <p className="text-xs text-[#A0A0A0] mt-1 font-mono">
              Tenant ID: {company?.companyId} &bull; Timezone: {company?.timezone || 'America/Toronto'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigateTab('attendance')}
              className="px-3.5 py-2 bg-[#252525] hover:bg-[#303030] text-white border border-[#3C3C3C] text-xs font-semibold uppercase tracking-wider rounded cursor-pointer transition flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-[#F5C400]" />
              Timecards
            </button>
            <button
              onClick={() => onNavigateTab('shifts')}
              className="px-3.5 py-2 bg-[#252525] hover:bg-[#303030] text-white border border-[#3C3C3C] text-xs font-semibold uppercase tracking-wider rounded cursor-pointer transition flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-[#F5C400]" />
              Dispatch Shifts
            </button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-3.5 py-2 bg-[#F5C400] hover:bg-[#e0b400] text-black text-xs font-bold uppercase tracking-wider rounded cursor-pointer transition flex items-center gap-1.5 shadow-md shadow-[#F5C400]/15"
            >
              <Mail className="w-3.5 h-3.5" />
              Invite Team
            </button>
          </div>
        </div>

        {/* Workforce Dashboard Widget: Active Clock-in Status & Current Shift Duration */}
        <WorkforceDashboardWidget onNavigateTab={onNavigateTab} />

        {/* 4 Quantitative Operations Metric Cards (Real stats, no mock invent) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Employees */}
          <div className="p-5 bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg shadow-md">
            <div className="flex items-center justify-between text-[#A0A0A0] mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Total Workforce</span>
              <Users className="w-4 h-4 text-[#F5C400]" />
            </div>
            <div className="text-3xl font-black text-white font-mono">{totalEmployees}</div>
            <div className="text-[11px] text-[#777777] mt-1">
              {activeEmployees} active for dispatch
            </div>
          </div>

          {/* Active Projects */}
          <div className="p-5 bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg shadow-md">
            <div className="flex items-center justify-between text-[#A0A0A0] mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Active Projects</span>
              <Building className="w-4 h-4 text-[#2E9B5B]" />
            </div>
            <div className="text-3xl font-black text-[#2E9B5B] font-mono">{totalProjects}</div>
            <div className="text-[11px] text-[#777777] mt-1">Under contract</div>
          </div>

          {/* Job Sites & Geofences */}
          <div className="p-5 bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg shadow-md">
            <div className="flex items-center justify-between text-[#A0A0A0] mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Configured Sites</span>
              <MapPin className="w-4 h-4 text-[#F5C400]" />
            </div>
            <div className="text-3xl font-black text-[#F5C400] font-mono">{totalJobSites}</div>
            <div className="text-[11px] text-[#777777] mt-1">GPS geofences active</div>
          </div>

          {/* Compliance & Security */}
          <div className="p-5 bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg shadow-md">
            <div className="flex items-center justify-between text-[#A0A0A0] mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Attendance State</span>
              <Shield className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-lg font-bold text-white uppercase tracking-tight">Verified GPS</div>
            <div className="text-[11px] text-[#777777] mt-1">Server timestamp sync</div>
          </div>
        </div>

        {/* Operational Modules & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Roster Snapshot */}
          <div className="lg:col-span-2 bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#2C2C2C] mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#F5C400]" />
                Recent Workforce Additions
              </h3>
              <button
                onClick={() => onNavigateTab('employees')}
                className="text-xs text-[#F5C400] hover:underline flex items-center gap-1 font-semibold"
              >
                Full Directory
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {employees.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#777777]">
                <Users className="w-8 h-8 mx-auto text-[#444444] mb-2" />
                No employee records found. Click &quot;Manage Roster&quot; to register workers.
              </div>
            ) : (
              <div className="divide-y divide-[#252525]">
                {employees.slice(0, 4).map((emp) => (
                  <div key={emp.employeeId} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#111111] border border-[#333333] flex items-center justify-center font-bold text-[10px] text-[#A0A0A0]">
                        {emp.firstName[0]}{emp.lastName[0]}
                      </div>
                      <div>
                        <span className="font-semibold text-white block">
                          {emp.firstName} {emp.lastName}
                        </span>
                        <span className="text-[11px] text-[#777777]">{emp.jobTitle}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[#A0A0A0]">{emp.employeeNumber}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-[#252525] text-white">
                        {emp.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Audit / Security Activity */}
          <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#2C2C2C] mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#F5C400]" />
                Recent Audit Activity
              </h3>
              <button
                onClick={() => onNavigateTab('audit')}
                className="text-xs text-[#F5C400] hover:underline flex items-center gap-1 font-semibold"
              >
                Logs
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentLogs.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#777777]">
                <Activity className="w-8 h-8 mx-auto text-[#444444] mb-2" />
                No administrative activity logged yet.
              </div>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div key={log.auditId} className="p-2.5 bg-[#111111] rounded border border-[#272727] text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] font-bold text-[#F5C400]">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-[#666666]">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#A0A0A0] truncate">
                      By <strong className="text-white">{log.actorUserId.slice(0, 12)}</strong> ({log.actorRole})
                    </div>
                  </div>
                ))}
              </div>
            )}
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
  // REGULAR EMPLOYEE DASHBOARD (Mobile-First Time Clock Terminal)
  // -------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* 1. Big High-Contrast Glove-Friendly Mobile Time Clock */}
      <TimeClockCard onAttendanceChanged={loadData} />

      {/* 2. Worker's Attendance & Shift History */}
      <AttendanceHistory allowManualEdit={false} />
    </div>
  );
};
