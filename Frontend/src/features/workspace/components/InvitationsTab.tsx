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

      {invites.length === 0 ? (
        <div className="text-center py-12 px-5 bg-white dark:bg-neutral-900 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xs">
          <div className="w-11 h-11 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 flex items-center justify-center mx-auto mb-3">
            <Icon name="mail" size={20} />
          </div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">
            No invitations yet
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto leading-relaxed">
            Invite people to this workspace and track their pending status here.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-2xs">
          {invites.map((inv, i) => {
            const invId = inv._id || inv.id || `inv-${i}`;
            const sentDate = inv.sentAt || inv.createdAt;

            return (
              <div
                key={invId}
                className={`flex items-center gap-3 p-4 transition-colors ${
                  i > 0 ? 'border-t border-neutral-100 dark:border-neutral-800/80' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 flex items-center justify-center shrink-0">
                  <Icon name="mail" size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
                    {inv.email}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
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
                    className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold text-red-600 dark:text-red-400 transition cursor-pointer"
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
