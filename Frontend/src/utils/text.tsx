import React from 'react';

/**
 * Text utility functions for TaskFlow
 */

export const renderCommentBody = (text: string): React.ReactNode => {
  if (!text) return null;
  // Regex to match @mentions: @word or @Word Word
  const mentionRegex = /(@[a-zA-Z0-9_.-]+(?:\s[a-zA-Z0-9_.-]+)?)/g;
  const parts = text.split(mentionRegex);

  return parts.map((part, idx) => {
    if (part.startsWith('@') && part.trim().length > 1) {
      return (
        <span
          key={idx}
          className="inline-flex items-center font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 px-1.5 py-0.5 rounded text-[12px] align-baseline mx-0.5"
        >
          {part}
        </span>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
};

export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};
