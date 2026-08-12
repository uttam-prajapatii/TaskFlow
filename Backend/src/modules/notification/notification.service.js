import notificationRepository from './notification.repository.js';
import { emitToUser } from '../../config/socket.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

class NotificationService {
  /**
   * Create a notification record and dispatch it via Socket.io.
   */
  async createAndSendNotification(userId, type, payload) {
    const notification = await notificationRepository.createNotification({
      userId,
      type,
      payload
    });

    try {
      // Emit real-time notification push to user's private room
      emitToUser(userId.toString(), 'notification:push', {
        id: notification._id,
        type: notification.type,
        payload: notification.payload,
        isRead: notification.isRead,
        createdAt: notification.createdAt
      });
    } catch (err) {
      logger.warn(`Failed to push real-time notification to user:${userId}: ${err.message}`);
    }

    return notification;
  }

  /**
   * Get paginated notifications for the user.
   */
  async getUserNotifications(userId, query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const filters = {};

    if (query.isRead !== undefined) {
      filters.isRead = query.isRead === 'true';
    }

    return notificationRepository.findNotificationsByUser(userId, filters, { page, limit });
  }

  /**
   * Get unread notification count for the user.
   */
  async getUnreadCount(userId) {
    const unreadCount = await notificationRepository.countUnread(userId);
    return { unreadCount };
  }

  /**
   * Mark a specific notification as read.
   */
  async markAsRead(id, userId) {
    const notification = await notificationRepository.findNotificationById(id, userId);
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    notification.isRead = true;
    await notification.save();

    logger.info(`Notification marked as read: ${id} by user: ${userId}`);
    return notification;
  }

  /**
   * Mark all unread notifications of a user as read.
   */
  async markAllAsRead(userId) {
    await notificationRepository.markAllAsRead(userId);
    logger.info(`All notifications marked as read for user: ${userId}`);
  }

  /**
   * Delete a notification.
   */
  async deleteNotification(id, userId) {
    const result = await notificationRepository.deleteNotification(id, userId);
    if (result.deletedCount === 0) {
      throw new NotFoundError('Notification not found');
    }
    logger.info(`Notification deleted: ${id} by user: ${userId}`);
  }
}

export default new NotificationService();
