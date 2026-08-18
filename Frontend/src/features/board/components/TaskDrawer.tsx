import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { Task, BoardList, ChecklistItem, TaskAttachmentItem, ActivityLog } from '../types';
import Icon from '../../../components/UI/Icon';
import Avatar from '../../../components/UI/Avatar';
import { PRIORITY_CONFIG, getLabelMeta, isOverdue, formatDate } from './KanbanTaskCard';
import workspaceService from '../../../services/workspace.service';
import taskService from '../../../services/task.service';
import commentService, { type Comment } from '../../../services/comment.service';
import useAuth from '../../../hooks/useAuth';
import useSocketComments from '../../../hooks/useSocketComments';
import MentionCommentInput from './MentionCommentInput';

interface TaskDrawerProps {
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onTaskUpdate?: (updatedTask: Task) => void;
  columns: BoardList[];
  workspaceId?: string;
  boardId?: string;
}

const renderCommentBody = (text: string) => {
  // Regex to match @mentions: @word or @Word Word
  const mentionRegex = /(@[a-zA-Z0-9_.-]+(?:\s[a-zA-Z0-9_.-]+)?)/g;
  const parts = text.split(mentionRegex);
  return parts.map((part, idx) => {
    if (part.startsWith('@') && part.trim().length > 1) {
      return (
        <span
          key={idx}
          className="inline-flex items-center font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 px-1.5 py-0.5 rounded text-[12px] align-baseline mx-0.5"
        >
          {part}
        </span>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
};

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

const formatLogAction = (log: ActivityLog): string => {
  const action = log.action;
  const meta = log.metadata || {};

  switch (action) {
    case 'task:create':
      return 'created this task';
    case 'task:update':
      if (meta.updatedFields && meta.updatedFields.length > 0) {
        const friendlyFields = meta.updatedFields.map(f => {
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

const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isImageAttachment = (att: TaskAttachmentItem): boolean => {
  const mime = (att.mimeType || '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  const name = (att.fileName || att.originalName || '').toLowerCase();
  return /\.(jpe?g|png|gif|webp|svg|bmp|avif)$/i.test(name);
};

const getFileExtension = (filename?: string): string => {
  if (!filename) return 'FILE';
  const parts = filename.split('.');
  if (parts.length > 1) {
    const ext = parts[parts.length - 1].toUpperCase();
    return ext.length <= 6 ? ext : 'FILE';
  }
  return 'FILE';
};

const getAttachmentIconName = (att: TaskAttachmentItem): string => {
  const mime = (att.mimeType || '').toLowerCase();
  const name = (att.fileName || att.originalName || '').toLowerCase();

  if (mime.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(name)) {
    return 'file-image';
  }
  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    return 'file-text';
  }
  if (
    mime.includes('zip') ||
    mime.includes('tar') ||
    mime.includes('compressed') ||
    /\.(zip|rar|7z|tar|gz)$/i.test(name)
  ) {
    return 'file-archive';
  }
  if (
    mime.includes('json') ||
    mime.includes('javascript') ||
    mime.includes('typescript') ||
    mime.includes('html') ||
    /\.(js|ts|tsx|jsx|json|html|css|py|java|cpp|c|md|yml|yaml)$/i.test(name)
  ) {
    return 'file-code';
  }
  if (
    mime.includes('word') ||
    mime.includes('document') ||
    mime.includes('excel') ||
    mime.includes('sheet') ||
    /\.(docx?|xlsx?|pptx?|csv|txt|rtf)$/i.test(name)
  ) {
    return 'file-text';
  }
  return 'paperclip';
};

const getFileTypeStyle = (att: TaskAttachmentItem) => {
  const name = (att.fileName || att.originalName || '').toLowerCase();
  const mime = (att.mimeType || '').toLowerCase();
  if (mime.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(name)) {
    return {
      bg: 'bg-orange-500/10 dark:bg-orange-500/20',
      text: 'text-orange-500 dark:text-orange-400',
      badge: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300',
    };
  }
  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    return {
      bg: 'bg-rose-500/10 dark:bg-rose-500/20',
      text: 'text-rose-500 dark:text-rose-400',
      badge: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300',
    };
  }
  if (mime.includes('zip') || /\.(zip|rar|7z|tar|gz)$/i.test(name)) {
    return {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      text: 'text-amber-500 dark:text-amber-400',
      badge: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
    };
  }
  if (
    mime.includes('json') ||
    mime.includes('javascript') ||
    mime.includes('typescript') ||
    /\.(js|ts|tsx|jsx|json|html|css|py|md)$/i.test(name)
  ) {
    return {
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
      text: 'text-indigo-500 dark:text-indigo-400',
      badge: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300',
    };
  }
  return {
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-500 dark:text-blue-400',
    badge: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
  };
};

export const TaskDrawer: React.FC<TaskDrawerProps> = ({
  task,
  onClose,
  onEdit,
  onTaskUpdate,
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
  const [showHistory, setShowHistory] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<TaskAttachmentItem | null>(null);
  const [deletingAttId, setDeletingAttId] = useState<string | null>(null);

  // Close preview lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewAttachment) {
        setPreviewAttachment(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewAttachment]);

  const taskId = task ? (task._id || task.id || '') : '';
  const taskBoardIdStr = typeof task?.boardId === 'object' && task?.boardId !== null ? task.boardId._id : (task?.boardId as string);
  const resolvedBoardId = propBoardId || taskBoardIdStr || (columns[0]?.boardId ?? '');

  // Enable real-time WebSocket comment updates for this task
  useSocketComments(resolvedBoardId, taskId);

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
    }
  }, [task, fetchMembers]);

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

  // Fetch task activity logs on demand
  const {
    data: historyLogs = [],
    isLoading: isLoadingHistory,
    isError: isErrorHistory,
    refetch: refetchHistory,
  } = useQuery<ActivityLog[]>({
    queryKey: ['task-activity-logs', taskId],
    queryFn: () => taskService.getTaskActivityLogs(taskId),
    enabled: !!taskId && showHistory,
  });

  // Checklist Mutations with immediate optimistic UI update
  const checklistMutation = useMutation({
    mutationFn: ({ action, payload }: { action: string; payload: Record<string, unknown> }) =>
      taskService.checklistOperation(taskId, action, payload),
    onMutate: async ({ action, payload }) => {
      await queryClient.cancelQueries({ queryKey: ['task-details', taskId] });
      const previousTask = queryClient.getQueryData<Task>(['task-details', taskId]) || activeTask;

      if (previousTask && Array.isArray(previousTask.checklist)) {
        let newChecklist = [...previousTask.checklist];
        if (action === 'add' && payload.text) {
          const tempId = `temp-${Date.now()}`;
          newChecklist.push({
            _id: tempId,
            id: tempId,
            text: String(payload.text),
            isDone: false,
          });
        } else if (action === 'update' && payload.itemId) {
          newChecklist = newChecklist.map((item) =>
            item._id === payload.itemId || item.id === payload.itemId
              ? {
                  ...item,
                  ...(payload.text !== undefined ? { text: String(payload.text) } : {}),
                  ...(payload.isDone !== undefined ? { isDone: Boolean(payload.isDone) } : {}),
                }
              : item
          );
        } else if (action === 'remove' && payload.itemId) {
          newChecklist = newChecklist.filter(
            (item) => item._id !== payload.itemId && item.id !== payload.itemId
          );
        }

        const isAllDone = newChecklist.length > 0 && newChecklist.every((i) => i.isDone);
        const optimisticTask: Task = {
          ...previousTask,
          checklist: newChecklist,
          isCompleted: isAllDone,
        };

        queryClient.setQueryData(['task-details', taskId], optimisticTask);
        if (resolvedBoardId) {
          queryClient.setQueryData<Task[]>(['boardTasks', resolvedBoardId], (old = []) =>
            old.map((t) => (t._id === taskId || t.id === taskId ? { ...t, ...optimisticTask } : t))
          );
          queryClient.setQueryData<Task[]>(['tasks', resolvedBoardId], (old = []) =>
            old.map((t) => (t._id === taskId || t.id === taskId ? { ...t, ...optimisticTask } : t))
          );
        }
        onTaskUpdate?.(optimisticTask);
      }

      return { previousTask };
    },
    onSuccess: (updatedTask) => {
      if (updatedTask) {
        queryClient.setQueryData(['task-details', taskId], updatedTask);
        if (resolvedBoardId) {
          queryClient.setQueryData<Task[]>(['boardTasks', resolvedBoardId], (old = []) =>
            old.map((t) => (t._id === taskId || t.id === taskId ? { ...t, ...updatedTask } : t))
          );
          queryClient.setQueryData<Task[]>(['tasks', resolvedBoardId], (old = []) =>
            old.map((t) => (t._id === taskId || t.id === taskId ? { ...t, ...updatedTask } : t))
          );
        }
        queryClient.setQueryData<Task[]>(['assigned-tasks'], (old = []) =>
          old.map((t) => (t._id === taskId || t.id === taskId ? { ...t, ...updatedTask } : t))
        );
        queryClient.setQueryData<Task[]>(['created-tasks'], (old = []) =>
          old.map((t) => (t._id === taskId || t.id === taskId ? { ...t, ...updatedTask } : t))
        );
        onTaskUpdate?.(updatedTask);
      }
      queryClient.invalidateQueries({ queryKey: ['workspace-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['created-tasks'] });
      setNewChecklistText('');
    },
    onError: (err: unknown, _vars, context) => {
      if (context?.previousTask) {
        queryClient.setQueryData(['task-details', taskId], context.previousTask);
        onTaskUpdate?.(context.previousTask);
      }
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
      queryClient.invalidateQueries({ queryKey: ['boardTasks', resolvedBoardId] });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['created-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-analytics'] });
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Attachment upload failed');
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: string) => {
      setDeletingAttId(attachmentId);
      return taskService.deleteAttachment(taskId, attachmentId);
    },
    onSuccess: () => {
      toast.success('Attachment removed');
      queryClient.invalidateQueries({ queryKey: ['task-details', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', resolvedBoardId] });
      queryClient.invalidateQueries({ queryKey: ['boardTasks', resolvedBoardId] });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['created-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-analytics'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to remove attachment');
    },
    onSettled: () => {
      setDeletingAttId(null);
    },
  });

  // Comment Mutations
  const addCommentMutation = useMutation({
    mutationFn: (payload: { body: string; mentions?: string[] }) =>
      commentService.addComment(taskId, payload),
    onSuccess: () => {
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

    // Max 10MB limit check
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size exceeds the 10MB limit');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size === 0) {
      toast.error('Selected file is empty');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    uploadAttachmentMutation.mutate(formData);
  };

  const handleDownloadAttachment = async (fileUrl?: string, fileName?: string) => {
    if (!fileUrl) {
      toast.error('File URL is not available');
      return;
    }
    const safeName = fileName || 'attachment';
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = safeName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback for CORS-restricted downloads
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = safeName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
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
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <Icon name="paperclip" size={14} className="text-orange-500" />
                Attachments ({attachmentsList.length})
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadAttachmentMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-semibold rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
              >
                {uploadAttachmentMutation.isPending ? (
                  <>
                    <Icon name="loader-2" size={13} className="animate-spin" />
                    <span>Uploading…</span>
                  </>
                ) : (
                  <>
                    <Icon name="plus" size={13} />
                    <span>Attach File</span>
                  </>
                )}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {attachmentsList.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 text-center bg-neutral-50/50 dark:bg-neutral-900/30">
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  No file attachments yet. Click <span className="font-semibold text-neutral-600 dark:text-neutral-300">Attach File</span> to upload screenshots, PDFs, or documents (up to 10MB).
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 mt-2">
                {attachmentsList.map((att) => {
                  const attId = att._id || att.id || '';
                  const fileName = att.fileName || att.originalName || 'Attachment';
                  const fileUrl = att.fileUrl || att.url || '';
                  const fileSizeStr = formatFileSize(att.sizeBytes ?? att.size);
                  const isImg = isImageAttachment(att);
                  const fileExt = getFileExtension(fileName);
                  const styleInfo = getFileTypeStyle(att);
                  const isDeleting = deletingAttId === attId;

                  return (
                    <div
                      key={attId || fileName}
                      className={`flex items-center justify-between p-3 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-800/40 hover:bg-neutral-100/70 dark:hover:bg-neutral-800/70 transition-all ${
                        isDeleting ? 'opacity-40 pointer-events-none' : ''
                      }`}
                    >
                      {/* Left: Thumbnail or File Icon + Details */}
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                        {isImg && fileUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewAttachment(att)}
                            className="w-11 h-11 rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-700 shrink-0 border border-neutral-200 dark:border-neutral-700 group relative cursor-pointer"
                            title="Click to preview image"
                          >
                            <img
                              src={fileUrl}
                              alt={fileName}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Icon name="eye" size={14} />
                            </div>
                          </button>
                        ) : (
                          <div
                            className={`w-11 h-11 rounded-xl ${styleInfo.bg} ${styleInfo.text} flex flex-col items-center justify-center shrink-0 border border-neutral-200/40 dark:border-neutral-700/40`}
                          >
                            <Icon name={getAttachmentIconName(att)} size={18} />
                            <span className="text-[9px] font-bold uppercase tracking-tight leading-none mt-0.5 opacity-80">
                              {fileExt}
                            </span>
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p
                            className="text-xs font-bold text-neutral-800 dark:text-neutral-100 truncate leading-snug"
                            title={fileName}
                          >
                            {fileName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                            <span className={`px-1.5 py-0.2 rounded font-semibold text-[9.5px] uppercase ${styleInfo.badge}`}>
                              {fileExt}
                            </span>
                            <span>•</span>
                            <span>{fileSizeStr}</span>
                            {att.createdAt && (
                              <>
                                <span>•</span>
                                <span>{new Date(att.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions (View, Download, Delete) */}
                      <div className="flex items-center gap-1 shrink-0">
                        {isImg && fileUrl && (
                          <button
                            type="button"
                            onClick={() => setPreviewAttachment(att)}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/80 dark:hover:bg-neutral-700/80 transition cursor-pointer flex items-center gap-1"
                            title="View full image"
                          >
                            <Icon name="eye" size={13} />
                            <span className="hidden sm:inline">View</span>
                          </button>
                        )}

                        {fileUrl && (
                          <button
                            type="button"
                            onClick={() => handleDownloadAttachment(fileUrl, fileName)}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/80 dark:hover:bg-neutral-700/80 transition cursor-pointer flex items-center gap-1"
                            title="Download attachment"
                          >
                            <Icon name="download" size={13} />
                            <span className="hidden sm:inline">Download</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => deleteAttachmentMutation.mutate(attId)}
                          disabled={isDeleting || deleteAttachmentMutation.isPending}
                          className="p-1.5 rounded-xl text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer disabled:opacity-40"
                          title="Delete attachment"
                        >
                          {isDeleting ? (
                            <Icon name="loader-2" size={14} className="animate-spin text-rose-500" />
                          ) : (
                            <Icon name="trash-2" size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Task Activity Logs Section */}
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
                    <p className="text-[11.5px] text-rose-600 dark:text-rose-400">Failed to load history</p>
                    <button
                      type="button"
                      onClick={() => refetchHistory()}
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
                      <div key={log._id} className="flex gap-2 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100/30 dark:hover:bg-neutral-800/30 p-1.5 rounded-lg transition">
                        <Avatar name={actorName} size={18} ring={false} />
                        <div className="flex-1">
                          <p className="text-neutral-600 dark:text-neutral-300 leading-normal">
                            <span className="text-neutral-800 dark:text-neutral-200 font-semibold">{actorName}</span>{' '}
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

          {/* Activity & Real Comments Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] text-neutral-400 dark:text-neutral-500 flex items-center gap-1 font-medium">
                <Icon name="clock" size={12} /> Activity & Comments ({comments.length + 1})
              </p>
            </div>

            <div className="space-y-3 text-[12px]">
              {/* Task Creation Log */}
              {(() => {
                const creatorRaw = populatedTask?.createdBy || activeTask?.createdBy;
                let creatorName = 'Former member';
                if (typeof creatorRaw === 'object' && creatorRaw !== null) {
                  creatorName = creatorRaw.fullName || creatorRaw.name || creatorRaw.email || 'Former member';
                } else if (typeof creatorRaw === 'string' && creatorRaw) {
                  const matched = teamMembers.find((m) => m.id === creatorRaw);
                  if (matched) {
                    creatorName = matched.name || matched.email || 'Former member';
                  } else if (currentUser && String(currentUser._id) === creatorRaw) {
                    creatorName = currentUser.fullName || currentUser.email || 'You';
                  }
                }

                const taskCreatedAtStr = populatedTask?.createdAt || activeTask?.createdAt;

                return (
                  <div className="flex gap-2 items-start">
                    <Avatar name={creatorName} size={20} ring={false} />
                    <div className="flex-1 min-w-0">
                      <p className="text-neutral-500 dark:text-neutral-400 leading-normal">
                        <span className="text-neutral-700 dark:text-neutral-200 font-medium">
                          {creatorName}
                        </span>{' '}
                        created this task
                      </p>
                      {taskCreatedAtStr && (
                        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                          {formatRelativeTime(String(taskCreatedAtStr))}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}

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
                            {renderCommentBody(c.body)}
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

        {/* Comment Input Form with @Mention Autocomplete */}
        <div className="px-5 py-3 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <MentionCommentInput
            workspaceId={workspaceId}
            onSubmit={(body, mentions) => {
              addCommentMutation.mutate({
                body,
                mentions: mentions.length > 0 ? mentions : undefined,
              });
            }}
            disabled={addCommentMutation.isPending}
          />
        </div>
      </div>

      {/* Image Lightbox Preview Modal */}
      {previewAttachment && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-900/95 shrink-0">
              <div className="min-w-0 flex-1 pr-4">
                <p className="text-sm font-bold text-neutral-100 truncate">
                  {previewAttachment.fileName || previewAttachment.originalName || 'Image Preview'}
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {formatFileSize(previewAttachment.sizeBytes ?? previewAttachment.size)}
                  {previewAttachment.createdAt &&
                    ` • ${new Date(previewAttachment.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    handleDownloadAttachment(
                      previewAttachment.fileUrl || previewAttachment.url,
                      previewAttachment.fileName || previewAttachment.originalName
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 transition cursor-pointer"
                  title="Download image"
                >
                  <Icon name="download" size={14} />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                  title="Close preview (Esc)"
                >
                  <Icon name="x" size={18} />
                </button>
              </div>
            </div>

            {/* Lightbox Image Container */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/50 min-h-[250px]">
              <img
                src={previewAttachment.fileUrl || previewAttachment.url}
                alt={previewAttachment.fileName || previewAttachment.originalName || 'Preview'}
                className="max-h-[72vh] max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDrawer;
