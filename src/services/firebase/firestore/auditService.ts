/**
 * @license
 * SITEFLOW Immutable Audit Trail Service
 * Scoped under `/companies/{companyId}/auditLogs/{auditId}`.
 */

import { collection, doc, getDocs, setDoc, query, orderBy, limit } from 'firebase/firestore';
import { db, firebaseStatus } from '../firebaseApp';
import { handleFirestoreError, OperationType } from '../errorHandler';
import type { AuditLog, AuditAction, UserRole } from '../../../types';

const SANDBOX_AUDIT_KEY = 'siteflow_sandbox_audit_logs';

export const auditService = {
  /**
   * Log an administrative or compliance event
   */
  async logEvent(params: {
    companyId: string;
    actorUserId: string;
    actorRole: UserRole | string;
    action: AuditAction;
    resourceType: AuditLog['resourceType'];
    resourceId: string;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    metadata?: { ip?: string; userAgent?: string; note?: string; [key: string]: unknown };
  }): Promise<void> {
    const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const event: AuditLog = {
      auditId,
      companyId: params.companyId,
      actorUserId: params.actorUserId,
      actorRole: params.actorRole,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      before: params.before || null,
      after: params.after || null,
      timestamp: new Date().toISOString(),
      metadata: params.metadata || {},
    };

    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${params.companyId}/auditLogs/${auditId}`;
      try {
        const ref = doc(db, 'companies', params.companyId, 'auditLogs', auditId);
        await setDoc(ref, event);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_AUDIT_KEY);
      const allLogs: AuditLog[] = raw ? JSON.parse(raw) : [];
      allLogs.unshift(event);
      localStorage.setItem(SANDBOX_AUDIT_KEY, JSON.stringify(allLogs));
    }
  },

  /**
   * Fetch recent audit logs for a company (Admin only)
   */
  async getAuditLogs(companyId: string, maxEntries = 50): Promise<AuditLog[]> {
    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${companyId}/auditLogs`;
      try {
        const ref = collection(db, 'companies', companyId, 'auditLogs');
        const q = query(ref, orderBy('timestamp', 'desc'), limit(maxEntries));
        const snap = await getDocs(q);
        return snap.docs.map((d) => d.data() as AuditLog);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_AUDIT_KEY);
      if (raw) {
        const allLogs: AuditLog[] = JSON.parse(raw);
        return allLogs.filter((l) => l.companyId === companyId).slice(0, maxEntries);
      }
      return [];
    }
  },
};
