/**
 * ACCESSPREP-X — Pilot Demo Diagnostic Acceptance State Machine & Voice Command Evaluator
 *
 * Unifies mouse checkbox, keyboard activation, and voice acceptance onto a single deterministic
 * state machine with confidence checks, ambiguous phrase rejection, and duplicate-start guards.
 */

export type AcceptanceStatus =
  | 'NOT_ACCEPTED'
  | 'READING_INSTRUCTIONS'
  | 'WAITING_FOR_ACCEPTANCE'
  | 'CONFIRMING_START'
  | 'ACCEPTED'
  | 'STARTING_EXAM'
  | 'EXAM_IN_PROGRESS';

export type AcceptanceMethod = 'VOICE' | 'CHECKBOX' | 'KEYBOARD';

export interface AcceptanceRecord {
  acceptanceStatus: AcceptanceStatus;
  acceptanceMethod: AcceptanceMethod | null;
  acceptedAt: string | null;
  examStartedAt: string | null;
}

export const MIN_ACCEPTANCE_CONFIDENCE = 0.65;

export const PILOT_DEMO_FULL_INSTRUCTIONS_SPEECH =
  'Welcome to the Pilot Examination Demo. This demo allows you to experience the examination environment. ' +
  'You can navigate questions, select answers, review your responses and submit your examination. ' +
  'There are 20 questions across 4 sections and the duration is 25 minutes. ' +
  'Sections A and B cover Numerical Ability and Reasoning, and award three marks for each correct answer without negative marking. ' +
  'Sections C and D cover General Awareness and English, and award three marks for each correct answer and deduct one mark for an incorrect answer. ' +
  "Say 'Start examination' or 'I agree and begin test' to request starting your examination.";

export const VOICE_LISTENING_FEEDBACK = 'I am listening for your examination start request or confirmation.';
export const VOICE_ACCEPTED_FEEDBACK = 'Your examination instructions have been accepted.';
export const VOICE_STARTING_FEEDBACK = 'Your Pilot Demo examination has started. Question 1 is now displayed. You have 25 minutes.';
export const VOICE_AMBIGUOUS_FEEDBACK =
  "I could not clearly understand your acceptance. Please say 'I agree and begin test'.";
export const VOICE_YES_CLARIFICATION_FEEDBACK =
  "To begin the examination, please say 'I agree and begin test'.";
export const VOICE_LOW_CONFIDENCE_FEEDBACK =
  "I heard your voice with low confidence. Please clearly say 'I agree and begin test', or use the checkbox.";
export const VOICE_MIC_DENIED_FEEDBACK =
  'Microphone access is unavailable. You can accept the instructions using the checkbox or keyboard.';

export interface AcceptanceVoiceDecision {
  kind:
    | 'accepted'
    | 'ambiguous_yes'
    | 'ambiguous_vague'
    | 'low_confidence'
    | 'not_waiting'
    | 'repeat_instructions'
    | 'unrecognized';
  accepted: boolean;
  normalizedTranscript: string;
  feedbackSpeech?: string;
}

/**
 * Normalizes punctuation, filler artifacts, and minor ASR variations.
 */
export function normalizeAcceptanceTranscript(raw: string): string {
  return (raw || '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const EXPLICIT_ACCEPTANCE_PATTERNS: RegExp[] = [
  /^(?:i\s+)?agree\s+(?:and|&|to)?\s*(?:begin|start)\s+(?:the\s+)?(?:test|exam|examination|diagnostic)$/,
  /^(?:i\s+)?accept\s+(?:the\s+)?(?:instructions|terms|rules)(?:\s+(?:and|&)\s+(?:begin|start)\s+(?:the\s+)?(?:test|exam|examination|diagnostic))?$/,
  /^(?:i\s+)?understand\s+and\s+(?:want\s+to\s+|would\s+like\s+to\s+|am\s+ready\s+to\s+)?(?:begin|start)(?:\s+(?:the\s+)?(?:test|exam|examination|diagnostic))?$/,
  /^(?:i\s+)?accept\s+and\s+(?:begin|start)\s+(?:the\s+)?(?:test|exam|examination|diagnostic)$/,
  /^(?:please\s+)?begin\s+(?:the\s+|my\s+)?(?:diagnostic\s+)?(?:test|exam|examination)$/,
  /^(?:please\s+)?start\s+(?:the\s+|my\s+)?(?:diagnostic\s+)?(?:test|exam|examination)$/
];

const VAGUE_YES_PATTERNS = new Set([
  'yes',
  'yeah',
  'yep',
  'yup',
  'yes i understand',
  'i understand',
  'understood'
]);

const VAGUE_OTHER_PATTERNS = new Set([
  'ok',
  'okay',
  'sure',
  'fine',
  'start',
  'begin',
  'go',
  'go ahead',
  'proceed',
  'ready',
  'done',
  'right',
  'correct'
]);

const REPEAT_INSTRUCTION_PATTERNS: RegExp[] = [
  /^(?:repeat|read)\s+(?:the\s+)?instructions(?:\s+again)?$/,
  /^(?:say|read)\s+instructions\s+again$/,
  /^repeat\s+rules$/
];

/**
 * Deterministic voice acceptance evaluator.
 * Strictly requires `WAITING_FOR_ACCEPTANCE` state, adequate recognition confidence,
 * and explicit acceptance phrasing (rejects vague words like "yes", "okay", "start").
 */
export function evaluateVoiceAcceptanceCommand(
  currentStatus: AcceptanceStatus,
  rawTranscript: string,
  confidence?: number
): AcceptanceVoiceDecision {
  const normalized = normalizeAcceptanceTranscript(rawTranscript);

  if (!normalized) {
    return {
      kind: 'unrecognized',
      accepted: false,
      normalizedTranscript: '',
      feedbackSpeech: VOICE_AMBIGUOUS_FEEDBACK
    };
  }

  // Allow repeating instructions while reading or waiting
  if (
    (currentStatus === 'READING_INSTRUCTIONS' ||
      currentStatus === 'WAITING_FOR_ACCEPTANCE' ||
      currentStatus === 'NOT_ACCEPTED') &&
    REPEAT_INSTRUCTION_PATTERNS.some((p) => p.test(normalized))
  ) {
    return {
      kind: 'repeat_instructions',
      accepted: false,
      normalizedTranscript: normalized
    };
  }

  // Safety guard: ONLY accept acceptance commands while WAITING_FOR_ACCEPTANCE
  if (currentStatus !== 'WAITING_FOR_ACCEPTANCE') {
    return {
      kind: 'not_waiting',
      accepted: false,
      normalizedTranscript: normalized
    };
  }

  // Confidence gate: reject low-confidence recognitions without starting exam
  if (typeof confidence === 'number' && Number.isFinite(confidence) && confidence < MIN_ACCEPTANCE_CONFIDENCE) {
    return {
      kind: 'low_confidence',
      accepted: false,
      normalizedTranscript: normalized,
      feedbackSpeech: VOICE_LOW_CONFIDENCE_FEEDBACK
    };
  }

  // Explicit acceptance commands
  if (EXPLICIT_ACCEPTANCE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return {
      kind: 'accepted',
      accepted: true,
      normalizedTranscript: normalized
    };
  }

  // Vague "yes" / "I understand" -> request explicit acceptance phrase
  if (VAGUE_YES_PATTERNS.has(normalized)) {
    return {
      kind: 'ambiguous_yes',
      accepted: false,
      normalizedTranscript: normalized,
      feedbackSpeech: VOICE_YES_CLARIFICATION_FEEDBACK
    };
  }

  // Vague "okay" / "start" -> reject as ambiguous
  if (VAGUE_OTHER_PATTERNS.has(normalized)) {
    return {
      kind: 'ambiguous_vague',
      accepted: false,
      normalizedTranscript: normalized,
      feedbackSpeech: VOICE_AMBIGUOUS_FEEDBACK
    };
  }

  return {
    kind: 'unrecognized',
    accepted: false,
    normalizedTranscript: normalized,
    feedbackSpeech: VOICE_AMBIGUOUS_FEEDBACK
  };
}

/**
 * Transitions the unified acceptance status safely for checkbox toggles.
 */
export function applyCheckboxAcceptanceToggle(
  currentStatus: AcceptanceStatus,
  checked: boolean
): AcceptanceStatus {
  if (currentStatus === 'STARTING_EXAM' || currentStatus === 'EXAM_IN_PROGRESS') {
    return currentStatus;
  }
  return checked ? 'ACCEPTED' : 'NOT_ACCEPTED';
}

/**
 * Helper to determine if the unified state allows the Begin Test button to be enabled.
 */
export function isReadyToBeginTest(status: AcceptanceStatus): boolean {
  return status === 'ACCEPTED';
}

