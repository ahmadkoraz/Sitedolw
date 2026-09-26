import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { attendanceService } from '../services/firebase/firestore/attendanceService';
import { employeeService } from '../services/firebase/firestore/employeeService';
import { jobSiteService } from '../services/firebase/firestore/jobSiteService';
import { projectService } from '../services/firebase/firestore/projectService';
import { shiftService } from '../services/firebase/firestore/shiftService';
import { formatDistance } from '../utils/geofence';
import type { TimeEntry, Employee, JobSite, Project, Shift, TimeEntryStatus } from '../types';
import {
  Users,
  Clock,
  Coffee,
  ShieldAlert,
  CheckCircle2,
  MapPin,
  Building,
  RefreshCw,
  Search,
  LayoutGrid,
  List,
  ArrowRight,
  HardHat,
  Timer,
  AlertTriangle,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export interface WorkforceDashboardWidgetProps {
  onNavigateTab?: (tab: string) => void;
  className?: string;
  autoRefreshIntervalMs?: number;
}

interface ActiveWorkerData {
  entry: TimeEntry;
  employee?: Employee;
  jobSite?: JobSite;
  project?: Project;
  shift?: Shift;
  clockInDate: Date;
  elapsedMs: number;
  totalBreakMs: number;
  currentBreakMs: number;
  netWorkMs: number;
}

/**
 * Formats milliseconds into a zero-padded digital counter HH:MM:SS
 */
function formatDigitalDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Formats milliseconds into a human-readable duration (e.g. 4h 15m)
 */
function formatHumanDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

export const WorkforceDashboardWidget: React.FC<WorkforceDashboardWidgetProps> = ({
  onNavigateTab,
  className = '',
  autoRefreshIntervalMs = 20000,
}) => {
  const { company } = useAuth();

  const [activeEntries, setActiveEntries] = useState<TimeEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobSites, setJobSites] = useState<JobSite[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live real-time ticker that advances every second for live durations
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(Date.now());

  // Interactive filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'clocked_in' | 'on_break' | 'flagged'>('all');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const tickerRef = useRef<NodeJS.Timeout | null>(null);

  // Load all required data
  const loadData = useCallback(async (isManualRefresh = false) => {
    if (!company) return;
    if (isManualRefresh) setIsRefreshing(true);
    else if (!activeEntries.length) setLoading(true);

    setErrorMessage(null);
    try {
      const [allEntries, allEmps, allSites, allProjs, allShifts] = await Promise.all([
        attendanceService.getTimeEntries(company.companyId),
        employeeService.getEmployeesByCompany(company.companyId),
        jobSiteService.getJobSitesByCompany(company.companyId),
        projectService.getProjectsByCompany(company.companyId),
        shiftService.getShiftsByCompany(company.companyId),
      ]);

      // Filter only currently active time entries
      const onDuty = allEntries.filter(
        (t) => t.status === 'clocked_in' || t.status === 'on_break' || t.status === 'flagged'
      );

      setActiveEntries(onDuty);
      setEmployees(allEmps);
      setJobSites(allSites);
      setProjects(allProjs);
      setTodayShifts(allShifts);
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('WorkforceDashboardWidget: failed to load attendance data', err);
      setErrorMessage('Unable to synchronize live workforce status. Retrying automatically.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [company, activeEntries.length]);

  // Initial load and polling
  useEffect(() => {
    loadData();

    intervalRef.current = setInterval(() => {
      loadData();
    }, autoRefreshIntervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadData, autoRefreshIntervalMs]);

  // Live timer tick every 1000ms for accurate, ticking duration displays
  useEffect(() => {
    tickerRef.current = setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 1000);

    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, []);

  // Quick lookup indices
  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach((e) => {
      map.set(e.employeeId, e);
      if (e.userId) map.set(e.userId, e);
    });
    return map;
  }, [employees]);

  const jobSiteMap = useMemo(() => {
    return new Map(jobSites.map((s) => [s.jobSiteId, s]));
  }, [jobSites]);

  const projectMap = useMemo(() => {
    return new Map(projects.map((p) => [p.projectId, p]));
  }, [projects]);

  const shiftMap = useMemo(() => {
    return new Map(todayShifts.map((s) => [s.shiftId, s]));
  }, [todayShifts]);

  // Compute live enriched data for each active worker
  const activeWorkers: ActiveWorkerData[] = useMemo(() => {
    return activeEntries.map((entry) => {
      const emp = employeeMap.get(entry.employeeId) || employeeMap.get(entry.userId);
      const jobSite = jobSiteMap.get(entry.jobSiteId);
      const project = projectMap.get(entry.projectId) || (jobSite ? projectMap.get(jobSite.projectId) : undefined);
      const shift = entry.shiftId ? shiftMap.get(entry.shiftId) : undefined;

      const clockInDate = new Date(entry.clockInTime);
      const clockInMs = clockInDate.getTime();
      const elapsedMs = Math.max(0, currentTimeMs - clockInMs);

      // Break duration calculation
      let completedBreaksMs = 0;
      let currentBreakMs = 0;

      if (entry.breaks && Array.isArray(entry.breaks)) {
        entry.breaks.forEach((b) => {
          if (b.endTime) {
            completedBreaksMs += (b.durationMinutes || 0) * 60000;
          } else if (b.startTime) {
            currentBreakMs = Math.max(0, currentTimeMs - new Date(b.startTime).getTime());
          }
        });
      }

      const totalBreakMs = completedBreaksMs + currentBreakMs;
      const netWorkMs = Math.max(0, elapsedMs - totalBreakMs);

      return {
        entry,
        employee: emp,
        jobSite,
        project,
        shift,
        clockInDate,
        elapsedMs,
        totalBreakMs,
        currentBreakMs,
        netWorkMs,
      };
    });
  }, [activeEntries, employeeMap, jobSiteMap, projectMap, shiftMap, currentTimeMs]);

  // Summary counts
  const totalActive = activeWorkers.length;
  const countClockedIn = activeWorkers.filter((w) => w.entry.status === 'clocked_in').length;
  const countOnBreak = activeWorkers.filter((w) => w.entry.status === 'on_break').length;
  const countFlagged = activeWorkers.filter((w) => w.entry.status === 'flagged').length;

  // Aggregate total crew shift duration
  const totalCrewWorkHoursDecimal = useMemo(() => {
    const totalMs = activeWorkers.reduce((acc, curr) => acc + curr.netWorkMs, 0);
    return (totalMs / 3600000).toFixed(1);
  }, [activeWorkers]);

  // Filtered workers list
  const filteredWorkers = useMemo(() => {
    return activeWorkers.filter((w) => {
      // Status filter
      if (statusFilter !== 'all' && w.entry.status !== statusFilter) {
        return false;
      }

      // Site filter
      if (selectedSiteId !== 'all' && w.entry.jobSiteId !== selectedSiteId) {
        return false;
      }

      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const fullName = `${w.employee?.firstName || ''} ${w.employee?.lastName || ''}`.toLowerCase();
        const empNumber = (w.employee?.employeeNumber || '').toLowerCase();
        const siteName = (w.jobSite?.name || '').toLowerCase();
        const projName = (w.project?.name || w.project?.code || '').toLowerCase();
        const roleName = (w.employee?.role || w.employee?.jobTitle || '').toLowerCase();

        return (
          fullName.includes(query) ||
          empNumber.includes(query) ||
          siteName.includes(query) ||
          projName.includes(query) ||
          roleName.includes(query)
        );
      }

      return true;
    });
  }, [activeWorkers, statusFilter, selectedSiteId, searchQuery]);

  return (
    <div
      className={`bg-[#181818] border border-[#282828] rounded-xl overflow-hidden shadow-xl ${className}`}
      data-testid="workforce-dashboard-widget"
    >
      {/* Widget Header Strip */}
      <div className="p-5 border-b border-[#282828] bg-[#1F1F1F]/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2E9B5B] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#2E9B5B]"></span>
            </span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#2E9B5B] bg-[#2E9B5B]/10 px-2 py-0.5 rounded border border-[#2E9B5B]/25">
              Live Field Ops
            </span>
            <span className="text-xs text-[#8A8A8A] font-mono">
              Synced: {lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
            <HardHat className="w-5 h-5 text-[#F5C400]" />
            Workforce Active Clock-in Status & Shift Duration
          </h2>
          <p className="text-xs text-[#9E9E9E] mt-0.5">
            Real-time field presence, active shift timers, break tracking, and GPS geofence compliance.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing || loading}
            title="Refresh active workforce attendance"
            className="p-2 bg-[#252525] hover:bg-[#303030] text-[#A0A0A0] hover:text-white rounded border border-[#3A3A3A] transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#F5C400]' : ''}`} />
          </button>

          <div className="hidden sm:flex items-center bg-[#252525] border border-[#3A3A3A] rounded p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded text-xs transition cursor-pointer ${
                viewMode === 'grid' ? 'bg-[#353535] text-white shadow-sm' : 'text-[#8A8A8A] hover:text-white'
              }`}
              title="Grid Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded text-xs transition cursor-pointer ${
                viewMode === 'table' ? 'bg-[#353535] text-white shadow-sm' : 'text-[#8A8A8A] hover:text-white'
              }`}
              title="Dense Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('attendance')}
              className="px-3.5 py-1.5 bg-[#F5C400] hover:bg-[#e0b400] text-black text-xs font-bold uppercase tracking-wider rounded cursor-pointer transition flex items-center gap-1.5 shadow-md shadow-[#F5C400]/15"
            >
              <span>Manage Timecards</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#282828] border-b border-[#282828] bg-[#141414]">
        {/* Metric 1: Total Working Now */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#A0A0A0] font-bold">
              Active Working
            </div>
            <div className="text-2xl font-black text-[#2E9B5B] font-mono mt-0.5">{countClockedIn}</div>
            <div className="text-[10px] text-[#707070] mt-0.5">On designated sites</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#2E9B5B]/10 border border-[#2E9B5B]/25 flex items-center justify-center text-[#2E9B5B]">
            <Users className="w-4 h-4" />
          </div>
        </div>

        {/* Metric 2: On Break */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#A0A0A0] font-bold">
              On Break
            </div>
            <div className="text-2xl font-black text-[#F5C400] font-mono mt-0.5">{countOnBreak}</div>
            <div className="text-[10px] text-[#707070] mt-0.5">Meal / Rest active</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#F5C400]/10 border border-[#F5C400]/25 flex items-center justify-center text-[#F5C400]">
            <Coffee className="w-4 h-4" />
          </div>
        </div>

        {/* Metric 3: Geofence Flagged */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#A0A0A0] font-bold">
              Geofence Alerts
            </div>
            <div
              className={`text-2xl font-black font-mono mt-0.5 ${
                countFlagged > 0 ? 'text-[#D92D20]' : 'text-[#888888]'
              }`}
            >
              {countFlagged}
            </div>
            <div className="text-[10px] text-[#707070] mt-0.5">Off-site clock events</div>
          </div>
          <div
            className={`w-9 h-9 rounded-lg border flex items-center justify-center ${
              countFlagged > 0
                ? 'bg-[#D92D20]/10 border-[#D92D20]/25 text-[#D92D20]'
                : 'bg-[#222222] border-[#333333] text-[#666666]'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        {/* Metric 4: Total Logged Shift Hours */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#A0A0A0] font-bold">
              Shift Time Logged
            </div>
            <div className="text-2xl font-black text-white font-mono mt-0.5">
              {totalCrewWorkHoursDecimal} <span className="text-xs text-[#888888] font-sans">hrs</span>
            </div>
            <div className="text-[10px] text-[#707070] mt-0.5">Across active workforce</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400">
            <Timer className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Status Filter Tabs */}
      <div className="p-4 border-b border-[#282828] bg-[#1A1A1A] flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'all'
                ? 'bg-[#F5C400] text-black font-bold shadow-sm'
                : 'bg-[#242424] text-[#A0A0A0] hover:text-white border border-[#333333]'
            }`}
          >
            <span>All Active</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                statusFilter === 'all' ? 'bg-black/20 text-black' : 'bg-[#181818] text-[#888888]'
              }`}
            >
              {totalActive}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('clocked_in')}
            className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'clocked_in'
                ? 'bg-[#2E9B5B] text-white font-bold shadow-sm'
                : 'bg-[#242424] text-[#A0A0A0] hover:text-white border border-[#333333]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#2E9B5B]" />
            <span>Working</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                statusFilter === 'clocked_in' ? 'bg-black/25 text-white' : 'bg-[#181818] text-[#888888]'
              }`}
            >
              {countClockedIn}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('on_break')}
            className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'on_break'
                ? 'bg-[#F5C400]/25 text-[#F5C400] border border-[#F5C400]/50 font-bold'
                : 'bg-[#242424] text-[#A0A0A0] hover:text-white border border-[#333333]'
            }`}
          >
            <Coffee className="w-3 h-3 text-[#F5C400]" />
            <span>On Break</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                statusFilter === 'on_break' ? 'bg-[#F5C400]/30 text-[#F5C400]' : 'bg-[#181818] text-[#888888]'
              }`}
            >
              {countOnBreak}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('flagged')}
            className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'flagged'
                ? 'bg-[#D92D20]/25 text-[#D92D20] border border-[#D92D20]/50 font-bold'
                : 'bg-[#242424] text-[#A0A0A0] hover:text-white border border-[#333333]'
            }`}
          >
            <ShieldAlert className="w-3 h-3 text-[#D92D20]" />
            <span>Flagged</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                statusFilter === 'flagged' ? 'bg-[#D92D20]/30 text-[#D92D20]' : 'bg-[#181818] text-[#888888]'
              }`}
            >
              {countFlagged}
            </span>
          </button>
        </div>

        {/* Search and Job Site Filter */}
        <div className="flex items-center gap-2">
          {/* Site Select */}
          {jobSites.length > 0 && (
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="px-2.5 py-1.5 bg-[#252525] border border-[#383838] text-xs text-white rounded focus:border-[#F5C400] outline-none cursor-pointer max-w-[150px] truncate"
            >
              <option value="all">All Sites ({jobSites.length})</option>
              {jobSites.map((site) => (
                <option key={site.jobSiteId} value={site.jobSiteId}>
                  {site.name}
                </option>
              ))}
            </select>
          )}

          {/* Quick search input */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-[#777777] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee, site..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#242424] border border-[#383838] focus:border-[#F5C400] rounded text-xs text-white placeholder-[#707070] outline-none transition"
            />
          </div>
        </div>
      </div>

      {/* Error Notification Banner if any */}
      {errorMessage && (
        <div className="p-3 bg-[#D92D20]/15 border-b border-[#D92D20]/30 flex items-center justify-between text-xs text-[#D92D20]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => loadData(true)}
            className="underline font-bold hover:text-white cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Content: Loading State, Empty State, or Workforce Active List */}
      <div className="p-5">
        {loading && activeWorkers.length === 0 ? (
          <div className="py-16 text-center text-[#A0A0A0] flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-7 h-7 text-[#F5C400] animate-spin" />
            <span className="text-xs font-mono tracking-wider">Synchronizing active workforce timecards...</span>
          </div>
        ) : activeWorkers.length === 0 ? (
          <div className="py-14 text-center border-2 border-dashed border-[#282828] rounded-xl bg-[#141414]">
            <HardHat className="w-10 h-10 text-[#404040] mx-auto mb-3" />
            <h3 className="text-base font-bold text-white uppercase tracking-tight">
              No Field Workforce Currently Clocked In
            </h3>
            <p className="text-xs text-[#808080] max-w-md mx-auto mt-1 mb-4">
              All employees are currently off-duty or between shifts. As workers clock in from the mobile terminal or
              field kiosk, their live status and shift duration ticker will appear here instantly.
            </p>
            {onNavigateTab && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => onNavigateTab('shifts')}
                  className="px-3.5 py-1.5 bg-[#242424] hover:bg-[#303030] text-white border border-[#3C3C3C] text-xs font-semibold rounded cursor-pointer transition flex items-center gap-1.5"
                >
                  View Scheduled Shifts
                </button>
                <button
                  onClick={() => onNavigateTab('attendance')}
                  className="px-3.5 py-1.5 bg-[#F5C400] hover:bg-[#e0b400] text-black text-xs font-bold uppercase tracking-wider rounded cursor-pointer transition flex items-center gap-1.5"
                >
                  Open Timecards
                </button>
              </div>
            )}
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="py-10 text-center text-[#707070] text-xs">
            <Search className="w-8 h-8 mx-auto text-[#404040] mb-2" />
            No workers match the current search or status filter.
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setSelectedSiteId('all');
              }}
              className="block mx-auto mt-2 text-[#F5C400] hover:underline font-bold"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* ========================================================================= */
          /* CARD GRID VIEW: High-contrast, live shift duration tickers */
          /* ========================================================================= */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredWorkers.map((worker) => {
              const {
                entry,
                employee,
                jobSite,
                project,
                shift,
                clockInDate,
                elapsedMs,
                currentBreakMs,
                netWorkMs,
              } = worker;

              const isClockedIn = entry.status === 'clocked_in';
              const isOnBreak = entry.status === 'on_break';
              const isFlagged = entry.status === 'flagged';

              // Scheduled progress calculation if linked to shift
              const scheduledHours = shift?.scheduledHours || 8;
              const scheduledMs = scheduledHours * 3600000;
              const progressPct = Math.min(100, Math.round((elapsedMs / scheduledMs) * 100));
              const isOvertime = elapsedMs > scheduledMs;

              return (
                <div
                  key={entry.timeEntryId}
                  className={`relative bg-[#1C1C1C] border rounded-lg p-4.5 transition-all shadow-md flex flex-col justify-between ${
                    isFlagged
                      ? 'border-[#D92D20]/40 hover:border-[#D92D20]/70'
                      : isOnBreak
                      ? 'border-[#F5C400]/40 hover:border-[#F5C400]/70'
                      : 'border-[#2D2D2D] hover:border-[#F5C400]/50'
                  }`}
                >
                  {/* Top Card Section: Avatar, Name, and Status Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#111111] border border-[#333333] flex items-center justify-center font-bold text-sm text-[#F5C400] shrink-0 shadow-inner">
                          {employee ? `${employee.firstName[0]}${employee.lastName[0]}` : 'W'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                            {employee ? `${employee.firstName} ${employee.lastName}` : entry.employeeId}
                          </h4>
                          <div className="text-[11px] text-[#8A8A8A] flex items-center gap-1.5 font-mono">
                            <span>{employee?.employeeNumber || 'WORKER'}</span>
                            <span>&bull;</span>
                            <span className="truncate">{employee?.jobTitle || employee?.role || 'Crew'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isClockedIn && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[#2E9B5B]/15 text-[#2E9B5B] border border-[#2E9B5B]/30 flex items-center gap-1 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2E9B5B] animate-pulse" />
                            Working
                          </span>
                        )}
                        {isOnBreak && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[#F5C400]/15 text-[#F5C400] border border-[#F5C400]/30 flex items-center gap-1 shrink-0">
                            <Coffee className="w-3 h-3" />
                            On Break
                          </span>
                        )}
                        {isFlagged && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[#D92D20]/15 text-[#D92D20] border border-[#D92D20]/30 flex items-center gap-1 shrink-0">
                            <ShieldAlert className="w-3 h-3" />
                            Flagged
                          </span>
                        )}
                      </div>
                    </div>

                    {/* LIVE SHIFT DURATION TICKER DISPLAY */}
                    <div className="p-3 bg-[#111111] rounded-lg border border-[#252525] mb-3">
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#8A8A8A] uppercase mb-1">
                        <span className="flex items-center gap-1">
                          <Timer className="w-3 h-3 text-[#F5C400]" />
                          Current Shift Duration
                        </span>
                        <span>Since {clockInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div className="flex items-baseline justify-between">
                        <div className="text-2xl font-black font-mono tracking-tight text-white flex items-center gap-1">
                          {formatDigitalDuration(elapsedMs)}
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-bold text-[#F5C400] font-mono">
                            {formatHumanDuration(netWorkMs)} net
                          </div>
                          {isOnBreak && (
                            <div className="text-[10px] text-[#A0A0A0] font-mono">
                              Break: {formatDigitalDuration(currentBreakMs)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Scheduled Shift Progress Bar */}
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between text-[10px] text-[#707070] font-mono mb-1">
                          <span>Progress vs {scheduledHours}h Target</span>
                          <span className={isOvertime ? 'text-[#F5C400] font-bold' : ''}>
                            {progressPct}% {isOvertime && '(Overtime)'}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#252525] rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isOvertime
                                ? 'bg-[#F5C400]'
                                : isFlagged
                                ? 'bg-[#D92D20]'
                                : 'bg-[#2E9B5B]'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Job Site & Project Location Info */}
                    <div className="space-y-1.5 text-xs text-[#A0A0A0] mb-3">
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#F5C400] shrink-0" />
                        <span className="text-white font-medium truncate">{jobSite?.name || 'Assigned Job Site'}</span>
                        {jobSite?.city && <span className="text-[#707070]">({jobSite.city})</span>}
                      </div>

                      {project && (
                        <div className="flex items-center gap-1.5 truncate text-[11px]">
                          <Building className="w-3.5 h-3.5 text-[#707070] shrink-0" />
                          <span className="text-[#888888] truncate">
                            {project.code}: {project.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom: Geofence Verification Snapshot */}
                  <div className="pt-2.5 border-t border-[#252525] flex items-center justify-between text-[11px]">
                    {entry.clockInLocation ? (
                      <span
                        className={`font-mono flex items-center gap-1 text-[10px] font-semibold ${
                          entry.clockInLocation.isWithinGeofence ? 'text-[#2E9B5B]' : 'text-[#D92D20]'
                        }`}
                      >
                        {entry.clockInLocation.isWithinGeofence ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            GPS In Geofence ({formatDistance(entry.clockInLocation.distanceToSiteMeters)})
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="w-3 h-3" />
                            Outside Perimeter ({formatDistance(entry.clockInLocation.distanceToSiteMeters)})
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="text-[#707070] text-[10px] font-mono">Location verified</span>
                    )}

                    {onNavigateTab && (
                      <button
                        onClick={() => onNavigateTab('attendance')}
                        className="text-[#A0A0A0] hover:text-[#F5C400] font-semibold flex items-center gap-0.5 cursor-pointer text-[10px] uppercase tracking-wider"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ========================================================================= */
          /* TABLE VIEW: Dense industrial operations supervisor log */
          /* ========================================================================= */
          <div className="overflow-x-auto rounded-lg border border-[#282828]">
            <table className="w-full text-left text-xs text-white">
              <thead className="bg-[#141414] text-[#8A8A8A] font-mono uppercase text-[10px] border-b border-[#282828]">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Job Site & Project</th>
                  <th className="py-3 px-4">Clocked In At</th>
                  <th className="py-3 px-4">Live Shift Duration</th>
                  <th className="py-3 px-4">Net Work Time</th>
                  <th className="py-3 px-4">GPS Verification</th>
                  {onNavigateTab && <th className="py-3 px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222] bg-[#181818]">
                {filteredWorkers.map((worker) => {
                  const {
                    entry,
                    employee,
                    jobSite,
                    project,
                    clockInDate,
                    elapsedMs,
                    netWorkMs,
                  } = worker;

                  return (
                    <tr key={entry.timeEntryId} className="hover:bg-[#202020] transition">
                      {/* Employee */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#111111] border border-[#333333] flex items-center justify-center font-bold text-[10px] text-[#F5C400] shrink-0">
                            {employee ? `${employee.firstName[0]}${employee.lastName[0]}` : 'W'}
                          </div>
                          <div>
                            <div className="font-bold text-white">
                              {employee ? `${employee.firstName} ${employee.lastName}` : entry.employeeId}
                            </div>
                            <div className="text-[10px] text-[#707070] font-mono">
                              {employee?.employeeNumber || 'WORKER'} &bull; {employee?.jobTitle || 'Field Crew'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {entry.status === 'clocked_in' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[#2E9B5B]/15 text-[#2E9B5B] border border-[#2E9B5B]/30 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2E9B5B] animate-pulse" />
                            Working
                          </span>
                        )}
                        {entry.status === 'on_break' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[#F5C400]/15 text-[#F5C400] border border-[#F5C400]/30 inline-flex items-center gap-1">
                            <Coffee className="w-3 h-3" />
                            Break
                          </span>
                        )}
                        {entry.status === 'flagged' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[#D92D20]/15 text-[#D92D20] border border-[#D92D20]/30 inline-flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            Flagged
                          </span>
                        )}
                      </td>

                      {/* Job Site & Project */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white truncate max-w-[180px]">
                          {jobSite?.name || 'Field Site'}
                        </div>
                        <div className="text-[10px] text-[#707070] truncate max-w-[180px]">
                          {project ? `${project.code}: ${project.name}` : jobSite?.address || 'Site assigned'}
                        </div>
                      </td>

                      {/* Clock In Time */}
                      <td className="py-3 px-4 font-mono text-xs text-[#A0A0A0]">
                        {clockInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      {/* Live Ticking Shift Duration */}
                      <td className="py-3 px-4 font-mono font-black text-white text-sm">
                        <div className="flex items-center gap-1.5">
                          <Timer className="w-3.5 h-3.5 text-[#F5C400]" />
                          <span>{formatDigitalDuration(elapsedMs)}</span>
                        </div>
                      </td>

                      {/* Net Work Time */}
                      <td className="py-3 px-4 font-mono text-xs text-[#F5C400] font-bold">
                        {formatHumanDuration(netWorkMs)}
                      </td>

                      {/* GPS Verification */}
                      <td className="py-3 px-4">
                        {entry.clockInLocation ? (
                          <span
                            className={`font-mono text-[10px] font-semibold flex items-center gap-1 ${
                              entry.clockInLocation.isWithinGeofence ? 'text-[#2E9B5B]' : 'text-[#D92D20]'
                            }`}
                          >
                            {entry.clockInLocation.isWithinGeofence ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                On Site ({formatDistance(entry.clockInLocation.distanceToSiteMeters)})
                              </>
                            ) : (
                              <>
                                <ShieldAlert className="w-3 h-3" />
                                Outside ({formatDistance(entry.clockInLocation.distanceToSiteMeters)})
                              </>
                            )}
                          </span>
                        ) : (
                          <span className="text-[#606060] font-mono text-[10px]">Verified</span>
                        )}
                      </td>

                      {/* Action */}
                      {onNavigateTab && (
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => onNavigateTab('attendance')}
                            className="px-2.5 py-1 bg-[#252525] hover:bg-[#333333] text-white hover:text-[#F5C400] rounded text-[11px] font-semibold transition cursor-pointer"
                          >
                            View
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Info Strip */}
      <div className="px-5 py-3 border-t border-[#242424] bg-[#141414] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#707070]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#F5C400]" />
          <span>Real-time duration updates every second. Authoritative timestamps preserved in Firestore.</span>
        </div>
        <div className="font-mono text-[10px] text-[#606060]">
          Auto-polling every {Math.round(autoRefreshIntervalMs / 1000)}s
        </div>
      </div>
    </div>
  );
};

export default WorkforceDashboardWidget;
