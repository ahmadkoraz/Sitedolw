import React, { useState, useEffect } from 'react';
import type { Invitation, UserRole } from '../../types';
import { invitationService } from '../../services/firebase/firestore/invitationService';
import { auditService } from '../../services/firebase/firestore/auditService';
import { useAuth } from '../auth/AuthContext';
import { Mail, Shield, UserPlus, X, Copy, Check, AlertCircle, Loader2, Clock } from 'lucide-react';

interface InvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
}

export const InvitationModal: React.FC<InvitationModalProps> = ({ isOpen, onClose, companyId }) => {
  const { user, userProfile, isSuperAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('EMPLOYEE');
  const [jobTitle, setJobTitle] = useState('');
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const list = await invitationService.getInvitations(companyId);
      setInvitations(list);
    } catch (err) {
      console.error('Failed to load invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInvitations();
    }
  }, [isOpen, companyId]);

  if (!isOpen) return null;

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;
    setError(null);

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please provide a valid email address.');
      return;
    }

    if (role === 'SUPER_ADMIN' && !isSuperAdmin) {
      setError('Only a SUPER_ADMIN can invite new SUPER_ADMIN users.');
      return;
    }

    setInviting(true);
    try {
      const invite = await invitationService.createInvitation({
        companyId,
        email: email.trim(),
        role,
        jobTitle: jobTitle.trim() || undefined,
        invitedBy: user.uid,
      });

      await auditService.logEvent({
        companyId,
        actorUserId: user.uid,
        actorRole: userProfile.role,
        action: 'INVITATION_CREATED',
        resourceType: 'invitation',
        resourceId: invite.invitationId,
        metadata: { recipientEmail: email, role },
      });

      setEmail('');
      setJobTitle('');
      await fetchInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate invitation.');
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    if (!user || !userProfile) return;
    try {
      await invitationService.revokeInvitation(companyId, invitationId);
      await auditService.logEvent({
        companyId,
        actorUserId: user.uid,
        actorRole: userProfile.role,
        action: 'INVITATION_REVOKED',
        resourceType: 'invitation',
        resourceId: invitationId,
      });
      await fetchInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invitation.');
    }
  };

  const handleCopyLink = (invitationId: string) => {
    const link = `${window.location.origin}?invite=${invitationId}&company=${companyId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(invitationId);
    setTimeout(() => setCopiedId(null), 2500);
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

        <h3 className="text-xl font-bold uppercase tracking-tight mb-1 text-white flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-[#F5C400]" />
          Team Invitations & Access Codes
        </h3>
        <p className="text-xs text-[#A0A0A0] mb-5">
          Generate pre-authorized role invitations for site supervisors, PMs, and field crews
        </p>

        {error && (
          <div className="mb-4 p-3 bg-[#D92D20]/10 border border-[#D92D20]/40 rounded text-xs text-[#D92D20] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Generate Invitation Form */}
        <form onSubmit={handleCreateInvite} className="p-4 bg-[#111111] rounded border border-[#2C2C2C] space-y-3 mb-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">Create New Invitation</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold uppercase text-[#A0A0A0] mb-1">
                Recipient Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="crewmember@siteflow.dev"
                className="w-full bg-[#1C1C1C] border border-[#333333] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-[#A0A0A0] mb-1">
                Assigned Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full bg-[#1C1C1C] border border-[#333333] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F5C400]"
              >
                <option value="EMPLOYEE">EMPLOYEE</option>
                <option value="SUPERVISOR">SUPERVISOR</option>
                <option value="PROJECT_MANAGER">PROJECT_MANAGER</option>
                <option value="HR">HR</option>
                <option value="ACCOUNTING">ACCOUNTING</option>
                <option value="ADMIN">ADMIN</option>
                {isSuperAdmin && <option value="SUPER_ADMIN">SUPER_ADMIN</option>}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Designated Job Title (Optional, e.g. Concrete Finisher)"
              className="bg-[#1C1C1C] border border-[#333333] rounded px-3 py-1.5 text-xs text-white w-2/3 focus:outline-none focus:border-[#F5C400]"
            />

            <button
              type="submit"
              disabled={inviting}
              className="px-4 py-2 bg-[#F5C400] hover:bg-[#e0b400] text-black text-xs font-bold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              Generate Invite
            </button>
          </div>
        </form>

        {/* Existing Invitations List */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#A0A0A0] mb-2 flex items-center justify-between">
            <span>Pending & Active Invitations</span>
            <span className="font-mono text-white text-[11px]">{invitations.length} total</span>
          </h4>

          {loading ? (
            <div className="py-8 text-center text-xs text-[#A0A0A0] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#F5C400]" />
              Loading invitations...
            </div>
          ) : invitations.length === 0 ? (
            <div className="py-8 text-center bg-[#111111] rounded border border-[#2C2C2C] text-xs text-[#777777]">
              No pending invitations for this company.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {invitations.map((inv) => (
                <div
                  key={inv.invitationId}
                  className="p-3 bg-[#111111] rounded border border-[#2C2C2C] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white truncate">{inv.email}</span>
                      <span className="px-1.5 py-0.5 bg-[#252525] text-[#F5C400] font-mono text-[10px] rounded border border-[#3C3C3C]">
                        {inv.role}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          inv.status === 'pending'
                            ? 'bg-amber-500/10 text-[#F5C400]'
                            : inv.status === 'accepted'
                            ? 'bg-[#2E9B5B]/15 text-[#2E9B5B]'
                            : 'bg-zinc-700 text-[#A0A0A0]'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#777777] flex items-center gap-2 mt-1">
                      <span>ID: <code className="text-[#A0A0A0]">{inv.invitationId}</code></span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleCopyLink(inv.invitationId)}
                      title="Copy Activation Link"
                      className="px-2 py-1 bg-[#252525] hover:bg-[#303030] text-white rounded text-[11px] flex items-center gap-1 cursor-pointer transition"
                    >
                      {copiedId === inv.invitationId ? (
                        <>
                          <Check className="w-3 h-3 text-[#2E9B5B]" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy Link
                        </>
                      )}
                    </button>

                    {inv.status === 'pending' && (
                      <button
                        onClick={() => handleRevoke(inv.invitationId)}
                        className="px-2 py-1 bg-[#D92D20]/15 hover:bg-[#D92D20]/25 text-[#D92D20] rounded text-[11px] cursor-pointer"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-[#2C2C2C] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#252525] hover:bg-[#303030] text-xs font-semibold text-white rounded cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
