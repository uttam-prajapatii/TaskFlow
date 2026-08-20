import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import BrandPanel from '../components/BrandPanel';
import FormInput from '../components/FormInput';
import Icon from '../../../components/UI/Icon';
import authService from '../../../services/auth.service';
import ForgotPasswordModal from '../components/ForgotPasswordModal';

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/\d/, 'Password must contain at least one number')
      .regex(/[!@#$%^&*(),.?":{}|<>\-_]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange',
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPasswordValue = watch('newPassword', '');

  const passwordRules = [
    { label: 'At least 8 characters', met: newPasswordValue.length >= 8 },
    { label: 'Upper & lowercase letters', met: /[A-Z]/.test(newPasswordValue) && /[a-z]/.test(newPasswordValue) },
    { label: 'At least one number', met: /\d/.test(newPasswordValue) },
    { label: 'At least one special character', met: /[!@#$%^&*(),.?":{}|<>\-_]/.test(newPasswordValue) },
  ];

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setApiError('Invalid or missing password reset token. Please request a new reset link.');
      return;
    }

    try {
      setApiError(null);
      await authService.resetPassword(token, { newPassword: data.newPassword });

      setSuccess(true);
      toast.success('Password reset successfully. Please log in with your new password.', {
        id: 'reset-password-success-toast',
      });
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      const errorMessage =
        errorObj.response?.data?.message ||
        'Password reset link is invalid or has expired. Please request a new reset link.';
      setApiError(errorMessage);
    }
  };

  return (
    <div className="w-full min-h-screen md:h-screen md:overflow-hidden bg-white grid grid-cols-1 md:grid-cols-[1.05fr_1fr] select-none">
      {/* LEFT SIDE: BRAND PANEL */}
      <div className="hidden md:block h-full overflow-hidden">
        <BrandPanel />
      </div>

      {/* RIGHT SIDE: RESET FORM AREA */}
      <div className="h-full overflow-y-auto flex flex-col justify-center items-center px-6 py-12 md:px-16 bg-white">
        <div className="w-[380px] max-w-full mx-auto shrink-0">
          {/* Header */}
          <div className="mb-7">
            <h2 className="font-display text-[26px] font-bold text-ink tracking-tight mb-1.5">
              Reset Password
            </h2>
            <p className="text-sm text-ink-soft leading-relaxed">
              Create a new secure password for your TaskFlow account.
            </p>
          </div>

          {!token ? (
            /* Missing Token Error State */
            <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/50 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                <Icon name="alert-circle" size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 mb-1">
                  Invalid or Missing Reset Link
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  The password reset link is invalid or has expired. Please request a new password reset email.
                </p>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-flame-1 via-flame-2 to-flame-3 hover:brightness-105 shadow-md shadow-orange-500/20 transition cursor-pointer"
                >
                  Request New Reset Link
                </button>
                <Link
                  to="/login"
                  className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 py-1 transition text-center"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : success ? (
            /* Success State */
            <div className="p-6 rounded-2xl border border-emerald-200 bg-emerald-50/50 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <Icon name="check-circle" size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 mb-1">
                  Password Reset Successfully
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Your password has been updated. You can now sign in to your TaskFlow account with your new credentials.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full py-3 rounded-xl border-0 bg-gradient-to-r from-flame-1 via-flame-2 to-flame-3 text-white font-display font-bold text-[15px] tracking-wide cursor-pointer shadow-[0_14px_28px_-12px_rgba(255,80,30,0.55)] hover:shadow-[0_18px_32px_-12px_rgba(255,80,30,0.62)] hover:-translate-y-[1px] transition-all duration-200"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          ) : (
            /* Reset Password Form */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {apiError && (
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 text-xs font-semibold flex items-center gap-2">
                  <Icon name="alert-circle" size={16} className="shrink-0 text-rose-500" />
                  <span>{apiError}</span>
                </div>
              )}

              <div>
                <FormInput
                  label="New Password"
                  id="new-pass"
                  type="password"
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  {...register('newPassword', { deps: ['confirmPassword'] })}
                  error={errors.newPassword?.message}
                />

                {/* Password Strength Indicator Rules */}
                {newPasswordValue.length > 0 && (
                  <div className="mt-2 p-3 bg-paper-dim/60 rounded-xl space-y-1.5 border border-line">
                    <p className="text-[11px] font-bold text-ink-soft uppercase tracking-wider mb-1">
                      Password Requirements
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {passwordRules.map((rule, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[11.5px]">
                          <Icon
                            name={rule.met ? 'check' : 'circle'}
                            size={12}
                            className={rule.met ? 'text-emerald-500 font-bold' : 'text-neutral-300'}
                          />
                          <span className={rule.met ? 'text-emerald-600 font-medium' : 'text-neutral-400'}>
                            {rule.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <FormInput
                label="Confirm New Password"
                id="confirm-pass"
                type="password"
                placeholder="Confirm new password"
                autoComplete="new-password"
                {...register('confirmPassword', { deps: ['newPassword'] })}
                error={errors.confirmPassword?.message}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 mt-2 rounded-xl border-0 bg-gradient-to-r from-flame-1 via-flame-2 to-flame-3 text-white font-display font-bold text-[15px] tracking-wide cursor-pointer shadow-[0_14px_28px_-12px_rgba(255,80,30,0.55)] hover:shadow-[0_18px_32px_-12px_rgba(255,80,30,0.62)] hover:-translate-y-[1px] active:translate-y-0 hover:brightness-105 transition-all duration-200 ${
                  isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
              </button>

              <div className="text-center pt-2 text-[13.5px] text-ink-soft">
                Remember your password?{' '}
                <Link to="/login" className="text-flame-2 font-bold hover:underline">
                  Sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>

      <ForgotPasswordModal
        open={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
      />
    </div>
  );
};

export default ResetPasswordPage;
