import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

interface AccessibleFormFieldProps {
  id: string;
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'tel';
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  autoComplete?: string;
  inputMode?: 'text' | 'email' | 'numeric' | 'tel';
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';
  disabled?: boolean;
  icon?: React.ReactNode;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function AccessibleFormField({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  placeholder,
  hint,
  error,
  required = false,
  autoComplete,
  inputMode,
  enterKeyHint,
  disabled = false,
  icon,
  inputRef
}: AccessibleFormFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;

  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const toggleWarningId = isPassword ? `${id}-toggle-warning` : undefined;

  const describedByIds = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="block text-sm font-bold text-[#172033] dark:text-slate-100"
        >
          {label}{' '}
          {required && (
            <span className="text-red-600 dark:text-red-400 font-extrabold" aria-hidden="true">
              *
            </span>
          )}
        </label>
      </div>

      {/* Hint placed above input so autocomplete popovers do not obscure it during editing */}
      {hint && (
        <p id={hintId} className="text-xs text-[#53627A] dark:text-slate-300 leading-relaxed">
          {hint}
        </p>
      )}

      <div className="relative flex items-center">
        {icon && (
          <span
            className="absolute left-3.5 text-[#53627A] dark:text-slate-400 pointer-events-none flex items-center"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}

        <input
          ref={inputRef}
          id={id}
          name={name}
          type={effectiveType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          inputMode={inputMode}
          enterKeyHint={enterKeyHint}
          aria-invalid={error ? 'true' : undefined}
          aria-errormessage={errorId}
          aria-describedby={describedByIds}
          className={`w-full min-h-[48px] py-2.5 text-base bg-white dark:bg-slate-800 border-2 rounded-xl text-[#172033] dark:text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#6241C8] disabled:opacity-60 ${
            icon ? 'pl-10' : 'pl-3.5'
          } ${isPassword ? 'pr-24' : 'pr-3.5'} ${
            error
              ? 'border-red-600 bg-red-50/30 dark:border-red-500'
              : 'border-[#D9E1EF] dark:border-slate-600 focus:border-[#1749E8]'
          }`}
        />

        {isPassword && (
          <>
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-pressed={showPassword}
              aria-label={showPassword ? `Hide ${label}` : `Show ${label}`}
              aria-describedby={toggleWarningId}
              className="absolute right-2 px-2.5 py-1.5 min-h-[36px] rounded-lg text-xs font-bold text-[#1749E8] dark:text-blue-300 bg-[#EEF4FF] dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-slate-600 border border-[#D9E1EF] dark:border-slate-500 inline-flex items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1749E8]"
            >
              {showPassword ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Hide</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Show</span>
                </>
              )}
            </button>
            <span id={toggleWarningId} className="sr-only">
              Warning: this will display your password on the screen.
            </span>
          </>
        )}
      </div>

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-1.5 pt-0.5"
        >
          <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
