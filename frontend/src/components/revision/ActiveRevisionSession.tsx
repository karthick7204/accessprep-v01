import React from 'react';
import {
  ArrowLeft,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  HelpCircle,
  ArrowRight,
  Eye,
  AlertCircle
} from 'lucide-react';
import { AccessibleProgressBar } from '../AccessibleProgressBar.tsx';

export interface ActiveSessionCard {
  id: string;
  questionId: string;
  subject: string;
  topic: string;
  questionText: string;
  correctAnswer: string;
  explanation: string;
  intervalDays: number;
  repetition: number;
  easeFactor: number;
}

interface ActiveRevisionSessionProps {
  cards: ActiveSessionCard[];
  currentIndex: number;
  showAnswer: boolean;
  isPaused: boolean;
  onRevealAnswer: () => void;
  onRateCard: (quality: number) => void;
  onTogglePause: () => void;
  onExitSession: () => void;
  onNextCard: () => void;
  onPrevCard: () => void;
  onReadQuestion: () => void;
  onReadExplanation: () => void;
  isBlindMode?: boolean;
}

export function ActiveRevisionSession({
  cards,
  currentIndex,
  showAnswer,
  isPaused,
  onRevealAnswer,
  onRateCard,
  onTogglePause,
  onExitSession,
  onNextCard,
  onPrevCard,
  onReadQuestion,
  onReadExplanation,
  isBlindMode
}: ActiveRevisionSessionProps) {
  const currentCard = cards[currentIndex];
  const total = cards.length;
  const completed = currentIndex;
  const remaining = Math.max(0, total - currentIndex - 1);
  const progressPct = total > 0 ? Math.round((currentIndex / total) * 100) : 0;

  if (!currentCard) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6" role="region" aria-label="Active revision session">
      {/* Session Top Bar */}
      <div className="bg-white border border-[#E8EBF0] rounded-xl p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onExitSession}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#172033] hover:bg-[#F8F9FB] rounded-lg border border-[#E8EBF0] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1749E8]"
              aria-label="Exit revision session and return to overview"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Exit session</span>
            </button>

            <span className="text-xs font-bold text-[#172033]">
              Question {currentIndex + 1} of {total}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePause}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-[#1749E8] ${
                isPaused
                  ? 'bg-amber-50 text-[#D97706] border-amber-300'
                  : 'bg-white text-[#64748B] border-[#E8EBF0] hover:bg-[#F8F9FB]'
              }`}
              aria-label={isPaused ? 'Resume revision session' : 'Pause revision session'}
            >
              {isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Pause</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar & Indicators */}
        <div className="space-y-1.5">
          <AccessibleProgressBar
            value={currentIndex + 1}
            max={total}
            label={`Session progress: ${currentIndex + 1} of ${total}`}
            showValue={false}
            size="sm"
            colorClass="bg-[#1749E8]"
          />
          <div className="flex justify-between text-[11px] text-[#64748B]">
            <span>{completed} completed</span>
            <span>{remaining} remaining</span>
          </div>
        </div>
      </div>

      {/* Paused State Banner */}
      {isPaused ? (
        <div
          role="status"
          aria-live="polite"
          className="bg-white border-2 border-amber-300 rounded-xl p-8 text-center space-y-4 shadow-sm"
        >
          <div className="w-12 h-12 rounded-full bg-amber-50 text-[#D97706] flex items-center justify-center mx-auto border border-amber-200">
            <Pause className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#172033]">Session Paused</h3>
            <p className="text-xs text-[#64748B] max-w-sm mx-auto mt-1">
              Your answered cards and current position are saved. Take a break and resume whenever
              you are ready.
            </p>
          </div>
          <button
            type="button"
            onClick={onTogglePause}
            className="px-6 py-2.5 rounded-lg bg-[#1749E8] text-white text-xs font-semibold hover:bg-[#123BB8] transition-colors inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#1749E8]"
          >
            <Play className="w-4 h-4 fill-current" aria-hidden="true" />
            <span>Resume session</span>
          </button>
        </div>
      ) : (
        /* Active Flashcard */
        <div className="bg-white border border-[#E8EBF0] rounded-xl shadow-sm p-6 sm:p-8 space-y-6">
          {/* Card Metadata & Audio Prompt */}
          <div className="flex items-center justify-between border-b border-[#E8EBF0] pb-4 gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F0F4FF] text-[#1749E8] border border-[#D0DEFF]">
                {currentCard.subject}
              </span>
              <span className="text-xs text-[#64748B] font-medium">
                Topic: <strong className="text-[#172033]">{currentCard.topic}</strong>
              </span>
            </div>

            <button
              type="button"
              data-action="repeat-question"
              onClick={onReadQuestion}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#1749E8] bg-[#EEF4FF] hover:bg-blue-100 border border-blue-200 rounded-lg shadow-2xs transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#1749E8]"
              aria-label="Repeat flashcard question aloud (Keyboard shortcut: Alt+R)"
              title="Repeat question aloud (Alt+R)"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Repeat Question (Alt+R)</span>
            </button>
          </div>

          {/* Question Text */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Question Prompt
            </span>
            <p className="text-lg sm:text-xl font-bold text-[#172033] leading-relaxed">
              {currentCard.questionText}
            </p>
          </div>

          {/* State 1: Answer is Initially Hidden */}
          {!showAnswer ? (
            <div className="pt-6 border-t border-[#E8EBF0] text-center space-y-4">
              <div className="p-4 bg-[#F8F9FB] border border-dashed border-[#E8EBF0] rounded-xl max-w-md mx-auto">
                <HelpCircle className="w-6 h-6 text-[#64748B] mx-auto mb-2" aria-hidden="true" />
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Try to recall the solution mentally or speak it aloud before revealing. Active recall strengthens neural pathways.
                </p>
              </div>

              <div>
                <button
                  type="button"
                  autoFocus
                  onClick={onRevealAnswer}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-[#1749E8] text-white text-sm font-semibold hover:bg-[#123BB8] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1749E8] focus:ring-offset-2"
                  aria-label="Reveal answer and explanation"
                >
                  <Eye className="w-4 h-4" aria-hidden="true" />
                  <span>Reveal answer</span>
                </button>
                <p className="text-[11px] text-[#64748B] mt-2">
                  Press <kbd className="px-1.5 py-0.5 rounded border border-[#E8EBF0] bg-[#F8F9FB] font-mono text-[10px]">Space</kbd> or say <span className="font-semibold text-[#172033]">"Reveal answer"</span>
                </p>
              </div>
            </div>
          ) : (
            /* State 2: Answer Revealed + 4 Recall Ratings */
            <div className="pt-6 border-t border-[#E8EBF0] space-y-6 animate-fadeIn">
              {/* Correct Answer */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#15803D]">
                    Correct Answer
                  </span>
                  <button
                    type="button"
                    onClick={onReadExplanation}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#15803D] hover:underline"
                    aria-label="Read answer and explanation aloud"
                  >
                    <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Listen</span>
                  </button>
                </div>
                <div className="text-base font-bold text-[#172033]">
                  {currentCard.correctAnswer}
                </div>
              </div>

              {/* Step-by-Step Explanation */}
              {currentCard.explanation && (
                <div className="p-4 bg-[#F8F9FB] border border-[#E8EBF0] rounded-xl space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                    Explanation &amp; Solution Steps
                  </span>
                  <p className="text-xs sm:text-sm text-[#172033] leading-relaxed whitespace-pre-line">
                    {currentCard.explanation}
                  </p>
                </div>
              )}

              {/* Recall Rating Interface (4 Restrained Options) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#172033]">
                    How well did you recall this answer?
                  </label>
                  <span className="text-[11px] text-[#64748B]">
                    Updates SM-2 memory multiplier
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Rating 1: AGAIN */}
                  <button
                    type="button"
                    onClick={() => onRateCard(1)}
                    className="p-3.5 rounded-xl border border-red-200 bg-red-50/40 hover:bg-red-50 hover:border-red-400 text-left transition-all focus:outline-none focus:ring-2 focus:ring-red-500 group"
                    aria-label="Again: I forgot. Resets interval to 1 day."
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-[#DC2626]">AGAIN</span>
                      <kbd className="text-[10px] font-mono px-1 rounded bg-white border border-red-200 text-[#DC2626]">
                        1
                      </kbd>
                    </div>
                    <p className="text-[11px] text-[#64748B] group-hover:text-[#172033]">
                      I forgot
                    </p>
                    <span className="text-[10px] text-[#DC2626] font-semibold block mt-1">
                      Reset (1 day)
                    </span>
                  </button>

                  {/* Rating 2: HARD */}
                  <button
                    type="button"
                    onClick={() => onRateCard(3)}
                    className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50 hover:border-amber-400 text-left transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 group"
                    aria-label="Hard: Difficult to recall. Shorter interval increase."
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-[#D97706]">HARD</span>
                      <kbd className="text-[10px] font-mono px-1 rounded bg-white border border-amber-200 text-[#D97706]">
                        2
                      </kbd>
                    </div>
                    <p className="text-[11px] text-[#64748B] group-hover:text-[#172033]">
                      Difficult to recall
                    </p>
                    <span className="text-[10px] text-[#D97706] font-semibold block mt-1">
                      Short interval
                    </span>
                  </button>

                  {/* Rating 3: GOOD */}
                  <button
                    type="button"
                    onClick={() => onRateCard(4)}
                    className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-400 text-left transition-all focus:outline-none focus:ring-2 focus:ring-[#1749E8] group"
                    aria-label="Good: Recalled with effort. Standard SM-2 interval increase."
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-[#1749E8]">GOOD</span>
                      <kbd className="text-[10px] font-mono px-1 rounded bg-white border border-blue-200 text-[#1749E8]">
                        3
                      </kbd>
                    </div>
                    <p className="text-[11px] text-[#64748B] group-hover:text-[#172033]">
                      Recalled with effort
                    </p>
                    <span className="text-[10px] text-[#1749E8] font-semibold block mt-1">
                      Normal interval
                    </span>
                  </button>

                  {/* Rating 4: EASY */}
                  <button
                    type="button"
                    onClick={() => onRateCard(5)}
                    className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-400 text-left transition-all focus:outline-none focus:ring-2 focus:ring-[#15803D] group"
                    aria-label="Easy: Recalled confidently. Maximum interval bonus."
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-[#15803D]">EASY</span>
                      <kbd className="text-[10px] font-mono px-1 rounded bg-white border border-emerald-200 text-[#15803D]">
                        4
                      </kbd>
                    </div>
                    <p className="text-[11px] text-[#64748B] group-hover:text-[#172033]">
                      Recalled confidently
                    </p>
                    <span className="text-[10px] text-[#15803D] font-semibold block mt-1">
                      Long interval (+bonus)
                    </span>
                  </button>
                </div>

                <div className="flex justify-between items-center pt-2 text-[11px] text-[#64748B]">
                  <span>Voice: say "Again", "Hard", "Good", or "Easy"</span>
                  {currentIndex > 0 && (
                    <button
                      type="button"
                      onClick={onPrevCard}
                      className="text-[#64748B] hover:text-[#172033] inline-flex items-center gap-1 focus:outline-none focus:underline"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>Previous question</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

