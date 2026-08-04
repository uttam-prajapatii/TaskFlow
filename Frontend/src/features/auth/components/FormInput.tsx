import React, { useState, useCallback, forwardRef } from 'react';

interface FormInputProps {
  label: string;
  id: string;
  type: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  required?: boolean;
  autoComplete?: string;
  error?: string;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(({
  label,
  id,
  type,
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  required = false,
  autoComplete,
  error,
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
    <div className="mb-4">
      <label htmlFor={id} className="block text-[12.5px] font-semibold text-ink-soft mb-1.5 tracking-wide select-none">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          ref={ref}
          id={id}
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
          className={`w-full px-3.5 py-[11px] rounded-lg border font-sans text-sm text-ink outline-none placeholder-[#C4B4A9] transition-all duration-200 ${
            hasError
              ? 'border-red-500 bg-red-50/25 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]'
              : 'border-line bg-paper focus:border-flame-2 focus:bg-white focus:shadow-[0_0_0_3px_rgba(255,106,44,0.14)]'
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={handleToggleShowPassword}
            className="absolute right-3 cursor-pointer text-[#B8A79C] hover:text-ink-soft select-none flex items-center justify-center"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-flame-2">
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
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1.5 animate-[fadeUp_0.15s_ease]">
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
