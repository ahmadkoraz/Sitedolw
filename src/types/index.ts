/**
 * @license
 * SITEFLOW Core Data Models & Type Definitions
 * Work. Track. Build.
 */

// ==========================================
// 1. Roles & Permissions Architecture
// ==========================================

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'PROJECT_MANAGER'
  | 'SUPERVISOR'
  | 'HR'
  | 'ACCOUNTING'
  | 'EMPLOYEE';

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';
export type CompanyStatus = 'active' | 'suspended' | 'trial' | 'inactive';

export type PermissionKey =
  | 'users.read'
  | 'users.create'
  | 'users.update'
  | 'users.delete'
  | 'employees.read'
  | 'employees.create'
  | 'employees.update'
  | 'employees.delete'
  | 'projects.read'
  | 'projects.create'
  | 'projects.update'
  | 'projects.delete'
  | 'jobSites.read'
  | 'jobSites.create'
  | 'jobSites.update'
  | 'jobSites.delete'
  | 'shifts.read'
  | 'shifts.create'
  | 'shifts.update'
  | 'shifts.delete'
  | 'attendance.read'
  | 'attendance.manage'
  | 'attendance.override'
  | 'reports.read'
  | 'reports.create'
  | 'settings.manage'
  | 'auditLogs.read';

/**
 * Standard Role-to-Permission Mapping Matrix
 */
export const ROLE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  SUPER_ADMIN: [
    'users.read', 'users.create', 'users.update', 'users.delete',
    'employees.read', 'employees.create', 'employees.update', 'employees.delete',
    'projects.read', 'projects.create', 'projects.update', 'projects.delete',
    'jobSites.read', 'jobSites.create', 'jobSites.update', 'jobSites.delete',
    'shifts.read', 'shifts.create', 'shifts.update', 'shifts.delete',
    'attendance.read', 'attendance.manage', 'attendance.override',
    'reports.read', 'reports.create',
    'settings.manage',
    'auditLogs.read'
  ],
  ADMIN: [
    'users.read', 'users.create', 'users.update',
    'employees.read', 'employees.create', 'employees.update',
    'projects.read', 'projects.create', 'projects.update',
    'jobSites.read', 'jobSites.create', 'jobSites.update',
    'shifts.read', 'shifts.create', 'shifts.update',
    'attendance.read', 'attendance.manage', 'attendance.override',
    'reports.read', 'reports.create',
    'settings.manage',
    'auditLogs.read'
  ],
  PROJECT_MANAGER: [
    'employees.read',
    'projects.read', 'projects.create', 'projects.update',
    'jobSites.read', 'jobSites.create', 'jobSites.update',
    'shifts.read', 'shifts.create', 'shifts.update',
    'attendance.read', 'attendance.manage', 'attendance.override',
    'reports.read', 'reports.create'
  ],
  SUPERVISOR: [
    'employees.read',
    'projects.read',
    'jobSites.read',
    'shifts.read', 'shifts.create', 'shifts.update',
    'attendance.read', 'attendance.manage', 'attendance.override',
    'reports.read', 'reports.create'
  ],
  HR: [
    'users.read', 'users.create', 'users.update',
    'employees.read', 'employees.create', 'employees.update',
    'shifts.read',
    'attendance.read', 'attendance.manage',
    'reports.read'
  ],
  ACCOUNTING: [
    'employees.read',
    'projects.read',
    'shifts.read',
    'attendance.read',
    'reports.read'
  ],
  EMPLOYEE: [
    'projects.read',
    'jobSites.read',
    'shifts.read',
    'attendance.read',
    'reports.create'
  ]
};

// ==========================================
// 2. Core Entities
// ==========================================

export interface Company {
  companyId: string;
  name: string;
  legalName?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  province: string; // default: 'Ontario'
  country: string;  // default: 'Canada'
  postalCode?: string;
  timezone: string; // default: 'America/Toronto'
  logoUrl?: string;
  status: CompanyStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface UserProfile {
  uid: string;
  companyId: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone?: string;
  photoUrl?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface Employee {
  employeeId: string;
  userId?: string;
  companyId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: UserRole;
  jobTitle: string;
  department?: string;
  status: UserStatus;
  hireDate?: string;
  profilePhotoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invitation {
  invitationId: string;
  companyId: string;
  email: string;
  role: UserRole;
  jobTitle?: string;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: string;
  createdAt: string;
  updatedAt?: string;
}

export type AuditAction =
  | 'USER_REGISTERED'
  | 'USER_LOGGED_IN'
  | 'USER_LOGGED_OUT'
  | 'PASSWORD_RESET_REQUESTED'
  | 'COMPANY_CREATED'
  | 'COMPANY_SETTINGS_UPDATED'
  | 'EMPLOYEE_CREATED'
  | 'EMPLOYEE_UPDATED'
  | 'EMPLOYEE_STATUS_CHANGED'
  | 'ROLE_CHANGED'
  | 'USER_STATUS_CHANGED'
  | 'PERMISSION_CHANGED'
  | 'INVITATION_CREATED'
  | 'INVITATION_ACCEPTED'
  | 'INVITATION_REVOKED'
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'JOB_SITE_CREATED'
  | 'JOB_SITE_UPDATED'
  | 'SHIFT_CREATED'
  | 'SHIFT_UPDATED'
  | 'CLOCK_IN'
  | 'CLOCK_OUT'
  | 'BREAK_START'
  | 'BREAK_END'
  | 'ATTENDANCE_EDITED'
  | 'SUPERVISOR_OVERRIDE'
  | 'GEOFENCE_FAILED';

export interface AuditLog {
  auditId: string;
  companyId: string;
  actorUserId: string;
  actorRole: UserRole | string;
  action: AuditAction;
  resourceType: 'company' | 'user' | 'employee' | 'invitation' | 'settings' | 'project' | 'jobSite' | 'shift' | 'timeEntry';
  resourceId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  timestamp: string;
  metadata?: {
    ip?: string;
    userAgent?: string;
    note?: string;
    [key: string]: unknown;
  };
}

export interface SystemSettings {
  companyId: string;
  allowEmployeeSelfRegistration: boolean;
  requireGpsClockIn: boolean;
  defaultWorkWeekHours: number;
  updatedAt: string;
  updatedBy: string;
}

// ==========================================
// 3. Build 02 Operational Workforce Entities
// ==========================================

export type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'archived';

export interface Project {
  projectId: string;
  companyId: string;
  name: string;
  code: string; // e.g. PRJ-2026-01
  description?: string;
  status: ProjectStatus;
  clientName?: string;
  startDate?: string;
  endDate?: string;
  managerId?: string; // employeeId of project manager
  jobSiteIds?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type JobSiteStatus = 'active' | 'inactive' | 'closed';

export interface JobSite {
  jobSiteId: string;
  companyId: string;
  projectId: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  radiusMeters: number; // e.g. 100 meters geofence
  enforceGeofence: boolean;
  status: JobSiteStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type ShiftStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'absent';

export interface Shift {
  shiftId: string;
  companyId: string;
  projectId: string;
  jobSiteId: string;
  employeeId: string;
  title: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  scheduledHours: number;
  status: ShiftStatus;
  notes?: string;
  assignedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BreakEntry {
  breakId: string;
  type: 'paid' | 'unpaid' | 'lunch';
  startTime: string; // ISO timestamp
  endTime?: string;  // ISO timestamp
  durationMinutes?: number;
}

export interface LocationSnapshot {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  isWithinGeofence: boolean;
  distanceToSiteMeters: number;
}

export type TimeEntryStatus = 'clocked_in' | 'on_break' | 'clocked_out' | 'flagged';

export interface TimeEntry {
  timeEntryId: string;
  companyId: string;
  employeeId: string;
  userId: string;
  projectId: string;
  jobSiteId: string;
  shiftId?: string;
  clockInTime: string;
  clockInServerTimestamp?: unknown; // FieldValue or ISO
  clockInLocation: LocationSnapshot;
  clockOutTime?: string;
  clockOutServerTimestamp?: unknown;
  clockOutLocation?: LocationSnapshot;
  breaks: BreakEntry[];
  status: TimeEntryStatus;
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  isSupervisorOverride: boolean;
  overrideReason?: string;
  overriddenBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 4. Stubs for Future SITEFLOW Modules (Build 03+)
// ==========================================

export interface DailyReportStub {
  reportId: string;
  projectId: string;
  companyId: string;
  authorId: string;
  date: string;
  summary: string;
}
