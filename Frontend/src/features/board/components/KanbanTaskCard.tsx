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

  const checklistStats = (() => {
    const cl = task.checklist;
    if (!cl) return null;
    if (Array.isArray(cl)) {
      if (cl.length === 0) return null;
      const done = cl.filter((i) => i.isDone).length;
      const total = cl.length;
      return { done, total, pct: Math.round((done / total) * 100) };
    }
    if (typeof cl === 'object' && 'total' in cl && cl.total > 0) {
      return { done: cl.done, total: cl.total, pct: Math.round((cl.done / cl.total) * 100) };
    }
    return null;
  })();

  const attachmentCount = (() => {
    const att = task.attachments;
    if (!att) return 0;
    if (Array.isArray(att)) return att.length;
    return typeof att === 'number' ? att : 0;
  })();

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
      className={`group relative bg-white dark:bg-neutral-900 border rounded-2xl p-3.5 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer select-none ${
        isDragging ? 'opacity-40 ring-2 ring-orange-400' : 'hover:-translate-y-0.5 border-neutral-200 dark:border-neutral-800'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-100 leading-snug line-clamp-2 flex-1">
          {task.title}
        </h4>
        <div onClick={(e) => e.stopPropagation()} className="shrink-0 relative">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            <Icon name="more-horizontal" size={15} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 w-32 py-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onMenuAction('edit', task);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[12.5px] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer"
                >
                  <Icon name="edit" size={13} />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onMenuAction('delete', task);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[12.5px] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                >
                  <Icon name="trash-2" size={13} />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${priorityMeta.bg} ${priorityMeta.text} ring-1 ${priorityMeta.ring}`}
        >
          <span className={`w-1 h-1 rounded-full ${priorityMeta.dot}`} />
          {priorityMeta.label}
        </span>
      </div>

      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {task.labels.map((l, idx) => {
            const meta = getLabelMeta(l);
            const keyStr = typeof l === 'object' && l !== null ? l._id : `label-${idx}`;
            return (
              <span
                key={keyStr}
                style={meta.style}
                className={`px-2 py-0.5 rounded-md text-[10.5px] font-medium ${meta.className}`}
              >
                {meta.name}
              </span>
            );
          })}
        </div>
      )}

      {checklistStats && (
        <div className="mb-2.5">
          <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">
            <span className="flex items-center gap-1">
              <Icon name="check" size={11} /> {checklistStats.done}/{checklistStats.total}
            </span>
            <span>{checklistStats.pct}%</span>
          </div>
          <div className="h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all"
              style={{ width: `${checklistStats.pct}%` }}
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
          {attachmentCount > 0 && (
            <span className="flex items-center gap-0.5 text-[11px]">
              <Icon name="paperclip" size={11} /> {attachmentCount}
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
