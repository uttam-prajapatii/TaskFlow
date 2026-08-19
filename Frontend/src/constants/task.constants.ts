import type { PriorityLevel } from '../features/board/types';

export interface PriorityMeta {
  label: string;
  dot: string;
  text: string;
  bg: string;
  ring: string;
}

export const PRIORITY_CONFIG: Record<PriorityLevel, PriorityMeta> = {
  urgent: {
    label: 'Urgent',
    dot: 'bg-rose-500',
    text: 'text-rose-700 dark:text-rose-300',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    ring: 'ring-rose-200 dark:ring-rose-500/20',
  },
  high: {
    label: 'High',
    dot: 'bg-orange-500',
    text: 'text-orange-700 dark:text-orange-300',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    ring: 'ring-orange-200 dark:ring-orange-500/20',
  },
  medium: {
    label: 'Medium',
    dot: 'bg-amber-400',
    text: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    ring: 'ring-amber-200 dark:ring-amber-500/20',
  },
  low: {
    label: 'Low',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    ring: 'ring-emerald-200 dark:ring-emerald-500/20',
  },
};

export const LABEL_COLORS: Record<string, string> = {
  design: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  backend: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  frontend: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  bug: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  research: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
  marketing: 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
};

export const PRESET_LABEL_COLORS = [
  '#FF501E', // TaskFlow Orange
  '#8B5CF6', // Purple
  '#0284C7', // Sky Blue
  '#F43F5E', // Rose
  '#14B8A6', // Teal
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#10B981', // Emerald
];

export const TASK_SORT_OPTIONS = [
  { id: 'position', label: 'Default Order' },
  { id: 'newest', label: 'Newest First' },
  { id: 'oldest', label: 'Oldest First' },
  { id: 'priority', label: 'Highest Priority' },
  { id: 'dueDate', label: 'Due Date' },
  { id: 'alpha', label: 'Alphabetical' },
] as const;

export type TaskSortOption = typeof TASK_SORT_OPTIONS[number]['id'];
