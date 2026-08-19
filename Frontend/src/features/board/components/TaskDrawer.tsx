import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { Task, BoardList, ChecklistItem, TaskAttachmentItem, ActivityLog } from '../types';
import type { WorkspaceMember } from '../../workspace/types';
import { isOverdue } from '../../../utils/date';
import workspaceService from '../../../services/workspace.service';
import taskService from '../../../services/task.service';
import commentService, { type Comment } from '../../../services/comment.service';
import useAuth from '../../../hooks/useAuth';
import useSocketComments from '../../../hooks/useSocketComments';

import TaskDrawerHeader from './drawer/TaskDrawerHeader';
import TaskDrawerMetadata from './drawer/TaskDrawerMetadata';
import TaskDrawerChecklist from './drawer/TaskDrawerChecklist';
import TaskDrawerAttachments from './drawer/TaskDrawerAttachments';
import TaskDrawerComments from './drawer/TaskDrawerComments';
import TaskDrawerActivity from './drawer/TaskDrawerActivity';
import TaskDrawerImageLightbox from './drawer/TaskDrawerImageLightbox';

interface TaskDrawerProps {
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onTaskUpdate?: (updatedTask: Task) => void;
  columns: BoardList[];
  workspaceId?: string;
  boardId?: string;
}

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

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string; email?: string }[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<TaskAttachmentItem | null>(null);
  const [deletingAttId, setDeletingAttId] = useState<string | null>(null);

  const taskId = task ? task._id || task.id || '' : '';
  const taskBoardIdStr =
    typeof task?.boardId === 'object' && task?.boardId !== null
      ? task.boardId._id
      : (task?.boardId as string);
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
        setTeamMembers([
          {
            id: currentUser._id,
            name: currentUser.fullName || currentUser.email || 'You',
            email: currentUser.email,
          },
        ]);
      }
      return;
    }
    try {
      const members: WorkspaceMember[] = await workspaceService.listMembers(workspaceId);
      const formatted = members.map((m: WorkspaceMember) => {
        const uObj = typeof m.userId === 'object' && m.userId !== null ? m.userId : null;
        const id = uObj ? uObj._id : (m.userId as string);
        const name = uObj
          ? uObj.fullName || uObj.name || uObj.email || 'Member'
          : 'Team Member';
        const email = uObj ? uObj.email : undefined;
        return { id, name, email };
      });
      if (formatted.length === 0 && currentUser?._id) {
        formatted.push({
          id: currentUser._id,
          name: currentUser.fullName || currentUser.email || 'You',
          email: currentUser.email,
        });
      }
      setTeamMembers(formatted);
    } catch {
      if (currentUser?._id) {
        setTeamMembers([
          {
            id: currentUser._id,
            name: currentUser.fullName || currentUser.email || 'You',
            email: currentUser.email,
          },
        ]);
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
        if (onTaskUpdate && optimisticTask._id) {
          onTaskUpdate(optimisticTask);
        }
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
        if (onTaskUpdate && updatedTask._id) {
          onTaskUpdate(updatedTask);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['workspace-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['created-tasks'] });
      setNewChecklistText('');
    },
    onError: (err: unknown, _vars, context) => {
      if (context?.previousTask) {
        queryClient.setQueryData(['task-details', taskId], context.previousTask);
        if (onTaskUpdate && context.previousTask._id) {
          onTaskUpdate(context.previousTask);
        }
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
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Attachment upload failed');
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
  const colIdStr =
    typeof colId === 'object' && colId !== null ? (colId as { _id?: string })._id : colId;
  const currentCol = columns.find((c) => (c._id || c.id) === colIdStr);
  const overdue = isOverdue(activeTask.dueDate) && activeTask.status !== 'done';

  // Checklist Items & Counts
  const checklistItems: ChecklistItem[] = Array.isArray(activeTask.checklist)
    ? activeTask.checklist
    : [];
  const doneChecklistCount = checklistItems.filter((i) => i.isDone).length;
  const totalChecklistCount = checklistItems.length;

  // Attachments List
  const attachmentsList: TaskAttachmentItem[] = Array.isArray(activeTask.attachments)
    ? (activeTask.attachments as TaskAttachmentItem[])
    : [];

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
      e.target.value = '';
      return;
    }

    if (file.size === 0) {
      toast.error('Selected file is empty');
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    uploadAttachmentMutation.mutate(formData);
    e.target.value = '';
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

  const creatorRaw = populatedTask?.createdBy || activeTask?.createdBy;
  let creatorName = 'Former member';
  if (typeof creatorRaw === 'object' && creatorRaw !== null) {
    creatorName =
      creatorRaw.fullName || creatorRaw.name || creatorRaw.email || 'Former member';
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
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative w-full max-w-md h-full bg-white dark:bg-neutral-900 shadow-2xl border-l border-neutral-200 dark:border-neutral-800 flex flex-col z-10"
        style={{ animation: 'slideIn 0.25s ease-out' }}
      >
        {/* Drawer Header */}
        <TaskDrawerHeader
          currentCol={currentCol}
          task={activeTask}
          onEdit={onEdit}
          onClose={onClose}
        />

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Metadata & Details */}
          <TaskDrawerMetadata
            task={activeTask}
            currentCol={currentCol}
            resolveAssigneeName={resolveAssigneeName}
            overdue={overdue}
          />

          {/* Interactive Checklist Section */}
          <TaskDrawerChecklist
            checklistItems={checklistItems}
            doneCount={doneChecklistCount}
            totalCount={totalChecklistCount}
            newChecklistText={newChecklistText}
            setNewChecklistText={setNewChecklistText}
            onAddItem={handleAddChecklistItem}
            onToggleItem={(itemId, isDone) =>
              checklistMutation.mutate({ action: 'update', payload: { itemId, isDone } })
            }
            onRemoveItem={(itemId) =>
              checklistMutation.mutate({ action: 'remove', payload: { itemId } })
            }
            isPending={checklistMutation.isPending}
          />

          {/* File Attachments Section */}
          <TaskDrawerAttachments
            attachmentsList={attachmentsList}
            isUploading={uploadAttachmentMutation.isPending}
            deletingAttId={deletingAttId}
            onFileSelect={handleFileChange}
            onPreview={setPreviewAttachment}
            onDownload={handleDownloadAttachment}
            onDelete={(attId) => deleteAttachmentMutation.mutate(attId)}
          />

          {/* Task Activity Logs Section */}
          <TaskDrawerActivity
            historyLogs={historyLogs}
            showHistory={showHistory}
            setShowHistory={setShowHistory}
            isLoadingHistory={isLoadingHistory}
            isErrorHistory={isErrorHistory}
            onRefetchHistory={() => refetchHistory()}
          />

          {/* Activity & Real Comments Section */}
          <TaskDrawerComments
            comments={comments}
            isLoadingComments={isLoadingComments}
            isErrorComments={isErrorComments}
            onRefetchComments={() => refetchComments()}
            currentUser={currentUser}
            workspaceId={workspaceId}
            creatorName={creatorName}
            taskCreatedAtStr={taskCreatedAtStr ? String(taskCreatedAtStr) : undefined}
            editingCommentId={editingCommentId}
            editingBody={editingBody}
            setEditingBody={setEditingBody}
            setEditingCommentId={setEditingCommentId}
            onStartEdit={(c) => {
              setEditingCommentId(c._id);
              setEditingBody(c.body);
            }}
            onSaveEdit={(commentId) => {
              if (!editingBody.trim()) return;
              updateCommentMutation.mutate({ commentId, body: editingBody.trim() });
            }}
            onDeleteComment={(commentId) => deleteCommentMutation.mutate(commentId)}
            onAddComment={(body, mentions) => {
              addCommentMutation.mutate({
                body,
                mentions: mentions.length > 0 ? mentions : undefined,
              });
            }}
            isPostingComment={addCommentMutation.isPending}
            isUpdatingComment={updateCommentMutation.isPending}
            isDeletingComment={deleteCommentMutation.isPending}
          />
        </div>
      </div>

      {/* Image Lightbox Preview Modal */}
      <TaskDrawerImageLightbox
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
        onDownload={handleDownloadAttachment}
      />
    </div>
  );
};

export default TaskDrawer;
