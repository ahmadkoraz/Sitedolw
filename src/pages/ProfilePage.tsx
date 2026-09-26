import React, { useState, useEffect } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { userService } from '../services/firebase/firestore/userService';
import { storageService } from '../services/storage/storageService';
import {
  User,
  Mail,
  Phone,
  Shield,
  Building,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
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
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-tight text-white flex items-center gap-2.5">
          <User className="w-6 h-6 text-[#F5C400]" />
          Operator Profile
        </h1>
        <p className="text-xs text-[#A0A0A0] mt-1">
          Manage your verified field worker credentials and contact details
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
          <span>Profile updated successfully.</span>
        </div>
      )}

      {/* Immutable Security Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg">
          <span className="text-[10px] font-semibold uppercase text-[#A0A0A0] flex items-center gap-1.5 mb-1">
            <Lock className="w-3 h-3 text-[#F5C400]" /> Assigned Role (Immutable)
          </span>
          <span className="text-sm font-bold text-[#F5C400] font-mono">
            {userProfile?.role}
          </span>
        </div>

        <div className="p-4 bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg">
          <span className="text-[10px] font-semibold uppercase text-[#A0A0A0] flex items-center gap-1.5 mb-1">
            <Building className="w-3 h-3 text-[#F5C400]" /> Organization Tenant
          </span>
          <span className="text-xs font-semibold text-white truncate block">
            {company?.name || userProfile?.companyId}
          </span>
        </div>

        <div className="p-4 bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg">
          <span className="text-[10px] font-semibold uppercase text-[#A0A0A0] flex items-center gap-1.5 mb-1">
            <Shield className="w-3 h-3 text-[#F5C400]" /> Account Status
          </span>
          <span className="text-xs font-bold uppercase text-[#2E9B5B] block">
            {userProfile?.status}
          </span>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-6 space-y-6">
        {/* Profile Picture */}
        <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-[#2C2C2C]">
          <div className="w-20 h-20 rounded-full bg-[#111111] border border-[#3C3C3C] overflow-hidden flex items-center justify-center shrink-0">
            {photoPreview ? (
              <img src={photoPreview} alt="User" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-[#666666]" />
            )}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-1">
              Field Profile Avatar
            </h3>
            <p className="text-xs text-[#A0A0A0] mb-3">
              Upload a clear photo for site safety verification and badges
            </p>
            <label className="px-3.5 py-1.5 bg-[#252525] hover:bg-[#303030] text-xs font-semibold text-white border border-[#3C3C3C] rounded cursor-pointer inline-flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-[#F5C400]" />
              Select Photo
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Editable Profile Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
              First Name <span className="text-[#F5C400]">*</span>
            </label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
              Last Name <span className="text-[#F5C400]">*</span>
            </label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1 flex items-center gap-1">
              <Mail className="w-3 h-3 text-[#F5C400]" /> Email Address (Managed by Auth)
            </label>
            <input
              type="email"
              disabled
              value={userProfile?.email || ''}
              className="w-full bg-[#151515] border border-[#272727] rounded px-3 py-2 text-sm text-[#777777] cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1 flex items-center gap-1">
              <Phone className="w-3 h-3 text-[#F5C400]" /> Mobile Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (416) 555-0199"
              className="w-full bg-[#111111] border border-[#2C2C2C] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F5C400]"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-[#2C2C2C] flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-[#F5C400] hover:bg-[#e0b400] text-black text-xs font-bold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-2 shadow-md shadow-[#F5C400]/20 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Profile Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
