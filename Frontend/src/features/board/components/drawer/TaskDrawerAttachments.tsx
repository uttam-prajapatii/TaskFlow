import React, { useRef } from 'react';
import Icon from '../../../../components/UI/Icon';
import { formatFileSize, getFileExtension } from '../../../../utils/file';
import type { TaskAttachmentItem } from '../../types';

interface TaskDrawerAttachmentsProps {
  attachmentsList: TaskAttachmentItem[];
  isUploading: boolean;
  deletingAttId: string | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPreview: (att: TaskAttachmentItem) => void;
  onDownload: (url?: string, name?: string) => void;
  onDelete: (attId: string) => void;
}

const isImageAttachment = (att: TaskAttachmentItem): boolean => {
  const mime = (att.mimeType || '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  const name = (att.fileName || att.originalName || '').toLowerCase();
  return /\.(jpe?g|png|gif|webp|svg|bmp|avif)$/i.test(name);
};

const getAttachmentIconName = (att: TaskAttachmentItem): string => {
  const mime = (att.mimeType || '').toLowerCase();
  const name = (att.fileName || att.originalName || '').toLowerCase();

  if (mime.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(name)) {
    return 'file-image';
  }
  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    return 'file-text';
  }
  if (
    mime.includes('zip') ||
    mime.includes('tar') ||
    mime.includes('compressed') ||
    /\.(zip|rar|7z|tar|gz)$/i.test(name)
  ) {
    return 'file-archive';
  }
  if (
    mime.includes('json') ||
    mime.includes('javascript') ||
    mime.includes('typescript') ||
    mime.includes('html') ||
    /\.(js|ts|tsx|jsx|json|html|css|py|java|cpp|c|md|yml|yaml)$/i.test(name)
  ) {
    return 'file-code';
  }
  if (
    mime.includes('word') ||
    mime.includes('document') ||
    mime.includes('excel') ||
    mime.includes('sheet') ||
    /\.(docx?|xlsx?|pptx?|csv|txt|rtf)$/i.test(name)
  ) {
    return 'file-text';
  }
  return 'paperclip';
};

const getFileTypeStyle = (att: TaskAttachmentItem) => {
  const name = (att.fileName || att.originalName || '').toLowerCase();
  const mime = (att.mimeType || '').toLowerCase();
  if (mime.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(name)) {
    return {
      bg: 'bg-orange-500/10 dark:bg-orange-500/20',
      text: 'text-orange-500 dark:text-orange-400',
      badge: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300',
    };
  }
  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    return {
      bg: 'bg-rose-500/10 dark:bg-rose-500/20',
      text: 'text-rose-500 dark:text-rose-400',
      badge: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300',
    };
  }
  if (mime.includes('zip') || /\.(zip|rar|7z|tar|gz)$/i.test(name)) {
    return {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      text: 'text-amber-500 dark:text-amber-400',
      badge: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
    };
  }
  if (
    mime.includes('json') ||
    mime.includes('javascript') ||
    mime.includes('typescript') ||
    /\.(js|ts|tsx|jsx|json|html|css|py|md)$/i.test(name)
  ) {
    return {
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
      text: 'text-indigo-500 dark:text-indigo-400',
      badge: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300',
    };
  }
  return {
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-500 dark:text-blue-400',
    badge: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
  };
};

export const TaskDrawerAttachments: React.FC<TaskDrawerAttachmentsProps> = ({
  attachmentsList,
  isUploading,
  deletingAttId,
  onFileSelect,
  onPreview,
  onDownload,
  onDelete,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
          <Icon name="paperclip" size={14} className="text-orange-500" />
          Attachments ({attachmentsList.length})
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-semibold rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
        >
          {isUploading ? (
            <>
              <Icon name="loader-2" size={13} className="animate-spin" />
              <span>Uploading…</span>
            </>
          ) : (
            <>
              <Icon name="plus" size={13} />
              <span>Attach File</span>
            </>
          )}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileSelect}
          className="hidden"
        />
      </div>

      {attachmentsList.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 text-center bg-neutral-50/50 dark:bg-neutral-900/30">
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            No file attachments yet. Click <span className="font-semibold text-neutral-600 dark:text-neutral-300">Attach File</span> to upload screenshots, PDFs, or documents (up to 10MB).
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 mt-2">
          {attachmentsList.map((att) => {
            const attId = att._id || att.id || '';
            const fileName = att.fileName || att.originalName || 'Attachment';
            const fileUrl = att.fileUrl || att.url || '';
            const fileSizeStr = formatFileSize(att.sizeBytes ?? att.size);
            const isImg = isImageAttachment(att);
            const fileExt = getFileExtension(fileName).toUpperCase();
            const styleInfo = getFileTypeStyle(att);
            const isDeleting = deletingAttId === attId;

            return (
              <div
                key={attId || fileName}
                className={`flex items-center justify-between p-3 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-800/40 hover:bg-neutral-100/70 dark:hover:bg-neutral-800/70 transition-all ${
                  isDeleting ? 'opacity-40 pointer-events-none' : ''
                }`}
              >
                {/* Left: Thumbnail or File Icon + Details */}
                <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                  {isImg && fileUrl ? (
                    <button
                      type="button"
                      onClick={() => onPreview(att)}
                      className="w-11 h-11 rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-700 shrink-0 border border-neutral-200 dark:border-neutral-700 group relative cursor-pointer"
                      title="Click to preview image"
                    >
                      <img
                        src={fileUrl}
                        alt={fileName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Icon name="eye" size={14} />
                      </div>
                    </button>
                  ) : (
                    <div
                      className={`w-11 h-11 rounded-xl ${styleInfo.bg} ${styleInfo.text} flex flex-col items-center justify-center shrink-0 border border-neutral-200/40 dark:border-neutral-700/40`}
                    >
                      <Icon name={getAttachmentIconName(att)} size={18} />
                      <span className="text-[9px] font-bold uppercase tracking-tight leading-none mt-0.5 opacity-80">
                        {fileExt}
                      </span>
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p
                      className="text-xs font-bold text-neutral-800 dark:text-neutral-100 truncate leading-snug"
                      title={fileName}
                    >
                      {fileName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                      <span className={`px-1.5 py-0.2 rounded font-semibold text-[9.5px] uppercase ${styleInfo.badge}`}>
                        {fileExt}
                      </span>
                      <span>•</span>
                      <span>{fileSizeStr}</span>
                      {att.createdAt && (
                        <>
                          <span>•</span>
                          <span>{new Date(att.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions (View, Download, Delete) */}
                <div className="flex items-center gap-1 shrink-0">
                  {isImg && fileUrl && (
                    <button
                      type="button"
                      onClick={() => onPreview(att)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/80 dark:hover:bg-neutral-700/80 transition cursor-pointer flex items-center gap-1"
                      title="View full image"
                    >
                      <Icon name="eye" size={13} />
                      <span className="hidden sm:inline">View</span>
                    </button>
                  )}

                  {fileUrl && (
                    <button
                      type="button"
                      onClick={() => onDownload(fileUrl, fileName)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/80 dark:hover:bg-neutral-700/80 transition cursor-pointer flex items-center gap-1"
                      title="Download attachment"
                    >
                      <Icon name="download" size={13} />
                      <span className="hidden sm:inline">Download</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onDelete(attId)}
                    disabled={isDeleting}
                    className="p-1.5 rounded-xl text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer disabled:opacity-40"
                    title="Delete attachment"
                  >
                    {isDeleting ? (
                      <Icon name="loader-2" size={14} className="animate-spin text-rose-500" />
                    ) : (
                      <Icon name="trash-2" size={14} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TaskDrawerAttachments;
