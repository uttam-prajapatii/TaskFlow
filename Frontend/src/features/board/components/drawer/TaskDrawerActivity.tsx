import React from 'react';
import Icon from '../../../../components/UI/Icon';
import Avatar from '../../../../components/UI/Avatar';
import { formatRelativeTime } from '../../../../utils/date';
import type { ActivityLog } from '../../types';

interface TaskDrawerActivityProps {
  historyLogs: ActivityLog[];
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  isLoadingHistory: boolean;
  isErrorHistory: boolean;
  onRefetchHistory: () => void;
}

const formatLogAction = (log: ActivityLog): string => {
  const action = log.action;
  const meta = log.metadata || {};

  switch (action) {
    case 'task:create':
      return 'created this task';
    case 'task:update':
      if (meta.updatedFields && meta.updatedFields.length > 0) {
        const friendlyFields = meta.updatedFields.map((f) => {
          if (f === 'dueDate') return 'due date';
          if (f === 'listId') return 'list';
          return f;
        });
        return `updated ${friendlyFields.join(', ')}`;
      }
      return 'updated this task';
    case 'task:move':
      if (meta.fromListName && meta.toListName) {
        return `moved this task from "${meta.fromListName}" to "${meta.toListName}"`;
      }
      return 'moved this task';
    case 'task:archive':
      return 'archived this task';
    case 'task:restore':
      return 'restored this task from archive';
    case 'task:delete':
      return 'deleted this task';
    default:
      return action.replace('task:', '').replace(':', ' ') || 'performed an action';
  }
};

export const TaskDrawerActivity: React.FC<TaskDrawerActivityProps> = ({
  historyLogs,
  showHistory,
  setShowHistory,
  isLoadingHistory,
  isErrorHistory,
  onRefetchHistory,
}) => {
  return (
    <div className="bg-neutral-50/50 dark:bg-neutral-800/10 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800/80">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-neutral-600 dark:text-neutral-300 flex items-center gap-1 font-medium">
          <Icon name="history" size={13} className="text-neutral-400" /> Task History Logs
        </p>
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition cursor-pointer flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-1 rounded-lg"
        >
          <Icon name={showHistory ? 'eye-off' : 'history'} size={12} />
          {showHistory ? 'Hide History' : 'Show History'}
        </button>
      </div>

      {showHistory && (
        <div className="mt-3 space-y-2.5 text-[12px] max-h-48 overflow-y-auto pr-1">
          {isLoadingHistory ? (
            <div className="space-y-2 py-1">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-2 animate-pulse">
                  <div className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-700 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : isErrorHistory ? (
            <div className="p-3 text-center bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/50 flex flex-col items-center gap-1">
              <p className="text-[11.5px] text-rose-600 dark:text-rose-400">
                Failed to load history
              </p>
              <button
                type="button"
                onClick={onRefetchHistory}
                className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 underline cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : historyLogs.length === 0 ? (
            <div className="py-2 text-center text-neutral-400 dark:text-neutral-500 italic text-[11.5px]">
              No activity logs recorded yet.
            </div>
          ) : (
            historyLogs.map((log) => {
              const actorName = log.actorId?.fullName || log.actorId?.email || 'Someone';
              return (
                <div
                  key={log._id}
                  className="flex gap-2 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100/30 dark:hover:bg-neutral-800/30 p-1.5 rounded-lg transition"
                >
                  <Avatar name={actorName} size={18} ring={false} />
                  <div className="flex-1">
                    <p className="text-neutral-600 dark:text-neutral-300 leading-normal">
                      <span className="text-neutral-800 dark:text-neutral-200 font-semibold">
                        {actorName}
                      </span>{' '}
                      {formatLogAction(log)}
                    </p>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                      {formatRelativeTime(log.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default TaskDrawerActivity;
