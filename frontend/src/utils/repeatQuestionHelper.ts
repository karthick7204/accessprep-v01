/**
 * ACCESSPREP-X Accessible Question & Option Reading Utility
 * Formats question stems, full question with options, all options, and individual options
 * for screen-reader and Web Speech API TTS output adhering to WCAG 2.2 AA.
 *
 * Mathematical notation (plain-text or LaTeX) in numerical/reasoning questions is converted to
 * natural, grouping-preserving speech by the structured math renderer — raw symbols are never read.
 */

import { Question } from '../db/database.ts';
import { renderTextWithMathToSpeech } from '../math/mathematicalSpeechRenderer.ts';
import {
  formatReasoningQuestionSpeech,
  formatReasoningOptionSpeech
} from './reasoningSpeechFormatter.ts';

/** Mathematical subjects or any text containing explicit mathematical expressions/symbols are rendered into spoken math. */
function shouldRenderMath(text: string, subject?: string): boolean {
  if (/numerical|math|quantitative|reasoning|aptitude/i.test(subject || '')) {
    return true;
  }
  return /(?:\\frac|\\sqrt|[√∛×÷²³≠≥≤]|\b(?:sqrt|cbrt|LCM|HCF|GCD)\s*\(|\b[a-zA-Z0-9]+\^[a-zA-Z0-9]+|\b\d+(?:\.\d+)?\s*(?:[+*/^=:]|%\s+of)\s*\d+|\b\d+(?:\.\d+)?\s*-\s*\d+|\b\d+(?:\.\d+)?%)/i.test(
    text || ''
  );
}

/** Speech-safe version of any text belonging to a question of the given subject. */
export function speakableQuestionText(text: string, subject?: string, topic?: string): string {
  if (!text) return '';
  // Apply math rendering first for numerical/mathematical expressions, then reasoning speech formatting
  const afterMath = shouldRenderMath(text, subject) ? renderTextWithMathToSpeech(text) : text;
  return formatReasoningQuestionSpeech(afterMath, subject, topic);
}

/** Speech for a single option (e.g. "7/9", "x^2", "3 : 2", "4% increase"). Plain words pass through unchanged. */
export function speakableOptionText(text: string, subject?: string, topic?: string, questionText?: string): string {
  if (!text) return '';
  const afterMath = shouldRenderMath(text, subject) ? renderTextWithMathToSpeech(text) : text;
  return formatReasoningOptionSpeech(afterMath, subject, topic, questionText);
}

function optionsOf(q: Question) {
  return {
    A: speakableOptionText(q.option_a, q.subject, q.topic, q.question_text),
    B: speakableOptionText(q.option_b, q.subject, q.topic, q.question_text),
    C: speakableOptionText(q.option_c, q.subject, q.topic, q.question_text),
    D: speakableOptionText(q.option_d, q.subject, q.topic, q.question_text)
  };
}

/**
 * Format complete question with subject context and all four options
 */
export function formatFullQuestionPrompt(q: Question, idx?: number, total?: number): string {
  const prefix =
    idx !== undefined && total !== undefined
      ? `Question ${idx + 1} of ${total}. Section: ${q.subject}. `
      : `Section: ${q.subject}. `;

  const o = optionsOf(q);
  return `${prefix}${speakableQuestionText(q.question_text, q.subject, q.topic)}. Option A: ${o.A}. Option B: ${o.B}. Option C: ${o.C}. Option D: ${o.D}. What is your answer?`;
}

/**
 * Format question stem text only (without options)
 */
export function formatQuestionStemOnly(q: Question, idx?: number, total?: number): string {
  const prefix =
    idx !== undefined && total !== undefined
      ? `Question ${idx + 1} of ${total}. Section: ${q.subject}. `
      : `Section: ${q.subject}. `;

  return `${prefix}${speakableQuestionText(q.question_text, q.subject, q.topic)}.`;
}

/**
 * Speech for only the equations/expressions in the question stem ("Repeat Equation").
 * Falls back to the whole stem when no distinct equation can be isolated.
 */
export function formatEquationOnlyPrompt(q: Question): string {
  const stem = speakableQuestionText(q.question_text, q.subject, q.topic);
  return `The question is: ${stem}.`;
}

/**
 * Format all options with clear labels (A, B, C, D)
 */
export function formatAllOptionsPrompt(q: Question): string {
  const o = optionsOf(q);
  return `The options are: Option A: ${o.A}. Option B: ${o.B}. Option C: ${o.C}. Option D: ${o.D}.`;
}

/**
 * Format an individual option by key
 */
export function formatSingleOptionPrompt(q: Question, opt: 'A' | 'B' | 'C' | 'D'): string {
  const key = `option_${opt.toLowerCase()}` as keyof Question;
  const val = speakableOptionText(String(q[key] || ''), q.subject, q.topic, q.question_text);
  return `Option ${opt}: ${val}.`;
}

/**
 * Speech-safe explanation text (used by Repeat Explanation / Explain the equation).
 */
export function formatExplanationPrompt(q: { explanation: string; subject?: string }): string {
  return `Explanation: ${speakableQuestionText(q.explanation.trim().replace(/\.+$/, ''), q.subject)}.`;
}

/**
 * Format flashcard question for spaced repetition revision session
 */
export function formatFlashcardQuestionPrompt(
  card: { subject: string; topic: string; questionText: string },
  idx?: number,
  total?: number
): string {
  const prefix =
    idx !== undefined && total !== undefined
      ? `Revision Card ${idx + 1} of ${total}. Subject: ${card.subject}, Topic: ${card.topic}. `
      : `Subject: ${card.subject}, Topic: ${card.topic}. `;

  return `${prefix}${speakableQuestionText(card.questionText, card.subject)}.`;
}

/**
 * Returns ONLY the question text — no prefix, no question number, no "Section:", no options.
 * Use for keyboard shortcut R and voice command "repeat question".
 */
export function repeatQuestionTextOnly(q: Question): string {
  return speakableQuestionText(q.question_text, q.subject, q.topic);
}

/**
 * Returns ONLY "A: [text]. B: [text]. C: [text]. D: [text]." — no "The options are:" intro.
 * Use for keyboard shortcut O and voice command "repeat options".
 */
export function repeatOptionsTextOnly(q: Question): string {
  const o = optionsOf(q);
  const parts: string[] = [];
  if (o.A) parts.push(`A: ${o.A}`);
  if (o.B) parts.push(`B: ${o.B}`);
  if (o.C) parts.push(`C: ${o.C}`);
  if (o.D) parts.push(`D: ${o.D}`);
  return parts.join('. ') + '.';
}

/**
 * Format flashcard answer & explanation
 */
export function formatFlashcardAnswerPrompt(card: {
  correctAnswer: string;
  explanation: string;
  subject?: string;
}): string {
  const cleanExp = card.explanation.trim().replace(/\.+$/, '');
  return `Answer: ${speakableOptionText(card.correctAnswer, card.subject)}. Explanation: ${speakableQuestionText(cleanExp, card.subject)}.`;
}

/**
 * Formats all four answer choices in their original order with full "Option A..D" labels:
 * "Option A: [A]. Option B: [B]. Option C: [C]. Option D: [D]."
 */
export function formatOptionsWithLabels(q: Question): string {
  const o = optionsOf(q);
  const parts: string[] = [];
  if (o.A) parts.push(`Option A: ${o.A}`);
  if (o.B) parts.push(`Option B: ${o.B}`);
  if (o.C) parts.push(`Option C: ${o.C}`);
  if (o.D) parts.push(`Option D: ${o.D}`);
  return parts.length > 0 ? parts.join('. ') + '.' : '';
}

export interface RepeatExecutionCallbacks {
  stopSpeaking?: () => void;
  speakText?: (text: string, onEnd?: () => void) => void;
  announce?: (message: string, priority?: 'polite' | 'assertive') => void;
  onPlaybackEnd?: () => void;
  onStatusMessage?: (status: string) => void;
}

/**
 * Centralized function to repeat the currently active question from the beginning.
 * Cancels ongoing playback, provides accessible visual/screen-reader feedback ("Repeating Question..."),
 * speaks the complete question text via TTS, and returns to listening upon completion.
 */
export function repeatCurrentQuestion(
  questionOrGetter: Question | null | undefined | (() => Question | null | undefined),
  callbacks?: RepeatExecutionCallbacks
): string {
  const q = typeof questionOrGetter === 'function' ? questionOrGetter() : questionOrGetter;
  if (!q || !q.question_text) return '';

  const text = repeatQuestionTextOnly(q).trim();
  if (!text) return '';
  const spoken = /[.?!]$/.test(text) ? text : `${text}.`;

  callbacks?.stopSpeaking?.();
  callbacks?.onStatusMessage?.('Repeating Question...');
  callbacks?.announce?.('Repeating Question...', 'polite');
  callbacks?.speakText?.(spoken, () => {
    callbacks?.onPlaybackEnd?.();
  });

  return spoken;
}

/**
 * Centralized function to repeat all four answer options for the currently active question in order.
 * Cancels ongoing playback, provides accessible visual/screen-reader feedback ("Reading Answer Options..."),
 * speaks "Option A: ... Option B: ... Option C: ... Option D: ...", and returns to listening upon completion.
 */
export function repeatCurrentOptions(
  questionOrGetter: Question | null | undefined | (() => Question | null | undefined),
  callbacks?: RepeatExecutionCallbacks
): string {
  const q = typeof questionOrGetter === 'function' ? questionOrGetter() : questionOrGetter;
  if (!q) return '';

  const spoken = formatOptionsWithLabels(q);
  if (!spoken) return '';

  callbacks?.stopSpeaking?.();
  callbacks?.onStatusMessage?.('Reading Answer Options...');
  callbacks?.announce?.('Reading Answer Options...', 'polite');
  callbacks?.speakText?.(spoken, () => {
    callbacks?.onPlaybackEnd?.();
  });

  return spoken;
}

/**
 * Centralized function to repeat only a single requested option (A, B, C, or D) for the currently active question.
 * Cancels ongoing playback, provides accessible feedback ("Reading Option B..."),
 * speaks "Option B: [text].", and returns to listening upon completion.
 */
export function repeatIndividualOption(
  optionId: 'A' | 'B' | 'C' | 'D' | string,
  questionOrGetter: Question | null | undefined | (() => Question | null | undefined),
  callbacks?: RepeatExecutionCallbacks
): string {
  const q = typeof questionOrGetter === 'function' ? questionOrGetter() : questionOrGetter;
  if (!q) return '';

  const normalizedOpt = String(optionId || '').trim().toUpperCase() as 'A' | 'B' | 'C' | 'D';
  if (!['A', 'B', 'C', 'D'].includes(normalizedOpt)) return '';

  const spoken = formatSingleOptionPrompt(q, normalizedOpt);

  callbacks?.stopSpeaking?.();
  callbacks?.onStatusMessage?.(`Reading Option ${normalizedOpt}...`);
  callbacks?.announce?.(`Reading Option ${normalizedOpt}...`, 'polite');
  callbacks?.speakText?.(spoken, () => {
    callbacks?.onPlaybackEnd?.();
  });

  return spoken;
}
