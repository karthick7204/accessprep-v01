import React from 'react';
import { Accessibility, CheckCircle2 } from 'lucide-react';

export interface AuthFeatureHighlight {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface AuthenticationLayoutProps {
  screenBadge: string;
  headline: string;
  supportingDescription: string;
  features: AuthFeatureHighlight[];
  leftExtra?: React.ReactNode;
  children: React.ReactNode;
}

export function AuthenticationLayout({
  screenBadge,
  headline,
  supportingDescription,
  features,
  leftExtra,
  children
}: AuthenticationLayoutProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10" id="main-content">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left Section: Welcome & Accessibility Introduction (6 columns on desktop) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-6 sm:p-8 lg:p-10 rounded-3xl bg-gradient-to-br from-white via-[#F8FAFC] to-[#EEF4FF] dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border-2 border-[#D9E1EF] dark:border-slate-700 shadow-xs space-y-7 relative overflow-hidden">
            {/* Brand Identity & Screen Badge */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="inline-flex items-center bg-white rounded-xl p-1.5 shadow-2xs border border-slate-200/60 dark:border-slate-700/60">
                <img
                  src="/assets/accessprep-x-logo-full.png"
                  alt="ACCESSPREP-X — Accessible AI Examination Preparation Platform"
                  className="h-10 sm:h-12 md:h-14 w-auto object-contain max-w-full"
                />
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF4FF] dark:bg-blue-950 text-[#1749E8] dark:text-blue-300 text-xs font-bold border border-[#D9E1EF] dark:border-slate-700 self-start sm:self-center">
                {screenBadge}
              </span>
            </div>

            {/* Primary Welcome Headline & Supporting Description */}
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#172033] dark:text-white tracking-tight leading-tight">
                {headline}
              </h1>
              <p className="text-base text-[#53627A] dark:text-slate-300 leading-relaxed max-w-xl">
                {supportingDescription}
              </p>
            </div>

            {/* Subtle Abstract Educational & Audio Waveform Visual (Decorative, aria-hidden) */}
            <div
              aria-hidden="true"
              className="p-4 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-[#D9E1EF] dark:border-slate-700 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EEF4FF] dark:bg-blue-950 flex items-center justify-center text-[#1749E8] dark:text-blue-400 font-bold">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M8 7v10M4 10v4M16 7v10M20 10v4" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-extrabold text-[#172033] dark:text-white">
                    Audio-First SSC MTS Preparation
                  </p>
                  <p className="text-[11px] text-[#53627A] dark:text-slate-400">
                    Screen-Reader Native • Voice Guided • Keyboard Accessible
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1">
                <span className="w-1.5 h-4 rounded-full bg-[#1749E8]/40" />
                <span className="w-1.5 h-7 rounded-full bg-[#1749E8]/70" />
                <span className="w-1.5 h-5 rounded-full bg-[#6241C8]" />
                <span className="w-1.5 h-8 rounded-full bg-[#1749E8]" />
                <span className="w-1.5 h-4 rounded-full bg-[#1749E8]/50" />
              </div>
            </div>

            {/* Three Compact Feature Highlights */}
            <ul className="space-y-3.5" role="list">
              {features.map((feat, idx) => (
                <li
                  key={idx}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-[#D9E1EF] dark:border-slate-700 shadow-2xs flex items-start gap-3.5"
                >
                  <div
                    className="w-10 h-10 rounded-xl bg-[#EEF4FF] dark:bg-blue-950 text-[#1749E8] dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5"
                    aria-hidden="true"
                  >
                    {feat.icon}
                  </div>
                  <div className="space-y-0.5">
                    <h2 className="text-sm font-extrabold text-[#172033] dark:text-white flex items-center gap-1.5">
                      <span>{feat.title}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                    </h2>
                    <p className="text-xs text-[#53627A] dark:text-slate-300 leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {/* RPwD Act 2016 & WCAG AAA Compliance Note */}
            <div className="p-4 rounded-2xl bg-[#EEF4FF]/70 dark:bg-slate-800 border border-[#D9E1EF] dark:border-slate-700 flex items-start gap-3">
              <Accessibility className="w-5 h-5 text-[#1749E8] dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-[#53627A] dark:text-slate-300 leading-relaxed">
                <strong className="font-bold text-[#172033] dark:text-white">RPwD Act 2016 &amp; WCAG 2.1 AAA Compliant:</strong>{' '}
                Built for independent operation by blind and low-vision candidates with automatic compensatory time and hands-free voice guidance.
              </p>
            </div>

            {leftExtra}
          </div>
        </div>

        {/* Right Section: Authentication Form Card (6 columns on desktop) */}
        <div className="lg:col-span-6">{children}</div>
      </div>

      {/* Accessible Keyboard Shortcuts Section (Visible at bottom of page, NO popups) */}
      <section
        aria-label="Accessible Keyboard Shortcuts Reference"
        className="mt-8 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#D9E1EF] dark:border-slate-700 shadow-xs space-y-3.5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#D9E1EF] dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EEF4FF] dark:bg-blue-950 text-[#1749E8] dark:text-blue-300 flex items-center justify-center font-bold text-xs" aria-hidden="true">
              ⌨️
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[#172033] dark:text-white">
                Accessible Keyboard Shortcuts Guide
              </h2>
              <p className="text-xs text-[#53627A] dark:text-slate-400">
                Single-key shortcuts for blind and visually impaired candidates. Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-[#1749E8]">K</kbd> anytime to hear this list read aloud (no popups).
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-300 dark:border-emerald-700 self-start sm:self-auto">
            ● Always Active (Zero Mouse Required)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 text-xs">
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center gap-1">
            <kbd className="w-8 h-8 rounded-lg bg-[#1749E8] text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
              L
            </kbd>
            <span className="font-bold text-[#172033] dark:text-white">Email</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Focuses field</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center gap-1">
            <kbd className="w-8 h-8 rounded-lg bg-[#1749E8] text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
              P
            </kbd>
            <span className="font-bold text-[#172033] dark:text-white">Password</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Focuses field</span>
          </div>

          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 flex flex-col items-center text-center gap-1">
            <kbd className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
              C
            </kbd>
            <span className="font-bold text-emerald-800 dark:text-emerald-300">Auto CAPTCHA</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Auto-writes code</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center gap-1">
            <kbd className="w-8 h-8 rounded-lg bg-[#1749E8] text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
              S
            </kbd>
            <span className="font-bold text-[#172033] dark:text-white">Submit</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Review &amp; sign in</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center gap-1">
            <kbd className="w-8 h-8 rounded-lg bg-[#1749E8] text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
              R
            </kbd>
            <span className="font-bold text-[#172033] dark:text-white">Play Audio</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Hear CAPTCHA</span>
          </div>

          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700 flex flex-col items-center text-center gap-1">
            <kbd className="w-8 h-8 rounded-lg bg-[#1749E8] text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
              F2
            </kbd>
            <span className="font-bold text-[#1749E8] dark:text-blue-300">Re-Read</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Reads active field</span>
          </div>

          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 flex flex-col items-center text-center gap-1">
            <kbd className="w-8 h-8 rounded-lg bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
              Y
            </kbd>
            <span className="font-bold text-emerald-800 dark:text-emerald-300">Confirm</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Confirms input</span>
          </div>

          <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-700 flex flex-col items-center text-center gap-1">
            <kbd className="w-8 h-8 rounded-lg bg-red-600 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
              N
            </kbd>
            <span className="font-bold text-red-800 dark:text-red-300">Clear</span>
            <span className="text-[10px] text-red-600 dark:text-red-400">Clears &amp; retries</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center gap-1">
            <kbd className="w-8 h-8 rounded-lg bg-[#1749E8] text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
              K
            </kbd>
            <span className="font-bold text-[#172033] dark:text-white">Read All</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Speaks shortcuts</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center gap-1">
            <kbd className="w-8 h-8 rounded-lg bg-slate-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
              Esc
            </kbd>
            <span className="font-bold text-[#172033] dark:text-white">Stop</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Halts voice</span>
          </div>
        </div>
      </section>
    </div>
  );
}
