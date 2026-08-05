import api from './api';
import type { Task, CreateTaskPayload, UpdateTaskPayload, MoveTaskPayload } from '../features/board/types';

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

  // Delete task
  async deleteTask(taskId: string): Promise<void> {
    await api.delete(`/api/v1/tasks/${taskId}`);
  },
};

export default taskService;
