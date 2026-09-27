/**
 * @license
 * SITEFLOW Firebase Configuration Layer
 * Inspects environment variables and determines real-time backend readiness.
 */

import appletConfig from '../../firebase-applet-config.json';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
}

export interface FirebaseConnectionStatus {
  isConfigured: boolean;
  isAuthAvailable: boolean;
  isFirestoreAvailable: boolean;
  missingKeys: string[];
  projectId?: string;
  authDomain?: string;
  isSandboxMode: boolean;
}

/**
 * Extracts configuration from Vite import.meta.env
 */
export function getFirebaseConfigFromEnv(): FirebaseClientConfig | null {
  const env = import.meta.env;

  const apiKey = (env.VITE_FIREBASE_API_KEY || '').trim();
  const authDomain = (env.VITE_FIREBASE_AUTH_DOMAIN || '').trim();
  const projectId = (env.VITE_FIREBASE_PROJECT_ID || '').trim();
  // Strip any accidental wrapping quotes from storage bucket
  const storageBucket = (env.VITE_FIREBASE_STORAGE_BUCKET || '').replace(/^["']|["']$/g, '').trim();
  const messagingSenderId = (env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim();
  const appId = (env.VITE_FIREBASE_APP_ID || '').trim();

  // Distinguish Google Analytics measurement IDs (G-XXXXXXXXXX) from real Firestore database IDs
  const rawDbId = (env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '').trim();
  const measurementId =
    (env.VITE_FIREBASE_MEASUREMENT_ID || (rawDbId.startsWith('G-') ? rawDbId : '')).trim() ||
    undefined;
  const firestoreDatabaseId =
    rawDbId && !rawDbId.startsWith('G-') && rawDbId !== '(default)' ? rawDbId : undefined;

  // Check if placeholder or missing
  const isPlaceholder = (val: string) =>
    !val ||
    val.includes('AIzaSyYourFirebaseApiKeyPlaceholder') ||
    val.includes('siteflow-production');

  if (!apiKey || isPlaceholder(apiKey) || !projectId || isPlaceholder(projectId)) {
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    measurementId,
    firestoreDatabaseId,
  };
}

/**
 * Checks local storage for user-provided runtime config (useful in preview environment)
 */
export function getStoredFirebaseConfig(): FirebaseClientConfig | null {
  try {
    const raw = localStorage.getItem('siteflow_custom_firebase_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse stored Firebase config', err);
  }
  return null;
}

/**
 * Saves runtime config in localStorage
 */
export function saveStoredFirebaseConfig(config: FirebaseClientConfig): void {
  localStorage.setItem('siteflow_custom_firebase_config', JSON.stringify(config));
}

/**
 * Clears stored runtime config
 */
export function clearStoredFirebaseConfig(): void {
  localStorage.removeItem('siteflow_custom_firebase_config');
}

/**
 * Extracts configuration from firebase-applet-config.json provisioned by AI Studio
 */
export function getAppletConfig(): FirebaseClientConfig | null {
  try {
    if (appletConfig && appletConfig.apiKey && appletConfig.projectId) {
      return {
        apiKey: appletConfig.apiKey,
        authDomain: appletConfig.authDomain || `${appletConfig.projectId}.firebaseapp.com`,
        projectId: appletConfig.projectId,
        storageBucket: appletConfig.storageBucket || `${appletConfig.projectId}.appspot.com`,
        messagingSenderId: appletConfig.messagingSenderId || '',
        appId: appletConfig.appId || '',
        measurementId: appletConfig.measurementId || undefined,
        firestoreDatabaseId: appletConfig.firestoreDatabaseId || undefined,
      };
    }
  } catch (err) {
    console.warn('Failed to parse applet Firebase config', err);
  }
  return null;
}

/**
 * Resolves active configuration
 */
export function resolveFirebaseConfig(): {
  config: FirebaseClientConfig | null;
  status: FirebaseConnectionStatus;
} {
  const appletConfigResolved = getAppletConfig();
  const envConfig = getFirebaseConfigFromEnv();
  const storedConfig = getStoredFirebaseConfig();
  const activeConfig = appletConfigResolved || envConfig || storedConfig;

  const requiredKeys: (keyof FirebaseClientConfig)[] = [
    'apiKey',
    'authDomain',
    'projectId',
    'appId',
  ];

  const missingKeys: string[] = [];
  if (!activeConfig) {
    missingKeys.push('VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID');
  } else {
    for (const key of requiredKeys) {
      if (!activeConfig[key]) {
        missingKeys.push(key);
      }
    }
  }

  const isConfigured = activeConfig !== null && missingKeys.length === 0;

  return {
    config: activeConfig,
    status: {
      isConfigured,
      isAuthAvailable: isConfigured,
      isFirestoreAvailable: isConfigured,
      missingKeys,
      projectId: activeConfig?.projectId,
      authDomain: activeConfig?.authDomain,
      isSandboxMode: !isConfigured,
    },
  };
}
