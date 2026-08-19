import React from 'react';
import Icon from '../../../components/UI/Icon';
import DropdownMenu, { type MenuItem } from '../../../components/UI/DropdownMenu';
import { TASK_SORT_OPTIONS, type TaskSortOption } from '../../../constants/task.constants';

interface BoardToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  filterPriority: string | null;
  onSelectPriority: (val: string | null) => void;
  sortBy: TaskSortOption;
  onSelectSortBy: (val: TaskSortOption) => void;
  filterOpen: boolean;
  setFilterOpen: React.Dispatch<React.SetStateAction<boolean>>;
  sortOpen: boolean;
  setSortOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onAddListClick: () => void;
}

export const BoardToolbar: React.FC<BoardToolbarProps> = ({
  search,
  onSearchChange,
  filterPriority,
  onSelectPriority,
  sortBy,
  onSelectSortBy,
  filterOpen,
  setFilterOpen,
  sortOpen,
  setSortOpen,
  onAddListClick,
}) => {
  const priorityFilterItems: MenuItem[] = [
    {
      label: 'All Priorities',
      endIcon: filterPriority === null ? 'check' : undefined,
      onClick: () => onSelectPriority(null),
    },
    { divider: true },
    {
      label: 'Urgent',
      endIcon: filterPriority === 'urgent' ? 'check' : undefined,
      onClick: () => onSelectPriority('urgent'),
    },
    {
      label: 'High',
      endIcon: filterPriority === 'high' ? 'check' : undefined,
      onClick: () => onSelectPriority('high'),
    },
    {
      label: 'Medium',
      endIcon: filterPriority === 'medium' ? 'check' : undefined,
      onClick: () => onSelectPriority('medium'),
    },
    {
      label: 'Low',
      endIcon: filterPriority === 'low' ? 'check' : undefined,
      onClick: () => onSelectPriority('low'),
    },
  ];

  const sortItems: MenuItem[] = TASK_SORT_OPTIONS.map((opt) => ({
    label: opt.label,
    endIcon: sortBy === opt.id ? 'check' : undefined,
    onClick: () => onSelectSortBy(opt.id),
  }));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      {/* Search & Filter Group */}
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[240px]">
        <div className="relative flex-1 sm:max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tasks in board..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-2xs"
          />
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
            <Icon name="search" size={13} />
          </div>
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
            >
              <Icon name="x" size={12} />
            </button>
          )}
        </div>

        {/* Priority Filter */}
        <DropdownMenu
          open={filterOpen}
          setOpen={setFilterOpen}
          align="left"
          trigger={
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer shadow-2xs ${
                filterPriority
                  ? 'border-orange-300 dark:border-orange-500/40 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400'
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              <Icon name="filter" size={13} />
              <span>{filterPriority ? `Priority: ${filterPriority}` : 'Filter'}</span>
              <Icon name="chevron-down" size={12} className="text-neutral-400" />
            </button>
          }
          items={priorityFilterItems}
        />

        {/* Sort By */}
        <DropdownMenu
          open={sortOpen}
          setOpen={setSortOpen}
          align="left"
          trigger={
            <button
              type="button"
              onClick={() => setSortOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer shadow-2xs"
            >
              <Icon name="chevrons-up-down" size={13} />
              <span>
                Sort: {TASK_SORT_OPTIONS.find((s) => s.id === sortBy)?.label || 'Default'}
              </span>
              <Icon name="chevron-down" size={12} className="text-neutral-400" />
            </button>
          }
          items={sortItems}
        />
      </div>

      {/* Add Column Button */}
      <button
        type="button"
        onClick={onAddListClick}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 transition shadow-xs cursor-pointer shrink-0"
      >
        <Icon name="plus" size={14} />
        <span>Add List</span>
      </button>
    </div>
  );
};

export default BoardToolbar;
