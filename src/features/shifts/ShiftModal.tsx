import React, { useState, useEffect } from 'react';
import type { Shift, ShiftStatus, Employee, Project, JobSite } from '../../types';
import { X, Calendar, Clock, User, MapPin, Building, AlertCircle, Loader2 } from 'lucide-react';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shiftData: Shift) => Promise<void>;
  initialShift?: Shift | null;
  employees: Employee[];
  projects: Project[];
  jobSites: JobSite[];
  companyId: string;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialShift,
  employees,
  projects,
  jobSites,
  companyId,
}) => {
  const [title, setTitle] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [jobSiteId, setJobSiteId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [scheduledHours, setScheduledHours] = useState(8);
  const [status, setStatus] = useState<ShiftStatus>('scheduled');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialShift) {
      setTitle(initialShift.title);
      setEmployeeId(initialShift.employeeId);
      setProjectId(initialShift.projectId);
      setJobSiteId(initialShift.jobSiteId);
      setStartTime(initialShift.startTime ? initialShift.startTime.slice(0, 16) : '');
      setEndTime(initialShift.endTime ? initialShift.endTime.slice(0, 16) : '');
      setScheduledHours(initialShift.scheduledHours || 8);
      setStatus(initialShift.status);
      setNotes(initialShift.notes || '');
    } else {
      setTitle('Regular Day Shift');
      setEmployeeId(employees[0]?.employeeId || '');
      setProjectId(projects[0]?.projectId || '');
      setJobSiteId(jobSites[0]?.jobSiteId || '');

      // Tomorrow 07:00 to 15:30
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      setStartTime(`${dateStr}T07:00`);
      setEndTime(`${dateStr}T15:30`);
      setScheduledHours(8);
      setStatus('scheduled');
      setNotes('');
    }
    setError(null);
  }, [initialShift, isOpen, employees, projects, jobSites]);

  // Compute scheduled hours automatically
  useEffect(() => {
    if (startTime && endTime) {
      const s = new Date(startTime).getTime();
      const e = new Date(endTime).getTime();
      if (e > s) {
        const hours = Number(((e - s) / 3600000).toFixed(1));
        setScheduledHours(hours);
      }
    }
  }, [startTime, endTime]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Shift title is required.');
      return;
    }
    if (!employeeId) {
      setError('Please select a worker for this shift.');
      return;
    }
    if (!projectId) {
      setError('Please select an associated project.');
      return;
    }
    if (!jobSiteId) {
      setError('Please select an active job site.');
      return;
    }
    if (!startTime || !endTime) {
      setError('Shift start and end times are required.');
      return;
    }

    setLoading(true);
    try {
      const shiftId = initialShift?.shiftId || `shf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const timestamp = new Date().toISOString();

      const shiftData: Shift = {
        shiftId,
        companyId,
        projectId,
        jobSiteId,
        employeeId,
        title: title.trim(),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        scheduledHours: Number(scheduledHours),
        status,
        notes: notes.trim() || undefined,
        assignedBy: initialShift?.assignedBy || 'supervisor',
        createdAt: initialShift?.createdAt || timestamp,
        updatedAt: timestamp,
      };

      await onSave(shiftData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save shift schedule.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg max-w-xl w-full p-6 text-white shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#A0A0A0] hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold uppercase tracking-tight mb-1 text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#F5C400]" />
          {initialShift ? 'Edit Scheduled Shift' : 'Dispatch Worker Shift'}
        </h3>
        <p className="text-xs text-[#A0A0A0] mb-5">
          Schedule site coverage and assign trade workers to geofenced locations
        </p>

        {error && (
          <div className="mb-4 p-3 bg-[#D92D20]/15 border border-[#D92D20]/40 rounded text-xs text-[#D92D20] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
              Shift Title <span className="text-[#F5C400]">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Concrete Pouring Shift A"
              className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#F5C400]" /> Assigned Worker <span className="text-[#F5C400]">*</span>
              </label>
              <select
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              >
                <option value="">Select Worker</option>
                {employees.map((emp) => (
                  <option key={emp.employeeId} value={emp.employeeId}>
                    {emp.firstName} {emp.lastName} ({emp.employeeNumber} &bull; {emp.jobTitle})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#F5C400]" /> Project <span className="text-[#F5C400]">*</span>
              </label>
              <select
                required
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  const matching = jobSites.filter((s) => s.projectId === e.target.value);
                  if (matching.length > 0) setJobSiteId(matching[0].jobSiteId);
                }}
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.projectId} value={p.projectId}>
                    {p.code} &mdash; {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#F5C400]" /> Job Site & Geofence <span className="text-[#F5C400]">*</span>
              </label>
              <select
                required
                value={jobSiteId}
                onChange={(e) => setJobSiteId(e.target.value)}
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              >
                <option value="">Select Job Site</option>
                {jobSites.map((s) => (
                  <option key={s.jobSiteId} value={s.jobSiteId}>
                    {s.name} ({s.radiusMeters}m geofence)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                Shift Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ShiftStatus)}
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              >
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="absent">Absent / Missed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[#111111] rounded border border-[#2C2C2C]">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-[#A0A0A0] mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#F5C400]" /> Start Time
              </label>
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-[#1C1C1C] border border-[#333333] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-[#A0A0A0] mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#F5C400]" /> End Time
              </label>
              <input
                type="datetime-local"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-[#1C1C1C] border border-[#333333] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-[#A0A0A0] mb-1">
                Scheduled Hours
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={scheduledHours}
                onChange={(e) => setScheduledHours(Number(e.target.value))}
                className="w-full bg-[#1C1C1C] border border-[#333333] rounded px-2.5 py-1.5 text-xs font-mono text-[#F5C400] font-bold focus:outline-none focus:border-[#F5C400]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
              Field Briefing / Required PPE / Shift Instructions
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Report to Gate 2 foreman for daily safety tailgate briefing. Hi-vis vest mandatory."
              className="w-full bg-[#111111] border border-[#2C2C2C] rounded p-2.5 text-xs text-white focus:outline-none focus:border-[#F5C400]"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#2C2C2C]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#252525] hover:bg-[#303030] text-xs font-semibold text-white rounded cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-[#F5C400] hover:bg-[#e0b400] text-black text-xs font-bold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-2 shadow-md shadow-[#F5C400]/20 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                'Save Shift Schedule'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
