import React from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { EmployeeList } from '../features/employees/EmployeeList';
import { AccessDenied } from '../components/common/AccessDenied';

interface EmployeesPageProps {
  onBackToDashboard: () => void;
}

export const EmployeesPage: React.FC<EmployeesPageProps> = ({ onBackToDashboard }) => {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <AccessDenied onBack={onBackToDashboard} requiredRole="ADMIN or SUPER_ADMIN" />;
  }

  return <EmployeeList />;
};
