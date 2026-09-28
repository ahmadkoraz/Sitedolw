/**
 * @license
 * Centralized Firebase Service Initializer
 * Provides authenticated Firebase instances or cleanly detects unconfigured state.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  type Auth,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { resolveFirebaseConfig, type FirebaseConnectionStatus } from '../../config/firebase.config';

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;

const { config, status } = resolveFirebaseConfig();

export const firebaseStatus: FirebaseConnectionStatus = status;

if (config && status.isConfigured) {
  try {
    if (!getApps().length) {
      appInstance = initializeApp(config);
      // Initialize authoritative Auth instance with multi-tier persistence
      // Supports IndexedDB as primary, with automatic localStorage fallback in restrictive iframe contexts
      try {
        authInstance = initializeAuth(appInstance, {
          persistence: [indexedDBLocalPersistence, browserLocalPersistence],
          popupRedirectResolver: browserPopupRedirectResolver,
        });
      } catch {
        authInstance = getAuth(appInstance);
      }
    } else {
      appInstance = getApp();
      authInstance = getAuth(appInstance);
    }

    // Support specified databaseId if valid, otherwise use default
    const validDbId =
      config.firestoreDatabaseId &&
      !config.firestoreDatabaseId.startsWith('G-') &&
      config.firestoreDatabaseId !== '(default)'
        ? config.firestoreDatabaseId
        : undefined;
    dbInstance = validDbId ? getFirestore(appInstance, validDbId) : getFirestore(appInstance);
    storageInstance = getStorage(appInstance);

    console.info(`[SITEFLOW] Firebase successfully initialized for project: ${config.projectId}`);
  } catch (err) {
    console.error('[SITEFLOW] Firebase initialization error:', err);
  }
} else {
  console.warn('[SITEFLOW] Firebase is not yet configured with valid production credentials. Operating in sandbox/setup mode.');
}

export const firebaseApp = appInstance;
export const auth = authInstance;
export const db = dbInstance;
export const storage = storageInstance;

/**
 * Re-initializes Firebase when custom config is updated in UI
 */
export function reinitializeFirebase(): boolean {
  const resolved = resolveFirebaseConfig();
  if (resolved.config && resolved.status.isConfigured) {
    try {
      if (getApps().length) {
        // App already exists, cannot easily re-init on the fly without page reload
        window.location.reload();
        return true;
      }
      appInstance = initializeApp(resolved.config);
      try {
        authInstance = initializeAuth(appInstance, {
          persistence: [indexedDBLocalPersistence, browserLocalPersistence],
          popupRedirectResolver: browserPopupRedirectResolver,
        });
      } catch {
        authInstance = getAuth(appInstance);
      }
      const validDbId =
        resolved.config.firestoreDatabaseId &&
        !resolved.config.firestoreDatabaseId.startsWith('G-') &&
        resolved.config.firestoreDatabaseId !== '(default)'
          ? resolved.config.firestoreDatabaseId
          : undefined;
      dbInstance = validDbId ? getFirestore(appInstance, validDbId) : getFirestore(appInstance);
      storageInstance = getStorage(appInstance);
      return true;
    } catch (e) {
      console.error('Reinitialization failed:', e);
      return false;
    }
  }
  return false;
}
