import api from './api';

export interface NotificationPayload {
  taskId?: string;
  taskTitle?: string;
  boardId?: string;
  workspaceId?: string;
  actorName?: string;
  message?: string;
  commentSnippet?: string;
  [key: string]: unknown;
}

export interface NotificationItem {
  _id: string;
  userId: string;
  type: 'invite' | 'task' | 'board' | 'system';
  payload: NotificationPayload;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsListResponse {
  notifications: NotificationItem[];
  total: number;
  page: number;
  limit: number;
}

export interface NotificationParams {
  page?: number;
  limit?: number;
  isRead?: boolean;
}

export const notificationService = {
  // Fetch paginated notifications with optional isRead filter
  async getNotifications(params?: NotificationParams): Promise<NotificationsListResponse> {
    const response = await api.get('/api/v1/notifications', { params });
    return response.data?.data || { notifications: [], total: 0, page: 1, limit: 10 };
  },

  // Get total unread count for current user
  async getUnreadCount(): Promise<number> {
    const response = await api.get('/api/v1/notifications/unread-count');
    return response.data?.data?.unreadCount ?? 0;
  },

  // Mark single notification as read
  async markAsRead(id: string): Promise<NotificationItem> {
    const response = await api.patch(`/api/v1/notifications/${id}/read`);
    return response.data?.data;
  },

  // Mark all user notifications as read
  async markAllAsRead(): Promise<void> {
    await api.post('/api/v1/notifications/read-all');
  },

  // Delete notification
  async deleteNotification(id: string): Promise<void> {
    await api.delete(`/api/v1/notifications/${id}`);
  },
};

export default notificationService;
