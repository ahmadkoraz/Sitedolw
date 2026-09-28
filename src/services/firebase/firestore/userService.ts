/**
 * @license
 * SITEFLOW User Profile Service
 * Manages user documents in `/users/{userId}`.
 */

import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, firebaseStatus } from '../firebaseApp';
import { handleFirestoreError, OperationType } from '../errorHandler';
import { stripUndefined } from '../../../utils/cleanFirestoreData';
import type { UserProfile } from '../../../types';

const SANDBOX_USERS_KEY = 'siteflow_sandbox_user_profiles';

export const userService = {
  /**
   * Fetch user profile by Firebase Auth UID
   */
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    if (db && firebaseStatus.isConfigured) {
      const path = `users/${uid}`;
      try {
        const ref = doc(db, 'users', uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          return snap.data() as UserProfile;
        }
        return null;
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_USERS_KEY);
      if (raw) {
        const users: Record<string, UserProfile> = JSON.parse(raw);
        return users[uid] || null;
      }
      return null;
    }
  },

  /**
   * Create initial user profile
   */
  async createUserProfile(profile: UserProfile): Promise<void> {
    const cleaned = stripUndefined(profile);
    if (db && firebaseStatus.isConfigured) {
      const path = `users/${profile.uid}`;
      try {
        const ref = doc(db, 'users', profile.uid);
        await setDoc(ref, cleaned);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_USERS_KEY);
      const users: Record<string, UserProfile> = raw ? JSON.parse(raw) : {};
      users[profile.uid] = cleaned;
      localStorage.setItem(SANDBOX_USERS_KEY, JSON.stringify(users));
    }
  },

  /**
   * Update profile fields allowed for self-management:
   * (firstName, lastName, phone, photoUrl)
   * Prevents self-escalation of role or companyId!
   */
  async updateSelfProfile(
    uid: string,
    updates: Partial<Pick<UserProfile, 'firstName' | 'lastName' | 'phone' | 'photoUrl'>>
  ): Promise<void> {
    const payload = stripUndefined({
      ...updates,
      displayName: `${updates.firstName || ''} ${updates.lastName || ''}`.trim() || undefined,
      updatedAt: new Date().toISOString(),
    });

    if (db && firebaseStatus.isConfigured) {
      const path = `users/${uid}`;
      try {
        const ref = doc(db, 'users', uid);
        await updateDoc(ref, payload);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_USERS_KEY);
      const users: Record<string, UserProfile> = raw ? JSON.parse(raw) : {};
      if (users[uid]) {
        users[uid] = {
          ...users[uid],
          ...payload,
          displayName: payload.displayName || users[uid].displayName,
        };
        localStorage.setItem(SANDBOX_USERS_KEY, JSON.stringify(users));
      }
    }
  },

  /**
   * Fetch all users in a specific company (Admin only)
   */
  async getUsersByCompany(companyId: string): Promise<UserProfile[]> {
    if (db && firebaseStatus.isConfigured) {
      const path = 'users';
      try {
        const q = query(collection(db, 'users'), where('companyId', '==', companyId));
        const snap = await getDocs(q);
        return snap.docs.map((d) => d.data() as UserProfile);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    } else {
      const raw = localStorage.getItem(SANDBOX_USERS_KEY);
      if (raw) {
        const users: Record<string, UserProfile> = JSON.parse(raw);
        return Object.values(users).filter((u) => u.companyId === companyId);
      }
      return [];
    }
  },
};
