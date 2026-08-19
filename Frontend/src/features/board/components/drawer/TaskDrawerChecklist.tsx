import React from 'react';
import Icon from '../../../../components/UI/Icon';
import type { ChecklistItem } from '../../types';

interface TaskDrawerChecklistProps {
  checklistItems: ChecklistItem[];
  doneCount: number;
  totalCount: number;
  newChecklistText: string;
  setNewChecklistText: (val: string) => void;
  onAddItem: (e: React.FormEvent) => void;
  onToggleItem: (itemId: string, isDone: boolean) => void;
  onRemoveItem: (itemId: string) => void;
  isPending: boolean;
}

export const TaskDrawerChecklist: React.FC<TaskDrawerChecklistProps> = ({
  checklistItems,
  doneCount,
  totalCount,
  newChecklistText,
  setNewChecklistText,
  onAddItem,
  onToggleItem,
  onRemoveItem,
  isPending,
}) => {
  return (
    <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
          <Icon name="check-square" size={14} className="text-orange-500" />
          Checklist {totalCount > 0 && `· ${doneCount}/${totalCount}`}
        </p>
        {totalCount > 0 && (
          <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400">
            {Math.round((doneCount / totalCount) * 100)}%
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-300"
            style={{ width: `${(doneCount / totalCount) * 100}%` }}
          />
        </div>
      )}

      {/* Checklist Items List */}
      <div className="space-y-1.5 mb-3">
        {checklistItems.map((item) => {
          const itemId = item._id || item.id || '';
          return (
            <div
              key={itemId}
              className="group flex items-center justify-between p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/60 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800 transition"
            >
              <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.isDone}
                  onChange={() => onToggleItem(itemId, !item.isDone)}
                  disabled={isPending}
                  className="w-4 h-4 rounded text-orange-500 border-neutral-300 focus:ring-orange-500 cursor-pointer"
                />
                <span
                  className={`text-[12.5px] truncate ${
                    item.isDone
                      ? 'line-through text-neutral-400 dark:text-neutral-500'
                      : 'text-neutral-700 dark:text-neutral-200 font-medium'
                  }`}
                >
                  {item.text}
                </span>
              </label>
              <button
                type="button"
                onClick={() => onRemoveItem(itemId)}
                disabled={isPending}
                className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-rose-500 transition cursor-pointer"
                title="Remove checklist item"
              >
                <Icon name="x" size={13} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add Checklist Item Form */}
      <form onSubmit={onAddItem} className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Add checklist item…"
          value={newChecklistText}
          onChange={(e) => setNewChecklistText(e.target.value)}
          className="flex-1 px-3 py-1.5 text-[12.5px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-orange-400/40"
        />
        <button
          type="submit"
          disabled={isPending || !newChecklistText.trim()}
          className="px-3 py-1.5 text-[12px] font-semibold rounded-lg text-white bg-orange-500 hover:bg-orange-600 transition disabled:opacity-40 cursor-pointer shrink-0"
        >
          Add
        </button>
      </form>
    </div>
  );
};

export default TaskDrawerChecklist;
