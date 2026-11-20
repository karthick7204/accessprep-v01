import React from 'react';
import { AudioToolbar } from '../AudioToolbar.tsx';

interface AuthenticationCardProps {
  title: string;
  subtitle: string;
  audioGuideText: string;
  audioGuideLabel: string;
  stepBadge?: string;
  children: React.ReactNode;
  footerPromptText: string;
  footerActionLabel: string;
  onFooterAction: () => void;
}

export function AuthenticationCard({
  title,
  subtitle,
  audioGuideText,
  audioGuideLabel,
  stepBadge,
  children,
  footerPromptText,
  footerActionLabel,
  onFooterAction
}: AuthenticationCardProps) {
  return (
    <div className="p-6 sm:p-8 lg:p-10 bg-white dark:bg-slate-900 border-2 border-[#D9E1EF] dark:border-slate-700 rounded-3xl shadow-sm space-y-6">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#D9E1EF] dark:border-slate-700">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#172033] dark:text-white tracking-tight">
              {title}
            </h2>
            {stepBadge && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EEF4FF] dark:bg-blue-950 text-[#1749E8] dark:text-blue-300 border border-[#D9E1EF]">
                {stepBadge}
              </span>
            )}
          </div>
          <p className="text-sm text-[#53627A] dark:text-slate-300 leading-relaxed">
            {subtitle}
          </p>
        </div>

        <div className="shrink-0">
          <AudioToolbar textToRead={audioGuideText} label={audioGuideLabel} />
        </div>
      </div>

      {/* Main Card Content */}
      <div className="space-y-5">{children}</div>

      {/* Bottom Navigation Prompt */}
      <div className="pt-4 border-t border-[#D9E1EF] dark:border-slate-700 text-center">
        <p className="text-sm text-[#53627A] dark:text-slate-300">
          {footerPromptText}{' '}
          <button
            type="button"
            onClick={onFooterAction}
            className="font-extrabold text-[#1749E8] dark:text-blue-400 hover:text-[#123BB8] underline underline-offset-4 px-1.5 py-1 rounded focus:outline-none focus:ring-2 focus:ring-[#6241C8]"
          >
            {footerActionLabel}
          </button>
        </p>
      </div>
    </div>
  );
}
