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
import { Loader2 } from 'lucide-react';

const MainShell: React.FC = () => {
  const { user, loading, needsOnboarding } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Application Boot Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#111111] text-white flex flex-col items-center justify-center p-4">
        <SiteflowLogo size="lg" showTagline />
        <div className="mt-8 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A0A0A0]">
          <Loader2 className="w-4 h-4 text-[#F5C400] animate-spin" />
          <span>Initializing Siteflow Foundation...</span>
        </div>
      </div>
    );
  }

  // 1. Unauthenticated Visitor Flow
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

  // 2. Safe Initial Company Onboarding Flow (User has credentials but no tenant company yet)
  if (needsOnboarding) {
    return <OnboardingFlow />;
  }

  // 3. Authenticated Tenant Dashboard
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
