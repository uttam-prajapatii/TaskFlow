import React, { useState } from 'react';
import type { Workspace } from '../types';
import AvatarStack from '../../../components/UI/AvatarStack';
import Badge from '../../../components/UI/Badge';
import Icon from '../../../components/UI/Icon';
import DropdownMenu, { type MenuItem } from '../../../components/UI/DropdownMenu';
import { initials } from '../../../components/UI/Avatar';

export const WORKSPACE_COLORS: Record<string, string> = {
  coral: '#FF7A3D',
  blue: '#3D8BFF',
  green: '#3DDC97',
  violet: '#B97DFF',
  amber: '#FFB13D',
  pink: '#FF5FA0',
};

export const getColorHex = (colorId?: string) => {
  if (!colorId) return WORKSPACE_COLORS.coral;
  return WORKSPACE_COLORS[colorId] || colorId;
};

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
  const [menuOpen, setMenuOpen] = useState(false);

  const hex = getColorHex(ws.settings?.color || ws.color);
  const visibility = ws.settings?.visibility || ws.visibility || 'private';

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
    { label: 'Rename', icon: 'edit', onClick: () => onRename(ws) },
    { divider: true },
    { label: 'Leave workspace', icon: 'log-out', onClick: () => onLeave(ws) },
    { label: 'Delete workspace', icon: 'trash', danger: true, onClick: () => onDelete(ws) },
  ];

  return (
    <div
      className="tf-card tf-fade-in hover:shadow-lg transition-all duration-200"
      style={{
        background: 'var(--tf-card, #ffffff)',
        border: '1px solid var(--tf-border, #e5e7eb)',
        borderRadius: 16,
        padding: 18,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        animationDelay: `${index * 35}ms`,
      }}
      onClick={() => onOpen(ws)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${hex}, ${hex}CC)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          {initials(ws.name)}
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
                className="w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 transition-colors"
              >
                <Icon name="more-horizontal" size={18} />
              </button>
            }
            items={menuItems}
          />
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700 }} className="text-neutral-900 dark:text-neutral-100">
            {ws.name}
          </h3>
          <span
            title={ws.activity === 'active' ? 'Active this week' : 'Idle'}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: ws.activity === 'active' ? '#22B573' : 'var(--tf-text-muted, #9ca3af)',
              boxShadow: ws.activity === 'active' ? '0 0 0 3px rgba(34,181,115,0.18)' : 'none',
              flexShrink: 0,
            }}
          />
        </div>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 13,
            color: 'var(--tf-text-muted, #6b7280)',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {ws.description || 'No description provided.'}
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 'auto',
          paddingTop: 4,
        }}
      >
        <AvatarStack users={memberList} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--tf-text-muted, #6b7280)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon name="layout" size={13} /> {ws.boardCount ?? 0}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 10,
          borderTop: '1px solid var(--tf-border, #e5e7eb)',
        }}
      >
        <span style={{ fontSize: 11.5, color: 'var(--tf-text-muted, #6b7280)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="clock" size={12} />{' '}
          {new Date(ws.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
        <Badge tone={visibility === 'public' ? 'success' : 'neutral'}>
          {visibility === 'public' ? 'Public' : 'Private'}
        </Badge>
      </div>
    </div>
  );
};

export default WorkspaceCard;
