import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSocket } from '../lib/socket';
import useAuth from './useAuth';
import type { NotificationItem } from '../services/notification.service';

export const useSocketNotifications = () => {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || !user?._id) return;

    const socket = getSocket();

    const handleNotificationPush = (notification: NotificationItem) => {
      // Invalidate unread count & notifications list in React Query cache
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // Show real-time toast alert using Sonner
      const message = notification.payload?.message || 'New notification received';
      toast.info(message, {
        description: notification.payload?.taskTitle
          ? `Task: "${notification.payload.taskTitle}"`
          : undefined,
        id: `notif-${notification._id || Date.now()}`,
      });
    };

    socket.on('notification:push', handleNotificationPush);

    return () => {
      socket.off('notification:push', handleNotificationPush);
    };
  }, [isAuthenticated, user?._id, queryClient]);
};

export default useSocketNotifications;
