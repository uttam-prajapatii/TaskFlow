import React, { useState } from 'react';
import type { Task, PriorityLevel, Label } from '../types';
import Icon from '../../../components/UI/Icon';
import Avatar from '../../../components/UI/Avatar';

export const PRIORITY_CONFIG: Record<
  PriorityLevel,
  { label: string; dot: string; text: string; bg: string; ring: string }
> = {
  urgent: {
    label: 'Urgent',
    dot: 'bg-rose-500',
    text: 'text-rose-700 dark:text-rose-300',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    ring: 'ring-rose-200 dark:ring-rose-500/20',
  },
  high: {
    label: 'High',
    dot: 'bg-orange-500',
    text: 'text-orange-700 dark:text-orange-300',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    ring: 'ring-orange-200 dark:ring-orange-500/20',
  },
  medium: {
    label: 'Medium',
    dot: 'bg-amber-400',
    text: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    ring: 'ring-amber-200 dark:ring-amber-500/20',
  },
  low: {
    label: 'Low',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    ring: 'ring-emerald-200 dark:ring-emerald-500/20',
  },
};

export const LABEL_COLORS: Record<string, string> = {
  design: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  backend: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  frontend: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  bug: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  research: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
  marketing: 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
};

export const getLabelMeta = (label: string | Label): { name: string; style?: React.CSSProperties; className: string } => {
  if (typeof label === 'object' && label !== null) {
    const name = label.name || 'Label';
    const color = label.color || '#4F46E5';
    if (/^#([0-9a-fA-F]{3}){1,2}$/.test(color)) {
      return {
        name,
        style: {
          backgroundColor: `${color}1A`,
          color: color,
          borderColor: `${color}33`,
        },
        className: 'border font-medium',
      };
    }
    return {
      name,
      className: LABEL_COLORS[name.toLowerCase()] || 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
    };
  }

  const labelStr = String(label);
  return {
    name: labelStr,
    className: LABEL_COLORS[labelStr.toLowerCase()] || 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  };
};

const TODAY = new Date();
export const isOverdue = (dueDate?: string | null) => {
  if (!dueDate) return false;
  return new Date(dueDate) < TODAY;
};

export const formatDate = (dueDate?: string | null) => {
  if (!dueDate) return null;
  return new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

interface KanbanTaskCardProps {
  task: Task;
  index?: number;
  onOpen: (task: Task) => void;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDropTask?: (e: React.DragEvent, index: number) => void;
  onMenuAction: (action: string, task: Task) => void;
  isDragging?: boolean;
}

export const KanbanTaskCard: React.FC<KanbanTaskCardProps> = ({
  task,
  index = 0,
  onOpen,
  onDragStart,
  onDragEnd,
  onDropTask,
  onMenuAction,
  isDragging = false,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const priorityMeta = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const overdue = isOverdue(task.dueDate) && task.status !== 'done';
  const checklist = task.checklist;
  const pct =
    checklist && checklist.total > 0
      ? Math.round((checklist.done / checklist.total) * 100)
      : null;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        if (onDropTask) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onDrop={(e) => {
        if (onDropTask) {
          e.preventDefault();
          e.stopPropagation();
          onDropTask(e, index);
        }
      }}
      onClick={() => onOpen(task)}
      tabIndex={0}
      role="button"
      aria-label={`Open task ${task.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(task);
      }}
      className={`group relative bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3.5 cursor-grab active:cursor-grabbing shadow-xs hover:shadow-md hover:border-orange-300 dark:hover:border-orange-900/50 transition-all duration-150 ${
        isDragging ? 'opacity-40 scale-95' : 'opacity-100 scale-100'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${priorityMeta.bg} ${priorityMeta.text} ring-1 ${priorityMeta.ring}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${priorityMeta.dot}`} />
          {priorityMeta.label}
        </span>

        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 -m-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition-opacity"
            aria-label="Task menu"
          >
            <Icon name="more-horizontal" size={15} />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                }}
              />
              <div className="absolute right-0 top-6 z-20 w-40 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-lg py-1">
                {[
                  { k: 'open', label: 'Open', icon: 'chevron-right' },
                  { k: 'edit', label: 'Edit', icon: 'edit' },
                  { k: 'delete', label: 'Delete', icon: 'trash', danger: true },
                ].map((item) => (
                  <button
                    key={item.k}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onMenuAction(item.k, task);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-neutral-50 dark:hover:bg-neutral-800 ${
                      item.danger
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <Icon name={item.icon} size={13} />
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <h4 className="text-[13.5px] font-medium text-neutral-900 dark:text-neutral-100 leading-snug mb-1">
        {task.title}
      </h4>

      {task.description && (
        <p className="text-[12px] text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-2.5">
          {task.description}
        </p>
      )}

      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {task.labels.map((l, idx) => {
            const meta = getLabelMeta(l);
            const keyStr = typeof l === 'object' && l !== null ? l._id : `label-${idx}`;
            return (
              <span
                key={keyStr}
                style={meta.style}
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${meta.className}`}
              >
                {meta.name}
              </span>
            );
          })}
        </div>
      )}

      {pct !== null && checklist && (
        <div className="mb-2.5">
          <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">
            <span className="flex items-center gap-1">
              <Icon name="check" size={11} /> {checklist.done}/{checklist.total}
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5 text-neutral-400 dark:text-neutral-500">
          {task.dueDate && (
            <span
              className={`flex items-center gap-1 text-[11px] ${
                overdue ? 'text-rose-600 dark:text-rose-400 font-medium' : ''
              }`}
            >
              <Icon name="calendar" size={12} /> {formatDate(task.dueDate)}
            </span>
          )}
          {(task.attachments ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[11px]">
              <Icon name="mail" size={11} /> {task.attachments}
            </span>
          )}
          {(task.comments ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[11px]">
              <Icon name="list" size={11} /> {task.comments}
            </span>
          )}
        </div>

        {task.assignees && task.assignees.length > 0 && (
          <div className="flex -space-x-1.5">
            {task.assignees.slice(0, 3).map((assignee, idx) => {
              const aName =
                typeof assignee === 'object' && assignee !== null
                  ? assignee.fullName || assignee.name || 'User'
                  : 'Assignee';
              return <Avatar key={idx} name={aName} size={20} ring />;
            })}
            {task.assignees.length > 3 && (
              <div className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[9px] font-medium text-neutral-600 dark:text-neutral-300 ring-2 ring-white dark:ring-neutral-900">
                +{task.assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanTaskCard;
