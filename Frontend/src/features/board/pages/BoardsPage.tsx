import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Sidebar from '../../../components/layout/Sidebar';
import Icon from '../../../components/UI/Icon';
import BoardCard from '../components/BoardCard';
import CreateBoardModal from '../components/CreateBoardModal';
import workspaceService from '../../../services/workspace.service';
import boardService from '../../../services/board.service';
import { useWorkspace } from '../../../context/WorkspaceContext';
import type { Workspace } from '../../workspace/types';
import type { Board, CreateBoardPayload } from '../types';

export const BoardsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentWorkspace, setCurrentWorkspace, workspaces: contextWorkspaces } = useWorkspace();

  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [search, setSearch] = useState('');
  const [selectedWsId, setSelectedWsId] = useState<string>('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const wsList = contextWorkspaces.length > 0 ? contextWorkspaces : await workspaceService.listWorkspaces();
      setWorkspaces(wsList);

      let allBoards: Board[] = [];
      for (const ws of wsList) {
        try {
          const wsId = ws._id || ws.id!;
          const bList = await boardService.listWorkspaceBoards(wsId);
          allBoards = [...allBoards, ...bList];
        } catch {
          // ignore individual workspace fetch error
        }
      }
      setBoards(allBoards);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to load boards');
    } finally {
      setLoading(false);
    }
  }, [contextWorkspaces]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sync workspace filter if currentWorkspace changes
  useEffect(() => {
    if (currentWorkspace) {
      setSelectedWsId(currentWorkspace._id || currentWorkspace.id || 'all');
    }
  }, [currentWorkspace]);

  const filteredBoards = useMemo(() => {
    let list = boards;

    // Filter by selected workspace
    if (selectedWsId !== 'all') {
      list = list.filter((b) => {
        const bWsId = typeof b.workspaceId === 'object' && b.workspaceId !== null ? b.workspaceId._id : b.workspaceId;
        return bWsId === selectedWsId;
      });
    }

    // Filter by search query
    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter((b) => {
        const title = (b.name || b.title || '').toLowerCase();
        const desc = (b.description || '').toLowerCase();
        return title.includes(query) || desc.includes(query);
      });
    }

    return list;
  }, [boards, selectedWsId, search]);

  const handleCreateBoard = async (payload: CreateBoardPayload) => {
    try {
      setCreating(true);
      const created = await boardService.createBoard(payload.workspaceId, payload);
      toast.success(`Board "${created.name || created.title}" created successfully!`);
      setCreateOpen(false);
      navigate(`/boards/${created._id || created.id}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to create board.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBoard = async (b: Board) => {
    const bId = b._id || b.id!;
    try {
      await boardService.deleteBoard(bId);
      toast.success('Board deleted');
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to delete board');
    }
  };

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <Sidebar />

      <main className="flex-1 min-w-0 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-display text-neutral-900 dark:text-neutral-100">
                Boards
              </h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Kanban project boards across your team workspaces.
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
              <Icon name="plus" size={16} /> Create board
            </button>
          </div>

          {/* Search & Workspace Scope Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Icon
                name="search"
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search boards…"
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
              <span className="text-xs text-neutral-400 font-medium">Workspace:</span>
              <select
                value={selectedWsId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedWsId(val);
                  if (val !== 'all') {
                    const match = workspaces.find((w) => (w._id || w.id) === val);
                    if (match) setCurrentWorkspace(match);
                  }
                }}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 outline-none focus:ring-2 focus:ring-orange-500/20"
              >
                <option value="all">All Workspaces</option>
                {workspaces.map((w) => (
                  <option key={w._id || w.id} value={w._id || w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Content grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="h-40 rounded-2xl bg-neutral-200 dark:bg-neutral-900 animate-pulse border border-neutral-200 dark:border-neutral-800"
                />
              ))}
            </div>
          ) : filteredBoards.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white dark:bg-neutral-900 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
              <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto mb-3">
                <Icon name="layoutGrid" size={24} />
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                No boards found
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-4">
                {search || selectedWsId !== 'all'
                  ? 'No boards match your search or workspace filter.'
                  : 'Get started by creating your first Kanban board.'}
              </p>
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
                Create board
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredBoards.map((b) => (
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
      </main>

      <CreateBoardModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreateBoard}
        workspaces={workspaces}
        defaultWorkspaceId={selectedWsId !== 'all' ? selectedWsId : currentWorkspace?._id}
        creating={creating}
      />
    </div>
  );
};

export default BoardsPage;
