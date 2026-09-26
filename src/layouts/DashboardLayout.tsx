import React, { useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { SiteflowLogo } from '../components/common/SiteflowLogo';
import { FirebaseStatusBanner } from '../components/common/FirebaseStatusBanner';
import {
  LayoutDashboard,
  Users,
  Settings,
  User,
  Shield,
  LogOut,
  Menu,
  X,
  Building2,
  HardHat,
  Clock,
  Calendar,
  MapPin,
  Building,
} from 'lucide-react';

interface DashboardLayoutProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  currentTab,
  onSelectTab,
  children,
}) => {
  const { userProfile, company, logout, isAdmin, isSuperAdmin, role } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isManagement =
    isAdmin || isSuperAdmin || role === 'SUPERVISOR' || role === 'PROJECT_MANAGER';

  // Strictly segregated navigation items based on role
  const navItems = isManagement
    ? [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'attendance', label: 'Time & Attendance', icon: Clock },
        { id: 'shifts', label: 'Shifts & Dispatch', icon: Calendar },
        { id: 'jobsites', label: 'Job Sites & Geofences', icon: MapPin },
        { id: 'projects', label: 'Projects', icon: Building },
        { id: 'employees', label: 'Workforce', icon: Users },
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'audit', label: 'Audit Trail', icon: Shield },
      ]
    : [
        { id: 'dashboard', label: 'Time Clock', icon: Clock },
        { id: 'shifts', label: 'My Shifts', icon: Calendar },
        { id: 'attendance', label: 'Attendance History', icon: LayoutDashboard },
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'settings', label: 'Settings', icon: Settings },
      ];

  const handleNavClick = (tabId: string) => {
    onSelectTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col font-['Inter',sans-serif]">
      {/* Universal Backend Status Diagnostics Bar */}
      <FirebaseStatusBanner />

      <div className="flex-1 flex flex-col md:flex-row">
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden md:flex w-64 bg-[#161616] border-r border-[#242424] flex-col justify-between shrink-0">
          <div className="p-5">
            {/* Logo */}
            <div className="pb-5 border-b border-[#242424]">
              <SiteflowLogo size="md" showTagline />
            </div>

            {/* Company Tenant Card */}
            <div className="mt-4 p-3 bg-[#1C1C1C] border border-[#2A2A2A] rounded-md">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-3.5 h-3.5 text-[#F5C400]" />
                <span className="text-[11px] font-semibold uppercase text-[#A0A0A0] tracking-wider">
                  Active Company
                </span>
              </div>
              <div className="text-sm font-bold text-white truncate">
                {company?.name || 'Company Workspace'}
              </div>
              <div className="text-[10px] text-[#777777] font-mono truncate mt-0.5">
                {company?.companyId || 'No tenant'}
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="mt-6 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#666666] px-3 mb-2 block">
                {isAdmin ? 'Management Console' : 'Worker Portal'}
              </span>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-semibold uppercase tracking-wider transition cursor-pointer ${
                      active
                        ? 'bg-[#F5C400] text-black shadow-md shadow-[#F5C400]/15'
                        : 'text-[#A0A0A0] hover:text-white hover:bg-[#1F1F1F]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User Footer in Sidebar */}
          <div className="p-4 border-t border-[#242424] bg-[#141414]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-[#202020] border border-[#333333] flex items-center justify-center font-bold text-xs text-[#F5C400] shrink-0">
                {userProfile ? (
                  `${userProfile.firstName[0]}${userProfile.lastName[0]}`
                ) : (
                  <HardHat className="w-4 h-4 text-[#F5C400]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">
                  {userProfile?.displayName || userProfile?.firstName || 'Operator'}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                      isSuperAdmin
                        ? 'bg-[#F5C400]/20 text-[#F5C400]'
                        : isAdmin
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    {role || 'EMPLOYEE'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-2 bg-[#1C1C1C] hover:bg-[#252525] text-[#D92D20] text-xs font-semibold rounded border border-[#2E2E2E] cursor-pointer transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* MOBILE TOP BAR */}
        <div className="md:hidden bg-[#161616] border-b border-[#242424] p-3 flex items-center justify-between">
          <SiteflowLogo size="sm" />

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F5C400]/10 text-[#F5C400] border border-[#F5C400]/20">
              {role}
            </span>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-white hover:bg-[#252525] rounded"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* MOBILE DRAWER */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#161616] border-b border-[#242424] p-4 space-y-2 animate-fade-in">
            <div className="p-3 bg-[#1C1C1C] rounded border border-[#2C2C2C] mb-3">
              <span className="text-[10px] font-semibold text-[#A0A0A0] uppercase block">Company:</span>
              <span className="text-xs font-bold text-white">{company?.name}</span>
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs font-semibold uppercase tracking-wider ${
                    active ? 'bg-[#F5C400] text-black' : 'text-[#A0A0A0] hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="pt-3 border-t border-[#242424]">
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-2 text-[#D92D20] text-xs font-semibold"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* MAIN VIEWPORT CONTENT */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION (Field Worker Convenience) */}
      <div className="md:hidden bg-[#161616] border-t border-[#242424] py-2 px-4 flex justify-around items-center sticky bottom-0 z-40">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 text-[10px] font-semibold tracking-wider uppercase transition ${
                active ? 'text-[#F5C400]' : 'text-[#888888]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
