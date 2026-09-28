import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reset Password"
      description="Enter your registered work email to receive password recovery instructions"
      maxWidth="md"
    >
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success ? (
        <div className="text-center py-4 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h4 className="font-semibold text-slate-100">Recovery Email Dispatched</h4>
          <p className="text-xs text-slate-400">
            A secure password reset link has been dispatched to <strong className="text-slate-200">{email}</strong>.
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={onClose}
            >
              Back to Login
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            label="Work Email Address"
            required
            leftIcon={<Mail className="w-4 h-4 text-slate-500" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operator@company.com"
          />

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={loading}
            >
              Send Reset Link
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
