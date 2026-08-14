import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Task, BoardList, PriorityLevel, CreateTaskPayload, Label } from '../types';
import { PRIORITY_CONFIG, getLabelMeta } from './KanbanTaskCard';
import Modal from '../../../components/UI/Modal';
import Icon from '../../../components/UI/Icon';
import Avatar from '../../../components/UI/Avatar';
import workspaceService from '../../../services/workspace.service';
import labelService from '../../../services/label.service';
import useAuth from '../../../hooks/useAuth';
import { toast } from 'sonner';

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

const PRESET_LABEL_COLORS = [
  '#FF501E', // TaskFlow Orange
  '#8B5CF6', // Purple
  '#0284C7', // Sky Blue
  '#F43F5E', // Rose
  '#14B8A6', // Teal
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#10B981', // Emerald
];

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

  const [errors, setErrors] = useState<{ title?: string; dueDate?: string }>({});

  // Fetch real board labels dynamically from backend API
  const {
    data: boardLabels = [],
    isLoading: isLoadingLabels,
  } = useQuery<Label[]>({
    queryKey: ['labels', boardId],
    queryFn: () => labelService.getBoardLabels(boardId!),
    enabled: !!boardId && open,
  });

  // Create Label mutation
  const createLabelMutation = useMutation({
    mutationFn: (payload: { name: string; color: string }) =>
      labelService.createLabel(boardId!, payload),
    onSuccess: (createdLabel) => {
      queryClient.invalidateQueries({ queryKey: ['labels', boardId] });
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

  const handleCreateLabel = (e: React.FormEvent) => {
    e.preventDefault();
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
        setForm({
          title: initial.title || '',
          description: initial.description || '',
          priority: initial.priority || 'medium',
          status: initial.status || initial.listId || defaultColumnId || columns[0]?._id || 'todo',
          dueDate: initial.dueDate ? String(initial.dueDate).slice(0, 10) : '',
          labels: mappedLabels,
          assignees: mappedAssignees,
        });
      } else {
        setForm({
          title: '',
          description: '',
          priority: 'medium',
          status: defaultColumnId || columns[0]?._id || columns[0]?.id || 'todo',
          dueDate: '',
          labels: [],
          assignees: [],
        });
      }
      setErrors({});
    }
  }, [open, initial, defaultColumnId, columns, fetchMembers]);

  if (!open) return null;

  const filteredMembers = teamMembers.filter((m) => {
    const query = assigneeSearch.toLowerCase();
    return m.name.toLowerCase().includes(query) || (m.email || '').toLowerCase().includes(query);
  });

  const validate = () => {
    const e: { title?: string; dueDate?: string } = {};
    if (!form.title.trim()) {
      e.title = 'Title is required';
    } else if (form.title.length > 120) {
      e.title = 'Title must be under 120 characters';
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
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
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
                Status / Column
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 text-[13px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400"
              >
                {columns.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
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

          {/* Dynamic Labels */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[12px] font-medium text-neutral-600 dark:text-neutral-400">
                Labels
              </label>
              {boardId && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateLabel((v) => !v);
                    setCreateLabelError(null);
                    setNewLabelName('');
                  }}
                  className="text-[11.5px] font-semibold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Icon name={showCreateLabel ? 'minus' : 'plus'} size={12} />
                  {showCreateLabel ? 'Cancel' : 'Create label'}
                </button>
              )}
            </div>

            {/* Create Label Inline Form */}
            {showCreateLabel && (
              <div className="mb-3 p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-2.5 animate-[fadeUp_0.15s_ease]">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  <span>Create new label</span>
                  <span className="text-[10.5px] font-normal text-neutral-400">
                    {newLabelName.length}/50
                  </span>
                </div>

                <input
                  autoFocus
                  type="text"
                  maxLength={50}
                  placeholder="Label name (e.g. Frontend, Critical, Ops)"
                  value={newLabelName}
                  onChange={(e) => {
                    setNewLabelName(e.target.value);
                    if (createLabelError) setCreateLabelError(null);
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-orange-400/40"
                />

                {createLabelError && (
                  <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                    <Icon name="alert-circle" size={12} /> {createLabelError}
                  </p>
                )}

                {/* Color Selection */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-medium text-neutral-500 mr-1">Color:</span>
                  {PRESET_LABEL_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewLabelColor(c)}
                      className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                        newLabelColor === c ? 'scale-125 ring-2 ring-offset-1 ring-orange-500' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateLabel(false);
                      setCreateLabelError(null);
                    }}
                    className="px-2.5 py-1 text-[11px] font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateLabel}
                    disabled={createLabelMutation.isPending || !newLabelName.trim()}
                    className="px-3 py-1 text-[11px] font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition disabled:opacity-50 cursor-pointer flex items-center gap-1"
                  >
                    {createLabelMutation.isPending ? (
                      'Saving…'
                    ) : (
                      <>
                        <Icon name="check" size={12} /> Add Label
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Dynamic Label List */}
            {isLoadingLabels ? (
              <div className="flex flex-wrap gap-1.5 py-1">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-6 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                ))}
              </div>
            ) : boardLabels.length === 0 && form.labels.length === 0 ? (
              <div className="py-2 text-[12px] text-neutral-400 dark:text-neutral-500 italic">
                No labels on this board yet. Click "Create label" to add one!
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(() => {
                  const allKnownLabels = [...boardLabels];
                  if (initial?.labels) {
                    initial.labels.forEach((l) => {
                      if (typeof l === 'object' && l !== null && l._id) {
                        if (!allKnownLabels.some((known) => known._id === l._id)) {
                          allKnownLabels.push(l as Label);
                        }
                      }
                    });
                  }

                  return allKnownLabels.map((l) => {
                    const isSelected = form.labels.includes(l._id);
                    const meta = getLabelMeta(l);
                    return (
                      <div
                        key={l._id}
                        style={isSelected ? meta.style : undefined}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium transition select-none ${
                          isSelected
                            ? meta.className + ' ring-2 ring-orange-500/50 shadow-2xs font-semibold'
                            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleLabel(l._id)}
                          className="inline-flex items-center gap-1 cursor-pointer"
                        >
                          {isSelected && <Icon name="check" size={11} className="text-orange-500 shrink-0" />}
                          <span>{meta.name}</span>
                        </button>

                        {isSelected && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLabel(l._id);
                            }}
                            className="p-0.5 -mr-1 rounded-full hover:bg-black/10 dark:hover:bg-white/20 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-100 transition cursor-pointer"
                            title={`Remove ${meta.name}`}
                            aria-label={`Remove ${meta.name}`}
                          >
                            <Icon name="x" size={12} />
                          </button>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          {/* Searchable Assignees Dropdown */}
          <div className="relative">
            <label className="block text-[12px] font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
              Assignees
            </label>

            {/* Selected Assignees Pill Badges */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {form.assignees.map((id) => {
                const member = teamMembers.find((m) => m.id === id);
                const name = member ? member.name : 'Assignee';
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 text-orange-700 dark:text-orange-300 text-[11.5px] font-medium"
                  >
                    <Avatar name={name} size={16} ring={false} />
                    <span>{name}</span>
                    <button
                      type="button"
                      onClick={() => toggleAssignee(id)}
                      className="text-orange-400 hover:text-orange-600 p-0.5 rounded-full"
                    >
                      <Icon name="x" size={12} />
                    </button>
                  </span>
                );
              })}

              <button
                type="button"
                onClick={() => setAssigneeMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-orange-400 text-neutral-600 dark:text-neutral-300 hover:text-orange-600 text-[11.5px] font-semibold transition-all cursor-pointer"
              >
                <Icon name="plus" size={13} />
                <span>Add assignee</span>
                <Icon name="chevron-down" size={12} className="text-neutral-400" />
              </button>
            </div>

            {/* Searchable Dropdown Popover */}
            {assigneeMenuOpen && (
              <div className="absolute left-0 right-0 z-20 mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl p-2.5 space-y-2">
                {/* Search Bar */}
                <div className="relative">
                  <Icon
                    name="search"
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                  />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search members by name or email…"
                    value={assigneeSearch}
                    onChange={(e) => setAssigneeSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-orange-400/40"
                  />
                </div>

                {/* Filtered Members List */}
                <div className="max-h-44 overflow-y-auto space-y-0.5">
                  {filteredMembers.length === 0 ? (
                    <div className="py-3 text-center text-xs text-neutral-400">
                      No members match "{assigneeSearch}"
                    </div>
                  ) : (
                    filteredMembers.map((m) => {
                      const isSelected = form.assignees.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleAssignee(m.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition cursor-pointer ${
                            isSelected
                              ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold'
                              : 'hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar name={m.name} size={22} ring={false} />
                            <div className="truncate">
                              <p className="font-semibold leading-tight truncate">{m.name}</p>
                              {m.email && <p className="text-[10.5px] text-neutral-400 truncate">{m.email}</p>}
                            </div>
                          </div>
                          {isSelected && <Icon name="check" size={14} className="text-orange-500 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-[13px] font-medium rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-[13px] font-medium rounded-lg text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-sm shadow-orange-500/30 transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Create task'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default TaskModal;

