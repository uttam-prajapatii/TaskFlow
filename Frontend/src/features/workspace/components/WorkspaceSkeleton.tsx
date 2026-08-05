import React from 'react';

export const WorkspaceSkeleton: React.FC = () => {
  return (
    <div
      style={{
        background: 'var(--tf-card, #ffffff)',
        border: '1px solid var(--tf-border, #e5e7eb)',
        borderRadius: 16,
        padding: 18,
        height: 190,
      }}
      className="animate-pulse"
    >
      <div className="w-11 h-11 bg-neutral-200 dark:bg-neutral-800 rounded-xl mb-3.5" />
      <div className="w-3/5 h-4 bg-neutral-200 dark:bg-neutral-800 rounded-md mb-2.5" />
      <div className="w-11/12 h-3 bg-neutral-200 dark:bg-neutral-800 rounded-md mb-1.5" />
      <div className="w-4/5 h-3 bg-neutral-200 dark:bg-neutral-800 rounded-md mb-4" />
      <div className="w-20 h-6 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
    </div>
  );
};

export default WorkspaceSkeleton;
