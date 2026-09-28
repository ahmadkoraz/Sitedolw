/**
 * @license
 * SITEFLOW Company Firestore Service
 * Encapsulates company tenant operations.
 */

import { doc, getDoc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db, firebaseStatus } from '../firebaseApp';
import { handleFirestoreError, OperationType } from '../errorHandler';
import type { Company, UserProfile, Employee } from '../../../types';

const SANDBOX_COMPANIES_KEY = 'siteflow_sandbox_companies';

export interface AtomicCompanyOnboardingParams {
  company: Company;
  userProfile: UserProfile;
  employee: Employee;
}

export const companyService = {
  /**
   * Fetch company by ID
   */
  async getCompany(companyId: string): Promise<Company | null> {
    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${companyId}`;
      try {
        const ref = doc(db, 'companies', companyId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          return snap.data() as Company;
        }
        return null;
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
      }
    } else {
      // Sandbox fallback
      const raw = localStorage.getItem(SANDBOX_COMPANIES_KEY);
      if (raw) {
        const companies: Record<string, Company> = JSON.parse(raw);
        return companies[companyId] || null;
      }
      return null;
    }
  },

  /**
   * Create new company during onboarding flow
   */
  async createCompany(company: Company): Promise<void> {
    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${company.companyId}`;
      try {
        const ref = doc(db, 'companies', company.companyId);
        await setDoc(ref, company);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    } else {
      // Sandbox fallback
      const raw = localStorage.getItem(SANDBOX_COMPANIES_KEY);
      const companies: Record<string, Company> = raw ? JSON.parse(raw) : {};
      companies[company.companyId] = company;
      localStorage.setItem(SANDBOX_COMPANIES_KEY, JSON.stringify(companies));
    }
  },

  /**
   * Update existing company settings
   */
  async updateCompany(
    companyId: string,
    updates: Partial<Omit<Company, 'companyId' | 'createdAt' | 'createdBy'>>
  ): Promise<void> {
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${companyId}`;
      try {
        const ref = doc(db, 'companies', companyId);
        await updateDoc(ref, payload);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    } else {
      // Sandbox fallback
      const raw = localStorage.getItem(SANDBOX_COMPANIES_KEY);
      const companies: Record<string, Company> = raw ? JSON.parse(raw) : {};
      if (companies[companyId]) {
        companies[companyId] = {
          ...companies[companyId],
          ...payload,
        };
        localStorage.setItem(SANDBOX_COMPANIES_KEY, JSON.stringify(companies));
      }
    }
  },

  /**
   * Phase 0.4B: Atomically creates a new Company, UserProfile (SUPER_ADMIN),
   * and initial Employee record in ONE single Firestore writeBatch().
   * Guarantees all three writes are committed together or none at all.
   */
  async createCompanyAtomic(params: AtomicCompanyOnboardingParams): Promise<void> {
    const { company, userProfile, employee } = params;

    // Security & relational invariants
    if (userProfile.uid !== employee.userId) {
      throw new Error('Onboarding integrity error: User UID must match Employee userId.');
    }
    if (company.companyId !== userProfile.companyId || company.companyId !== employee.companyId) {
      throw new Error('Onboarding integrity error: CompanyId mismatch across atomic records.');
    }
    if (company.createdBy !== userProfile.uid) {
      throw new Error('Onboarding integrity error: Company createdBy must match User UID.');
    }
    if (userProfile.role !== 'SUPER_ADMIN') {
      throw new Error('Onboarding integrity error: Initial company creator must have SUPER_ADMIN role.');
    }

    if (db && firebaseStatus.isConfigured) {
      const batch = writeBatch(db);
      const compRef = doc(db, 'companies', company.companyId);
      const userRef = doc(db, 'users', userProfile.uid);
      const empRef = doc(db, 'companies', company.companyId, 'employees', employee.employeeId);

      batch.set(compRef, company);
      batch.set(userRef, userProfile);
      batch.set(empRef, employee);

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `companies/${company.companyId}`);
      }
    } else {
      // Sandbox fallback: atomic synchronous storage assignment
      const rawComp = localStorage.getItem(SANDBOX_COMPANIES_KEY);
      const companies: Record<string, Company> = rawComp ? JSON.parse(rawComp) : {};
      companies[company.companyId] = company;
      localStorage.setItem(SANDBOX_COMPANIES_KEY, JSON.stringify(companies));

      const rawUsers = localStorage.getItem('siteflow_sandbox_user_profiles');
      const users: Record<string, UserProfile> = rawUsers ? JSON.parse(rawUsers) : {};
      users[userProfile.uid] = userProfile;
      localStorage.setItem('siteflow_sandbox_user_profiles', JSON.stringify(users));

      const rawEmps = localStorage.getItem('siteflow_sandbox_employees');
      const emps: Employee[] = rawEmps ? JSON.parse(rawEmps) : [];
      emps.push(employee);
      localStorage.setItem('siteflow_sandbox_employees', JSON.stringify(emps));
    }
  },
};
