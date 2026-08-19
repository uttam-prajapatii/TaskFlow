import React from 'react';
import Icon from './Icon';

export interface SpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 20, className = 'text-orange-500', label }) => {
  return (
    <div className="inline-flex items-center gap-2" role="status">
      <Icon name="loader-2" size={size} className={`animate-spin ${className}`} />
      {label && <span className="text-xs text-neutral-500">{label}</span>}
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default Spinner;
