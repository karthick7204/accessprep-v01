/**
 * ACCESSPREP-X — Central Examination Context Resolver & Confirmation State Machine
 *
 * Enforces strict isolation between PILOT_DEMO, MOCK_EXAM, VOICE_PRACTICE, and NONE.
 * Implements deterministic confirmation state transitions for Pilot Demo start and submission
 * so that:
 *  1. Pilot Demo never starts without explicit YES confirmation.
 *  2. "Submit examination" inside Pilot Demo never triggers Mock Examination or navigation.
 *  3. Cross-module commands cannot leak or mutate another examination module's state.
 */

import type { ScreenId } from '../types/screens.ts';
import { cleanVoiceTranscript } from './commandParser.ts';

export type ExamContext = 'PILOT_DEMO' | 'MOCK_EXAM' | 'VOICE_PRACTICE' | 'NONE';

export type ExamInteractionState =
  | 'IDLE'
  | 'PILOT_INTRODUCTION'
  | 'AWAITING_START_REQUEST'
  | 'CONFIRMING_START'
  | 'PILOT_RUNNING'
  | 'CONFIRMING_SUBMISSION'
  | 'SUBMITTING'
  | 'COMPLETED'
  | 'CANCELLED';

export interface ExamSessionContext {
  activeContext: ExamContext;
  interactionState: ExamInteractionState;
  isExamActive: boolean;
  isConfirmationPending: boolean;
  confirmationType: 'START' | 'SUBMIT' | null;
  isSubmitting: boolean;
  attemptId?: string;
}

// ─── Standardized Accessible Spoken Prompts ──────────────────────────────────

export const PILOT_DEMO_INTRO_SPEECH =
  'Welcome to the Pilot Examination Demo. This demo allows you to experience the examination environment. ' +
  'You can navigate questions, select answers, review your responses and submit your examination.';

export const PILOT_DEMO_START_CONFIRM_PROMPT =
  'Are you sure you want to start the Pilot Demo examination? Say YES to begin or NO to cancel.';

export const PILOT_DEMO_STARTED_SPEECH =
  'Your Pilot Demo examination has started. Question 1 is now displayed.';

export const PILOT_DEMO_START_CANCELLED_SPEECH =
  'The Pilot Demo examination was not started. You remain on the Pilot Demo introduction screen.';

export const PILOT_DEMO_START_UNCLEAR_PROMPT =
  'I did not catch a clear confirmation. Are you sure you want to start the Pilot Demo examination? Say YES to begin or NO to cancel.';

export const PILOT_DEMO_SUBMIT_CONFIRM_PROMPT =
  'Are you sure you want to submit your Pilot Demo examination? Once submitted, you may not be able to change your answers. Say YES to submit or NO to continue the examination.';

export const PILOT_DEMO_SUBMITTED_SPEECH =
  'Your Pilot Demo examination has been submitted successfully. Your result is ready.';

export const PILOT_DEMO_SUBMIT_CANCELLED_SPEECH =
  'Submission cancelled. Continuing your Pilot Demo examination.';

export const PILOT_DEMO_SUBMIT_UNCLEAR_PROMPT =
  'Please confirm clearly. Are you sure you want to submit your Pilot Demo examination? Say YES to submit or NO to continue.';

export const PILOT_DEMO_ALREADY_COMPLETED_SPEECH =
  'Your Pilot Demo examination has already been completed and submitted.';

export const NO_ACTIVE_EXAM_SUBMIT_SPEECH =
  'There is no active examination to submit.';

export const MOCK_EXAM_SUBMIT_CONFIRM_PROMPT =
  'Are you sure you want to submit your Mock Examination? Say YES to submit or NO to continue the examination.';

// ─── Command Pattern Matchers ────────────────────────────────────────────────

const START_REQUEST_PHRASES = new Set([
  'start examination',
  'start the examination',
  'begin test',
  'begin the test',
  'start pilot demo',
  'start the pilot demo',
  'begin pilot examination',
  'begin the pilot examination',
  'begin pilot demo',
  'start pilot examination',
  'start diagnostic',
  'start diagnostic test',
  'start diagnostic examination',
  'begin diagnostic',
  'begin diagnostic test',
  'begin diagnostic examination',
  'start my diagnostic examination',
  'begin examination',
  'begin the examination',
  'start test',
  'start the test',
  'start exam',
  'begin exam'
]);

const START_CONFIRM_PHRASES = new Set([
  'yes',
  'yeah',
  'yep',
  'yup',
  'yes please',
  'confirm',
  'i confirm',
  'confirmed',
  'start now',
  'begin now',
  'yes start',
  'yes begin',
  'yes start examination',
  'yes begin test',
  'i agree and begin test',
  'agree and begin test',
  'i accept the instructions',
  'accept and start examination'
]);

const START_CANCEL_PHRASES = new Set([
  'no',
  'nope',
  'no thank you',
  'cancel',
  'not now',
  'go back',
  'do not start',
  'dont start',
  'stop',
  'stay here'
]);

const SUBMIT_REQUEST_PHRASES = new Set([
  'submit examination',
  'submit the examination',
  'submit my examination',
  'submit exam',
  'submit the exam',
  'submit my exam',
  'submit test',
  'submit the test',
  'submit my test',
  'submit pilot demo',
  'submit pilot examination',
  'submit diagnostic',
  'submit diagnostic examination',
  'finish examination',
  'finish the examination',
  'finish exam',
  'finish test',
  'end examination',
  'end exam',
  'submit',
  'summit examination',
  'summit exam',
  'summit test'
]);

const SUBMIT_CONFIRM_PHRASES = new Set([
  'yes',
  'yeah',
  'yep',
  'yup',
  'yes please',
  'confirm',
  'i confirm',
  'confirmed',
  'confirm submission',
  'yes confirm',
  'yes confirm submission',
  'yes submit',
  'yes submit examination',
  'yes submit exam',
  'submit now'
]);

const SUBMIT_CANCEL_PHRASES = new Set([
  'no',
  'nope',
  'no thank you',
  'cancel',
  'cancel submission',
  'do not submit',
  'dont submit',
  'not now',
  'go back',
  'continue',
  'continue examination',
  'continue exam',
  'resume examination',
  'keep going',
  'return to exam'
]);

export function normalizeExamCommand(rawTranscript: string): string {
  return cleanVoiceTranscript(rawTranscript || '');
}

export function isStartExamRequestPhrase(rawTranscript: string): boolean {
  const clean = normalizeExamCommand(rawTranscript);
  if (!clean || clean.includes('mock')) return false;
  if (START_REQUEST_PHRASES.has(clean)) return true;
  return /^(?:please\s+|i\s+want\s+to\s+|can\s+you\s+)?(?:start|begin)\s+(?:the\s+|my\s+)?(?:pilot\s+demo|pilot\s+examination|diagnostic\s+examination|diagnostic\s+test|diagnostic|examination|exam|test)$/.test(
    clean
  );
}

export function isStartConfirmPhrase(rawTranscript: string): boolean {
  const clean = normalizeExamCommand(rawTranscript);
  if (!clean) return false;
  if (START_CONFIRM_PHRASES.has(clean)) return true;
  return /^(?:yes|confirm|confirmed)\s+(?:start|begin|please|now)/.test(clean);
}

export function isStartCancelPhrase(rawTranscript: string): boolean {
  const clean = normalizeExamCommand(rawTranscript);
  if (!clean) return false;
  if (START_CANCEL_PHRASES.has(clean)) return true;
  return /^(?:no|cancel)\s+(?:do\s+not|dont|cancel|stop|not\s+now)/.test(clean);
}

export function isSubmitExamRequestPhrase(rawTranscript: string): boolean {
  const clean = normalizeExamCommand(rawTranscript);
  if (!clean || clean.includes('mock')) return false;
  if (SUBMIT_REQUEST_PHRASES.has(clean)) return true;
  return /^(?:please\s+|i\s+want\s+to\s+|can\s+you\s+)?(?:submit|submitting|summit|finish|end)\s+(?:the\s+|my\s+)?(?:pilot\s+demo|pilot\s+examination|diagnostic\s+examination|diagnostic\s+test|diagnostic|examination|exam|test|paper|attempt)(?:\s+now|\s+please)?$/.test(
    clean
  );
}

export function isSubmitConfirmPhrase(rawTranscript: string): boolean {
  const clean = normalizeExamCommand(rawTranscript);
  if (!clean) return false;
  if (SUBMIT_CONFIRM_PHRASES.has(clean)) return true;
  return /^(?:yes|confirm|confirmed)\s+(?:submit|confirm|please|now)/.test(clean);
}

export function isSubmitCancelPhrase(rawTranscript: string): boolean {
  const clean = normalizeExamCommand(rawTranscript);
  if (!clean) return false;
  if (SUBMIT_CANCEL_PHRASES.has(clean)) return true;
  return /^(?:no|cancel)\s+(?:continue|do\s+not|dont|cancel|return|stay)/.test(clean);
}

/**
 * Resolves the active examination context from the current screen and active state.
 */
export function resolveActiveExamContext(
  currentScreen: ScreenId,
  isExamActive?: boolean
): ExamContext {
  if (currentScreen === 'pilot_demo') return 'PILOT_DEMO';
  if (currentScreen === 'mock_exam') return 'MOCK_EXAM';
  if (currentScreen === 'voice_practice' && isExamActive) return 'VOICE_PRACTICE';
  return 'NONE';
}

export interface ExamCommandRoutingResult {
  handled: boolean;
  action:
    | 'REQUEST_PILOT_START_CONFIRM'
    | 'CONFIRM_PILOT_START'
    | 'CANCEL_PILOT_START'
    | 'RETRY_PILOT_START_CONFIRM'
    | 'REQUEST_PILOT_SUBMIT_CONFIRM'
    | 'CONFIRM_PILOT_SUBMIT'
    | 'CANCEL_PILOT_SUBMIT'
    | 'RETRY_PILOT_SUBMIT_CONFIRM'
    | 'BLOCK_ALREADY_COMPLETED'
    | 'BLOCK_CROSS_MODULE_SWITCH'
    | 'REQUEST_MOCK_SUBMIT_CONFIRM'
    | 'CONFIRM_MOCK_SUBMIT'
    | 'CANCEL_MOCK_SUBMIT'
    | 'NO_ACTIVE_EXAM'
    | 'UNHANDLED';
  nextState: ExamInteractionState;
  spokenResponse: string;
}

/**
 * Deterministic state machine controller for Pilot Demo & Mock Exam confirmation and isolation.
 */
export class ExamConfirmationStateMachine {
  private context: ExamContext;
  private state: ExamInteractionState;
  private startCount = 0;
  private submitCount = 0;

  constructor(
    initialContext: ExamContext = 'PILOT_DEMO',
    initialState: ExamInteractionState = 'PILOT_INTRODUCTION'
  ) {
    this.context = initialContext;
    this.state = initialState;
  }

  get activeContext(): ExamContext {
    return this.context;
  }

  get interactionState(): ExamInteractionState {
    return this.state;
  }

  get examStartCount(): number {
    return this.startCount;
  }

  get examSubmitCount(): number {
    return this.submitCount;
  }

  getSessionContext(attemptId?: string): ExamSessionContext {
    return {
      activeContext: this.context,
      interactionState: this.state,
      isExamActive:
        this.state === 'PILOT_RUNNING' || this.state === 'CONFIRMING_SUBMISSION',
      isConfirmationPending:
        this.state === 'CONFIRMING_START' || this.state === 'CONFIRMING_SUBMISSION',
      confirmationType:
        this.state === 'CONFIRMING_START'
          ? 'START'
          : this.state === 'CONFIRMING_SUBMISSION'
          ? 'SUBMIT'
          : null,
      isSubmitting: this.state === 'SUBMITTING',
      attemptId
    };
  }

  setContext(newContext: ExamContext, newState?: ExamInteractionState): void {
    if (this.context !== newContext) {
      this.context = newContext;
      this.state =
        newState ||
        (newContext === 'PILOT_DEMO' ? 'PILOT_INTRODUCTION' : 'IDLE');
    } else if (newState) {
      this.state = newState;
    }
  }

  setState(newState: ExamInteractionState): void {
    this.state = newState;
  }

  /**
   * Processes a spoken command in the current Examination Context and returns the transition decision.
   */
  processVoiceCommand(
    rawTranscript: string,
    confidence = 0.95
  ): ExamCommandRoutingResult {
    const clean = normalizeExamCommand(rawTranscript);

    // 1. Context: NONE (no active examination module)
    if (this.context === 'NONE') {
      if (isSubmitExamRequestPhrase(clean) || clean === 'confirm submission') {
        return {
          handled: true,
          action: 'NO_ACTIVE_EXAM',
          nextState: this.state,
          spokenResponse: NO_ACTIVE_EXAM_SUBMIT_SPEECH
        };
      }
      return {
        handled: false,
        action: 'UNHANDLED',
        nextState: this.state,
        spokenResponse: ''
      };
    }

    // 2. Context: MOCK_EXAM
    if (this.context === 'MOCK_EXAM') {
      // Prevent Pilot Demo specific submission commands from triggering Mock Exam
      if (
        clean === 'submit pilot demo' ||
        clean === 'submit pilot examination' ||
        clean === 'submit diagnostic' ||
        clean === 'submit diagnostic examination' ||
        clean === 'start pilot demo' ||
        clean === 'begin pilot examination'
      ) {
        return {
          handled: true,
          action: 'BLOCK_CROSS_MODULE_SWITCH',
          nextState: this.state,
          spokenResponse:
            'You are currently in the Mock Examination. Pilot Demo commands are disabled while Mock Examination is active.'
        };
      }

      if (this.state === 'CONFIRMING_SUBMISSION') {
        if (isSubmitConfirmPhrase(clean)) {
          this.state = 'COMPLETED';
          this.submitCount++;
          return {
            handled: true,
            action: 'CONFIRM_MOCK_SUBMIT',
            nextState: 'COMPLETED',
            spokenResponse:
              'Examination submitted successfully. Loading scorecard and results analysis.'
          };
        }
        if (isSubmitCancelPhrase(clean)) {
          this.state = 'PILOT_RUNNING';
          return {
            handled: true,
            action: 'CANCEL_MOCK_SUBMIT',
            nextState: 'PILOT_RUNNING',
            spokenResponse: 'Submission cancelled. Continuing your Mock Examination.'
          };
        }
        return {
          handled: true,
          action: 'RETRY_PILOT_SUBMIT_CONFIRM',
          nextState: 'CONFIRMING_SUBMISSION',
          spokenResponse: MOCK_EXAM_SUBMIT_CONFIRM_PROMPT
        };
      }

      if (isSubmitExamRequestPhrase(clean)) {
        this.state = 'CONFIRMING_SUBMISSION';
        return {
          handled: true,
          action: 'REQUEST_MOCK_SUBMIT_CONFIRM',
          nextState: 'CONFIRMING_SUBMISSION',
          spokenResponse: MOCK_EXAM_SUBMIT_CONFIRM_PROMPT
        };
      }

      return {
        handled: false,
        action: 'UNHANDLED',
        nextState: this.state,
        spokenResponse: ''
      };
    }

    // 3. Context: PILOT_DEMO
    if (this.context === 'PILOT_DEMO') {
      // Block cross-module Mock Examination activation while inside Pilot Demo
      if (
        clean === 'start mock examination' ||
        clean === 'start mock exam' ||
        clean === 'start mock test' ||
        clean === 'open mock examination' ||
        clean === 'open mock exam' ||
        clean === 'mock examination' ||
        clean === 'mock exam' ||
        clean === 'submit mock examination' ||
        clean === 'submit mock exam'
      ) {
        return {
          handled: true,
          action: 'BLOCK_CROSS_MODULE_SWITCH',
          nextState: this.state,
          spokenResponse:
            'You are currently in the Pilot Demo examination. Please complete or exit the Pilot Demo before starting a Mock Examination.'
        };
      }

      // 3a. Completed state blocks any further submission or start
      if (this.state === 'COMPLETED') {
        if (
          isSubmitExamRequestPhrase(clean) ||
          isSubmitConfirmPhrase(clean)
        ) {
          return {
            handled: true,
            action: 'BLOCK_ALREADY_COMPLETED',
            nextState: 'COMPLETED',
            spokenResponse: PILOT_DEMO_ALREADY_COMPLETED_SPEECH
          };
        }
        return {
          handled: false,
          action: 'UNHANDLED',
          nextState: 'COMPLETED',
          spokenResponse: ''
        };
      }

      // 3b. Introduction / Awaiting Start Request -> CONFIRMING_START
      if (
        this.state === 'PILOT_INTRODUCTION' ||
        this.state === 'AWAITING_START_REQUEST' ||
        this.state === 'CANCELLED' ||
        this.state === 'IDLE'
      ) {
        if (!clean || confidence < 0.5) {
          return {
            handled: false,
            action: 'UNHANDLED',
            nextState: this.state,
            spokenResponse: ''
          };
        }

        if (isStartExamRequestPhrase(clean)) {
          this.state = 'CONFIRMING_START';
          return {
            handled: true,
            action: 'REQUEST_PILOT_START_CONFIRM',
            nextState: 'CONFIRMING_START',
            spokenResponse: PILOT_DEMO_START_CONFIRM_PROMPT
          };
        }

        // Cannot submit before starting
        if (isSubmitExamRequestPhrase(clean) || clean === 'confirm submission') {
          return {
            handled: true,
            action: 'NO_ACTIVE_EXAM',
            nextState: this.state,
            spokenResponse:
              'The Pilot Demo examination has not started yet. Say Start Examination to begin.'
          };
        }

        return {
          handled: false,
          action: 'UNHANDLED',
          nextState: this.state,
          spokenResponse: ''
        };
      }

      // 3c. CONFIRMING_START -> PILOT_RUNNING (on YES) or PILOT_INTRODUCTION (on NO)
      if (this.state === 'CONFIRMING_START') {
        if (!clean || confidence < 0.6) {
          return {
            handled: true,
            action: 'RETRY_PILOT_START_CONFIRM',
            nextState: 'CONFIRMING_START',
            spokenResponse: PILOT_DEMO_START_UNCLEAR_PROMPT
          };
        }

        // Check confirm / cancel FIRST before start/submit phrases
        if (isStartConfirmPhrase(clean)) {
          this.state = 'PILOT_RUNNING';
          this.startCount++;
          return {
            handled: true,
            action: 'CONFIRM_PILOT_START',
            nextState: 'PILOT_RUNNING',
            spokenResponse: PILOT_DEMO_STARTED_SPEECH
          };
        }

        if (isStartCancelPhrase(clean)) {
          this.state = 'PILOT_INTRODUCTION';
          return {
            handled: true,
            action: 'CANCEL_PILOT_START',
            nextState: 'PILOT_INTRODUCTION',
            spokenResponse: PILOT_DEMO_START_CANCELLED_SPEECH
          };
        }

        // Prevent pending start confirmation from triggering submission
        if (isSubmitExamRequestPhrase(clean) || clean === 'confirm submission') {
          return {
            handled: true,
            action: 'RETRY_PILOT_START_CONFIRM',
            nextState: 'CONFIRMING_START',
            spokenResponse: PILOT_DEMO_START_CONFIRM_PROMPT
          };
        }

        // Repeated start request stays in CONFIRMING_START without duplicate session
        if (isStartExamRequestPhrase(clean)) {
          return {
            handled: true,
            action: 'RETRY_PILOT_START_CONFIRM',
            nextState: 'CONFIRMING_START',
            spokenResponse: PILOT_DEMO_START_CONFIRM_PROMPT
          };
        }

        // Unclear / unrelated response -> ask again and stay in CONFIRMING_START
        return {
          handled: true,
          action: 'RETRY_PILOT_START_CONFIRM',
          nextState: 'CONFIRMING_START',
          spokenResponse: PILOT_DEMO_START_UNCLEAR_PROMPT
        };
      }

      // 3d. PILOT_RUNNING -> CONFIRMING_SUBMISSION (on "Submit examination")
      if (this.state === 'PILOT_RUNNING') {
        // Ignore duplicate start requests while already running
        if (isStartExamRequestPhrase(clean)) {
          return {
            handled: true,
            action: 'RETRY_PILOT_START_CONFIRM',
            nextState: 'PILOT_RUNNING',
            spokenResponse: 'Your Pilot Demo examination is already in progress.'
          };
        }

        if (isSubmitExamRequestPhrase(clean)) {
          this.state = 'CONFIRMING_SUBMISSION';
          return {
            handled: true,
            action: 'REQUEST_PILOT_SUBMIT_CONFIRM',
            nextState: 'CONFIRMING_SUBMISSION',
            spokenResponse: PILOT_DEMO_SUBMIT_CONFIRM_PROMPT
          };
        }

        return {
          handled: false,
          action: 'UNHANDLED',
          nextState: 'PILOT_RUNNING',
          spokenResponse: ''
        };
      }

      // 3e. CONFIRMING_SUBMISSION -> COMPLETED (on YES) or PILOT_RUNNING (on NO)
      if (this.state === 'CONFIRMING_SUBMISSION') {
        if (!clean || confidence < 0.6) {
          return {
            handled: true,
            action: 'RETRY_PILOT_SUBMIT_CONFIRM',
            nextState: 'CONFIRMING_SUBMISSION',
            spokenResponse: PILOT_DEMO_SUBMIT_UNCLEAR_PROMPT
          };
        }

        // Check confirm / cancel FIRST before repeated submit check
        if (isSubmitConfirmPhrase(clean)) {
          this.state = 'COMPLETED';
          this.submitCount++;
          return {
            handled: true,
            action: 'CONFIRM_PILOT_SUBMIT',
            nextState: 'COMPLETED',
            spokenResponse: PILOT_DEMO_SUBMITTED_SPEECH
          };
        }

        if (isSubmitCancelPhrase(clean)) {
          this.state = 'PILOT_RUNNING';
          return {
            handled: true,
            action: 'CANCEL_PILOT_SUBMIT',
            nextState: 'PILOT_RUNNING',
            spokenResponse: PILOT_DEMO_SUBMIT_CANCELLED_SPEECH
          };
        }

        // Repeated submit command stays in CONFIRMING_SUBMISSION without duplicate submission
        if (isSubmitExamRequestPhrase(clean)) {
          return {
            handled: true,
            action: 'RETRY_PILOT_SUBMIT_CONFIRM',
            nextState: 'CONFIRMING_SUBMISSION',
            spokenResponse: PILOT_DEMO_SUBMIT_CONFIRM_PROMPT
          };
        }

        // Unclear / unrelated response -> remain in CONFIRMING_SUBMISSION and ask again
        return {
          handled: true,
          action: 'RETRY_PILOT_SUBMIT_CONFIRM',
          nextState: 'CONFIRMING_SUBMISSION',
          spokenResponse: PILOT_DEMO_SUBMIT_UNCLEAR_PROMPT
        };
      }
    }

    return {
      handled: false,
      action: 'UNHANDLED',
      nextState: this.state,
      spokenResponse: ''
    };
  }
}
