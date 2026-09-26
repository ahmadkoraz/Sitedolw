import React, { useState, useEffect } from 'react';
import type { Project, ProjectStatus, Employee } from '../../types';
import { X, Building, Calendar, User, FileText, AlertCircle, Loader2 } from 'lucide-react';

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

  if (!isOpen) return null;

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
        createdBy: initialProject?.createdBy || 'system',
      };

      await onSave(projectData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project.');
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
          <Building className="w-5 h-5 text-[#F5C400]" />
          {initialProject ? 'Edit Construction Project' : 'Create New Project'}
        </h3>
        <p className="text-xs text-[#A0A0A0] mb-5">
          Define client contract, schedule milestones, and supervisory assignment
        </p>

        {error && (
          <div className="mb-4 p-3 bg-[#D92D20]/15 border border-[#D92D20]/40 rounded text-xs text-[#D92D20] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                Project Name <span className="text-[#F5C400]">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bayview Commercial Tower Phase II"
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                Project Code <span className="text-[#F5C400]">*</span>
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="PRJ-2026-01"
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                Client / Owner Name
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ontario Infrastructure Partners"
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              >
                <option value="planning">Planning & Permitting</option>
                <option value="in_progress">Active Execution (In Progress)</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed / Handed Over</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#F5C400]" /> Assigned Project Manager
              </label>
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              >
                <option value="">Unassigned</option>
                {employees.map((emp) => (
                  <option key={emp.employeeId} value={emp.employeeId}>
                    {emp.firstName} {emp.lastName} ({emp.jobTitle} - {emp.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#F5C400]" /> Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#F5C400]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#F5C400]" /> Target End
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#F5C400]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#F5C400]" /> Project Scope & Scope Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Structural framing, mechanical fit-out, and site safety compliance."
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
                'Save Project Contract'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
