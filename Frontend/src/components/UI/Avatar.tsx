import React from 'react';

export const AVATAR_COLORS = [
  '#FF7A3D',
  '#3D8BFF',
  '#3DDC97',
  '#B97DFF',
  '#FFB13D',
  '#FF5FA0',
];

export const initials = (name?: string) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

interface AvatarProps {
  name: string;
  color?: string;
  size?: number;
  ring?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  color = AVATAR_COLORS[0],
  size = 28,
  ring = true,
}) => {
  return (
    <div
      title={name}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 600,
        border: ring ? '2px solid var(--tf-card, #ffffff)' : 'none',
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
};

export default Avatar;
