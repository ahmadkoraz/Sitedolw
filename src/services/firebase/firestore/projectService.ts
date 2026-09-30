/**
 * @license
 * SITEFLOW Project Management Service
 * Multi-tenant project store under `/companies/{companyId}/projects/{projectId}`.
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
} from 'firebase/firestore';
import { db, firebaseStatus } from '../firebaseApp';
import { handleFirestoreError, OperationType } from '../errorHandler';
import { stripUndefined } from '../../../utils/cleanFirestoreData';
import type { Project } from '../../../types';

const SANDBOX_PROJECTS_KEY = 'siteflow_sandbox_projects';

export const projectService = {
  /**
   * Fetch all projects for a company tenant
   */
  async getProjectsByCompany(companyId: string): Promise<Project[]> {
    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${companyId}/projects`;
      try {
        const ref = collection(db, 'companies', companyId, 'projects');
        const q = query(ref, orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        return snap.docs.map((d) => d.data() as Project);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_PROJECTS_KEY);
      if (raw) {
        const all: Project[] = JSON.parse(raw);
        return all.filter((p) => p.companyId === companyId);
      }
      return [];
    }
  },

  /**
   * Fetch a single project
   */
  async getProject(companyId: string, projectId: string): Promise<Project | null> {
    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${companyId}/projects/${projectId}`;
      try {
        const ref = doc(db, 'companies', companyId, 'projects', projectId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          return snap.data() as Project;
        }
        return null;
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
      }
    } else {
      const projects = await this.getProjectsByCompany(companyId);
      return projects.find((p) => p.projectId === projectId) || null;
    }
  },

  /**
   * Create a project
   */
  async createProject(companyId: string, projectData: Project): Promise<void> {
    if (!projectData.name?.trim()) throw new Error('Project name is required.');
    if (!projectData.code?.trim()) throw new Error('Project code is required.');
    if (!projectData.createdBy?.trim()) throw new Error('Authenticated creator identity (UID) is required.');

    const cleanData = stripUndefined(projectData);

    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${companyId}/projects/${projectData.projectId}`;
      try {
        const ref = doc(db, 'companies', companyId, 'projects', projectData.projectId);
        await setDoc(ref, cleanData);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_PROJECTS_KEY);
      const all: Project[] = raw ? JSON.parse(raw) : [];
      all.push(cleanData as Project);
      localStorage.setItem(SANDBOX_PROJECTS_KEY, JSON.stringify(all));
    }
  },

  /**
   * Update project details
   */
  async updateProject(
    companyId: string,
    projectId: string,
    updates: Partial<Omit<Project, 'projectId' | 'companyId' | 'createdAt' | 'createdBy'>>
  ): Promise<void> {
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${companyId}/projects/${projectId}`;
      try {
        const ref = doc(db, 'companies', companyId, 'projects', projectId);
        await updateDoc(ref, payload);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_PROJECTS_KEY);
      if (raw) {
        let all: Project[] = JSON.parse(raw);
        all = all.map((p) => (p.projectId === projectId ? { ...p, ...payload } : p));
        localStorage.setItem(SANDBOX_PROJECTS_KEY, JSON.stringify(all));
      }
    }
  },
};
