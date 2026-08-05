import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import useAuth from '../../../hooks/useAuth';
import { useWorkspace } from '../../../context/WorkspaceContext';
import Sidebar from '../../../components/layout/Sidebar';
import Icon from '../../../components/UI/Icon';
import Badge from '../../../components/UI/Badge';
import { initials } from '../../../components/UI/Avatar';
import { getColorHex } from '../components/WorkspaceCard';
import MembersTab from '../components/MembersTab';
import InvitationsTab from '../components/InvitationsTab';
import SettingsTab from '../components/SettingsTab';
import InviteMemberModal from '../components/InviteMemberModal';
import BoardCard from '../../board/components/BoardCard';
import CreateBoardModal from '../../board/components/CreateBoardModal';
import workspaceService from '../../../services/workspace.service';
import boardService from '../../../services/board.service';
import type {
  Workspace,
  WorkspaceMember,
  WorkspaceInvite,
  WorkspaceRole,
} from '../types';
import type { Board, CreateBoardPayload } from '../../board/types';

export const WorkspaceDetailPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { setCurrentWorkspace, workspaces } = useWorkspace();

  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);

  const [activeTab, setActiveTab] = useState<'boards' | 'members' | 'invitations' | 'settings'>('boards');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [creatingBoard, setCreatingBoard] = useState(false);

  const loadWorkspaceData = useCallback(async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      const wsDetails = await workspaceService.getWorkspaceDetails(workspaceId);
      setWorkspace(wsDetails);
      setCurrentWorkspace(wsDetails);

      try {
        const bList = await boardService.listWorkspaceBoards(workspaceId);
        setBoards(bList);
      } catch {
        setBoards([]);
      }

      try {
        const memList = await workspaceService.listMembers(workspaceId);
        setMembers(memList);
      } catch {
        setMembers([]);
      }

      try {
        const invList = await workspaceService.listPendingInvites(workspaceId);
        setInvites(invList);
      } catch {
        setInvites([]);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to load workspace details');
      navigate('/workspaces');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, navigate, setCurrentWorkspace]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  // Determine current user's role in this workspace
  const myMemberObj = members.find((m) => {
    const uId = typeof m.userId === 'object' && m.userId !== null ? m.userId._id : m.userId;
    return uId === currentUser?._id;
  });

  const isOwner =
    workspace?.ownerId === currentUser?._id ||
    (typeof workspace?.ownerId === 'object' && workspace?.ownerId._id === currentUser?._id);

  const myRole: WorkspaceRole = isOwner ? 'owner' : myMemberObj?.role || 'viewer';
  const canManage = myRole === 'owner' || myRole === 'admin';

  const handleCreateBoard = async (payload: CreateBoardPayload) => {
    if (!workspaceId) return;
    try {
      setCreatingBoard(true);
      const created = await boardService.createBoard(workspaceId, payload);
      toast.success(`Board "${created.name || created.title}" created successfully!`);
      setCreateBoardOpen(false);
      navigate(`/boards/${created._id || created.id}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to create board.');
    } finally {
      setCreatingBoard(false);
    }
  };

  const handleDeleteBoard = async (b: Board) => {
    const bId = b._id || b.id!;
    try {
      await boardService.deleteBoard(bId);
      toast.success('Board deleted');
      loadWorkspaceData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to delete board');
    }
  };

  const handleUpdateRole = async (userId: string, role: WorkspaceRole) => {
    if (!workspaceId) return;
    try {
      await workspaceService.changeMemberRole(workspaceId, userId, role);
      toast.success('Member role updated');
      loadWorkspaceData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!workspaceId) return;
    try {
      await workspaceService.removeMember(workspaceId, userId);
      toast.success('Member removed');
      loadWorkspaceData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleSendInvite = async (email: string, role: WorkspaceRole) => {
    if (!workspaceId) return;
    try {
      setSendingInvite(true);
      await workspaceService.inviteMember(workspaceId, { email, role });
      toast.success(`Invite sent to ${email}`);
      setInviteModalOpen(false);
      loadWorkspaceData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to send invite');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!workspaceId) return;
    try {
      await workspaceService.revokeInvite(workspaceId, inviteId);
      toast.success('Invitation revoked');
      loadWorkspaceData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to revoke invite');
    }
  };

  const handleRenameWorkspace = async (newName: string) => {
    if (!workspaceId) return;
    try {
      await workspaceService.updateWorkspace(workspaceId, { name: newName });
      toast.success('Workspace renamed');
      loadWorkspaceData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to rename workspace');
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!workspaceId) return;
    try {
      await workspaceService.deleteWorkspace(workspaceId);
      toast.success('Workspace deleted');
      navigate('/workspaces');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to delete workspace');
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!workspaceId) return;
    try {
      await workspaceService.leaveWorkspace(workspaceId);
      toast.success('Left workspace');
      navigate('/workspaces');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to leave workspace');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <Sidebar />
        <main className="flex-1 p-6 md:p-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium text-neutral-400">Loading workspace…</span>
          </div>
        </main>
      </div>
    );
  }

  if (!workspace) return null;

  const hex = getColorHex(workspace.settings?.color || workspace.color);
  const visibility = workspace.settings?.visibility || workspace.visibility || 'private';

  const tabs = [
    { id: 'boards', label: 'Boards', icon: 'layoutGrid' },
    { id: 'members', label: 'Members', icon: 'users' },
    { id: 'invitations', label: 'Invitations', icon: 'mail' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <Sidebar />

      <main className="flex-1 min-w-0 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {/* Back button */}
          <button
            type="button"
            onClick={() => navigate('/workspaces')}
            className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors mb-4 cursor-pointer"
          >
            <Icon name="arrow-left" size={15} /> All workspaces
          </button>

          {/* Workspace Header */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: `linear-gradient(135deg, ${hex}, ${hex}CC)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: 20,
              }}
            >
              {initials(workspace.name)}
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-neutral-100">
                  {workspace.name}
                </h1>
                <Badge tone={visibility === 'public' ? 'success' : 'neutral'}>
                  {visibility === 'public' ? 'Public' : 'Private'}
                </Badge>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {workspace.description || 'No description provided.'}
              </p>
            </div>
            <div className="flex gap-4 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              <span className="flex items-center gap-1">
                <Icon name="layout" size={14} /> {boards.length} boards
              </span>
              <span className="flex items-center gap-1">
                <Icon name="users" size={14} /> {members.length} members
              </span>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800 mb-6">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as 'boards' | 'members' | 'invitations' | 'settings')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === t.id
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <Icon name={t.icon} size={15} /> {t.label}
              </button>
            ))}
          </div>

          {/* Tab Contents */}
          {activeTab === 'boards' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                  Workspace Boards ({boards.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setCreateBoardOpen(true)}
                  style={{
                    background: 'linear-gradient(135deg, #FF7A3D, #E8432E)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Icon name="plus" size={15} /> Create board
                </button>
              </div>

              {boards.length === 0 ? (
                <div className="text-center py-12 px-4 bg-white dark:bg-neutral-900 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                  <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto mb-3">
                    <Icon name="layoutGrid" size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                    No boards in this workspace
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-4">
                    Create a board to organize your tasks and collaborate with your team.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCreateBoardOpen(true)}
                    style={{
                      background: 'linear-gradient(135deg, #FF7A3D, #E8432E)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 10,
                      padding: '8px 16px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + Create board
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {boards.map((b) => (
                    <BoardCard
                      key={b._id || b.id}
                      board={b}
                      onOpen={(board) => navigate(`/boards/${board._id || board.id}`)}
                      onDelete={handleDeleteBoard}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'members' && (
            <MembersTab
              members={members}
              currentUserId={currentUser?._id}
              canManage={canManage}
              onUpdateRole={handleUpdateRole}
              onRemoveMember={handleRemoveMember}
              onOpenInvite={() => setInviteModalOpen(true)}
            />
          )}

          {activeTab === 'invitations' && (
            <InvitationsTab
              invites={invites}
              canManage={canManage}
              onRevokeInvite={handleRevokeInvite}
              onOpenInvite={() => setInviteModalOpen(true)}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              ws={workspace}
              myRole={myRole}
              canManage={canManage}
              onRename={handleRenameWorkspace}
              onDelete={handleDeleteWorkspace}
              onLeave={handleLeaveWorkspace}
            />
          )}
        </div>
      </main>

      <InviteMemberModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onInvite={handleSendInvite}
        sending={sendingInvite}
      />

      <CreateBoardModal
        open={createBoardOpen}
        onClose={() => setCreateBoardOpen(false)}
        onCreate={handleCreateBoard}
        workspaces={workspaces.length > 0 ? workspaces : workspace ? [workspace] : []}
        defaultWorkspaceId={workspace._id || workspace.id}
        creating={creatingBoard}
      />
    </div>
  );
};

export default WorkspaceDetailPage;
