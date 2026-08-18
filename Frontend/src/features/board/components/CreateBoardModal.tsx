import React, { useState, useEffect } from 'react';
import Modal from '../../../components/UI/Modal';
import Icon from '../../../components/UI/Icon';
import WorkspaceAvatar from '../../../components/UI/WorkspaceAvatar';
import type { Workspace } from '../../workspace/types';
import type { CreateBoardPayload } from '../types';
import { toast } from 'sonner';

interface CreateBoardModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: CreateBoardPayload) => void;
  workspaces: Workspace[];
  defaultWorkspaceId?: string;
  creating?: boolean;
}

export const CreateBoardModal: React.FC<CreateBoardModalProps> = ({
  open,
  onClose,
  onCreate,
  workspaces,
  defaultWorkspaceId,
  creating = false,
}) => {
  const [form, setForm] = useState<{
    name: string;
    description: string;
    workspaceId: string;
  }>({
    name: '',
    description: '',
    workspaceId: defaultWorkspaceId || workspaces[0]?._id || workspaces[0]?.id || '',
  });

  const [errors, setErrors] = useState<{ name?: string; workspaceId?: string }>({});

  useEffect(() => {
    if (open) {
      const initialWsId = defaultWorkspaceId || workspaces[0]?._id || workspaces[0]?.id || '';
      setForm({
        name: '',
        description: '',
        workspaceId: initialWsId,
      });
      setErrors({});
    }
  }, [open, defaultWorkspaceId, workspaces]);

  if (!open) return null;

  const selectedWorkspace = workspaces.find(
    (w) => (w._id || w.id) === (form.workspaceId || defaultWorkspaceId)
  ) || workspaces[0];

  const showDropdown = !defaultWorkspaceId && workspaces.length > 1;

  const handleNameChange = (val: string) => {
    setForm((f) => ({ ...f, name: val }));
    if (!val.trim()) {
      setErrors((e) => ({ ...e, name: 'Board name is required.' }));
    } else if (val.trim().length < 3) {
      setErrors((e) => ({ ...e, name: 'Board name must be at least 3 characters.' }));
    } else if (val.length > 50) {
      setErrors((e) => ({ ...e, name: 'Board name cannot exceed 50 characters.' }));
    } else {
      setErrors((e) => ({ ...e, name: undefined }));
    }
  };

  const validate = () => {
    const e: { name?: string; workspaceId?: string } = {};
    const trimmedName = form.name.trim();
    if (!trimmedName) e.name = 'Board name is required.';
    else if (trimmedName.length < 3) e.name = 'Board name must be at least 3 characters.';
    else if (trimmedName.length > 50) e.name = 'Board name cannot exceed 50 characters.';
    if (!form.workspaceId) e.workspaceId = 'Please select a workspace.';
    setErrors(e);

    if (Object.keys(e).length > 0) {
      const firstError = e.name || e.workspaceId;
      toast.error(firstError, { id: 'create-board-validation-error' });
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;

    if (validate()) {
      onCreate({
        name: form.name.trim(),
        description: form.description.trim(),
        workspaceId: form.workspaceId,
      });
    }
  };

  return (
    <Modal open={open} onClose={onClose} width={440}>
      {/* Header */}
      <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            Create Board
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Add a new Kanban board to organize your tasks.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={creating}
          className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
        >
          <Icon name="x" size={16} />
        </button>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Workspace Display */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
            Workspace <span className="text-orange-500">*</span>
          </label>
          {showDropdown ? (
            <select
              value={form.workspaceId}
              onChange={(e) => setForm({ ...form, workspaceId: e.target.value })}
              className={`w-full px-3.5 py-2.5 rounded-xl text-sm border bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline-none transition cursor-pointer ${
                errors.workspaceId
                  ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-neutral-200 dark:border-neutral-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
              }`}
            >
              {workspaces.map((w) => (
                <option key={w._id || w.id} value={w._id || w.id} className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
                  {w.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              <WorkspaceAvatar
                name={selectedWorkspace?.name || 'WS'}
                logoUrl={selectedWorkspace?.logoUrl}
                color={selectedWorkspace?.settings?.color || selectedWorkspace?.color}
                size={28}
                roundedClassName="rounded-lg"
              />
              <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate flex-1 min-w-0">
                {selectedWorkspace?.name || 'Current Workspace'}
              </span>
            </div>
          )}
          {errors.workspaceId && (
            <p className="text-[11.5px] font-semibold text-rose-500 mt-1.5 flex items-center gap-1">
              <Icon name="alert-circle" size={13} /> {errors.workspaceId}
            </p>
          )}
        </div>

        {/* Board Name */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
            Board Name <span className="text-orange-500">*</span>
          </label>
          <div className="relative">
            <input
              autoFocus
              type="text"
              maxLength={50}
              placeholder="e.g. Product Launch, Marketing Campaign…"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={`w-full px-3.5 py-2.5 pr-14 rounded-xl text-sm border bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline-none transition ${
                errors.name
                  ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-neutral-200 dark:border-neutral-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
              }`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-neutral-400">
              {form.name.length}/50
            </span>
          </div>
          {errors.name ? (
            <p className="text-[11.5px] font-semibold text-rose-500 mt-1.5 flex items-center gap-1">
              <Icon name="alert-circle" size={13} /> {errors.name}
            </p>
          ) : (
            <p className="text-[11px] text-neutral-400 mt-1.5">
              Board name must be between 3 and 50 characters.
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Description
            </label>
            <span className="text-[11px] text-neutral-400">
              {form.description.length}/200
            </span>
          </div>
          <textarea
            maxLength={200}
            rows={3}
            placeholder="What's this board for?"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition resize-none"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={creating || !!errors.name || !form.name.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating…</span>
              </>
            ) : (
              <span>Create Board</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateBoardModal;
