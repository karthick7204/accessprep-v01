/**
 * ACCESSPREP-X — Initial Accessibility Mode Selection Modal
 * ============================================================================
 * Mandatory first-time onboarding modal ensuring candidates explicitly choose
 * their preferred interaction paradigm before any automatic reading, speech
 * synthesis, or microphone activation occurs.
 *
 * 3 Supported Interaction Modes:
 *   1. Voice Assistance Mode (Vision Mode)
 *   2. Keyboard Shortcut Mode
 *   3. Independent Manual Mode
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  Keyboard,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Headphones
} from 'lucide-react';
import type { AccessibilityInteractionMode } from '../../context/AccessibilityContext.tsx';

interface AccessibilityModeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: AccessibilityInteractionMode, remember: boolean) => void;
  speakText?: (text: string, onEnd?: () => void) => void;
  stopSpeaking?: () => void;
  announce?: (message: string, priority?: 'polite' | 'assertive') => void;
}

export function AccessibilityModeSelectorModal({
  isOpen,
  onClose,
  onSelectMode,
  speakText: propSpeakText,
  stopSpeaking: propStopSpeaking,
  announce: propAnnounce
}: AccessibilityModeSelectorModalProps) {
  const speakText = useCallback((text: string, onEnd?: () => void) => {
    if (propSpeakText) propSpeakText(text, onEnd);
  }, [propSpeakText]);

  const stopSpeaking = useCallback(() => {
    if (propStopSpeaking) propStopSpeaking();
  }, [propStopSpeaking]);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (propAnnounce) propAnnounce(message, priority);
  }, [propAnnounce]);

  const [selectedPendingMode, setSelectedPendingMode] = useState<AccessibilityInteractionMode | null>(null);
  const [rememberPreference, setRememberPreference] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);

  // Focus trap refs
  const modalRef = useRef<HTMLDivElement | null>(null);
  const voiceBtnRef = useRef<HTMLButtonElement | null>(null);
  const confirmYesBtnRef = useRef<HTMLButtonElement | null>(null);

  // Initial greeting announcement when modal opens
  useEffect(() => {
    if (isOpen) {
      const welcomeMsg =
        'Welcome to ACCESSPREP-X, your accessible examination preparation platform. How would you like to use the application today? Option 1, Voice Assistance Mode. Option 2, Keyboard Shortcut Mode. Option 3, Independent Manual Mode.';
      announce(welcomeMsg, 'assertive');

      // Focus first option after mount
      setTimeout(() => {
        voiceBtnRef.current?.focus();
      }, 100);
    }
  }, [isOpen, announce]);

  const handleModeChoice = (mode: AccessibilityInteractionMode) => {
    setSelectedPendingMode(mode);
    setIsConfirming(true);

    let modeName = 'Voice Assistance Mode';
    let question = 'Would you like me to guide you through the application?';
    if (mode === 'keyboard') {
      modeName = 'Keyboard Shortcut Mode';
      question = 'I will provide keyboard shortcuts to navigate the application.';
    } else if (mode === 'manual') {
      modeName = 'Independent Manual Mode';
      question = 'The application will operate silently with standard keyboard and screen reader controls.';
    }

    const confirmPrompt = `You selected ${modeName}. ${question} Press Enter or activate Yes to confirm, or No to choose another mode.`;
    announce(confirmPrompt, 'assertive');

    setTimeout(() => {
      confirmYesBtnRef.current?.focus();
    }, 100);
  };

  const handleConfirmYes = () => {
    if (!selectedPendingMode) return;
    onSelectMode(selectedPendingMode, rememberPreference);
    setIsConfirming(false);
    onClose();
  };

  const handleConfirmNo = () => {
    setIsConfirming(false);
    setSelectedPendingMode(null);
    announce('Mode selection cancelled. Please choose an interaction mode.', 'polite');
    setTimeout(() => {
      voiceBtnRef.current?.focus();
    }, 50);
  };

  // Keyboard navigation within modal
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isConfirming) {
          handleConfirmNo();
        } else {
          // Default to manual mode if user dismisses with Escape
          onSelectMode('manual', false);
          onClose();
        }
        return;
      }

      // Quick digit shortcuts: '1' for Voice, '2' for Keyboard, '3' for Manual
      if (!isConfirming) {
        if (e.key === '1') {
          e.preventDefault();
          handleModeChoice('voice');
        } else if (e.key === '2') {
          e.preventDefault();
          handleModeChoice('keyboard');
        } else if (e.key === '3') {
          e.preventDefault();
          handleModeChoice('manual');
        }
      } else {
        if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          handleConfirmYes();
        } else if (e.key.toLowerCase() === 'n') {
          e.preventDefault();
          handleConfirmNo();
        }
      }
    },
    [isConfirming, onSelectMode, onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mode-modal-title"
      aria-describedby="mode-modal-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
      onKeyDown={handleKeyDown}
      ref={modalRef}
    >
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border-4 border-[#1749E8] dark:border-blue-500 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 overflow-hidden">
        {/* Header */}
        <div className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1749E8] dark:text-blue-400">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>ACCESSPREP-X Accessibility Onboarding</span>
          </div>
          <h2
            id="mode-modal-title"
            className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white"
          >
            How would you like to use the application today?
          </h2>
          <p id="mode-modal-desc" className="text-sm text-slate-600 dark:text-slate-300">
            We adapt to your preferred way of learning. Choose an interaction mode below:
          </p>
        </div>

        {/* Step 1: Mode Selection Cards */}
        {!isConfirming ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3.5">
              {/* Option 1: Voice Assistance Mode */}
              <button
                ref={voiceBtnRef}
                type="button"
                onClick={() => handleModeChoice('voice')}
                className="w-full p-4 text-left rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-blue-50/40 dark:bg-slate-800/60 hover:border-[#1749E8] dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all focus:outline-none focus:ring-4 focus:ring-[#1749E8] focus:border-[#1749E8] group"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#1749E8] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Headphones className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-slate-900 dark:text-white text-base">
                        Option 1: Voice Assistance (Vision Mode)
                      </span>
                      <kbd className="px-2 py-0.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300">
                        Press 1 or Alt+V
                      </kbd>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      Say your commands, and I will guide you through the application. I can read page content, explain available options, navigate sections, and help you complete forms step by step.
                    </p>
                  </div>
                </div>
              </button>

              {/* Option 2: Keyboard Shortcut Mode */}
              <button
                type="button"
                onClick={() => handleModeChoice('keyboard')}
                className="w-full p-4 text-left rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-emerald-50/30 dark:bg-slate-800/60 hover:border-emerald-600 dark:hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-all focus:outline-none focus:ring-4 focus:ring-emerald-600 focus:border-emerald-600 group"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Keyboard className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-slate-900 dark:text-white text-base">
                        Option 2: Keyboard Shortcut Mode
                      </span>
                      <kbd className="px-2 py-0.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300">
                        Press 2 or Alt+K
                      </kbd>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      Use concise keyboard shortcuts to navigate the entire application. Visible focus indicators are amplified, and accessible shortcut help is available at any time.
                    </p>
                  </div>
                </div>
              </button>

              {/* Option 3: Independent Manual Mode */}
              <button
                type="button"
                onClick={() => handleModeChoice('manual')}
                className="w-full p-4 text-left rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-purple-50/30 dark:bg-slate-800/60 hover:border-purple-600 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-slate-800 transition-all focus:outline-none focus:ring-4 focus:ring-purple-600 focus:border-purple-600 group"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <EyeOff className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-slate-900 dark:text-white text-base">
                        Option 3: Independent Manual Mode
                      </span>
                      <kbd className="px-2 py-0.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300">
                        Press 3 or Alt+M
                      </kbd>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      Navigate and operate independently using your preferred keyboard and screen reader (NVDA, JAWS, Narrator). No automatic reading or speech interruptions.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Remember my preference checkbox */}
            <div className="flex items-center gap-2 pt-2">
              <input
                id="remember-mode-preference"
                type="checkbox"
                checked={rememberPreference}
                onChange={(e) => setRememberPreference(e.target.checked)}
                className="w-4 h-4 rounded text-[#1749E8] focus:ring-2 focus:ring-[#1749E8] border-slate-300"
              />
              <label
                htmlFor="remember-mode-preference"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Remember my preferred accessibility mode for future sessions (you can change it anytime)
              </label>
            </div>
          </div>
        ) : (
          /* Step 2: Confirmation Dialog */
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-300 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-base">
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              <span>Confirm Your Mode Selection</span>
            </div>

            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
              {selectedPendingMode === 'voice' && (
                <>
                  You selected <strong>Voice Assistance (Vision Mode)</strong>. Would you like me to guide you through the application with spoken announcements and voice commands?
                </>
              )}
              {selectedPendingMode === 'keyboard' && (
                <>
                  You selected <strong>Keyboard Shortcut Mode</strong>. The application will enable high-contrast focus rings and keyboard shortcuts (such as Alt+E for Email, Alt+P for Password).
                </>
              )}
              {selectedPendingMode === 'manual' && (
                <>
                  You selected <strong>Independent Manual Mode</strong>. The application will operate silently without automatic speech synthesis, preserving clean screen-reader output.
                </>
              )}
            </p>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleConfirmNo}
                className="px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                No, Choose Another Mode (Press N)
              </button>
              <button
                ref={confirmYesBtnRef}
                type="button"
                onClick={handleConfirmYes}
                className="px-5 py-2 min-h-[44px] rounded-xl text-xs font-bold text-white bg-[#1749E8] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 inline-flex items-center gap-1.5 shadow-md"
              >
                <span>Yes, Activate Mode (Press Y / Enter)</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
