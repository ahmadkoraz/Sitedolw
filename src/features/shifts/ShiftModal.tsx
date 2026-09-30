import React, { useState, useEffect } from 'react';
import type { Shift, ShiftStatus, Employee, Project, JobSite } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { AlertCircle, Calendar, Clock, User, MapPin, Building, Info } from 'lucide-react';

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
  const { user } = useAuth();

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
      const firstProject = projects[0]?.projectId || '';
      const matchingSites = jobSites.filter((s) => s.projectId === firstProject);

      setEmployeeId(employees[0]?.employeeId || '');
      setProjectId(firstProject);
      setJobSiteId(matchingSites[0]?.jobSiteId || jobSites[0]?.jobSiteId || '');

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

  // Filter job sites based on selected project to maintain strict relational integrity
  const availableJobSites = projectId
    ? jobSites.filter((s) => s.projectId === projectId)
    : jobSites;

  const handleProjectChange = (newProjectId: string) => {
    setProjectId(newProjectId);
    const sitesForProj = jobSites.filter((s) => s.projectId === newProjectId);
    if (sitesForProj.length > 0) {
      if (!sitesForProj.some((s) => s.jobSiteId === jobSiteId)) {
        setJobSiteId(sitesForProj[0].jobSiteId);
      }
    } else {
      setJobSiteId('');
    }
  };

  const handleJobSiteChange = (newJobSiteId: string) => {
    setJobSiteId(newJobSiteId);
    const selectedSite = jobSites.find((s) => s.jobSiteId === newJobSiteId);
    if (selectedSite && selectedSite.projectId) {
      setProjectId(selectedSite.projectId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Shift title is required.');
      return;
    }
    if (!employeeId) {
      setError('Please select a workforce member for this shift.');
      return;
    }
    if (!projectId) {
      setError('Please select an active project contract.');
      return;
    }
    if (!jobSiteId) {
      setError('Please select an active job site associated with the project.');
      return;
    }

    const selectedSite = jobSites.find((s) => s.jobSiteId === jobSiteId);
    if (selectedSite && selectedSite.projectId !== projectId) {
      setError('The selected job site does not belong to the selected project contract.');
      return;
    }

    if (!startTime || !endTime) {
      setError('Shift start time and end time are required.');
      return;
    }
    if (new Date(endTime) <= new Date(startTime)) {
      setError('Shift end time must be after the start time.');
      return;
    }

    const assignedByUid = user?.uid || initialShift?.assignedBy;
    if (!assignedByUid) {
      setError('Authenticated supervisor credentials required to dispatch shift.');
      return;
    }

    setLoading(true);
    try {
      const shiftId = initialShift?.shiftId || `shift_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const timestamp = new Date().toISOString();

      const selectedEmployee = employees.find((emp) => emp.employeeId === employeeId);

      const shiftData: Shift = {
        shiftId,
        companyId,
        employeeId,
        assignedUserId: selectedEmployee?.userId || undefined,
        projectId,
        jobSiteId,
        title: title.trim(),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        scheduledHours,
        status,
        notes: notes.trim() || undefined,
        assignedBy: assignedByUid,
        createdAt: initialShift?.createdAt || timestamp,
        updatedAt: timestamp,
      };

      await onSave(shiftData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save shift.');
    } finally {
      setLoading(false);
    }
  };

  const employeeOptions = employees.map((emp) => ({
    value: emp.employeeId,
    label: `${emp.firstName} ${emp.lastName} (${emp.jobTitle || emp.role})`,
  }));

  const projectOptions = projects.map((p) => ({
    value: p.projectId,
    label: `${p.code} - ${p.name}`,
  }));

  const jobSiteOptions = availableJobSites.map((s) => ({
    value: s.jobSiteId,
    label: `${s.name} (${s.city})`,
  }));

  const missingDependencies: string[] = [];
  if (employees.length === 0) missingDependencies.push('Employees');
  if (projects.length === 0) missingDependencies.push('Projects');
  if (jobSites.length === 0) missingDependencies.push('Job Sites');
  const hasMissingDeps = missingDependencies.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialShift ? 'Edit Shift Dispatch' : 'Dispatch Worker Shift'}
      description="Assign trade worker to designated project and job site with scheduled operational hours"
      maxWidth="lg"
    >
      {hasMissingDeps && (
        <div className="mb-4 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-slate-100 font-semibold mb-0.5">Missing Prerequisites</strong>
            In SITEFLOW, dispatching a shift requires: {missingDependencies.join(', ')}. Please configure these prerequisites before dispatching shifts.
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Shift Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Concrete Pour Crew - Shift 1"
        />

        <Select
          label="Assigned Worker"
          required
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          options={employeeOptions.length > 0 ? employeeOptions : [{ value: '', label: 'No Employees Registered' }]}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Project Contract"
            required
            value={projectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            options={projectOptions.length > 0 ? projectOptions : [{ value: '', label: 'No Projects Available' }]}
          />

          <Select
            label="Assigned Job Site"
            required
            value={jobSiteId}
            onChange={(e) => handleJobSiteChange(e.target.value)}
            options={jobSiteOptions.length > 0 ? jobSiteOptions : [{ value: '', label: 'No Job Sites Available for Selected Project' }]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            type="datetime-local"
            label="Shift Start Time"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />

          <Input
            type="datetime-local"
            label="Shift End Time"
            required
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            type="number"
            step="0.5"
            label="Calculated Shift Hours"
            value={scheduledHours}
            onChange={(e) => setScheduledHours(parseFloat(e.target.value))}
          />

          <Select
            label="Shift Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ShiftStatus)}
            options={[
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Shift Instructions & Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special PPE requirements, trailer entrance gate code, supervisor instructions..."
            className="w-full bg-slate-900/90 text-slate-100 placeholder:text-slate-500 text-sm rounded-lg border border-slate-800 p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60"
          />
        </div>

        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            disabled={hasMissingDeps}
          >
            {initialShift ? 'Save Changes' : 'Dispatch Shift'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
