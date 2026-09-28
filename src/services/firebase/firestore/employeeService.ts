/**
 * @license
 * SITEFLOW Employee Management Service
 * Multi-tenant workforce store located under `/companies/{companyId}/employees/{employeeId}`.
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
import type { Employee, UserStatus } from '../../../types';

const SANDBOX_EMPLOYEES_KEY = 'siteflow_sandbox_employees';

export const employeeService = {
  /**
   * Fetch all employees for a tenant company
   */
  async getEmployeesByCompany(companyId: string): Promise<Employee[]> {
    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${companyId}/employees`;
      try {
        const ref = collection(db, 'companies', companyId, 'employees');
        const q = query(ref, orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        return snap.docs.map((d) => d.data() as Employee);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_EMPLOYEES_KEY);
      if (raw) {
        const allEmployees: Employee[] = JSON.parse(raw);
        return allEmployees.filter((e) => e.companyId === companyId);
      }
      return [];
    }
  },

  /**
   * Fetch a single employee record
   */
  async getEmployee(companyId: string, employeeId: string): Promise<Employee | null> {
    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${companyId}/employees/${employeeId}`;
      try {
        const ref = doc(db, 'companies', companyId, 'employees', employeeId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          return snap.data() as Employee;
        }
        return null;
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
      }
    } else {
      const employees = await this.getEmployeesByCompany(companyId);
      return employees.find((e) => e.employeeId === employeeId) || null;
    }
  },

  /**
   * Create an employee with rigorous validation
   */
  async createEmployee(companyId: string, employeeData: Employee): Promise<void> {
    // Validate required fields
    if (!employeeData.firstName?.trim() || !employeeData.lastName?.trim()) {
      throw new Error('First name and last name are required.');
    }
    if (!employeeData.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employeeData.email)) {
      throw new Error('A valid email address is required.');
    }
    if (!employeeData.employeeNumber?.trim()) {
      throw new Error('Employee number is required.');
    }

    // Check duplicate email within this company
    const existingEmployees = await this.getEmployeesByCompany(companyId);
    const duplicate = existingEmployees.some(
      (e) => e.email.toLowerCase() === employeeData.email.toLowerCase()
    );
    if (duplicate) {
      throw new Error(`An employee with email "${employeeData.email}" already exists in this company.`);
    }

    const cleaned = stripUndefined(employeeData);
    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${companyId}/employees/${employeeData.employeeId}`;
      try {
        const ref = doc(db, 'companies', companyId, 'employees', employeeData.employeeId);
        await setDoc(ref, cleaned);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_EMPLOYEES_KEY);
      const allEmployees: Employee[] = raw ? JSON.parse(raw) : [];
      allEmployees.push(cleaned);
      localStorage.setItem(SANDBOX_EMPLOYEES_KEY, JSON.stringify(allEmployees));
    }
  },

  /**
   * Update an employee
   */
  async updateEmployee(
    companyId: string,
    employeeId: string,
    updates: Partial<Omit<Employee, 'employeeId' | 'companyId' | 'createdAt'>>
  ): Promise<void> {
    const payload = stripUndefined({
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${companyId}/employees/${employeeId}`;
      try {
        const ref = doc(db, 'companies', companyId, 'employees', employeeId);
        await updateDoc(ref, payload);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_EMPLOYEES_KEY);
      if (raw) {
        let allEmployees: Employee[] = JSON.parse(raw);
        allEmployees = allEmployees.map((e) => {
          if (e.companyId === companyId && e.employeeId === employeeId) {
            return { ...e, ...payload };
          }
          return e;
        });
        localStorage.setItem(SANDBOX_EMPLOYEES_KEY, JSON.stringify(allEmployees));
      }
    }
  },

  /**
   * Toggle or set status (active / inactive / suspended)
   */
  async setEmployeeStatus(companyId: string, employeeId: string, status: UserStatus): Promise<void> {
    return this.updateEmployee(companyId, employeeId, { status });
  },
};
