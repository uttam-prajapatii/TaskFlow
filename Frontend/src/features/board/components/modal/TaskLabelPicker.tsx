import React from 'react';
import Icon from '../../../../components/UI/Icon';
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
  onCreateLabel: (e: React.FormEvent) => void;
  isCreatingLabel: boolean;
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
  onCreateLabel,
  isCreatingLabel,
  isLoadingLabels,
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[12px] font-semibold text-neutral-700 dark:text-neutral-300">
          Labels
        </label>
        <button
          type="button"
          onClick={() => setShowCreateLabel(!showCreateLabel)}
          className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer flex items-center gap-1"
        >
          <Icon name={showCreateLabel ? 'x' : 'plus'} size={12} />
          {showCreateLabel ? 'Cancel' : 'New Label'}
        </button>
      </div>

      {showCreateLabel && (
        <form
          onSubmit={onCreateLabel}
          className="mb-3 p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-2.5"
        >
          <div>
            <input
              type="text"
              placeholder="Label name (e.g. Bug, Feature, Urgent)…"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              className="w-full px-3 py-1.5 text-[12px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-orange-400/30"
              maxLength={50}
              autoFocus
            />
          </div>

          {/* Color Presets */}
          <div>
            <p className="text-[10.5px] font-medium text-neutral-400 mb-1.5">Pick Color</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {PRESET_LABEL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewLabelColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                    newLabelColor === c ? 'ring-2 ring-offset-2 ring-neutral-900 dark:ring-white scale-110' : 'hover:scale-105'
                  }`}
                  title={c}
                />
              ))}
            </div>
          </div>

          {createLabelError && (
            <p className="text-[11px] font-semibold text-rose-500">{createLabelError}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowCreateLabel(false)}
              className="px-2.5 py-1 text-[11px] font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreatingLabel || !newLabelName.trim()}
              className="px-3 py-1 text-[11px] font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition disabled:opacity-50 cursor-pointer"
            >
              {isCreatingLabel ? 'Creating…' : 'Save Label'}
            </button>
          </div>
        </form>
      )}

      {/* Real Board Labels Grid */}
      {isLoadingLabels ? (
        <div className="flex gap-1.5 animate-pulse">
          <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
          <div className="h-6 w-20 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
        </div>
      ) : boardLabels.length === 0 ? (
        <p className="text-[11.5px] text-neutral-400 italic">
          No labels created yet. Click <span className="font-semibold">+ New Label</span> to create one for this board.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {boardLabels.map((l) => {
            const isSelected = selectedLabels.includes(l._id);
            const meta = getLabelMeta(l);
            return (
              <button
                key={l._id}
                type="button"
                onClick={() => onToggleLabel(l._id)}
                style={isSelected ? meta.style : undefined}
                className={`px-2.5 py-1 rounded-full text-[11.5px] font-medium transition cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? `${meta.className} ring-2 ring-orange-500/50 shadow-xs`
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                {isSelected && <Icon name="check" size={12} />}
                <span>{l.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TaskLabelPicker;
