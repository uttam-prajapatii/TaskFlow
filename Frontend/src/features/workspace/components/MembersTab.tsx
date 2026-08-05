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
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        {canManage && (
          <button
            type="button"
            onClick={onOpenInvite}
            style={{
              background: 'linear-gradient(135deg, #FF7A3D, #E8432E)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 10,
              padding: '9px 16px',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 6px 16px rgba(232,67,46,0.28)',
            }}
          >
            <Icon name="plus" size={15} /> Invite member
          </button>
        )}
      </div>

      <div
        style={{
          background: 'var(--tf-card, #ffffff)',
          border: '1px solid var(--tf-border, #e5e7eb)',
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
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

          return (
            <div
              key={uId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '13px 16px',
                borderTop: i === 0 ? 'none' : '1px solid var(--tf-border, #e5e7eb)',
              }}
            >
              <Avatar name={userName} size={34} ring={false} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{ fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
                  className="text-neutral-900 dark:text-neutral-100"
                >
                  {userName}{' '}
                  {isSelf && (
                    <span style={{ fontSize: 11, color: 'var(--tf-text-muted, #9ca3af)', fontWeight: 500 }}>
                      (you)
                    </span>
                  )}
                </div>
                {userEmail && (
                  <div style={{ fontSize: 12, color: 'var(--tf-text-muted, #6b7280)' }}>
                    {userEmail}
                  </div>
                )}
              </div>

              {canManage && !isTargetOwner ? (
                <DropdownMenu
                  open={roleMenuFor === uId}
                  setOpen={(v) => setRoleMenuFor(v ? uId : null)}
                  trigger={
                    <button
                      type="button"
                      onClick={() => setRoleMenuFor(roleMenuFor === uId ? null : uId)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        background: 'var(--tf-chip, #f3f4f6)',
                        border: '1px solid var(--tf-border, #e5e7eb)',
                        borderRadius: 999,
                        padding: '5px 10px 5px 12px',
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: 'var(--tf-text, #111827)',
                        cursor: 'pointer',
                      }}
                    >
                      {ROLE_LABELS[m.role] || m.role} <Icon name="chevron-down" size={13} />
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
