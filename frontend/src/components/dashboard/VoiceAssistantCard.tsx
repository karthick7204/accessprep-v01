import React from 'react';
import { Mic, Square, Sparkles, Volume2 } from 'lucide-react';
import {
  useAccessibility,
  VOICE_STATE_UI_MESSAGES
} from '../../context/AccessibilityContext.tsx';

interface VoiceAssistantCardProps {
  onNavigate: (screen: string) => void;
}

export function VoiceAssistantCard({ onNavigate }: VoiceAssistantCardProps) {
  const {
    isVoiceListening,
    isVisionAssistantActive,
    voiceAssistantState,
    capturedVoiceText,
    activateVisionAssistant,
    stopVoiceListening,
    stopSpeaking,
    isSpeaking,
    announce
  } = useAccessibility();

  const handleToggleVoice = () => {
    if (isSpeaking) {
      stopSpeaking();
      announce('Reading stopped.', 'polite');
      return;
    }

    if (voiceAssistantState === 'LISTENING' || voiceAssistantState === 'WAKE_DETECTED') {
      stopVoiceListening();
    } else {
      activateVisionAssistant();
    }
  };

  return (
    <section
      aria-labelledby="voice-assistant-heading"
      className="bg-white border border-[#E8EBF0] rounded-xl p-5 shadow-2xs"
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Text description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#1749E8] bg-[#EEF4FF] px-2.5 py-0.5 rounded-full border border-[#D0DEFF]">
              <Sparkles className="w-3 h-3" aria-hidden="true" />
              Hands-Free Assistant
            </span>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                voiceAssistantState === 'LISTENING' || voiceAssistantState === 'WAKE_DETECTED'
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : voiceAssistantState === 'PROCESSING'
                  ? 'text-amber-800 bg-amber-50 border-amber-200'
                  : voiceAssistantState === 'SPEAKING'
                  ? 'text-blue-700 bg-blue-50 border-blue-200'
                  : voiceAssistantState === 'ERROR'
                  ? 'text-rose-700 bg-rose-50 border-rose-200'
                  : 'text-slate-700 bg-slate-100 border-slate-200'
              }`}
            >
              {(voiceAssistantState === 'LISTENING' || voiceAssistantState === 'WAKE_DETECTED') && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
              )}
              {voiceAssistantState === 'SPEAKING' && (
                <Volume2 className="w-3 h-3 text-blue-600 animate-pulse" aria-hidden="true" />
              )}
              <span>{VOICE_STATE_UI_MESSAGES[voiceAssistantState]}</span>
            </span>
          </div>

          <h2 id="voice-assistant-heading" className="text-base font-bold text-[#172033]">
            What would you like to do today?
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Say <strong className="text-[#1749E8]">&ldquo;Hey Vision&rdquo;</strong> to wake the assistant, then speak commands naturally like <strong className="text-[#1749E8]">&ldquo;Open dashboard&rdquo;</strong>, <strong className="text-[#1749E8]">&ldquo;Show my results&rdquo;</strong>, or <strong className="text-[#1749E8]">&ldquo;Start my pilot demo&rdquo;</strong>. Commands run automatically when you finish speaking.
          </p>
          {capturedVoiceText && (
            <p className="mt-2 text-xs font-semibold text-[#172033] bg-[#EEF4FF] border border-[#D0DEFF] px-3 py-1.5 rounded-lg">
              Live Recognized Speech: <span className="text-[#1749E8]">&ldquo;{capturedVoiceText}&rdquo;</span>
            </p>
          )}
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          {isSpeaking ? (
            <button
              type="button"
              onClick={stopSpeaking}
              aria-label="Stop reading speech"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <Square className="w-3.5 h-3.5 fill-red-600 text-red-600" aria-hidden="true" />
              Stop Reading (Esc)
            </button>
          ) : (
            <button
              type="button"
              onClick={handleToggleVoice}
              aria-label={
                voiceAssistantState === 'LISTENING' || voiceAssistantState === 'WAKE_DETECTED'
                  ? 'Stop Listening (Deactivate Voice Assistant)'
                  : 'Activate Vision Voice Assistant (Alt+Space)'
              }
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                voiceAssistantState === 'LISTENING' || voiceAssistantState === 'WAKE_DETECTED'
                  ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                  : 'bg-[#1749E8] text-white hover:bg-[#123BB8] focus:ring-[#1749E8]'
              }`}
            >
              <Mic
                className={`w-3.5 h-3.5 ${
                  voiceAssistantState === 'LISTENING' || voiceAssistantState === 'WAKE_DETECTED' ? 'animate-pulse' : ''
                }`}
                aria-hidden="true"
              />
              {voiceAssistantState === 'LISTENING' || voiceAssistantState === 'WAKE_DETECTED'
                ? 'Stop Listening'
                : 'Activate Assistant (Alt+Space)'}
            </button>
          )}
        </div>
      </div>

      {/* Voice command hints list */}
      <div className="mt-4 pt-4 border-t border-[#E8EBF0]">
        <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-2">
          Recognized Voice Commands
        </p>
        <ul className="flex flex-wrap gap-2" aria-label="Available voice commands">
          {[
            'Hey Vision',
            'Start Practice',
            'Mock Exam',
            'AI Tutor',
            'Tuition Planner',
            'My Progress',
            'Read Dashboard',
            'Stop'
          ].map((cmd) => (
            <li key={cmd}>
              <span className="inline-block px-2.5 py-1 text-xs font-semibold text-[#172033] bg-[#F8F9FB] border border-[#E8EBF0] rounded-md">
                &ldquo;{cmd}&rdquo;
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
