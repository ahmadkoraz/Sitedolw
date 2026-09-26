/**
 * @license
 * SITEFLOW Invitation Management Service
 * Manages team invitations under `/companies/{companyId}/invitations/{invitationId}`.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collectionGroup,
  query,
  where,
} from 'firebase/firestore';
import { db, firebaseStatus } from '../firebaseApp';
import { handleFirestoreError, OperationType } from '../errorHandler';
import type { Invitation, UserRole, UserProfile, Employee } from '../../../types';
import { userService } from './userService';
import { employeeService } from './employeeService';
import { auditService } from './auditService';
import type { AuthSessionUser } from '../auth/authService';

const SANDBOX_INVITES_KEY = 'siteflow_sandbox_invitations';

export const invitationService = {
  /**
   * Fetch company invitations (Admin view)
   */
  async getInvitations(companyId: string): Promise<Invitation[]> {
    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${companyId}/invitations`;
      try {
        const ref = collection(db, 'companies', companyId, 'invitations');
        const snap = await getDocs(ref);
        return snap.docs.map((d) => d.data() as Invitation);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_INVITES_KEY);
      if (raw) {
        const list: Invitation[] = JSON.parse(raw);
        return list.filter((i) => i.companyId === companyId);
      }
      return [];
    }
  },

  /**
   * Fetch single invitation by companyId and invitationId
   */
  async getInvitation(companyId: string, invitationId: string): Promise<Invitation | null> {
    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${companyId}/invitations/${invitationId}`;
      try {
        const ref = doc(db, 'companies', companyId, 'invitations', invitationId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          return snap.data() as Invitation;
        }
        return null;
      } catch (err) {
        console.warn(`[SITEFLOW] Failed to get invitation at ${path}:`, err);
        return null;
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_INVITES_KEY);
      if (raw) {
        const list: Invitation[] = JSON.parse(raw);
        return list.find((i) => i.companyId === companyId && i.invitationId === invitationId) || null;
      }
      return null;
    }
  },

  /**
   * Parses compound or simple invitation code (e.g. "comp_123:inv_456" or URL query param)
   */
  parseInviteCode(code: string): { companyId: string; invitationId: string } | null {
    const trimmed = (code || '').trim();
    if (!trimmed) return null;

    if (trimmed.includes(':')) {
      const [comp, inv] = trimmed.split(':');
      if (comp && inv) return { companyId: comp.trim(), invitationId: inv.trim() };
    }
    if (trimmed.includes('::')) {
      const [comp, inv] = trimmed.split('::');
      if (comp && inv) return { companyId: comp.trim(), invitationId: inv.trim() };
    }
    return null;
  },

  /**
   * Search for pending invitations matching user's authenticated email
   */
  async getPendingInvitationsForEmail(email: string): Promise<Invitation[]> {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) return [];

    if (db && firebaseStatus.isConfigured) {
      try {
        // Query collection group invitations across companies
        const q = query(
          collectionGroup(db, 'invitations'),
          where('email', '==', cleanEmail),
          where('status', '==', 'pending')
        );
        const snap = await getDocs(q);
        const results = snap.docs.map((d) => d.data() as Invitation);
        return results;
      } catch (err) {
        console.warn('[SITEFLOW] Collection group invitation query notice:', err);
        return [];
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_INVITES_KEY);
      if (raw) {
        const list: Invitation[] = JSON.parse(raw);
        return list.filter((i) => i.email.toLowerCase() === cleanEmail && i.status === 'pending');
      }
      return [];
    }
  },

  /**
   * Create new team invitation
   */
  async createInvitation(params: {
    companyId: string;
    email: string;
    role: UserRole;
    jobTitle?: string;
    invitedBy: string;
  }): Promise<Invitation> {
    if (!params.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.email)) {
      throw new Error('Valid email address is required.');
    }

    const invitationId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const invitation: Invitation = {
      invitationId,
      companyId: params.companyId,
      email: params.email.toLowerCase().trim(),
      role: params.role,
      jobTitle: params.jobTitle,
      invitedBy: params.invitedBy,
      status: 'pending',
      expiresAt,
      createdAt: new Date().toISOString(),
    };

    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${params.companyId}/invitations/${invitationId}`;
      try {
        const ref = doc(db, 'companies', params.companyId, 'invitations', invitationId);
        await setDoc(ref, invitation);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_INVITES_KEY);
      const list: Invitation[] = raw ? JSON.parse(raw) : [];
      list.push(invitation);
      localStorage.setItem(SANDBOX_INVITES_KEY, JSON.stringify(list));
    }

    return invitation;
  },

  /**
   * Securely accepts an invitation:
   * - Validates invitation status, email match, and expiration
   * - Creates user profile with exact invited role (Zero privilege escalation)
   * - Creates employee record linked to user
   * - Marks invitation as accepted
   * - Emits immutable audit log
   */
  async acceptInvitation(params: {
    invitation: Invitation;
    user: AuthSessionUser;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<void> {
    const { invitation, user, firstName, lastName, phone } = params;

    if (!user.email || user.email.toLowerCase().trim() !== invitation.email.toLowerCase().trim()) {
      throw new Error(
        `This invitation was issued to ${invitation.email}. You are signed in as ${user.email}. Please sign in with the invited email address.`
      );
    }

    if (invitation.status !== 'pending') {
      throw new Error(`This invitation is no longer pending (current status: ${invitation.status}).`);
    }

    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
      throw new Error('This invitation has expired. Please contact your company administrator.');
    }

    const timestamp = new Date().toISOString();
    const displayName = `${firstName.trim()} ${lastName.trim()}`.trim() || user.displayName || 'Team Member';

    // 1. Create User Profile with authoritative invited role (never auto-SUPER_ADMIN)
    const newProfile: UserProfile = {
      uid: user.uid,
      companyId: invitation.companyId,
      email: user.email,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      displayName,
      phone: phone?.trim() || undefined,
      role: invitation.role, // Authorized role from invitation
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
      lastLoginAt: timestamp,
    };
    await userService.createUserProfile(newProfile);

    // 2. Create Employee workforce record
    const empId = `emp_${user.uid.slice(0, 8)}`;
    const employeeRecord: Employee = {
      employeeId: empId,
      userId: user.uid,
      companyId: invitation.companyId,
      employeeNumber: `EMP-${Date.now().toString().slice(-4)}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: user.email,
      phone: phone?.trim() || undefined,
      role: invitation.role,
      jobTitle: invitation.jobTitle || 'Field Team Member',
      status: 'active',
      hireDate: new Date().toISOString().split('T')[0],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await employeeService.createEmployee(invitation.companyId, employeeRecord);

    // 3. Mark invitation accepted
    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${invitation.companyId}/invitations/${invitation.invitationId}`;
      try {
        const ref = doc(db, 'companies', invitation.companyId, 'invitations', invitation.invitationId);
        await updateDoc(ref, {
          status: 'accepted',
          acceptedAt: timestamp,
          acceptedByUserId: user.uid,
        });
      } catch (err) {
        console.warn(`[SITEFLOW] Non-fatal: could not update invitation doc status at ${path}:`, err);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_INVITES_KEY);
      if (raw) {
        let list: Invitation[] = JSON.parse(raw);
        list = list.map((inv) =>
          inv.invitationId === invitation.invitationId
            ? { ...inv, status: 'accepted', acceptedAt: timestamp }
            : inv
        );
        localStorage.setItem(SANDBOX_INVITES_KEY, JSON.stringify(list));
      }
    }

    // 4. Record Audit Log
    try {
      await auditService.logEvent({
        companyId: invitation.companyId,
        actorUserId: user.uid,
        actorRole: invitation.role,
        action: 'INVITATION_ACCEPTED',
        resourceType: 'invitation',
        resourceId: invitation.invitationId,
        metadata: {
          recipientEmail: user.email,
          roleAssigned: invitation.role,
        },
      });
    } catch (auditErr) {
      console.warn('[SITEFLOW] Non-fatal audit log notice:', auditErr);
    }
  },

  /**
   * Revoke an invitation
   */
  async revokeInvitation(companyId: string, invitationId: string): Promise<void> {
    if (db && firebaseStatus.isConfigured) {
      const path = `companies/${companyId}/invitations/${invitationId}`;
      try {
        const ref = doc(db, 'companies', companyId, 'invitations', invitationId);
        await updateDoc(ref, { status: 'revoked', updatedAt: new Date().toISOString() });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_INVITES_KEY);
      if (raw) {
        let list: Invitation[] = JSON.parse(raw);
        list = list.map((inv) =>
          inv.invitationId === invitationId ? { ...inv, status: 'revoked' } : inv
        );
        localStorage.setItem(SANDBOX_INVITES_KEY, JSON.stringify(list));
      }
    }
  },
};
