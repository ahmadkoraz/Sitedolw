import React, { useState, useEffect } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { companyService } from '../services/firebase/firestore/companyService';
import { auditService } from '../services/firebase/firestore/auditService';
import { AccessDenied } from '../components/common/AccessDenied';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
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
        after: updates,
      });

      await refreshUserData();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update company settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Organization Settings"
        description="Manage company details, contact channels, regional timezone, and compliance scope"
        badge={
          <Badge variant="amber" size="sm">
            Tenant: {company?.companyId}
          </Badge>
        }
      />

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>Company profile and configuration updated successfully in Firestore.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Core Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Corporate Profile</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Company Display Name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Apex Construction Group"
              />

              <Input
                label="Legal Entity / Incorporation Name"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="e.g. Apex Construction Group Ltd."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="email"
                label="Primary Contact Email"
                required
                leftIcon={<Mail className="w-4 h-4 text-slate-500" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com"
              />

              <Input
                type="tel"
                label="Operations Phone"
                leftIcon={<Phone className="w-4 h-4 text-slate-500" />}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (416) 555-0100"
              />
            </div>

            <Input
              type="url"
              label="Company Logo URL"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/assets/logo.png"
            />
          </CardContent>
        </Card>

        {/* Location & Jurisdiction Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" />
              <span>Location & Regional Jurisdiction</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Street Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 500 Bay Street, Suite 400"
              />

              <Input
                label="City / Municipality"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Toronto"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Province / State"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder="Ontario"
              />

              <Input
                label="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Canada"
              />

              <Input
                label="Postal / Zip Code"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="M5H 2N2"
              />
            </div>

            <Select
              label="Operational Timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              options={[
                { value: 'America/Toronto', label: 'America/Toronto (Eastern Time - Ontario/Quebec)' },
                { value: 'America/Vancouver', label: 'America/Vancouver (Pacific Time - BC)' },
                { value: 'America/Edmonton', label: 'America/Edmonton (Mountain Time - Alberta)' },
                { value: 'America/Winnipeg', label: 'America/Winnipeg (Central Time - Manitoba)' },
                { value: 'America/Halifax', label: 'America/Halifax (Atlantic Time - Nova Scotia)' },
                { value: 'America/St_Johns', label: 'America/St_Johns (Newfoundland)' },
              ]}
            />
          </CardContent>
        </Card>

        {/* Security Invariant Notice */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-start gap-3">
          <Globe className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-200 block mb-0.5">Tenant Security Invariant</span>
            Company ID (<code className="text-amber-400 font-mono">{company?.companyId}</code>) and CreatedBy attributes are permanently authoritative to enforce zero-trust isolation in accordance with SITEFLOW Firestore Security Rules.
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={loading}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Company Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
