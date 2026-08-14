import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { workspaceService } from '../../../services/workspace.service';
import { useWorkspace } from '../../../context/WorkspaceContext';
import useAuth from '../../../hooks/useAuth';
import Icon from '../../../components/UI/Icon';
import type { WorkspaceInviteDetails, WorkspaceRole } from '../types';

const ROLE_DETAILS: Record<
  WorkspaceRole,
  { label: string; bg: string; text: string; border: string; desc: string }
> = {
  admin: {
    label: 'Workspace Admin',
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
    desc: 'Can manage workspace settings, invite team members, and manage all boards.',
  },
  member: {
    label: 'Workspace Member',
    bg: 'bg-orange-500/10 dark:bg-orange-500/20',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-500/30',
    desc: 'Can create boards, assign tasks, add comments, and collaborate with the team.',
  },
  viewer: {
    label: 'Workspace Viewer',
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
    desc: 'Can view workspace boards, inspect tasks, and contribute comments.',
  },
  owner: {
    label: 'Workspace Owner',
    bg: 'bg-purple-500/10 dark:bg-purple-500/20',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/30',
    desc: 'Full owner permissions and workspace administration.',
  },
};

export const AcceptInvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refreshWorkspaces } = useWorkspace();
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();

  const [invite, setInvite] = useState<WorkspaceInviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<'accept' | 'decline' | null>(null);

  // Fetch invitation metadata
  const fetchInviteData = useCallback(async () => {
    if (!token) {
      setErrorMessage('Missing invitation token.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await workspaceService.getInviteDetails(token);
      setInvite(data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMessage(error.response?.data?.message || 'This invitation link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInviteData();
  }, [fetchInviteData]);

  // Handle Accept Action
  const handleAccept = async () => {
    if (!token || actionLoading) return;

    try {
      setActionLoading('accept');
      const res = await workspaceService.acceptInvite(token);

      toast.success(res.message || 'Successfully joined workspace!', { id: 'invite-accept-toast' });

      // Invalidate queries and sync workspace context
      await queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      if (res.workspaceId) {
        await queryClient.invalidateQueries({ queryKey: ['workspace', res.workspaceId] });
      }

      await refreshWorkspaces();

      // Redirect to Workspace Selection
      navigate('/workspace-select', { replace: true });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error.response?.data?.message || 'Failed to accept invitation.';
      toast.error(msg, { id: 'invite-error-toast' });
      // Re-fetch invite data to reflect new state if already claimed
      fetchInviteData();
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Decline Action
  const handleDecline = async () => {
    if (!token || actionLoading) return;

    try {
      setActionLoading('decline');
      const res = await workspaceService.declineInvite(token);

      toast.info(res.message || 'Invitation declined', { id: 'invite-decline-toast' });

      // Redirect to Onboarding / Create Workspace flow
      navigate('/onboarding', { replace: true });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error.response?.data?.message || 'Failed to decline invitation.';
      toast.error(msg, { id: 'invite-error-toast' });
      fetchInviteData();
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Switch Account (Logout and redirect to login)
  const handleSwitchAccount = async () => {
    if (invite) {
      await logout();
      const returnUrl = `/workspaces/invite/${token}`;
      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}&email=${encodeURIComponent(invite.email)}`);
    }
  };

  // 1. Loading State
  if (loading || isAuthLoading) {
    return (
      <div className="min-h-screen bg-paper dark:bg-neutral-950 flex flex-col items-center justify-center p-4">
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-8 animate-[fadeUp_0.2s_ease]">
          <img src="/logo.png" alt="TaskFlow Logo" className="w-10 h-10 rounded-xl object-contain shadow-md" />
          <span className="font-extrabold text-xl text-neutral-900 dark:text-neutral-100 tracking-tight font-display">
            TaskFlow
          </span>
        </div>

        <div className="flex flex-col items-center gap-3 animate-[fadeUp_0.2s_ease]">
          <div className="w-10 h-10 border-3 border-flame-2 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-ink-soft dark:text-neutral-400 font-display">
            Validating invitation details…
          </p>
        </div>
      </div>
    );
  }

  // 2. Error / Invalid Link State
  if (errorMessage || !invite) {
    return (
      <div className="min-h-screen bg-paper dark:bg-neutral-950 flex flex-col justify-center items-center p-4">
        {/* Brand Top Header */}
        <div className="flex items-center gap-3 mb-6">
          <img src="/logo.png" alt="TaskFlow Logo" className="w-10 h-10 rounded-xl object-contain shadow-md" />
          <span className="font-extrabold text-xl text-neutral-900 dark:text-neutral-100 tracking-tight font-display">
            TaskFlow
          </span>
        </div>

        <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-line dark:border-neutral-800 rounded-3xl p-8 shadow-xl text-center backdrop-blur-xl animate-[fadeUp_0.3s_ease]">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5 text-red-500">
            <Icon name="alert-circle" size={30} />
          </div>
          <h2 className="text-2xl font-bold font-display text-ink dark:text-neutral-100 mb-2">
            Invalid Invitation
          </h2>
          <p className="text-sm text-ink-soft dark:text-neutral-400 mb-6 leading-relaxed">
            {errorMessage || 'This invitation link is not valid, has expired, or has been revoked.'}
          </p>
          <div className="space-y-2.5">
            <Link
              to="/workspace-select"
              className="inline-flex items-center justify-center w-full py-3 px-4 bg-gradient-to-r from-flame-1 via-flame-2 to-flame-3 text-white font-display font-semibold rounded-xl shadow-[0_8px_20px_-6px_rgba(255,80,30,0.5)] hover:brightness-105 transition-all"
            >
              Go to Workspace Dashboard
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-paper-dim dark:bg-neutral-800 text-ink dark:text-neutral-300 font-medium rounded-xl hover:bg-line dark:hover:bg-neutral-700 transition"
            >
              Sign In with Different Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const roleInfo = ROLE_DETAILS[invite.role] || ROLE_DETAILS.member;
  const isEmailMatch =
    isAuthenticated && user?.email && invite.email
      ? user.email.toLowerCase() === invite.email.toLowerCase()
      : false;

  const formattedDate = invite.expiresAt
    ? new Date(invite.expiresAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  // 3. Expired / Revoked / Declined / Already Accepted Status Handling
  if (!invite.valid || invite.status !== 'pending') {
    let statusTitle = 'Invitation Unavailable';
    let statusDesc = 'This invitation is no longer active.';
    let statusIcon = 'alert-circle';
    let statusBadgeColor = 'bg-neutral-500/10 text-neutral-600 border-neutral-500/20';

    if (invite.status === 'expired') {
      statusTitle = 'Invitation Expired';
      statusDesc = `This invitation expired${formattedDate ? ` on ${formattedDate}` : ''}. Please contact the workspace admin to receive a new invite link.`;
      statusIcon = 'clock';
      statusBadgeColor = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    } else if (invite.status === 'revoked') {
      statusTitle = 'Invitation Revoked';
      statusDesc = 'This invitation has been revoked by the workspace administrator.';
      statusIcon = 'x';
      statusBadgeColor = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
    } else if (invite.status === 'declined') {
      statusTitle = 'Invitation Declined';
      statusDesc = 'This invitation was previously declined.';
      statusIcon = 'x';
      statusBadgeColor = 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20';
    } else if (invite.status === 'accepted') {
      statusTitle = 'Already Accepted';
      statusDesc = 'This invitation has already been accepted.';
      statusIcon = 'shield-check';
      statusBadgeColor = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    }

    return (
      <div className="min-h-screen bg-paper dark:bg-neutral-950 flex flex-col justify-center items-center p-4">
        {/* Brand Top Header */}
        <div className="flex items-center gap-3 mb-6">
          <img src="/logo.png" alt="TaskFlow Logo" className="w-10 h-10 rounded-xl object-contain shadow-md" />
          <span className="font-extrabold text-xl text-neutral-900 dark:text-neutral-100 tracking-tight font-display">
            TaskFlow
          </span>
        </div>

        <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-line dark:border-neutral-800 rounded-3xl p-8 shadow-xl text-center backdrop-blur-xl animate-[fadeUp_0.3s_ease]">
          {/* Logo / Icon */}
          <div className="mb-4 flex justify-center">
            {invite.workspace?.logo ? (
              <img
                src={invite.workspace.logo}
                alt={invite.workspace.name}
                className="w-16 h-16 rounded-2xl object-cover shadow-md border border-neutral-200 dark:border-neutral-700"
              />
            ) : (
              <img
                src="/logo.png"
                alt="TaskFlow Logo"
                className="w-16 h-16 rounded-2xl object-contain shadow-md"
              />
            )}
          </div>

          <div className="flex items-center justify-center gap-2 mb-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${statusBadgeColor}`}
            >
              <Icon name={statusIcon} size={14} />
              {statusTitle}
            </span>
          </div>

          <h2 className="text-2xl font-bold font-display text-ink dark:text-neutral-100 mb-2">
            {invite.workspace?.name || 'Workspace'}
          </h2>

          <p className="text-sm text-ink-soft dark:text-neutral-400 mb-6 leading-relaxed">
            {statusDesc}
          </p>

          <div className="space-y-2.5">
            <Link
              to="/workspace-select"
              className="inline-flex items-center justify-center w-full py-3 px-4 bg-gradient-to-r from-flame-1 via-flame-2 to-flame-3 text-white font-display font-semibold rounded-xl shadow-[0_8px_20px_-6px_rgba(255,80,30,0.5)] hover:brightness-105 transition-all"
            >
              Go to Workspace Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Active Pending Invitation Card
  return (
    <div className="min-h-screen bg-paper dark:bg-neutral-950 text-ink dark:text-neutral-100 flex flex-col justify-center items-center p-4 sm:p-6 select-none">
      {/* Brand Top Header */}
      <div className="flex items-center gap-3 mb-6">
        <img src="/logo.png" alt="TaskFlow Logo" className="w-10 h-10 rounded-xl object-contain shadow-md" />
        <span className="font-extrabold text-xl text-neutral-900 dark:text-neutral-100 tracking-tight font-display">
          TaskFlow
        </span>
      </div>

      <div className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-line dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden animate-[fadeUp_0.35s_ease]">
        {/* Subtle Top Gradient Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-flame-1 via-flame-2 to-flame-3" />

        {/* Workspace Brand Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            {invite.workspace?.logo ? (
              <img
                src={invite.workspace.logo}
                alt={invite.workspace.name}
                className="w-16 h-16 rounded-2xl object-cover shadow-lg border border-neutral-200 dark:border-neutral-700"
              />
            ) : (
              <img
                src="/logo.png"
                alt="TaskFlow Logo"
                className="w-16 h-16 rounded-2xl object-contain shadow-lg shadow-orange-500/15"
              />
            )}
          </div>

          <span className="inline-block px-3 py-0.5 text-xs font-semibold uppercase tracking-wider bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-full border border-orange-500/20 mb-2 font-display">
            Workspace Invitation
          </span>

          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-ink dark:text-white">
            {invite.workspace?.name}
          </h1>

          {invite.workspace?.description && (
            <p className="text-xs sm:text-sm text-ink-soft dark:text-neutral-400 mt-1 line-clamp-2">
              {invite.workspace.description}
            </p>
          )}
        </div>

        {/* Inviter & Role Details Card */}
        <div className="bg-paper-dim/60 dark:bg-neutral-800/60 border border-line dark:border-neutral-700/60 rounded-2xl p-4 mb-6 space-y-3.5">
          {/* Inviter Info */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-line dark:border-neutral-700/60">
            <span className="text-xs font-medium text-ink-soft dark:text-neutral-400">
              Invited by:
            </span>
            <div className="flex items-center gap-2 text-right">
              {invite.invitedBy?.avatarUrl ? (
                <img
                  src={invite.invitedBy.avatarUrl}
                  alt={invite.invitedBy.fullName || 'Inviter'}
                  className="w-6 h-6 rounded-full object-cover border border-line dark:border-neutral-600"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-bold font-display">
                  {(invite.invitedBy?.fullName || invite.invitedBy?.email || 'A').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-semibold text-ink dark:text-neutral-200">
                {invite.invitedBy?.fullName || invite.invitedBy?.email || 'Team Admin'}
              </span>
            </div>
          </div>

          {/* Role Info */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-line dark:border-neutral-700/60">
            <div>
              <span className="text-xs font-medium text-ink-soft dark:text-neutral-400 block mb-1">
                Your Assigned Role:
              </span>
              <p className="text-xs text-ink-soft/80 dark:text-neutral-400 max-w-[260px]">
                {roleInfo.desc}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border shrink-0 ${roleInfo.bg} ${roleInfo.text} ${roleInfo.border}`}
            >
              <Icon name="shield-check" size={14} />
              {roleInfo.label}
            </span>
          </div>

          {/* Invited Email Target */}
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-medium text-ink-soft dark:text-neutral-400">
              Invitation sent to:
            </span>
            <span className="font-mono font-medium text-ink dark:text-neutral-300 bg-white/70 dark:bg-neutral-900/70 px-2.5 py-1 rounded-md border border-line dark:border-neutral-700">
              {invite.email}
            </span>
          </div>
        </div>

        {/* Action Section */}
        {isAuthenticated ? (
          <div>
            {!isEmailMatch ? (
              /* Unauthorized Mismatched Email Warning */
              <div className="space-y-4">
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-left flex gap-3 items-start">
                  <Icon name="alert-circle" size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 space-y-1">
                    <p className="font-bold">Account mismatch</p>
                    <p>
                      You are currently signed in as{' '}
                      <span className="font-semibold underline">{user?.email}</span>, but this invitation was sent to{' '}
                      <span className="font-semibold underline">{invite.email}</span>.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleSwitchAccount}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-flame-1 via-flame-2 to-flame-3 text-white font-display font-bold text-sm rounded-xl shadow-lg shadow-orange-500/20 hover:brightness-105 transition active:scale-[0.99] cursor-pointer"
                  >
                    Switch to {invite.email}
                  </button>
                  <Link
                    to="/workspace-select"
                    className="py-3 px-4 text-center bg-paper-dim dark:bg-neutral-800 text-ink dark:text-neutral-300 font-medium text-sm rounded-xl hover:bg-line dark:hover:bg-neutral-700 transition"
                  >
                    Cancel
                  </Link>
                </div>
              </div>
            ) : (
              /* Authenticated and Matching Email → Accept / Decline Actions */
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    disabled={actionLoading !== null}
                    onClick={handleAccept}
                    className={`flex-1 py-3.5 px-5 bg-gradient-to-r from-flame-1 via-flame-2 to-flame-3 text-white font-display font-bold text-[15px] rounded-xl shadow-[0_12px_24px_-8px_rgba(255,80,30,0.5)] hover:shadow-[0_16px_28px_-8px_rgba(255,80,30,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      actionLoading === 'accept' ? 'opacity-80 cursor-not-allowed' : ''
                    }`}
                  >
                    {actionLoading === 'accept' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Joining Workspace…</span>
                      </>
                    ) : (
                      <>
                        <Icon name="check" size={18} />
                        <span>Accept & Join Workspace</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading !== null}
                    onClick={handleDecline}
                    className={`py-3.5 px-5 bg-paper-dim dark:bg-neutral-800 hover:bg-line dark:hover:bg-neutral-700 text-ink-soft dark:text-neutral-300 font-display font-semibold text-sm rounded-xl border border-line dark:border-neutral-700 transition active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer ${
                      actionLoading === 'decline' ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {actionLoading === 'decline' ? (
                      <div className="w-4 h-4 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Icon name="x" size={16} />
                        <span>Decline</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-center text-xs text-ink-soft/70 dark:text-neutral-400">
                  Logged in as <span className="font-semibold">{user?.email}</span>
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Unauthenticated State → Register or Login with return redirect */
          <div className="space-y-3.5">
            <div className="p-3.5 bg-paper-dim/80 dark:bg-neutral-800/80 rounded-xl border border-line dark:border-neutral-700 text-xs text-ink-soft dark:text-neutral-400 text-center">
              Please {invite.userExists ? 'sign in' : 'create your account'} with{' '}
              <span className="font-semibold text-ink dark:text-neutral-200">{invite.email}</span> to accept this invitation.
            </div>

            {invite.userExists ? (
              <div className="space-y-2">
                <Link
                  to={`/login?redirect=${encodeURIComponent(`/workspaces/invite/${token}`)}&email=${encodeURIComponent(invite.email)}`}
                  className="flex items-center justify-center w-full py-3.5 px-4 bg-gradient-to-r from-flame-1 via-flame-2 to-flame-3 text-white font-display font-bold text-[15px] rounded-xl shadow-[0_12px_24px_-8px_rgba(255,80,30,0.5)] hover:brightness-105 hover:-translate-y-0.5 transition-all text-center"
                >
                  Sign in to Accept Invitation
                </Link>
                <div className="text-center text-xs text-ink-soft dark:text-neutral-400 pt-1">
                  Need a new account?{' '}
                  <Link
                    to={`/register?redirect=${encodeURIComponent(`/workspaces/invite/${token}`)}&email=${encodeURIComponent(invite.email)}`}
                    className="text-flame-2 font-bold hover:underline"
                  >
                    Create account
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  to={`/register?redirect=${encodeURIComponent(`/workspaces/invite/${token}`)}&email=${encodeURIComponent(invite.email)}`}
                  className="flex items-center justify-center w-full py-3.5 px-4 bg-gradient-to-r from-flame-1 via-flame-2 to-flame-3 text-white font-display font-bold text-[15px] rounded-xl shadow-[0_12px_24px_-8px_rgba(255,80,30,0.5)] hover:brightness-105 hover:-translate-y-0.5 transition-all text-center"
                >
                  Create Account to Accept Invitation
                </Link>
                <div className="text-center text-xs text-ink-soft dark:text-neutral-400 pt-1">
                  Already registered?{' '}
                  <Link
                    to={`/login?redirect=${encodeURIComponent(`/workspaces/invite/${token}`)}&email=${encodeURIComponent(invite.email)}`}
                    className="text-flame-2 font-bold hover:underline"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AcceptInvitePage;
