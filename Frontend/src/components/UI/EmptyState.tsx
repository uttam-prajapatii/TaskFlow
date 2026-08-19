import React from 'react';
import Icon from './Icon';
import Button from './Button';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: string;
  children?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'folder',
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  children,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/30 ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-500/10 text-orange-500 flex items-center justify-center mb-3.5 shadow-2xs">
        <Icon name={icon} size={24} />
      </div>
      <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 font-display">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mt-1 mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button
          variant="primary"
          size="sm"
          onClick={onAction}
          leftIcon={actionIcon}
          className="mt-1"
        >
          {actionLabel}
        </Button>
      )}
      {children}
    </div>
  );
};

export default EmptyState;
