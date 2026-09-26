import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { attendanceService } from '../../services/firebase/firestore/attendanceService';
import { employeeService } from '../../services/firebase/firestore/employeeService';
import { jobSiteService } from '../../services/firebase/firestore/jobSiteService';
import { shiftService } from '../../services/firebase/firestore/shiftService';
import { formatDistance } from '../../utils/geofence';
import type { TimeEntry, Employee, JobSite, Shift } from '../../types';
import {
  Users,
  Clock,
  Coffee,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  HardHat,
  ArrowRight,
  Loader2,
} from 'lucide-react';

interface LiveWorkforceWidgetProps {
  onNavigateTab: (tab: string) => void;
}

export const LiveWorkforceWidget: React.FC<LiveWorkforceWidgetProps> = ({ onNavigateTab }) => {
  const { company } = useAuth();

  const [activeEntries, setActiveEntries] = useState<TimeEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobSites, setJobSites] = useState<JobSite[]>([]);
  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    try {
      const [allEntries, allEmps, allSites, allShifts] = await Promise.all([
        attendanceService.getTimeEntries(company.companyId),
        employeeService.getEmployeesByCompany(company.companyId),
        jobSiteService.getJobSitesByCompany(company.companyId),
        shiftService.getShiftsByCompany(company.companyId),
      ]);

      const onDuty = allEntries.filter(
        (t) => t.status === 'clocked_in' || t.status === 'on_break' || t.status === 'flagged'
      );

      setActiveEntries(onDuty);
      setEmployees(allEmps);
      setJobSites(allSites);
      setTodayShifts(allShifts);
    } catch (err) {
      console.error('Failed to load live workforce widget data:', err);
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [loadData]);

  const employeeMap = useMemo(() => new Map(employees.map((e) => [e.userId || e.employeeId, e])), [employees]);
  const jobSiteMap = useMemo(() => new Map(jobSites.map((s) => [s.jobSiteId, s])), [jobSites]);

  // Derived counts
  const countClockedIn = activeEntries.filter((t) => t.status === 'clocked_in').length;
  const countOnBreak = activeEntries.filter((t) => t.status === 'on_break').length;
  const countFlagged = activeEntries.filter((t) => t.status === 'flagged').length;
  const countScheduled = todayShifts.filter((s) => s.status === 'scheduled').length;

  return (
    <div className="space-y-4">
      {/* 4 Attendance KPI Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg shadow-sm">
          <div className="flex items-center justify-between text-[#A0A0A0] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Working Now</span>
            <Users className="w-4 h-4 text-[#2E9B5B]" />
          </div>
          <div className="text-2xl font-black text-[#2E9B5B] font-mono">{countClockedIn}</div>
          <div className="text-[10px] text-[#777777] mt-0.5">Active on job sites</div>
        </div>

        <div className="p-4 bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg shadow-sm">
          <div className="flex items-center justify-between text-[#A0A0A0] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">On Break</span>
            <Coffee className="w-4 h-4 text-[#F5C400]" />
          </div>
          <div className="text-2xl font-black text-[#F5C400] font-mono">{countOnBreak}</div>
          <div className="text-[10px] text-[#777777] mt-0.5">Meal / Rest breaks</div>
        </div>

        <div className="p-4 bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg shadow-sm">
          <div className="flex items-center justify-between text-[#A0A0A0] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Geofence Flagged</span>
            <ShieldAlert className="w-4 h-4 text-[#D92D20]" />
          </div>
          <div className="text-2xl font-black text-[#D92D20] font-mono">{countFlagged}</div>
          <div className="text-[10px] text-[#777777] mt-0.5">Off-site / Overridden</div>
        </div>

        <div className="p-4 bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg shadow-sm">
          <div className="flex items-center justify-between text-[#A0A0A0] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Scheduled Shifts</span>
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{countScheduled}</div>
          <div className="text-[10px] text-[#777777] mt-0.5">Awaiting dispatch</div>
        </div>
      </div>

      {/* Live Who's On Site Now Feed */}
      <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-5 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-[#2C2C2C] mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#2E9B5B] animate-pulse" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Who&apos;s On Site Now &mdash; Real-Time Attendance
            </h3>
          </div>

          <button
            onClick={() => onNavigateTab('attendance')}
            className="text-xs text-[#F5C400] hover:underline font-semibold flex items-center gap-1"
          >
            All Timecards
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-[#A0A0A0] flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#F5C400]" />
            Loading real-time status...
          </div>
        ) : activeEntries.length === 0 ? (
          <div className="py-8 text-center text-[#777777] text-xs">
            <HardHat className="w-8 h-8 mx-auto text-[#444444] mb-2" />
            No workers currently clocked in on field sites.
          </div>
        ) : (
          <div className="divide-y divide-[#252525]">
            {activeEntries.map((entry) => {
              const emp = employeeMap.get(entry.employeeId);
              const site = jobSiteMap.get(entry.jobSiteId);
              const clockInTime = new Date(entry.clockInTime);

              return (
                <div key={entry.timeEntryId} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#111111] border border-[#333333] flex items-center justify-center font-bold text-xs text-[#F5C400] shrink-0">
                      {emp ? `${emp.firstName[0]}${emp.lastName[0]}` : 'W'}
                    </div>

                    <div>
                      <div className="font-semibold text-white">
                        {emp ? `${emp.firstName} ${emp.lastName}` : entry.employeeId}
                        <span className="text-[10px] text-[#777777] font-mono ml-2">
                          ({emp?.employeeNumber || 'WORKER'})
                        </span>
                      </div>
                      <div className="text-[11px] text-[#A0A0A0] flex items-center gap-1 mt-0.5">
                        <span className="text-white font-medium">{site?.name || 'Job Site'}</span>
                        <span>&bull;</span>
                        <span>
                          Since {clockInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Geofence Status Badge */}
                    {entry.clockInLocation && (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 ${
                          entry.clockInLocation.isWithinGeofence
                            ? 'bg-[#2E9B5B]/15 text-[#2E9B5B] border border-[#2E9B5B]/30'
                            : 'bg-[#D92D20]/15 text-[#D92D20] border border-[#D92D20]/30'
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
                    )}

                    {/* Work / Break Status */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        entry.status === 'on_break'
                          ? 'bg-amber-500/20 text-[#F5C400] border border-[#F5C400]/40'
                          : 'bg-[#2E9B5B]/20 text-[#2E9B5B] border border-[#2E9B5B]/40'
                      }`}
                    >
                      {entry.status === 'on_break' ? 'ON BREAK' : 'WORKING'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
