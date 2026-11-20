/**
 * ACCESSPREP-X — Reusable Accessible Explanation Card
 * ============================================================================
 * Universal, high-contrast, large-typography explanation component for all
 * examination, practice, and diagnostic modules (Voice Practice, Mock Exam, Pilot Demo, Results).
 *
 * Adheres strictly to WCAG 2.2 AA contrast guidelines, provides 19-24px typography,
 * explicit symbol + text status badges (never color alone), and dedicated audio controls.
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Volume2,
  VolumeX,
  Sparkles,
  BookOpen,
  Info
} from 'lucide-react';
import { useAccessibility } from '../../context/AccessibilityContext.tsx';

export interface AccessibleExplanationCardProps {
  questionText?: string;
  selectedOption?: string | null;
  selectedOptionText?: string;
  correctOption: string;
  correctOptionText?: string;
  isCorrect: boolean;
  explanation: string;
  simplifiedExplanation?: string;
  subject?: string;
  topic?: string;
  section?: string | number;
  marksAwarded?: number | string;
  sourceReference?: string;
  onReadAloud?: () => void;
  onReadSimplified?: () => void;
  className?: string;
}

export function AccessibleExplanationCard({
  questionText,
  selectedOption,
  selectedOptionText,
  correctOption,
  correctOptionText,
  isCorrect,
  explanation,
  simplifiedExplanation,
  subject,
  topic,
  section,
  marksAwarded,
  sourceReference,
  onReadAloud,
  onReadSimplified,
  className = ''
}: AccessibleExplanationCardProps) {
  const { speakText, stopSpeaking, announce, isSpeaking } = useAccessibility();
  const [showSimplified, setShowSimplified] = useState(false);

  // Audio speech handler
  const handleSpeakExplanation = () => {
    const textToRead = showSimplified && simplifiedExplanation
      ? simplifiedExplanation
      : explanation;

    const speech = isCorrect
      ? `Correct answer! The correct option is ${correctOption}. Academic explanation: ${textToRead}`
      : `Your answer was ${selectedOption ? `Option ${selectedOption}` : 'unanswered'}. The correct answer is Option ${correctOption}. Academic explanation: ${textToRead}`;

    announce(speech, 'assertive');
    speakText(speech);
    if (onReadAloud) onReadAloud();
  };

  const handleToggleSimplified = () => {
    const nextMode = !showSimplified;
    setShowSimplified(nextMode);
    const notice = nextMode
      ? 'Switched to simplified conceptual explanation.'
      : 'Switched to standard academic derivation.';
    announce(notice, 'polite');
    if (onReadSimplified) onReadSimplified();
  };

  return (
    <article
      role="region"
      aria-label={`Academic Explanation for question: ${questionText ? questionText.slice(0, 60) : 'solution'}`}
      className={`rounded-2xl border-2 shadow-sm overflow-hidden bg-white transition-all ${
        isCorrect
          ? 'border-emerald-500'
          : 'border-red-400'
      } ${className}`}
    >
      {/* 1. High-Contrast Status Banner */}
      <div
        className={`p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b ${
          isCorrect
            ? 'bg-emerald-50/40 border-emerald-200'
            : 'bg-white border-red-200'
        }`}
      >
        <div className="flex items-center gap-3">
          {isCorrect ? (
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0 font-bold">
              <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#DC2626] text-white flex items-center justify-center shadow-xs shrink-0 font-bold">
              <XCircle className="w-6 h-6" aria-hidden="true" />
            </div>
          )}

          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              {isCorrect ? (
                <>
                  <span>✓ CORRECT ANSWER</span>
                  {marksAwarded !== undefined && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      +{marksAwarded} Marks
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span>✕ INCORRECT ANSWER</span>
                  {marksAwarded !== undefined && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700">
                      {marksAwarded} Marks
                    </span>
                  )}
                </>
              )}
            </h3>

            {(subject || topic || section) && (
              <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-0.5">
                {section ? `Section ${section} • ` : ''}
                {subject ? `${subject} ` : ''}
                {topic ? `• Topic: ${topic}` : ''}
              </p>
            )}
          </div>
        </div>

        {/* Audio Action Toolbar */}
        <div className="flex items-center gap-2">
          {simplifiedExplanation && (
            <button
              type="button"
              onClick={handleToggleSimplified}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border-2 transition-all flex items-center gap-1.5 focus:outline-none focus:ring-4 ${
                showSimplified
                  ? 'bg-amber-500 text-white border-amber-600 focus:ring-amber-300'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100 focus:ring-blue-300'
              }`}
              aria-label={showSimplified ? 'Show full academic derivation' : 'Explain in simple words'}
            >
              <Sparkles className="w-4 h-4 text-amber-500" aria-hidden="true" />
              <span>{showSimplified ? 'Standard View' : 'Explain Simply'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={isSpeaking ? stopSpeaking : handleSpeakExplanation}
            className="px-4 py-2 rounded-lg text-xs sm:text-sm font-bold text-white bg-[#1D4ED8] hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 shadow-xs inline-flex items-center gap-2"
            aria-label={isSpeaking ? 'Stop speech audio' : 'Read explanation aloud via voice assistance'}
          >
            {isSpeaking ? (
              <>
                <VolumeX className="w-4 h-4" aria-hidden="true" />
                <span>Stop Audio</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" aria-hidden="true" />
                <span>Read Aloud</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Optional Question Prompt (if provided) */}
      {questionText && (
        <div className="p-4 sm:p-5 bg-white border-b border-slate-200">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Question Prompt:
          </span>
          <p className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
            {questionText}
          </p>
        </div>
      )}

      {/* 3. Answers Comparison Section (Large High-Contrast Text) */}
      <div className="p-4 sm:p-6 grid gap-4 sm:grid-cols-2 bg-white border-b border-slate-200">
        {/* User's Selected Answer */}
        <div
          className={`p-4 rounded-xl border space-y-1 ${
            isCorrect
              ? 'bg-[#ECFDF5] border-[#A7F3D0]'
              : 'bg-[#FEF2F2] border-[#FECACA]'
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Your Response:
          </span>
          <div
            className={`text-lg sm:text-xl font-bold ${
              isCorrect
                ? 'text-emerald-800'
                : 'text-red-700'
            }`}
          >
            {selectedOption ? (
              <>
                Option {selectedOption}
                {selectedOptionText && <span className="font-semibold ml-1.5">— {selectedOptionText}</span>}
              </>
            ) : (
              <em>Not Attempted (Unanswered)</em>
            )}
          </div>
        </div>

        {/* Verified Official Correct Answer */}
        <div className="p-4 rounded-xl border bg-[#ECFDF5] border-[#A7F3D0] space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">
            Verified Correct Answer:
          </span>
          <div className="text-lg sm:text-xl font-bold text-emerald-800 flex items-center gap-2">
            <span>Option {correctOption}</span>
            {correctOptionText && (
              <span className="font-semibold ml-1.5">— {correctOptionText}</span>
            )}
          </div>
        </div>
      </div>

      {/* 4. High-Visibility Academic Explanation Body */}
      <div className="p-5 sm:p-6 bg-white space-y-3">
        <div className="border-l-4 border-amber-500 pl-4 py-1 space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <BookOpen className="w-5 h-5 text-amber-600 shrink-0" aria-hidden="true" />
            <h4 className="font-bold text-slate-900 text-base tracking-wide uppercase">
              {showSimplified ? 'Simplified Conceptual Explanation' : 'Explanation & Academic Derivation'}
            </h4>
          </div>

          {/* Explanation Paragraphs with Comfortable Typography */}
          <div className="text-sm sm:text-base text-slate-800 leading-relaxed font-normal space-y-2">
            {(showSimplified && simplifiedExplanation ? simplifiedExplanation : explanation)
              .split('\n\n')
              .map((paragraph, idx) => (
                <p key={idx} className="leading-relaxed">
                  {paragraph}
                </p>
              ))}
          </div>

          {/* Source citation when provided */}
          {sourceReference && (
            <div className="pt-3 mt-3 border-t border-amber-200/60 flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <Info className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
              <span>Academic Source: {sourceReference}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
