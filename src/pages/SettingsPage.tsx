import React, { useState, useEffect } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { companyService } from '../services/firebase/firestore/companyService';
import { auditService } from '../services/firebase/firestore/auditService';
import { AccessDenied } from '../components/common/AccessDenied';
import {
  Building2,
  MapPin,
  Clock,
  Phone,
  Mail,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Globe,
  Shield,
} from 'lucide-react';

interface SettingsPageProps {
  onBackToDashboard: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onBackToDashboard }) => {
  const { user, userProfile, company, isAdmin, refreshUserData } = useAuth();

  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('Ontario');
  const [country, setCountry] = useState('Canada');
  const [postalCode, setPostalCode] = useState('');
  const [timezone, setTimezone] = useState('America/Toronto');
  const [logoUrl, setLogoUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (company) {
      setName(company.name || '');
      setLegalName(company.legalName || '');
      setEmail(company.email || '');
      setPhone(company.phone || '');
      setAddress(company.address || '');
      setCity(company.city || '');
      setProvince(company.province || 'Ontario');
      setCountry(company.country || 'Canada');
      setPostalCode(company.postalCode || '');
      setTimezone(company.timezone || 'America/Toronto');
      setLogoUrl(company.logoUrl || '');
    }
  }, [company]);

  if (!isAdmin) {
    return <AccessDenied onBack={onBackToDashboard} requiredRole="ADMIN or SUPER_ADMIN" />;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !user || !userProfile) return;

    setError(null);
    setSuccess(false);

    if (!name.trim()) {
      setError('Company name is required.');
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('A valid primary company email is required.');
      return;
    }

    setLoading(true);
    try {
      const updates = {
        name: name.trim(),
        legalName: legalName.trim() || undefined,
        email: email.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        province: province.trim(),
        country: country.trim(),
        postalCode: postalCode.trim() || undefined,
        timezone: timezone.trim(),
        logoUrl: logoUrl.trim() || undefined,
      };

      await companyService.updateCompany(company.companyId, updates);

      await auditService.logEvent({
        companyId: company.companyId,
        actorUserId: user.uid,
        actorRole: userProfile.role,
        action: 'COMPANY_SETTINGS_UPDATED',
        resourceType: 'company',
        resourceId: company.companyId,
        before: { name: company.name, email: company.email },
        after: { name: updates.name, email: updates.email },
      });

      await refreshUserData();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update company settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-tight text-white flex items-center gap-2.5">
          <Building2 className="w-6 h-6 text-[#F5C400]" />
          Company Tenant Configuration
        </h1>
        <p className="text-xs text-[#A0A0A0] mt-1">
          Update verified organizational legalities, regional province, and contact parameters
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-[#D92D20]/10 border border-[#D92D20]/40 rounded text-xs text-[#D92D20] flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 bg-[#2E9B5B]/15 border border-[#2E9B5B]/40 rounded text-xs text-[#2E9B5B] flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Company settings saved to Firestore successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Core Company Identity */}
        <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white pb-3 border-b border-[#2C2C2C] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#F5C400]" />
            Corporate Profile
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                Company Display Name <span className="text-[#F5C400]">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                Legal Entity / Incorporation Name
              </label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#F5C400]" /> Primary Contact Email <span className="text-[#F5C400]">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#F5C400]" /> Operations Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
              Company Logo URL
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/assets/logo.png"
              className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#F5C400]"
            />
          </div>
        </div>

        {/* Location & Jurisdiction */}
        <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white pb-3 border-b border-[#2C2C2C] flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#F5C400]" />
            Location & Regional Jurisdiction
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                Street Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                City / Municipality
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                Province
              </label>
              <input
                type="text"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                Postal Code
              </label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#F5C400]" /> Operational Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
            >
              <option value="America/Toronto">America/Toronto (Eastern Time - Ontario/Quebec)</option>
              <option value="America/Vancouver">America/Vancouver (Pacific Time - BC)</option>
              <option value="America/Edmonton">America/Edmonton (Mountain Time - Alberta)</option>
              <option value="America/Winnipeg">America/Winnipeg (Central Time - Manitoba)</option>
              <option value="America/Halifax">America/Halifax (Atlantic Time - Nova Scotia)</option>
              <option value="America/St_Johns">America/St_Johns (Newfoundland)</option>
            </select>
          </div>
        </div>

        {/* Tenant Immutability Notice */}
        <div className="p-4 bg-[#141414] border border-[#2C2C2C] rounded-lg text-xs text-[#A0A0A0] flex items-start gap-3">
          <Globe className="w-4 h-4 text-[#F5C400] shrink-0 mt-0.5" />
          <div>
            <strong className="text-white block mb-0.5">Tenant Security Invariant</strong>
            Company ID (<code className="text-[#F5C400]">{company?.companyId}</code>) and CreatedBy attributes are permanently immutable to enforce zero-trust isolation in accordance with SITEFLOW Firestore Security Rules.
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-[#F5C400] hover:bg-[#e0b400] text-black text-xs font-bold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-2 shadow-md shadow-[#F5C400]/20 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Company Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
