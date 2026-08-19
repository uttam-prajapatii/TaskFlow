import React, { useState, memo } from 'react';
import type { Board } from '../types';
import Icon from '../../../components/UI/Icon';
import DropdownMenu, { type MenuItem } from '../../../components/UI/DropdownMenu';
import { initials } from '../../../components/UI/Avatar';

interface BoardCardProps {
  board: Board;
  onOpen: (board: Board) => void;
  onRename?: (board: Board) => void;
  onDelete?: (board: Board) => void;
}

export const BoardCard: React.FC<BoardCardProps> = memo(({ board, onOpen, onRename, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const title = board.name || board.title || 'Untitled Board';

  const menuItems: MenuItem[] = [
    { label: 'Open board', icon: 'chevron-right', onClick: () => onOpen(board) },
  ];

  if (onRename) {
    menuItems.push({ label: 'Rename board', icon: 'edit', onClick: () => onRename(board) });
  }

  if (onDelete) {
    menuItems.push(
      { divider: true },
      { label: 'Delete board', icon: 'trash', danger: true, onClick: () => onDelete(board) }
    );
  }

  return (
    <div
      onClick={() => onOpen(board)}
      className="group bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 cursor-pointer shadow-xs hover:shadow-md hover:border-orange-300 dark:hover:border-orange-900/50 transition-all duration-200 flex flex-col justify-between"
      style={{ height: 160 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 via-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            {initials(title)}
          </div>
          <div>
            <h3 className="font-bold text-base text-neutral-900 dark:text-neutral-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
              {title}
            </h3>
            <span className="text-xs text-neutral-400">
              {board.createdAt
                ? `Created ${new Date(board.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}`
                : 'Active Board'}
            </span>
          </div>
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu
            open={menuOpen}
            setOpen={setMenuOpen}
            trigger={
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="w-8 h-8 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-400 transition-colors"
                aria-label="Board menu"
              >
                <Icon name="more-horizontal" size={16} />
              </button>
            }
            items={menuItems}
          />
        </div>
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-2">
        {board.description || 'No description provided.'}
      </p>

      <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800/80 mt-auto">
        <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-1">
          <Icon name="layoutGrid" size={12} /> View Kanban
        </span>
        <Icon name="chevron-right" size={14} className="text-neutral-400 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
});

BoardCard.displayName = 'BoardCard';

export default BoardCard;
