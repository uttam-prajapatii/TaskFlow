import React from 'react';

export const BoardSkeleton: React.FC = () => {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {[1, 2, 3, 4].map((col) => (
        <div
          key={col}
          className="flex flex-col w-[300px] shrink-0 bg-neutral-100 dark:bg-neutral-900/50 rounded-2xl p-3 animate-pulse border border-neutral-200 dark:border-neutral-800"
          style={{ height: 480 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-24 h-4 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
            <div className="w-6 h-6 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
          </div>
          <div className="space-y-3 flex-1">
            <div className="w-full h-24 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
            <div className="w-full h-28 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
            <div className="w-full h-20 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default BoardSkeleton;
