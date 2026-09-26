import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { SiteflowLogo } from '../../components/common/SiteflowLogo';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { firebaseStatus } from '../../services/firebase/firebaseApp';
import { Mail, Lock, LogIn, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [isPopupBlocked, setIsPopupBlocked] = useState(false);

  const { login, loginWithGoogle, loginWithGoogleRedirect } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPopupBlocked(false);
    setLoading(true);

    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid login credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsPopupBlocked(false);
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign in failed.';
      setError(msg);
      if (
        msg.includes('popup was blocked') ||
        msg.includes('popup-blocked') ||
        msg.includes('browser security')
      ) {
        setIsPopupBlocked(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRedirect = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogleRedirect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google redirect sign-in failed.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-6 sm:p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <SiteflowLogo size="lg" showTagline />
          <h2 className="text-xl font-bold text-white mt-6 uppercase tracking-tight">
            Field Operations Portal
          </h2>
          <p className="text-xs text-[#A0A0A0] mt-1">
            Sign in to access your projects, workforce, and job sites
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-[#D92D20]/10 border border-[#D92D20]/40 rounded text-xs text-[#D92D20] space-y-2">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            {isPopupBlocked && (
              <button
                type="button"
                onClick={handleGoogleRedirect}
                disabled={loading}
                className="w-full mt-2 py-1.5 px-3 bg-[#4285F4] hover:bg-[#3367D6] text-white font-medium text-xs rounded transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Continue via Google Redirect (Full Page)</span>
              </button>
            )}
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
                placeholder="name@company.com"
                className="w-full bg-[#111111] border border-[#2C2C2C] rounded pl-10 pr-3 py-2.5 text-sm text-white placeholder-[#555555] focus:outline-none focus:border-[#F5C400]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0]">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs text-[#F5C400] hover:underline"
              >
                Forgot password?
              </button>
            </div>
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
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </div>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#2C2C2C]" />
          </div>
          <span className="relative bg-[#1C1C1C] px-3 text-xs text-[#A0A0A0] uppercase tracking-wider">
            Or continue with
          </span>
        </div>

        {/* Google Authentication: Real Firebase UID Authentication */}
        <div>
          <button
            type="button"
            onClick={() => handleGoogleSignIn()}
            disabled={loading}
            className="w-full py-3 bg-[#111111] hover:bg-[#252525] border border-[#2C2C2C] hover:border-[#4285F4]/60 text-white text-xs font-semibold rounded transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 shadow-sm"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google Account</span>
          </button>
        </div>

        {/* Offline Sandbox Notice (Only shown if Firebase is completely unconfigured) */}
        {!firebaseStatus.isConfigured && (
          <div className="mt-4 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded text-[11px] text-amber-400 text-center font-mono">
            Sandbox Simulation Active (Firebase credentials not detected)
          </div>
        )}

        <div className="mt-6 text-center text-xs text-[#A0A0A0]">
          Starting a new company setup?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-[#F5C400] font-semibold hover:underline"
          >
            Create Company Account
          </button>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        initialEmail={email}
      />
    </div>
  );
};
