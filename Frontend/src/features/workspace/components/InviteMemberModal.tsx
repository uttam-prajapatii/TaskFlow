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
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    onInvite(email.trim(), role);
  };

  return (
    <Modal open={open} onClose={onClose} width={420}>
      <form onSubmit={submit} style={{ padding: 24 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }} className="text-neutral-900 dark:text-neutral-100">
          Invite member
        </h2>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--tf-text-muted, #6b7280)' }}>
          They will get an email invite to join this workspace.
        </p>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--tf-text, #111827)' }}>
            Email address
          </label>
          <input
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: `1px solid ${error ? '#E8432E' : 'var(--tf-border, #e5e7eb)'}`,
              background: 'var(--tf-bg, #ffffff)',
              color: 'var(--tf-text, #111827)',
              fontSize: 14,
              outline: 'none',
            }}
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
          {error && (
            <div style={{ fontSize: 12, color: '#E8432E', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name="alert-circle" size={13} />
              {error}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--tf-text, #111827)' }}>
            Role
          </label>
          <select
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid var(--tf-border, #e5e7eb)',
              background: 'var(--tf-bg, #ffffff)',
              color: 'var(--tf-text, #111827)',
              fontSize: 14,
              outline: 'none',
            }}
            value={role}
            onChange={(e) => setRole(e.target.value as WorkspaceRole)}
          >
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--tf-card, #ffffff)',
              color: 'var(--tf-text, #111827)',
              border: '1px solid var(--tf-border, #e5e7eb)',
              borderRadius: 10,
              padding: '9px 16px',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={sending}
            style={{
              background: sending
                ? 'var(--tf-chip, #e5e7eb)'
                : 'linear-gradient(135deg, #FF7A3D, #E8432E)',
              color: sending ? 'var(--tf-text-muted, #9ca3af)' : '#ffffff',
              border: 'none',
              borderRadius: 10,
              padding: '9px 16px',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: sending ? 'not-allowed' : 'pointer',
            }}
          >
            {sending ? 'Sending…' : 'Send invite'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default InviteMemberModal;
