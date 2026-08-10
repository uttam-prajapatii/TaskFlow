import React, { useState, useEffect, useCallback } from 'react';
import type { Task, BoardList } from '../types';
import Icon from '../../../components/UI/Icon';
import Avatar from '../../../components/UI/Avatar';
import { PRIORITY_CONFIG, LABEL_COLORS, isOverdue, formatDate } from './KanbanTaskCard';
import workspaceService from '../../../services/workspace.service';
import useAuth from '../../../hooks/useAuth';
import { toast } from 'sonner';

interface TaskDrawerProps {
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
  columns: BoardList[];
  workspaceId?: string;
}

interface ActivityComment {
  id: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({
  task,
  onClose,
  onEdit,
  columns,
  workspaceId,
}) => {
  const { user: currentUser } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string; email?: string }[]>([]);

  // Fetch workspace members to resolve assignee names
  const fetchMembers = useCallback(async () => {
    if (!workspaceId) {
      if (currentUser?._id) {
        setTeamMembers([{ id: currentUser._id, name: currentUser.fullName || currentUser.email || 'You', email: currentUser.email }]);
      }
      return;
    }
    try {
      const members = await workspaceService.listMembers(workspaceId);
      const formatted = members.map((m) => {
        const uObj = typeof m.userId === 'object' && m.userId !== null ? m.userId : null;
        const id = uObj ? uObj._id : (m.userId as string);
        const name = uObj ? (uObj.fullName || uObj.name || uObj.email || 'Member') : 'Team Member';
        const email = uObj ? uObj.email : undefined;
        return { id, name, email };
      });
      if (formatted.length === 0 && currentUser?._id) {
        formatted.push({ id: currentUser._id, name: currentUser.fullName || currentUser.email || 'You', email: currentUser.email });
      }
      setTeamMembers(formatted);
    } catch {
      if (currentUser?._id) {
        setTeamMembers([{ id: currentUser._id, name: currentUser.fullName || currentUser.email || 'You', email: currentUser.email }]);
      }
    }
  }, [workspaceId, currentUser]);

  useEffect(() => {
    if (task) {
      fetchMembers();
      setComments([]);
      setCommentText('');
    }
  }, [task, fetchMembers]);

  if (!task) return null;

  const colId = task.status || task.listId;
  const colIdStr = typeof colId === 'object' && colId !== null ? (colId as { _id?: string })._id : colId;
  const currentCol = columns.find((c) => (c._id || c.id) === colIdStr);
  const priorityMeta = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const overdue = isOverdue(task.dueDate) && task.status !== 'done';
  const checklist = task.checklist;

  // Resolve assignee display names cleanly
  const resolveAssigneeName = (assignee: unknown): string => {
    if (typeof assignee === 'object' && assignee !== null) {
      const u = assignee as { fullName?: string; name?: string; email?: string };
      return u.fullName || u.name || u.email || 'Assignee';
    }
    const match = teamMembers.find((m) => m.id === String(assignee));
    if (match) return match.name;
    if (currentUser && String(currentUser._id) === String(assignee)) {
      return currentUser.fullName || currentUser.email || 'You';
    }
    return 'Team Member';
  };

  const handleSendComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;

    const authorName = currentUser?.fullName || currentUser?.email || 'User';
    const newComment: ActivityComment = {
      id: `comment-${Date.now()}`,
      authorName,
      text: trimmed,
      createdAt: 'Just now',
    };

    setComments((prev) => [newComment, ...prev]);
    setCommentText('');
    toast.success('Comment posted');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendComment();
    }
  };

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

          {/* Status, Priority, Due Date, Created Date, Updated Date Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[12.5px] bg-neutral-50/80 dark:bg-neutral-800/40 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
            <div>
              <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">Status</p>
              <p className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                {currentCol?.title || task.status || 'To Do'}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">Priority</p>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${priorityMeta.bg} ${priorityMeta.text} ring-1 ${priorityMeta.ring}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${priorityMeta.dot}`} />
                {priorityMeta.label}
              </span>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">Due date</p>
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
              <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">Created Date</p>
              <p className="flex items-center gap-1 font-medium text-neutral-700 dark:text-neutral-300">
                <Icon name="clock" size={13} className="text-neutral-400" />
                {task.createdAt ? formatDate(String(task.createdAt)) || 'N/A' : 'N/A'}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">Updated Date</p>
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

          {/* Activity & Comments Stream */}
          <div>
            <p className="text-[12px] text-neutral-400 dark:text-neutral-500 mb-2 flex items-center gap-1">
              <Icon name="clock" size={12} /> Activity & Comments ({comments.length + 1})
            </p>
            <div className="space-y-3 text-[12px]">
              {/* Creation Log */}
              <div className="flex gap-2">
                <Avatar name="TaskFlow" size={20} ring={false} />
                <p className="text-neutral-500 dark:text-neutral-400">
                  <span className="text-neutral-700 dark:text-neutral-200 font-medium">TaskFlow</span>{' '}
                  created this task
                </p>
              </div>

              {/* User Comments */}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2 bg-neutral-50 dark:bg-neutral-800/50 p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
                  <Avatar name={c.authorName} size={22} ring={false} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-neutral-800 dark:text-neutral-200 font-semibold text-[12px]">
                        {c.authorName}
                      </span>
                      <span className="text-[10px] text-neutral-400">{c.createdAt}</span>
                    </div>
                    <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed text-[12.5px] break-words">
                      {c.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Comment input footer */}
        <div className="px-5 py-3 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <div className="flex items-center gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a comment…"
              className="flex-1 px-3 py-2 text-[13px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400"
            />
            <button
              type="button"
              onClick={handleSendComment}
              disabled={!commentText.trim()}
              className="px-3.5 py-2 text-[12.5px] font-medium rounded-lg text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition disabled:opacity-40 cursor-pointer"
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
