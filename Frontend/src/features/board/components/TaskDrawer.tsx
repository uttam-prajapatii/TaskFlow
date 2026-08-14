import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import type { Task, BoardList, ChecklistItem, TaskAttachmentItem } from '../types';
import Icon from '../../../components/UI/Icon';
import Avatar from '../../../components/UI/Avatar';
import { PRIORITY_CONFIG, getLabelMeta, isOverdue, formatDate } from './KanbanTaskCard';
import workspaceService from '../../../services/workspace.service';
import taskService from '../../../services/task.service';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string; email?: string }[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');

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

  // Fetch full populated task details (checklist array + populated attachments)
  const { data: populatedTask } = useQuery<Task>({
    queryKey: ['task-details', taskId],
    queryFn: () => taskService.getTaskDetails(taskId),
    enabled: !!taskId,
  });

  const activeTask = populatedTask || task;

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
      setNewChecklistText('');
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

  // Checklist Mutations
  const checklistMutation = useMutation({
    mutationFn: ({ action, payload }: { action: string; payload: Record<string, unknown> }) =>
      taskService.checklistOperation(taskId, action, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-details', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', resolvedBoardId] });
      setNewChecklistText('');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Checklist update failed');
    },
  });

  // Attachment Mutations
  const uploadAttachmentMutation = useMutation({
    mutationFn: (formData: FormData) => taskService.uploadAttachment(taskId, formData),
    onSuccess: () => {
      toast.success('File attached successfully');
      queryClient.invalidateQueries({ queryKey: ['task-details', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', resolvedBoardId] });
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Attachment upload failed');
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: string) => taskService.deleteAttachment(taskId, attachmentId),
    onSuccess: () => {
      toast.success('Attachment removed');
      queryClient.invalidateQueries({ queryKey: ['task-details', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', resolvedBoardId] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to remove attachment');
    },
  });

  // Comment Mutations
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

  if (!task || !activeTask) return null;

  const colId = activeTask.status || activeTask.listId;
  const colIdStr = typeof colId === 'object' && colId !== null ? (colId as { _id?: string })._id : colId;
  const currentCol = columns.find((c) => (c._id || c.id) === colIdStr);
  const priorityMeta = PRIORITY_CONFIG[activeTask.priority] || PRIORITY_CONFIG.medium;
  const overdue = isOverdue(activeTask.dueDate) && activeTask.status !== 'done';

  // Checklist Items & Counts
  const checklistItems: ChecklistItem[] = Array.isArray(activeTask.checklist) ? activeTask.checklist : [];
  const doneChecklistCount = checklistItems.filter((i) => i.isDone).length;
  const totalChecklistCount = checklistItems.length;

  // Attachments List
  const attachmentsList: TaskAttachmentItem[] = Array.isArray(activeTask.attachments) ? (activeTask.attachments as TaskAttachmentItem[]) : [];

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

  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    checklistMutation.mutate({ action: 'add', payload: { text: newChecklistText.trim() } });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    uploadAttachmentMutation.mutate(formData);
  };

  const onSubmitAddComment = (data: CommentFormValues) => {
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
              onClick={() => onEdit(activeTask)}
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
              {activeTask.title}
            </h2>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {activeTask.description || 'No description provided.'}
            </p>
          </div>

          {/* Status, Priority, Due Date, Created Date, Updated Date Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[12.5px] bg-neutral-50/80 dark:bg-neutral-800/40 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
            <div>
              <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">Status</p>
              <p className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                {currentCol?.title || activeTask.status || 'To Do'}
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
                {formatDate(activeTask.dueDate) || 'No Due Date'}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">Created Date</p>
              <p className="flex items-center gap-1 font-medium text-neutral-700 dark:text-neutral-300">
                <Icon name="clock" size={13} className="text-neutral-400" />
                {activeTask.createdAt ? formatDate(String(activeTask.createdAt)) || 'N/A' : 'N/A'}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">Updated Date</p>
              <p className="flex items-center gap-1 font-medium text-neutral-700 dark:text-neutral-300">
                <Icon name="refresh-cw" size={12} className="text-neutral-400" />
                {activeTask.updatedAt ? formatDate(String(activeTask.updatedAt)) || 'N/A' : 'N/A'}
              </p>
            </div>
          </div>

          {/* Labels */}
          <div>
            <p className="text-[12px] text-neutral-400 dark:text-neutral-500 mb-1.5">Labels</p>
            <div className="flex flex-wrap gap-1.5">
              {activeTask.labels && activeTask.labels.length ? (
                activeTask.labels.map((l, idx) => {
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
              {activeTask.assignees && activeTask.assignees.length ? (
                activeTask.assignees.map((a, i) => {
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

          {/* Interactive Checklist Section */}
          <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <Icon name="check-square" size={14} className="text-orange-500" />
                Checklist {totalChecklistCount > 0 && `· ${doneChecklistCount}/${totalChecklistCount}`}
              </p>
              {totalChecklistCount > 0 && (
                <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400">
                  {Math.round((doneChecklistCount / totalChecklistCount) * 100)}%
                </span>
              )}
            </div>

            {/* Progress Bar */}
            {totalChecklistCount > 0 && (
              <div className="h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-300"
                  style={{ width: `${(doneChecklistCount / totalChecklistCount) * 100}%` }}
                />
              </div>
            )}

            {/* Checklist Items List */}
            <div className="space-y-1.5 mb-3">
              {checklistItems.map((item) => {
                const itemId = item._id || item.id || '';
                return (
                  <div
                    key={itemId}
                    className="group flex items-center justify-between p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/60 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800 transition"
                  >
                    <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.isDone}
                        onChange={() =>
                          checklistMutation.mutate({
                            action: 'update',
                            payload: { itemId, isDone: !item.isDone },
                          })
                        }
                        disabled={checklistMutation.isPending}
                        className="w-4 h-4 rounded text-orange-500 border-neutral-300 focus:ring-orange-500 cursor-pointer"
                      />
                      <span
                        className={`text-[12.5px] truncate ${
                          item.isDone
                            ? 'line-through text-neutral-400 dark:text-neutral-500'
                            : 'text-neutral-700 dark:text-neutral-200 font-medium'
                        }`}
                      >
                        {item.text}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        checklistMutation.mutate({
                          action: 'remove',
                          payload: { itemId },
                        })
                      }
                      disabled={checklistMutation.isPending}
                      className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-rose-500 transition cursor-pointer"
                      title="Remove checklist item"
                    >
                      <Icon name="x" size={13} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Add Checklist Item Form */}
            <form onSubmit={handleAddChecklistItem} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add checklist item…"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                className="flex-1 px-3 py-1.5 text-[12.5px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-orange-400/40"
              />
              <button
                type="submit"
                disabled={checklistMutation.isPending || !newChecklistText.trim()}
                className="px-3 py-1.5 text-[12px] font-semibold rounded-lg text-white bg-orange-500 hover:bg-orange-600 transition disabled:opacity-40 cursor-pointer shrink-0"
              >
                Add
              </button>
            </form>
          </div>

          {/* File Attachments Section */}
          <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <Icon name="paperclip" size={14} className="text-orange-500" />
                Attachments ({attachmentsList.length})
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadAttachmentMutation.isPending}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-100 transition cursor-pointer"
              >
                <Icon name="plus" size={12} />
                {uploadAttachmentMutation.isPending ? 'Uploading…' : 'Attach File'}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {attachmentsList.length === 0 ? (
              <p className="text-[12px] text-neutral-400 dark:text-neutral-500 italic py-1">
                No file attachments yet.
              </p>
            ) : (
              <div className="space-y-2 mt-2">
                {attachmentsList.map((att) => {
                  const attId = att._id || att.id || '';
                  return (
                    <div
                      key={attId}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 shrink-0">
                          <Icon name="file" size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                            {att.originalName}
                          </p>
                          <p className="text-[10px] text-neutral-400">
                            {att.size ? `${(att.size / 1024).toFixed(1)} KB` : 'Attachment'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {att.fileUrl && (
                          <a
                            href={att.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-orange-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
                            title="Download file"
                          >
                            <Icon name="download" size={14} />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteAttachmentMutation.mutate(attId)}
                          disabled={deleteAttachmentMutation.isPending}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition cursor-pointer"
                          title="Delete attachment"
                        >
                          <Icon name="trash-2" size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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
