import React from 'react';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, tone = 'neutral', className = '' }) => {
  const tones: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: 'var(--tf-chip, #F3F4F6)', fg: 'var(--tf-text-muted, #4B5563)' },
    brand: { bg: 'rgba(255,122,61,0.14)', fg: '#E8432E' },
    success: { bg: 'rgba(34,181,115,0.14)', fg: '#178A55' },
    warning: { bg: 'rgba(255,177,61,0.16)', fg: '#B5750A' },
    danger: { bg: 'rgba(232,67,46,0.12)', fg: '#C13B27' },
  };

  const t = tones[tone];

  return (
    <span
      className={className}
      style={{
        background: t.bg,
        color: t.fg,
        fontSize: 11.5,
        fontWeight: 600,
        padding: '3px 9px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {children}
    </span>
  );
};

export default Badge;
