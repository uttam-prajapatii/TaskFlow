import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '../../../components/UI/Modal';
import Icon from '../../../components/UI/Icon';
import { toast } from 'sonner';
import authService from '../../../services/auth.service';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Work email address is required.')
    .email('Please enter a valid email address.'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

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
  const [apiError, setApiError] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: defaultEmail,
    },
  });

  useEffect(() => {
    if (open) {
      reset({ email: defaultEmail });
      setValue('email', defaultEmail);
      setApiError(null);
      setSuccessEmail(null);
    }
  }, [open, defaultEmail, reset, setValue]);

  if (!open) return null;

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setApiError(null);
      const trimmedEmail = data.email.trim();
      await authService.forgotPassword({ email: trimmedEmail });

      setSuccessEmail(trimmedEmail);
      toast.success(`Password reset link sent to ${trimmedEmail}`, { id: 'forgot-password-toast' });
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      const errorMessage = errorObj.response?.data?.message || 'Failed to send password reset email. Please try again.';
      setApiError(errorMessage);
    }
  };

  return (
    <Modal open={open} onClose={onClose} width={440}>
      {/* Header */}
      <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-neutral-900">
            Reset Password
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Enter your email to receive password reset instructions.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
        >
          <Icon name="x" size={16} />
        </button>
      </div>

      {/* Body Content */}
      <div className="p-5">
        {successEmail ? (
          <div className="text-center py-4 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-2">
              <Icon name="mail" size={24} />
            </div>
            <h3 className="text-sm font-bold text-neutral-900">
              Check Your Inbox
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed max-w-xs mx-auto">
              We sent password reset instructions to{' '}
              <strong className="text-neutral-900 font-semibold">
                {successEmail}
              </strong>
              .
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Work Email Address <span className="text-orange-500">*</span>
              </label>
              <input
                autoFocus
                type="email"
                placeholder="you@company.com"
                style={{ colorScheme: 'light' }}
                {...register('email')}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm border bg-neutral-50 text-neutral-900 placeholder-neutral-400 outline-none transition ${
                  errors.email || apiError
                    ? 'border-rose-500 bg-rose-50/60 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-neutral-200 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
                }`}
              />
              {errors.email && (
                <p className="text-[11.5px] font-semibold text-rose-500 mt-1.5 flex items-center gap-1">
                  <Icon name="alert-circle" size={13} /> {errors.email.message}
                </p>
              )}
              {apiError && !errors.email && (
                <p className="text-[11.5px] font-semibold text-rose-500 mt-1.5 flex items-center gap-1">
                  <Icon name="alert-circle" size={13} /> {apiError}
                </p>
              )}
              {!errors.email && !apiError && (
                <p className="text-[11px] text-neutral-400 mt-1.5">
                  Enter the email associated with your TaskFlow account.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
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
