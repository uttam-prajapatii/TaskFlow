import React from 'react';
import { useQuery } from '@tanstack/react-query';
import workspaceService from '../../../services/workspace.service';
import type { ActivityLogItem, ActivityLogActor } from '../types';
import Icon from '../../../components/UI/Icon';
import Avatar from '../../../components/UI/Avatar';

interface ActivityTabProps {
  workspaceId: string;
}

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

const getActionDetails = (action: string, metadata?: Record<string, unknown>) => {
  const metaTitle = (metadata?.title as string) || (metadata?.name as string) || '';
  switch (action) {
    case 'task:create':
      return { label: `Created task "${metaTitle || 'Task'}"`, icon: 'plus-circle', color: 'text-emerald-500' };
    case 'task:update':
      return { label: `Updated task "${metaTitle || 'Task'}"`, icon: 'edit-3', color: 'text-blue-500' };
    case 'task:move':
      return { label: `Moved task "${metaTitle || 'Task'}"`, icon: 'arrow-right-circle', color: 'text-violet-500' };
    case 'task:completed':
      return { label: `Completed task "${metaTitle || 'Task'}"`, icon: 'check-circle-2', color: 'text-emerald-600' };
    case 'task:delete':
      return { label: `Deleted task "${metaTitle || 'Task'}"`, icon: 'trash-2', color: 'text-rose-500' };
    case 'board:create':
      return { label: `Created board "${metaTitle || 'Board'}"`, icon: 'layoutGrid', color: 'text-orange-500' };
    case 'member:invite':
      return { label: `Invited member "${metaTitle || 'User'}"`, icon: 'mail', color: 'text-amber-500' };
    case 'member:join':
      return { label: `Joined workspace`, icon: 'user-check', color: 'text-emerald-500' };
    default:
      return { label: `Performed ${action.replace(':', ' ')}`, icon: 'activity', color: 'text-neutral-500' };
  }
};

export const ActivityTab: React.FC<ActivityTabProps> = ({ workspaceId }) => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['activity-logs', workspaceId],
    queryFn: () => workspaceService.getActivityLogs(workspaceId),
    enabled: !!workspaceId,
  });

  const logs: ActivityLogItem[] = data?.logs || [];

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 animate-pulse flex items-center gap-3.5"
            >
              <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-neutral-200 dark:bg-neutral-800 rounded w-1/3" />
                <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-12 px-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
          <p className="text-sm font-semibold text-rose-500 mb-2">Failed to load activity logs</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-3.5 py-1.5 rounded-xl bg-orange-500 text-white text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-14 px-5 bg-white dark:bg-neutral-900 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 flex items-center justify-center mx-auto mb-3">
            <Icon name="activity" size={22} />
          </div>
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1">
            No activity recorded yet
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto leading-relaxed">
            Actions performed in this workspace will appear here in chronological audit stream.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-2xs">
          {logs.map((log, i) => {
            const actorObj = typeof log.actorId === 'object' && log.actorId !== null ? (log.actorId as ActivityLogActor) : null;
            const actorName = actorObj?.fullName || actorObj?.name || actorObj?.email || 'User';
            const details = getActionDetails(log.action, log.metadata);

            return (
              <div
                key={log._id}
                className={`flex items-start gap-3.5 p-4 transition-colors ${
                  i > 0 ? 'border-t border-neutral-100 dark:border-neutral-800/80' : ''
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  <Avatar name={actorName} size={32} ring={false} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                      {actorName}
                    </span>
                    <span className="text-[11px] text-neutral-400 font-medium shrink-0">
                      {formatRelativeTime(log.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Icon name={details.icon} size={14} className={details.color} />
                    <span className="text-xs text-neutral-600 dark:text-neutral-300 font-medium">
                      {details.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActivityTab;
