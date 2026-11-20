import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAccessibility } from '../context/AccessibilityContext.tsx';
import { getPageHelp, PageHelpRecord } from '../data/pageHelpRegistry.ts';
import {
  HelpCircle,
  Mic,
  Keyboard,
  RotateCcw,
  X,
  Volume2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export function PageEntryHelpBanner() {
  const {
    currentScreen,
    speakText,
    stopSpeaking,
    isSpeaking,
    announce
  } = useAccessibility();

  const [mode, setMode] = useState<'prompt' | 'voice' | 'keyboard' | 'dismissed'>('prompt');
  const [minimized, setMinimized] = useState(false);
  const lastScreenRef = useRef<string>('');
  const helpRecordRef = useRef<PageHelpRecord>(getPageHelp(currentScreen));
  const activeSpeechRef = useRef<string>('');

  const record = getPageHelp(currentScreen);
  helpRecordRef.current = record;

  // Speak and announce handler
  const playSpokenHelp = useCallback((text: string, politeMsg: string) => {
    activeSpeechRef.current = text;
    announce(politeMsg, 'polite');
    speakText(text);
  }, [announce, speakText]);

  // Handle user selecting Voice Help
  const handleShowVoiceHelp = useCallback(() => {
    setMode('voice');
    setMinimized(false);
    const rec = helpRecordRef.current;
    playSpokenHelp(
      `${rec.spokenVoiceHelp} Press R to replay, press K for keyboard shortcuts, or press S to continue.`,
      `Reading voice commands for ${rec.title}`
    );
  }, [playSpokenHelp]);

  // Handle user selecting Keyboard Shortcuts Help
  const handleShowKeyboardHelp = useCallback(() => {
    setMode('keyboard');
    setMinimized(false);
    const rec = helpRecordRef.current;
    playSpokenHelp(
      `${rec.spokenKeyboardHelp} Press R to replay, press V for voice commands, or press S to continue.`,
      `Reading keyboard shortcuts for ${rec.title}`
    );
  }, [playSpokenHelp]);

  // Handle Replaying active speech
  const handleReplay = useCallback(() => {
    const rec = helpRecordRef.current;
    if (mode === 'voice') {
      playSpokenHelp(rec.spokenVoiceHelp, `Replaying voice commands for ${rec.title}`);
    } else if (mode === 'keyboard') {
      playSpokenHelp(rec.spokenKeyboardHelp, `Replaying keyboard shortcuts for ${rec.title}`);
    } else {
      playSpokenHelp(rec.introPrompt, `Replaying page introduction for ${rec.title}`);
    }
  }, [mode, playSpokenHelp]);

  // Handle Dismiss / Skip
  const handleDismiss = useCallback(() => {
    stopSpeaking();
    setMode('dismissed');
    announce('Page help dismissed. You can press V for voice help or K for shortcut help at any time.', 'polite');
  }, [stopSpeaking, announce]);

  // Screen entrance trigger
  useEffect(() => {
    if (lastScreenRef.current !== currentScreen) {
      lastScreenRef.current = currentScreen;
      const newRecord = getPageHelp(currentScreen);
      helpRecordRef.current = newRecord;
      setMode('prompt');
      setMinimized(false);

      // Short pause so screen transition settles, then ask user for Voice or Shortcuts
      const timer = setTimeout(() => {
        playSpokenHelp(newRecord.introPrompt, `Navigated to ${newRecord.title}`);
      }, 350);

      return () => clearTimeout(timer);
    }
  }, [currentScreen, playSpokenHelp]);

  // Listen for global custom event requesting inline keyboard shortcuts display
  useEffect(() => {
    const handleShowKeyboardEvent = () => {
      setMode('keyboard');
      setMinimized(false);
      const heading = document.getElementById('page-help-banner-heading');
      if (heading) {
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    window.addEventListener('accessprep:show-inline-keyboard-help', handleShowKeyboardEvent);
    return () => window.removeEventListener('accessprep:show-inline-keyboard-help', handleShowKeyboardEvent);
  }, []);

  // Global keydown listeners for V, K, R, S when not typing in form inputs
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isInput) return;

      const key = e.key.toLowerCase();

      // V: Open voice help
      if (key === 'v' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleShowVoiceHelp();
        return;
      }

      // K: Open keyboard help
      if (key === 'k' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleShowKeyboardHelp();
        return;
      }

      // R: Replay current speech
      if (key === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey && mode !== 'dismissed') {
        e.preventDefault();
        handleReplay();
        return;
      }

      // S: Skip / Dismiss
      if (key === 's' && !e.ctrlKey && !e.metaKey && !e.altKey && mode !== 'dismissed') {
        e.preventDefault();
        handleDismiss();
        return;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleShowVoiceHelp, handleShowKeyboardHelp, handleReplay, handleDismiss, mode]);

  // Floating helper button when dismissed so candidate can always reopen
  if (mode === 'dismissed') {
    return (
      <aside aria-label="Page Accessibility Help Bar" className="mb-3 flex items-center justify-end">
        <button
          type="button"
          onClick={() => {
            setMode('prompt');
            handleReplay();
          }}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-[#1749E8] bg-[#EEF4FF] hover:bg-blue-100 border border-[#D0DEFF] rounded-lg shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors"
          title="Press V for Voice commands, K for Keyboard shortcuts"
          aria-label={`Open Help & Shortcuts for ${record.title}. Press V for Voice commands or K for Keyboard shortcuts.`}
        >
          <HelpCircle className="w-4 h-4 text-[#1749E8]" aria-hidden="true" />
          <span>Page Help: Press <kbd className="px-1 py-0.5 bg-white border border-blue-200 rounded font-mono text-[10px]">V</kbd> (Voice) or <kbd className="px-1 py-0.5 bg-white border border-blue-200 rounded font-mono text-[10px]">K</kbd> (Shortcuts)</span>
        </button>
      </aside>
    );
  }

  return (
    <section
      aria-labelledby="page-help-banner-heading"
      className="bg-white border-2 border-[#1749E8]/30 rounded-xl p-4 sm:p-5 shadow-sm mb-6 transition-all"
    >
      {/* Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#EEF4FF] border border-[#D0DEFF] flex items-center justify-center text-[#1749E8] shrink-0">
            {mode === 'voice' ? (
              <Mic className="w-5 h-5" aria-hidden="true" />
            ) : mode === 'keyboard' ? (
              <Keyboard className="w-5 h-5" aria-hidden="true" />
            ) : (
              <HelpCircle className="w-5 h-5" aria-hidden="true" />
            )}
          </div>
          <div>
            <h2
              id="page-help-banner-heading"
              className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2"
            >
              <span>{record.title} · Accessibility &amp; Shortcuts Guide</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-50 text-[#1749E8] border border-blue-200">
                WCAG AAA
              </span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {mode === 'prompt' && 'Would you like assistance with Voice Commands or Keyboard Shortcuts for this screen?'}
              {mode === 'voice' && 'Active Voice Commands for this screen. Spoken out loud.'}
              {mode === 'keyboard' && 'Universal Keyboard Shortcuts for every button and feature on this screen.'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {mode !== 'voice' && (
            <button
              type="button"
              onClick={handleShowVoiceHelp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#1749E8] hover:bg-blue-700 rounded-lg shadow-2xs focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-600 transition-colors"
              aria-label="Describe all Voice Commands. Or press V"
            >
              <Mic className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Voice Commands</span>
              <kbd className="px-1 py-0.2 bg-blue-900/40 rounded text-[10px] font-mono">V</kbd>
            </button>
          )}

          {mode !== 'keyboard' && (
            <button
              type="button"
              onClick={handleShowKeyboardHelp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#172033] bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-2xs focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-500 transition-colors"
              aria-label="Describe all Keyboard Shortcuts. Or press K"
            >
              <Keyboard className="w-3.5 h-3.5 text-slate-700" aria-hidden="true" />
              <span>Keyboard Shortcuts</span>
              <kbd className="px-1 py-0.2 bg-slate-200 border border-slate-300 rounded text-[10px] font-mono">K</kbd>
            </button>
          )}

          <button
            type="button"
            onClick={handleReplay}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            title="Replay Spoken Audio (Press R)"
            aria-label="Replay Audio Guide (Press R)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
            <span>Replay</span>
            <kbd className="px-1 py-0.2 bg-slate-100 rounded text-[10px] font-mono text-slate-500">R</kbd>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
            title="Skip and dismiss help (Press S or Escape)"
            aria-label="Skip and dismiss help"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Skip</span>
            <kbd className="px-1 py-0.2 bg-slate-100 rounded text-[10px] font-mono text-slate-500">S</kbd>
          </button>
        </div>
      </div>

      {/* Voice Commands Detail View */}
      {mode === 'voice' && !minimized && (
        <div className="pt-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {record.voiceCommands.map((v, i) => (
              <div
                key={i}
                className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200/80 flex items-start gap-2.5 text-xs"
              >
                <div className="p-1 rounded bg-blue-100 text-[#1749E8] shrink-0 mt-0.5">
                  <Mic className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 font-mono">
                    "{v.command}"
                  </div>
                  <div className="text-slate-600 mt-0.5">{v.description}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs text-slate-500">
            <span>🎙️ Speak commands directly into microphone or say "Hey Vision" at any time.</span>
            <button
              type="button"
              onClick={handleDismiss}
              className="font-bold text-[#1749E8] hover:underline"
            >
              Continue to Page (Press S)
            </button>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Detail View */}
      {mode === 'keyboard' && !minimized && (
        <div className="pt-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {record.keyboardShortcuts.map((k, i) => (
              <div
                key={i}
                className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
              >
                <span className="text-slate-700 font-medium">{k.actionDescription}</span>
                <kbd className="px-2 py-1 bg-white border-2 border-slate-300 rounded font-mono font-bold text-slate-900 shadow-2xs shrink-0 text-[11px]">
                  {k.label}
                </kbd>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs text-slate-500">
            <span>⌨️ Universal shortcuts work from any screen without requiring mouse navigation.</span>
            <button
              type="button"
              onClick={handleDismiss}
              className="font-bold text-[#1749E8] hover:underline"
            >
              Continue to Page (Press S)
            </button>
          </div>
        </div>
      )}

      {/* Prompt Mode Guidance Bar */}
      {mode === 'prompt' && (
        <div className="pt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200">
          <span className="flex items-center gap-1.5 font-medium">
            <Volume2 className="w-4 h-4 text-[#1749E8]" aria-hidden="true" />
            <span>Spoken Prompt: Press <strong className="text-slate-900">V</strong> for Voice Commands, press <strong className="text-slate-900">K</strong> for Keyboard Shortcuts, or press <strong className="text-slate-900">S</strong> to skip.</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleShowVoiceHelp}
              className="font-bold text-[#1749E8] hover:underline"
            >
              Play Voice Guide (V)
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={handleShowKeyboardHelp}
              className="font-bold text-slate-800 hover:underline"
            >
              Play Shortcut Guide (K)
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
