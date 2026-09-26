/**
 * @license
 * SITEFLOW Auth Context & Authorization Hook
 * Provides reactive user identity, RBAC checks, and tenant isolation state.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
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
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async (sessionUser: AuthSessionUser | null) => {
    if (!sessionUser) {
      setUserProfile(null);
      setCompany(null);
      setLoading(false);
      return;
    }

    try {
      const profile = await userService.getUserProfile(sessionUser.uid);
      if (profile) {
        setUserProfile(profile);
        if (profile.companyId) {
          const comp = await companyService.getCompany(profile.companyId);
          setCompany(comp);
        } else {
          setCompany(null);
        }
      } else {
        setUserProfile(null);
        setCompany(null);
      }
    } catch (err) {
      console.error('Error fetching user profile or company:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = authService.subscribeToAuthState((sessionUser) => {
      setUser(sessionUser);
      fetchUserData(sessionUser);
    });

    return () => unsubscribe();
  }, [fetchUserData]);

  const refreshUserData = useCallback(async () => {
    if (user) {
      await fetchUserData(user);
    }
  }, [user, fetchUserData]);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const loggedUser = await authService.loginWithEmail(email, pass);
      setUser(loggedUser);
      await fetchUserData(loggedUser);

      // Record audit login safely (non-fatal if Firestore rules are still provisioning)
      try {
        const profile = await userService.getUserProfile(loggedUser.uid);
        if (profile?.companyId) {
          await auditService.logEvent({
            companyId: profile.companyId,
            actorUserId: loggedUser.uid,
            actorRole: profile.role,
            action: 'USER_LOGGED_IN',
            resourceType: 'user',
            resourceId: loggedUser.uid,
          });
        }
      } catch (auditErr) {
        console.warn('[SITEFLOW] Non-fatal: could not log login audit event:', auditErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const newUser = await authService.registerWithEmail(email, pass);
      setUser(newUser);
      // Public registration does not assign SUPER_ADMIN or create company automatically.
      // It sets user into safe onboarding flow.
      await fetchUserData(newUser);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const gUser = await authService.loginWithGoogle();
      setUser(gUser);
      // Authoritative lookup: User profile is fetched by real Firebase UID.
      // If the user does not exist in /users/{uid}, userProfile remains null,
      // and needsOnboarding evaluates to true. NO privileges or roles are auto-assigned!
      await fetchUserData(gUser);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogleRedirect = async () => {
    await authService.loginWithGoogleRedirect();
  };

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
        console.warn('Could not record logout audit:', err);
      }
    }
    await authService.logout();
    setUser(null);
    setUserProfile(null);
    setCompany(null);
  };

  const resetPassword = async (email: string) => {
    await authService.resetPassword(email);
  };

  const role: UserRole | null = userProfile?.role || null;
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isAdmin = role === 'ADMIN' || isSuperAdmin;
  const isEmployee = role === 'EMPLOYEE';
  const needsOnboarding = Boolean(user && (!userProfile || !userProfile.companyId));

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
