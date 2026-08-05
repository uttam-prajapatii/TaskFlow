import React from 'react';
import Modal from './Modal';
import Icon from './Icon';

interface ConfirmModalProps {
  target: { name: string } | null;
  onClose: () => void;
  onConfirm: () => void;
  mode: 'delete' | 'leave';
  working?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  target,
  onClose,
  onConfirm,
  mode,
  working = false,
}) => {
  if (!target) return null;
  const isDelete = mode === 'delete';

  return (
    <Modal open={!!target} onClose={onClose} width={400}>
      <div style={{ padding: 24 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'rgba(232,67,46,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}
        >
          <Icon name={isDelete ? 'trash' : 'log-out'} size={19} className="text-red-600" />
        </div>
        <h2 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700 }}>
          {isDelete ? 'Delete workspace' : 'Leave workspace'}
        </h2>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--tf-text-muted, #6b7280)', lineHeight: 1.55 }}>
          {isDelete ? (
            <>
              This permanently deletes{' '}
              <strong style={{ color: 'var(--tf-text, #111827)' }}>{target.name}</strong> and all
              its contents. This cannot be undone.
            </>
          ) : (
            <>
              You will lose access to{' '}
              <strong style={{ color: 'var(--tf-text, #111827)' }}>{target.name}</strong> until an
              admin invites you back.
            </>
          )}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--tf-card, #fff)',
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
            type="button"
            onClick={onConfirm}
            disabled={working}
            style={{
              background: 'linear-gradient(135deg, #E8432E, #C13B27)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '9px 16px',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: working ? 'not-allowed' : 'pointer',
              opacity: working ? 0.7 : 1,
              boxShadow: '0 6px 16px rgba(232,67,46,0.3)',
            }}
          >
            {working ? 'Working…' : isDelete ? 'Delete workspace' : 'Leave workspace'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
