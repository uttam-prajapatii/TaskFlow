import api from './api';
import type { BoardList } from '../features/board/types';

export const listService = {
  /**
   * Get all active lists for a board.
   */
  async getBoardLists(boardId: string): Promise<BoardList[]> {
    const response = await api.get(`/api/v1/boards/${boardId}/lists`);
    const resData = response.data?.data ?? response.data;
    if (Array.isArray(resData)) return resData;
    if (resData?.lists && Array.isArray(resData.lists)) return resData.lists;
    return [];
  },

  /**
   * Create a new list in a board.
   */
  async createList(
    boardId: string,
    payload: { name: string; position?: number }
  ): Promise<BoardList> {
    const response = await api.post(`/api/v1/boards/${boardId}/lists`, payload);
    return response.data?.data ?? response.data;
  },

  /**
   * Rename a list.
   */
  async renameList(listId: string, name: string): Promise<BoardList> {
    const response = await api.patch(`/api/v1/lists/${listId}`, { name });
    return response.data?.data ?? response.data;
  },

  /**
   * Reorder a list.
   */
  async reorderList(listId: string, position: number): Promise<BoardList> {
    const response = await api.patch(`/api/v1/lists/${listId}/reorder`, { position });
    return response.data?.data ?? response.data;
  },

  /**
   * Delete a list.
   */
  async deleteList(listId: string): Promise<void> {
    await api.delete(`/api/v1/lists/${listId}`);
  },

  /**
   * Archive a list.
   */
  async archiveList(listId: string): Promise<BoardList> {
    const response = await api.post(`/api/v1/lists/${listId}/archive`);
    return response.data?.data ?? response.data;
  },

  /**
   * Restore an archived list.
   */
  async restoreList(listId: string): Promise<BoardList> {
    const response = await api.post(`/api/v1/lists/${listId}/restore`);
    return response.data?.data ?? response.data;
  },
};

export default listService;
