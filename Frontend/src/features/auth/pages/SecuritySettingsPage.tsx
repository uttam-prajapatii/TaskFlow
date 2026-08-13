import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import Sidebar from '../../../components/layout/Sidebar';
import FormInput from '../components/FormInput';
import Icon from '../../../components/UI/Icon';
import authService from '../../../services/auth.service';
import useAuth from '../../../hooks/useAuth';

const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long')
      .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
      .regex(/\d/, 'New password must contain at least one number')
      .regex(/[!@#$%^&*(),.?":{}|<>\-_]/, 'New password must contain at least one special character'),
    confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match',
    path: ['confirmNewPassword'],
  });

type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;

export const SecuritySettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    try {
      setSavingProfile(true);
      await authService.updateMe({ fullName: fullName.trim() });
      toast.success('Profile full name updated!');
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      toast.error(errorObj.response?.data?.message || 'Failed to update profile name');
    } finally {
      setSavingProfile(false);
    }
  };

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema),
    mode: 'onChange',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const newPasswordValue = watch('newPassword', '');

  const passwordRules = [
    { label: 'At least 8 characters', met: newPasswordValue.length >= 8 },
    { label: 'Upper & lowercase letters', met: /[A-Z]/.test(newPasswordValue) && /[a-z]/.test(newPasswordValue) },
    { label: 'At least one number', met: /\d/.test(newPasswordValue) },
    { label: 'At least one special character', met: /[!@#$%^&*(),.?":{}|<>\-_]/.test(newPasswordValue) },
  ];

  const onSubmit = async (data: UpdatePasswordFormData) => {
    try {
      setApiError(null);
      await authService.updatePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      toast.success('Password updated successfully. Please log in again with your new password.', {
        id: 'update-password-toast',
      });
      reset();

      // Redirect to login as backend revokes session cookies for security
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1000);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      const errorMessage = errorObj.response?.data?.message || 'Failed to update password. Please check your current password.';
      setApiError(errorMessage);
    }
  };

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans">
      <Sidebar />

      <main className="flex-1 min-w-0 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="pb-6 border-b border-neutral-200 dark:border-neutral-800">
            <h1 className="text-2xl md:text-3xl font-bold font-display text-neutral-900 dark:text-neutral-100">
              Account & Security Settings
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Manage your personal profile information and password for <strong className="text-neutral-800 dark:text-neutral-200">{user?.email}</strong>.
            </p>
          </div>

          {/* Profile Name Card */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-2xs">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                <Icon name="user" size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Profile Information
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Update your display name visible across team workspaces.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-orange-400/40"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingProfile || !fullName.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 transition cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>

          {/* Password Form Card */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-2xs">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                <Icon name="lock" size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Update Password
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Ensure your account is using a long, random password to stay secure.
                </p>
              </div>
            </div>

            {apiError && (
              <div className="mb-6 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 text-xs font-semibold flex items-center gap-2">
                <Icon name="alert-circle" size={16} className="shrink-0 text-rose-500" />
                <span>{apiError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <FormInput
                label="Current Password"
                id="current-pass"
                type="password"
                placeholder="Enter current password"
                autoComplete="current-password"
                {...register('currentPassword')}
                error={errors.currentPassword?.message}
              />

              <div>
                <FormInput
                  label="New Password"
                  id="sec-new-pass"
                  type="password"
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  {...register('newPassword', { deps: ['confirmNewPassword'] })}
                  error={errors.newPassword?.message}
                />

                {newPasswordValue.length > 0 && (
                  <div className="mt-2 p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl space-y-1.5 border border-neutral-200 dark:border-neutral-700/60">
                    <p className="text-[11px] font-bold text-neutral-400 dark:text-neutral-400 uppercase tracking-wider mb-1">
                      New Password Requirements
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {passwordRules.map((rule, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[11.5px]">
                          <Icon
                            name={rule.met ? 'check' : 'circle'}
                            size={12}
                            className={rule.met ? 'text-emerald-500 font-bold' : 'text-neutral-300 dark:text-neutral-600'}
                          />
                          <span className={rule.met ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-neutral-400'}>
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
                id="sec-confirm-pass"
                type="password"
                placeholder="Confirm new password"
                autoComplete="new-password"
                {...register('confirmNewPassword', { deps: ['newPassword'] })}
                error={errors.confirmNewPassword?.message}
              />

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-500/25 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SecuritySettingsPage;
