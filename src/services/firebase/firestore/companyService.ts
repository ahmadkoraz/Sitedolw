/**
 * @license
 * SITEFLOW Company Firestore Service
 * Encapsulates company tenant operations.
 */

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, firebaseStatus } from '../firebaseApp';
import { handleFirestoreError, OperationType } from '../errorHandler';
import type { Company } from '../../../types';

const SANDBOX_COMPANIES_KEY = 'siteflow_sandbox_companies';

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
};
