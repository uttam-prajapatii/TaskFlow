import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Modal from '../../../components/UI/Modal';
import Icon from '../../../components/UI/Icon';
import type { Workspace } from '../types';

interface RenameWorkspaceModalProps {
  ws: Workspace | null;
  onClose: () => void;
  onSave: (workspaceId: string, name: string) => void;
  saving?: boolean;
}

export const RenameWorkspaceModal: React.FC<RenameWorkspaceModalProps> = ({
  ws,
  onClose,
  onSave,
  saving = false,
}) => {
  const [name, setName] = useState(ws?.name || '');
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setName(ws?.name || '');
    setError('');
    setTouched(false);
  }, [ws]);

  if (!ws) return null;

  const validate = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return 'Workspace name is required.';
    if (trimmed.length < 3) return 'Workspace name must be at least 3 characters.';
    if (trimmed.length > 50) return 'Workspace name must be at most 50 characters.';
    return '';
  };

  const handleChange = (val: string) => {
    setName(val);
    if (touched) {
      setError(validate(val));
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const err = validate(name);
    setError(err);
    if (err) {
      toast.error(err);
      return;
    }
    onSave(ws._id || ws.id!, name.trim());
  };

  return (
    <Modal open={!!ws} onClose={onClose} width={440}>
      <form onSubmit={submit} className="p-6 space-y-4">
        <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Rename workspace
        </h2>

        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
            Workspace name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={() => {
              setTouched(true);
              setError(validate(name));
            }}
            autoFocus
            maxLength={50}
            className={`w-full px-3.5 py-2.5 rounded-xl text-sm border bg-neutral-50/80 dark:bg-neutral-800/80 text-neutral-900 dark:text-neutral-100 outline-none transition focus:ring-2 ${
              touched && error
                ? 'border-rose-500 focus:ring-rose-500/20'
                : 'border-neutral-200 dark:border-neutral-700 focus:ring-orange-500/30 focus:border-orange-500'
            }`}
          />
          <div className="flex items-center justify-between mt-1.5 text-xs">
            {touched && error ? (
              <div className="text-xs text-rose-500 flex items-center gap-1 font-medium">
                <Icon name="alert-circle" size={13} />
                {error}
              </div>
            ) : (
              <span className="text-[11px] text-neutral-400">Must be between 3 and 50 characters</span>
            )}
            <span className={`font-mono text-[11px] ${name.length >= 45 ? 'text-amber-500 font-bold' : 'text-neutral-400'}`}>
              {name.length}/50
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-500/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default RenameWorkspaceModal;
