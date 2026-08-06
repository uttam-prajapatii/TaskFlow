import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import useAuth from '../../../hooks/useAuth';
import { useWorkspace } from '../../../context/WorkspaceContext';
import AppHeader from '../../../components/layout/AppHeader';
import Icon from '../../../components/UI/Icon';
import Badge from '../../../components/UI/Badge';
import { initials } from '../../../components/UI/Avatar';
import { getColorHex } from '../components/WorkspaceCard';
import CreateWorkspaceModal from '../components/CreateWorkspaceModal';
import workspaceService from '../../../services/workspace.service';
import type { CreateWorkspacePayload, WorkspaceRole } from '../types';

export const WorkspaceSelectorPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { workspaces, setCurrentWorkspace, refreshWorkspaces, loading } = useWorkspace();

  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const filteredWorkspaces = workspaces.filter((ws) => {
    const query = search.toLowerCase();
    const nameMatch = ws.name.toLowerCase().includes(query);
    const descMatch = (ws.description || '').toLowerCase().includes(query);
    return nameMatch || descMatch;
  });

  const handleOpenWorkspace = (ws: (typeof workspaces)[0]) => {
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
        {/* Header & Search Bar */}
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
              onClick={() => navigate('/workspaces/manage')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold transition cursor-pointer shadow-2xs"
            >
              <Icon name="settings" size={15} /> Manage Workspaces
            </button>
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

        {/* Live Search & Filter Control */}
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

        {/* Workspaces List / Grid */}
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
            {filteredWorkspaces.map((ws) => {
              const hex = getColorHex(ws.settings?.color || ws.color);
              const visibility = ws.settings?.visibility || ws.visibility || 'private';

              const isOwner =
                ws.ownerId === user?._id ||
                (typeof ws.ownerId === 'object' && ws.ownerId !== null && ws.ownerId._id === user?._id);

              const myMember = ws.members?.find((m) => {
                const uId = typeof m.userId === 'object' && m.userId !== null ? m.userId._id : m.userId;
                return String(uId) === String(user?._id);
              });

              const role: WorkspaceRole = isOwner ? 'owner' : myMember?.role || 'member';
              const memberCount = ws.members?.length || 1;
              const boardCount = ws.boardCount ?? 0;

              return (
                <div
                  key={ws._id || ws.id}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 hover:border-orange-300 dark:hover:border-orange-900/50 hover:shadow-lg transition-all duration-200 flex flex-col justify-between group"
                >
                  <div>
                    {/* Header Strip */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: `linear-gradient(135deg, ${hex}, ${hex}CC)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: 16,
                          }}
                          className="shrink-0 shadow-xs group-hover:scale-105 transition-transform"
                        >
                          {initials(ws.name)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 truncate max-w-[200px]">
                              {ws.name}
                            </h3>
                            <Badge tone={visibility === 'public' ? 'success' : 'neutral'}>
                              {visibility === 'public' ? 'Public' : 'Private'}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-neutral-400 capitalize font-medium">
                            Role: {role}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-4">
                      {ws.description || 'No description provided for this workspace.'}
                    </p>
                  </div>

                  {/* Footer Strip */}
                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-neutral-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Icon name="layout" size={13} className="text-neutral-400" /> {boardCount} boards
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon name="users" size={13} className="text-neutral-400" /> {memberCount} members
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenWorkspace(ws)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-500 text-orange-600 dark:text-orange-400 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-2xs group-hover:bg-orange-500 group-hover:text-white"
                    >
                      Open Workspace <Icon name="arrow-right" size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <CreateWorkspaceModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateWorkspace}
        creating={creating}
      />
    </div>
  );
};

export default WorkspaceSelectorPage;
