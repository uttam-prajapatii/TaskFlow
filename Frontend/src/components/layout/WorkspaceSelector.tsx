import React from 'react';
import WorkspaceAvatar from '../UI/WorkspaceAvatar';
import Icon from '../UI/Icon';
import DropdownMenu, { type MenuItem } from '../UI/DropdownMenu';
import type { Workspace } from '../../features/workspace/types';

interface WorkspaceSelectorProps {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  menuOpen: boolean;
  setMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  menuItems: MenuItem[];
}

export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({
  currentWorkspace,
  menuOpen,
  setMenuOpen,
  menuItems,
}) => {
  const currentWsName = currentWorkspace?.name || 'Workspace';
  const color =
    currentWorkspace?.accentColor ||
    currentWorkspace?.settings?.color ||
    currentWorkspace?.color;

  return (
    <div className="px-3 pb-3">
      <DropdownMenu
        open={menuOpen}
        setOpen={setMenuOpen}
        fullWidth={true}
        align="left"
        trigger={
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 p-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/80 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all text-left cursor-pointer shadow-2xs"
          >
            <WorkspaceAvatar
              name={currentWsName}
              logoUrl={currentWorkspace?.logoUrl}
              color={color}
              size={32}
              roundedClassName="rounded-xl"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100 truncate leading-tight">
                {currentWsName}
              </p>
              <p className="text-[10.5px] text-neutral-400 truncate capitalize mt-0.5">
                Workspace
              </p>
            </div>
            <Icon
              name="chevron-down"
              size={14}
              className={`text-neutral-400 shrink-0 transition-transform duration-200 ${
                menuOpen ? 'rotate-180 text-orange-500' : 'rotate-0'
              }`}
            />
          </button>
        }
        items={menuItems}
      />
    </div>
  );
};

export default WorkspaceSelector;
