import React, { useState, useEffect } from 'react';
import type { Employee, UserRole, UserStatus } from '../../types';
import { storageService } from '../../services/storage/storageService';
import { useAuth } from '../auth/AuthContext';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { stripUndefined } from '../../utils/cleanFirestoreData';
import { Upload, AlertCircle, User, Calendar, Briefcase, Hash, Shield } from 'lucide-react';

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
      const payload: Employee = stripUndefined({
        employeeId,
        userId: initialEmployee?.userId,
        companyId,
        employeeNumber: employeeNumber.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() ? phone.trim() : undefined,
        role,
        jobTitle: jobTitle.trim(),
        department: department.trim() ? department.trim() : undefined,
        status,
        hireDate: hireDate ? hireDate : undefined,
        profilePhotoUrl: profilePhotoUrl ? profilePhotoUrl : undefined,
        createdAt: initialEmployee?.createdAt || timestamp,
        updatedAt: timestamp,
      });

      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save employee profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialEmployee ? 'Edit Team Member' : 'Add Team Member'}
      description="Update verified workforce details, trade role, and contact information."
      maxWidth="2xl"
    >
      {error && (
        <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Photo Upload Area */}
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-900/60 rounded-xl border border-slate-800">
          <div className="relative w-16 h-16 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <User className="w-7 h-7 text-slate-500" />
            )}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <label className="text-xs font-medium text-slate-200 block mb-1">
              Profile Photo (Optional)
            </label>
            <p className="text-[11px] text-slate-400 mb-2.5">
              PNG, JPG, or WEBP up to 5MB for site safety identification.
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 rounded-lg cursor-pointer inline-flex items-center gap-1.5 transition">
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                Select Photo
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
                  className="text-xs text-slate-400 hover:text-red-400 transition"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Identity Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="First Name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="John"
          />
          <Input
            label="Last Name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
          />
        </div>

        {/* Contact Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Email Address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john.doe@company.com"
          />
          <Input
            label="Phone Number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 000-0000"
          />
        </div>

        {/* Role & Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Employee ID Number"
            required
            value={employeeNumber}
            onChange={(e) => setEmployeeNumber(e.target.value)}
            placeholder="EMP-1001"
          />
          <Select
            label="System Role"
            required
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            <option value="EMPLOYEE">EMPLOYEE (Field Worker)</option>
            <option value="SUPERVISOR">SUPERVISOR (Field Lead)</option>
            <option value="PROJECT_MANAGER">PROJECT_MANAGER</option>
            <option value="ADMIN">ADMIN</option>
            {isSuperAdmin && <option value="SUPER_ADMIN">SUPER_ADMIN</option>}
            <option value="HR">HR</option>
            <option value="ACCOUNTING">ACCOUNTING</option>
          </Select>
        </div>

        {/* Trade & Department */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Job / Trade Title"
            required
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Lead Carpenter / Site Superintendent"
          />
          <Input
            label="Department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="Framing & Structural"
          />
        </div>

        {/* Status & Hire Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Operational Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as UserStatus)}
          >
            <option value="active">Active (Available for Dispatch)</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </Select>
          <Input
            label="Hire Date"
            type="date"
            value={hireDate}
            onChange={(e) => setHireDate(e.target.value)}
          />
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            {initialEmployee ? 'Save Changes' : 'Create Team Member'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
