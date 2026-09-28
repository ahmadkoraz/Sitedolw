import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { SiteflowLogo } from '../../components/common/SiteflowLogo';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Mail, Lock, UserPlus, AlertCircle, ShieldCheck } from 'lucide-react';

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      <Card className="p-7 sm:p-9 shadow-2xl border-slate-800 bg-[#0F131C]">
        <div className="mb-7 flex flex-col items-center text-center">
          <SiteflowLogo size="lg" showTagline />
          <h2 className="text-xl font-bold text-slate-100 mt-6 tracking-tight">
            Register Organization Lead
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Create your account to establish a new company or accept an invitation
          </p>
        </div>

        <div className="mb-4 p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-start gap-2.5 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-200">Zero-Trust Security:</strong> Initial registration secures user credentials. Administrative privileges are granted upon company onboarding or verified invitation.
          </span>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            label="Work Email"
            required
            leftIcon={<Mail className="w-4 h-4 text-slate-500" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="lead@company.com"
          />

          <Input
            type="password"
            label="Password (min 6 characters)"
            required
            leftIcon={<Lock className="w-4 h-4 text-slate-500" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <Input
            type="password"
            label="Confirm Password"
            required
            leftIcon={<Lock className="w-4 h-4 text-slate-500" />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full"
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              Register & Continue
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-amber-400 font-semibold hover:text-amber-300 hover:underline transition cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </Card>
    </div>
  );
};
