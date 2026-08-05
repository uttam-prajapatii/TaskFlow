import React, { useState, useEffect } from 'react';
import Modal from '../../../components/UI/Modal';
import Icon from '../../../components/UI/Icon';
import { WORKSPACE_COLORS } from './WorkspaceCard';
import type { CreateWorkspacePayload, WorkspaceVisibility } from '../types';

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
    visibility: WorkspaceVisibility;
  }>({
    name: '',
    description: '',
    color: 'coral',
    visibility: 'private',
  });

  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ name: '', description: '', color: 'coral', visibility: 'private' });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      onCreate({
        name: form.name.trim(),
        description: form.description.trim(),
        settings: {
          color: form.color,
          visibility: form.visibility,
        },
      });
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ padding: '22px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700 }} className="text-neutral-900 dark:text-neutral-100">
              Create workspace
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tf-text-muted, #9ca3af)', padding: 4 }}
            >
              <Icon name="x" size={18} />
            </button>
          </div>
          <p style={{ margin: '0 0 22px', fontSize: 13.5, color: 'var(--tf-text-muted, #6b7280)' }}>
            Set up a space for your team's boards, docs, and members.
          </p>
        </div>

        <div style={{ padding: '0 24px' }}>
          {/* Name Field */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--tf-text, #111827)' }}>
              Workspace name
            </label>
            <input
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${touched && errors.name ? '#E8432E' : 'var(--tf-border, #e5e7eb)'}`,
                background: 'var(--tf-bg, #ffffff)',
                color: 'var(--tf-text, #111827)',
                fontSize: 14,
                outline: 'none',
              }}
              placeholder="Product Launch"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={50}
              autoFocus
            />
            {touched && errors.name && (
              <div style={{ fontSize: 12, color: '#E8432E', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="alert-circle" size={13} />
                {errors.name}
              </div>
            )}
          </div>

          {/* Description Field */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--tf-text, #111827)' }}>
              Description
            </label>
            <textarea
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid var(--tf-border, #e5e7eb)',
                background: 'var(--tf-bg, #ffffff)',
                color: 'var(--tf-text, #111827)',
                fontSize: 14,
                outline: 'none',
                minHeight: 72,
                resize: 'vertical',
              }}
              placeholder="What's this workspace for?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={200}
            />
            <div style={{ fontSize: 12, color: 'var(--tf-text-muted, #9ca3af)', marginTop: 5 }}>
              {form.description.length}/200
            </div>
          </div>

          {/* Color Selector */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--tf-text, #111827)' }}>
              Color
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              {colorList.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setForm({ ...form, color: c.id })}
                  aria-label={c.label}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: c.hex,
                    border: form.color === c.id ? '3px solid var(--tf-text, #111827)' : '3px solid transparent',
                    cursor: 'pointer',
                    boxShadow: form.color === c.id ? '0 0 0 2px var(--tf-card, #ffffff)' : 'none',
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Visibility Option */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--tf-text, #111827)' }}>
              Visibility
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { id: 'private', icon: 'lock', label: 'Private', desc: 'Invite only' },
                { id: 'public', icon: 'globe', label: 'Public', desc: 'Anyone in org' },
              ].map((v) => (
                <button
                  type="button"
                  key={v.id}
                  onClick={() => setForm({ ...form, visibility: v.id as WorkspaceVisibility })}
                  style={{
                    textAlign: 'left',
                    padding: '12px 12px',
                    borderRadius: 12,
                    cursor: 'pointer',
                    border: form.visibility === v.id ? '1.5px solid #E8432E' : '1px solid var(--tf-border, #e5e7eb)',
                    background: form.visibility === v.id ? 'rgba(255,122,61,0.08)' : 'var(--tf-bg, #ffffff)',
                  }}
                >
                  <Icon name={v.icon} size={16} className="text-neutral-500" />
                  <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 6 }} className="text-neutral-900 dark:text-neutral-100">
                    {v.label}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--tf-text-muted, #6b7280)' }}>{v.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '16px 24px 24px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            borderTop: '1px solid var(--tf-border, #e5e7eb)',
            marginTop: 4,
          }}
        >
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
            disabled={creating}
            style={{
              background: creating
                ? 'var(--tf-chip, #e5e7eb)'
                : 'linear-gradient(135deg, #FF7A3D, #E8432E)',
              color: creating ? 'var(--tf-text-muted, #9ca3af)' : '#ffffff',
              border: 'none',
              borderRadius: 10,
              padding: '10px 18px',
              fontSize: 14,
              fontWeight: 600,
              cursor: creating ? 'not-allowed' : 'pointer',
              boxShadow: creating ? 'none' : '0 6px 16px rgba(232,67,46,0.28)',
            }}
          >
            {creating ? 'Creating…' : 'Create workspace'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateWorkspaceModal;
