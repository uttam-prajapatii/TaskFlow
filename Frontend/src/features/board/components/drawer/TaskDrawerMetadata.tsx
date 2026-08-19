import React from 'react';
import Icon from '../../../../components/UI/Icon';
import Avatar from '../../../../components/UI/Avatar';
import { PRIORITY_CONFIG } from '../../../../constants/task.constants';
import { formatDate } from '../../../../utils/date';
import { getLabelMeta } from '../../utils/label.utils';
import type { BoardList, Task } from '../../types';

interface TaskDrawerMetadataProps {
  task: Task;
  currentCol?: BoardList;
  resolveAssigneeName: (assignee: unknown) => string;
  overdue: boolean;
}

export const TaskDrawerMetadata: React.FC<TaskDrawerMetadataProps> = ({
  task,
  currentCol,
  resolveAssigneeName,
  overdue,
}) => {
  const priorityMeta = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  return (
    <>
      {/* Title & Description */}
      <div>
        <h2 className="text-[17px] font-semibold text-neutral-900 dark:text-neutral-100 leading-snug mb-2">
          {task.title}
        </h2>
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
          {task.description || 'No description provided.'}
        </p>
      </div>

      {/* Status, Priority, Due Date, Created Date, Updated Date Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[12.5px] bg-neutral-50/80 dark:bg-neutral-800/40 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
        <div>
          <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
            Status
          </p>
          <p className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
            {currentCol?.title || task.status || 'To Do'}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
            Priority
          </p>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${priorityMeta.bg} ${priorityMeta.text} ring-1 ${priorityMeta.ring}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${priorityMeta.dot}`} />
            {priorityMeta.label}
          </span>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
            Due date
          </p>
          <p
            className={`flex items-center gap-1 font-medium ${
              overdue ? 'text-rose-500' : 'text-neutral-700 dark:text-neutral-200'
            }`}
          >
            <Icon name="calendar" size={13} />{' '}
            {formatDate(task.dueDate) || 'No Due Date'}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
            Created Date
          </p>
          <p className="flex items-center gap-1 font-medium text-neutral-700 dark:text-neutral-300">
            <Icon name="clock" size={13} className="text-neutral-400" />
            {task.createdAt ? formatDate(String(task.createdAt)) || 'N/A' : 'N/A'}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
            Updated Date
          </p>
          <p className="flex items-center gap-1 font-medium text-neutral-700 dark:text-neutral-300">
            <Icon name="refresh-cw" size={12} className="text-neutral-400" />
            {task.updatedAt ? formatDate(String(task.updatedAt)) || 'N/A' : 'N/A'}
          </p>
        </div>
      </div>

      {/* Labels */}
      <div>
        <p className="text-[12px] text-neutral-400 dark:text-neutral-500 mb-1.5">Labels</p>
        <div className="flex flex-wrap gap-1.5">
          {task.labels && task.labels.length ? (
            task.labels.map((l, idx) => {
              const meta = getLabelMeta(l);
              const keyStr = typeof l === 'object' && l !== null ? l._id : `drawer-label-${idx}`;
              return (
                <span
                  key={keyStr}
                  style={meta.style}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${meta.className}`}
                >
                  {meta.name}
                </span>
              );
            })
          ) : (
            <span className="text-[12px] text-neutral-400 dark:text-neutral-500">None</span>
          )}
        </div>
      </div>

      {/* Assignees */}
      <div>
        <p className="text-[12px] text-neutral-400 dark:text-neutral-500 mb-1.5">Assignees</p>
        <div className="flex flex-wrap gap-2">
          {task.assignees && task.assignees.length ? (
            task.assignees.map((a, i) => {
              const aName = resolveAssigneeName(a);
              return (
                <span
                  key={i}
                  className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full bg-neutral-50 dark:bg-neutral-800 text-[12px] text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700"
                >
                  <Avatar name={aName} size={18} ring={false} /> {aName}
                </span>
              );
            })
          ) : (
            <span className="text-[12px] text-neutral-400 dark:text-neutral-500">Unassigned</span>
          )}
        </div>
      </div>
    </>
  );
};

export default TaskDrawerMetadata;
