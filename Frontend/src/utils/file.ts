/**
 * File utility functions for TaskFlow
 */

export const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const getFileExtension = (filename?: string): string => {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
};

export const getFileTypeCategory = (filename?: string): 'image' | 'code' | 'archive' | 'document' | 'other' => {
  const ext = getFileExtension(filename);
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
  if (['ts', 'tsx', 'js', 'jsx', 'json', 'html', 'css', 'py', 'go', 'rs', 'java', 'c', 'cpp'].includes(ext)) return 'code';
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) return 'archive';
  if (['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'].includes(ext)) return 'document';
  return 'other';
};

export const getFileIconName = (filename?: string): string => {
  const category = getFileTypeCategory(filename);
  switch (category) {
    case 'image':
      return 'file-image';
    case 'code':
      return 'file-code';
    case 'archive':
      return 'file-archive';
    case 'document':
      return 'file-text';
    default:
      return 'file';
  }
};
