import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Sidebar from '../../../components/layout/Sidebar';
import Icon from '../../../components/UI/Icon';
import WorkspaceAvatar from '../../../components/UI/WorkspaceAvatar';
import MembersTab from '../components/MembersTab';
import InviteMemberModal from '../components/InviteMemberModal';
import { useWorkspace } from '../../../context/WorkspaceContext';
import useAuth from '../../../hooks/useAuth';
import workspaceService from '../../../services/workspace.service';
import type { WorkspaceMember, WorkspaceRole } from '../types';

export const MembersPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user: currentUser } = useAuth();

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);

  const wsId = currentWorkspace?._id || currentWorkspace?.id;
  const wsName = currentWorkspace?.name || 'Workspace';

  // Fetch live workspace members
  const {
    data: members = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<WorkspaceMember[]>({
    queryKey: ['workspace-members', wsId],
    queryFn: () => (wsId ? workspaceService.listMembers(wsId) : Promise.resolve([])),
    enabled: !!wsId,
    staleTime: 1000 * 30, // 30s
  });

  // Determine current user's role and management permissions
  const creatorId = typeof currentWorkspace?.ownerId === 'object' && currentWorkspace?.ownerId !== null
    ? (currentWorkspace.ownerId as { _id?: string })._id
    : (currentWorkspace?.ownerId as string);

  const myMemberObj = members.find((m) => {
    const uObj = typeof m.userId === 'object' && m.userId !== null ? m.userId : null;
    const uId = uObj ? uObj._id : (m.userId as string);
    return uId && currentUser?._id && String(uId) === String(currentUser._id);
  });

  const isOwner = Boolean(
    currentUser?._id && creatorId && String(currentUser._id) === String(creatorId)
  );
  const isMemberAdmin = myMemberObj?.role === 'admin' || myMemberObj?.role === 'owner';
  const canManage = isOwner || isMemberAdmin;

  // Role update mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: WorkspaceRole }) => {
      if (!wsId) throw new Error('No active workspace');
      return workspaceService.changeMemberRole(wsId, userId, role);
    },
    onSuccess: () => {
      toast.success('Member role updated');
      queryClient.invalidateQueries({ queryKey: ['workspace-members', wsId] });
      queryClient.invalidateQueries({ queryKey: ['workspace', wsId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-analytics', wsId] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to update member role');
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => {
      if (!wsId) throw new Error('No active workspace');
      return workspaceService.removeMember(wsId, userId);
    },
    onSuccess: () => {
      toast.success('Member removed from workspace');
      queryClient.invalidateQueries({ queryKey: ['workspace-members', wsId] });
      queryClient.invalidateQueries({ queryKey: ['workspace', wsId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-analytics', wsId] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to remove member');
    },
  });

  // Handle invitation sending
  const handleSendInvite = useCallback(
    async (email: string, role: WorkspaceRole) => {
      if (!wsId) return;
      try {
        setSendingInvite(true);
        await workspaceService.inviteMember(wsId, { email, role });
        toast.success(`Invitation sent to ${email}`);
        setInviteModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['workspace-invites', wsId] });
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } } };
        toast.error(error.response?.data?.message || 'Failed to send invitation');
      } finally {
        setSendingInvite(false);
      }
    },
    [wsId, queryClient]
  );

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans">
      {/* Sidebar stays ALWAYS mounted on the left */}
      <Sidebar />

      <main className="flex-1 min-w-0 h-screen overflow-y-auto p-6 md:p-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3.5">
              <WorkspaceAvatar
                name={wsName}
                logoUrl={currentWorkspace?.logoUrl}
                color={currentWorkspace?.accentColor || currentWorkspace?.settings?.color || currentWorkspace?.color}
                size={40}
                roundedClassName="rounded-2xl"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-neutral-100">
                    Team Members
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">
                    {members.length}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Manage members, assign access roles, and invite collaborators to <strong className="text-neutral-800 dark:text-neutral-200">{wsName}</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => navigate(wsId ? `/workspaces/${wsId}` : '/workspace-select')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 transition cursor-pointer shadow-2xs"
              >
                <Icon name="layout" size={14} /> Workspace Overview
              </button>

              {canManage && (
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md cursor-pointer transition hover:opacity-95"
                  style={{ background: 'linear-gradient(135deg, #FF7A3D, #E8432E)' }}
                >
                  <Icon name="user-plus" size={14} /> Invite Member
                </button>
              )}
            </div>
          </div>

          {/* Members Content */}
          {isLoading && members.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xs">
              <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-neutral-400 font-medium">Loading workspace team members…</p>
            </div>
          ) : isError ? (
            <div className="p-10 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xs">
              <p className="text-sm text-rose-500 font-semibold mb-3">Failed to load workspace members</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-semibold cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : (
            <MembersTab
              members={members}
              currentUserId={currentUser?._id}
              creatorId={creatorId}
              canManage={canManage}
              onUpdateRole={(userId, role) => updateRoleMutation.mutate({ userId, role })}
              onRemoveMember={(userId) => removeMemberMutation.mutate(userId)}
              onOpenInvite={() => setInviteModalOpen(true)}
            />
          )}
        </div>
      </main>

      {/* Invite Member Modal */}
      <InviteMemberModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onInvite={handleSendInvite}
        sending={sendingInvite}
      />
    </div>
  );
};

export default MembersPage;
