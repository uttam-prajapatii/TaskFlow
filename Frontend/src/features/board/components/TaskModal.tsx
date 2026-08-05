import React, { useState, useEffect, useCallback } from 'react';
import type { Task, BoardList, PriorityLevel, CreateTaskPayload } from '../types';
import { PRIORITY_CONFIG, LABEL_COLORS } from './KanbanTaskCard';
import Modal from '../../../components/UI/Modal';
import Icon from '../../../components/UI/Icon';
import Avatar from '../../../components/UI/Avatar';
import workspaceService from '../../../services/workspace.service';
import useAuth from '../../../hooks/useAuth';

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: CreateTaskPayload) => void;
  initial?: Task | null;
  columns: BoardList[];
  defaultColumnId?: string;
  saving?: boolean;
  workspaceId?: string;
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
}) => {
  const { user: currentUser } = useAuth();
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string; email?: string }[]>([]);

  const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');

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

  const [errors, setErrors] = useState<{ title?: string }>({});

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
      if (initial) {
        const mappedAssignees = (initial.assignees || []).map((a) =>
          typeof a === 'object' && a !== null ? a._id : (a as string)
        );
        setForm({
          title: initial.title || '',
          description: initial.description || '',
          priority: initial.priority || 'medium',
          status: initial.status || initial.listId || defaultColumnId || columns[0]?._id || 'todo',
          dueDate: initial.dueDate ? initial.dueDate.slice(0, 10) : '',
          labels: initial.labels || [],
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
    const e: { title?: string } = {};
    if (!form.title.trim()) e.title = 'Title is required';
    else if (form.title.length > 120) e.title = 'Title must be under 120 characters';
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

  const toggleLabel = (l: string) => {
    setForm((f) => ({
      ...f,
      labels: f.labels.includes(l)
        ? f.labels.filter((x) => x !== l)
        : [...f.labels, l],
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
            <label className="block text-[12px] font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
              Title
            </label>
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Design the empty-state illustrations"
              className={`w-full px-3 py-2 text-[13.5px] rounded-lg border bg-neutral-50 dark:bg-neutral-800/60 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition ${
                errors.title ? 'border-rose-400' : 'border-neutral-200 dark:border-neutral-700'
              }`}
            />
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
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="w-full px-3 py-2 text-[13px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400"
            />
          </div>

          {/* Labels */}
          <div>
            <label className="block text-[12px] font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
              Labels
            </label>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(LABEL_COLORS).map((l) => (
                <button
                  type="button"
                  key={l}
                  onClick={() => toggleLabel(l)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ring-1 ${
                    form.labels.includes(l)
                      ? LABEL_COLORS[l] + ' ring-transparent'
                      : 'bg-transparent text-neutral-400 ring-neutral-200 dark:ring-neutral-700 hover:ring-neutral-300'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
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
