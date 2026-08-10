import React, { useState, useEffect } from 'react';
import Modal from '../../../components/UI/Modal';
import Icon from '../../../components/UI/Icon';
import type { WorkspaceRole } from '../types';

interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
  onInvite: (email: string, role: WorkspaceRole) => void;
  sending?: boolean;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  open,
  onClose,
  onInvite,
  sending = false,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('member');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setEmail('');
      setRole('member');
      setError('');
    }
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;

    const trimmed = email.trim();
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmed) {
      setError('Email address is required.');
      return;
    }
    if (!re.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    onInvite(trimmed, role);
  };

  return (
    <Modal open={open} onClose={onClose} width={440}>
      {/* Modal Header */}
      <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            Invite Member
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            They will get an email invite to join this workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={sending}
          className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
        >
          <Icon name="x" size={16} />
        </button>
      </div>

      {/* Form Content */}
      <form onSubmit={submit} className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
            Email Address <span className="text-orange-500">*</span>
          </label>
          <input
            autoFocus
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            className={`w-full px-3.5 py-2.5 rounded-xl text-sm border bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline-none transition ${
              error
                ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                : 'border-neutral-200 dark:border-neutral-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
            }`}
          />
          {error && (
            <p className="text-[11.5px] font-semibold text-rose-500 mt-1.5 flex items-center gap-1">
              <Icon name="alert-circle" size={13} /> {error}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
            Role <span className="text-orange-500">*</span>
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as WorkspaceRole)}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 cursor-pointer transition"
          >
            <option value="admin" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
              Admin — Can manage members & settings
            </option>
            <option value="member" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
              Member — Can create & edit boards and tasks
            </option>
            <option value="viewer" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
              Viewer — Read-only access to workspace
            </option>
          </select>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={sending || !email.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Sending…</span>
              </>
            ) : (
              <span>Send Invite</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default InviteMemberModal;
