import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import workspaceService from '../services/workspace.service';
import boardService from '../services/board.service';
import type { Workspace } from '../features/workspace/types';
import type { Board } from '../features/board/types';
import useAuth from '../hooks/useAuth';

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  boards: Board[];
  loading: boolean;
  refreshWorkspaces: () => Promise<void>;
  refreshBoards: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchWorkspaces = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const wsList = await workspaceService.listWorkspaces();
      setWorkspaces(wsList);
      if (wsList.length > 0 && !currentWorkspace) {
        setCurrentWorkspace(wsList[0]);
      }
    } catch (err) {
      console.error('Failed to fetch workspaces in WorkspaceContext:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, currentWorkspace]);

  const fetchBoards = useCallback(async () => {
    if (!currentWorkspace) return;
    const wsId = currentWorkspace._id || currentWorkspace.id;
    if (!wsId) return;
    try {
      const bList = await boardService.listWorkspaceBoards(wsId);
      setBoards(bList);
    } catch (err) {
      console.error('Failed to fetch boards for workspace:', err);
      setBoards([]);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWorkspaces();
    } else {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setBoards([]);
    }
  }, [isAuthenticated, fetchWorkspaces]);

  useEffect(() => {
    if (currentWorkspace) {
      fetchBoards();
    }
  }, [currentWorkspace, fetchBoards]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        setCurrentWorkspace,
        boards,
        loading,
        refreshWorkspaces: fetchWorkspaces,
        refreshBoards: fetchBoards,
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
