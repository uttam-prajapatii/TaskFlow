import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useWorkspace } from '../../../context/WorkspaceContext';
import AppHeader from '../../../components/layout/AppHeader';
import Icon from '../../../components/UI/Icon';
import WorkspaceCard from '../components/WorkspaceCard';
import CreateWorkspaceModal from '../components/CreateWorkspaceModal';
import RenameWorkspaceModal from '../components/RenameWorkspaceModal';
import ConfirmModal from '../../../components/UI/ConfirmModal';
import workspaceService from '../../../services/workspace.service';
import type { Workspace, CreateWorkspacePayload } from '../types';

export const WorkspaceSelectorPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    workspaces,
    currentWorkspace,
    setCurrentWorkspace,
    refreshWorkspaces,
    deleteWorkspaceAndSync,
    loading,
  } = useWorkspace();

  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [renameTarget, setRenameTarget] = useState<Workspace | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);
  const [leaveTarget, setLeaveTarget] = useState<Workspace | null>(null);
  const [actionWorking, setActionWorking] = useState(false);

  React.useEffect(() => {
    if (!loading && workspaces.length === 0) {
      navigate('/onboarding', { replace: true });
    }
  }, [loading, workspaces.length, navigate]);

  const filteredWorkspaces = workspaces.filter((ws) => {
    const query = search.toLowerCase();
    const nameMatch = ws.name.toLowerCase().includes(query);
    const descMatch = (ws.description || '').toLowerCase().includes(query);
    return nameMatch || descMatch;
  });

  const handleOpenWorkspace = (ws: Workspace) => {
    setCurrentWorkspace(ws);
    const wsId = ws._id || ws.id;
    navigate(`/workspaces/${wsId}`);
  };

  const handleCreateWorkspace = async (payload: CreateWorkspacePayload) => {
    try {
      setCreating(true);
      const created = await workspaceService.createWorkspace(payload);
      toast.success(`Workspace "${created.name}" created successfully!`);
      setCreateModalOpen(false);
      await refreshWorkspaces();
      setCurrentWorkspace(created);
      navigate(`/workspaces/${created._id || created.id}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (workspaceId: string, newName: string) => {
    try {
      setActionWorking(true);
      await workspaceService.updateWorkspace(workspaceId, { name: newName });
      toast.success('Workspace renamed successfully');
      setRenameTarget(null);
      await refreshWorkspaces();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to rename workspace');
    } finally {
      setActionWorking(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const targetId = String(deleteTarget._id || deleteTarget.id);
    try {
      setActionWorking(true);
      setDeleteTarget(null);
      await deleteWorkspaceAndSync(targetId);
    } catch {
      // Error is caught & displayed by deleteWorkspaceAndSync
    } finally {
      setActionWorking(false);
    }
  };

  const handleLeave = async () => {
    if (!leaveTarget) return;
    const targetId = String(leaveTarget._id || leaveTarget.id);
    const isCurrent = Boolean(
      currentWorkspace &&
        (String(currentWorkspace._id || '') === targetId || String(currentWorkspace.id || '') === targetId)
    );

    try {
      setActionWorking(true);
      await workspaceService.leaveWorkspace(targetId);
      toast.success(`Left workspace "${leaveTarget.name}" successfully`);
      setLeaveTarget(null);
      if (isCurrent) {
        setCurrentWorkspace(null);
        localStorage.removeItem('taskflow_last_workspace_id');
      }
      await refreshWorkspaces();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to leave workspace');
    } finally {
      setActionWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium text-neutral-400">Loading your workspaces…</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans">
      <AppHeader />

      <main className="flex-1 max-w-5xl mx-auto w-full p-6 md:p-10">
        {/* Header & Create Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold font-display tracking-tight text-neutral-900 dark:text-neutral-100">
              Select a Workspace
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Choose a workspace to access its boards, tasks, and team members.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white cursor-pointer shadow-md transition hover:opacity-95"
              style={{ background: 'linear-gradient(135deg, #FF7A3D, #E8432E)' }}
            >
              <Icon name="plus" size={15} /> Create Workspace
            </button>
          </div>
        </div>

        {/* Live Search Control */}
        <div className="relative mb-6">
          <Icon
            name="search"
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search workspaces by name or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition shadow-2xs placeholder-neutral-400"
          />
        </div>

        {/* Workspaces Grid */}
        {filteredWorkspaces.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white dark:bg-neutral-900 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto mb-3">
              <Icon name="folder" size={24} />
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1">
              {search ? 'No workspaces match your search' : 'No workspaces found'}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-5">
              {search
                ? `No workspace matched "${search}". Try a different keyword.`
                : 'Create your first workspace to start organizing boards and collaborating.'}
            </p>
            {!search && (
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md cursor-pointer inline-flex items-center gap-1.5"
                style={{ background: 'linear-gradient(135deg, #FF7A3D, #E8432E)' }}
              >
                <Icon name="plus" size={14} /> Create workspace
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredWorkspaces.map((ws, index) => (
              <WorkspaceCard
                key={ws._id || ws.id || index}
                ws={ws}
                index={index}
                onOpen={handleOpenWorkspace}
                onRename={(w) => setRenameTarget(w)}
                onDelete={(w) => setDeleteTarget(w)}
                onLeave={(w) => setLeaveTarget(w)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Action Modals */}
      <CreateWorkspaceModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateWorkspace}
        creating={creating}
      />

      <RenameWorkspaceModal
        ws={renameTarget}
        onClose={() => setRenameTarget(null)}
        onSave={handleRename}
        saving={actionWorking}
      />

      <ConfirmModal
        target={deleteTarget ? { name: deleteTarget.name } : null}
        mode="delete"
        working={actionWorking}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      <ConfirmModal
        target={leaveTarget ? { name: leaveTarget.name } : null}
        mode="leave"
        working={actionWorking}
        onClose={() => setLeaveTarget(null)}
        onConfirm={handleLeave}
      />
    </div>
  );
};

export default WorkspaceSelectorPage;
