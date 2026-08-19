import React from 'react';
import type { Label } from '../types';
import { LABEL_COLORS } from '../../../constants/task.constants';

export const getLabelMeta = (
  label: string | Label
): { name: string; style?: React.CSSProperties; className: string } => {
  if (typeof label === 'object' && label !== null) {
    const name = label.name || 'Label';
    const color = label.color || '#4F46E5';
    if (/^#([0-9a-fA-F]{3}){1,2}$/.test(color)) {
      return {
        name,
        style: {
          backgroundColor: `${color}1A`,
          color: color,
          borderColor: `${color}33`,
        },
        className: 'border font-medium',
      };
    }
    return {
      name,
      className:
        LABEL_COLORS[name.toLowerCase()] ||
        'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
    };
  }

  const labelStr = String(label);
  return {
    name: labelStr,
    className:
      LABEL_COLORS[labelStr.toLowerCase()] ||
      'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  };
};
