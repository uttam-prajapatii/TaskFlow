import React from 'react';
import Icon from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold shadow-md shadow-orange-500/20 active:scale-[0.98] border-none',
  secondary:
    'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 font-medium',
  danger:
    'bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 font-semibold',
  ghost:
    'bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 border-none',
  outline:
    'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 text-neutral-700 dark:text-neutral-200 font-semibold shadow-2xs',
  icon: 'p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border-none',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5',
  md: 'px-4 py-2 text-sm rounded-xl gap-2',
  lg: 'px-5 py-2.5 text-base rounded-2xl gap-2.5',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = '',
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isIconVariant = variant === 'icon';

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center transition-all cursor-pointer select-none font-sans ${
          variantStyles[variant]
        } ${!isIconVariant ? sizeStyles[size] : ''} ${
          fullWidth ? 'w-full' : ''
        } ${disabled || isLoading ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <Icon name="loader-2" size={size === 'sm' ? 14 : 16} className="animate-spin shrink-0" />
            {!isIconVariant && children}
          </>
        ) : (
          <>
            {leftIcon && <Icon name={leftIcon} size={size === 'sm' ? 14 : 16} className="shrink-0" />}
            {children}
            {rightIcon && <Icon name={rightIcon} size={size === 'sm' ? 14 : 16} className="shrink-0" />}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
