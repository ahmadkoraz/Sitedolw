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
      <div className="min-h-screen bg-[#111111] text-white flex flex-col items-center justify-center p-4">
        <SiteflowLogo size="lg" showTagline />
        <div className="mt-8 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A0A0A0]">
          <Loader2 className="w-4 h-4 text-[#F5C400] animate-spin" />
          <span>Connecting to Secure Authentication Gateway...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Visitor Flow (Firebase Auth has definitively finished and returned no user)
  if (!user) {
    return (
      <div className="min-h-screen bg-[#111111] text-white flex flex-col justify-center p-4 sm:p-8">
        <div className="w-full max-w-md mx-auto">
          {authView === 'login' ? (
            <LoginForm onSwitchToRegister={() => setAuthView('register')} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setAuthView('login')} />
          )}
        </div>
        <div className="text-center text-[11px] text-[#555555] uppercase tracking-wider mt-8">
          SITEFLOW &bull; Industrial Workforce & Construction Management Platform
        </div>
      </div>
    );
  }

  // 3. Authenticated Loading State (User session exists, verifying workforce profile & tenant)
  if (profileLoading && !userProfile && !profileError) {
    return (
      <div className="min-h-screen bg-[#111111] text-white flex flex-col items-center justify-center p-4">
        <SiteflowLogo size="lg" showTagline />
        <div className="mt-8 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A0A0A0]">
          <Loader2 className="w-4 h-4 text-[#F5C400] animate-spin" />
          <span>Verifying Organization & Workforce Credentials...</span>
        </div>
      </div>
    );
  }

  // 4. Authenticated Diagnostic Error State
  // When Firebase Auth succeeds but Firestore profile/company encounters an error:
  // User remains authenticated, NO automatic sign-out, NO loop to Login screen.
  if (profileError) {
    return (
      <div className="min-h-screen bg-[#111111] text-white flex flex-col justify-between p-4 sm:p-8">
        <div className="max-w-xl mx-auto w-full pt-8">
          <div className="flex justify-between items-center mb-8 border-b border-[#2C2C2C] pb-4">
            <SiteflowLogo size="md" showTagline />
            <button
              onClick={logout}
              className="text-xs text-[#D92D20] hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          <div className="bg-[#1C1C1C] border border-[#D92D20]/40 rounded-lg p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-[#D92D20]/10 border border-[#D92D20]/30 flex items-center justify-center text-[#D92D20]">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white uppercase tracking-tight">
                  Tenant Data Synchronization Notice
                </h2>
                <p className="text-xs text-[#A0A0A0]">
                  Authentication succeeded, but organization data could not be verified
                </p>
              </div>
            </div>

            <div className="p-4 bg-[#141414] border border-[#252525] rounded text-xs space-y-2 font-mono">
              <div className="flex justify-between py-1 border-b border-[#222222]">
                <span className="text-[#777777]">Authentication:</span>
                <span className="text-[#2E9B5B] font-bold">Authenticated</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#222222]">
                <span className="text-[#777777]">Email:</span>
                <span className="text-white truncate max-w-[260px]">{user.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#222222]">
                <span className="text-[#777777]">Firebase UID:</span>
                <span className="text-white truncate max-w-[260px]">{user.uid}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#222222]">
                <span className="text-[#777777]">Profile:</span>
                <span className={userProfile ? 'text-[#2E9B5B]' : 'text-[#F5C400]'}>
                  {userProfile ? 'Found' : 'Error'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#222222]">
                <span className="text-[#777777]">Company:</span>
                <span className={company ? 'text-[#2E9B5B]' : 'text-[#D92D20]'}>
                  {company ? company.name : 'Error / Unreachable'}
                </span>
              </div>
              <div className="pt-2 text-[#D92D20] text-[11px] leading-relaxed">
                Notice: {profileError}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => refreshUserData()}
                disabled={profileLoading}
                className="flex-1 py-3 bg-[#F5C400] hover:bg-[#e0b400] text-black font-bold text-xs uppercase tracking-wider rounded transition cursor-pointer flex items-center justify-center gap-2"
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
        <div className="text-center text-[11px] text-[#555555] uppercase tracking-wider py-4">
          SITEFLOW &bull; Secure Industrial Operations
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
        return <JobSitesPage />;
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
