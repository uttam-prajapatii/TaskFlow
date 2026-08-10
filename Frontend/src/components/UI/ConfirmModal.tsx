import React from 'react';
import Modal from './Modal';
import Icon from './Icon';

interface ConfirmModalProps {
  target: { name: string } | null;
  onClose: () => void;
  onConfirm: () => void;
  mode: 'delete' | 'leave';
  itemType?: string; // e.g. 'list' | 'workspace' | 'board' | 'task' | 'member'
  title?: string;
  working?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  target,
  onClose,
  onConfirm,
  mode,
  itemType = 'workspace',
  title,
  working = false,
}) => {
  if (!target) return null;
  const isDelete = mode === 'delete';

  // Capitalize itemType for button text (e.g., 'list' -> 'List')
  const formattedItemType = itemType.charAt(0).toUpperCase() + itemType.slice(1);
  const modalTitle = title || (isDelete ? `Delete ${formattedItemType}` : `Leave ${formattedItemType}`);
  const buttonLabel = isDelete ? `Delete ${formattedItemType}` : `Leave ${formattedItemType}`;

  return (
    <Modal open={!!target} onClose={onClose} width={420}>
      <div className="p-6 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-2xl">
        <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3.5">
          <Icon name={isDelete ? 'trash' : 'log-out'} size={20} />
        </div>

        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
          {modalTitle}
        </h2>

        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
          {isDelete ? (
            <>
              This permanently deletes{' '}
              <strong className="text-neutral-900 dark:text-neutral-100 font-bold">{target.name}</strong> and
              all its contents. This action cannot be undone.
            </>
          ) : (
            <>
              You will lose access to{' '}
              <strong className="text-neutral-900 dark:text-neutral-100 font-bold">{target.name}</strong> until an
              admin invites you back.
            </>
          )}
        </p>

        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800/80">
          <button
            type="button"
            onClick={onClose}
            disabled={working}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={working}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {working ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Working…</span>
              </>
            ) : (
              <span>{buttonLabel}</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
