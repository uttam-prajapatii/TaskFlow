import { Notification } from './notification.model.js';

class NotificationRepository {
  /**
   * Create a new notification.
   */
  async createNotification(data) {
    return Notification.create(data);
  }

  /**
   * Find paginated notifications for a specific user.
   */
  async findNotificationsByUser(userId, filters = {}, { page = 1, limit = 10 } = {}) {
    const query = { userId, ...filters };
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
    ]);

    return { notifications, total, page, limit };
  }

  /**
   * Count unread notifications for a user.
   */
  async countUnread(userId) {
    return Notification.countDocuments({ userId, isRead: false });
  }

  /**
   * Find a notification by ID and User ID.
   */
  async findNotificationById(id, userId) {
    return Notification.findOne({ _id: id, userId });
  }

  /**
   * Mark all unread notifications of a user as read.
   */
  async markAllAsRead(userId) {
    return Notification.updateMany({ userId, isRead: false }, { isRead: true });
  }

  /**
   * Delete a notification.
   */
  async deleteNotification(id, userId) {
    return Notification.deleteOne({ _id: id, userId });
  }
}

export default new NotificationRepository();
