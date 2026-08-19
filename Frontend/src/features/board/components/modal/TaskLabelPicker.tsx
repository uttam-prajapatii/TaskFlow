import React, { useState } from 'react';
import Icon from '../../../../components/UI/Icon';
import ConfirmModal from '../../../../components/UI/ConfirmModal';
import { PRESET_LABEL_COLORS } from '../../../../constants/task.constants';
import { getLabelMeta } from '../../utils/label.utils';
import type { Label } from '../../types';

interface TaskLabelPickerProps {
  boardLabels: Label[];
  selectedLabels: string[];
  onToggleLabel: (labelId: string) => void;
  showCreateLabel: boolean;
  setShowCreateLabel: (show: boolean) => void;
  newLabelName: string;
  setNewLabelName: (val: string) => void;
  newLabelColor: string;
  setNewLabelColor: (val: string) => void;
  createLabelError: string | null;
  setCreateLabelError: (err: string | null) => void;
  onCreateLabel: () => void;
  isCreatingLabel: boolean;
  onUpdateLabel?: (labelId: string, payload: { name: string; color: string }) => void;
  isUpdatingLabel?: boolean;
  onDeleteLabel?: (labelId: string) => void;
  isDeletingLabel?: boolean;
  isLoadingLabels: boolean;
}

export const TaskLabelPicker: React.FC<TaskLabelPickerProps> = ({
  boardLabels,
  selectedLabels,
  onToggleLabel,
  showCreateLabel,
  setShowCreateLabel,
  newLabelName,
  setNewLabelName,
  newLabelColor,
  setNewLabelColor,
  createLabelError,
  setCreateLabelError,
  onCreateLabel,
  isCreatingLabel,
  onUpdateLabel,
  isUpdatingLabel = false,
  onDeleteLabel,
  isDeletingLabel = false,
  isLoadingLabels,
}) => {
  // Editing state for existing label
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editLabelName, setEditLabelName] = useState('');
  const [editLabelColor, setEditLabelColor] = useState(PRESET_LABEL_COLORS[0]);
  const [editLabelError, setEditLabelError] = useState<string | null>(null);

  // Deleting confirmation state
  const [deleteConfirmLabel, setDeleteConfirmLabel] = useState<{ id: string; name: string } | null>(
    null
  );

  const startEditLabel = (label: Label, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCreateLabel(false);
    setEditingLabelId(label._id);
    setEditLabelName(label.name);
    setEditLabelColor(label.color || PRESET_LABEL_COLORS[0]);
    setEditLabelError(null);
  };

  const cancelEditLabel = () => {
    setEditingLabelId(null);
    setEditLabelName('');
    setEditLabelError(null);
  };

  const handleSaveEditLabel = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!editingLabelId || !onUpdateLabel) return;
    const trimmed = editLabelName.trim();
    if (!trimmed) {
      setEditLabelError('Label name is required');
      return;
    }
    if (trimmed.length > 50) {
      setEditLabelError('Label name must be under 50 characters');
      return;
    }
    const isDuplicate = boardLabels.some(
      (l) => l._id !== editingLabelId && l.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setEditLabelError(`Label "${trimmed}" already exists`);
      return;
    }

    setEditLabelError(null);
    onUpdateLabel(editingLabelId, { name: trimmed, color: editLabelColor });
    setEditingLabelId(null);
  };

  const handleSaveCreate = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = newLabelName.trim();
    if (!trimmed) {
      setCreateLabelError('Label name is required');
      return;
    }
    if (trimmed.length > 50) {
      setCreateLabelError('Label name must be under 50 characters');
      return;
    }
    const isDuplicate = boardLabels.some(
      (l) => l.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setCreateLabelError(`Label "${trimmed}" already exists`);
      return;
    }

    setCreateLabelError(null);
    onCreateLabel();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[12px] font-semibold text-neutral-700 dark:text-neutral-300">
          Labels
        </label>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (editingLabelId) cancelEditLabel();
            setShowCreateLabel(!showCreateLabel);
            setCreateLabelError(null);
            setNewLabelName('');
          }}
          className="text-[11.5px] font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition cursor-pointer flex items-center gap-1"
        >
          <Icon name={showCreateLabel ? 'x' : 'plus'} size={12} />
          <span>{showCreateLabel ? 'Cancel' : 'New Label'}</span>
        </button>
      </div>

      {/* Create Label Inline Container (No nested <form> tag to prevent accidental submit/reload) */}
      {showCreateLabel && (
        <div
          className="p-3 bg-neutral-50 dark:bg-neutral-800/80 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-2.5 shadow-2xs"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            <span>Create new label</span>
            <span className="text-[10.5px] font-normal text-neutral-400">
              {newLabelName.length}/50
            </span>
          </div>

          <div>
            <input
              type="text"
              placeholder="Label name (e.g. Frontend, Critical, Ops)…"
              value={newLabelName}
              onChange={(e) => {
                setNewLabelName(e.target.value);
                if (createLabelError) setCreateLabelError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSaveCreate();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowCreateLabel(false);
                }
              }}
              className="w-full px-3 py-1.5 text-[12.5px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-orange-400/40"
              maxLength={50}
              autoFocus
            />
          </div>

          {/* Color Presets */}
          <div>
            <p className="text-[10.5px] font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
              Pick Color
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {PRESET_LABEL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setNewLabelColor(c);
                  }}
                  style={{ backgroundColor: c }}
                  className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                    newLabelColor === c
                      ? 'scale-125 ring-2 ring-offset-1 ring-orange-500 shadow-xs'
                      : 'hover:scale-110'
                  }`}
                  title={c}
                />
              ))}
            </div>
          </div>

          {createLabelError && (
            <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1">
              <Icon name="alert-circle" size={12} /> {createLabelError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowCreateLabel(false);
                setCreateLabelError(null);
              }}
              className="px-2.5 py-1 text-[11px] font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isCreatingLabel || !newLabelName.trim()}
              onClick={handleSaveCreate}
              className="px-3 py-1 text-[11px] font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition disabled:opacity-50 cursor-pointer flex items-center gap-1"
            >
              {isCreatingLabel ? 'Creating…' : 'Save Label'}
            </button>
          </div>
        </div>
      )}

      {/* Edit Label Inline Container */}
      {editingLabelId && (
        <div
          className="p-3 bg-neutral-50 dark:bg-neutral-800/80 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-2.5 shadow-2xs"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            <span>Edit label</span>
            <span className="text-[10.5px] font-normal text-neutral-400">
              {editLabelName.length}/50
            </span>
          </div>

          <div>
            <input
              type="text"
              placeholder="Label name…"
              value={editLabelName}
              onChange={(e) => {
                setEditLabelName(e.target.value);
                if (editLabelError) setEditLabelError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSaveEditLabel();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  cancelEditLabel();
                }
              }}
              className="w-full px-3 py-1.5 text-[12.5px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-orange-400/40"
              maxLength={50}
              autoFocus
            />
          </div>

          <div>
            <p className="text-[10.5px] font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
              Pick Color
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {PRESET_LABEL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditLabelColor(c);
                  }}
                  style={{ backgroundColor: c }}
                  className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                    editLabelColor === c
                      ? 'scale-125 ring-2 ring-offset-1 ring-orange-500 shadow-xs'
                      : 'hover:scale-110'
                  }`}
                  title={c}
                />
              ))}
            </div>
          </div>

          {editLabelError && (
            <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1">
              <Icon name="alert-circle" size={12} /> {editLabelError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                cancelEditLabel();
              }}
              className="px-2.5 py-1 text-[11px] font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isUpdatingLabel || !editLabelName.trim()}
              onClick={handleSaveEditLabel}
              className="px-3 py-1 text-[11px] font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition disabled:opacity-50 cursor-pointer flex items-center gap-1"
            >
              {isUpdatingLabel ? 'Saving…' : 'Update Label'}
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Board Labels Grid */}
      {isLoadingLabels ? (
        <div className="flex flex-wrap gap-1.5 py-1">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-6 w-20 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse"
            />
          ))}
        </div>
      ) : boardLabels.length === 0 ? (
        <div className="py-2 text-[12px] text-neutral-500 dark:text-neutral-400 italic">
          No labels created yet. Click <span className="font-semibold text-orange-600 dark:text-orange-400">+ New Label</span> to create one for this board.
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {boardLabels.map((l) => {
            const isSelected = selectedLabels.includes(l._id);
            const meta = getLabelMeta(l);
            return (
              <div
                key={l._id}
                style={isSelected ? meta.style : undefined}
                className={`group inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-medium transition select-none ${
                  isSelected
                    ? `${meta.className} ring-2 ring-orange-500/50 shadow-2xs font-semibold`
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                {/* Main Label Toggle Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleLabel(l._id);
                  }}
                  className="inline-flex items-center gap-1 cursor-pointer"
                  title={isSelected ? `Click to deselect ${l.name}` : `Click to select ${l.name}`}
                >
                  {isSelected && (
                    <Icon name="check" size={12} className="text-orange-500 shrink-0" />
                  )}
                  <span>{l.name}</span>
                </button>

                {/* Edit Button */}
                {onUpdateLabel && (
                  <button
                    type="button"
                    onClick={(e) => startEditLabel(l, e)}
                    className="p-1 rounded-full text-current/80 hover:text-current hover:bg-black/10 dark:hover:bg-white/20 transition cursor-pointer flex items-center justify-center shrink-0"
                    title={`Edit label ${l.name}`}
                  >
                    <Icon name="edit" size={11} className="shrink-0" />
                  </button>
                )}

                {/* Delete Button */}
                {onDeleteLabel && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteConfirmLabel({ id: l._id, name: l.name });
                    }}
                    className="p-1 rounded-full text-current/80 hover:text-rose-500 hover:bg-black/10 dark:hover:bg-white/20 transition cursor-pointer flex items-center justify-center shrink-0"
                    title={`Delete label ${l.name}`}
                  >
                    <Icon name="trash" size={11} className="shrink-0" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Label Confirmation Modal */}
      <ConfirmModal
        target={deleteConfirmLabel}
        mode="delete"
        itemType="label"
        title="Delete Label"
        working={isDeletingLabel}
        onClose={() => setDeleteConfirmLabel(null)}
        onConfirm={() => {
          if (deleteConfirmLabel && onDeleteLabel) {
            onDeleteLabel(deleteConfirmLabel.id);
            setDeleteConfirmLabel(null);
          }
        }}
      />
    </div>
  );
};

export default TaskLabelPicker;
