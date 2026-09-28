import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Employee, UserRole, UserStatus } from '../../types';
import { employeeService } from '../../services/firebase/firestore/employeeService';
import { auditService } from '../../services/firebase/firestore/auditService';
import { useAuth } from '../auth/AuthContext';
import { EmployeeModal } from './EmployeeModal';
import { EmployeeDetailsModal } from './EmployeeDetailsModal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, CardContent } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit2,
  AlertCircle,
  Loader2,
  Mail,
  Phone,
  Briefcase,
  CheckCircle2,
  XCircle,
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

  const getStatusBadgeVariant = (st: UserStatus): 'success' | 'warning' | 'neutral' | 'error' => {
    switch (st) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'inactive':
        return 'neutral';
      case 'suspended':
        return 'error';
      default:
        return 'neutral';
    }
  };

  const getRoleBadgeVariant = (r: UserRole): 'amber' | 'info' | 'neutral' => {
    if (r === 'SUPER_ADMIN') return 'amber';
    if (r === 'ADMIN' || r === 'PROJECT_MANAGER') return 'info';
    return 'neutral';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Actions */}
      <PageHeader
        title="Workforce Directory"
        description="Manage company team members, field trade titles, status, and role access controls"
        badge={
          <Badge variant="neutral" size="sm">
            {employees.length} Total Registered
          </Badge>
        }
      >
        {isAdmin && (
          <Button
            variant="primary"
            size="md"
            leftIcon={<UserPlus className="w-4 h-4" />}
            onClick={() => {
              setSelectedForEdit(null);
              setIsModalOpen(true);
            }}
          >
            Add Team Member
          </Button>
        )}
      </PageHeader>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, EMP ID, email, or trade title..."
              className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-10 pr-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>Status:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>

            <div className="flex items-center gap-1.5 text-xs text-slate-400 ml-2">
              <span>Role:</span>
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
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
      </Card>

      {/* Directory Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <p className="text-xs font-medium text-slate-400">Loading workforce records...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title="No Workforce Members Found"
            description={
              searchQuery || statusFilter !== 'all' || roleFilter !== 'all'
                ? 'No workforce members matched your active filters. Try refining your search query.'
                : 'There are currently no employee records added to this company workspace.'
            }
            actionLabel={isAdmin && !searchQuery ? 'Add First Employee' : undefined}
            onAction={
              isAdmin && !searchQuery
                ? () => {
                    setSelectedForEdit(null);
                    setIsModalOpen(true);
                  }
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 border-b border-slate-800/80 text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
                <tr>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">ID Number</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Trade Title</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEmployees.map((emp) => (
                  <tr
                    key={emp.employeeId}
                    className="hover:bg-slate-900/40 transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={`${emp.firstName} ${emp.lastName}`}
                          src={emp.profilePhotoUrl}
                          size="md"
                        />
                        <div className="min-w-0">
                          <button
                            onClick={() => setSelectedForView(emp)}
                            className="font-semibold text-slate-100 hover:text-amber-400 transition-colors text-left block truncate cursor-pointer text-sm"
                          >
                            {emp.firstName} {emp.lastName}
                          </button>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span className="truncate">{emp.email}</span>
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-300 text-xs">
                      {emp.employeeNumber}
                    </td>

                    <td className="py-3 px-4">
                      <Badge variant={getRoleBadgeVariant(emp.role)} size="sm">
                        {emp.role}
                      </Badge>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-200 font-medium">{emp.jobTitle}</div>
                      {emp.department && (
                        <div className="text-[11px] text-slate-500">{emp.department}</div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <Badge variant={getStatusBadgeVariant(emp.status)} size="sm" dot>
                        <span className="capitalize">{emp.status}</span>
                      </Badge>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="View Profile"
                          onClick={() => setSelectedForView(emp)}
                          className="p-1.5 h-8 w-8 text-slate-400 hover:text-slate-100"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Edit Record"
                            onClick={() => {
                              setSelectedForEdit(emp);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 h-8 w-8 text-slate-400 hover:text-amber-400"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}

                        {isAdmin && emp.role !== 'SUPER_ADMIN' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title={emp.status === 'active' ? 'Deactivate Member' : 'Activate Member'}
                            onClick={() =>
                              handleToggleStatus(emp, emp.status === 'active' ? 'inactive' : 'active')
                            }
                            className={`p-1.5 h-8 w-8 ${
                              emp.status === 'active'
                                ? 'text-slate-400 hover:text-red-400'
                                : 'text-slate-400 hover:text-emerald-400'
                            }`}
                          >
                            {emp.status === 'active' ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Modal */}
      {company && (
        <EmployeeModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedForEdit(null);
          }}
          onSave={handleSaveEmployee}
          initialEmployee={selectedForEdit}
          companyId={company.companyId}
        />
      )}

      {/* View Details Drawer/Modal */}
      {selectedForView && (
        <EmployeeDetailsModal
          employee={selectedForView}
          onClose={() => setSelectedForView(null)}
          onEdit={(emp) => {
            setSelectedForEdit(emp);
            setSelectedForView(null);
            setIsModalOpen(true);
          }}
          canEdit={Boolean(isAdmin)}
        />
      )}
    </div>
  );
};
