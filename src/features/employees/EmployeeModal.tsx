import React, { useState, useEffect } from 'react';
import type { Employee, UserRole, UserStatus } from '../../types';
import { storageService } from '../../services/storage/storageService';
import { useAuth } from '../auth/AuthContext';
import { X, Upload, AlertCircle, Loader2, User, Mail, Phone, Briefcase, Hash, Shield } from 'lucide-react';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employeeData: Employee) => Promise<void>;
  initialEmployee?: Employee | null;
  companyId: string;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialEmployee,
  companyId,
}) => {
  const { isSuperAdmin } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [role, setRole] = useState<UserRole>('EMPLOYEE');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState<UserStatus>('active');
  const [hireDate, setHireDate] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialEmployee) {
      setFirstName(initialEmployee.firstName);
      setLastName(initialEmployee.lastName);
      setEmail(initialEmployee.email);
      setPhone(initialEmployee.phone || '');
      setEmployeeNumber(initialEmployee.employeeNumber);
      setRole(initialEmployee.role);
      setJobTitle(initialEmployee.jobTitle);
      setDepartment(initialEmployee.department || '');
      setStatus(initialEmployee.status);
      setHireDate(initialEmployee.hireDate || '');
      setPhotoPreview(initialEmployee.profilePhotoUrl || null);
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setEmployeeNumber(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
      setRole('EMPLOYEE');
      setJobTitle('Field Specialist');
      setDepartment('General Operations');
      setStatus('active');
      setHireDate(new Date().toISOString().split('T')[0]);
      setPhotoFile(null);
      setPhotoPreview(null);
    }
    setError(null);
  }, [initialEmployee, isOpen]);

  if (!isOpen) return null;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setError('Only image files (PNG, JPG, WEBP) are supported.');
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('A valid email address is required.');
      return;
    }
    if (!employeeNumber.trim()) {
      setError('Employee number is required.');
      return;
    }
    if (!jobTitle.trim()) {
      setError('Job title is required.');
      return;
    }

    // Role Escalation Guard: Non-SUPER_ADMIN cannot assign SUPER_ADMIN
    if (role === 'SUPER_ADMIN' && !isSuperAdmin) {
      setError('Only an existing SUPER_ADMIN can assign the SUPER_ADMIN role.');
      return;
    }

    setLoading(true);

    try {
      const employeeId = initialEmployee?.employeeId || `emp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      let profilePhotoUrl = initialEmployee?.profilePhotoUrl;

      if (photoFile) {
        profilePhotoUrl = await storageService.uploadProfilePhoto(companyId, employeeId, photoFile);
      }

      const timestamp = new Date().toISOString();
      const payload: Employee = {
        employeeId,
        userId: initialEmployee?.userId,
        companyId,
        employeeNumber: employeeNumber.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        role,
        jobTitle: jobTitle.trim(),
        department: department.trim() || undefined,
        status,
        hireDate: hireDate || undefined,
        profilePhotoUrl,
        createdAt: initialEmployee?.createdAt || timestamp,
        updatedAt: timestamp,
      };

      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save employee profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg max-w-2xl w-full p-6 text-white shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#A0A0A0] hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold uppercase tracking-tight mb-1 text-white">
          {initialEmployee ? 'Edit Employee Record' : 'Add New Workforce Member'}
        </h3>
        <p className="text-xs text-[#A0A0A0] mb-5">
          Company: <strong className="text-white">{companyId}</strong>
        </p>

        {error && (
          <div className="mb-4 p-3 bg-[#D92D20]/10 border border-[#D92D20]/40 rounded text-xs text-[#D92D20] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo & Basic Identity */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-[#111111] rounded border border-[#2C2C2C]">
            <div className="relative w-16 h-16 rounded-full bg-[#252525] border border-[#3C3C3C] overflow-hidden flex items-center justify-center shrink-0">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-[#666666]" />
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <label className="text-xs font-semibold uppercase tracking-wider text-white block mb-1">
                Profile Photo (Max 5MB)
              </label>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <label className="px-3 py-1.5 bg-[#252525] hover:bg-[#303030] text-xs font-medium text-white border border-[#3C3C3C] rounded cursor-pointer inline-flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-[#F5C400]" />
                  Choose File
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="text-xs text-[#D92D20] hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                First Name <span className="text-[#F5C400]">*</span>
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="James"
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                Last Name <span className="text-[#F5C400]">*</span>
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Miller"
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1 flex items-center gap-1">
                <Mail className="w-3 h-3 text-[#F5C400]" /> Email Address <span className="text-[#F5C400]">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="j.miller@siteflow.dev"
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-[#F5C400]" /> Mobile Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (416) 555-0199"
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1 flex items-center gap-1">
                <Hash className="w-3 h-3 text-[#F5C400]" /> Employee Number <span className="text-[#F5C400]">*</span>
              </label>
              <input
                type="text"
                required
                value={employeeNumber}
                onChange={(e) => setEmployeeNumber(e.target.value)}
                placeholder="EMP-1002"
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1 flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-[#F5C400]" /> Job Title <span className="text-[#F5C400]">*</span>
              </label>
              <input
                type="text"
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Framing Lead"
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Carpentry"
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1 flex items-center gap-1">
                <Shield className="w-3 h-3 text-[#F5C400]" /> System Role <span className="text-[#F5C400]">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              >
                <option value="EMPLOYEE">EMPLOYEE</option>
                <option value="SUPERVISOR">SUPERVISOR</option>
                <option value="PROJECT_MANAGER">PROJECT_MANAGER</option>
                <option value="HR">HR</option>
                <option value="ACCOUNTING">ACCOUNTING</option>
                <option value="ADMIN">ADMIN</option>
                {/* Only SUPER_ADMIN actor can assign SUPER_ADMIN */}
                {isSuperAdmin && <option value="SUPER_ADMIN">SUPER_ADMIN</option>}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as UserStatus)}
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                Hire Date
              </label>
              <input
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>
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
                'Save Employee Record'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
