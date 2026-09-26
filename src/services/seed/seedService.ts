/**
 * @license
 * SITEFLOW Development Seed Utility (Build 02 Extended)
 * IMPORTANT: Seed data is strictly optional and explicitly tagged with "[DEMO DATA]".
 * Never automatically executed in production.
 */

import type { Company, Employee, UserProfile, Project, JobSite, Shift } from '../../types';
import { companyService } from '../firebase/firestore/companyService';
import { employeeService } from '../firebase/firestore/employeeService';
import { userService } from '../firebase/firestore/userService';
import { auditService } from '../firebase/firestore/auditService';
import { projectService } from '../firebase/firestore/projectService';
import { jobSiteService } from '../firebase/firestore/jobSiteService';
import { shiftService } from '../firebase/firestore/shiftService';
import { attendanceService } from '../firebase/firestore/attendanceService';

export const seedService = {
  /**
   * Seed a complete demo company with realistic workforce, projects, job sites, shifts, and attendance
   */
  async seedDemoCompany(creatorUid: string): Promise<{ company: Company; employees: Employee[] }> {
    const timestamp = new Date().toISOString();
    const companyId = `comp_demo_${Date.now().toString(36)}`;

    // 1. Company
    const demoCompany: Company = {
      companyId,
      name: 'Apex Structural Contracting [DEMO DATA]',
      legalName: 'Apex Structural Contracting Corp.',
      email: 'operations@apexstructural.demo',
      phone: '+1 (416) 555-0199',
      address: '450 Industrial Parkway, Suite 200',
      city: 'Toronto',
      province: 'Ontario',
      country: 'Canada',
      postalCode: 'M3B 2T8',
      timezone: 'America/Toronto',
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: creatorUid,
    };
    await companyService.createCompany(demoCompany);

    // 2. Employees
    const emp1Id = `emp_${Date.now()}_1`;
    const emp2Id = `emp_${Date.now()}_2`;
    const emp3Id = `emp_${Date.now()}_3`;
    const emp4Id = `emp_${Date.now()}_4`;
    const emp5Id = `emp_${Date.now()}_5`;

    const demoEmployees: Employee[] = [
      {
        employeeId: emp1Id,
        companyId,
        employeeNumber: 'EMP-1001',
        firstName: 'Marcus',
        lastName: 'Vance [DEMO DATA]',
        email: 'marcus.vance@apexstructural.demo',
        phone: '+1 (416) 555-1101',
        role: 'SUPER_ADMIN',
        jobTitle: 'VP of Field Operations',
        department: 'Executive Management',
        status: 'active',
        hireDate: '2022-03-15',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        employeeId: emp2Id,
        companyId,
        employeeNumber: 'EMP-1002',
        firstName: 'Elena',
        lastName: 'Rostova [DEMO DATA]',
        email: 'elena.rostova@apexstructural.demo',
        phone: '+1 (416) 555-1102',
        role: 'ADMIN',
        jobTitle: 'General Construction Superintendent',
        department: 'Field Operations',
        status: 'active',
        hireDate: '2023-01-10',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        employeeId: emp3Id,
        companyId,
        employeeNumber: 'EMP-1003',
        firstName: 'David',
        lastName: 'Chen [DEMO DATA]',
        email: 'david.chen@apexstructural.demo',
        phone: '+1 (416) 555-1103',
        role: 'PROJECT_MANAGER',
        jobTitle: 'Senior Commercial PM',
        department: 'Project Management',
        status: 'active',
        hireDate: '2023-06-01',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        employeeId: emp4Id,
        companyId,
        employeeNumber: 'EMP-1004',
        firstName: 'Travis',
        lastName: 'Miller [DEMO DATA]',
        email: 'travis.m@apexstructural.demo',
        phone: '+1 (416) 555-1104',
        role: 'SUPERVISOR',
        jobTitle: 'Site Safety & Framing Foreman',
        department: 'Field Supervision',
        status: 'active',
        hireDate: '2023-09-15',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        employeeId: emp5Id,
        companyId,
        employeeNumber: 'EMP-1005',
        firstName: 'Carlos',
        lastName: 'Gomez [DEMO DATA]',
        email: 'carlos.g@apexstructural.demo',
        phone: '+1 (416) 555-1105',
        role: 'EMPLOYEE',
        jobTitle: 'Journeyman Carpenter',
        department: 'Carpentry & Framing',
        status: 'active',
        hireDate: '2024-02-01',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ];

    for (const emp of demoEmployees) {
      await employeeService.createEmployee(companyId, emp);
    }

    // 3. User profile for active creator
    const creatorProfile: UserProfile = {
      uid: creatorUid,
      companyId,
      email: 'admin@apexstructural.demo',
      firstName: 'Site',
      lastName: 'Administrator',
      displayName: 'Site Administrator',
      role: 'SUPER_ADMIN',
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await userService.createUserProfile(creatorProfile);

    // 4. Projects (Build 02)
    const prj1Id = `prj_demo_${Date.now()}_1`;
    const prj2Id = `prj_demo_${Date.now()}_2`;

    const demoProjects: Project[] = [
      {
        projectId: prj1Id,
        companyId,
        name: 'Bayview Commercial Center [DEMO DATA]',
        code: 'PRJ-2026-BCC',
        description: 'Multi-story commercial office building framing and curtain wall installation.',
        status: 'in_progress',
        clientName: 'Ontario Commercial Real Estate Group',
        startDate: '2026-01-15',
        endDate: '2026-11-30',
        managerId: emp3Id,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: creatorUid,
      },
      {
        projectId: prj2Id,
        companyId,
        name: 'Metrolinx Rail Corridor Fitout [DEMO DATA]',
        code: 'PRJ-2026-MRC',
        description: 'Civil structural platforms, steel canopy framing, and pedestrian concourse.',
        status: 'planning',
        clientName: 'Transit Infrastructure Ontario',
        startDate: '2026-04-01',
        endDate: '2027-02-28',
        managerId: emp3Id,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: creatorUid,
      },
    ];

    for (const prj of demoProjects) {
      await projectService.createProject(companyId, prj);
    }

    // 5. Job Sites with Geofences (Build 02)
    const site1Id = `site_demo_${Date.now()}_1`;
    const site2Id = `site_demo_${Date.now()}_2`;

    const demoSites: JobSite[] = [
      {
        jobSiteId: site1Id,
        companyId,
        projectId: prj1Id,
        name: 'Bayview Downtown Tower Site [DEMO DATA]',
        address: '100 King Street West',
        city: 'Toronto',
        province: 'Ontario',
        postalCode: 'M5X 1A9',
        latitude: 43.6487,
        longitude: -79.3817,
        radiusMeters: 100,
        enforceGeofence: true,
        status: 'active',
        notes: 'Main contractor entrance through South Gate. Hard hats & high-vis mandatory.',
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: creatorUid,
      },
      {
        jobSiteId: site2Id,
        companyId,
        projectId: prj1Id,
        name: 'Mississauga Precast Logistics Yard [DEMO DATA]',
        address: '2500 Meadowvale Blvd',
        city: 'Mississauga',
        province: 'Ontario',
        postalCode: 'L5N 6P6',
        latitude: 43.5932,
        longitude: -79.6421,
        radiusMeters: 250,
        enforceGeofence: true,
        status: 'active',
        notes: 'Precast structural element staging and crane delivery area.',
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: creatorUid,
      },
    ];

    for (const site of demoSites) {
      await jobSiteService.createJobSite(companyId, site);
    }

    // 6. Shifts (Build 02)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const demoShifts: Shift[] = [
      {
        shiftId: `shf_demo_${Date.now()}_1`,
        companyId,
        projectId: prj1Id,
        jobSiteId: site1Id,
        employeeId: emp5Id,
        title: 'Level 4 Framing & Safety Guardrails [DEMO DATA]',
        startTime: `${dateStr}T07:00:00.000Z`,
        endTime: `${dateStr}T15:30:00.000Z`,
        scheduledHours: 8,
        status: 'scheduled',
        notes: 'Bring laser levels and full fall protection harnesses.',
        assignedBy: emp4Id,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        shiftId: `shf_demo_${Date.now()}_2`,
        companyId,
        projectId: prj1Id,
        jobSiteId: site1Id,
        employeeId: emp4Id,
        title: 'Supervisory Walkthrough & Trade Inspection [DEMO DATA]',
        startTime: `${dateStr}T06:30:00.000Z`,
        endTime: `${dateStr}T16:00:00.000Z`,
        scheduledHours: 9,
        status: 'scheduled',
        notes: 'Daily safety tailgate at 06:45.',
        assignedBy: emp3Id,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ];

    for (const shf of demoShifts) {
      await shiftService.createShift(companyId, shf);
    }

    // 7. Seed Active Attendance Timecard (Build 02)
    await attendanceService.clockIn({
      companyId,
      employeeId: emp5Id,
      userId: `demo_user_${emp5Id}`,
      actorRole: 'EMPLOYEE',
      projectId: prj1Id,
      jobSite: demoSites[0],
      workerLocation: {
        latitude: 43.6488,
        longitude: -79.3818,
        accuracy: 8,
      },
      isSupervisorOverride: false,
      notes: 'Initial morning shift clock in.',
    });

    // 8. Audit event
    await auditService.logEvent({
      companyId,
      actorUserId: creatorUid,
      actorRole: 'SUPER_ADMIN',
      action: 'COMPANY_CREATED',
      resourceType: 'company',
      resourceId: companyId,
      metadata: { note: 'Seed Demo Data Initialized with Build 02 Workforce & Job Sites' },
    });

    return { company: demoCompany, employees: demoEmployees };
  },
};
