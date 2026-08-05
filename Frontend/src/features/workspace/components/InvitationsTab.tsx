import React from 'react';
import type { WorkspaceInvite } from '../types';
import Badge, { type BadgeTone } from '../../../components/UI/Badge';
import Icon from '../../../components/UI/Icon';

interface InvitationsTabProps {
  invites: WorkspaceInvite[];
  canManage: boolean;
  onRevokeInvite: (inviteId: string) => void;
  onOpenInvite: () => void;
}

const statusTones: Record<string, BadgeTone> = {
  pending: 'warning',
  accepted: 'success',
  expired: 'danger',
  revoked: 'neutral',
};

export const InvitationsTab: React.FC<InvitationsTabProps> = ({
  invites,
  canManage,
  onRevokeInvite,
  onOpenInvite,
}) => {
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

      {invites.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 20px',
            background: 'var(--tf-card, #ffffff)',
            border: '1px dashed var(--tf-border, #e5e7eb)',
            borderRadius: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'var(--tf-chip, #f3f4f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
            }}
          >
            <Icon name="mail" size={20} className="text-neutral-400" />
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700 }} className="text-neutral-900 dark:text-neutral-100">
            No invitations yet
          </h3>
          <p
            style={{
              margin: '0 auto',
              fontSize: 13,
              color: 'var(--tf-text-muted, #6b7280)',
              maxWidth: 320,
              lineHeight: 1.5,
            }}
          >
            Invite people to this workspace and track their pending status here.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--tf-card, #ffffff)',
            border: '1px solid var(--tf-border, #e5e7eb)',
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          {invites.map((inv, i) => {
            const invId = inv._id || inv.id || `inv-${i}`;
            const sentDate = inv.sentAt || inv.createdAt;

            return (
              <div
                key={invId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '13px 16px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--tf-border, #e5e7eb)',
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'var(--tf-chip, #f3f4f6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon name="mail" size={15} className="text-neutral-500" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }} className="text-neutral-900 dark:text-neutral-100">
                    {inv.email}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--tf-text-muted, #6b7280)' }}>
                    Invited as {inv.role}{' '}
                    {sentDate &&
                      `· ${new Date(sentDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}`}
                  </div>
                </div>
                <Badge tone={statusTones[inv.status] || 'neutral'}>
                  {inv.status ? inv.status.charAt(0).toUpperCase() + inv.status.slice(1) : 'Pending'}
                </Badge>
                {canManage && inv.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => onRevokeInvite(invId)}
                    style={{
                      background: 'var(--tf-card, #fff)',
                      color: '#E8432E',
                      border: '1px solid rgba(232,67,46,0.35)',
                      borderRadius: 10,
                      padding: '6px 12px',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Revoke
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InvitationsTab;
