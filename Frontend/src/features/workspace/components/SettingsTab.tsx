import React, { useState } from 'react';
import type { Workspace } from '../types';
import Icon from '../../../components/UI/Icon';
import ConfirmModal from '../../../components/UI/ConfirmModal';

interface SettingsTabProps {
  ws: Workspace;
  myRole: string;
  canManage: boolean;
  onRename: (name: string) => void;
  onDelete: () => void;
  onLeave: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  ws,
  myRole,
  canManage,
  onRename,
  onDelete,
  onLeave,
}) => {
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(ws.name);
  const [renameError, setRenameError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const submitRename = () => {
    if (!renameValue.trim() || renameValue.trim().length < 3) {
      setRenameError('Use at least 3 characters.');
      return;
    }
    onRename(renameValue.trim());
    setRenameError('');
    setRenaming(false);
  };

  const isOwner = myRole === 'owner';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560 }}>
      {/* Workspace Name Setting */}
      <div
        style={{
          background: 'var(--tf-card, #ffffff)',
          border: '1px solid var(--tf-border, #e5e7eb)',
          borderRadius: 14,
          padding: 18,
        }}
      >
        <h3 style={{ margin: '0 0 4px', fontSize: 14.5, fontWeight: 700 }} className="text-neutral-900 dark:text-neutral-100">
          Workspace name
        </h3>
        <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--tf-text-muted, #6b7280)' }}>
          Visible to everyone in this workspace.
        </p>
        {renaming ? (
          <div>
            <input
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 10,
                border: `1px solid ${renameError ? '#E8432E' : 'var(--tf-border, #e5e7eb)'}`,
                background: 'var(--tf-bg, #ffffff)',
                color: 'var(--tf-text, #111827)',
                fontSize: 14,
                outline: 'none',
                marginBottom: renameError ? 6 : 12,
              }}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
            />
            {renameError && (
              <div style={{ fontSize: 12, color: '#E8432E', marginBottom: 12 }}>{renameError}</div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={submitRename}
                style={{
                  background: 'linear-gradient(135deg, #FF7A3D, #E8432E)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '8px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Save changes
              </button>
              <button
                type="button"
                onClick={() => {
                  setRenaming(false);
                  setRenameValue(ws.name);
                  setRenameError('');
                }}
                style={{
                  background: 'var(--tf-card, #fff)',
                  color: 'var(--tf-text, #111827)',
                  border: '1px solid var(--tf-border, #e5e7eb)',
                  borderRadius: 10,
                  padding: '8px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }} className="text-neutral-900 dark:text-neutral-100">
              {ws.name}
            </span>
            {canManage && (
              <button
                type="button"
                onClick={() => setRenaming(true)}
                style={{
                  background: 'var(--tf-card, #fff)',
                  color: 'var(--tf-text, #111827)',
                  border: '1px solid var(--tf-border, #e5e7eb)',
                  borderRadius: 10,
                  padding: '7px 12px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Icon name="edit" size={13} /> Rename
              </button>
            )}
          </div>
        )}
      </div>

      {/* Leave Workspace */}
      <div
        style={{
          background: 'var(--tf-card, #ffffff)',
          border: '1px solid var(--tf-border, #e5e7eb)',
          borderRadius: 14,
          padding: 18,
        }}
      >
        <h3 style={{ margin: '0 0 4px', fontSize: 14.5, fontWeight: 700 }} className="text-neutral-900 dark:text-neutral-100">
          Leave workspace
        </h3>
        <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--tf-text-muted, #6b7280)' }}>
          You will lose access until re-invited.{' '}
          {isOwner && 'As the owner, you must transfer ownership first.'}
        </p>
        <button
          type="button"
          onClick={() => setConfirmLeave(true)}
          disabled={isOwner}
          style={{
            background: 'var(--tf-card, #fff)',
            color: '#E8432E',
            border: '1px solid rgba(232,67,46,0.35)',
            borderRadius: 10,
            padding: '9px 16px',
            fontSize: 13,
            fontWeight: 600,
            cursor: isOwner ? 'not-allowed' : 'pointer',
            opacity: isOwner ? 0.5 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Icon name="log-out" size={14} /> Leave workspace
        </button>
      </div>

      {/* Delete Workspace (Owner Only) */}
      {isOwner && (
        <div
          style={{
            background: 'var(--tf-card, #ffffff)',
            border: '1px solid rgba(232,67,46,0.3)',
            borderRadius: 14,
            padding: 18,
          }}
        >
          <h3 style={{ margin: '0 0 4px', fontSize: 14.5, fontWeight: 700, color: '#E8432E' }}>
            Delete workspace
          </h3>
          <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--tf-text-muted, #6b7280)' }}>
            Permanently deletes this workspace and all its data. This cannot be undone.
          </p>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            style={{
              background: 'linear-gradient(135deg, #E8432E, #C13B27)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '9px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Icon name="trash" size={14} /> Delete workspace
          </button>
        </div>
      )}

      <ConfirmModal
        target={confirmDelete ? ws : null}
        mode="delete"
        working={false}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          onDelete();
          setConfirmDelete(false);
        }}
      />

      <ConfirmModal
        target={confirmLeave ? ws : null}
        mode="leave"
        working={false}
        onClose={() => setConfirmLeave(false)}
        onConfirm={() => {
          onLeave();
          setConfirmLeave(false);
        }}
      />
    </div>
  );
};

export default SettingsTab;
