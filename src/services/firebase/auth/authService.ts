/**
 * @license
 * SITEFLOW Authentication Service
 * Wraps Firebase Auth with error mapping and safe fallback simulation when not configured.
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth, firebaseStatus } from '../firebaseApp';

export interface AuthSessionUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

// Local storage session key for sandbox/dev-mode simulation when Firebase is not connected
const SANDBOX_AUTH_KEY = 'siteflow_sandbox_auth_user';

export const authService = {
  /**
   * Listen to auth state transitions and handle redirect results
   */
  subscribeToAuthState(callback: (user: AuthSessionUser | null) => void): () => void {
    if (auth && firebaseStatus.isConfigured) {
      // Check for redirect sign-in resolution on startup
      getRedirectResult(auth)
        .then((cred) => {
          if (cred?.user) {
            console.info('[SITEFLOW] Redirect authentication successful for:', cred.user.email);
            callback({
              uid: cred.user.uid,
              email: cred.user.email,
              displayName: cred.user.displayName,
              photoURL: cred.user.photoURL,
              emailVerified: cred.user.emailVerified,
            });
          }
        })
        .catch((err) => {
          console.warn('[SITEFLOW] Non-fatal getRedirectResult notice:', err);
        });

      return firebaseOnAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
        if (fbUser) {
          callback({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            photoURL: fbUser.photoURL,
            emailVerified: fbUser.emailVerified,
          });
        } else {
          callback(null);
        }
      });
    } else {
      // Sandbox mode: Read from localStorage
      const checkLocal = () => {
        try {
          const raw = localStorage.getItem(SANDBOX_AUTH_KEY);
          if (raw) {
            callback(JSON.parse(raw));
          } else {
            callback(null);
          }
        } catch {
          callback(null);
        }
      };
      checkLocal();
      window.addEventListener('storage', checkLocal);
      return () => window.removeEventListener('storage', checkLocal);
    }
  },

  /**
   * Email and Password Login
   */
  async loginWithEmail(email: string, pass: string): Promise<AuthSessionUser> {
    if (auth && firebaseStatus.isConfigured) {
      try {
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        return {
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: cred.user.displayName,
          photoURL: cred.user.photoURL,
          emailVerified: cred.user.emailVerified,
        };
      } catch (err: unknown) {
        throw new Error(this.mapAuthError(err));
      }
    } else {
      // Sandbox development mode
      if (!email.includes('@')) throw new Error('Please enter a valid email address.');
      if (pass.length < 6) throw new Error('Password must be at least 6 characters.');

      // Check if user was previously created in sandbox
      const usersRaw = localStorage.getItem('siteflow_sandbox_users') || '[]';
      const users: { email: string; uid: string; displayName?: string }[] = JSON.parse(usersRaw);
      const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

      const user: AuthSessionUser = {
        uid: existing ? existing.uid : `sandbox_usr_${Date.now()}`,
        email,
        displayName: existing?.displayName || email.split('@')[0],
        photoURL: null,
        emailVerified: true,
      };

      localStorage.setItem(SANDBOX_AUTH_KEY, JSON.stringify(user));
      window.dispatchEvent(new Event('storage'));
      return user;
    }
  },

  /**
   * Register with Email and Password
   * Note: Registration alone DOES NOT assign privileged roles.
   */
  async registerWithEmail(email: string, pass: string): Promise<AuthSessionUser> {
    if (auth && firebaseStatus.isConfigured) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        return {
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: cred.user.displayName,
          photoURL: cred.user.photoURL,
          emailVerified: cred.user.emailVerified,
        };
      } catch (err: unknown) {
        throw new Error(this.mapAuthError(err));
      }
    } else {
      // Sandbox development mode
      if (!email.includes('@')) throw new Error('Please enter a valid email address.');
      if (pass.length < 6) throw new Error('Password must be at least 6 characters.');

      const uid = `sandbox_usr_${Date.now()}`;
      const user: AuthSessionUser = {
        uid,
        email,
        displayName: email.split('@')[0],
        photoURL: null,
        emailVerified: true,
      };

      const usersRaw = localStorage.getItem('siteflow_sandbox_users') || '[]';
      const users: { email: string; uid: string }[] = JSON.parse(usersRaw);
      users.push({ email, uid });
      localStorage.setItem('siteflow_sandbox_users', JSON.stringify(users));

      localStorage.setItem(SANDBOX_AUTH_KEY, JSON.stringify(user));
      window.dispatchEvent(new Event('storage'));
      return user;
    }
  },

  /**
   * Google Sign-In Architecture (Authenticates real Firebase UID)
   */
  async loginWithGoogle(): Promise<AuthSessionUser> {
    if (auth && firebaseStatus.isConfigured) {
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const cred = await signInWithPopup(auth, provider);
        return {
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: cred.user.displayName,
          photoURL: cred.user.photoURL,
          emailVerified: cred.user.emailVerified,
        };
      } catch (err: unknown) {
        console.error('[SITEFLOW] Google popup sign-in error:', err);
        throw new Error(this.mapAuthError(err));
      }
    } else {
      // Sandbox development mode only (when Firebase is unconfigured)
      const user: AuthSessionUser = {
        uid: 'sandbox_usr_demo',
        email: 'field.lead@siteflow.dev',
        displayName: 'Field Lead',
        photoURL: null,
        emailVerified: true,
      };
      localStorage.setItem(SANDBOX_AUTH_KEY, JSON.stringify(user));
      window.dispatchEvent(new Event('storage'));
      return user;
    }
  },

  /**
   * Safe Redirect-based Google Authentication fallback
   */
  async loginWithGoogleRedirect(): Promise<void> {
    if (auth && firebaseStatus.isConfigured) {
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithRedirect(auth, provider);
      } catch (err: unknown) {
        console.error('[SITEFLOW] Google redirect sign-in error:', err);
        throw new Error(this.mapAuthError(err));
      }
    } else {
      throw new Error('Google Sign-In redirect is only available in live Firebase mode.');
    }
  },

  /**
   * Forgot Password / Reset Password
   */
  async resetPassword(email: string): Promise<void> {
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid email address to send the reset link.');
    }

    if (auth && firebaseStatus.isConfigured) {
      try {
        await sendPasswordResetEmail(auth, email);
      } catch (err: unknown) {
        throw new Error(this.mapAuthError(err));
      }
    } else {
      // Sandbox mock delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.info(`[SANDBOX] Password reset link simulated for: ${email}`);
    }
  },

  /**
   * Logout
   */
  async logout(): Promise<void> {
    if (auth && firebaseStatus.isConfigured) {
      try {
        await signOut(auth);
      } catch (err: unknown) {
        throw new Error(this.mapAuthError(err));
      }
    } else {
      localStorage.removeItem(SANDBOX_AUTH_KEY);
      window.dispatchEvent(new Event('storage'));
    }
  },

  /**
   * Maps Firebase Auth error codes to clean, human-readable messages
   */
  mapAuthError(err: unknown): string {
    const message = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string })?.code || '';

    if (code === 'auth/configuration-not-found' || message.includes('auth/configuration-not-found')) {
      return 'Firebase Authentication is not enabled for project sitefolw. In the Firebase Console, go to Authentication > Sign-in method, click "Get started", and enable Email/Password (and Google).';
    }
    if (code === 'auth/invalid-email' || message.includes('auth/invalid-email')) return 'Invalid email address format.';
    if (
      message.includes('auth/user-not-found') ||
      message.includes('auth/wrong-password') ||
      message.includes('auth/invalid-credential')
    ) {
      return 'Invalid email or password.';
    }
    if (message.includes('auth/email-already-in-use')) {
      return 'An account already exists with this email address.';
    }
    if (message.includes('auth/weak-password')) {
      return 'Password should be at least 6 characters.';
    }
    if (message.includes('auth/popup-closed-by-user')) {
      return 'Google sign-in was cancelled.';
    }
    if (message.includes('auth/popup-blocked')) {
      return 'The Google sign-in popup was blocked by browser security. Please allow popups or use direct login.';
    }
    if (message.includes('auth/unauthorized-domain')) {
      return 'This web domain is not yet authorized in Firebase Console -> Authentication -> Settings -> Authorized Domains.';
    }
    if (message.includes('auth/operation-not-allowed')) {
      return 'Google sign-in provider is disabled in Firebase Console -> Authentication -> Sign-in method.';
    }
    if (message.includes('auth/cancelled-popup-request')) {
      return 'Another sign-in window is already open. Please check your browser windows.';
    }
    if (message.includes('auth/network-request-failed')) {
      return 'Network error. Please check your connection.';
    }
    return message || 'Authentication failed. Please try again.';
  },
};
