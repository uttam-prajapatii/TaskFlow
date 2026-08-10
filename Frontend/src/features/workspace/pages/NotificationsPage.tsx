import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Sidebar from '../../../components/layout/Sidebar';
import Icon from '../../../components/UI/Icon';
import Badge from '../../../components/UI/Badge';
import { useWorkspace } from '../../../context/WorkspaceContext';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'invite' | 'task' | 'board' | 'system';
  read: boolean;
  actionUrl?: string;
  actionText?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n-1',
    title: 'Workspace Invitation',
    message: 'You have been invited to collaborate on the "Engineering Team" workspace as Admin.',
    timestamp: '10 minutes ago',
    type: 'invite',
    read: false,
    actionUrl: '/workspace-select',
    actionText: 'View Workspace',
  },
  {
    id: 'n-2',
    title: 'Task Due Soon',
    message: 'Task "Fix Workspace Dark Theme Contrast" in Engineering Roadmap is due today.',
    timestamp: '1 hour ago',
    type: 'task',
    read: false,
    actionUrl: '/boards',
    actionText: 'Open Board',
  },
  {
    id: 'n-3',
    title: 'New Board Created',
    message: 'Marketing Campaigns board was added to your active workspace.',
    timestamp: '3 hours ago',
    type: 'board',
    read: false,
    actionUrl: '/boards',
    actionText: 'View Board',
  },
  {
    id: 'n-4',
    title: 'Security & Session Verified',
    message: 'Your TaskFlow session was successfully verified and secured.',
    timestamp: 'Yesterday',
    type: 'system',
    read: true,
  },
];

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState<'all' | 'unread' | 'invites' | 'tasks'>('all');

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'invites') return n.type === 'invite';
    if (filter === 'tasks') return n.type === 'task';
    return true;
  });

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  };

  const toggleReadStatus = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast.success('Notification cleared');
  };

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
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 transition cursor-pointer shrink-0 shadow-2xs"
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

          {/* Notifications List */}
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white dark:bg-neutral-900 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 flex items-center justify-center mx-auto mb-3">
                <Icon name="bell-off" size={24} />
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                No notifications found
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                You're all caught up! There are no pending notifications in this filter.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 rounded-2xl border transition-all duration-200 flex items-start gap-3.5 ${
                    !n.read
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
                        <span>{n.title}</span>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                        )}
                      </h4>
                      <span className="text-[11px] text-neutral-400 shrink-0 font-medium">
                        {n.timestamp}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
                      {n.message}
                    </p>

                    {n.actionText && n.actionUrl && (
                      <div className="mt-3 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (currentWorkspace?._id || currentWorkspace?.id) {
                              navigate(n.actionUrl!);
                            } else {
                              navigate('/workspace-select');
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-500 text-orange-600 dark:text-orange-400 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                        >
                          {n.actionText}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleReadStatus(n.id)}
                      title={n.read ? 'Mark as unread' : 'Mark as read'}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                    >
                      <Icon name={n.read ? 'mail-open' : 'mail'} size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteNotification(n.id)}
                      title="Clear notification"
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                    >
                      <Icon name="x" size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default NotificationsPage;
