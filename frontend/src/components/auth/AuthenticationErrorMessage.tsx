import React from 'react';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

interface AuthenticationErrorMessageProps {
  id?: string;
  title?: string;
  message: string | null;
  variant?: 'error' | 'success' | 'info';
  onRetry?: () => void;
  retryLabel?: string;
}

export function AuthenticationErrorMessage({
  id,
  title,
  message,
  variant = 'error',
  onRetry,
  retryLabel = 'Try Again'
}: AuthenticationErrorMessageProps) {
  if (!message) return null;

  if (variant === 'success') {
    return (
      <div
        id={id}
        role="status"
        aria-live="polite"
        className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500 text-emerald-950 dark:text-emerald-100 flex items-start gap-3 shadow-xs"
      >
        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1 text-sm">
          {title && <p className="font-bold">{title}</p>}
          <p className="leading-relaxed font-medium">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      id={id}
      role="alert"
      aria-live="assertive"
      className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border-2 border-red-600 text-red-950 dark:text-red-100 flex items-start justify-between gap-3 shadow-xs"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1 text-sm">
          <p className="font-bold">{title || 'Authentication Notice'}</p>
          <p className="leading-relaxed">{message}</p>
        </div>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700 hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-600"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{retryLabel}</span>
        </button>
      )}
    </div>
  );
}
