/**
 * @license
 * SITEFLOW Production Core Application Shell (Build 01)
 * Modular Architecture & Tenant Route Dispatcher
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { LoginForm } from './features/auth/LoginForm';
import { RegisterForm } from './features/auth/RegisterForm';
import { OnboardingFlow } from './features/companies/OnboardingFlow';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardPage } from './pages/DashboardPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AuditPage } from './pages/AuditPage';
import { AttendancePage } from './pages/AttendancePage';
import { JobSitesPage } from './pages/JobSitesPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ShiftsPage } from './pages/ShiftsPage';
import { SiteflowLogo } from './components/common/SiteflowLogo';
import { Loader2, AlertCircle, RefreshCw, LogOut } from 'lucide-react';

const MainShell: React.FC = () => {
  const {
    user,
    userProfile,
    company,
    authInitializing,
    profileLoading,
    profileError,
    needsOnboarding,
    refreshUserData,
    logout,
  } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // 1. Initial Firebase Auth Boot Loading State (Distinguishes auth initializing from unauthenticated)
  if (authInitializing) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-slate-100 flex flex-col items-center justify-center p-4">
        <SiteflowLogo size="lg" showTagline />
        <div className="mt-8 flex items-center gap-2.5 text-xs text-slate-400">
          <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
          <span>Connecting to secure operations gateway...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Visitor Flow (Firebase Auth has definitively finished and returned no user)
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-slate-100 flex flex-col justify-center p-4 sm:p-8">
        <div className="w-full max-w-md mx-auto">
          {authView === 'login' ? (
            <LoginForm onSwitchToRegister={() => setAuthView('register')} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setAuthView('login')} />
          )}
        </div>
        <div className="text-center text-xs text-slate-500 tracking-wide mt-8">
          SITEFLOW &bull; Enterprise Construction Operations Platform
        </div>
      </div>
    );
  }

  // 3. Authenticated Loading State (User session exists, verifying workforce profile & tenant)
  if (profileLoading && !userProfile && !profileError) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-slate-100 flex flex-col items-center justify-center p-4">
        <SiteflowLogo size="lg" showTagline />
        <div className="mt-8 flex items-center gap-2.5 text-xs text-slate-400">
          <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
          <span>Verifying organization and workforce credentials...</span>
        </div>
      </div>
    );
  }

  // 4. Authenticated Diagnostic Error State
  // When Firebase Auth succeeds but Firestore profile/company encounters an error:
  // User remains authenticated, NO automatic sign-out, NO loop to Login screen.
  if (profileError) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-slate-100 flex flex-col justify-between p-4 sm:p-8">
        <div className="max-w-xl mx-auto w-full pt-8">
          <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
            <SiteflowLogo size="md" showTagline />
            <button
              onClick={logout}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 cursor-pointer transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          <div className="bg-[#0F131C] border border-red-500/30 rounded-xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-100">
                  Tenant Data Synchronization Notice
                </h2>
                <p className="text-xs text-slate-400">
                  Authentication succeeded, but organization data could not be verified
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg text-xs space-y-2 font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">Authentication:</span>
                <span className="text-emerald-400 font-semibold">Authenticated</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">Email:</span>
                <span className="text-slate-200 truncate max-w-[260px]">{user.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">Firebase UID:</span>
                <span className="text-slate-200 truncate max-w-[260px]">{user.uid}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">Profile:</span>
                <span className={userProfile ? 'text-emerald-400' : 'text-amber-400'}>
                  {userProfile ? 'Found' : 'Error'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">Company:</span>
                <span className={company ? 'text-emerald-400' : 'text-red-400'}>
                  {company ? company.name : 'Error / Unreachable'}
                </span>
              </div>
              <div className="pt-2 text-red-400 text-[11px] leading-relaxed">
                Notice: {profileError}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => refreshUserData()}
                disabled={profileLoading}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition cursor-pointer flex items-center justify-center gap-2 shadow-sm shadow-amber-500/20"
              >
                {profileLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>Retry Connection</span>
              </button>
            </div>
          </div>
        </div>
        <div className="text-center text-xs text-slate-500 py-4">
          SITEFLOW &bull; Enterprise Construction Operations Platform
        </div>
      </div>
    );
  }

  // 5. Safe Initial Company Onboarding Flow (User has credentials but no tenant company yet)
  if (needsOnboarding) {
    return <OnboardingFlow />;
  }

  // 6. Authenticated Tenant Dashboard
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage onNavigateTab={setActiveTab} />;
      case 'attendance':
        return <AttendancePage />;
      case 'shifts':
        return <ShiftsPage />;
      case 'jobsites':
        return <JobSitesPage onNavigateToProjects={() => setActiveTab('projects')} />;
      case 'projects':
        return <ProjectsPage />;
      case 'employees':
        return <EmployeesPage onBackToDashboard={() => setActiveTab('dashboard')} />;
      case 'settings':
        return <SettingsPage onBackToDashboard={() => setActiveTab('dashboard')} />;
      case 'profile':
        return <ProfilePage />;
      case 'audit':
        return <AuditPage onBackToDashboard={() => setActiveTab('dashboard')} />;
      default:
        return <DashboardPage onNavigateTab={setActiveTab} />;
    }
  };

  return (
    <DashboardLayout currentTab={activeTab} onSelectTab={setActiveTab}>
      {renderTabContent()}
    </DashboardLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainShell />
    </AuthProvider>
  );
}
