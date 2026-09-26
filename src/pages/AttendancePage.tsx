import React from 'react';
import { TimeClockCard } from '../features/attendance/TimeClockCard';
import { AttendanceHistory } from '../features/attendance/AttendanceHistory';

export const AttendancePage: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Field Time Clock Terminal */}
      <TimeClockCard />

      {/* Attendance & Timecard Records */}
      <AttendanceHistory />
    </div>
  );
};
