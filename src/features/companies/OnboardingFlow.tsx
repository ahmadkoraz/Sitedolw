import React, { useState, useEffect } from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { db, firebaseStatus } from '../../services/firebase/firebaseApp';
import { useAuth } from '../auth/AuthContext';
import { companyService } from '../../services/firebase/firestore/companyService';
import { userService } from '../../services/firebase/firestore/userService';
import { employeeService } from '../../services/firebase/firestore/employeeService';
import { auditService } from '../../services/firebase/firestore/auditService';
import { invitationService } from '../../services/firebase/firestore/invitationService';
import { SiteflowLogo } from '../../components/common/SiteflowLogo';
import type { Company, UserProfile, Employee, Invitation, AuditLog } from '../../types';
import {
  Building2,
  MapPin,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Briefcase,
  Globe,
  Clock,
  ShieldAlert,
  Ticket,
  Mail,
  LogOut,
  Sparkles,
} from 'lucide-react';

type FlowMode = 'checking' | 'invitation' | 'expired_invitation' | 'no_access' | 'create_company';

export const OnboardingFlow: React.FC = () => {
  const { user, refreshUserData, logout } = useAuth();
  const [mode, setMode] = useState<FlowMode>('checking');
  const [activeInvitation, setActiveInvitation] = useState<Invitation | null>(null);
  const [invitationCompany, setInvitationCompany] = useState<Company | null>(null);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invitation Acceptance Profile Fields
  const [inviteFirstName, setInviteFirstName] = useState(
    user?.displayName ? user.displayName.split(' ')[0] : ''
  );
  const [inviteLastName, setInviteLastName] = useState(
    user?.displayName ? user.displayName.split(' ').slice(1).join(' ') : ''
  );
  const [invitePhone, setInvitePhone] = useState('');

  // Step 1: Create Company
  const [companyName, setCompanyName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [companyEmail, setCompanyEmail] = useState(user?.email || '');

  // Step 2: Company Information (Defaults to Canada / Ontario / America/Toronto)
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('Ontario');
  const [country, setCountry] = useState('Canada');
  const [postalCode, setPostalCode] = useState('');
  const [timezone, setTimezone] = useState('America/Toronto');

  // Step 3: Admin Profile
  const [firstName, setFirstName] = useState(user?.displayName?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(user?.displayName?.split(' ').slice(1).join(' ') || '');
  const [adminPhone, setAdminPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('Director of Field Operations');

  // Initial invitation detection
  useEffect(() => {
    let isMounted = true;

    async function checkInvitations() {
      if (!user?.email) {
        if (isMounted) setMode('no_access');
        return;
      }

      setError(null);
      try {
        // 1. Check URL parameters: ?invite=...&company=...
        const urlParams = new URLSearchParams(window.location.search);
        const urlInvite = urlParams.get('invite');
        const urlCompany = urlParams.get('company');

        if (urlInvite && urlCompany) {
          const inv = await invitationService.getInvitation(urlCompany, urlInvite);
          if (inv && inv.email.toLowerCase() === user.email.toLowerCase()) {
            if (isMounted) {
              setActiveInvitation(inv);
              const comp = await companyService.getCompany(inv.companyId);
              setInvitationCompany(comp);
              const isExpired = inv.expiresAt && new Date(inv.expiresAt) < new Date();
              setMode(isExpired ? 'expired_invitation' : 'invitation');
            }
            return;
          }
        }

        // 2. Query pending invitations matching authenticated email
        const pending = await invitationService.getPendingInvitationsForEmail(user.email);
        if (pending.length > 0) {
          const inv = pending[0];
          if (isMounted) {
            setActiveInvitation(inv);
            const comp = await companyService.getCompany(inv.companyId);
            setInvitationCompany(comp);
            const isExpired = inv.expiresAt && new Date(inv.expiresAt) < new Date();
            setMode(isExpired ? 'expired_invitation' : 'invitation');
          }
          return;
        }

        if (isMounted) {
          setMode('no_access');
        }
      } catch (err) {
        console.warn('[SITEFLOW] Error during invitation lookup:', err);
        if (isMounted) setMode('no_access');
      }
    }

    checkInvitations();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Lookup invitation manually via input
  const handleLookupInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim() || !user) return;
    setError(null);
    setLoading(true);

    try {
      let companyId: string | null = null;
      let invitationId: string | null = null;

      // Check if user pasted a URL
      if (inviteCodeInput.includes('?')) {
        const queryPart = inviteCodeInput.split('?')[1];
        const searchParams = new URLSearchParams(queryPart);
        invitationId = searchParams.get('invite');
        companyId = searchParams.get('company');
      } else {
        const parsed = invitationService.parseInviteCode(inviteCodeInput);
        if (parsed) {
          companyId = parsed.companyId;
          invitationId = parsed.invitationId;
        } else {
          invitationId = inviteCodeInput.trim();
        }
      }

      if (!companyId || !invitationId) {
        // Search pending invitations
        const pending = await invitationService.getPendingInvitationsForEmail(user.email || '');
        const match = pending.find((p) => p.invitationId === invitationId);
        if (match) {
          companyId = match.companyId;
          invitationId = match.invitationId;
        } else {
          throw new Error(
            'Please enter a valid invitation code in the format "company_id:invitation_id" or paste your complete invitation link.'
          );
        }
      }

      const inv = await invitationService.getInvitation(companyId, invitationId);
      if (!inv) {
        throw new Error('Invitation record not found. Please verify the code.');
      }

      if (inv.email.toLowerCase() !== (user.email || '').toLowerCase()) {
        throw new Error(
          `This invitation was issued to ${inv.email}. You are currently signed in as ${user.email}.`
        );
      }

      setActiveInvitation(inv);
      const comp = await companyService.getCompany(inv.companyId);
      setInvitationCompany(comp);

      const isExpired = inv.expiresAt && new Date(inv.expiresAt) < new Date();
      if (isExpired) {
        setMode('expired_invitation');
      } else {
        setMode('invitation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to locate invitation.');
    } finally {
      setLoading(false);
    }
  };

  // Accept invitation and join organization
  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeInvitation) return;
    if (!inviteFirstName.trim() || !inviteLastName.trim()) {
      setError('First and last name are required.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await invitationService.acceptInvitation({
        invitation: activeInvitation,
        user,
        firstName: inviteFirstName.trim(),
        lastName: inviteLastName.trim(),
        phone: invitePhone.trim() || undefined,
      });

      await refreshUserData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation.');
      setLoading(false);
    }
  };

  // Company Creation Flow Steps
  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Company name is required.');
      return;
    }
    if (!companyEmail.trim()) {
      setError('Company contact email is required.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStep(3);
  };

  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required for the primary Super Admin profile.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const timestamp = new Date().toISOString();
      const sanitizedSlug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 16);
      const companyId = `comp_${sanitizedSlug}_${Date.now().toString(36)}`;

      // 1. Create Company Document
      const newCompany: Company = {
        companyId,
        name: companyName.trim(),
        legalName: legalName.trim() || companyName.trim(),
        email: companyEmail.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        province: province.trim() || 'Ontario',
        country: country.trim() || 'Canada',
        postalCode: postalCode.trim() || undefined,
        timezone: timezone.trim() || 'America/Toronto',
        status: 'active',
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: user.uid,
      };
      await companyService.createCompany(newCompany);

      // 2. Create User Profile with SUPER_ADMIN role (Company Creator Only)
      const userProfile: UserProfile = {
        uid: user.uid,
        companyId,
        email: user.email || companyEmail.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: `${firstName.trim()} ${lastName.trim()}`,
        phone: adminPhone.trim() || undefined,
        role: 'SUPER_ADMIN',
        status: 'active',
        createdAt: timestamp,
        updatedAt: timestamp,
        lastLoginAt: timestamp,
      };
      await userService.createUserProfile(userProfile);

      // 3. Create Corresponding Employee Record
      const employeeRecord: Employee = {
        employeeId: `emp_${user.uid.slice(0, 8)}`,
        userId: user.uid,
        companyId,
        employeeNumber: 'EMP-0001',
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: user.email || companyEmail.trim(),
        phone: adminPhone.trim() || undefined,
        role: 'SUPER_ADMIN',
        jobTitle: jobTitle.trim() || 'Managing Director',
        department: 'Executive Operations',
        status: 'active',
        hireDate: new Date().toISOString().split('T')[0],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await employeeService.createEmployee(companyId, employeeRecord);

      // 4. Prepare Audit Log Event for Company Initialization
      const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const auditLogEvent: AuditLog = {
        auditId,
        companyId,
        actorUserId: user.uid,
        actorRole: 'SUPER_ADMIN',
        action: 'COMPANY_CREATED',
        resourceType: 'company',
        resourceId: companyId,
        timestamp,
        metadata: {
          note: 'Company organization established via atomic onboarding flow',
        },
      };

      // 5. Commit Atomically to prevent orphaned or partial records
      if (db && firebaseStatus.isConfigured) {
        const batch = writeBatch(db);
        const compRef = doc(db, 'companies', companyId);
        const userRef = doc(db, 'users', user.uid);
        const empRef = doc(db, 'companies', companyId, 'employees', employeeRecord.employeeId);
        const auditRef = doc(db, 'companies', companyId, 'auditLogs', auditId);

        batch.set(compRef, newCompany);
        batch.set(userRef, userProfile);
        batch.set(empRef, employeeRecord);
        batch.set(auditRef, auditLogEvent);

        await batch.commit();
      } else {
        await companyService.createCompany(newCompany);
        await userService.createUserProfile(userProfile);
        await employeeService.createEmployee(companyId, employeeRecord);
        await auditService.logEvent({
          companyId,
          actorUserId: user.uid,
          actorRole: 'SUPER_ADMIN',
          action: 'COMPANY_CREATED',
          resourceType: 'company',
          resourceId: companyId,
          metadata: {
            note: 'Company organization established via onboarding flow',
          },
        });
      }

      // Move to Step 4 Confirmation
      setStep(4);
    } catch (err) {
      console.error('Onboarding error:', err);
      setError(err instanceof Error ? err.message : 'Failed to finalize company onboarding.');
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchDashboard = async () => {
    setLoading(true);
    await refreshUserData();
    setLoading(false);
  };

  // 1. Initial Checking Loading Screen
  if (mode === 'checking') {
    return (
      <div className="min-h-screen bg-[#111111] text-white flex flex-col items-center justify-center p-4">
        <SiteflowLogo size="lg" showTagline />
        <div className="mt-8 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A0A0A0]">
          <Loader2 className="w-4 h-4 text-[#F5C400] animate-spin" />
          <span>Verifying Organization Access & Invitations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col justify-between p-4 sm:p-8">
      {/* Top Header */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between border-b border-[#2C2C2C] pb-4">
        <SiteflowLogo size="md" showTagline />
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#A0A0A0]">
            Signed in: <strong className="text-white">{user?.email}</strong>
          </span>
          <button
            onClick={logout}
            className="text-xs text-[#D92D20] hover:underline cursor-pointer flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-2xl mx-auto w-full my-8">
        {error && (
          <div className="mb-6 p-4 bg-[#D92D20]/10 border border-[#D92D20]/40 rounded text-xs text-[#D92D20] flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* VIEW A: ACCEPT INVITATION */}
        {mode === 'invitation' && activeInvitation && (
          <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded bg-[#2E9B5B]/10 border border-[#2E9B5B]/30 flex items-center justify-center text-[#2E9B5B]">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white uppercase tracking-tight">
                  Team Invitation Detected
                </h2>
                <p className="text-xs text-[#A0A0A0]">
                  You have been invited to join an active SITEFLOW organization
                </p>
              </div>
            </div>

            {/* Invitation Details Summary Card */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-4 mb-6 space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-[#222222]">
                <span className="text-[#888888] uppercase tracking-wider font-semibold">
                  Organization
                </span>
                <span className="text-white font-bold text-sm">
                  {invitationCompany?.name || activeInvitation.companyId}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#222222]">
                <span className="text-[#888888] uppercase tracking-wider font-semibold">
                  Authorized Role
                </span>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  {activeInvitation.role}
                </span>
              </div>
              {activeInvitation.jobTitle && (
                <div className="flex justify-between items-center py-1 border-b border-[#222222]">
                  <span className="text-[#888888] uppercase tracking-wider font-semibold">
                    Position Title
                  </span>
                  <span className="text-white font-medium">{activeInvitation.jobTitle}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-1">
                <span className="text-[#888888] uppercase tracking-wider font-semibold">
                  Invited Email
                </span>
                <span className="text-[#F5C400] font-mono">{activeInvitation.email}</span>
              </div>
            </div>

            <form onSubmit={handleAcceptInvitation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                    First Name <span className="text-[#F5C400]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteFirstName}
                    onChange={(e) => setInviteFirstName(e.target.value)}
                    placeholder="Jane"
                    className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#F5C400]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                    Last Name <span className="text-[#F5C400]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteLastName}
                    onChange={(e) => setInviteLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#F5C400]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#F5C400]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#2E9B5B] hover:bg-[#27824c] text-white font-bold text-sm uppercase tracking-wider rounded transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#2E9B5B]/20 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Accept Invitation & Join Team
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-4 pt-4 border-t border-[#252525] flex justify-between text-xs text-[#777777]">
              <button
                type="button"
                onClick={() => setMode('no_access')}
                className="hover:text-white transition"
              >
                &larr; Different Invitation / Setup Options
              </button>
              <button
                type="button"
                onClick={() => setMode('create_company')}
                className="hover:text-[#F5C400] transition"
              >
                Create New Company Instead &rarr;
              </button>
            </div>
          </div>
        )}

        {/* VIEW B: EXPIRED INVITATION */}
        {mode === 'expired_invitation' && activeInvitation && (
          <div className="bg-[#1C1C1C] border border-[#D92D20]/40 rounded-lg p-6 sm:p-8 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-[#D92D20]/10 border border-[#D92D20]/30 flex items-center justify-center text-[#D92D20] mx-auto mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-2">
              Invitation Expired
            </h2>
            <p className="text-xs text-[#A0A0A0] max-w-md mx-auto mb-6">
              Your invitation to join{' '}
              <strong>{invitationCompany?.name || activeInvitation.companyId}</strong> as{' '}
              <strong>{activeInvitation.role}</strong> has expired. For security reasons, invitations
              are valid for 7 days.
            </p>

            <div className="bg-[#141414] border border-[#252525] rounded p-4 max-w-sm mx-auto text-left text-xs space-y-1 mb-6 font-mono text-[#888888]">
              <div>Issued to: {activeInvitation.email}</div>
              <div>
                Expired at:{' '}
                {activeInvitation.expiresAt
                  ? new Date(activeInvitation.expiresAt).toLocaleDateString()
                  : 'N/A'}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => setMode('no_access')}
                className="px-4 py-2.5 bg-[#252525] hover:bg-[#303030] text-white text-xs font-semibold rounded cursor-pointer"
              >
                Enter Another Code
              </button>
              <button
                type="button"
                onClick={() => setMode('create_company')}
                className="px-4 py-2.5 bg-[#F5C400] hover:bg-[#e0b400] text-black text-xs font-bold uppercase tracking-wider rounded cursor-pointer"
              >
                Register New Company
              </button>
            </div>
          </div>
        )}

        {/* VIEW C: NO ACCESS GATE (UNINVITED USER / CONTROLLED SETUP) */}
        {mode === 'no_access' && (
          <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded bg-[#F5C400]/10 border border-[#F5C400]/30 flex items-center justify-center text-[#F5C400]">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white uppercase tracking-tight">
                  No Organization Access
                </h2>
                <p className="text-xs text-[#A0A0A0]">
                  Your account is authenticated, but not yet linked to an active SITEFLOW tenant
                </p>
              </div>
            </div>

            <div className="p-4 bg-[#141414] border border-[#252525] rounded-lg mb-6 text-xs text-[#A0A0A0] space-y-2">
              <p>
                Under SITEFLOW&apos;s zero-trust security architecture, Google Authentication verifies identity only.
                Privileges and workspace access require an active invitation or verified company establishment.
              </p>
              <div className="font-mono text-[11px] text-[#707070]">
                Authenticated User: <span className="text-white">{user?.email}</span> (UID: {user?.uid})
              </div>
            </div>

            {/* Path 1: Enter Invitation Code */}
            <div className="border border-[#2C2C2C] rounded-lg p-4 bg-[#181818] mb-6">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-white">
                <Ticket className="w-4 h-4 text-[#F5C400]" />
                <span>Join with an Invitation Code or Link</span>
              </div>
              <p className="text-xs text-[#888888] mb-3">
                If your supervisor or administrator invited you, paste the invitation link or enter the code:
              </p>

              <form onSubmit={handleLookupInvite} className="flex gap-2">
                <input
                  type="text"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value)}
                  placeholder="comp_xxx:inv_xxx or paste invite link"
                  className="flex-1 bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-xs text-white placeholder-[#555555] focus:outline-none focus:border-[#F5C400]"
                />
                <button
                  type="submit"
                  disabled={loading || !inviteCodeInput.trim()}
                  className="px-4 py-2 bg-[#F5C400] hover:bg-[#e0b400] text-black font-bold text-xs uppercase tracking-wider rounded cursor-pointer disabled:opacity-40 transition"
                >
                  Verify
                </button>
              </form>
            </div>

            {/* Path 2: Organization Owner New Company Setup */}
            <div className="border border-[#2C2C2C] rounded-lg p-4 bg-[#181818]">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-white">
                <Building2 className="w-4 h-4 text-[#2E9B5B]" />
                <span>Establish a New Organization</span>
              </div>
              <p className="text-xs text-[#888888] mb-4">
                Are you an authorized company executive, contractor, or business owner creating a new SITEFLOW workspace?
              </p>

              <button
                type="button"
                onClick={() => setMode('create_company')}
                className="w-full py-2.5 bg-[#252525] hover:bg-[#303030] border border-[#3C3C3C] text-white text-xs font-bold uppercase tracking-wider rounded transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Launch Company Creation Wizard</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#F5C400]" />
              </button>
            </div>
          </div>
        )}

        {/* VIEW D: EXPLICIT 4-STEP COMPANY CREATION FLOW */}
        {mode === 'create_company' && (
          <div>
            {/* Progress Tracker */}
            <div className="mb-8">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-3">
                <span className={step >= 1 ? 'text-[#F5C400]' : ''}>1. Company</span>
                <span className={step >= 2 ? 'text-[#F5C400]' : ''}>2. Location</span>
                <span className={step >= 3 ? 'text-[#F5C400]' : ''}>3. Admin</span>
                <span className={step >= 4 ? 'text-[#F5C400]' : ''}>4. Complete</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 rounded-full transition-all ${
                      step >= s ? 'bg-[#F5C400]' : 'bg-[#252525]'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* STEP 1: CREATE COMPANY */}
            {step === 1 && (
              <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-6 sm:p-8 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded bg-[#F5C400]/10 border border-[#F5C400]/30 flex items-center justify-center text-[#F5C400]">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">
                      Step 1: Create Company
                    </h2>
                    <p className="text-xs text-[#A0A0A0]">
                      Establish your organization identity on the SITEFLOW platform
                    </p>
                  </div>
                </div>

                <form onSubmit={handleNextStep1} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                      Company Name <span className="text-[#F5C400]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Apex Construction & Restoration Ltd."
                      className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#F5C400]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                      Legal Business Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                      placeholder="Apex Structural Corp Inc."
                      className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#F5C400]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                      Primary Contact Email <span className="text-[#F5C400]">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#F5C400]"
                    />
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setMode('no_access')}
                      className="text-xs text-[#888888] hover:text-white transition"
                    >
                      &larr; Back to Access Gate
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-[#F5C400] hover:bg-[#e0b400] text-black font-bold text-xs uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-2 shadow-md shadow-[#F5C400]/20"
                    >
                      Continue to Location
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 2: COMPANY LOCATION */}
            {step === 2 && (
              <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-6 sm:p-8 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded bg-[#F5C400]/10 border border-[#F5C400]/30 flex items-center justify-center text-[#F5C400]">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">
                      Step 2: Operations Base
                    </h2>
                    <p className="text-xs text-[#A0A0A0]">
                      Primary headquarters location and regional compliance settings
                    </p>
                  </div>
                </div>

                <form onSubmit={handleNextStep2} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                      Headquarters Address
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="100 King Street West, Suite 400"
                      className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#F5C400]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                        City
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Toronto"
                        className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#F5C400]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                        Province / State
                      </label>
                      <input
                        type="text"
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        placeholder="Ontario"
                        className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#F5C400]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                        Country
                      </label>
                      <input
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#F5C400]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="M5X 1A9"
                        className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#F5C400]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                        Timezone
                      </label>
                      <input
                        type="text"
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        placeholder="America/Toronto"
                        className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#F5C400]"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-2 bg-[#252525] hover:bg-[#303030] text-white text-xs font-semibold rounded cursor-pointer flex items-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-[#F5C400] hover:bg-[#e0b400] text-black font-bold text-xs uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-2 shadow-md shadow-[#F5C400]/20"
                    >
                      Continue to Admin Profile
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 3: ADMIN PROFILE */}
            {step === 3 && (
              <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-6 sm:p-8 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded bg-[#F5C400]/10 border border-[#F5C400]/30 flex items-center justify-center text-[#F5C400]">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">
                      Step 3: Executive Lead Profile
                    </h2>
                    <p className="text-xs text-[#A0A0A0]">
                      This identity will be designated as the founding SUPER_ADMIN
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCompleteSetup} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                        First Name <span className="text-[#F5C400]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Ahmad"
                        className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#F5C400]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                        Last Name <span className="text-[#F5C400]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Kuraz"
                        className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#F5C400]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                        Direct Phone
                      </label>
                      <input
                        type="tel"
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                        placeholder="+1 (416) 555-0199"
                        className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#F5C400]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                        Job Title
                      </label>
                      <input
                        type="text"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder="Director of Operations / Owner"
                        className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#F5C400]"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 py-2 bg-[#252525] hover:bg-[#303030] text-white text-xs font-semibold rounded cursor-pointer flex items-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2.5 bg-[#F5C400] hover:bg-[#e0b400] text-black font-bold text-xs uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-2 shadow-md shadow-[#F5C400]/20 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Provisioning...
                        </>
                      ) : (
                        <>
                          Complete Setup
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 4: COMPLETE */}
            {step === 4 && (
              <div className="bg-[#1C1C1C] border border-[#2E9B5B]/40 rounded-lg p-8 sm:p-10 text-center shadow-2xl">
                <div className="w-16 h-16 rounded-full bg-[#2E9B5B]/10 border border-[#2E9B5B]/30 flex items-center justify-center text-[#2E9B5B] mx-auto mb-5">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-2">
                  Organization Established
                </h2>
                <p className="text-sm text-[#A0A0A0] max-w-md mx-auto mb-6">
                  Your company <strong>{companyName}</strong> has been provisioned. You have been
                  registered as <strong>SUPER_ADMIN</strong>.
                </p>

                <div className="bg-[#111111] border border-[#2C2C2C] rounded p-4 max-w-sm mx-auto text-left text-xs space-y-1.5 mb-8">
                  <div className="flex justify-between">
                    <span className="text-[#A0A0A0]">Company:</span>
                    <span className="font-semibold text-white">{companyName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A0A0A0]">Location:</span>
                    <span className="font-semibold text-white">
                      {city ? `${city}, ` : ''}
                      {province}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A0A0A0]">Owner:</span>
                    <span className="font-semibold text-white">
                      {firstName} {lastName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A0A0A0]">Role Assigned:</span>
                    <span className="font-bold text-[#F5C400]">SUPER_ADMIN</span>
                  </div>
                </div>

                <button
                  onClick={handleLaunchDashboard}
                  disabled={loading}
                  className="px-8 py-3.5 bg-[#F5C400] hover:bg-[#e0b400] text-black font-bold text-sm uppercase tracking-wider rounded transition cursor-pointer shadow-lg shadow-[#F5C400]/20 inline-flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Enter SITEFLOW Dashboard
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Footer */}
      <div className="text-center text-[11px] text-[#666666] uppercase tracking-wider py-4">
        SITEFLOW Foundation Build 01 &bull; Multi-Tenant Isolation Enforced
      </div>
    </div>
  );
};
