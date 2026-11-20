/**
 * ACCESSPREP-X — Mathematical answer dictation flow (Phase 5, 9).
 * Pure state machine: transcript → parse → (disambiguate) → read back → confirm/correct/cancel → submit.
 * It never submits anything itself; it only reports `submitOption` / `submitExpression` once the student
 * has explicitly confirmed, so callers keep their existing de-duplication and exam guards.
 */
import { MathParseResult } from './mathematicalTypes.ts';
import { parseMathematicalSpeech, isLikelyMathematicalSpeech } from './mathematicalSpeechParser.ts';
import { matchSpokenMathToOptions } from './mathematicalAnswerEvaluator.ts';
import { renderMathExpressionToSpeech } from './mathematicalSpeechRenderer.ts';

export type MathAnswerPhase =
  | 'idle'
  | 'awaiting_confirmation'
  | 'awaiting_disambiguation'
  | 'awaiting_correction';

export interface MathAnswerState {
  phase: MathAnswerPhase;
  parse: MathParseResult | null;
  /** the interpretation currently being confirmed (after disambiguation) */
  expression: string;
  readback: string;
  latex: string;
}

export interface MathFlowOutcome {
  handled: boolean;
  speak?: string;
  state: MathAnswerState;
  submitOption?: 'A' | 'B' | 'C' | 'D';
  submitExpression?: string;
}

export const IDLE_MATH_STATE: MathAnswerState = {
  phase: 'idle',
  parse: null,
  expression: '',
  readback: '',
  latex: ''
};

type Options = { A: string; B: string; C: string; D: string };

const YES = /^(yes|yeah|yep|correct|that is correct|that's correct|right|confirm|confirm answer|confirmed|sure|ok|okay|go ahead|submit)$/;
const NO = /^(no|nope|wrong|incorrect|not correct|that is wrong|that's wrong|correct my answer|change my answer|change it|repeat my answer|try again|redo)$/;
const CANCEL = /^(cancel|cancel answer|cancel my answer|never mind|nevermind|discard|stop answering)$/;
const REPEAT_EXPR = /^(repeat the expression|repeat expression|read the expression|read expression|repeat my answer expression|say it again|what did you hear)$/;

function clean(t: string): string {
  return t.toLowerCase().replace(/[.,!?]/g, '').replace(/\s+/g, ' ').trim();
}

export function isMathAnswerFlowActive(state: MathAnswerState): boolean {
  return state.phase !== 'idle';
}

/** Commands that begin math dictation without content ("enter mathematical answer"). */
export function isEnterMathAnswerCommand(transcript: string): boolean {
  return /^(enter (a |the |my )?(mathematical|math) answer|answer (with|by) math|dictate (an? )?(mathematical|math) answer|enter answer by voice)$/.test(
    clean(transcript)
  );
}

export function isCorrectMyAnswerCommand(transcript: string): boolean {
  return /^(correct my answer|correct the recognized expression|correct recognized expression|change my answer)$/.test(
    clean(transcript)
  );
}

function begin(transcript: string): MathFlowOutcome {
  const parse = parseMathematicalSpeech(transcript);
  if (!parse.success) {
    const reason = parse.validation.hasDivisionByZero
      ? 'That expression divides by zero, which is undefined. Please say your answer again.'
      : 'I could not understand that as a mathematical expression. Please say your answer again.';
    return {
      handled: true,
      speak: reason,
      state: { ...IDLE_MATH_STATE, phase: 'awaiting_correction', parse }
    };
  }
  if (parse.isAmbiguous && parse.alternatives.length >= 2) {
    const [a, b] = parse.alternatives;
    return {
      handled: true,
      speak: `Your answer could mean two things. One: ${a.spokenReadback} Two: ${b.spokenReadback} Say one or two.`,
      state: {
        phase: 'awaiting_disambiguation',
        parse,
        expression: parse.expression,
        readback: parse.spokenReadback,
        latex: parse.latex
      }
    };
  }
  return {
    handled: true,
    speak: `${parse.spokenReadback} Is that correct?`,
    state: {
      phase: 'awaiting_confirmation',
      parse,
      expression: parse.expression,
      readback: parse.spokenReadback,
      latex: parse.latex
    }
  };
}

function confirm(state: MathAnswerState, options?: Options): MathFlowOutcome {
  if (!options) {
    return {
      handled: true,
      speak: 'Answer confirmed.',
      state: IDLE_MATH_STATE,
      submitExpression: state.expression
    };
  }
  const m = matchSpokenMathToOptions(state.expression, options);
  if (m.unique) {
    return {
      handled: true,
      speak: `Confirmed. Selecting option ${m.unique}.`,
      state: IDLE_MATH_STATE,
      submitOption: m.unique
    };
  }
  if (m.matches.length > 1) {
    return {
      handled: true,
      speak: `That value matches more than one option: ${m.matches.join(' and ')}. Please say the option letter you want.`,
      state: IDLE_MATH_STATE
    };
  }
  return {
    handled: true,
    speak: `${state.readback} does not match any of the four options. Please say your answer again, or say an option letter.`,
    state: { ...state, phase: 'awaiting_correction' }
  };
}

/** Start dictation from an arbitrary transcript. */
export function startMathAnswerFlow(transcript: string): MathFlowOutcome {
  return begin(transcript);
}

/** Prompt that opens dictation when the student only said "enter mathematical answer". */
export function promptForMathAnswer(): MathFlowOutcome {
  return {
    handled: true,
    speak: 'Please say your mathematical answer now.',
    state: { ...IDLE_MATH_STATE, phase: 'awaiting_correction' }
  };
}

/** Feed the next transcript into an active flow. Returns handled=false if the flow should ignore it. */
export function continueMathAnswerFlow(
  state: MathAnswerState,
  transcript: string,
  options?: Options
): MathFlowOutcome {
  const c = clean(transcript);

  if (state.phase === 'idle') {
    return { handled: false, state };
  }

  if (CANCEL.test(c)) {
    return { handled: true, speak: 'Answer cancelled.', state: IDLE_MATH_STATE };
  }

  if (state.phase === 'awaiting_correction') {
    if (c.length === 0) return { handled: true, speak: 'Please say your answer again.', state };
    return begin(transcript);
  }

  if (state.phase === 'awaiting_disambiguation' && state.parse) {
    const alts = state.parse.alternatives;
    const pick = /^(one|1|first|first one|option one)$/.test(c) ? 0 : /^(two|2|second|second one|option two)$/.test(c) ? 1 : -1;
    if (pick >= 0 && alts[pick]) {
      const alt = alts[pick];
      const rendered = renderMathExpressionToSpeech(alt.expression);
      return {
        handled: true,
        speak: `${alt.spokenReadback} Is that correct?`,
        state: {
          phase: 'awaiting_confirmation',
          parse: state.parse,
          expression: alt.expression,
          readback: rendered.isReliable ? alt.spokenReadback : alt.spokenReadback,
          latex: state.parse.latex
        }
      };
    }
    if (NO.test(c)) {
      return { handled: true, speak: 'Okay, please say your answer again, with bracket words if needed.', state: { ...state, phase: 'awaiting_correction' } };
    }
    return { handled: true, speak: 'Please say one or two, or say cancel.', state };
  }

  // awaiting_confirmation
  if (REPEAT_EXPR.test(c)) {
    return { handled: true, speak: `${state.readback} Is that correct?`, state };
  }
  if (YES.test(c)) {
    return confirm(state, options);
  }
  if (NO.test(c)) {
    return {
      handled: true,
      speak: 'Okay. Please say your answer again.',
      state: { ...state, phase: 'awaiting_correction' }
    };
  }
  if (isLikelyMathematicalSpeech(transcript)) {
    // Student restated the answer instead of saying yes/no: treat as a correction, never silently accept.
    return begin(transcript);
  }
  return { handled: true, speak: 'Please say yes to confirm, no to correct, or cancel.', state };
}

