import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import boardService from '../services/board.service';
import type { Workspace } from '../features/workspace/types';
import type { Board } from '../features/board/types';
import useAuth from '../hooks/useAuth';
import { useWorkspaces, useWorkspaceMutations } from '../hooks/useWorkspaces';

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  currentWorkspaceId: string | null;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  boards: Board[];
  loading: boolean;
  refreshWorkspaces: () => Promise<void>;
  refreshBoards: () => Promise<void>;
  deleteWorkspaceAndSync: (workspaceId: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: fetchedWorkspaces = [], isLoading: wsLoading, refetch: refetchWorkspaces } = useWorkspaces(isAuthenticated);
  const { deleteWorkspaceMutation } = useWorkspaceMutations();

  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardsLoading, setBoardsLoading] = useState<boolean>(false);

  const currentWorkspaceId = currentWorkspace?._id || currentWorkspace?.id || null;

  const setCurrentWorkspace = useCallback((ws: Workspace | null) => {
    setCurrentWorkspaceState(ws);
    if (ws) {
      const id = ws._id || ws.id;
      if (id) {
        localStorage.setItem('taskflow_last_workspace_id', id);
      }
    } else {
      localStorage.removeItem('taskflow_last_workspace_id');
    }
  }, []);

  // Sync current workspace with fetched workspaces & localStorage
  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentWorkspaceState(null);
      localStorage.removeItem('taskflow_last_workspace_id');
      setBoards([]);
      return;
    }

    if (wsLoading) return;

    const lastId = localStorage.getItem('taskflow_last_workspace_id');

    if (fetchedWorkspaces.length > 0) {
      const matched = lastId
        ? fetchedWorkspaces.find((w) => String(w._id || w.id) === String(lastId))
        : null;

      if (matched) {
        setCurrentWorkspaceState(matched);
      } else if (lastId) {
        // Workspace was previously selected but no longer exists (deleted)
        localStorage.removeItem('taskflow_last_workspace_id');
        setCurrentWorkspaceState(null);
        toast.error('Selected workspace is no longer available');
        if (!location.pathname.startsWith('/workspace-select')) {
          navigate('/workspace-select', { replace: true });
        }
      }
    } else {
      setCurrentWorkspaceState(null);
      localStorage.removeItem('taskflow_last_workspace_id');
    }
  }, [isAuthenticated, fetchedWorkspaces, wsLoading, navigate, location.pathname]);

  const fetchBoards = useCallback(async () => {
    if (!currentWorkspaceId) {
      setBoards([]);
      return;
    }
    try {
      setBoardsLoading(true);
      const bList = await boardService.listWorkspaceBoards(currentWorkspaceId);
      setBoards(bList);
    } catch (err) {
      console.error('Failed to fetch boards for workspace:', err);
      setBoards([]);
    } finally {
      setBoardsLoading(false);
    }
  }, [currentWorkspaceId]);

  useEffect(() => {
    if (currentWorkspaceId) {
      fetchBoards();
    }
  }, [currentWorkspaceId, fetchBoards]);

  const refreshWorkspaces = useCallback(async () => {
    await refetchWorkspaces();
  }, [refetchWorkspaces]);

  const refreshBoards = useCallback(async () => {
    await fetchBoards();
  }, [fetchBoards]);

  const deleteWorkspaceAndSync = useCallback(
    async (workspaceId: string) => {
      const targetId = String(workspaceId);
      const isCurrent = Boolean(
        currentWorkspace &&
          (String(currentWorkspace._id || '') === targetId || String(currentWorkspace.id || '') === targetId)
      );

      try {
        await deleteWorkspaceMutation.mutateAsync(workspaceId);
        toast.success('Workspace deleted successfully.');
        if (isCurrent) {
          setCurrentWorkspace(null);
          localStorage.removeItem('taskflow_last_workspace_id');
          navigate('/workspace-select', { replace: true });
        }
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } } };
        toast.error(error.response?.data?.message || 'Failed to delete workspace');
        throw err;
      }
    },
    [currentWorkspace, deleteWorkspaceMutation, setCurrentWorkspace, navigate]
  );

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces: fetchedWorkspaces,
        currentWorkspace,
        currentWorkspaceId,
        setCurrentWorkspace,
        boards,
        loading: wsLoading || boardsLoading,
        refreshWorkspaces,
        refreshBoards,
        deleteWorkspaceAndSync,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

export default WorkspaceContext;
