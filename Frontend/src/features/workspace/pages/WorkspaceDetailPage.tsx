import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import useAuth from '../../../hooks/useAuth';
import { useWorkspace } from '../../../context/WorkspaceContext';
import Sidebar from '../../../components/layout/Sidebar';
import Icon from '../../../components/UI/Icon';
import WorkspaceAvatar from '../../../components/UI/WorkspaceAvatar';
import MembersTab from '../components/MembersTab';
import InvitationsTab from '../components/InvitationsTab';
import SettingsTab from '../components/SettingsTab';
import ActivityTab from '../components/ActivityTab';
import InviteMemberModal from '../components/InviteMemberModal';
import BoardCard from '../../board/components/BoardCard';
import CreateBoardModal from '../../board/components/CreateBoardModal';
import RenameBoardModal from '../../board/components/RenameBoardModal';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { setCurrentWorkspace, workspaces, refreshWorkspaces, deleteWorkspaceAndSync } = useWorkspace();

  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);

  const tabParam = searchParams.get('tab') as 'boards' | 'members' | 'invitations' | 'activity' | 'settings' | null;
  const [activeTab, setActiveTabState] = useState<'boards' | 'members' | 'invitations' | 'activity' | 'settings'>(tabParam || 'boards');

  useEffect(() => {
    if (tabParam && ['boards', 'members', 'invitations', 'activity', 'settings'].includes(tabParam)) {
      setActiveTabState(tabParam);
    }
  }, [tabParam]);

  const setActiveTab = (tab: 'boards' | 'members' | 'invitations' | 'activity' | 'settings') => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  };

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [renameBoardTarget, setRenameBoardTarget] = useState<Board | null>(null);
  const [renamingBoard, setRenamingBoard] = useState(false);

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
      toast.error(error.response?.data?.message || 'Workspace not found or unavailable');

      // Purge invalid workspace from state, localStorage, and query cache
      const lastStored = localStorage.getItem('taskflow_last_workspace_id');
      if (lastStored === workspaceId) {
        localStorage.removeItem('taskflow_last_workspace_id');
      }
      queryClient.removeQueries({ queryKey: ['workspace', workspaceId] });
      queryClient.removeQueries({ queryKey: ['workspace-boards', workspaceId] });
      queryClient.removeQueries({ queryKey: ['workspace-members', workspaceId] });
      queryClient.removeQueries({ queryKey: ['workspace-invites', workspaceId] });
      queryClient.removeQueries({ queryKey: ['workspace-activities', workspaceId] });

      // Check remaining workspaces and navigate safely
      const res = await workspaceService.listWorkspaces().catch(() => []);
      const remaining = Array.isArray(res) ? res : [];
      if (remaining.length > 0) {
        setCurrentWorkspace(remaining[0]);
        const remId = remaining[0]._id || remaining[0].id;
        if (remId) {
          localStorage.setItem('taskflow_last_workspace_id', remId);
        }
        navigate('/workspace-select', { replace: true });
      } else {
        setCurrentWorkspace(null);
        localStorage.removeItem('taskflow_last_workspace_id');
        navigate('/onboarding', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId, navigate, setCurrentWorkspace, queryClient]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  // Update workspace details dynamically in state
  const updateWorkspaceState = useCallback((updated: Partial<Workspace>) => {
    setWorkspace((prev: Workspace | null) => {
      if (!prev) return null;
      const nextWs = { ...prev, ...updated } as Workspace;
      setCurrentWorkspace(nextWs);
      return nextWs;
    });
  }, [setCurrentWorkspace]);

  // Determine current user's role in this workspace
  const myMemberObj = members.find((m) => {
    const uId = typeof m.userId === 'object' && m.userId !== null ? m.userId._id : m.userId;
    return String(uId) === String(currentUser?._id);
  });

  const ownerIdStr = typeof workspace?.ownerId === 'object' && workspace?.ownerId !== null ? workspace.ownerId._id : workspace?.ownerId;
  const isCreator = Boolean(currentUser?._id && ownerIdStr && String(ownerIdStr) === String(currentUser?._id));

  // Workspace creator is the Workspace Admin, and invited members have their assigned role
  const myRole: WorkspaceRole = isCreator ? 'admin' : (myMemberObj?.role === 'owner' ? 'admin' : myMemberObj?.role || 'viewer');
  const canManage = isCreator || myRole === 'admin';

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
      setBoards((prev) => prev.filter((board) => (board._id || board.id) !== bId));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to delete board');
    }
  };

  const handleRenameBoard = async (boardId: string, newName: string) => {
    try {
      setRenamingBoard(true);
      await boardService.updateBoard(boardId, { name: newName });
      toast.success('Board renamed successfully');
      setRenameBoardTarget(null);
      setBoards((prev) => prev.map((b) => (b._id || b.id) === boardId ? { ...b, name: newName } : b));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to rename board');
    } finally {
      setRenamingBoard(false);
    }
  };

  const handleUpdateRole = async (userId: string, role: WorkspaceRole) => {
    if (!workspaceId) return;
    try {
      await workspaceService.changeMemberRole(workspaceId, userId, role);
      toast.success('Member role updated');
      setMembers((prev) => prev.map((m) => {
        const uId = typeof m.userId === 'object' && m.userId !== null ? m.userId._id : m.userId;
        return String(uId) === String(userId) ? { ...m, role } : m;
      }));
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
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
      setMembers((prev) => prev.filter((m) => {
        const uId = typeof m.userId === 'object' && m.userId !== null ? m.userId._id : m.userId;
        return String(uId) !== String(userId);
      }));
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleSendInvite = async (email: string, role: WorkspaceRole) => {
    if (!workspaceId || sendingInvite) return;
    try {
      setSendingInvite(true);
      const invite = await workspaceService.inviteMember(workspaceId, { email, role });
      toast.success(`Invite sent to ${email}`, { id: 'invite-toast' });
      setInviteModalOpen(false);
      setInvites((prev) => [invite, ...prev]);
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error.response?.data?.message || 'Failed to send invite';
      toast.error(msg, { id: 'invite-toast' });
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!workspaceId) return;
    try {
      await workspaceService.revokeInvite(workspaceId, inviteId);
      toast.success('Invitation revoked');
      setInvites((prev) => prev.filter((i) => (i._id || i.id) !== inviteId));
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to revoke invite');
    }
  };

  const handleRenameWorkspace = async (newName: string) => {
    if (!workspaceId) return;
    try {
      const updated = await workspaceService.updateWorkspace(workspaceId, { name: newName });
      toast.success('Workspace renamed');
      updateWorkspaceState(updated);
      await refreshWorkspaces();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to rename workspace');
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!workspaceId) return;
    try {
      await deleteWorkspaceAndSync(workspaceId);
    } catch {
      // Error handled in deleteWorkspaceAndSync
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

  if (loading && !workspace) {
    return (
      <div className="flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
        <Sidebar />
        <main className="flex-1 min-w-0 h-screen flex flex-col items-center justify-center gap-3 p-6">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-neutral-400">Loading workspace…</span>
        </main>
      </div>
    );
  }

  if (!workspace) return null;

  const tabs = [
    { id: 'boards', label: 'Boards', icon: 'layoutGrid' },
    { id: 'members', label: 'Members', icon: 'users' },
    { id: 'invitations', label: 'Invitations', icon: 'mail' },
    { id: 'activity', label: 'Activity Logs', icon: 'activity' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <Sidebar />

      <main className="flex-1 min-w-0 h-screen overflow-y-auto p-6 md:p-10">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <WorkspaceAvatar
                name={workspace.name}
                logoUrl={workspace.logoUrl}
                color={workspace.settings?.color || workspace.color}
                size={56}
                roundedClassName="rounded-2xl"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold font-display text-neutral-900 dark:text-neutral-100 truncate max-w-full break-all">
                    {workspace.name}
                  </h1>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 truncate max-w-xl">
                  {workspace.description || 'No description provided.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-neutral-600 dark:text-neutral-400 shrink-0 bg-neutral-100 dark:bg-neutral-900/60 px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800/80">
              <span className="flex items-center gap-1.5">
                <Icon name="layout" size={14} className="text-orange-500" /> {boards.length} boards
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="users" size={14} className="text-blue-500" /> {members.length} members
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
            <div className="space-y-8">
              {/* Analytics Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
                  <div className="flex items-center justify-between text-neutral-400 text-xs font-bold uppercase tracking-wider mb-2">
                    <span>Boards</span>
                    <Icon name="layout" size={18} className="text-orange-500" />
                  </div>
                  <div className="text-2xl font-bold font-display text-neutral-900 dark:text-neutral-100">
                    {boards.length}
                  </div>
                </div>

                <div className="p-4.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
                  <div className="flex items-center justify-between text-neutral-400 text-xs font-bold uppercase tracking-wider mb-2">
                    <span>Members</span>
                    <Icon name="users" size={18} className="text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold font-display text-neutral-900 dark:text-neutral-100">
                    {members.length}
                  </div>
                </div>

                <div className="p-4.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
                  <div className="flex items-center justify-between text-neutral-400 text-xs font-bold uppercase tracking-wider mb-2">
                    <span>Invites</span>
                    <Icon name="mail" size={18} className="text-violet-500" />
                  </div>
                  <div className="text-2xl font-bold font-display text-neutral-900 dark:text-neutral-100">
                    {invites.length}
                  </div>
                </div>

                <div className="p-4.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
                  <div className="flex items-center justify-between text-neutral-400 text-xs font-bold uppercase tracking-wider mb-2">
                    <span>Access Role</span>
                    <Icon name="shield-check" size={18} className="text-emerald-500" />
                  </div>
                  <div className="text-2xl font-bold font-display capitalize text-neutral-900 dark:text-neutral-100">
                    {myRole}
                  </div>
                </div>
              </div>

              {/* Boards Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                      Workspace Boards ({boards.length})
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Select a board to manage tasks, sprints, and team workflows.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateBoardOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer shadow-md transition-all hover:opacity-95"
                    style={{ background: 'linear-gradient(135deg, #FF7A3D, #E8432E)' }}
                  >
                    <Icon name="plus" size={15} /> Create board
                  </button>
                </div>

                {boards.length === 0 ? (
                  <div className="text-center py-14 px-6 bg-white dark:bg-neutral-900 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xs">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
                      <Icon name="layoutGrid" size={26} />
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                      Welcome to your new workspace!
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto mb-6 leading-relaxed">
                      There are no boards in <strong className="text-neutral-800 dark:text-neutral-200 font-semibold break-all">{workspace.name}</strong> yet. Create your first board to start tracking tasks and collaborating with your team.
                    </p>
                    <button
                      type="button"
                      onClick={() => setCreateBoardOpen(true)}
                      className="px-5 py-2.5 rounded-xl font-semibold text-xs text-white shadow-lg cursor-pointer inline-flex items-center gap-2 transition hover:opacity-95"
                      style={{ background: 'linear-gradient(135deg, #FF7A3D, #E8432E)' }}
                    >
                      <Icon name="plus" size={15} /> Create first board
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {boards.map((b) => (
                      <BoardCard
                        key={b._id || b.id}
                        board={b}
                        onOpen={(board) => navigate(`/boards/${board._id || board.id}`)}
                        onRename={(board) => setRenameBoardTarget(board)}
                        onDelete={handleDeleteBoard}
                      />
                    ))}

                    {/* Quick Create Board Card */}
                    <button
                      type="button"
                      onClick={() => setCreateBoardOpen(true)}
                      className="flex flex-col items-center justify-center p-6 min-h-[140px] rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800 hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-500/5 text-neutral-400 hover:text-orange-500 transition-all cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 group-hover:bg-orange-100 dark:group-hover:bg-orange-500/20 flex items-center justify-center mb-2 transition-colors">
                        <Icon name="plus" size={20} />
                      </div>
                      <span className="text-xs font-semibold">Create new board</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <MembersTab
              members={members}
              currentUserId={currentUser?._id}
              creatorId={ownerIdStr}
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

          {activeTab === 'activity' && (
            <ActivityTab workspaceId={workspaceId || ''} />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              ws={workspace}
              myRole={myRole}
              canManage={canManage}
              onRename={handleRenameWorkspace}
              onDelete={handleDeleteWorkspace}
              onLeave={handleLeaveWorkspace}
              onRefresh={loadWorkspaceData}
              onUpdateWorkspace={updateWorkspaceState}
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

      <RenameBoardModal
        board={renameBoardTarget}
        onClose={() => setRenameBoardTarget(null)}
        onSave={handleRenameBoard}
        saving={renamingBoard}
      />
    </div>
  );
};

export default WorkspaceDetailPage;
