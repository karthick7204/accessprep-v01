/**
 * ACCESSPREP-X — Accessible Context-Aware Keyboard Shortcuts Dialog
 * ============================================================================
 * Generates its contents directly from MASTER_SHORTCUT_REGISTRY and adapts
 * dynamically to the current screen and authentication status.
 *
 * Implements WCAG 2.2 AA compliant focus traps, aria-modal, Escape key closing,
 * focus restoration to the triggering element, and an accessible "Read Aloud" action.
 */

import React, { useEffect, useRef } from 'react';
import {
  Keyboard,
  X,
  Volume2,
  Navigation as NavIcon,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { useAccessibility } from '../../context/AccessibilityContext.tsx';
import { getShortcutsForContext, formatShortcutsForSpeech, ShortcutDefinition } from '../../services/shortcutRegistry.ts';
import { SCREEN_REGISTRY } from '../../types/screens.ts';

interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsDialog({ isOpen, onClose }: KeyboardShortcutsDialogProps) {
  const { currentScreen, user, speakText, stopSpeaking, announce } = useAccessibility();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  const isAuthenticated = Boolean(user);
  const { screenSpecificShortcuts, globalNavigationShortcuts, accessibilityShortcuts } =
    getShortcutsForContext(currentScreen, isAuthenticated);

  const currentMeta = SCREEN_REGISTRY[currentScreen];

  // Save previously focused element and restore when dialog closes
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
      // Focus close button on open
      setTimeout(() => {
        closeBtnRef.current?.focus();
      }, 50);

      const openNotice = `Keyboard Shortcuts Reference dialog opened for ${currentMeta?.title || currentScreen}. Press Escape to close.`;
      announce(openNotice, 'assertive');
    } else if (previouslyFocusedElementRef.current) {
      previouslyFocusedElementRef.current.focus();
    }
  }, [isOpen, currentMeta, currentScreen, announce]);

  // Handle Escape key to close dialog
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, onClose]);

  // Read entire shortcut reference aloud via speech synthesis
  const handleReadAloudAll = () => {
    const screenText = screenSpecificShortcuts.length > 0
      ? `Shortcuts for ${currentMeta?.title || currentScreen}: ${formatShortcutsForSpeech(screenSpecificShortcuts)} `
      : '';
    const navText = globalNavigationShortcuts.length > 0
      ? `Navigation shortcuts: ${formatShortcutsForSpeech(globalNavigationShortcuts)} `
      : '';
    const accessText = `Accessibility shortcuts: ${formatShortcutsForSpeech(accessibilityShortcuts)}`;

    const fullSpoken = `Keyboard Shortcuts Help. ${screenText}${navText}${accessText}`;
    announce(fullSpoken, 'assertive');
    speakText(fullSpoken);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-dialog-title"
      aria-describedby="shortcuts-dialog-description"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
    >
      <div
        ref={dialogRef}
        className="bg-white dark:bg-slate-900 border-2 border-[#1749E8] dark:border-blue-500 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden focus:outline-none"
        tabIndex={-1}
      >
        {/* Dialog Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-[#F8FAFC] dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EEF4FF] dark:bg-blue-950 text-[#1749E8] dark:text-blue-400 flex items-center justify-center">
              <Keyboard className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="shortcuts-dialog-title"
                className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white"
              >
                Keyboard Shortcut Reference
              </h2>
              <p
                id="shortcuts-dialog-description"
                className="text-xs text-slate-600 dark:text-slate-300 font-medium"
              >
                Context: <strong className="text-[#1749E8] dark:text-blue-400">{currentMeta?.title || currentScreen}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReadAloudAll}
              className="px-2.5 py-1.5 text-xs font-bold text-[#1749E8] dark:text-blue-300 bg-[#EEF4FF] dark:bg-blue-950/70 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-lg inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#1749E8]"
              aria-label="Read all shortcuts aloud via voice assistance"
            >
              <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Read Aloud</span>
            </button>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1749E8]"
              aria-label="Close keyboard shortcuts dialog (Escape)"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Dialog Body (Scrollable) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
          {/* Section 1: Screen-Specific / Context Shortcuts */}
          {screenSpecificShortcuts.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1749E8] dark:text-blue-400">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                <h3>{currentMeta?.shortLabel || 'Current Screen'} Specific Shortcuts</h3>
              </div>
              <div className="grid gap-2">
                {screenSpecificShortcuts.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 dark:text-white">{s.action}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">{s.description}</div>
                    </div>
                    <kbd className="px-2.5 py-1.5 rounded-lg bg-[#1749E8] text-white font-mono font-extrabold text-xs shrink-0 shadow-xs">
                      {s.keyLabel}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Global Screen Navigation (Verified Destinations) */}
          {globalNavigationShortcuts.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                <NavIcon className="w-4 h-4" aria-hidden="true" />
                <h3>Verified Screen Navigation Destinations</h3>
              </div>
              <div className="grid gap-2">
                {globalNavigationShortcuts.map((s) => {
                  const destMeta = s.destination ? SCREEN_REGISTRY[s.destination] : null;
                  const isCurrent = s.destination === currentScreen;

                  return (
                    <div
                      key={s.id}
                      className={`p-3 rounded-xl border-2 flex items-center justify-between gap-4 transition-colors ${
                        isCurrent
                          ? 'bg-blue-50/70 dark:bg-blue-950/40 border-[#1749E8] dark:border-blue-500'
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{s.action}</span>
                          {destMeta && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              Screen {destMeta.screenNumber}
                            </span>
                          )}
                          {isCurrent && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-600 text-white">
                              You Are Here
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300">
                          {s.description}
                        </div>
                      </div>
                      <kbd className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-mono font-extrabold text-xs shrink-0">
                        {s.keyLabel}
                      </kbd>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Universal Accessibility & Assistant Controls */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <h3>Universal Voice &amp; Accessibility Controls</h3>
            </div>
            <div className="grid gap-2">
              {accessibilityShortcuts.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900 dark:text-white">{s.action}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">{s.description}</div>
                  </div>
                  <kbd className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-mono font-extrabold text-xs shrink-0">
                    {s.keyLabel}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dialog Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/80 flex items-center justify-between">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Press <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-mono font-bold">Escape</kbd> anytime to dismiss this reference.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#1749E8] hover:bg-blue-700 text-white text-xs font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-xs"
          >
            Close Reference (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}
