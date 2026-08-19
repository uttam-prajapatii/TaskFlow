import React from 'react';
import Icon from '../../../../components/UI/Icon';
import type { BoardList, Task } from '../../types';

interface TaskDrawerHeaderProps {
  currentCol?: BoardList;
  task: Task;
  onEdit: (task: Task) => void;
  onClose: () => void;
}

export const TaskDrawerHeader: React.FC<TaskDrawerHeaderProps> = ({
  currentCol,
  task,
  onEdit,
  onClose,
}) => {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-orange-500" />
        <span className="text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
          {currentCol?.title || 'Board Task'}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 cursor-pointer"
          aria-label="Edit task"
        >
          <Icon name="edit" size={15} />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 cursor-pointer"
          aria-label="Close"
        >
          <Icon name="x" size={16} />
        </button>
      </div>
    </div>
  );
};

export default TaskDrawerHeader;
