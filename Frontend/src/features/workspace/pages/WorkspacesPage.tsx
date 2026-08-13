import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Sidebar from '../../../components/layout/Sidebar';
import Icon from '../../../components/UI/Icon';
import DropdownMenu, { type MenuItem } from '../../../components/UI/DropdownMenu';
import ConfirmModal from '../../../components/UI/ConfirmModal';
import WorkspaceCard from '../components/WorkspaceCard';
import WorkspaceSkeleton from '../components/WorkspaceSkeleton';
import CreateWorkspaceModal from '../components/CreateWorkspaceModal';
import RenameWorkspaceModal from '../components/RenameWorkspaceModal';
import workspaceService from '../../../services/workspace.service';
import { useWorkspace } from '../../../context/WorkspaceContext';
import type { Workspace, CreateWorkspacePayload } from '../types';

export const WorkspacesPage: React.FC = () => {
  const navigate = useNavigate();
  const { workspaces, currentWorkspace, loading, setCurrentWorkspace, refreshWorkspaces, deleteWorkspaceAndSync } = useWorkspace();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'boards'>('recent');

  const [sortOpen, setSortOpen] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
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

  const filteredWorkspaces = useMemo(() => {
    let list = workspaces.filter((w) => {
      const query = search.toLowerCase();
      const nameMatch = w.name.toLowerCase().includes(query);
      const descMatch = (w.description || '').toLowerCase().includes(query);
      return nameMatch || descMatch;
    });

    if (sortBy === 'recent') {
      list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'name') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'boards') {
      list = [...list].sort((a, b) => (b.boardCount || 0) - (a.boardCount || 0));
    }

    return list;
  }, [workspaces, search, sortBy]);

  const handleCreate = async (payload: CreateWorkspacePayload) => {
    try {
      setCreating(true);
      const created = await workspaceService.createWorkspace(payload);
      toast.success(`Workspace "${created.name}" created successfully!`);
      setCreateOpen(false);
      await refreshWorkspaces();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to create workspace.');
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
      toast.error(error.response?.data?.message || 'Failed to rename workspace.');
    } finally {
      setActionWorking(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const wsId = deleteTarget._id || deleteTarget.id!;
    try {
      setActionWorking(true);
      setDeleteTarget(null);
      await deleteWorkspaceAndSync(wsId);
    } catch {
      // Error handled inside deleteWorkspaceAndSync
    } finally {
      setActionWorking(false);
    }
  };

  const handleLeave = async () => {
    if (!leaveTarget) return;
    const wsId = leaveTarget._id || leaveTarget.id!;
    const isCurrent = Boolean(
      currentWorkspace &&
        (String(currentWorkspace._id || '') === wsId || String(currentWorkspace.id || '') === wsId)
    );
    try {
      setActionWorking(true);
      await workspaceService.leaveWorkspace(wsId);
      toast.success(`Left workspace "${leaveTarget.name}".`);
      setLeaveTarget(null);
      if (isCurrent) {
        setCurrentWorkspace(null);
        localStorage.removeItem('taskflow_last_workspace_id');
        navigate('/workspace-select', { replace: true });
      }
      await refreshWorkspaces();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to leave workspace.');
    } finally {
      setActionWorking(false);
    }
  };

  const sortItems: MenuItem[] = [
    {
      label: 'Recently created',
      icon: sortBy === 'recent' ? 'check' : undefined,
      onClick: () => setSortBy('recent'),
    },
    {
      label: 'Name (A–Z)',
      icon: sortBy === 'name' ? 'check' : undefined,
      onClick: () => setSortBy('name'),
    },
    {
      label: 'Most boards',
      icon: sortBy === 'boards' ? 'check' : undefined,
      onClick: () => setSortBy('boards'),
    },
  ];



  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <Sidebar />

      <main className="flex-1 min-w-0 h-screen overflow-y-auto p-6 md:p-10">
        <div className="max-w-6xl mx-auto">
          {/* Header section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-display text-neutral-900 dark:text-neutral-100">
                Workspaces
              </h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Manage your team projects, boards, and access controls.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #FF7A3D, #E8432E)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 10,
                padding: '10px 18px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 6px 16px rgba(232,67,46,0.28)',
              }}
              className="shrink-0 transition-transform active:scale-95"
            >
              <Icon name="plus" size={16} /> Create workspace
            </button>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Icon
                name="search"
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search workspaces…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <Icon name="x" size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">


              <DropdownMenu
                open={sortOpen}
                setOpen={setSortOpen}
                trigger={
                  <button
                    type="button"
                    onClick={() => setSortOpen((o) => !o)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 transition-colors"
                  >
                    Sort: {sortBy === 'recent' ? 'Recent' : sortBy === 'name' ? 'Name' : 'Boards'}
                    <Icon name="chevron-down" size={12} />
                  </button>
                }
                items={sortItems}
              />
            </div>
          </div>

          {/* Grid or Skeleton or Empty State */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <WorkspaceSkeleton key={n} />
              ))}
            </div>
          ) : filteredWorkspaces.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white dark:bg-neutral-900 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
              <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto mb-3">
                <Icon name="folder" size={24} />
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                No workspaces found
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-4">
                {search
                  ? 'No workspaces match your search criteria. Try clearing the search query.'
                  : 'Get started by creating your first team workspace.'}
              </p>
              {search ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 transition-colors"
                >
                  Clear search
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
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
                  Create workspace
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredWorkspaces.map((ws, index) => (
                <WorkspaceCard
                  key={ws._id || ws.id || index}
                  ws={ws}
                  index={index}
                  onOpen={(w) => {
                    setCurrentWorkspace(w);
                    navigate(`/workspaces/${w._id || w.id}`);
                  }}
                  onRename={(w) => setRenameTarget(w)}
                  onDelete={(w) => setDeleteTarget(w)}
                  onLeave={(w) => setLeaveTarget(w)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <CreateWorkspaceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
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

export default WorkspacesPage;
