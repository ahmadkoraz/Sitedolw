import React from 'react';
import type { Employee } from '../../types';
import { X, User, Mail, Phone, Calendar, Briefcase, Hash, Shield, Building } from 'lucide-react';

interface EmployeeDetailsModalProps {
  employee: Employee | null;
  onClose: () => void;
  onEdit: (employee: Employee) => void;
  canEdit: boolean;
}

export const EmployeeDetailsModal: React.FC<EmployeeDetailsModalProps> = ({
  employee,
  onClose,
  onEdit,
  canEdit,
}) => {
  if (!employee) return null;

  const statusColors = {
    active: 'bg-[#2E9B5B]/20 text-[#2E9B5B] border-[#2E9B5B]/40',
    pending: 'bg-amber-500/20 text-[#F5C400] border-[#F5C400]/40',
    inactive: 'bg-[#666666]/20 text-[#A0A0A0] border-[#666666]/40',
    suspended: 'bg-[#D92D20]/20 text-[#D92D20] border-[#D92D20]/40',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg max-w-lg w-full p-6 text-white shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#A0A0A0] hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#2C2C2C]">
          <div className="w-16 h-16 rounded-full bg-[#111111] border border-[#3C3C3C] overflow-hidden flex items-center justify-center shrink-0">
            {employee.profilePhotoUrl ? (
              <img
                src={employee.profilePhotoUrl}
                alt={`${employee.firstName} ${employee.lastName}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-[#666666]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-bold uppercase tracking-tight text-white">
                {employee.firstName} {employee.lastName}
              </h3>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase border ${
                  statusColors[employee.status]
                }`}
              >
                {employee.status}
              </span>
            </div>
            <p className="text-sm text-[#F5C400] font-medium">{employee.jobTitle}</p>
            <p className="text-xs text-[#A0A0A0]">{employee.department || 'Field Operations'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-[#111111] rounded border border-[#2C2C2C]">
            <span className="text-[#A0A0A0] flex items-center gap-1.5 mb-1 uppercase font-semibold">
              <Hash className="w-3.5 h-3.5 text-[#F5C400]" /> Employee ID
            </span>
            <span className="font-mono text-white text-sm font-bold">
              {employee.employeeNumber}
            </span>
          </div>

          <div className="p-3 bg-[#111111] rounded border border-[#2C2C2C]">
            <span className="text-[#A0A0A0] flex items-center gap-1.5 mb-1 uppercase font-semibold">
              <Shield className="w-3.5 h-3.5 text-[#F5C400]" /> Role
            </span>
            <span className="font-bold text-[#F5C400]">{employee.role}</span>
          </div>

          <div className="p-3 bg-[#111111] rounded border border-[#2C2C2C]">
            <span className="text-[#A0A0A0] flex items-center gap-1.5 mb-1 uppercase font-semibold">
              <Mail className="w-3.5 h-3.5 text-[#F5C400]" /> Email
            </span>
            <span className="text-white truncate block">{employee.email}</span>
          </div>

          <div className="p-3 bg-[#111111] rounded border border-[#2C2C2C]">
            <span className="text-[#A0A0A0] flex items-center gap-1.5 mb-1 uppercase font-semibold">
              <Phone className="w-3.5 h-3.5 text-[#F5C400]" /> Phone
            </span>
            <span className="text-white">{employee.phone || 'Not provided'}</span>
          </div>

          <div className="p-3 bg-[#111111] rounded border border-[#2C2C2C]">
            <span className="text-[#A0A0A0] flex items-center gap-1.5 mb-1 uppercase font-semibold">
              <Calendar className="w-3.5 h-3.5 text-[#F5C400]" /> Hire Date
            </span>
            <span className="text-white">{employee.hireDate || 'Not specified'}</span>
          </div>

          <div className="p-3 bg-[#111111] rounded border border-[#2C2C2C]">
            <span className="text-[#A0A0A0] flex items-center gap-1.5 mb-1 uppercase font-semibold">
              <Building className="w-3.5 h-3.5 text-[#F5C400]" /> Company Tenant
            </span>
            <span className="font-mono text-white text-[11px] truncate block">
              {employee.companyId}
            </span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#2C2C2C] flex items-center justify-between">
          <span className="text-[11px] text-[#666666]">
            Created: {new Date(employee.createdAt).toLocaleDateString()}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#252525] hover:bg-[#303030] text-xs font-semibold text-white rounded cursor-pointer"
            >
              Close
            </button>
            {canEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(employee);
                }}
                className="px-4 py-2 bg-[#F5C400] hover:bg-[#e0b400] text-black text-xs font-bold uppercase tracking-wider rounded cursor-pointer"
              >
                Edit Employee
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
