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
  onDrop: (e: React.DragEvent, targetColumnId: string) => void;
  draggingTaskId: string | null;
  dragOverColId: string | null;
  onDragOverCol: (columnId: string) => void;
  onAddTask: (columnId: string) => void;
  onMenuAction: (action: string, task: Task) => void;
  onRenameColumn?: (columnId: string, currentName: string) => void;
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
  onDeleteColumn,
}) => {
  const [colMenuOpen, setColMenuOpen] = useState(false);

  const colId = column._id || column.id!;
  const title = column.title || column.name || 'Untitled List';
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
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
          <h3 className="text-[13px] font-semibold text-neutral-700 dark:text-neutral-200 truncate max-w-[170px]">
            {title}
          </h3>
          <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onAddTask(colId)}
            className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-orange-500 transition-colors"
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
                  className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
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
        className={`flex-1 rounded-xl p-2 space-y-2 overflow-y-auto transition-colors ${
          isOver
            ? 'bg-orange-50/60 dark:bg-orange-500/5 ring-2 ring-orange-200 dark:ring-orange-500/20'
            : 'bg-neutral-100/60 dark:bg-neutral-900/40'
        }`}
        style={{ minHeight: 140, maxHeight: 'calc(100vh - 260px)' }}
      >
        {tasks.length === 0 ? (
          <div className="h-24 flex flex-col items-center justify-center text-center text-neutral-300 dark:text-neutral-700 text-[11px] gap-1">
            <Icon name="list" size={20} />
            <span>Drop tasks here</span>
          </div>
        ) : (
          tasks.map((t) => (
            <KanbanTaskCard
              key={t._id || t.id}
              task={t}
              onOpen={onOpenTask}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onMenuAction={onMenuAction}
              isDragging={draggingTaskId === (t._id || t.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
