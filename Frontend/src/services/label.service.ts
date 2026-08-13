import api from './api';
import type { Label } from '../features/board/types';

export const labelService = {
  /**
   * Fetch all labels belonging to a board.
   */
  async getBoardLabels(boardId: string): Promise<Label[]> {
    const response = await api.get(`/api/v1/boards/${boardId}/labels`);
    const resData = response.data?.data;
    if (Array.isArray(resData)) return resData;
    return [];
  },

  /**
   * Create a new label on a board.
   */
  async createLabel(boardId: string, payload: { name: string; color?: string }): Promise<Label> {
    const response = await api.post(`/api/v1/boards/${boardId}/labels`, payload);
    return response.data?.data;
  },

  /**
   * Update an existing label.
   */
  async updateLabel(labelId: string, payload: { name?: string; color?: string }): Promise<Label> {
    const response = await api.patch(`/api/v1/labels/${labelId}`, payload);
    return response.data?.data;
  },

  /**
   * Delete an existing label.
   */
  async deleteLabel(labelId: string): Promise<void> {
    await api.delete(`/api/v1/labels/${labelId}`);
  },
};

export default labelService;
