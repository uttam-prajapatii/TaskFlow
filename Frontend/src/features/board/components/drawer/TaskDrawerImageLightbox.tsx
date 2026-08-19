import React, { useEffect } from 'react';
import Icon from '../../../../components/UI/Icon';
import { formatFileSize } from '../../../../utils/file';
import type { TaskAttachmentItem } from '../../types';

interface TaskDrawerImageLightboxProps {
  attachment: TaskAttachmentItem | null;
  onClose: () => void;
  onDownload: (url?: string, name?: string) => void;
}

export const TaskDrawerImageLightbox: React.FC<TaskDrawerImageLightboxProps> = ({
  attachment,
  onClose,
  onDownload,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!attachment) return null;

  const fileName = attachment.fileName || attachment.originalName || 'Image Preview';
  const fileUrl = attachment.fileUrl || attachment.url;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Lightbox Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-900/95 shrink-0">
          <div className="min-w-0 flex-1 pr-4">
            <p className="text-sm font-bold text-neutral-100 truncate">{fileName}</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              {formatFileSize(attachment.sizeBytes ?? attachment.size)}
              {attachment.createdAt &&
                ` • ${new Date(attachment.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onDownload(fileUrl, fileName)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 transition cursor-pointer"
              title="Download image"
            >
              <Icon name="download" size={14} />
              <span>Download</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
              title="Close preview (Esc)"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
        </div>

        {/* Lightbox Image Container */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/50 min-h-[250px]">
          <img
            src={fileUrl}
            alt={fileName}
            className="max-h-[72vh] max-w-full object-contain rounded-lg shadow-lg"
          />
        </div>
      </div>
    </div>
  );
};

export default TaskDrawerImageLightbox;
