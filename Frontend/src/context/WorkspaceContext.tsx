import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import boardService from '../services/board.service';
import workspaceService from '../services/workspace.service';
import type { Workspace } from '../features/workspace/types';
import type { Board } from '../features/board/types';
import useAuth from '../hooks/useAuth';
import { useWorkspaces, useWorkspaceMutations } from '../hooks/useWorkspaces';

const EMPTY_WORKSPACES: Workspace[] = [];

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
  updateWorkspaceInState: (workspaceId: string, updates: Partial<Workspace>) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: fetchedWorkspacesData, isLoading: wsLoading, refetch: refetchWorkspaces } = useWorkspaces(isAuthenticated);
  const fetchedWorkspaces = fetchedWorkspacesData || EMPTY_WORKSPACES;
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
      setCurrentWorkspaceState((prev) => (prev !== null ? null : prev));
      localStorage.removeItem('taskflow_last_workspace_id');
      setBoards((prev) => (prev.length > 0 ? [] : prev));
      return;
    }

    if (wsLoading) return;

    const lastId = localStorage.getItem('taskflow_last_workspace_id');

    if (fetchedWorkspaces.length > 0) {
      const matched = lastId
        ? fetchedWorkspaces.find((w) => String(w._id || w.id) === String(lastId))
        : null;

      if (matched) {
        setCurrentWorkspaceState((prev) => {
          if (!prev) return matched;
          const prevId = String(prev._id || prev.id);
          const matchedId = String(matched._id || matched.id);
          if (prevId === matchedId && JSON.stringify(prev) === JSON.stringify(matched)) {
            return prev;
          }
          return matched;
        });
      } else {
        // Workspace was previously selected but no longer exists (deleted/unavailable)
        const fallback = fetchedWorkspaces[0];
        setCurrentWorkspaceState(fallback);
        const fbId = fallback._id || fallback.id;
        if (fbId) {
          localStorage.setItem('taskflow_last_workspace_id', fbId);
        }
      }
    } else {
      setCurrentWorkspaceState(null);
      localStorage.removeItem('taskflow_last_workspace_id');
      // If user is on a workspace-specific or board page but has 0 workspaces, safely redirect to onboarding
      const pathname = location.pathname;
      const isWorkspaceOrBoardPage = pathname.startsWith('/workspaces/') || pathname.startsWith('/boards');
      if (isWorkspaceOrBoardPage && !pathname.startsWith('/workspaces/manage') && !pathname.startsWith('/workspaces/invite/')) {
        navigate('/onboarding', { replace: true });
      }
    }
  }, [isAuthenticated, fetchedWorkspaces, wsLoading, navigate, location.pathname]);

  const fetchBoards = useCallback(async () => {
    if (!currentWorkspaceId) {
      setBoards((prev) => (prev.length > 0 ? [] : prev));
      return;
    }
    try {
      setBoardsLoading(true);
      const bList = await boardService.listWorkspaceBoards(currentWorkspaceId);
      setBoards(bList);
    } catch (err) {
      console.error('Failed to fetch boards for workspace:', err);
      setBoards((prev) => (prev.length > 0 ? [] : prev));
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

        // Remove from localStorage if matching deleted workspace
        const storedId = localStorage.getItem('taskflow_last_workspace_id');
        if (storedId === targetId) {
          localStorage.removeItem('taskflow_last_workspace_id');
        }

        // Fetch fresh workspaces to determine fallback & safe redirect
        const res = await workspaceService.listWorkspaces().catch(() => []);
        const remainingWorkspaces = Array.isArray(res) ? res : [];

        if (remainingWorkspaces.length > 0) {
          const fallback = remainingWorkspaces[0];
          if (isCurrent || storedId === targetId) {
            setCurrentWorkspaceState(fallback);
            const fbId = fallback._id || fallback.id;
            if (fbId) {
              localStorage.setItem('taskflow_last_workspace_id', fbId);
            }
          }
          navigate('/workspace-select', { replace: true });
        } else {
          setCurrentWorkspaceState(null);
          localStorage.removeItem('taskflow_last_workspace_id');
          navigate('/onboarding', { replace: true });
        }
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } } };
        toast.error(error.response?.data?.message || 'Failed to delete workspace');
        throw err;
      }
    },
    [currentWorkspace, deleteWorkspaceMutation, navigate]
  );

  const updateWorkspaceInState = useCallback((workspaceId: string, updates: Partial<Workspace>) => {
    setCurrentWorkspaceState((prev) => {
      if (!prev) return null;
      const prevId = String(prev._id || prev.id);
      if (prevId === String(workspaceId)) {
        return { ...prev, ...updates };
      }
      return prev;
    });
  }, []);

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
        updateWorkspaceInState,
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
