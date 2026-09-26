import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Mail, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { resetPassword } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg max-w-md w-full p-6 text-white shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#A0A0A0] hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-2">Reset Password</h3>
        <p className="text-sm text-[#A0A0A0] mb-6">
          Enter your registered email address and we will send instructions to reset your password.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-[#D92D20]/10 border border-[#D92D20]/30 rounded text-xs text-[#D92D20] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-[#2E9B5B] mx-auto mb-3" />
            <h4 className="font-semibold text-white mb-1">Check Your Email</h4>
            <p className="text-xs text-[#A0A0A0] mb-6">
              A password reset link has been dispatched to <strong>{email}</strong>.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-[#F5C400] text-black font-bold text-sm rounded cursor-pointer hover:bg-[#e0b400]"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#A0A0A0] absolute left-3 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@company.com"
                  className="w-full bg-[#111111] border border-[#2C2C2C] rounded pl-10 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#F5C400]"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#F5C400] hover:bg-[#e0b400] text-black font-bold text-sm uppercase tracking-wider rounded transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
