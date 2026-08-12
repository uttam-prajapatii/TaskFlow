import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import type { Task, BoardList } from '../types';
import Icon from '../../../components/UI/Icon';
import Avatar from '../../../components/UI/Avatar';
import { PRIORITY_CONFIG, LABEL_COLORS, isOverdue, formatDate } from './KanbanTaskCard';
import workspaceService from '../../../services/workspace.service';
import commentService, { type Comment } from '../../../services/comment.service';
import useAuth from '../../../hooks/useAuth';
import useSocketComments from '../../../hooks/useSocketComments';

interface TaskDrawerProps {
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
  columns: BoardList[];
  workspaceId?: string;
  boardId?: string;
}

const commentSchema = z.object({
  body: z.string().trim().min(1, 'Comment cannot be empty').max(2000, 'Comment too long'),
});

type CommentFormValues = z.infer<typeof commentSchema>;

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

export const TaskDrawer: React.FC<TaskDrawerProps> = ({
  task,
  onClose,
  onEdit,
  columns,
  workspaceId,
  boardId: propBoardId,
}) => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string; email?: string }[]>([]);

  const taskId = task ? (task._id || task.id || '') : '';
  const resolvedBoardId = propBoardId || task?.boardId || (columns[0]?.boardId ?? '');

  // Enable real-time WebSocket comment updates for this task
  useSocketComments(resolvedBoardId, taskId);

  // React Hook Form for new comment
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { body: '' },
  });

  // Fetch workspace members to resolve assignee & mention display names
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
      setEditingCommentId(null);
      setEditingBody('');
      reset({ body: '' });
    }
  }, [task, fetchMembers, reset]);

  // Fetch real comments from backend
  const {
    data: comments = [],
    isLoading: isLoadingComments,
    isError: isErrorComments,
    refetch: refetchComments,
  } = useQuery<Comment[]>({
    queryKey: ['comments', taskId],
    queryFn: () => commentService.getComments(taskId),
    enabled: !!taskId,
  });

  // Mutations
  const addCommentMutation = useMutation({
    mutationFn: (payload: { body: string; mentions?: string[] }) =>
      commentService.addComment(taskId, payload),
    onSuccess: () => {
      reset({ body: '' });
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      toast.success('Comment posted');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to post comment');
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, body }: { commentId: string; body: string }) =>
      commentService.updateComment(taskId, commentId, { body }),
    onSuccess: () => {
      setEditingCommentId(null);
      setEditingBody('');
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      toast.success('Comment updated');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to update comment');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => commentService.deleteComment(taskId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      toast.success('Comment deleted');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to delete comment');
    },
  });

  if (!task) return null;

  const colId = task.status || task.listId;
  const colIdStr = typeof colId === 'object' && colId !== null ? (colId as { _id?: string })._id : colId;
  const currentCol = columns.find((c) => (c._id || c.id) === colIdStr);
  const priorityMeta = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const overdue = isOverdue(task.dueDate) && task.status !== 'done';
  const checklist = task.checklist;

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

  const onSubmitAddComment = (data: CommentFormValues) => {
    // Extract @mentions matching team member names or emails if present
    const mentions: string[] = [];
    const text = data.body;
    teamMembers.forEach((member) => {
      if (text.includes(`@${member.name}`) || (member.email && text.includes(`@${member.email}`))) {
        mentions.push(member.id);
      }
    });

    addCommentMutation.mutate({ body: text, mentions: mentions.length ? mentions : undefined });
  };

  const handleStartEdit = (c: Comment) => {
    setEditingCommentId(c._id);
    setEditingBody(c.body);
  };

  const handleSaveEdit = (commentId: string) => {
    if (!editingBody.trim()) return;
    updateCommentMutation.mutate({ commentId, body: editingBody.trim() });
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
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 cursor-pointer"
              aria-label="Edit task"
            >
              <Icon name="edit" size={15} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 cursor-pointer"
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

          {/* Activity & Real Comments Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] text-neutral-400 dark:text-neutral-500 flex items-center gap-1 font-medium">
                <Icon name="clock" size={12} /> Activity & Comments ({comments.length + 1})
              </p>
            </div>

            <div className="space-y-3 text-[12px]">
              {/* Task Creation Log */}
              <div className="flex gap-2">
                <Avatar name="TaskFlow" size={20} ring={false} />
                <p className="text-neutral-500 dark:text-neutral-400">
                  <span className="text-neutral-700 dark:text-neutral-200 font-medium">TaskFlow</span>{' '}
                  created this task
                </p>
              </div>

              {/* Loading Comments */}
              {isLoadingComments ? (
                <div className="space-y-2 py-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex gap-2 bg-neutral-50 dark:bg-neutral-800/40 p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 animate-pulse">
                      <div className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-700 shrink-0" />
                      <div className="flex-1 space-y-1">
                        <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/4" />
                        <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : isErrorComments ? (
                /* Error Comments */
                <div className="p-3 text-center bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/50">
                  <p className="text-[12px] text-rose-600 dark:text-rose-400">Failed to load comments</p>
                  <button
                    type="button"
                    onClick={() => refetchComments()}
                    className="mt-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300 underline cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              ) : comments.length === 0 ? (
                /* Empty Comments */
                <div className="py-3 text-center text-neutral-400 dark:text-neutral-500 text-[12px] italic">
                  No comments yet. Be the first to leave a comment!
                </div>
              ) : (
                /* Real User Comments Stream */
                comments.map((c) => {
                  const authorObj = typeof c.authorId === 'object' && c.authorId !== null ? c.authorId : null;
                  const authorIdStr = authorObj ? authorObj._id : String(c.authorId);
                  const authorName = authorObj ? (authorObj.fullName || authorObj.email) : 'Teammate';
                  const isAuthor = currentUser && String(currentUser._id) === String(authorIdStr);

                  return (
                    <div
                      key={c._id}
                      className="group relative flex gap-2.5 bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800"
                    >
                      <Avatar name={authorName} size={24} ring={false} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-neutral-800 dark:text-neutral-200 font-semibold text-[12px]">
                            {authorName}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-neutral-400 font-medium">
                              {formatRelativeTime(c.createdAt)}
                            </span>
                            {/* Author Action Buttons */}
                            {isAuthor && editingCommentId !== c._id && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(c)}
                                  className="p-0.5 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                                  title="Edit comment"
                                >
                                  <Icon name="edit" size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteCommentMutation.mutate(c._id)}
                                  disabled={deleteCommentMutation.isPending}
                                  className="p-0.5 rounded text-neutral-400 hover:text-rose-500 cursor-pointer"
                                  title="Delete comment"
                                >
                                  <Icon name="trash-2" size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {editingCommentId === c._id ? (
                          /* Inline Edit Mode */
                          <div className="space-y-2 mt-1">
                            <textarea
                              value={editingBody}
                              onChange={(e) => setEditingBody(e.target.value)}
                              className="w-full p-2 text-[12.5px] rounded-lg border border-orange-300 dark:border-orange-500/40 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 outline-none resize-none focus:ring-2 focus:ring-orange-400/30"
                              rows={2}
                            />
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => setEditingCommentId(null)}
                                className="px-2.5 py-1 text-[11px] rounded-md font-medium text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(c._id)}
                                disabled={updateCommentMutation.isPending || !editingBody.trim()}
                                className="px-2.5 py-1 text-[11px] rounded-md font-semibold text-white bg-orange-500 hover:bg-orange-600 transition disabled:opacity-50 cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Read Mode */
                          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed text-[12.5px] break-words">
                            {c.body}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Comment Input Form (React Hook Form + Zod) */}
        <form
          onSubmit={handleSubmit(onSubmitAddComment)}
          className="px-5 py-3 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900"
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <input
                {...register('body')}
                placeholder="Add a comment… (Use @name to mention team members)"
                className="flex-1 px-3 py-2 text-[13px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400"
              />
              <button
                type="submit"
                disabled={addCommentMutation.isPending}
                className="px-3.5 py-2 text-[12.5px] font-medium rounded-lg text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition disabled:opacity-40 cursor-pointer shrink-0"
              >
                {addCommentMutation.isPending ? 'Sending…' : 'Send'}
              </button>
            </div>
            {errors.body && (
              <span className="text-[11px] text-rose-500 px-1">{errors.body.message}</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskDrawer;
