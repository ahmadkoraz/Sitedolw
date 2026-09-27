/**
 * @license
 * SITEFLOW Auth Context & Authorization Hook
 * Provides reactive user identity, RBAC checks, and tenant isolation state.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import type { UserProfile, Company, UserRole, PermissionKey } from '../../types';
import { ROLE_PERMISSIONS } from '../../types';
import { authService, type AuthSessionUser } from '../../services/firebase/auth/authService';
import { userService } from '../../services/firebase/firestore/userService';
import { companyService } from '../../services/firebase/firestore/companyService';
import { auditService } from '../../services/firebase/firestore/auditService';

interface AuthContextValue {
  user: AuthSessionUser | null;
  userProfile: UserProfile | null;
  company: Company | null;
  loading: boolean;
  authInitializing: boolean;
  profileLoading: boolean;
  profileError: string | null;
  role: UserRole | null;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  needsOnboarding: boolean;
  hasPermission: (permission: PermissionKey) => boolean;
  refreshUserData: () => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGoogleRedirect: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthSessionUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [authInitializing, setAuthInitializing] = useState<boolean>(true);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Stale request protection token guard
  const currentRequestIdRef = useRef<number>(0);
  const lastAuditedLoginUidRef = useRef<string | null>(null);

  /**
   * Protected asynchronous profile and company loader.
   * Guarded against stale request race conditions and React StrictMode double mounts.
   */
  const fetchUserData = useCallback(async (sessionUser: AuthSessionUser | null) => {
    const requestId = ++currentRequestIdRef.current;

    if (!sessionUser) {
      setUserProfile(null);
      setCompany(null);
      setProfileError(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    setProfileError(null);

    try {
      const profile = await userService.getUserProfile(sessionUser.uid);

      // Discard stale response if a newer auth state or request started
      if (requestId !== currentRequestIdRef.current) return;

      if (profile) {
        setUserProfile(profile);

        if (profile.companyId) {
          try {
            const comp = await companyService.getCompany(profile.companyId);
            if (requestId !== currentRequestIdRef.current) return;
            setCompany(comp);

            if (!comp) {
              setProfileError(`Organization workspace "${profile.companyId}" could not be located.`);
            } else {
              // Non-fatal audit log for login, guarded against duplicate firing in StrictMode
              if (lastAuditedLoginUidRef.current !== sessionUser.uid) {
                lastAuditedLoginUidRef.current = sessionUser.uid;
                auditService
                  .logEvent({
                    companyId: profile.companyId,
                    actorUserId: sessionUser.uid,
                    actorRole: profile.role,
                    action: 'USER_LOGGED_IN',
                    resourceType: 'user',
                    resourceId: sessionUser.uid,
                  })
                  .catch((auditErr) => {
                    console.warn('[SITEFLOW] Non-fatal: could not log login audit event:', auditErr);
                  });
              }
            }
          } catch (compErr) {
            if (requestId !== currentRequestIdRef.current) return;
            console.error('[SITEFLOW] Company loading error:', compErr);
            setCompany(null);
            setProfileError(
              compErr instanceof Error ? compErr.message : 'Failed to load organization details.'
            );
          }
        } else {
          setCompany(null);
        }
      } else {
        // User is authenticated in Firebase Auth, but /users/{uid} does not exist yet (Safe Onboarding)
        setUserProfile(null);
        setCompany(null);
      }
    } catch (err) {
      if (requestId !== currentRequestIdRef.current) return;
      console.error('[SITEFLOW] User profile loading error:', err);
      setUserProfile(null);
      setCompany(null);
      setProfileError(
        err instanceof Error ? err.message : 'Database error loading user profile.'
      );
    } finally {
      if (requestId === currentRequestIdRef.current) {
        setProfileLoading(false);
      }
    }
  }, []);

  /**
   * Primary Auth Observer Lifecycle.
   * Firebase onAuthStateChanged is the authoritative source of truth.
   */
  useEffect(() => {
    // Process any returning Google redirect results once on boot
    authService.handleRedirectResult().catch((err) => {
      console.warn('[SITEFLOW] Redirect sign-in handling notice:', err);
    });

    const unsubscribe = authService.subscribeToAuthState((sessionUser) => {
      setAuthInitializing(false);
      setUser(sessionUser);
      fetchUserData(sessionUser);
    });

    return () => {
      unsubscribe();
    };
  }, [fetchUserData]);

  /**
   * Explicit retry for profile / company retrieval.
   * Preserves authenticated Firebase user; reloads tenant records without signing out.
   */
  const refreshUserData = useCallback(async () => {
    if (user) {
      await fetchUserData(user);
    }
  }, [user, fetchUserData]);

  /**
   * Email/Password Sign-In
   * Delegates authoritative state transition to Firebase onAuthStateChanged.
   */
  const login = async (email: string, pass: string) => {
    setProfileError(null);
    await authService.loginWithEmail(email, pass);
  };

  /**
   * Email/Password Registration
   * Delegates authoritative state transition to Firebase onAuthStateChanged.
   */
  const register = async (email: string, pass: string) => {
    setProfileError(null);
    await authService.registerWithEmail(email, pass);
  };

  /**
   * Google Popup Sign-In
   * Delegates authoritative state transition to Firebase onAuthStateChanged.
   */
  const loginWithGoogle = async () => {
    setProfileError(null);
    await authService.loginWithGoogle();
  };

  /**
   * Google Redirect Sign-In
   */
  const loginWithGoogleRedirect = async () => {
    setProfileError(null);
    await authService.loginWithGoogleRedirect();
  };

  /**
   * Authoritative Sign Out
   */
  const logout = async () => {
    if (user && userProfile?.companyId) {
      try {
        await auditService.logEvent({
          companyId: userProfile.companyId,
          actorUserId: user.uid,
          actorRole: userProfile.role,
          action: 'USER_LOGGED_OUT',
          resourceType: 'user',
          resourceId: user.uid,
        });
      } catch (err) {
        console.warn('[SITEFLOW] Non-fatal: Could not record logout audit:', err);
      }
    }
    lastAuditedLoginUidRef.current = null;
    await authService.logout();
    setUser(null);
    setUserProfile(null);
    setCompany(null);
    setProfileError(null);
  };

  const resetPassword = async (email: string) => {
    await authService.resetPassword(email);
  };

  const role: UserRole | null = userProfile?.role || null;
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isAdmin = role === 'ADMIN' || isSuperAdmin;
  const isEmployee = role === 'EMPLOYEE';

  // User is authenticated, profile loading is finished without error, but no profile or company exists yet
  const needsOnboarding = Boolean(
    user && (!userProfile || !userProfile.companyId) && !profileLoading && !profileError
  );

  // Generic loading indicator for legacy consumers
  const loading = authInitializing || (profileLoading && !userProfile && !profileError);

  const hasPermission = useCallback(
    (permission: PermissionKey): boolean => {
      if (!role) return false;
      const allowed = ROLE_PERMISSIONS[role] || [];
      return allowed.includes(permission);
    },
    [role]
  );

  const value = useMemo(
    () => ({
      user,
      userProfile,
      company,
      loading,
      authInitializing,
      profileLoading,
      profileError,
      role,
      isSuperAdmin,
      isAdmin,
      isEmployee,
      needsOnboarding,
      hasPermission,
      refreshUserData,
      login,
      register,
      loginWithGoogle,
      loginWithGoogleRedirect,
      logout,
      resetPassword,
    }),
    [
      user,
      userProfile,
      company,
      loading,
      authInitializing,
      profileLoading,
      profileError,
      role,
      isSuperAdmin,
      isAdmin,
      isEmployee,
      needsOnboarding,
      hasPermission,
      refreshUserData,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
