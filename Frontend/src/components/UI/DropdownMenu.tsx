import React, { useRef, useEffect } from 'react';
import Icon from './Icon';

export interface MenuItem {
  label?: string;
  icon?: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
}

interface MenuProps {
  trigger: React.ReactNode;
  items: MenuItem[];
  align?: 'left' | 'right';
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const DropdownMenu: React.FC<MenuProps> = ({
  trigger,
  items,
  align = 'right',
  open,
  setOpen,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, setOpen]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {trigger}
      {open && (
        <div
          className="tf-pop"
          style={{
            position: 'absolute',
            [align]: 0,
            top: 'calc(100% + 6px)',
            background: 'var(--tf-card, #ffffff)',
            border: '1px solid var(--tf-border, #e5e7eb)',
            borderRadius: 12,
            boxShadow: '0 12px 32px rgba(0,0,0,0.16)',
            minWidth: 190,
            zIndex: 60,
            padding: 6,
            overflow: 'hidden',
          }}
        >
          {items.map((it, i) =>
            it.divider ? (
              <div
                key={i}
                style={{
                  height: 1,
                  background: 'var(--tf-border, #e5e7eb)',
                  margin: '6px 4px',
                }}
              />
            ) : (
              <button
                key={i}
                onClick={() => {
                  it.onClick?.();
                  setOpen(false);
                }}
                disabled={it.disabled}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  padding: '9px 10px',
                  borderRadius: 8,
                  fontSize: 13.5,
                  color: it.danger
                    ? '#E8432E'
                    : it.disabled
                    ? 'var(--tf-text-muted, #9ca3af)'
                    : 'var(--tf-text, #111827)',
                  cursor: it.disabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  fontWeight: 500,
                }}
                className="hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                {it.icon && <Icon name={it.icon} size={15} />}
                {it.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;
