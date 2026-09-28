import React, { useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { SiteflowLogo } from '../components/common/SiteflowLogo';
import { FirebaseStatusBanner } from '../components/common/FirebaseStatusBanner';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
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
  Clock,
  Calendar,
  MapPin,
  Building,
  Bell,
  ChevronRight,
  HardHat,
  Search,
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
  const { user, userProfile, company, logout, isAdmin, isSuperAdmin, role } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isManagement =
    isAdmin || isSuperAdmin || role === 'SUPERVISOR' || role === 'PROJECT_MANAGER';

  // Management navigation groups
  const managementNavGroups = [
    {
      title: 'Operations',
      items: [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        { id: 'attendance', label: 'Time & Attendance', icon: Clock },
        { id: 'shifts', label: 'Shifts & Dispatch', icon: Calendar },
      ],
    },
    {
      title: 'Organization',
      items: [
        { id: 'jobsites', label: 'Job Sites', icon: MapPin },
        { id: 'projects', label: 'Projects', icon: Building },
        { id: 'employees', label: 'Workforce', icon: Users },
      ],
    },
    {
      title: 'Governance',
      items: [
        { id: 'audit', label: 'Compliance Audit', icon: Shield },
        { id: 'settings', label: 'Company Settings', icon: Settings },
        { id: 'profile', label: 'My Profile', icon: User },
      ],
    },
  ];

  // Worker navigation groups
  const workerNavGroups = [
    {
      title: 'Field Terminal',
      items: [
        { id: 'dashboard', label: 'Time Clock', icon: Clock },
        { id: 'shifts', label: 'My Shifts', icon: Calendar },
        { id: 'attendance', label: 'Attendance History', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Account',
      items: [
        { id: 'profile', label: 'My Profile', icon: User },
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  const currentGroups = isManagement ? managementNavGroups : workerNavGroups;

  // Flattened for lookup & mobile
  const allNavItems = currentGroups.flatMap((g) => g.items);
  const currentItem = allNavItems.find((item) => item.id === currentTab) || allNavItems[0];

  const handleNavClick = (tabId: string) => {
    onSelectTab(tabId);
    setMobileMenuOpen(false);
  };

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  return (
    <div className="min-h-screen bg-[#0A0D14] text-slate-100 flex flex-col font-['Inter',sans-serif] selection:bg-amber-500/30 selection:text-amber-200">
      {/* Universal Backend Status Diagnostics Bar */}
      <FirebaseStatusBanner />

      <div className="flex-1 flex flex-col md:flex-row">
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden md:flex w-64 bg-[#0F131C] border-r border-slate-800/80 flex-col justify-between shrink-0 z-20">
          <div className="p-4 flex-1 flex flex-col overflow-y-auto">
            {/* Logo */}
            <div className="px-2 pt-1 pb-4">
              <SiteflowLogo size="md" showTagline />
            </div>

            {/* Workspace Context Card */}
            <div className="mt-2 p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-medium text-slate-400">
                  Workspace
                </span>
              </div>
              <div className="text-sm font-semibold text-slate-100 truncate pl-0.5">
                {company?.name || 'Company Workspace'}
              </div>
              <div className="text-[11px] text-slate-500 pl-0.5 mt-0.5 flex items-center gap-1.5">
                <span>{company?.city ? `${company.city}, ` : ''}{company?.province || 'Active Organization'}</span>
              </div>
            </div>

            {/* Navigation Groups */}
            <nav className="mt-6 space-y-6 flex-1">
              {currentGroups.map((group) => (
                <div key={group.title} className="space-y-1">
                  <h4 className="text-[11px] font-medium uppercase tracking-wider text-slate-500 px-3 mb-1.5">
                    {group.title}
                  </h4>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                          active
                            ? 'bg-amber-500/10 text-amber-300 border-l-2 border-amber-500 pl-2.5 font-semibold'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${active ? 'text-amber-400' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </div>
                        {active && (
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>

          {/* User Account Footer in Sidebar */}
          <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/40">
            <div className="flex items-center gap-3 p-1.5 rounded-lg">
              <Avatar
                name={userProfile?.displayName || user?.email || 'Operator'}
                src={userProfile?.photoUrl}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-slate-100 truncate">
                  {userProfile?.displayName || userProfile?.firstName || user?.email?.split('@')[0] || 'Operator'}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge
                    size="sm"
                    variant={isSuperAdmin ? 'amber' : isAdmin ? 'info' : 'neutral'}
                  >
                    {role || 'EMPLOYEE'}
                  </Badge>
                </div>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                aria-label="Sign out"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN APPLICATION CONTAINER WITH HEADER */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* DESKTOP TOP HEADER */}
          <header className="hidden md:flex h-16 bg-[#0F131C]/60 backdrop-blur-md border-b border-slate-800/80 px-6 sm:px-8 items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{company?.name || 'Workspace'}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-slate-100 font-medium">{currentItem?.label}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-xs text-slate-400 font-medium">
                {todayFormatted}
              </div>

              <div className="h-4 w-px bg-slate-800" />

              {/* Quick Profile Pill */}
              <button
                onClick={() => onSelectTab('profile')}
                className="flex items-center gap-2 py-1 px-2.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition cursor-pointer"
              >
                <Avatar
                  name={userProfile?.displayName || user?.email || 'Operator'}
                  src={userProfile?.photoUrl}
                  size="sm"
                  className="w-5 h-5 text-[9px]"
                />
                <span className="font-medium text-slate-200 truncate max-w-[120px]">
                  {userProfile?.firstName || user?.email?.split('@')[0]}
                </span>
              </button>
            </div>
          </header>

          {/* MOBILE TOP BAR */}
          <div className="md:hidden bg-[#0F131C] border-b border-slate-800 p-3.5 flex items-center justify-between sticky top-0 z-30">
            <SiteflowLogo size="sm" />

            <div className="flex items-center gap-2">
              <Badge size="sm" variant={isSuperAdmin ? 'amber' : 'neutral'}>
                {role}
              </Badge>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* MOBILE DRAWER */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-[#0F131C] border-b border-slate-800 p-4 space-y-4 shadow-xl z-20 animate-fade-in">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[11px] font-medium text-slate-400 block">Current Workspace</span>
                <span className="text-sm font-semibold text-slate-100">{company?.name}</span>
              </div>

              {currentGroups.map((group) => (
                <div key={group.title} className="space-y-1">
                  <h4 className="text-[11px] font-medium uppercase tracking-wider text-slate-500 px-2 mb-1">
                    {group.title}
                  </h4>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                          active
                            ? 'bg-amber-500/10 text-amber-400 border-l-2 border-amber-500 font-semibold'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}

              <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                <div className="text-xs text-slate-400">
                  {userProfile?.displayName || user?.email}
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 py-1.5 px-3 text-red-400 hover:bg-red-500/10 text-xs font-medium rounded-lg cursor-pointer transition"
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
      </div>

      {/* MOBILE BOTTOM NAVIGATION (Convenient Field Worker Access) */}
      <div className="md:hidden bg-[#0F131C] border-t border-slate-800 py-1.5 px-3 flex justify-around items-center sticky bottom-0 z-40">
        {allNavItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 text-[11px] font-medium transition cursor-pointer ${
                active ? 'text-amber-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
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
