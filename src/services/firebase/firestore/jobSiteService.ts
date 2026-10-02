/**
 * @license
 * SITEFLOW Job Site & Geofence Service
 * Multi-tenant job site store under `/companies/{companyId}/jobSites/{jobSiteId}`.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import { db, firebaseStatus } from '../firebaseApp';
import { handleFirestoreError, OperationType } from '../errorHandler';
import { stripUndefined } from '../../../utils/cleanFirestoreData';
import type { JobSite } from '../../../types';

const SANDBOX_JOBSITES_KEY = 'siteflow_sandbox_jobsites';

export const jobSiteService = {
  /**
   * Fetch all job sites for a company tenant, optionally filtered by project
   */
  async getJobSitesByCompany(companyId: string, projectId?: string): Promise<JobSite[]> {
    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${companyId}/jobSites`;
      try {
        const ref = collection(db, 'companies', companyId, 'jobSites');
        const constraints = projectId
          ? [where('projectId', '==', projectId), orderBy('createdAt', 'desc')]
          : [orderBy('createdAt', 'desc')];
        const q = query(ref, ...constraints);
        const snap = await getDocs(q);
        return snap.docs.map((d) => d.data() as JobSite);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_JOBSITES_KEY);
      if (raw) {
        const all: JobSite[] = JSON.parse(raw);
        return all.filter(
          (s) => s.companyId === companyId && (!projectId || s.projectId === projectId)
        );
      }
      return [];
    }
  },

  /**
   * Fetch a single job site
   */
  async getJobSite(companyId: string, jobSiteId: string): Promise<JobSite | null> {
    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${companyId}/jobSites/${jobSiteId}`;
      try {
        const ref = doc(db, 'companies', companyId, 'jobSites', jobSiteId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          return snap.data() as JobSite;
        }
        return null;
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
      }
    } else {
      const sites = await this.getJobSitesByCompany(companyId);
      return sites.find((s) => s.jobSiteId === jobSiteId) || null;
    }
  },

  /**
   * Create a job site with geofence parameters
   */
  async createJobSite(companyId: string, jobSiteData: JobSite): Promise<void> {
    if (!jobSiteData.name?.trim()) throw new Error('Job site name is required.');
    if (!jobSiteData.projectId?.trim()) {
      throw new Error('A valid Project reference is required. Job sites must be linked to an existing project contract.');
    }
    if (!jobSiteData.address?.trim()) throw new Error('Physical address is required.');
    if (typeof jobSiteData.latitude !== 'number' || isNaN(jobSiteData.latitude) || jobSiteData.latitude < -90 || jobSiteData.latitude > 90) {
      throw new Error('Valid GPS latitude coordinate between -90 and +90 degrees is required.');
    }
    if (typeof jobSiteData.longitude !== 'number' || isNaN(jobSiteData.longitude) || jobSiteData.longitude < -180 || jobSiteData.longitude > 180) {
      throw new Error('Valid GPS longitude coordinate between -180 and +180 degrees is required.');
    }
    if (
      typeof jobSiteData.radiusMeters !== 'number' ||
      !Number.isFinite(jobSiteData.radiusMeters) ||
      jobSiteData.radiusMeters < 25 ||
      jobSiteData.radiusMeters > 2000
    ) {
      throw new Error('Geofence radius must be a finite number between 25 and 2,000 meters.');
    }
    if (!jobSiteData.createdBy?.trim()) {
      throw new Error('Authenticated creator identity (UID) is required.');
    }
    const validStatuses = ['active', 'inactive', 'closed'];
    if (!validStatuses.includes(jobSiteData.status)) {
      throw new Error(`Invalid job site status '${jobSiteData.status}'. Must be one of: ${validStatuses.join(', ')}`);
    }

    const cleanData = stripUndefined(jobSiteData);

    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${companyId}/jobSites/${jobSiteData.jobSiteId}`;
      try {
        const ref = doc(db, 'companies', companyId, 'jobSites', jobSiteData.jobSiteId);
        await setDoc(ref, cleanData);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_JOBSITES_KEY);
      const all: JobSite[] = raw ? JSON.parse(raw) : [];
      all.push(cleanData as JobSite);
      localStorage.setItem(SANDBOX_JOBSITES_KEY, JSON.stringify(all));
    }
  },

  /**
   * Update job site details & geofence parameters
   */
  async updateJobSite(
    companyId: string,
    jobSiteId: string,
    updates: Partial<Omit<JobSite, 'jobSiteId' | 'companyId' | 'createdAt' | 'createdBy'>>
  ): Promise<void> {
    if (updates.status) {
      const validStatuses = ['active', 'inactive', 'closed'];
      if (!validStatuses.includes(updates.status)) {
        throw new Error(`Invalid job site status '${updates.status}'. Must be one of: ${validStatuses.join(', ')}`);
      }
    }
    if (updates.latitude !== undefined) {
      if (typeof updates.latitude !== 'number' || !Number.isFinite(updates.latitude) || updates.latitude < -90 || updates.latitude > 90) {
        throw new Error('Valid GPS latitude coordinate between -90 and +90 degrees is required.');
      }
    }
    if (updates.longitude !== undefined) {
      if (typeof updates.longitude !== 'number' || !Number.isFinite(updates.longitude) || updates.longitude < -180 || updates.longitude > 180) {
        throw new Error('Valid GPS longitude coordinate between -180 and +180 degrees is required.');
      }
    }
    if (updates.radiusMeters !== undefined) {
      if (typeof updates.radiusMeters !== 'number' || !Number.isFinite(updates.radiusMeters) || updates.radiusMeters < 25 || updates.radiusMeters > 2000) {
        throw new Error('Geofence radius must be a finite number between 25 and 2,000 meters.');
      }
    }

    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${companyId}/jobSites/${jobSiteId}`;
      try {
        const ref = doc(db, 'companies', companyId, 'jobSites', jobSiteId);
        await updateDoc(ref, payload);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_JOBSITES_KEY);
      if (raw) {
        let all: JobSite[] = JSON.parse(raw);
        all = all.map((s) => (s.jobSiteId === jobSiteId ? { ...s, ...payload } : s));
        localStorage.setItem(SANDBOX_JOBSITES_KEY, JSON.stringify(all));
      }
    }
  },
};
