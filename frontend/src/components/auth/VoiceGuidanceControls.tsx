import React from 'react';
import { Mic, Volume2, Square, Keyboard, Radio } from 'lucide-react';

interface VoiceGuidanceControlsProps {
  mode: 'login' | 'register';
  isVoiceWorkflowActive: boolean;
  currentStepLabel?: string;
  isSpeaking: boolean;
  isListening: boolean;
  onStartVoiceWorkflow: () => void;
  onReadGuide: () => void;
  onStopSpeaking: () => void;
  onSwitchToKeyboard: () => void;
}

export function VoiceGuidanceControls({
  mode,
  isVoiceWorkflowActive,
  currentStepLabel,
  isSpeaking,
  isListening,
  onStartVoiceWorkflow,
  onReadGuide,
  onStopSpeaking,
  onSwitchToKeyboard
}: VoiceGuidanceControlsProps) {
  const startLabel = mode === 'login' ? 'Start Voice Login' : 'Start Voice Registration';
  const guideLabel = mode === 'login' ? 'Read Login Guide' : 'Read Registration Guide';

  return (
    <section
      aria-label={mode === 'login' ? 'Login Voice Accessibility Controls' : 'Registration Voice Accessibility Controls'}
      className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/80 border-2 border-[#D9E1EF] dark:border-slate-700 space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isVoiceWorkflowActive
                ? 'bg-emerald-500 animate-pulse'
                : isListening
                ? 'bg-[#1749E8]'
                : 'bg-slate-400'
            }`}
            aria-hidden="true"
          />
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#172033] dark:text-slate-200">
            Audio-First Voice Assistance
          </span>
        </div>

        {isVoiceWorkflowActive && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EEF4FF] dark:bg-blue-950 text-[#1749E8] dark:text-blue-300 border border-[#D9E1EF]">
            <Radio className="w-3 h-3" aria-hidden="true" />
            <span>Voice Mode Active</span>
          </span>
        )}
      </div>

      {/* 4 Primary Voice Accessibility Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onStartVoiceWorkflow}
          aria-pressed={isVoiceWorkflowActive}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#6241C8] ${
            isVoiceWorkflowActive
              ? 'bg-[#1749E8] text-white border-[#123BB8] shadow-xs'
              : 'bg-[#1749E8] hover:bg-[#123BB8] text-white border-[#1749E8] shadow-xs'
          }`}
        >
          <Mic className={`w-4 h-4 shrink-0 ${isListening ? 'animate-pulse' : ''}`} aria-hidden="true" />
          <span>{startLabel}</span>
        </button>

        <button
          type="button"
          onClick={onReadGuide}
          className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 hover:bg-[#EEF4FF] dark:hover:bg-slate-700 text-[#1749E8] dark:text-blue-300 border-2 border-[#D9E1EF] dark:border-slate-600 inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1749E8]"
        >
          <Volume2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{guideLabel}</span>
        </button>

        <button
          type="button"
          onClick={onStopSpeaking}
          aria-disabled={!isSpeaking}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 ${
            isSpeaking
              ? 'bg-red-600 hover:bg-red-700 text-white border-red-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-slate-700 text-red-700 dark:text-red-300 border-[#D9E1EF] dark:border-slate-600'
          }`}
        >
          <Square className="w-3.5 h-3.5 shrink-0 fill-current" aria-hidden="true" />
          <span>Stop Speaking</span>
        </button>

        <button
          type="button"
          onClick={onSwitchToKeyboard}
          className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#172033] dark:text-slate-200 border-2 border-[#D9E1EF] dark:border-slate-600 inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#6241C8]"
        >
          <Keyboard className="w-4 h-4 shrink-0 text-[#53627A] dark:text-slate-300" aria-hidden="true" />
          <span>Switch to Keyboard</span>
        </button>
      </div>

      {/* Live Voice Step Banner */}
      {isVoiceWorkflowActive && currentStepLabel && (
        <div
          role="status"
          aria-live="polite"
          className="p-3 rounded-xl bg-[#EEF4FF] dark:bg-blue-950/70 border border-[#1749E8]/30 text-xs text-[#172033] dark:text-blue-100 flex items-center justify-between gap-2"
        >
          <div>
            <span className="font-extrabold text-[#1749E8] dark:text-blue-300">Guided Step: </span>
            <span className="font-semibold">{currentStepLabel}</span>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-[#1749E8] dark:text-blue-300 border border-[#D9E1EF]">
            {isSpeaking ? 'Speaking...' : isListening ? 'Listening...' : 'Ready'}
          </span>
        </div>
      )}
    </section>
  );
}
