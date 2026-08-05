import React, { useState, useEffect } from 'react';
import Modal from '../../../components/UI/Modal';
import Icon from '../../../components/UI/Icon';
import { initials } from '../../../components/UI/Avatar';
import type { Workspace } from '../../workspace/types';
import type { CreateBoardPayload } from '../types';

interface CreateBoardModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: CreateBoardPayload) => void;
  workspaces: Workspace[];
  defaultWorkspaceId?: string;
  creating?: boolean;
}

export const CreateBoardModal: React.FC<CreateBoardModalProps> = ({
  open,
  onClose,
  onCreate,
  workspaces,
  defaultWorkspaceId,
  creating = false,
}) => {
  const [form, setForm] = useState<{
    name: string;
    description: string;
    workspaceId: string;
  }>({
    name: '',
    description: '',
    workspaceId: defaultWorkspaceId || workspaces[0]?._id || workspaces[0]?.id || '',
  });

  const [errors, setErrors] = useState<{ name?: string; workspaceId?: string }>({});

  useEffect(() => {
    if (open) {
      const initialWsId = defaultWorkspaceId || workspaces[0]?._id || workspaces[0]?.id || '';
      setForm({
        name: '',
        description: '',
        workspaceId: initialWsId,
      });
      setErrors({});
    }
  }, [open, defaultWorkspaceId, workspaces]);

  if (!open) return null;

  const selectedWorkspace = workspaces.find(
    (w) => (w._id || w.id) === (form.workspaceId || defaultWorkspaceId)
  ) || workspaces[0];

  const showDropdown = !defaultWorkspaceId && workspaces.length > 1;

  const validate = () => {
    const e: { name?: string; workspaceId?: string } = {};
    if (!form.name.trim()) e.name = 'Board name is required';
    else if (form.name.trim().length < 3) e.name = 'Use at least 3 characters';
    if (!form.workspaceId) e.workspaceId = 'Please select a workspace';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onCreate({
        name: form.name.trim(),
        description: form.description.trim(),
        workspaceId: form.workspaceId,
      });
    }
  };

  return (
    <Modal open={open} onClose={onClose} width={440}>
      <form onSubmit={handleSubmit} style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }} className="text-neutral-900 dark:text-neutral-100">
            Create board
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: '#6b7280' }}>
          Add a new Kanban board to organize your tasks.
        </p>

        {/* Workspace Display */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }} className="text-neutral-900 dark:text-neutral-100">
            Workspace
          </label>
          {showDropdown ? (
            <select
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${errors.workspaceId ? '#E8432E' : '#e5e7eb'}`,
                background: '#ffffff',
                color: '#111827',
                fontSize: 14,
                outline: 'none',
              }}
              value={form.workspaceId}
              onChange={(e) => setForm({ ...form, workspaceId: e.target.value })}
            >
              {workspaces.map((w) => (
                <option key={w._id || w.id} value={w._id || w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
              <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center text-xs shrink-0">
                {initials(selectedWorkspace?.name || 'WS')}
              </div>
              <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {selectedWorkspace?.name || 'Current Workspace'}
              </span>
            </div>
          )}
          {errors.workspaceId && (
            <div style={{ fontSize: 12, color: '#E8432E', marginTop: 4 }}>{errors.workspaceId}</div>
          )}
        </div>

        {/* Board Name */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }} className="text-neutral-900 dark:text-neutral-100">
            Board name
          </label>
          <input
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: `1px solid ${errors.name ? '#E8432E' : '#e5e7eb'}`,
              background: '#ffffff',
              color: '#111827',
              fontSize: 14,
              outline: 'none',
            }}
            placeholder="Product Launch"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoFocus
          />
          {errors.name && <div style={{ fontSize: 12, color: '#E8432E', marginTop: 4 }}>{errors.name}</div>}
        </div>

        {/* Description */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }} className="text-neutral-900 dark:text-neutral-100">
            Description
          </label>
          <textarea
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              background: '#ffffff',
              color: '#111827',
              fontSize: 14,
              outline: 'none',
              minHeight: 64,
              resize: 'vertical',
            }}
            placeholder="What's this board for?"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#fff',
              color: '#111827',
              border: '1px solid #e5e7eb',
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
              background: 'linear-gradient(135deg, #FF7A3D, #E8432E)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '9px 16px',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: creating ? 'not-allowed' : 'pointer',
            }}
          >
            {creating ? 'Creating…' : 'Create board'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateBoardModal;
