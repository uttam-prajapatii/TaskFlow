import React, { useState } from 'react';
import type { Task, BoardList } from '../types';
import Icon from '../../../components/UI/Icon';
import Avatar from '../../../components/UI/Avatar';
import { PRIORITY_CONFIG, LABEL_COLORS, isOverdue, formatDate } from './KanbanTaskCard';

interface TaskDrawerProps {
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
  columns: BoardList[];
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({
  task,
  onClose,
  onEdit,
  columns,
}) => {
  const [commentText, setCommentText] = useState('');

  if (!task) return null;

  const colId = task.status || task.listId;
  const currentCol = columns.find((c) => (c._id || c.id) === colId);
  const priorityMeta = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const overdue = isOverdue(task.dueDate) && task.status !== 'done';
  const checklist = task.checklist;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md h-full bg-white dark:bg-neutral-900 shadow-2xl border-l border-neutral-200 dark:border-neutral-800 flex flex-col z-10"
        style={{ animation: 'slideIn 0.25s ease-out' }}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
              {currentCol?.title || 'Board Task'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
              aria-label="Edit task"
            >
              <Icon name="edit" size={15} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
              aria-label="Close"
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Title & Description */}
          <div>
            <h2 className="text-[17px] font-semibold text-neutral-900 dark:text-neutral-100 leading-snug mb-2">
              {task.title}
            </h2>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {task.description || 'No description provided.'}
            </p>
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-2 gap-3 text-[12.5px]">
            <div>
              <p className="text-neutral-400 dark:text-neutral-500 mb-1">Priority</p>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${priorityMeta.bg} ${priorityMeta.text} ring-1 ${priorityMeta.ring}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${priorityMeta.dot}`} />
                {priorityMeta.label}
              </span>
            </div>
            <div>
              <p className="text-neutral-400 dark:text-neutral-500 mb-1">Due date</p>
              <p
                className={`flex items-center gap-1 font-medium ${
                  overdue ? 'text-rose-500' : 'text-neutral-700 dark:text-neutral-200'
                }`}
              >
                <Icon name="calendar" size={13} />{' '}
                {formatDate(task.dueDate) || 'No due date'}
              </p>
            </div>
          </div>

          {/* Labels */}
          <div>
            <p className="text-[12px] text-neutral-400 dark:text-neutral-500 mb-1.5">Labels</p>
            <div className="flex flex-wrap gap-1.5">
              {task.labels && task.labels.length ? (
                task.labels.map((l) => (
                  <span
                    key={l}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                      LABEL_COLORS[l] ||
                      'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                    }`}
                  >
                    {l}
                  </span>
                ))
              ) : (
                <span className="text-[12px] text-neutral-300">None</span>
              )}
            </div>
          </div>

          {/* Assignees */}
          <div>
            <p className="text-[12px] text-neutral-400 dark:text-neutral-500 mb-1.5">Assignees</p>
            <div className="flex flex-wrap gap-2">
              {task.assignees && task.assignees.length ? (
                task.assignees.map((a, i) => {
                  const aName = typeof a === 'object' && a !== null ? a.fullName || a.name || 'User' : 'Member';
                  return (
                    <span
                      key={i}
                      className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full bg-neutral-50 dark:bg-neutral-800 text-[12px] text-neutral-600 dark:text-neutral-300"
                    >
                      <Avatar name={aName} size={18} ring={false} /> {aName}
                    </span>
                  );
                })
              ) : (
                <span className="text-[12px] text-neutral-300">Unassigned</span>
              )}
            </div>
          </div>

          {/* Checklist */}
          {checklist && checklist.total > 0 && (
            <div>
              <p className="text-[12px] text-neutral-400 dark:text-neutral-500 mb-1.5 flex items-center gap-1">
                <Icon name="check" size={12} /> Checklist · {checklist.done}/{checklist.total}
              </p>
              <div className="h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full"
                  style={{ width: `${(checklist.done / checklist.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Attachments */}
          <div>
            <p className="text-[12px] text-neutral-400 dark:text-neutral-500 mb-1.5 flex items-center gap-1">
              <Icon name="mail" size={12} /> Attachments · {task.attachments ?? 0}
            </p>
          </div>

          {/* Activity Stream */}
          <div>
            <p className="text-[12px] text-neutral-400 dark:text-neutral-500 mb-2 flex items-center gap-1">
              <Icon name="clock" size={12} /> Activity
            </p>
            <div className="space-y-2.5 text-[12px]">
              <div className="flex gap-2">
                <Avatar name="User" size={20} ring={false} />
                <p className="text-neutral-500 dark:text-neutral-400">
                  <span className="text-neutral-700 dark:text-neutral-200 font-medium">TaskFlow</span>{' '}
                  created this task
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Comment input footer */}
        <div className="px-5 py-3 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1 px-3 py-2 text-[13px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400"
            />
            <button
              type="button"
              onClick={() => setCommentText('')}
              className="px-3 py-2 text-[12.5px] font-medium rounded-lg text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDrawer;
