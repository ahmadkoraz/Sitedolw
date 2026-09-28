import React, { useState, useEffect, useCallback } from 'react';
import type { AuditLog } from '../../types';
import { auditService } from '../../services/firebase/firestore/auditService';
import { useAuth } from '../auth/AuthContext';
import { AccessDenied } from '../../components/common/AccessDenied';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Shield, Clock, FileText, User, RefreshCw, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

export const AuditLogViewer: React.FC = () => {
  const { company, isAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    setError(null);
    try {
      const data = await auditService.getAuditLogs(company.companyId, 100);
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve compliance audit logs.');
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => {
    if (isAdmin) {
      fetchLogs();
    }
  }, [fetchLogs, isAdmin]);

  if (!isAdmin) {
    return <AccessDenied requiredRole="ADMIN or SUPER_ADMIN" />;
  }

  const getActionBadgeVariant = (action: string): 'amber' | 'success' | 'info' | 'error' | 'neutral' => {
    if (action.includes('CREATED')) return 'success';
    if (action.includes('UPDATED') || action.includes('CHANGED')) return 'info';
    if (action.includes('REVOKED') || action.includes('DELETED')) return 'error';
    if (action.includes('ROLE') || action.includes('SECURITY')) return 'amber';
    return 'neutral';
  };

  const formatActionName = (action: string) => {
    return action
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Compliance & Security Audit Trail"
        description="Immutable system activity log recording all security, role modifications, and administrative events"
        badge={
          <Badge variant="amber" size="sm">
            Company Scope: {company?.name || company?.companyId}
          </Badge>
        }
      >
        <Button
          variant="outline"
          size="md"
          isLoading={loading}
          leftIcon={<RefreshCw className="w-3.5 h-3.5 text-amber-400" />}
          onClick={fetchLogs}
        >
          Refresh Audit Trail
        </Button>
      </PageHeader>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Audit Records Card */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-900/80 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium text-slate-200">
            Tenant: <code className="text-amber-400 font-mono text-[11px]">{company?.companyId}</code>
          </span>
          <span className="text-slate-400">{logs.length} logged events recorded</span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <span className="text-xs text-slate-400">Loading audit trail entries...</span>
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-8 h-8 text-slate-500" />}
            title="No audit events recorded"
            description="All sensitive administrative, workforce, and role actions will be immutably recorded here."
          />
        ) : (
          <div className="divide-y divide-slate-800/60">
            {logs.map((log) => (
              <div key={log.auditId} className="p-5 hover:bg-slate-900/40 transition-colors text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <Badge
                      size="sm"
                      variant={getActionBadgeVariant(log.action)}
                    >
                      {formatActionName(log.action)}
                    </Badge>
                    <span className="text-slate-200 font-medium">
                      Resource: <span className="text-slate-400">{log.resourceType}</span>{' '}
                      <span className="text-slate-500 font-mono text-[11px]">({log.resourceId})</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 mb-2">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3 h-3 text-slate-500" />
                    Actor: <strong className="text-slate-200 font-mono">{log.actorUserId}</strong>{' '}
                    <Badge size="sm" variant="neutral">
                      {log.actorRole}
                    </Badge>
                  </span>
                  <span>ID: <code className="text-slate-500 font-mono">{log.auditId.slice(0, 16)}</code></span>
                  {log.metadata?.note && (
                    <span className="text-amber-400 italic">
                      Note: {log.metadata.note}
                    </span>
                  )}
                </div>

                {/* State Diffs */}
                {(log.before || log.after) && (
                  <div className="mt-3 p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[10px]">
                    {log.before && (
                      <div>
                        <span className="text-red-400 font-medium block mb-1">BEFORE:</span>
                        <pre className="text-slate-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                          {JSON.stringify(log.before, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.after && (
                      <div>
                        <span className="text-emerald-400 font-medium block mb-1">AFTER:</span>
                        <pre className="text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                          {JSON.stringify(log.after, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
