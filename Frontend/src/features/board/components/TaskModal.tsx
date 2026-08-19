import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Task, BoardList, PriorityLevel, CreateTaskPayload, Label } from '../types';
import { PRIORITY_CONFIG, PRESET_LABEL_COLORS } from '../../../constants/task.constants';
import Modal from '../../../components/UI/Modal';
import Icon from '../../../components/UI/Icon';
import workspaceService from '../../../services/workspace.service';
import labelService from '../../../services/label.service';
import useAuth from '../../../hooks/useAuth';
import { toast } from 'sonner';

import TaskLabelPicker from './modal/TaskLabelPicker';
import TaskAssigneePicker from './modal/TaskAssigneePicker';

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: CreateTaskPayload) => void;
  initial?: Task | null;
  columns: BoardList[];
  defaultColumnId?: string;
  saving?: boolean;
  workspaceId?: string;
  boardId?: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  open,
  onClose,
  onSave,
  initial,
  columns,
  defaultColumnId,
  saving = false,
  workspaceId,
  boardId,
}) => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string; email?: string }[]>([]);

  const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');

  // Create Label state
  const [showCreateLabel, setShowCreateLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(PRESET_LABEL_COLORS[0]);
  const [createLabelError, setCreateLabelError] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState<{
    title: string;
    description: string;
    priority: PriorityLevel;
    status: string;
    dueDate: string;
    labels: string[];
    assignees: string[];
  }>({
    title: '',
    description: '',
    priority: 'medium',
    status: defaultColumnId || columns[0]?._id || columns[0]?.id || 'todo',
    dueDate: '',
    labels: [],
    assignees: [],
  });

  const [errors, setErrors] = useState<{ title?: string; dueDate?: string; status?: string }>({});

  // Fetch real board labels dynamically from backend API
  const {
    data: boardLabels = [],
    isLoading: isLoadingLabels,
  } = useQuery<Label[]>({
    queryKey: ['labels', boardId],
    queryFn: () => (boardId ? labelService.getBoardLabels(boardId) : Promise.resolve([])),
    enabled: !!boardId && open,
  });

  // Create Label mutation
  const createLabelMutation = useMutation({
    mutationFn: (payload: { name: string; color: string }) =>
      labelService.createLabel(boardId!, payload),
    onSuccess: (createdLabel) => {
      queryClient.invalidateQueries({ queryKey: ['labels', boardId] });
      queryClient.invalidateQueries({ queryKey: ['boardTasks', boardId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', boardId] });
      toast.success(`Label "${createdLabel.name}" created`);
      setForm((f) => ({
        ...f,
        labels: f.labels.includes(createdLabel._id) ? f.labels : [...f.labels, createdLabel._id],
      }));
      setNewLabelName('');
      setCreateLabelError(null);
      setShowCreateLabel(false);
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error.response?.data?.message || 'Failed to create label';
      setCreateLabelError(msg);
      toast.error(msg);
    },
  });

  // Update Label mutation
  const updateLabelMutation = useMutation({
    mutationFn: ({ labelId, payload }: { labelId: string; payload: { name: string; color: string } }) =>
      labelService.updateLabel(labelId, payload),
    onSuccess: (updatedLabel) => {
      queryClient.invalidateQueries({ queryKey: ['labels', boardId] });
      queryClient.invalidateQueries({ queryKey: ['boardTasks', boardId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', boardId] });
      queryClient.invalidateQueries({ queryKey: ['task-details'] });
      toast.success(`Label "${updatedLabel.name}" updated`);
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to update label');
    },
  });

  // Delete Label mutation
  const deleteLabelMutation = useMutation({
    mutationFn: (labelId: string) => labelService.deleteLabel(labelId),
    onSuccess: (_, deletedLabelId) => {
      queryClient.invalidateQueries({ queryKey: ['labels', boardId] });
      queryClient.invalidateQueries({ queryKey: ['boardTasks', boardId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', boardId] });
      queryClient.invalidateQueries({ queryKey: ['task-details'] });
      setForm((f) => ({
        ...f,
        labels: f.labels.filter((id) => id !== deletedLabelId),
      }));
      toast.success('Label deleted');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to delete label');
    },
  });

  const handleCreateLabel = () => {
    const trimmed = newLabelName.trim();
    if (!trimmed) {
      setCreateLabelError('Label name is required');
      return;
    }
    if (trimmed.length > 50) {
      setCreateLabelError('Label name must be under 50 characters');
      return;
    }
    const isDuplicate = boardLabels.some((l) => l.name.toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) {
      setCreateLabelError(`Label "${trimmed}" already exists`);
      return;
    }
    if (!boardId) {
      setCreateLabelError('Board context is missing');
      return;
    }

    setCreateLabelError(null);
    createLabelMutation.mutate({ name: trimmed, color: newLabelColor });
  };

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
      const members = await workspaceService.listMembers(workspaceId);
      const formatted = members.map((m) => {
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
    if (open) {
      fetchMembers();
      setAssigneeMenuOpen(false);
      setAssigneeSearch('');
      setShowCreateLabel(false);
      setNewLabelName('');
      setCreateLabelError(null);

      if (initial) {
        const mappedAssignees = (initial.assignees || []).map((a) =>
          typeof a === 'object' && a !== null ? a._id : (a as string)
        );
        const mappedLabels = (initial.labels || []).map((l) =>
          typeof l === 'object' && l !== null ? l._id : (l as string)
        );
        const listIdStr =
          typeof initial.listId === 'object' && initial.listId !== null
            ? initial.listId._id
            : (initial.listId as string);

        const existingCol = columns.find(
          (c) => (c._id || c.id) === listIdStr || (c._id || c.id) === initial.status
        );
        const initialStatus = existingCol
          ? existingCol._id || existingCol.id || ''
          : defaultColumnId && columns.some((c) => (c._id || c.id) === defaultColumnId)
          ? defaultColumnId
          : '';

        setForm({
          title: initial.title || '',
          description: initial.description || '',
          priority: initial.priority || 'medium',
          status: initialStatus,
          dueDate: initial.dueDate ? String(initial.dueDate).slice(0, 10) : '',
          labels: mappedLabels,
          assignees: mappedAssignees,
        });
      } else {
        const defaultStatus =
          defaultColumnId && columns.some((c) => (c._id || c.id) === defaultColumnId)
            ? defaultColumnId
            : columns[0]?._id || columns[0]?.id || '';

        setForm({
          title: '',
          description: '',
          priority: 'medium',
          status: defaultStatus,
          dueDate: '',
          labels: [],
          assignees: [],
        });
      }
      setErrors({});
    }
  }, [open, initial, defaultColumnId, columns, fetchMembers]);

  if (!open) return null;

  const validate = () => {
    const e: { title?: string; dueDate?: string; status?: string } = {};
    if (!form.title.trim()) {
      e.title = 'Title is required';
    } else if (form.title.length > 120) {
      e.title = 'Title must be under 120 characters';
    }

    if (columns.length === 0) {
      e.status = 'Create a list/column before adding a task.';
      toast.error('Create a list/column before adding a task.');
    } else if (!form.status || !columns.some((c) => (c._id || c.id) === form.status)) {
      e.status = 'Please select a valid list/column';
      toast.error('Please select an available list/column.');
    }

    if (form.dueDate) {
      const selectedDate = new Date(form.dueDate);
      selectedDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        e.dueDate = 'Due date cannot be in the past';
        toast.error('Please select a future due date.');
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave({
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        status: form.status,
        dueDate: form.dueDate || null,
        labels: form.labels,
        assignees: form.assignees,
      });
    }
  };

  const toggleAssignee = (id: string) => {
    setForm((f) => ({
      ...f,
      assignees: f.assignees.includes(id)
        ? f.assignees.filter((a) => a !== id)
        : [...f.assignees, id],
    }));
  };

  const toggleLabel = (lId: string) => {
    setForm((f) => ({
      ...f,
      labels: f.labels.includes(lId)
        ? f.labels.filter((x) => x !== lId)
        : [...f.labels, lId],
    }));
  };

  return (
    <Modal open={open} onClose={onClose} width={520}>
      <form onSubmit={submit}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900 z-10">
          <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100">
            {initial ? 'Edit task' : 'New task'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 cursor-pointer"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[12px] font-medium text-neutral-600 dark:text-neutral-400">
                Title <span className="text-orange-500">*</span>
              </label>
              <span className="text-[10.5px] text-neutral-400 font-medium">
                {form.title.length}/100
              </span>
            </div>
            <div className="relative">
              <input
                autoFocus
                type="text"
                maxLength={100}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Design the empty-state illustrations"
                className={`w-full px-3 py-2 text-[13.5px] rounded-lg border bg-neutral-50 dark:bg-neutral-800/60 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition ${
                  errors.title ? 'border-rose-400' : 'border-neutral-200 dark:border-neutral-700'
                }`}
              />
            </div>
            {errors.title && <p className="text-[11px] text-rose-500 mt-1">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-[12px] font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Add details about this task…"
              rows={3}
              className="w-full px-3 py-2 text-[13px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition resize-none"
            />
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as PriorityLevel })}
                className="w-full px-3 py-2 text-[13px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400"
              >
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                Status / Column <span className="text-orange-500">*</span>
              </label>
              {columns.length === 0 ? (
                <div>
                  <select
                    disabled
                    value=""
                    className="w-full px-3 py-2 text-[13px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed"
                  >
                    <option value="">No lists available</option>
                  </select>
                  <p className="text-[11px] text-amber-500 font-medium mt-1 flex items-center gap-1">
                    <Icon name="alert-circle" size={12} /> Create a list/column before adding a task.
                  </p>
                </div>
              ) : (
                <div>
                  <select
                    value={form.status}
                    onChange={(e) => {
                      setForm({ ...form, status: e.target.value });
                      if (errors.status) setErrors((prev) => ({ ...prev, status: undefined }));
                    }}
                    className={`w-full px-3 py-2 text-[13px] rounded-lg border bg-neutral-50 dark:bg-neutral-800/60 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 ${
                      errors.status ? 'border-rose-400' : 'border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    {!columns.some((c) => (c._id || c.id) === form.status) && (
                      <option value="" disabled>
                        -- Select an available column --
                      </option>
                    )}
                    {columns.map((c) => (
                      <option key={c._id || c.id} value={c._id || c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                  {errors.status && <p className="text-[11px] text-rose-500 mt-1">{errors.status}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-[12px] font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
              Due date
            </label>
            <input
              type="date"
              min={todayStr}
              value={form.dueDate}
              onChange={(e) => {
                const val = e.target.value;
                setForm({ ...form, dueDate: val });
                if (val) {
                  const selDate = new Date(val);
                  selDate.setHours(0, 0, 0, 0);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  if (selDate < today) {
                    setErrors((prev) => ({ ...prev, dueDate: 'Due date cannot be in the past' }));
                    toast.error('Please select a future due date.');
                  } else {
                    setErrors((prev) => ({ ...prev, dueDate: undefined }));
                  }
                } else {
                  setErrors((prev) => ({ ...prev, dueDate: undefined }));
                }
              }}
              className={`w-full px-3 py-2 text-[13px] rounded-lg border bg-neutral-50 dark:bg-neutral-800/60 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition ${
                errors.dueDate ? 'border-rose-400' : 'border-neutral-200 dark:border-neutral-700'
              }`}
            />
            {errors.dueDate && <p className="text-[11px] text-rose-500 mt-1">{errors.dueDate}</p>}
          </div>

          {/* Dynamic Labels using TaskLabelPicker */}
          <TaskLabelPicker
            boardLabels={boardLabels}
            selectedLabels={form.labels}
            onToggleLabel={toggleLabel}
            showCreateLabel={showCreateLabel}
            setShowCreateLabel={setShowCreateLabel}
            newLabelName={newLabelName}
            setNewLabelName={setNewLabelName}
            newLabelColor={newLabelColor}
            setNewLabelColor={setNewLabelColor}
            createLabelError={createLabelError}
            setCreateLabelError={setCreateLabelError}
            onCreateLabel={handleCreateLabel}
            isCreatingLabel={createLabelMutation.isPending}
            onUpdateLabel={(labelId, payload) =>
              updateLabelMutation.mutate({ labelId, payload })
            }
            isUpdatingLabel={updateLabelMutation.isPending}
            onDeleteLabel={(labelId) => deleteLabelMutation.mutate(labelId)}
            isDeletingLabel={deleteLabelMutation.isPending}
            isLoadingLabels={isLoadingLabels}
          />

          {/* Searchable Assignees using TaskAssigneePicker */}
          <TaskAssigneePicker
            teamMembers={teamMembers}
            selectedAssignees={form.assignees}
            onToggleAssignee={toggleAssignee}
            assigneeMenuOpen={assigneeMenuOpen}
            setAssigneeMenuOpen={setAssigneeMenuOpen}
            assigneeSearch={assigneeSearch}
            setAssigneeSearch={setAssigneeSearch}
          />
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-[13px] font-medium rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || columns.length === 0}
            className="px-4 py-2 text-[13px] font-medium rounded-lg text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-sm shadow-orange-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Create task'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default TaskModal;
