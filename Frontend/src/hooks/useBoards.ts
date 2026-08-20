import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import boardService from '../services/board.service';
import type { Board, CreateBoardPayload, UpdateBoardPayload } from '../features/board/types';

export const useWorkspaceBoards = (workspaceId?: string | null, enabled = true) => {
  return useQuery({
    queryKey: ['workspace-boards', workspaceId],
    queryFn: () => (workspaceId ? boardService.listWorkspaceBoards(workspaceId) : Promise.resolve([])),
    enabled: Boolean(workspaceId) && enabled,
    staleTime: 1000 * 60, // 1 minute stale time for cached board lists
    gcTime: 1000 * 60 * 10,
  });
};

export const useBoardDetails = (boardId?: string | null, enabled = true) => {
  return useQuery({
    queryKey: ['board', boardId],
    queryFn: () => (boardId ? boardService.getBoardDetails(boardId) : Promise.reject('No board ID')),
    enabled: Boolean(boardId) && enabled,
    staleTime: 1000 * 30, // 30s
  });
};

export const useBoardMutations = () => {
  const queryClient = useQueryClient();

  const createBoardMutation = useMutation({
    mutationFn: ({ workspaceId, payload }: { workspaceId: string; payload: CreateBoardPayload }) =>
      boardService.createBoard(workspaceId, payload),
    onSuccess: (newBoard, { workspaceId }) => {
      queryClient.setQueryData<Board[]>(['workspace-boards', workspaceId], (old) =>
        old ? [newBoard, ...old] : [newBoard]
      );
      queryClient.invalidateQueries({ queryKey: ['workspace-boards', workspaceId] });
    },
  });

  const updateBoardMutation = useMutation({
    mutationFn: ({ boardId, payload }: { boardId: string; payload: UpdateBoardPayload }) =>
      boardService.updateBoard(boardId, payload),
    onSuccess: (updatedBoard) => {
      const wsId = typeof updatedBoard.workspaceId === 'object' && updatedBoard.workspaceId !== null
        ? updatedBoard.workspaceId._id
        : updatedBoard.workspaceId;

      if (wsId) {
        queryClient.setQueryData<Board[]>(['workspace-boards', wsId], (old) =>
          old ? old.map((b) => ((b._id || b.id) === (updatedBoard._id || updatedBoard.id) ? updatedBoard : b)) : [updatedBoard]
        );
        queryClient.invalidateQueries({ queryKey: ['workspace-boards', wsId] });
      }
      queryClient.setQueryData(['board', updatedBoard._id || updatedBoard.id], updatedBoard);
      queryClient.invalidateQueries({ queryKey: ['board', updatedBoard._id || updatedBoard.id] });
    },
  });

  const deleteBoardMutation = useMutation({
    mutationFn: ({ boardId, workspaceId }: { boardId: string; workspaceId?: string }) =>
      boardService.deleteBoard(boardId),
    onSuccess: (_data, { boardId, workspaceId }) => {
      if (workspaceId) {
        queryClient.setQueryData<Board[]>(['workspace-boards', workspaceId], (old) =>
          old ? old.filter((b) => (b._id || b.id) !== boardId) : []
        );
        queryClient.invalidateQueries({ queryKey: ['workspace-boards', workspaceId] });
      }
      queryClient.removeQueries({ queryKey: ['board', boardId] });
      queryClient.removeQueries({ queryKey: ['board-lists', boardId] });
      queryClient.removeQueries({ queryKey: ['board-tasks', boardId] });
    },
  });

  return {
    createBoardMutation,
    updateBoardMutation,
    deleteBoardMutation,
  };
};

export default useWorkspaceBoards;
