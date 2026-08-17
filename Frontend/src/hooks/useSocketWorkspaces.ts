import { useEffect } from 'react';
import { getSocket } from '../lib/socket';
import useAuth from './useAuth';
import type { Workspace } from '../features/workspace/types';
import type { Board } from '../features/board/types';

export const useSocketWorkspaces = (
  workspaces: Workspace[],
  setBoards: React.Dispatch<React.SetStateAction<Board[]>>
) => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || workspaces.length === 0) return;

    const socket = getSocket();

    // Join all workspace rooms
    for (const ws of workspaces) {
      const wsId = ws._id || ws.id;
      if (wsId) {
        socket.emit('workspace:join', wsId);
      }
    }

    const handleBoardCreated = (newBoard: Board) => {
      setBoards((prev) => {
        if (prev.some((b) => (b._id || b.id) === (newBoard._id || newBoard.id))) return prev;
        return [...prev, newBoard];
      });
    };

    const handleBoardUpdated = (updatedBoard: Board) => {
      setBoards((prev) =>
        prev.map((b) => ((b._id || b.id) === (updatedBoard._id || updatedBoard.id) ? updatedBoard : b))
      );
    };

    const handleBoardDeleted = ({ boardId }: { boardId: string }) => {
      setBoards((prev) => prev.filter((b) => (b._id || b.id) !== boardId));
    };

    socket.on('board:created', handleBoardCreated);
    socket.on('board:updated', handleBoardUpdated);
    socket.on('board:deleted', handleBoardDeleted);

    return () => {
      // Leave all workspace rooms
      for (const ws of workspaces) {
        const wsId = ws._id || ws.id;
        if (wsId) {
          socket.emit('workspace:leave', wsId);
        }
      }
      socket.off('board:created', handleBoardCreated);
      socket.off('board:updated', handleBoardUpdated);
      socket.off('board:deleted', handleBoardDeleted);
    };
  }, [isAuthenticated, workspaces, setBoards]);
};

export default useSocketWorkspaces;
