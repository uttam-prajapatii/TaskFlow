import React, { useState } from 'react';
import type { BoardList, Task } from '../types';
import KanbanTaskCard from './KanbanTaskCard';
import Icon from '../../../components/UI/Icon';
import DropdownMenu, { type MenuItem } from '../../../components/UI/DropdownMenu';

interface KanbanColumnProps {
  column: BoardList;
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetColumnId: string, targetIndex?: number) => void;
  draggingTaskId: string | null;
  dragOverColId: string | null;
  onDragOverCol: (columnId: string) => void;
  onAddTask: (columnId: string, position?: number) => void;
  onMenuAction: (action: string, task: Task) => void;
  onRenameColumn?: (columnId: string, currentName: string) => void;
  onCopyColumn?: (columnId: string, currentName: string) => void;
  onDeleteColumn?: (columnId: string) => void;
}

export const COLUMN_COLORS: Record<string, string> = {
  todo: 'bg-slate-400',
  in_progress: 'bg-orange-500',
  review: 'bg-violet-500',
  done: 'bg-emerald-500',
};

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  tasks,
  onOpenTask,
  onDragStart,
  onDragEnd,
  onDrop,
  draggingTaskId,
  dragOverColId,
  onDragOverCol,
  onAddTask,
  onMenuAction,
  onRenameColumn,
  onCopyColumn,
  onDeleteColumn,
}) => {
  const [colMenuOpen, setColMenuOpen] = useState(false);

  const colId = column._id || column.id!;
  const title = column.title || column.title || 'Untitled List';
  const isOver = dragOverColId === colId;
  const dotColor =
    COLUMN_COLORS[colId] ||
    COLUMN_COLORS[title.toLowerCase().replace(/\s+/g, '_')] ||
    'bg-orange-500';

  const menuItems: MenuItem[] = [];
  if (onRenameColumn) {
    menuItems.push({
      label: 'Rename list',
      icon: 'edit',
      onClick: () => onRenameColumn(colId, title),
    });
  }
  if (onCopyColumn) {
    menuItems.push({
      label: 'Copy list',
      icon: 'file-plus',
      onClick: () => onCopyColumn(colId, title),
    });
  }
  if (onDeleteColumn) {
    if (menuItems.length > 0) menuItems.push({ divider: true });
    menuItems.push({
      label: 'Delete list',
      icon: 'trash',
      danger: true,
      onClick: () => onDeleteColumn(colId),
    });
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverCol(colId);
      }}
      onDrop={(e) => onDrop(e, colId)}
      className="flex flex-col w-[300px] shrink-0 h-full"
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-1.5 py-1 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
          <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100 truncate leading-none">
            {title}
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-neutral-200/80 dark:bg-neutral-800 text-[11px] font-bold text-neutral-600 dark:text-neutral-400 shrink-0 leading-none flex items-center justify-center min-w-[20px] h-5">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onAddTask(colId)}
            className="w-7 h-7 rounded-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-800 text-neutral-400 hover:text-orange-500 transition-colors flex items-center justify-center cursor-pointer"
            aria-label={`Add task to ${title}`}
          >
            <Icon name="plus" size={15} />
          </button>

          {menuItems.length > 0 && (
            <DropdownMenu
              open={colMenuOpen}
              setOpen={setColMenuOpen}
              trigger={
                <button
                  type="button"
                  onClick={() => setColMenuOpen((v) => !v)}
                  className="w-7 h-7 rounded-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors flex items-center justify-center cursor-pointer"
                  aria-label="Column menu"
                >
                  <Icon name="more-horizontal" size={15} />
                </button>
              }
              items={menuItems}
            />
          )}
        </div>
      </div>

      {/* Task List / Drop Area */}
      <div
        className={`rounded-2xl p-2.5 space-y-2 overflow-y-auto transition-all ${
          isOver
            ? 'bg-orange-50/80 dark:bg-orange-500/10 border border-orange-400 dark:border-orange-500/30 ring-2 ring-orange-200 dark:ring-orange-500/20'
            : 'bg-neutral-200/50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800/80 shadow-2xs'
        }`}
        style={{ minHeight: 120, maxHeight: 'calc(100vh - 220px)' }}
      >
        {tasks.length === 0 ? (
          <div className="py-5 flex flex-col items-center justify-center text-center text-neutral-400 dark:text-neutral-500 text-[11.5px] gap-1 border border-dashed border-neutral-300/80 dark:border-neutral-800 rounded-xl bg-white/50 dark:bg-neutral-900/40">
            <Icon name="list" size={18} className="text-neutral-400" />
            <span>Drop tasks here</span>
          </div>
        ) : (
          tasks.map((t, idx) => (
            <React.Fragment key={t._id || t.id}>
              <KanbanTaskCard
                task={t}
                index={idx}
                onOpen={onOpenTask}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDropTask={(e, targetIdx) => onDrop(e, colId, targetIdx)}
                onMenuAction={onMenuAction}
                isDragging={draggingTaskId === (t._id || t.id)}
              />
              <div className="group/add relative my-1">
                <button
                  type="button"
                  onClick={() => onAddTask(colId, idx + 1)}
                  className="w-full py-1 px-2.5 rounded-lg border border-dashed border-transparent hover:border-orange-300 dark:hover:border-orange-700/60 hover:bg-orange-50/60 dark:hover:bg-orange-500/10 text-[11px] font-medium text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 flex items-center justify-center gap-1 transition-all opacity-40 hover:opacity-100 cursor-pointer"
                >
                  <Icon name="plus" size={12} />
                  <span>Add task below</span>
                </button>
              </div>
            </React.Fragment>
          ))
        )}

        {/* Add Task Button directly inside list below cards */}
        <button
          type="button"
          onClick={() => onAddTask(colId)}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-dashed border-neutral-300/80 dark:border-neutral-700 hover:border-orange-400 hover:bg-orange-50/80 dark:hover:bg-orange-500/10 text-neutral-600 dark:text-neutral-300 hover:text-orange-600 dark:hover:text-orange-400 text-xs font-semibold transition-all cursor-pointer bg-white/80 dark:bg-neutral-800/60 shadow-2xs"
        >
          <Icon name="plus" size={14} /> Add task
        </button>
      </div>
    </div>
  );
};

export default KanbanColumn;
