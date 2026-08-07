import api from './api';
import type { Board, CreateBoardPayload, UpdateBoardPayload } from '../features/board/types';

export const boardService = {
  // Get all boards inside a workspace
  async listWorkspaceBoards(workspaceId: string): Promise<Board[]> {
    const response = await api.get(`/api/v1/workspaces/${workspaceId}/boards`);
    const resData = response.data?.data;
    if (Array.isArray(resData)) return resData;
    if (resData?.boards && Array.isArray(resData.boards)) return resData.boards;
    return [];
  },

  // Create a board in a workspace
  async createBoard(workspaceId: string, payload: CreateBoardPayload): Promise<Board> {
    const response = await api.post(`/api/v1/workspaces/${workspaceId}/boards`, payload);
    return response.data?.data;
  },

  // Get single board details
  async getBoardDetails(boardId: string): Promise<Board> {
    const response = await api.get(`/api/v1/boards/${boardId}`);
    return response.data?.data;
  },

  // Update board info
  async updateBoard(boardId: string, payload: UpdateBoardPayload): Promise<Board> {
    const response = await api.patch(`/api/v1/boards/${boardId}`, payload);
    return response.data?.data;
  },

  // Archive board
  async archiveBoard(boardId: string): Promise<Board> {
    const response = await api.post(`/api/v1/boards/${boardId}/archive`);
    return response.data?.data;
  },

  // Restore archived board
  async restoreBoard(boardId: string): Promise<Board> {
    const response = await api.post(`/api/v1/boards/${boardId}/restore`);
    return response.data?.data;
  },

  // Delete board
  async deleteBoard(boardId: string): Promise<void> {
    await api.delete(`/api/v1/boards/${boardId}`);
  },
};

export default boardService;
