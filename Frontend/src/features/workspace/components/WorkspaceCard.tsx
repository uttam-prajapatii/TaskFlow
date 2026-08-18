import React, { useState } from 'react';
import type { Workspace, WorkspaceRole } from '../types';
import AvatarStack from '../../../components/UI/AvatarStack';
import Icon from '../../../components/UI/Icon';
import DropdownMenu, { type MenuItem } from '../../../components/UI/DropdownMenu';
import WorkspaceAvatar from '../../../components/UI/WorkspaceAvatar';
import useAuth from '../../../hooks/useAuth';
import { getWorkspaceColorTokens, WORKSPACE_COLOR_MAP } from '../../../utils/workspaceColor';

export const WORKSPACE_COLORS = WORKSPACE_COLOR_MAP;
export const getColorHex = (colorId?: string) => getWorkspaceColorTokens(colorId).hex;

interface WorkspaceCardProps {
  ws: Workspace;
  onOpen: (ws: Workspace) => void;
  onRename: (ws: Workspace) => void;
  onDelete: (ws: Workspace) => void;
  onLeave: (ws: Workspace) => void;
  index: number;
}

export const WorkspaceCard: React.FC<WorkspaceCardProps> = ({
  ws,
  onOpen,
  onRename,
  onDelete,
  onLeave,
  index,
}) => {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isCreator =
    ws.ownerId === user?._id ||
    (typeof ws.ownerId === 'object' && ws.ownerId !== null && ws.ownerId._id === user?._id);

  const myMember = ws.members?.find((m) => {
    const uId = typeof m.userId === 'object' && m.userId !== null ? m.userId._id : m.userId;
    return String(uId) === String(user?._id);
  });

  const role: WorkspaceRole = isCreator ? 'admin' : (myMember?.role === 'owner' ? 'admin' : myMember?.role || 'member');
  const isAdmin = role === 'admin';
  const canRename = isCreator || isAdmin;
  const canDelete = isCreator;
  const canLeave = !isCreator;

  const memberList = (ws.members || []).map((m) => {
    if (typeof m.userId === 'object' && m.userId !== null) {
      return {
        id: m.userId._id,
        name: m.userId.fullName || m.userId.name || 'Member',
      };
    }
    return {
      id: m.userId,
      name: 'Member',
    };
  });

  const menuItems: MenuItem[] = [
    { label: 'Open workspace', icon: 'chevron-right', onClick: () => onOpen(ws) },
  ];

  if (canRename) {
    menuItems.push({ label: 'Rename', icon: 'edit', onClick: () => onRename(ws) });
  }

  if (canLeave || canDelete) {
    menuItems.push({ divider: true });
  }

  if (canLeave) {
    menuItems.push({ label: 'Leave workspace', icon: 'log-out', onClick: () => onLeave(ws) });
  }

  if (canDelete) {
    menuItems.push({ label: 'Delete workspace', icon: 'trash', danger: true, onClick: () => onDelete(ws) });
  }

  const rawColor = ws.accentColor || ws.settings?.color || ws.color;
  const colorTokens = getWorkspaceColorTokens(rawColor);

  return (
    <div
      onClick={() => onOpen(ws)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        animationDelay: `${index * 35}ms`,
        borderColor: isHovered ? colorTokens.borderHover : undefined,
      }}
      className="group bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-2xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <WorkspaceAvatar
            name={ws.name}
            logoUrl={ws.logoUrl}
            color={rawColor}
            size={44}
            roundedClassName="rounded-xl"
            className="group-hover:scale-105 transition-transform"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-neutral-900 dark:text-neutral-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors truncate">
                {ws.name}
              </h3>
              <span
                title={ws.activity === 'active' ? 'Active this week' : 'Idle'}
                className={`w-2 h-2 rounded-full shrink-0 ${
                  ws.activity === 'active'
                    ? 'bg-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-neutral-300 dark:bg-neutral-600'
                }`}
              />
            </div>
            <span className="text-[11px] text-neutral-400 capitalize font-medium block mt-0.5">
              Role: {role}
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
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="More options"
                className="w-8 h-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center cursor-pointer"
              >
                <Icon name="more-horizontal" size={16} />
              </button>
            }
            items={menuItems}
          />
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-1 leading-relaxed">
          {ws.description || 'No description provided.'}
        </p>
      </div>

      <div className="-mx-5 -mb-5 px-5 py-3.5 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between gap-3 mt-auto bg-neutral-50/50 dark:bg-neutral-900/50 rounded-b-2xl">
        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
          <AvatarStack users={memberList} />
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1 shrink-0">
            <Icon name="layout" size={13} className="text-neutral-400" /> {ws.boardCount ?? 0}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(ws);
          }}
          aria-label={`Open ${ws.name} workspace`}
          style={{
            background: colorTokens.gradient,
            boxShadow: colorTokens.glow,
          }}
          className="group/btn inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2 rounded-xl text-xs font-semibold text-white hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shrink-0 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
        >
          <span className="font-semibold text-xs leading-none">Open Workspace</span>
          <Icon
            name="arrow-right"
            size={13}
            className="shrink-0 transition-transform duration-200 group-hover/btn:translate-x-0.5"
          />
        </button>
      </div>
    </div>
  );
};

export default WorkspaceCard;
