import React, { useState, useEffect } from 'react';
import { initials } from './Avatar';
import { getWorkspaceColorTokens } from '../../utils/workspaceColor';

export interface WorkspaceAvatarProps {
  name?: string;
  logoUrl?: string | null;
  color?: string;
  size?: number;
  className?: string;
  roundedClassName?: string;
  alt?: string;
}

export const WorkspaceAvatar: React.FC<WorkspaceAvatarProps> = ({
  name = 'Workspace',
  logoUrl,
  color,
  size = 36,
  className = '',
  roundedClassName = 'rounded-xl',
  alt,
}) => {
  const [imageError, setImageError] = useState(false);

  // Reset imageError whenever logoUrl changes
  useEffect(() => {
    setImageError(false);
  }, [logoUrl]);

  const tokens = getWorkspaceColorTokens(color);
  const fontSize = Math.max(10, Math.round(size * 0.38));

  if (logoUrl && !imageError) {
    return (
      <img
        src={logoUrl}
        alt={alt || name}
        onError={() => setImageError(true)}
        className={`object-cover shrink-0 border border-neutral-200/80 dark:border-neutral-700/80 shadow-2xs ${roundedClassName} ${className}`}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      />
    );
  }

  return (
    <div
      title={name}
      className={`flex items-center justify-center text-white font-bold shrink-0 shadow-2xs select-none ${roundedClassName} ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        background: tokens.avatarGradient,
        fontSize: `${fontSize}px`,
      }}
    >
      {initials(name)}
    </div>
  );
};

export default WorkspaceAvatar;
