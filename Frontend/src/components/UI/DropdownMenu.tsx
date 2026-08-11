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
  fullWidth?: boolean;
  widthClass?: string;
}

export const DropdownMenu: React.FC<MenuProps> = ({
  trigger,
  items,
  align = 'right',
  open,
  setOpen,
  fullWidth = false,
  widthClass = 'w-48',
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
    <div ref={ref} className={`relative text-left ${fullWidth ? 'w-full block' : 'inline-block'}`}>
      {trigger}
      {open && (
        <div
          className={`tf-pop absolute z-50 mt-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl p-1.5 overflow-y-auto max-h-80 origin-top transition-all duration-150 animate-in fade-in slide-in-from-top-2 ${
            fullWidth ? 'w-full left-0 right-0' : `${widthClass} ${align === 'left' ? 'left-0' : 'right-0'}`
          }`}
        >
          {items.map((it, i) =>
            it.divider ? (
              <div
                key={i}
                className="h-px bg-neutral-100 dark:bg-neutral-800 my-1"
              />
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => {
                  it.onClick?.();
                  setOpen(false);
                }}
                disabled={it.disabled}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer ${
                  it.danger
                    ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                    : it.disabled
                    ? 'text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
                    : 'text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                {it.icon && <Icon name={it.icon} size={15} className="shrink-0 text-neutral-400 dark:text-neutral-500" />}
                <span className="truncate flex-1 min-w-0">{it.label}</span>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;
