import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { SiteflowLogo } from '../../components/common/SiteflowLogo';
import { Mail, Lock, UserPlus, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), password);
      // AuthProvider will detect user has no company and route them automatically to OnboardingFlow
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-6 sm:p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <SiteflowLogo size="lg" showTagline />
          <h2 className="text-xl font-bold text-white mt-6 uppercase tracking-tight">
            Register Organization Lead
          </h2>
          <p className="text-xs text-[#A0A0A0] mt-1">
            Create your account to establish a new company or accept an invitation
          </p>
        </div>

        <div className="mb-4 p-3 bg-[#111111] border border-[#2C2C2C] rounded flex items-start gap-2.5 text-xs text-[#A0A0A0]">
          <ShieldCheck className="w-4 h-4 text-[#F5C400] shrink-0 mt-0.5" />
          <span>
            <strong>Zero-Trust Notice:</strong> Public registration establishes user credentials only. Administrative authority requires completing the verified company onboarding flow or receiving an invitation.
          </span>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-[#D92D20]/10 border border-[#D92D20]/40 rounded text-xs text-[#D92D20] flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1.5">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#A0A0A0] absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="lead@company.com"
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded pl-10 pr-3 py-2.5 text-sm text-white placeholder-[#555555] focus:outline-none focus:border-[#F5C400]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1.5">
              Password (min 6 characters)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#A0A0A0] absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded pl-10 pr-3 py-2.5 text-sm text-white placeholder-[#555555] focus:outline-none focus:border-[#F5C400]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#A0A0A0] absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded pl-10 pr-3 py-2.5 text-sm text-white placeholder-[#555555] focus:outline-none focus:border-[#F5C400]"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#F5C400] hover:bg-[#e0b400] text-black font-bold text-sm uppercase tracking-wider rounded transition cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-[#F5C400]/20 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Continue to Onboarding
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-xs text-[#A0A0A0]">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-[#F5C400] font-semibold hover:underline"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};
