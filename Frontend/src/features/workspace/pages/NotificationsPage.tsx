import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Sidebar from '../../../components/layout/Sidebar';
import Icon from '../../../components/UI/Icon';
import Badge from '../../../components/UI/Badge';
import { useWorkspace } from '../../../context/WorkspaceContext';
import notificationService, { type NotificationItem } from '../../../services/notification.service';

const formatRelativeTime = (dateStr?: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
};

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread' | 'invites' | 'tasks'>('all');

  // Fetch unread count for badges and filter header
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => notificationService.getUnreadCount(),
  });

  // Fetch notifications list
  const {
    data: notificationsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () =>
      notificationService.getNotifications({
        page: 1,
        limit: 50,
        isRead: filter === 'unread' ? false : undefined,
      }),
  });

  const notificationsList = notificationsData?.notifications || [];

  // Client side filtering for type-based tabs
  const filteredNotifications = notificationsList.filter((n) => {
    if (filter === 'invites') return n.type === 'invite';
    if (filter === 'tasks') return n.type === 'task';
    return true;
  });

  // Mutations
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
    onError: () => {
      toast.error('Failed to update notification');
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      toast.success('All notifications marked as read');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
    onError: () => {
      toast.error('Failed to mark all as read');
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id: string) => notificationService.deleteNotification(id),
    onSuccess: () => {
      toast.success('Notification cleared');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
    onError: () => {
      toast.error('Failed to delete notification');
    },
  });

  const getTypeIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'invite':
        return <Icon name="mail" size={16} className="text-orange-500" />;
      case 'task':
        return <Icon name="check-square" size={16} className="text-blue-500" />;
      case 'board':
        return <Icon name="layout" size={16} className="text-violet-500" />;
      default:
        return <Icon name="bell" size={16} className="text-emerald-500" />;
    }
  };

  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification._id);
    }

    const payload = notification.payload || {};
    if (payload.boardId) {
      navigate(`/boards/${payload.boardId}`);
    } else if (payload.workspaceId) {
      navigate(`/workspaces/${payload.workspaceId}`);
    } else if (currentWorkspace?._id || currentWorkspace?.id) {
      navigate(`/boards`);
    } else {
      navigate('/workspace-select');
    }
  };

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans">
      {/* Sidebar stays ALWAYS open on left */}
      <Sidebar />

      <main className="flex-1 min-w-0 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-bold font-display text-neutral-900 dark:text-neutral-100">
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <Badge tone="brand">
                    {unreadCount} Unread
                  </Badge>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Stay updated with workspace activities, task assignments, and mentions.
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 transition cursor-pointer shrink-0 shadow-2xs disabled:opacity-50"
              >
                <Icon name="check-check" size={15} /> Mark all as read
              </button>
            )}
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2 mb-6 border-b border-neutral-200 dark:border-neutral-800 pb-3">
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: `Unread (${unreadCount})` },
              { id: 'invites', label: 'Invitations' },
              { id: 'tasks', label: 'Tasks' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilter(t.id as typeof filter)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  filter === t.id
                    ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 animate-pulse flex items-start gap-3.5"
                >
                  <div className="w-9 h-9 rounded-xl bg-neutral-200 dark:bg-neutral-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-1/3" />
                    <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            /* Error State */
            <div className="text-center py-16 px-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto mb-3">
                <Icon name="alert-circle" size={24} />
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                Failed to load notifications
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-4">
                An error occurred while communicating with the server.
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition"
              >
                Try Again
              </button>
            </div>
          ) : filteredNotifications.length === 0 ? (
            /* Empty State */
            <div className="text-center py-16 px-4 bg-white dark:bg-neutral-900 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 flex items-center justify-center mx-auto mb-3">
                <Icon name="bell-off" size={24} />
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                No notifications found
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                You're all caught up! There are no pending notifications in this view.
              </p>
            </div>
          ) : (
            /* Notifications List */
            <div className="space-y-3">
              {filteredNotifications.map((n) => {
                const payload = n.payload || {};
                const title =
                  (payload.taskTitle ? `Task: ${payload.taskTitle}` : undefined) ||
                  (n.type === 'invite'
                    ? 'Workspace Invitation'
                    : n.type === 'task'
                    ? 'Task Notification'
                    : n.type === 'board'
                    ? 'Board Update'
                    : 'Notification');
                const message = (payload.message as string) || (payload.commentSnippet as string) || 'Activity recorded in your workspace.';

                return (
                  <div
                    key={n._id}
                    className={`p-4 rounded-2xl border transition-all duration-200 flex items-start gap-3.5 ${
                      !n.isRead
                        ? 'bg-white dark:bg-neutral-900 border-orange-300 dark:border-orange-500/30 shadow-xs'
                        : 'bg-white/60 dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800/80 opacity-90'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 mt-0.5">
                      {getTypeIcon(n.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                          <span>{title}</span>
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                          )}
                        </h4>
                        <span className="text-[11px] text-neutral-400 shrink-0 font-medium">
                          {formatRelativeTime(n.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
                        {message}
                      </p>

                      {(payload.boardId || payload.workspaceId) && (
                        <div className="mt-3 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleNotificationClick(n)}
                            className="px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-500 text-orange-600 dark:text-orange-400 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                          >
                            {payload.boardId ? 'Open Board' : 'View Workspace'}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => markAsReadMutation.mutate(n._id)}
                        disabled={markAsReadMutation.isPending}
                        title={n.isRead ? 'Already read' : 'Mark as read'}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                      >
                        <Icon name={n.isRead ? 'mail-open' : 'mail'} size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteNotificationMutation.mutate(n._id)}
                        disabled={deleteNotificationMutation.isPending}
                        title="Clear notification"
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                      >
                        <Icon name="x" size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default NotificationsPage;
