import React from 'react';
import type { Employee } from '../../types';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { User, Mail, Phone, Calendar, Briefcase, Hash, Shield, Building } from 'lucide-react';

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

  const getStatusBadgeVariant = (s: string): 'success' | 'amber' | 'neutral' | 'error' => {
    switch (s) {
      case 'active':
        return 'success';
      case 'pending':
        return 'amber';
      case 'suspended':
        return 'error';
      default:
        return 'neutral';
    }
  };

  return (
    <Modal
      isOpen={Boolean(employee)}
      onClose={onClose}
      title="Employee Profile"
      description="Detailed workforce record and assigned role permissions"
      maxWidth="lg"
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4 pb-5 border-b border-slate-800">
          <Avatar
            name={`${employee.firstName} ${employee.lastName}`}
            src={employee.profilePhotoUrl}
            size="lg"
          />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-slate-100">
                {employee.firstName} {employee.lastName}
              </h3>
              <Badge
                size="sm"
                variant={getStatusBadgeVariant(employee.status)}
              >
                {employee.status}
              </Badge>
            </div>
            <p className="text-sm text-amber-400 font-medium">{employee.jobTitle}</p>
            <p className="text-xs text-slate-400">{employee.department || 'Field Operations'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
            <span className="text-slate-400 flex items-center gap-1.5 mb-1 font-medium">
              <Hash className="w-3.5 h-3.5 text-amber-400" /> Employee ID
            </span>
            <span className="font-mono text-slate-200 text-sm font-semibold">
              {employee.employeeNumber}
            </span>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
            <span className="text-slate-400 flex items-center gap-1.5 mb-1 font-medium">
              <Shield className="w-3.5 h-3.5 text-amber-400" /> Role Access
            </span>
            <Badge size="sm" variant="amber">
              {employee.role}
            </Badge>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
            <span className="text-slate-400 flex items-center gap-1.5 mb-1 font-medium">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> Work Email
            </span>
            <span className="text-slate-200 truncate block">{employee.email}</span>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
            <span className="text-slate-400 flex items-center gap-1.5 mb-1 font-medium">
              <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone
            </span>
            <span className="text-slate-200">{employee.phone || 'Not provided'}</span>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
            <span className="text-slate-400 flex items-center gap-1.5 mb-1 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Hire Date
            </span>
            <span className="text-slate-200">{employee.hireDate || 'Not specified'}</span>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
            <span className="text-slate-400 flex items-center gap-1.5 mb-1 font-medium">
              <Building className="w-3.5 h-3.5 text-slate-400" /> Tenant ID
            </span>
            <span className="font-mono text-slate-300 text-[11px] truncate block">
              {employee.companyId}
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Created: {new Date(employee.createdAt).toLocaleDateString()}
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
            {canEdit && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit(employee);
                }}
              >
                Edit Employee
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
