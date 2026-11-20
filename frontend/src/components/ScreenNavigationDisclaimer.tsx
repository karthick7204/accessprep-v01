import React from 'react';
import { Info, Volume2, ArrowRight, Keyboard, Mic, Compass } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext.tsx';
import { ScreenId, SCREEN_REGISTRY } from '../types/screens.ts';

export interface ActionItem {
  label: string;
  opens: string;
  shortcut?: string;
  voiceCommand?: string;
}

export interface ScreenNavigationDisclaimerProps {
  screenId: ScreenId | Uppercase<ScreenId>;
  screenTitle?: string;
  description?: string;
  actions: ActionItem[];
  tips?: string[];
}

export function ScreenNavigationDisclaimer({
  screenId,
  screenTitle,
  description,
  actions,
  tips
}: ScreenNavigationDisclaimerProps) {
  const { speakText, announce, stopSpeaking, isSpeaking } = useAccessibility();

  const normalizedScreenId = screenId.toLowerCase() as ScreenId;
  const title = screenTitle || SCREEN_REGISTRY[normalizedScreenId]?.title || normalizedScreenId.replace(/_/g, ' ');
  const desc = description || SCREEN_REGISTRY[normalizedScreenId]?.description || 'Accessible SSC MTS portal screen.';

  const handleReadAloud = () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    const actionPhrases = actions
      .map(
        (a, i) =>
          `Action ${i + 1}: Click or say "${a.label}" ${
            a.shortcut ? `or press ${a.shortcut}` : ''
          }. This will open or perform: ${a.opens}.`
      )
      .join(' ');

    const fullGuide = `Screen Navigation Guide for ${title}. ${desc}. Here is what you can click and what will open: ${actionPhrases}. Remember, you can say "Stop" or press Escape on any screen to stop speech immediately.`;

    announce(`Reading navigation actions for ${title}`, 'polite');
    speakText(fullGuide);
  };

  return (
    <section
      aria-labelledby={`disclaimer-heading-${screenId}`}
      className="bg-white border-2 border-[#1749E8]/20 rounded-xl p-4 sm:p-5 shadow-2xs space-y-3 mb-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8EBF0]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#EEF4FF] border border-[#D0DEFF] flex items-center justify-center text-[#1749E8] shrink-0">
            <Compass className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h2
              id={`disclaimer-heading-${screenId}`}
              className="text-sm sm:text-base font-extrabold text-[#172033] flex items-center gap-2"
            >
              <span>Screen Navigation Guide &amp; Clickable Actions</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-50 text-[#1749E8] border border-blue-200">
                Accessible
              </span>
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Review what you can click, what each action opens, and available voice shortcuts.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReadAloud}
          data-action="read-screen-guide"
          aria-label={`Read aloud navigation guide for ${title}`}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#EEF4FF] text-[#1749E8] border border-[#D0DEFF] hover:bg-[#DCE7FF] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1749E8]"
        >
          <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{isSpeaking ? 'Stop Reading (Esc)' : 'Read Guide Aloud'}</span>
        </button>
      </div>

      {/* Grid of Clickable Actions & Targets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
        {actions.map((act, idx) => (
          <div
            key={idx}
            className="p-3 bg-[#F8F9FB] rounded-lg border border-[#E8EBF0] flex flex-col justify-between gap-1 text-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-bold text-[#172033] flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-[#1749E8] text-[10px] font-black flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                {act.label}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {act.voiceCommand && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                    <Mic className="w-2.5 h-2.5" />
                    &ldquo;{act.voiceCommand}&rdquo;
                  </span>
                )}
                {act.shortcut && (
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white text-[#53627A] border border-[#D9E1EF] rounded shadow-2xs">
                    {act.shortcut}
                  </kbd>
                )}
              </div>
            </div>

            <p className="text-[#53627A] text-[11px] flex items-center gap-1.5 mt-1">
              <ArrowRight className="w-3 h-3 text-[#1749E8] shrink-0" aria-hidden="true" />
              <span>
                <strong>Opens:</strong> {act.opens}
              </span>
            </p>
          </div>
        ))}
      </div>

      {/* Universal safety note */}
      <div className="text-[11px] text-[#64748B] pt-1 flex items-center justify-between">
        <span>
          💡 <em>Tip: On any screen, say <strong>"Stop"</strong> or press <strong>Escape</strong> to immediately halt audio speech.</em>
        </span>
        <span className="text-[10px] font-medium text-[#1749E8]">Alt+Space opens Vision Assistant</span>
      </div>
    </section>
  );
}
