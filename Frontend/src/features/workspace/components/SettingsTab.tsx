import React, { useState, useRef } from 'react';
import type { Workspace } from '../types';
import Icon from '../../../components/UI/Icon';
import ConfirmModal from '../../../components/UI/ConfirmModal';
import WorkspaceAvatar from '../../../components/UI/WorkspaceAvatar';
import { useWorkspaceMutations } from '../../../hooks/useWorkspaces';
import { useWorkspace } from '../../../context/WorkspaceContext';
import { toast } from 'sonner';

interface SettingsTabProps {
  ws: Workspace;
  myRole: string;
  canManage: boolean;
  onRename: (name: string) => void;
  onDelete: () => void;
  onLeave: () => void;
  onRefresh?: () => void;
  onUpdateWorkspace?: (updated: Partial<Workspace>) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  ws,
  myRole,
  canManage,
  onRename,
  onDelete,
  onLeave,
  onRefresh,
  onUpdateWorkspace,
}) => {
  const { updateWorkspaceInState } = useWorkspace();
  const { uploadLogoMutation } = useWorkspaceMutations();

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(ws.name);
  const [renameError, setRenameError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const wsId = ws._id || ws.id;
    if (!wsId) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo image size must be less than 2MB');
      if (logoInputRef.current) logoInputRef.current.value = '';
      return;
    }

    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append('logo', file);
      
      const res = await uploadLogoMutation.mutateAsync({ workspaceId: wsId, formData });
      toast.success('Workspace logo updated successfully!');
      
      // Immediately propagate to local and global contexts
      updateWorkspaceInState(wsId, { logoUrl: res.logoUrl });
      if (onUpdateWorkspace) {
        onUpdateWorkspace({ logoUrl: res.logoUrl });
      }
      if (onRefresh) {
        onRefresh();
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      toast.error(errorObj.response?.data?.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const submitRename = () => {
    if (!renameValue.trim() || renameValue.trim().length < 3) {
      setRenameError('Use at least 3 characters.');
      return;
    }
    onRename(renameValue.trim());
    setRenameError('');
    setRenaming(false);
  };

  const isOwner = myRole === 'owner';

  return (
    <div className="space-y-4 max-w-[840px]">
      {/* Workspace Logo Setting */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-2xs">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">
          Workspace Avatar / Logo
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
          Upload an image icon (PNG, JPG max 2MB) for your workspace. This updates the logo in real-time across all headers, cards, and sidebars.
        </p>
        <div className="flex items-center gap-4">
          <WorkspaceAvatar
            name={ws.name}
            logoUrl={ws.logoUrl}
            color={ws.accentColor || ws.settings?.color || ws.color}
            size={56}
            roundedClassName="rounded-2xl shrink-0"
          />
          {canManage && (
            <div className="flex flex-col items-start gap-1.5 justify-center">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="w-fit inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                {uploadingLogo ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>Uploading…</span>
                  </>
                ) : (
                  <>
                    <Icon name="upload" size={14} className="shrink-0" />
                    <span>{ws.logoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                  </>
                )}
              </button>
              <input
                type="file"
                ref={logoInputRef}
                onChange={handleLogoChange}
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
              />
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                Recommended 1:1 square PNG or JPG
              </span>
            </div>
          )}
        </div>
      </div>
      {/* Workspace Name Setting */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-2xs">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">
          Workspace name
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
          Visible to everyone in this workspace.
        </p>
        {renaming ? (
          <div className="space-y-3">
            <div>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                maxLength={50}
                autoFocus
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm border bg-neutral-50/80 dark:bg-neutral-800/80 text-neutral-900 dark:text-neutral-100 outline-none transition focus:ring-2 ${
                  renameError
                    ? 'border-rose-500 focus:ring-rose-500/20'
                    : 'border-neutral-200 dark:border-neutral-700 focus:ring-orange-500/30 focus:border-orange-500'
                }`}
              />
              {renameError && (
                <div className="text-xs text-rose-500 mt-1 flex items-center gap-1 font-medium">
                  <Icon name="alert-circle" size={13} />
                  {renameError}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={submitRename}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-500/25 transition cursor-pointer"
              >
                Save changes
              </button>
              <button
                type="button"
                onClick={() => {
                  setRenaming(false);
                  setRenameValue(ws.name);
                  setRenameError('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              {ws.name}
            </span>
            {canManage && (
              <button
                type="button"
                onClick={() => setRenaming(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition cursor-pointer"
              >
                <Icon name="edit" size={13} /> Rename
              </button>
            )}
          </div>
        )}
      </div>

      {/* Leave Workspace */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-2xs">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">
          Leave workspace
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
          You will lose access until re-invited.{' '}
          {isOwner && 'As the owner, you must transfer ownership first.'}
        </p>
        <button
          type="button"
          onClick={() => setConfirmLeave(true)}
          disabled={isOwner}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-xs font-semibold text-rose-600 dark:text-rose-400 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Icon name="log-out" size={14} /> Leave workspace
        </button>
      </div>

      {/* Delete Workspace (Owner Only) */}
      {isOwner && (
        <div className="bg-white dark:bg-neutral-900 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-6 shadow-2xs">
          <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-1">
            Delete workspace
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
            Permanently deletes this workspace and all its data. This cannot be undone.
          </p>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-md shadow-rose-500/25 transition cursor-pointer"
          >
            <Icon name="trash" size={14} /> Delete workspace
          </button>
        </div>
      )}

      <ConfirmModal
        target={confirmDelete ? ws : null}
        mode="delete"
        working={false}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          onDelete();
          setConfirmDelete(false);
        }}
      />

      <ConfirmModal
        target={confirmLeave ? ws : null}
        mode="leave"
        working={false}
        onClose={() => setConfirmLeave(false)}
        onConfirm={() => {
          onLeave();
          setConfirmLeave(false);
        }}
      />
    </div>
  );
};

export default SettingsTab;
