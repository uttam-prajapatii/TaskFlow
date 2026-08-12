import notificationService from './notification.service.js';
import asyncHandler from '../../utils/asyncHandler.js';

class NotificationController {
  /**
   * List paginated notifications for the authenticated user.
   */
  getNotifications = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const result = await notificationService.getUserNotifications(userId, req.query);
    
    res.status(200).json({
      status: 'success',
      data: result
    });
  });

  /**
   * Get unread notification count for the authenticated user.
   */
  getUnreadCount = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const result = await notificationService.getUnreadCount(userId);

    res.status(200).json({
      status: 'success',
      data: result
    });
  });

  /**
   * Mark a single notification as read.
   */
  markAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;
    const notification = await notificationService.markAsRead(id, userId);

    res.status(200).json({
      status: 'success',
      data: notification
    });
  });

  /**
   * Mark all user notifications as read.
   */
  markAllAsRead = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    await notificationService.markAllAsRead(userId);

    res.status(200).json({
      status: 'success',
      message: 'All notifications marked as read'
    });
  });

  /**
   * Delete a notification.
   */
  deleteNotification = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;
    await notificationService.deleteNotification(id, userId);

    res.status(204).json({
      status: 'success',
      data: null
    });
  });
}

export default new NotificationController();
