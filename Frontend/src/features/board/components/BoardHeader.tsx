import React, { useState } from 'react';
import Icon from '../../../components/UI/Icon';
import DropdownMenu, { type MenuItem } from '../../../components/UI/DropdownMenu';
import type { Board } from '../types';

interface BoardHeaderProps {
  board: Board | null;
  isStarred: boolean;
  onToggleStar: () => void;
  onRenameBoard: () => void;
  onArchiveBoard: () => void;
  onDeleteBoard: () => void;
  onViewArchived: () => void;
}

export const BoardHeader: React.FC<BoardHeaderProps> = ({
  board,
  isStarred,
  onToggleStar,
  onRenameBoard,
  onArchiveBoard,
  onDeleteBoard,
  onViewArchived,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems: MenuItem[] = [
    {
      label: 'Rename Board',
      icon: 'edit',
      onClick: onRenameBoard,
    },
    {
      label: 'View Archived Items',
      icon: 'history',
      onClick: onViewArchived,
    },
    {
      label: 'Archive Board',
      icon: 'folder',
      onClick: onArchiveBoard,
    },
    { divider: true },
    {
      label: 'Delete Board',
      icon: 'trash-2',
      danger: true,
      onClick: onDeleteBoard,
    },
  ];

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-xl md:text-2xl font-bold font-display text-neutral-900 dark:text-neutral-100 truncate">
          {board?.title || 'Board'}
        </h1>

        <button
          type="button"
          onClick={onToggleStar}
          title={isStarred ? 'Unstar board' : 'Star board'}
          className={`p-1.5 rounded-xl transition cursor-pointer shrink-0 ${
            isStarred
              ? 'text-amber-400 hover:text-amber-500 bg-amber-50 dark:bg-amber-500/10'
              : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Icon name="sparkles" size={16} />
        </button>

        {board?.description && (
          <p className="hidden lg:block text-xs text-neutral-400 truncate max-w-md">
            {board.description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu
          open={menuOpen}
          setOpen={setMenuOpen}
          align="right"
          trigger={
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer shadow-2xs"
            >
              <Icon name="more-horizontal" size={14} />
              <span>Board Menu</span>
            </button>
          }
          items={menuItems}
        />
      </div>
    </div>
  );
};

export default BoardHeader;
