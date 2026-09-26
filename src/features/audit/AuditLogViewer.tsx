import React, { useState, useEffect, useCallback } from 'react';
import type { AuditLog } from '../../types';
import { auditService } from '../../services/firebase/firestore/auditService';
import { useAuth } from '../auth/AuthContext';
import { AccessDenied } from '../../components/common/AccessDenied';
import { Shield, Clock, FileText, User, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

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

  const actionBadgeColors: Record<string, string> = {
    COMPANY_CREATED: 'bg-[#F5C400]/20 text-[#F5C400] border-[#F5C400]/40',
    EMPLOYEE_CREATED: 'bg-[#2E9B5B]/20 text-[#2E9B5B] border-[#2E9B5B]/40',
    EMPLOYEE_UPDATED: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    EMPLOYEE_STATUS_CHANGED: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    ROLE_CHANGED: 'bg-[#D92D20]/20 text-[#D92D20] border-[#D92D20]/40',
    USER_LOGGED_IN: 'bg-zinc-700 text-zinc-300 border-zinc-600',
    USER_LOGGED_OUT: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    COMPANY_SETTINGS_UPDATED: 'bg-amber-500/20 text-[#F5C400] border-[#F5C400]/40',
    INVITATION_CREATED: 'bg-teal-500/20 text-teal-400 border-teal-500/40',
    INVITATION_REVOKED: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-white flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-[#F5C400]" />
            Compliance & Security Audit Trail
          </h1>
          <p className="text-xs text-[#A0A0A0] mt-1">
            Immutable system activity log recording all security, role modifications, and administrative events
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="px-3 py-2 bg-[#252525] hover:bg-[#303030] text-white text-xs font-semibold rounded cursor-pointer transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#F5C400]' : ''}`} />
          Refresh Audit Trail
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-[#D92D20]/10 border border-[#D92D20]/40 rounded text-xs text-[#D92D20] flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg overflow-hidden shadow-xl">
        <div className="px-4 py-3 bg-[#151515] border-b border-[#2C2C2C] flex items-center justify-between text-xs text-[#A0A0A0]">
          <span className="font-semibold uppercase tracking-wider text-white">
            Company Scope: <code className="text-[#F5C400]">{company?.companyId}</code>
          </span>
          <span>{logs.length} logged events recorded</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-[#A0A0A0] flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 text-[#F5C400] animate-spin" />
            <span className="text-xs uppercase tracking-wider">Loading Audit Entries...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-[#A0A0A0]">
            <FileText className="w-12 h-12 mx-auto text-[#444444] mb-2" />
            <p className="text-xs">No audit events recorded yet for this company.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#252525]">
            {logs.map((log) => (
              <div key={log.auditId} className="p-4 hover:bg-[#202020] transition-colors text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        actionBadgeColors[log.action] || 'bg-zinc-800 text-zinc-300 border-zinc-700'
                      }`}
                    >
                      {log.action}
                    </span>
                    <span className="text-white font-medium">
                      Resource: <strong className="text-[#A0A0A0]">{log.resourceType}</strong> ({log.resourceId})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-[#A0A0A0]">
                    <Clock className="w-3.5 h-3.5 text-[#F5C400]" />
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#777777] mb-2">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-[#A0A0A0]" />
                    Actor: <strong className="text-white font-mono">{log.actorUserId}</strong> ({log.actorRole})
                  </span>
                  <span>ID: <code className="text-[#A0A0A0]">{log.auditId}</code></span>
                  {log.metadata?.note && (
                    <span className="text-[#F5C400] italic">
                      Note: {log.metadata.note}
                    </span>
                  )}
                </div>

                {/* State Diffs */}
                {(log.before || log.after) && (
                  <div className="mt-2 p-2.5 bg-[#111111] rounded border border-[#2A2A2A] grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[10px]">
                    {log.before && (
                      <div>
                        <span className="text-[#D92D20] font-semibold block mb-0.5">BEFORE:</span>
                        <pre className="text-[#A0A0A0] overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(log.before, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.after && (
                      <div>
                        <span className="text-[#2E9B5B] font-semibold block mb-0.5">AFTER:</span>
                        <pre className="text-[#A0A0A0] overflow-x-auto whitespace-pre-wrap">
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
      </div>
    </div>
  );
};
