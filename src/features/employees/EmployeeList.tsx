import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Employee, UserRole, UserStatus } from '../../types';
import { employeeService } from '../../services/firebase/firestore/employeeService';
import { auditService } from '../../services/firebase/firestore/auditService';
import { useAuth } from '../auth/AuthContext';
import { EmployeeModal } from './EmployeeModal';
import { EmployeeDetailsModal } from './EmployeeDetailsModal';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Shield,
  Hash,
} from 'lucide-react';

export const EmployeeList: React.FC = () => {
  const { user, company, userProfile, isAdmin, isSuperAdmin } = useAuth();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedForEdit, setSelectedForEdit] = useState<Employee | null>(null);
  const [selectedForView, setSelectedForView] = useState<Employee | null>(null);

  const fetchEmployees = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    setError(null);
    try {
      const data = await employeeService.getEmployeesByCompany(company.companyId);
      setEmployees(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employee directory.');
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleSaveEmployee = async (employeeData: Employee) => {
    if (!company || !user || !userProfile) return;

    const isEdit = Boolean(selectedForEdit);
    const beforeState = isEdit ? selectedForEdit : null;

    if (isEdit) {
      await employeeService.updateEmployee(company.companyId, employeeData.employeeId, employeeData);
    } else {
      await employeeService.createEmployee(company.companyId, employeeData);
    }

    // Record Audit Log
    await auditService.logEvent({
      companyId: company.companyId,
      actorUserId: user.uid,
      actorRole: userProfile.role,
      action: isEdit ? 'EMPLOYEE_UPDATED' : 'EMPLOYEE_CREATED',
      resourceType: 'employee',
      resourceId: employeeData.employeeId,
      before: beforeState as unknown as Record<string, unknown>,
      after: employeeData as unknown as Record<string, unknown>,
    });

    await fetchEmployees();
  };

  const handleToggleStatus = async (employee: Employee, newStatus: UserStatus) => {
    if (!company || !user || !userProfile) return;
    try {
      await employeeService.setEmployeeStatus(company.companyId, employee.employeeId, newStatus);

      await auditService.logEvent({
        companyId: company.companyId,
        actorUserId: user.uid,
        actorRole: userProfile.role,
        action: 'EMPLOYEE_STATUS_CHANGED',
        resourceType: 'employee',
        resourceId: employee.employeeId,
        before: { status: employee.status },
        after: { status: newStatus },
        metadata: {
          note: `Status updated from ${employee.status} to ${newStatus}`,
        },
      });

      await fetchEmployees();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update employee status.');
    }
  };

  // Filtered List
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        emp.firstName.toLowerCase().includes(query) ||
        emp.lastName.toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query) ||
        emp.employeeNumber.toLowerCase().includes(query) ||
        emp.jobTitle.toLowerCase().includes(query) ||
        (emp.department && emp.department.toLowerCase().includes(query));

      const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
      const matchesRole = roleFilter === 'all' || emp.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [employees, searchQuery, statusFilter, roleFilter]);

  const statusStyles: Record<UserStatus, string> = {
    active: 'bg-[#2E9B5B]/15 text-[#2E9B5B] border-[#2E9B5B]/30',
    pending: 'bg-amber-500/15 text-[#F5C400] border-[#F5C400]/30',
    inactive: 'bg-[#555555]/20 text-[#A0A0A0] border-[#555555]/40',
    suspended: 'bg-[#D92D20]/15 text-[#D92D20] border-[#D92D20]/30',
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#F5C400]" />
            Workforce Directory
          </h1>
          <p className="text-xs text-[#A0A0A0] mt-1">
            Manage company employees, job titles, status, and role access controls
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setSelectedForEdit(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#F5C400] hover:bg-[#e0b400] text-black font-bold text-xs uppercase tracking-wider rounded transition cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-[#F5C400]/15"
          >
            <UserPlus className="w-4 h-4" />
            Add Employee
          </button>
        )}
      </div>

      {error && (
        <div className="p-3.5 bg-[#D92D20]/10 border border-[#D92D20]/40 rounded text-xs text-[#D92D20] flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-[#A0A0A0] absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, EMP ID, email, or trade title..."
            className="w-full bg-[#111111] border border-[#2C2C2C] rounded pl-9 pr-3 py-2 text-xs text-white placeholder-[#555555] focus:outline-none focus:border-[#F5C400]"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[#A0A0A0]">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#111111] border border-[#2C2C2C] rounded px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#F5C400]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs text-[#A0A0A0] ml-2">
            <span>Role:</span>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-[#111111] border border-[#2C2C2C] rounded px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#F5C400]"
          >
            <option value="all">All Roles</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            <option value="ADMIN">ADMIN</option>
            <option value="PROJECT_MANAGER">PROJECT_MANAGER</option>
            <option value="SUPERVISOR">SUPERVISOR</option>
            <option value="HR">HR</option>
            <option value="ACCOUNTING">ACCOUNTING</option>
            <option value="EMPLOYEE">EMPLOYEE</option>
          </select>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-[#A0A0A0] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[#F5C400] animate-spin" />
            <p className="text-xs uppercase tracking-wider font-semibold">
              Loading Employee Roster...
            </p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="py-16 text-center text-[#A0A0A0] px-4">
            <Users className="w-12 h-12 mx-auto text-[#444444] mb-3" />
            <h4 className="text-sm font-bold text-white uppercase tracking-tight mb-1">
              No Employees Found
            </h4>
            <p className="text-xs text-[#777777] max-w-sm mx-auto mb-4">
              {searchQuery || statusFilter !== 'all' || roleFilter !== 'all'
                ? 'No workforce members matched your active filters.'
                : 'There are currently 0 employees recorded for this company.'}
            </p>
            {isAdmin && !searchQuery && statusFilter === 'all' && (
              <button
                onClick={() => {
                  setSelectedForEdit(null);
                  setIsModalOpen(true);
                }}
                className="px-4 py-2 bg-[#F5C400] hover:bg-[#e0b400] text-black font-bold text-xs uppercase tracking-wider rounded transition cursor-pointer"
              >
                Add First Employee
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#151515] border-b border-[#2C2C2C] text-[#A0A0A0] uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Number</th>
                  <th className="py-3 px-4">Job Title & Dept</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252525]">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.employeeId} className="hover:bg-[#222222] transition-colors">
                    {/* Employee Identity */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#111111] border border-[#3C3C3C] overflow-hidden flex items-center justify-center shrink-0">
                          {emp.profilePhotoUrl ? (
                            <img
                              src={emp.profilePhotoUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="font-bold text-[11px] text-[#A0A0A0]">
                              {emp.firstName[0]}
                              {emp.lastName[0]}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-white">
                            {emp.firstName} {emp.lastName}
                          </div>
                          <div className="text-[11px] text-[#777777]">{emp.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* ID */}
                    <td className="py-3 px-4 font-mono text-[#F5C400] font-medium">
                      {emp.employeeNumber}
                    </td>

                    {/* Title & Dept */}
                    <td className="py-3 px-4">
                      <div className="text-white font-medium">{emp.jobTitle}</div>
                      <div className="text-[11px] text-[#777777]">
                        {emp.department || 'Operations'}
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-white">
                        <Shield className="w-3 h-3 text-[#F5C400]" />
                        {emp.role}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          statusStyles[emp.status]
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedForView(emp)}
                          title="View Profile"
                          className="p-1.5 hover:bg-[#2C2C2C] text-[#A0A0A0] hover:text-white rounded cursor-pointer transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {isAdmin && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedForEdit(emp);
                                setIsModalOpen(true);
                              }}
                              title="Edit Record"
                              className="p-1.5 hover:bg-[#2C2C2C] text-[#A0A0A0] hover:text-[#F5C400] rounded cursor-pointer transition"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {emp.status === 'active' ? (
                              <button
                                onClick={() => handleToggleStatus(emp, 'inactive')}
                                title="Deactivate Employee"
                                className="p-1.5 hover:bg-[#D92D20]/20 text-[#A0A0A0] hover:text-[#D92D20] rounded cursor-pointer transition"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleStatus(emp, 'active')}
                                title="Activate Employee"
                                className="p-1.5 hover:bg-[#2E9B5B]/20 text-[#A0A0A0] hover:text-[#2E9B5B] rounded cursor-pointer transition"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Employee Edit / Create Modal */}
      {company && (
        <EmployeeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveEmployee}
          initialEmployee={selectedForEdit}
          companyId={company.companyId}
        />
      )}

      {/* Employee Details Modal */}
      <EmployeeDetailsModal
        employee={selectedForView}
        onClose={() => setSelectedForView(null)}
        canEdit={isAdmin}
        onEdit={(emp) => {
          setSelectedForView(null);
          setSelectedForEdit(emp);
          setIsModalOpen(true);
        }}
      />
    </div>
  );
};
