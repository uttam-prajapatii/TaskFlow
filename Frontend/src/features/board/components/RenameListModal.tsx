import React, { useState, useEffect } from 'react';
import Modal from '../../../components/UI/Modal';
import Icon from '../../../components/UI/Icon';
import { toast } from 'sonner';

interface RenameListModalProps {
  open: boolean;
  currentTitle: string;
  onClose: () => void;
  onSave: (newName: string) => Promise<void>;
  saving: boolean;
}

export const RenameListModal: React.FC<RenameListModalProps> = ({
  open,
  currentTitle,
  onClose,
  onSave,
  saving,
}) => {
  const [title, setTitle] = useState(currentTitle);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(currentTitle);
    setError(null);
  }, [currentTitle, open]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!val.trim()) {
      setError('List title is required.');
    } else if (val.trim().length < 2) {
      setError('List title must be at least 2 characters.');
    } else if (val.length > 50) {
      setError('List title cannot exceed 50 characters.');
    } else {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();

    if (!trimmed) {
      setError('List title is required.');
      toast.error('List title is required.');
      return;
    }

    if (trimmed.length < 2 || trimmed.length > 50) {
      setError('List title must be between 2 and 50 characters.');
      toast.error('List title must be between 2 and 50 characters.');
      return;
    }

    if (trimmed === currentTitle.trim()) {
      onClose();
      return;
    }

    await onSave(trimmed);
  };

  return (
    <Modal open={open} onClose={onClose} width={440}>
      <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            Rename List
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Update the title for this column.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
        >
          <Icon name="x" size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
            List Title <span className="text-orange-500">*</span>
          </label>
          <div className="relative">
            <input
              autoFocus
              type="text"
              maxLength={50}
              value={title}
              onChange={handleTitleChange}
              placeholder="e.g. In Progress, Review, Backlog…"
              className={`w-full px-3.5 py-2.5 rounded-xl text-sm border bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 outline-none transition ${
                error
                  ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-neutral-200 dark:border-neutral-800 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
              }`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-neutral-400">
              {title.length}/50
            </span>
          </div>

          {error ? (
            <p className="text-[11.5px] font-semibold text-rose-500 mt-1.5 flex items-center gap-1">
              <Icon name="alert-circle" size={13} /> {error}
            </p>
          ) : (
            <p className="text-[11px] text-neutral-400 mt-1.5">
              List title must be between 2 and 50 characters.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving || !!error || !title.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving…</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default RenameListModal;
