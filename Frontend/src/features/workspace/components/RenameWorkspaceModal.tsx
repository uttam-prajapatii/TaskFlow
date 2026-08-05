import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    setName(ws?.name || '');
    setError('');
  }, [ws]);

  if (!ws) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 3) {
      setError('Use at least 3 characters.');
      return;
    }
    onSave(ws._id || ws.id!, name.trim());
  };

  return (
    <Modal open={!!ws} onClose={onClose} width={420}>
      <form onSubmit={submit} style={{ padding: 24 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700 }} className="text-neutral-900 dark:text-neutral-100">
          Rename workspace
        </h2>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--tf-text, #111827)' }}>
            Workspace name
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            maxLength={50}
          />
          {error && (
            <div style={{ fontSize: 12, color: '#E8432E', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name="alert-circle" size={13} />
              {error}
            </div>
          )}
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
            disabled={saving}
            style={{
              background: saving
                ? 'var(--tf-chip, #e5e7eb)'
                : 'linear-gradient(135deg, #FF7A3D, #E8432E)',
              color: saving ? 'var(--tf-text-muted, #9ca3af)' : '#ffffff',
              border: 'none',
              borderRadius: 10,
              padding: '9px 16px',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default RenameWorkspaceModal;
