import React, { useState, useEffect } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { userService } from '../services/firebase/firestore/userService';
import { storageService } from '../services/storage/storageService';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import {
  User,
  Mail,
  Phone,
  Shield,
  Building,
  Save,
  CheckCircle2,
  AlertCircle,
  Upload,
  Lock,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { userProfile, company, refreshUserData } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.firstName || '');
      setLastName(userProfile.lastName || '');
      setPhone(userProfile.phone || '');
      setPhotoPreview(userProfile.photoUrl || null);
    }
  }, [userProfile]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setError('Only image files (PNG, JPG, WEBP) are supported.');
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    setError(null);
    setSuccess(false);

    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.');
      return;
    }

    setLoading(true);
    try {
      let photoUrl = userProfile.photoUrl;

      if (photoFile && company) {
        photoUrl = await storageService.uploadProfilePhoto(
          company.companyId,
          userProfile.uid,
          photoFile
        );
      }

      await userService.updateSelfProfile(userProfile.uid, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        photoUrl: photoUrl || undefined,
      });

      await refreshUserData();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile changes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Operator Profile"
        description="Manage your verified field worker credentials, personal details, and site verification photo"
        badge={
          <Badge variant="amber" size="sm">
            {userProfile?.role || 'EMPLOYEE'}
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
          <span>Profile updated successfully.</span>
        </div>
      )}

      {/* Immutable Security Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-400" /> Assigned Role
          </span>
          <span className="text-sm font-semibold text-amber-400">
            {userProfile?.role}
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1.5">
            <Building className="w-3.5 h-3.5 text-blue-400" /> Organization Tenant
          </span>
          <span className="text-xs font-semibold text-slate-200 truncate block">
            {company?.name || userProfile?.companyId}
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" /> Account Status
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400 uppercase">
              {userProfile?.status}
            </span>
          </div>
        </Card>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" />
              <span>Personal Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Row */}
            <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-slate-800/80">
              <div className="relative">
                <Avatar
                  name={`${firstName} ${lastName}`}
                  src={photoPreview}
                  size="xl"
                />
              </div>

              <div className="flex-1 text-center sm:text-left">
                <h4 className="text-sm font-medium text-slate-200 mb-1">
                  Field Profile Photo
                </h4>
                <p className="text-xs text-slate-400 mb-3">
                  Upload a clear portrait for site safety verification and digital credentials
                </p>
                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 cursor-pointer transition">
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>Choose Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />

              <Input
                label="Last Name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="email"
                label="Email Address (Auth Controlled)"
                disabled
                leftIcon={<Mail className="w-4 h-4 text-slate-500" />}
                value={userProfile?.email || ''}
              />

              <Input
                type="tel"
                label="Mobile Phone Number"
                leftIcon={<Phone className="w-4 h-4 text-slate-500" />}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (416) 555-0199"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={loading}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Profile Changes
          </Button>
        </div>
      </form>
    </div>
  );
};
