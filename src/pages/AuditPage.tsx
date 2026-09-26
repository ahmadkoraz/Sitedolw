import React from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { AuditLogViewer } from '../features/audit/AuditLogViewer';
import { AccessDenied } from '../components/common/AccessDenied';

interface AuditPageProps {
  onBackToDashboard: () => void;
}

export const AuditPage: React.FC<AuditPageProps> = ({ onBackToDashboard }) => {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <AccessDenied onBack={onBackToDashboard} requiredRole="ADMIN or SUPER_ADMIN" />;
  }

  return <AuditLogViewer />;
};
