import React from 'react';
import Avatar from './Avatar';

interface StackUser {
  id?: string;
  name: string;
  color?: string;
}

interface AvatarStackProps {
  users: StackUser[];
  max?: number;
}

export const AvatarStack: React.FC<AvatarStackProps> = ({ users, max = 4 }) => {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((u, i) => (
        <div key={u.id || i} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: shown.length - i }}>
          <Avatar name={u.name} color={u.color} size={26} />
        </div>
      ))}
      {extra > 0 && (
        <div
          style={{
            marginLeft: -8,
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: 'var(--tf-chip, #f3f4f6)',
            color: 'var(--tf-text-muted, #6b7280)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10.5,
            fontWeight: 600,
            border: '2px solid var(--tf-card, #ffffff)',
          }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
};

export default AvatarStack;
