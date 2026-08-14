import React, { useState, useCallback, forwardRef } from 'react';

interface FormInputProps {
  label: string;
  id: string;
  type: string;
  name?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  required?: boolean;
  autoComplete?: string;
  error?: string;
  containerClassName?: string;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(({
  label,
  id,
  type,
  name,
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  required = false,
  autoComplete,
  error,
  containerClassName,
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  let inputType = type;
  if (isPassword) {
    inputType = showPassword ? 'text' : 'password';
  }

  const handleToggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const hasError = Boolean(error);

  return (
    <div className={containerClassName !== undefined ? containerClassName : "mb-4"}>
      <label htmlFor={id} className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 select-none">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          ref={ref}
          id={id}
          name={name}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
          className={`w-full pl-3.5 ${isPassword ? 'pr-11' : 'pr-3.5'} py-2.5 rounded-xl border font-sans text-xs sm:text-sm outline-none transition-all duration-200 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 ${
            hasError
              ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
              : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/80 focus:bg-white dark:focus:bg-neutral-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500'
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={handleToggleShowPassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg cursor-pointer text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 select-none flex items-center justify-center transition-colors z-10"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-7-11-7a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>
      {hasError && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-rose-500 font-medium flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
});

FormInput.displayName = 'FormInput';

export default FormInput;
