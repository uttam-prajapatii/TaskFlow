import api from './api';
import type { Task, CreateTaskPayload, UpdateTaskPayload, MoveTaskPayload, ActivityLog } from '../features/board/types';

export const taskService = {
  // Get tasks for a board
  async getBoardTasks(boardId: string): Promise<Task[]> {
    const response = await api.get(`/api/v1/boards/${boardId}/tasks`);
    const resData = response.data?.data;
    if (Array.isArray(resData)) return resData;
    if (resData?.tasks && Array.isArray(resData.tasks)) return resData.tasks;
    return [];
  },

  // Create a task inside a list
  async createTask(listId: string, payload: CreateTaskPayload): Promise<Task> {
    const response = await api.post(`/api/v1/lists/${listId}/tasks`, payload);
    return response.data?.data;
  },

  // Get details of a single task
  async getTaskDetails(taskId: string): Promise<Task> {
    const response = await api.get(`/api/v1/tasks/${taskId}`);
    return response.data?.data;
  },

  // Update task details
  async updateTask(taskId: string, payload: UpdateTaskPayload): Promise<Task> {
    const response = await api.patch(`/api/v1/tasks/${taskId}`, payload);
    return response.data?.data;
  },

  // Move task to a different list / position
  async moveTask(taskId: string, payload: MoveTaskPayload): Promise<Task> {
    const response = await api.patch(`/api/v1/tasks/${taskId}/move`, payload);
    return response.data?.data;
  },

  // Search tasks in a board
  async searchTasks(boardId: string, query: string): Promise<Task[]> {
    const response = await api.get(`/api/v1/boards/${boardId}/tasks/search`, {
      params: { q: query },
    });
    return response.data?.data || [];
  },

  // Archive task
  async archiveTask(taskId: string): Promise<Task> {
    const response = await api.post(`/api/v1/tasks/${taskId}/archive`);
    return response.data?.data;
  },

  // Restore archived task
  async restoreTask(taskId: string): Promise<Task> {
    const response = await api.post(`/api/v1/tasks/${taskId}/restore`);
    return response.data?.data;
  },

  // Checklist operations: action can be 'add', 'toggle', 'delete', 'update'
  async checklistOperation(taskId: string, action: string, payload: Record<string, unknown>): Promise<Task> {
    const response = await api.patch(`/api/v1/tasks/${taskId}/checklist`, { action, ...payload });
    return response.data?.data;
  },

  // Add assignee
  async addAssignee(taskId: string, userId: string): Promise<Task> {
    const response = await api.post(`/api/v1/tasks/${taskId}/assignees`, { userId });
    return response.data?.data;
  },

  // Remove assignee
  async removeAssignee(taskId: string, userId: string): Promise<Task> {
    const response = await api.delete(`/api/v1/tasks/${taskId}/assignees/${userId}`);
    return response.data?.data;
  },

  // Upload attachment
  async uploadAttachment(taskId: string, formData: FormData): Promise<Task> {
    const response = await api.post(`/api/v1/tasks/${taskId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data?.data;
  },

  // Delete attachment
  async deleteAttachment(taskId: string, attachmentId: string): Promise<Task> {
    const response = await api.delete(`/api/v1/tasks/${taskId}/attachments/${attachmentId}`);
    return response.data?.data;
  },

  // Delete task
  async deleteTask(taskId: string): Promise<void> {
    await api.delete(`/api/v1/tasks/${taskId}`);
  },

  // Get activity logs for a task
  async getTaskActivityLogs(taskId: string): Promise<ActivityLog[]> {
    const response = await api.get(`/api/v1/tasks/${taskId}/activity-logs`);
    return response.data?.data?.logs || [];
  },
};

export default taskService;
