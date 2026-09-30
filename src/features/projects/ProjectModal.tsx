import React, { useState, useEffect } from 'react';
import type { Project, ProjectStatus, Employee } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { AlertCircle, Building, Calendar, User, Briefcase } from 'lucide-react';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectData: Project) => Promise<void>;
  initialProject?: Project | null;
  employees: Employee[];
  companyId: string;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialProject,
  employees,
  companyId,
}) => {
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('in_progress');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [managerId, setManagerId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialProject) {
      setName(initialProject.name);
      setCode(initialProject.code);
      setDescription(initialProject.description || '');
      setClientName(initialProject.clientName || '');
      setStatus(initialProject.status);
      setStartDate(initialProject.startDate || '');
      setEndDate(initialProject.endDate || '');
      setManagerId(initialProject.managerId || '');
    } else {
      setName('');
      setCode(`PRJ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
      setDescription('');
      setClientName('');
      setStatus('in_progress');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setManagerId('');
    }
    setError(null);
  }, [initialProject, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }
    if (!code.trim()) {
      setError('Project code is required.');
      return;
    }

    const creatorUid = user?.uid || initialProject?.createdBy;
    if (!creatorUid) {
      setError('Authenticated operator credentials required to record project.');
      return;
    }

    setLoading(true);
    try {
      const projectId = initialProject?.projectId || `prj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const timestamp = new Date().toISOString();

      const projectData: Project = {
        projectId,
        companyId,
        name: name.trim(),
        code: code.trim(),
        description: description.trim() || undefined,
        status,
        clientName: clientName.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        managerId: managerId || undefined,
        createdAt: initialProject?.createdAt || timestamp,
        updatedAt: timestamp,
        createdBy: creatorUid,
      };

      await onSave(projectData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project.');
    } finally {
      setLoading(false);
    }
  };

  const managerOptions = [
    { value: '', label: 'Unassigned (No Project Lead)' },
    ...employees.map((emp) => ({
      value: emp.employeeId,
      label: `${emp.firstName} ${emp.lastName} (${emp.jobTitle || emp.role})`,
    })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialProject ? 'Edit Project Contract' : 'Create New Project Contract'}
      description="Define project identity, client details, schedule timeline, and assigned project lead"
      maxWidth="lg"
    >
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Project Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Apex Tower Construction"
          />

          <Input
            label="Contract Code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. PRJ-2026-101"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Client / General Contractor"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="e.g. EllisDon Corp."
          />

          <Select
            label="Project Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            options={[
              { value: 'planning', label: 'Planning' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'on_hold', label: 'On Hold' },
              { value: 'completed', label: 'Completed' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
        </div>

        <Select
          label="Assigned Project Manager"
          value={managerId}
          onChange={(e) => setManagerId(e.target.value)}
          options={managerOptions}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            type="date"
            label="Target Start Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <Input
            type="date"
            label="Estimated Completion"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Scope & Notes
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="High-level description of trade scopes, deliverables, or site safety instructions..."
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
          >
            {initialProject ? 'Save Changes' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
