import React, { useState } from 'react';
import type { WorkspaceMember, WorkspaceRole } from '../types';
import Avatar from '../../../components/UI/Avatar';
import Badge from '../../../components/UI/Badge';
import Icon from '../../../components/UI/Icon';
import DropdownMenu, { type MenuItem } from '../../../components/UI/DropdownMenu';
import ConfirmModal from '../../../components/UI/ConfirmModal';

interface MembersTabProps {
  members: WorkspaceMember[];
  currentUserId?: string;
  canManage: boolean;
  onUpdateRole: (userId: string, role: WorkspaceRole) => void;
  onRemoveMember: (userId: string) => void;
  onOpenInvite: () => void;
}

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

export const MembersTab: React.FC<MembersTabProps> = ({
  members,
  currentUserId,
  canManage,
  onUpdateRole,
  onRemoveMember,
  onOpenInvite,
}) => {
  const [roleMenuFor, setRoleMenuFor] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canManage && (
          <button
            type="button"
            onClick={onOpenInvite}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs text-white shadow-md cursor-pointer transition hover:opacity-95"
            style={{ background: 'linear-gradient(135deg, #FF7A3D, #E8432E)' }}
          >
            <Icon name="plus" size={15} /> Invite member
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xs">
        {members.map((m, i) => {
          const userObj = typeof m.userId === 'object' && m.userId !== null ? m.userId : null;
          const uId = userObj?._id || (typeof m.userId === 'string' ? m.userId : `m-${i}`);
          const userName = userObj?.fullName || userObj?.name || 'Member';
          const userEmail = userObj?.email || '';
          const isSelf = uId === currentUserId;
          const isTargetOwner = m.role === 'owner';

          const roleItems: MenuItem[] = (['admin', 'member', 'viewer'] as WorkspaceRole[]).map(
            (r) => ({
              label: ROLE_LABELS[r],
              icon: m.role === r ? 'check' : undefined,
              onClick: () => onUpdateRole(uId, r),
            })
          );

          roleItems.push(
            { divider: true },
            {
              label: 'Remove from workspace',
              icon: 'trash',
              danger: true,
              onClick: () => setConfirmRemove({ id: uId, name: userName }),
            }
          );

          const isMenuOpen = roleMenuFor === uId;

          return (
            <div
              key={uId}
              className={`flex items-center gap-3 p-4 transition-colors ${
                i > 0 ? 'border-t border-neutral-100 dark:border-neutral-800/80' : ''
              } ${i === 0 ? 'rounded-t-2xl' : ''} ${i === members.length - 1 ? 'rounded-b-2xl' : ''}`}
            >
              <Avatar name={userName} size={36} ring={false} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  <span className="truncate">{userName}</span>
                  {isSelf && (
                    <span className="text-xs font-normal text-neutral-400 dark:text-neutral-500 shrink-0">
                      (you)
                    </span>
                  )}
                </div>
                {userEmail && (
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                    {userEmail}
                  </div>
                )}
              </div>

              {canManage && !isTargetOwner ? (
                <DropdownMenu
                  open={isMenuOpen}
                  setOpen={(v) => setRoleMenuFor(v ? uId : null)}
                  widthClass="w-52"
                  trigger={
                    <button
                      type="button"
                      onClick={() => setRoleMenuFor(isMenuOpen ? null : uId)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition cursor-pointer"
                    >
                      <span>{ROLE_LABELS[m.role] || m.role}</span>
                      <Icon
                        name="chevron-down"
                        size={13}
                        className={`text-neutral-400 transition-transform duration-200 ${
                          isMenuOpen ? 'rotate-180 text-orange-500' : 'rotate-0'
                        }`}
                      />
                    </button>
                  }
                  items={roleItems}
                />
              ) : (
                <Badge tone={isTargetOwner ? 'brand' : 'neutral'}>
                  {ROLE_LABELS[m.role] || m.role}
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmModal
        target={confirmRemove}
        mode="delete"
        working={false}
        onClose={() => setConfirmRemove(null)}
        onConfirm={() => {
          if (confirmRemove) onRemoveMember(confirmRemove.id);
          setConfirmRemove(null);
        }}
      />
    </div>
  );
};

export default MembersTab;
