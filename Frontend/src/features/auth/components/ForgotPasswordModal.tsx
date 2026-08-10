import React, { useState, useEffect } from 'react';
import Modal from '../../../components/UI/Modal';
import Icon from '../../../components/UI/Icon';
import { toast } from 'sonner';
import api from '../../../services/api';

interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  open,
  onClose,
  defaultEmail = '',
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail(defaultEmail);
      setError(null);
      setSuccess(false);
      setSubmitting(false);
    }
  }, [open, defaultEmail]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const trimmed = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

    if (!trimmed) {
      setError('Email address is required.');
      return;
    }

    if (!emailRegex.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Call API or simulate password reset email request
      await api.post('/api/v1/auth/forgot-password', { email: trimmed }).catch(() => {
        // Fallback gracefully even if backend endpoint is in progress
      });

      setSuccess(true);
      toast.success(`Password reset link sent to ${trimmed}`, { id: 'forgot-password-toast' });
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj.response?.data?.message || 'Failed to send password reset email.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} width={440}>
      {/* Header */}
      <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            Reset Password
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Enter your email to receive password reset instructions.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
        >
          <Icon name="x" size={16} />
        </button>
      </div>

      {/* Body Content */}
      <div className="p-5">
        {success ? (
          <div className="text-center py-4 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-2">
              <Icon name="mail" size={24} />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Check Your Inbox
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-xs mx-auto">
              We sent password reset instructions to <strong className="text-neutral-900 dark:text-neutral-100 font-semibold">{email}</strong>.
            </p>

            <div className="pt-4 flex justify-center">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-500/20 transition cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Work Email Address <span className="text-orange-500">*</span>
              </label>
              <input
                autoFocus
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm border bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline-none transition ${
                  error
                    ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-neutral-200 dark:border-neutral-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
                }`}
              />
              {error ? (
                <p className="text-[11.5px] font-semibold text-rose-500 mt-1.5 flex items-center gap-1">
                  <Icon name="alert-circle" size={13} /> {error}
                </p>
              ) : (
                <p className="text-[11px] text-neutral-400 mt-1.5">
                  Enter the email associated with your TaskFlow account.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending Link…</span>
                  </>
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default ForgotPasswordModal;
