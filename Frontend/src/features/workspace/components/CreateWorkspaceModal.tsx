import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Modal from '../../../components/UI/Modal';
import Icon from '../../../components/UI/Icon';
import { WORKSPACE_COLORS } from './WorkspaceCard';
import type { CreateWorkspacePayload } from '../types';

interface CreateWorkspaceModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: CreateWorkspacePayload) => void;
  creating?: boolean;
}

const colorList = [
  { id: 'coral', label: 'Coral', hex: WORKSPACE_COLORS.coral },
  { id: 'blue', label: 'Blue', hex: WORKSPACE_COLORS.blue },
  { id: 'green', label: 'Green', hex: WORKSPACE_COLORS.green },
  { id: 'violet', label: 'Violet', hex: WORKSPACE_COLORS.violet },
  { id: 'amber', label: 'Amber', hex: WORKSPACE_COLORS.amber },
  { id: 'pink', label: 'Pink', hex: WORKSPACE_COLORS.pink },
];

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  open,
  onClose,
  onCreate,
  creating = false,
}) => {
  const [form, setForm] = useState<{
    name: string;
    description: string;
    color: string;
  }>({
    name: '',
    description: '',
    color: 'coral',
  });

  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ name: '', description: '', color: 'coral' });
      setErrors({});
      setTouched(false);
    }
  }, [open]);

  const validate = (f: typeof form) => {
    const e: { name?: string; description?: string } = {};
    if (!f.name.trim()) e.name = 'Workspace name is required.';
    else if (f.name.trim().length < 3) e.name = 'Use at least 3 characters.';
    else if (f.name.trim().length > 50) e.name = 'Keep it under 50 characters.';
    if (f.description.length > 200) e.description = 'Keep it under 200 characters.';
    return e;
  };

  const handleChangeName = (val: string) => {
    const nextForm = { ...form, name: val };
    setForm(nextForm);
    if (touched) {
      setErrors(validate(nextForm));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const firstErr = Object.values(errs)[0];
      if (firstErr) toast.error(firstErr);
      return;
    }

    onCreate({
      name: form.name.trim(),
      description: form.description.trim(),
      settings: {
        color: form.color,
      },
    });
  };

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[88vh]">
        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 shrink-0">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Create workspace
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Set up a space for your team's boards, docs, and members.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Name Field */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Workspace name
            </label>
            <input
              type="text"
              placeholder="Product Launch"
              value={form.name}
              onChange={(e) => handleChangeName(e.target.value)}
              maxLength={50}
              autoFocus
              className={`w-full px-3.5 py-2.5 rounded-xl text-sm border bg-neutral-50/80 dark:bg-neutral-800/80 text-neutral-900 dark:text-neutral-100 outline-none transition focus:ring-2 ${
                touched && errors.name
                  ? 'border-rose-500 focus:ring-rose-500/20'
                  : 'border-neutral-200 dark:border-neutral-700 focus:ring-orange-500/30 focus:border-orange-500'
              }`}
            />
            <div className="flex items-center justify-between mt-1.5 text-xs">
              {touched && errors.name ? (
                <div className="text-xs text-rose-500 flex items-center gap-1 font-medium">
                  <Icon name="alert-circle" size={13} />
                  {errors.name}
                </div>
              ) : (
                <span className="text-[11px] text-neutral-400">Must be between 3 and 50 characters</span>
              )}
              <span className={`font-mono text-[11px] ${form.name.length >= 45 ? 'text-amber-500 font-bold' : 'text-neutral-400'}`}>
                {form.name.length}/50
              </span>
            </div>
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Description
            </label>
            <textarea
              placeholder="What's this workspace for?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={200}
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-neutral-200 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-800/80 text-neutral-900 dark:text-neutral-100 outline-none transition focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 resize-none"
            />
            <div className="text-[11px] text-neutral-400 mt-1 text-right">
              {form.description.length}/200
            </div>
          </div>

          {/* Color Selector */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Color
            </label>
            <div className="flex items-center gap-2.5">
              {colorList.map((c) => {
                const isSelected = form.color === c.id;
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setForm({ ...form, color: c.id })}
                    aria-label={c.label}
                    style={{ backgroundColor: c.hex }}
                    className={`w-7 h-7 rounded-full cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-neutral-900 scale-110'
                        : 'hover:scale-105 opacity-90'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={creating}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-500/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            {creating ? 'Creating…' : 'Create workspace'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateWorkspaceModal;
