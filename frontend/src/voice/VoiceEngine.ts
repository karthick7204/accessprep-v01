/**
 * ACCESSPREP-X — Production Continuous Wake-Word Voice Engine
 * ============================================================
 * Robust, resilient Web Speech recognition engine with automatic
 * end-of-speech (VAD / silence timeout) command detection and
 * continuous multi-command session management.
 *
 * Key features:
 *  • Explicit 7-state machine: IDLE, WAKE_DETECTED, LISTENING, PROCESSING, SPEAKING, ERROR, STOPPED
 *  • Hands-free "Hey Vision" wake-word activation & reactivation
 *  • Automatic end-of-utterance detection via configurable silence threshold (1.2s–1.8s, default 1.5s)
 *  • Continuous listening loop after command execution (never requires "Stop Listening" to submit)
 *  • Explicit deactivation only on "Stop Listening", "Disable Voice Assistant", "Go to Sleep", "Deactivate Vision"
 *  • Real-time interim + final speech accumulation with duplicate suppression
 *  • Echo suppression & barge-in command interruption during TTS playback
 *  • Controlled error recovery for permission denial, network glitches, and recognition interruptions
 */

import {
  cleanVoiceTranscript,
  parseVisionWakeWord,
  parseStopListening,
  extractCommandFromConversationalPhrase,
  matchScreenNavigation
} from './commandParser.ts';
import { parseSpokenAnswer } from '../utils/answerParser.ts';

export type VoiceAssistantState =
  | 'IDLE'
  | 'WAKE_DETECTED'
  | 'LISTENING'
  | 'PROCESSING'
  | 'SPEAKING'
  | 'ERROR'
  | 'STOPPED';

export const VOICE_STATE_UI_MESSAGES: Record<VoiceAssistantState, string> = {
  IDLE: 'Say "Hey Vision" to activate',
  WAKE_DETECTED: 'Vision activated',
  LISTENING: 'Listening... Speak your command',
  PROCESSING: 'Processing your command...',
  SPEAKING: 'Vision is responding...',
  STOPPED: 'Voice assistant deactivated',
  ERROR: 'Voice recognition unavailable'
};

export function getVoiceStateMessage(state: VoiceAssistantState): string {
  return VOICE_STATE_UI_MESSAGES[state] || VOICE_STATE_UI_MESSAGES.IDLE;
}

export function normalizeVoiceState(raw: string): VoiceAssistantState {
  const upper = (raw || '').toUpperCase().trim();
  switch (upper) {
    case 'IDLE':
      return 'IDLE';
    case 'WAKE_DETECTED':
      return 'WAKE_DETECTED';
    case 'LISTENING':
      return 'LISTENING';
    case 'PROCESSING':
      return 'PROCESSING';
    case 'SPEAKING':
    case 'RESPONDING':
      return 'SPEAKING';
    case 'ERROR':
      return 'ERROR';
    case 'STOPPED':
      return 'STOPPED';
    default:
      return 'IDLE';
  }
}

export const DEFAULT_SILENCE_TIMEOUT_MS = 1500;

export interface VoiceEngineOptions {
  /** Dispatches finalized command transcript to the global NavigationController pipeline */
  onTranscript: (transcript: string) => Promise<void>;
  /** Notifies UI of microphone active command-listening status */
  onListeningChange: (listening: boolean) => void;
  /** Notifies UI of voice assistant state transitions */
  onStateChange?: (state: VoiceAssistantState) => void;
  /** Live accumulated speech (finalized chunks + interim) during listening */
  onSpeechAccumulated?: (text: string) => void;
  /** Triggered when wake phrase "Hey Vision" is detected. hasAttachedCommand is true if user spoke a command in the same phrase */
  onWakeDetected?: (hasAttachedCommand: boolean) => void;
  /** Triggered when user explicitly deactivates the voice assistant ("Stop Listening", "Go to Sleep", etc.) */
  onDeactivate?: () => void;
  /** Audio beacon sound prompt trigger */
  onPlayBeacon?: (type: 'listening' | 'success' | 'alert') => void;
  /** Immediately interrupts and halts active TTS speech */
  onStopSpeaking?: () => void;
  /** Notifies UI of microphone permission denial or unsupported speech recognition */
  onError?: (errorType: 'denied' | 'unsupported' | 'error', message: string) => void;
  /** Speech recognition language (defaults to 'en-IN') */
  lang?: string;
  /** Configurable silence timeout in milliseconds for automatic end-of-speech detection (default: 1500ms) */
  silenceTimeoutMs?: number;
}

export interface HandleTranscriptOptions {
  /** Whether the recognition segment is final (true) or interim (false). Defaults to true. */
  isFinal?: boolean;
  /** If true, finalizes the command immediately without waiting for silence timeout. */
  immediate?: boolean;
}

function isStopSpeakingCommand(text: string): boolean {
  const t = cleanVoiceTranscript(text);
  if (!t || parseStopListening(t)) return false;
  const stops = [
    'stop',
    'stop speaking',
    'stop reading',
    'stop audio',
    'stop speech',
    'be quiet',
    'quiet',
    'silence',
    'shut up',
    'pause',
    'pause reading',
    'pause audio',
    'halt',
    'vision stop',
    'hey vision stop'
  ];
  return stops.some(
    (s) => t === s || t.startsWith(s + ' ') || t.endsWith(' ' + s)
  );
}

/**
 * Direct actionable commands that should interrupt ongoing TTS (barge-in)
 * without waiting for long question/instruction reading to finish.
 */
function isActionableBargeInCommand(text: string): boolean {
  const t = cleanVoiceTranscript(text);
  if (!t) return false;

  const exactCommands = new Set([
    'submit',
    'submit exam',
    'submit the exam',
    'submit examination',
    'submit the examination',
    'submit my examination',
    'submit test',
    'submit pilot demo',
    'submit pilot examination',
    'submit diagnostic',
    'finish exam',
    'finish examination',
    'finish test',
    'summit examination',
    'summit exam',
    'confirm submission',
    'cancel submission',
    'start examination',
    'start the examination',
    'begin test',
    'begin the test',
    'start pilot demo',
    'begin pilot examination',
    'start diagnostic',
    'begin diagnostic',
    'start exam',
    'begin exam',
    'yes',
    'yeah',
    'yep',
    'confirm',
    'i confirm',
    'confirmed',
    'start now',
    'submit now',
    'yes submit',
    'yes start',
    'no',
    'nope',
    'cancel',
    'not now',
    'go back',
    'next question',
    'previous question',
    'skip question',
    'mark for review',
    'repeat question',
    'read options',
    'repeat options',
    'option a',
    'option b',
    'option c',
    'option d',
    'select option a',
    'select option b',
    'select option c',
    'select option d',
    'choice a',
    'choice b',
    'choice c',
    'choice d',
    'answer a',
    'answer b',
    'answer c',
    'answer d',
    'hey vision',
    'hi vision',
    'hello vision'
  ]);

  if (exactCommands.has(t)) return true;

  // Check if transcript is any recognized question/option repeat or exam control command
  const parsedControl = parseSpokenAnswer(t);
  if (parsedControl && parsedControl.type === 'control') {
    return true;
  }

  if (
    /^(?:please\s+)?(?:submit|summit|finish|start|begin)\s+(?:the\s+|my\s+)?(?:pilot\s+demo|pilot\s+examination|diagnostic|examination|exam|test)$/.test(
      t
    )
  ) {
    return true;
  }

  return matchScreenNavigation(t) !== null;
}

export class VoiceEngine {
  private opts: VoiceEngineOptions;
  private rec: any = null;
  private isAllowed: boolean = false;
  private isSpeaking: boolean = false;
  private isStarting: boolean = false;
  private isRunning: boolean = false;
  private isDestroyed: boolean = false;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private hasRequestedPermission: boolean = false;

  private assistantState: VoiceAssistantState = 'IDLE';
  private isSessionActive: boolean = false;
  private silenceTimeoutMs: number;

  private finalizedChunks: string[] = [];
  private currentInterim: string = '';
  private lastFinalizedUtterance: string = '';
  private lastFinalizedAt: number = 0;

  private isProcessingCommand: boolean = false;
  private pendingCommandQueue: string[] = [];
  private lastExecutedCommand: string = '';
  private lastExecutedAt: number = 0;
  private currentSpokenText: string = '';
  private consumedFinalIndices: Set<number> = new Set();

  constructor(opts: VoiceEngineOptions) {
    this.opts = opts;
    this.silenceTimeoutMs =
      typeof opts.silenceTimeoutMs === 'number' && opts.silenceTimeoutMs >= 0
        ? opts.silenceTimeoutMs
        : DEFAULT_SILENCE_TIMEOUT_MS;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Current voice assistant state */
  getState(): VoiceAssistantState {
    return this.assistantState;
  }

  /** Whether an active continuous voice session is currently running */
  isSessioncurrentlyActive(): boolean {
    return this.isSessionActive;
  }

  /** Update silence timeout threshold in ms (e.g. 1200–1800ms) */
  setSilenceTimeoutMs(ms: number): void {
    if (typeof ms === 'number' && ms >= 0) {
      this.silenceTimeoutMs = ms;
    }
  }

  getSilenceTimeoutMs(): number {
    return this.silenceTimeoutMs;
  }

  /** Live speech accumulated in listening state (finalized chunks + current interim) */
  getAccumulatedSpeech(): string {
    return [...this.finalizedChunks, this.currentInterim]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  /** Manual state override (normalizes lowercase or uppercase state names) */
  setState(state: VoiceAssistantState | string): void {
    this.setAssistantState(normalizeVoiceState(state));
  }

  /** Manually trigger wake-word activation (e.g. from Alt+Space, UI button, or screen entry) */
  triggerWakeWordActivation(speakGreeting: boolean = false): void {
    this.clearSilenceTimer();
    this.clearUtteranceBuffer();
    this.isSessionActive = true;
    this.setAssistantState('WAKE_DETECTED');
    this.opts.onPlayBeacon?.('listening');
    if (speakGreeting) {
      this.opts.onWakeDetected?.(false);
    }
    if (!this.isSpeaking) {
      this.setAssistantState('LISTENING');
    }
    if (!this.isRunning && !this.isStarting && this.isAllowed) {
      this._startRec();
    }
  }

  /**
   * Explicitly deactivate the active voice session ("Stop Listening" button or shortcut).
   * If there is valid pending speech not yet finalized, finalizes it first and then deactivates.
   */
  triggerStopListening(): void {
    const pendingSpeech = this.getAccumulatedSpeech();
    const pendingCmd = extractCommandFromConversationalPhrase(pendingSpeech);
    this.clearSilenceTimer();
    this.clearUtteranceBuffer();

    if (pendingCmd && this.isSessionActive) {
      this.dispatchCommand(pendingCmd, { deactivateAfter: true }).catch((err) => {
        console.error('[VoiceEngine] Error finalizing pending command before stop:', err);
      });
      return;
    }

    this.deactivateSession();
  }

  /** Explicitly deactivate the continuous voice session and enter STOPPED state */
  deactivateSession(): void {
    this.clearSilenceTimer();
    this.clearUtteranceBuffer();
    this.pendingCommandQueue = [];
    this.isSessionActive = false;
    this.isProcessingCommand = false;
    this.setAssistantState('STOPPED');
    this.opts.onPlayBeacon?.('alert');
    this.opts.onDeactivate?.();

    // Stop active command recognition stream, then keep passive wake-word listener ready if allowed
    if (this.rec) {
      try {
        this.rec.abort();
      } catch {
        /* ignore */
      }
      this.rec = null;
      this.isRunning = false;
      this.isStarting = false;
    }

    if (!this.isDestroyed && this.isAllowed) {
      if (this.restartTimer) clearTimeout(this.restartTimer);
      this.restartTimer = setTimeout(() => {
        this._startRec();
      }, 200);
    }
  }

  /** Start background microphone engine (standby for "Hey Vision" or active listening) */
  async start(): Promise<void> {
    this.isAllowed = true;
    if (this.assistantState === 'ERROR') {
      this.setAssistantState(this.isSessionActive ? 'LISTENING' : 'IDLE');
    }

    // First time in browser session: trigger getUserMedia to ensure native permission prompt appears
    if (
      !this.hasRequestedPermission &&
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices?.getUserMedia
    ) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        this.hasRequestedPermission = true;
        // Release tracks immediately so SpeechRecognition has uncontended access
        stream.getTracks().forEach((t) => t.stop());
      } catch (err: any) {
        console.warn('[VoiceEngine] getUserMedia error:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          this.handleRecognitionError(
            'denied',
            'Microphone permission denied. Please allow microphone access or use keyboard input.'
          );
          return;
        }
      }
    }

    this._startRec();
  }

  /** Stop engine completely (e.g. on logout or manual mode) */
  stop(): void {
    this.isAllowed = false;
    this.isSessionActive = false;
    this.clearSilenceTimer();
    this.clearUtteranceBuffer();
    this.pendingCommandQueue = [];
    this.setAssistantState('IDLE');
    this._stopRec();
  }

  /** Inform engine whether TTS speech is currently playing */
  setSpeaking(speaking: boolean, spokenText?: string): void {
    this.isSpeaking = speaking;
    if (speaking) {
      this.currentSpokenText = cleanVoiceTranscript(spokenText || '');
      this.clearSilenceTimer();
      this.clearUtteranceBuffer();
      if (
        this.assistantState === 'PROCESSING' ||
        this.assistantState === 'LISTENING' ||
        this.assistantState === 'WAKE_DETECTED'
      ) {
        this.setAssistantState('SPEAKING');
      }
    } else {
      this.currentSpokenText = '';
      // Speech finished: if voice session is active, automatically return to LISTENING!
      if (this.assistantState === 'SPEAKING' || this.assistantState === 'PROCESSING') {
        this.clearUtteranceBuffer();
        if (this.isSessionActive) {
          this.setAssistantState('LISTENING');
        } else {
          this.setAssistantState('IDLE');
        }
      }
    }
  }

  /** Temporarily pause listening */
  pause(): void {
    this.isSpeaking = true;
  }

  /** Resume listening */
  resume(): void {
    this.isSpeaking = false;
    this.currentSpokenText = '';
    if (!this.isAllowed) return;

    if (this.isSessionActive && (this.assistantState === 'SPEAKING' || this.assistantState === 'IDLE')) {
      this.setAssistantState('LISTENING');
    }

    if (!this.isRunning && !this.isStarting) {
      this._startRec();
    }
  }

  /** Free all resources */
  destroy(): void {
    this.isDestroyed = true;
    this.isAllowed = false;
    this.isSessionActive = false;
    this.clearSilenceTimer();
    this.clearUtteranceBuffer();
    this.pendingCommandQueue = [];
    this.setAssistantState('IDLE');
    this._stopRec();
  }

  /** Whether the microphone is currently active and in LISTENING state */
  isListening(): boolean {
    return this.isRunning && this.isAllowed && this.assistantState === 'LISTENING';
  }

  /** Whether the background SpeechRecognition instance is currently running */
  isRecognitionRunning(): boolean {
    return this.isRunning || this.isStarting;
  }

  /** Handle interim (partial) speech recognition results in real time */
  handleInterimTranscript(transcript: string): void {
    this.handleSpeechTranscript(transcript, { isFinal: false });
  }

  /**
   * Immediately flushes any pending silence timer and finalizes accumulated speech.
   * Useful for deterministic testing or immediate submission triggers.
   */
  async flushSilenceTimer(): Promise<void> {
    if (this.silenceTimer || this.getAccumulatedSpeech()) {
      await this.finalizePendingCommand();
    }
  }

  /**
   * Finalizes the current accumulated speech buffer and dispatches the command.
   */
  async finalizePendingCommand(): Promise<void> {
    this.clearSilenceTimer();
    const fullText = this.getAccumulatedSpeech();
    this.clearUtteranceBuffer();

    if (!fullText) {
      if (this.isSessionActive && !this.isSpeaking && this.assistantState !== 'PROCESSING') {
        this.setAssistantState('LISTENING');
      }
      return;
    }

    this.lastFinalizedUtterance = cleanVoiceTranscript(fullText);
    this.lastFinalizedAt = Date.now();

    const command = extractCommandFromConversationalPhrase(fullText);
    if (!command) {
      if (this.isSessionActive && !this.isSpeaking) {
        this.setAssistantState('LISTENING');
      }
      return;
    }

    await this.dispatchCommand(command);
  }

  /**
   * Processes speech transcript through the wake-word & continuous recognition state machine.
   * Supports both interim (isFinal: false) and final (isFinal: true) results.
   */
  handleSpeechTranscript(transcript: string, options?: HandleTranscriptOptions): void {
    const raw = (transcript || '').trim();
    if (!raw) return;

    const isFinal = options?.isFinal !== false;
    const immediate = options?.immediate === true;
    const clean = cleanVoiceTranscript(raw);
    if (!clean) return;

    // ─────────────────────────────────────────────────────────────
    // 0. TTS Playback Echo Suppression & Barge-In Interruption
    // ─────────────────────────────────────────────────────────────
    if (this.isSpeaking) {
      // Ignore interim fragments during TTS playback to prevent speaker echo accumulation
      if (!isFinal) return;

      const parsedCtrl = parseSpokenAnswer(clean);
      const isRepeatOrControlBargeIn =
        parsedCtrl?.type === 'control' &&
        (parsedCtrl.command === 'repeat' ||
          parsedCtrl.command === 'repeat_options' ||
          parsedCtrl.command === 'repeat_option_a' ||
          parsedCtrl.command === 'repeat_option_b' ||
          parsedCtrl.command === 'repeat_option_c' ||
          parsedCtrl.command === 'repeat_option_d');

      // Filter out acoustic echo of the assistant's own spoken output (unless it is an explicit stop/repeat command)
      if (
        this.isEchoOfCurrentSpeech(clean) &&
        !isStopSpeakingCommand(clean) &&
        !parseStopListening(clean) &&
        !isRepeatOrControlBargeIn
      ) {
        return;
      }

      // Check for explicit session deactivation during speech ("Stop Listening", "Go to Sleep", etc.)
      if (parseStopListening(clean) || parseVisionWakeWord(clean) === 'deactivate_vision') {
        this.isSpeaking = false;
        this.currentSpokenText = '';
        this.opts.onStopSpeaking?.();
        this.deactivateSession();
        return;
      }

      // Check for TTS silence command ("Stop", "Stop speaking", "Be quiet")
      if (isStopSpeakingCommand(clean)) {
        console.log('[VoiceEngine Speech Interrupted by Stop Command]:', raw);
        this.isSpeaking = false;
        this.currentSpokenText = '';
        this.opts.onStopSpeaking?.();
        if (this.isSessionActive) {
          this.setAssistantState('LISTENING');
        } else {
          this.setAssistantState('IDLE');
        }
        return;
      }

      // Check for actionable barge-in command (including Repeat Question / Repeat Options / Individual Option)
      if (isRepeatOrControlBargeIn || isActionableBargeInCommand(clean)) {
        console.log('[VoiceEngine Barge-In Command During Speech]:', raw);
        this.isSpeaking = false;
        this.currentSpokenText = '';
        this.isSessionActive = true;
        this.opts.onStopSpeaking?.();
        this.setAssistantState('LISTENING');
        // Proceed to process the command below
      } else {
        // Ignore non-actionable speaker echo
        return;
      }
    }

    console.log(`[VoiceEngine Heard in state ${this.assistantState} (final=${isFinal})]:`, raw);

    // ─────────────────────────────────────────────────────────────
    // 1. IDLE / STOPPED / ERROR STATE: Listen ONLY for wake phrase "Hey Vision"
    // ─────────────────────────────────────────────────────────────
    if (!this.isSessionActive || this.assistantState === 'IDLE' || this.assistantState === 'STOPPED') {
      const wakeWord = parseVisionWakeWord(clean);

      if (wakeWord === 'deactivate_vision' || parseStopListening(clean)) {
        // Already inactive
        return;
      }

      const hasWakePhrase =
        wakeWord === 'activate_vision' ||
        /\b(?:hey|hi|hello|okay|ok|hai|activate|start|turn\s+on|enable)\s+vision\b/i.test(clean);

      if (!hasWakePhrase) {
        // Silently ignore background speech when voice assistant has not been woken
        return;
      }

      // If interim wake phrase Only ("Hey Vision"), wait for final or activate immediately
      console.log('[VoiceEngine]: Wake phrase "Hey Vision" detected.');
      this.isSessionActive = true;
      this.clearSilenceTimer();
      this.clearUtteranceBuffer();
      this.setAssistantState('WAKE_DETECTED');
      this.opts.onPlayBeacon?.('listening');

      // Check if user combined wake word, command, and "stop listening" in one utterance
      if (isFinal && parseStopListening(clean)) {
        const command = extractCommandFromConversationalPhrase(raw);
        this.setAssistantState('LISTENING');
        this.opts.onWakeDetected?.(Boolean(command));
        if (command) {
          this.dispatchCommand(command, { deactivateAfter: true }).catch((err) => {
            console.error('[VoiceEngine] Transcript handling error:', err);
          });
        } else {
          this.deactivateSession();
        }
        return;
      }

      // Extract any command spoken immediately after "Hey Vision" (e.g. "Hey Vision, open my dashboard")
      const remainder = extractCommandFromConversationalPhrase(raw);

      if (!remainder) {
        // User said "Hey Vision" alone -> Play greeting ("Yes, I'm listening.") and enter LISTENING
        this.opts.onWakeDetected?.(false);
        if (!this.isSpeaking) {
          this.setAssistantState('LISTENING');
        }
        return;
      }

      // User said "Hey Vision, <command>"
      this.opts.onWakeDetected?.(true);
      this.setAssistantState('LISTENING');

      if (!isFinal) {
        this.currentInterim = remainder;
        this.opts.onSpeechAccumulated?.(this.getAccumulatedSpeech());
        this.resetSilenceTimer();
      } else {
        this.finalizedChunks.push(remainder);
        this.currentInterim = '';
        this.opts.onSpeechAccumulated?.(this.getAccumulatedSpeech());
        if (immediate || this.silenceTimeoutMs <= 0) {
          this.finalizePendingCommand();
        } else {
          this.resetSilenceTimer();
        }
      }
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // 2. ACTIVE SESSION (LISTENING / WAKE_DETECTED / PROCESSING):
    //    Capture commands continuously & detect end-of-speech via silence timer
    // ─────────────────────────────────────────────────────────────

    // Check for explicit deactivation commands ("Stop Listening", "Disable Voice Assistant", "Go to Sleep", "Deactivate Vision")
    if (isFinal && (parseStopListening(clean) || parseVisionWakeWord(clean) === 'deactivate_vision')) {
      console.log('[VoiceEngine]: Explicit deactivation command received:', raw);
      this.clearSilenceTimer();

      const combinedInput = [this.getAccumulatedSpeech(), raw].filter(Boolean).join(' ').trim();
      const pendingCommand = extractCommandFromConversationalPhrase(combinedInput);
      this.clearUtteranceBuffer();

      if (pendingCommand) {
        this.dispatchCommand(pendingCommand, { deactivateAfter: true }).catch((err) => {
          console.error('[VoiceEngine] Transcript handling error:', err);
        });
      } else {
        this.deactivateSession();
      }
      return;
    }

    // Guard against late duplicate final event for an utterance that was already finalized by silence timer
    if (
      isFinal &&
      this.finalizedChunks.length === 0 &&
      !this.currentInterim &&
      clean === this.lastFinalizedUtterance &&
      Date.now() - this.lastFinalizedAt < 500
    ) {
      return;
    }

    // Strip any redundant wake phrase if user repeated "Hey Vision" while already listening
    const isWakeRepeat = parseVisionWakeWord(clean) === 'activate_vision';
    const commandSegment = isWakeRepeat ? extractCommandFromConversationalPhrase(raw) : raw;

    if (!commandSegment) {
      // User just said "Hey Vision" while already active -> re-confirm listening
      if (isFinal) {
        this.opts.onPlayBeacon?.('listening');
        this.opts.onWakeDetected?.(false);
        if (!this.isSpeaking) {
          this.setAssistantState('LISTENING');
        }
      }
      return;
    }

    if (!isFinal) {
      // Real-time interim speech: update live display and reset silence timer
      this.currentInterim = commandSegment;
      this.opts.onSpeechAccumulated?.(this.getAccumulatedSpeech());
      this.resetSilenceTimer();
      return;
    }

    // Finalized speech segment: append to utterance buffer (deduplicating identical consecutive chunks)
    this.currentInterim = '';
    const lastChunk = this.finalizedChunks[this.finalizedChunks.length - 1];
    if (!lastChunk || cleanVoiceTranscript(lastChunk) !== cleanVoiceTranscript(commandSegment)) {
      this.finalizedChunks.push(commandSegment);
    }

    this.opts.onSpeechAccumulated?.(this.getAccumulatedSpeech());

    if (immediate || this.silenceTimeoutMs <= 0) {
      this.finalizePendingCommand();
    } else {
      this.resetSilenceTimer();
    }
  }

  /**
   * Handles recognition errors and interruptions with controlled recovery.
   */
  handleRecognitionError(
    errorType: 'denied' | 'unsupported' | 'network' | 'audio-capture' | 'error',
    customMessage?: string
  ): void {
    if (errorType === 'denied') {
      console.warn('[VoiceEngine] Microphone permission denied.');
      this.isAllowed = false;
      this.isSessionActive = false;
      this.clearSilenceTimer();
      this.clearUtteranceBuffer();
      this.setAssistantState('ERROR');
      this.opts.onError?.(
        'denied',
        customMessage || 'Microphone permission denied. Please allow microphone access or use keyboard input.'
      );
      return;
    }

    if (errorType === 'unsupported') {
      console.warn('[VoiceEngine] SpeechRecognition unsupported.');
      this.isAllowed = false;
      this.isSessionActive = false;
      this.clearSilenceTimer();
      this.clearUtteranceBuffer();
      this.setAssistantState('ERROR');
      this.opts.onError?.(
        'unsupported',
        customMessage || 'Speech recognition is not supported in this browser. Please use keyboard input.'
      );
      return;
    }

    // Transient audio-capture or network interruption: schedule controlled restart without losing session
    const retryDelay = errorType === 'audio-capture' ? 600 : 800;
    if (!this.isDestroyed && this.isAllowed) {
      if (this.restartTimer) clearTimeout(this.restartTimer);
      this.restartTimer = setTimeout(() => {
        this.isStarting = false;
        this.isRunning = false;
        this._startRec();
      }, retryDelay);
    }
  }

  /**
   * Simulates / handles unexpected browser recognition session interruption and recovers gracefully.
   */
  handleRecognitionInterruption(): void {
    this.isRunning = false;
    this.isStarting = false;
    this.rec = null;

    if (!this.isDestroyed && this.isAllowed) {
      if (this.isSessionActive && !this.isSpeaking && !this.isProcessingCommand) {
        this.setAssistantState('LISTENING');
      }
      if (this.restartTimer) clearTimeout(this.restartTimer);
      this.restartTimer = setTimeout(() => {
        this._startRec();
      }, 150);
    }
  }

  // ── Internal Helpers ───────────────────────────────────────────────────────

  private isEchoOfCurrentSpeech(cleanHeard: string): boolean {
    if (!this.currentSpokenText || !cleanHeard) return false;
    if (cleanHeard.length >= 4 && this.currentSpokenText.includes(cleanHeard)) {
      return true;
    }
    return false;
  }

  private setAssistantState(newState: VoiceAssistantState): void {
    this.assistantState = newState;
    this.opts.onStateChange?.(newState);
    this.opts.onListeningChange(newState === 'LISTENING' || newState === 'WAKE_DETECTED');
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private resetSilenceTimer(): void {
    this.clearSilenceTimer();
    if (this.silenceTimeoutMs <= 0) {
      this.finalizePendingCommand();
      return;
    }
    this.silenceTimer = setTimeout(() => {
      this.silenceTimer = null;
      this.finalizePendingCommand();
    }, this.silenceTimeoutMs);
  }

  private clearUtteranceBuffer(): void {
    this.finalizedChunks = [];
    this.currentInterim = '';
    this.opts.onSpeechAccumulated?.('');
  }

  private async dispatchCommand(
    command: string,
    options?: { deactivateAfter?: boolean }
  ): Promise<void> {
    const normalizedCmd = cleanVoiceTranscript(command);
    if (!normalizedCmd) return;

    // Prevent duplicate execution of identical command firing twice within 350ms
    const now = Date.now();
    if (
      normalizedCmd === this.lastExecutedCommand &&
      now - this.lastExecutedAt < 350
    ) {
      return;
    }

    // Queue command if another command is currently being processed
    if (this.isProcessingCommand) {
      this.pendingCommandQueue.push(command);
      return;
    }

    this.isProcessingCommand = true;
    this.lastExecutedCommand = normalizedCmd;
    this.lastExecutedAt = now;

    this.setAssistantState('PROCESSING');

    try {
      await this.opts.onTranscript(command);
    } catch (err) {
      console.error('[VoiceEngine] Transcript handling error:', err);
    } finally {
      this.isProcessingCommand = false;
    }

    if (options?.deactivateAfter) {
      this.deactivateSession();
      return;
    }

    // Process any queued rapid commands sequentially
    if (this.pendingCommandQueue.length > 0 && this.isSessionActive) {
      const nextCmd = this.pendingCommandQueue.shift()!;
      await this.dispatchCommand(nextCmd);
      return;
    }

    // Continuous listening: automatically return to LISTENING if session remains active and TTS is not playing
    if (this.isSessionActive && !this.isSpeaking) {
      this.setAssistantState('LISTENING');
    } else if (
      !this.isSessionActive &&
      !this.isSpeaking &&
      this.assistantState !== 'STOPPED' &&
      this.assistantState !== 'ERROR'
    ) {
      this.setAssistantState('IDLE');
    }
  }

  // ── Internal SpeechRecognition Engine ──────────────────────────────────────

  private _stopRec(): void {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    if (this.rec) {
      try {
        this.rec.abort();
      } catch {
        /* ignore abort error on closed engine */
      }
      this.rec = null;
    }

    this.isRunning = false;
    this.isStarting = false;
    this.consumedFinalIndices.clear();
    this.opts.onListeningChange(false);
  }

  private _startRec(): void {
    if (this.isDestroyed || !this.isAllowed || this.isStarting || this.isRunning) {
      return;
    }

    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    if (typeof window === 'undefined') return;

    const SpeechRec =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      this.handleRecognitionError(
        'unsupported',
        'Speech recognition is not supported in this browser. Please use keyboard input.'
      );
      return;
    }

    try {
      this.isStarting = true;
      this.consumedFinalIndices.clear();
      const rec = new SpeechRec();

      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = this.opts.lang || 'en-IN';
      rec.maxAlternatives = 5;

      rec.onstart = () => {
        this.isStarting = false;
        this.isRunning = true;
        this.opts.onListeningChange(
          this.assistantState === 'LISTENING' || this.assistantState === 'WAKE_DETECTED'
        );
      };

      rec.onresult = (event: any) => {
        if (!this.isAllowed) return;

        let interimTranscript = '';

        for (let idx = event.resultIndex; idx < event.results.length; idx++) {
          const result = event.results[idx];
          if (!result || !result[0]) continue;

          let transcript = (result[0].transcript || '').trim();

          // Check alternatives for exact known commands
          for (let a = 0; a < result.length; a++) {
            const alt = (result[a]?.transcript || '').trim();
            if (/^(ashwin|ashwin sharma|ashwin kumar|ashwin s|ashwin r)$/i.test(alt)) {
              transcript = alt;
              break;
            }
            if (isStopSpeakingCommand(alt) || isActionableBargeInCommand(alt) || parseStopListening(alt)) {
              transcript = alt;
              break;
            }
          }

          if (!transcript) continue;

          if (result.isFinal) {
            if (this.consumedFinalIndices.has(idx)) continue;
            this.consumedFinalIndices.add(idx);
            this.handleSpeechTranscript(transcript, { isFinal: true });
          } else {
            interimTranscript += (interimTranscript ? ' ' : '') + transcript;
          }
        }

        if (interimTranscript) {
          this.handleSpeechTranscript(interimTranscript, { isFinal: false });
        }
      };

      rec.onerror = (e: any) => {
        const error = e.error;

        if (error === 'not-allowed' || error === 'service-not-allowed') {
          this.handleRecognitionError(
            'denied',
            'Microphone permission denied. Please allow microphone access or use keyboard input.'
          );
          return;
        }

        if (error === 'audio-capture') {
          this.handleRecognitionError('audio-capture');
          return;
        }

        if (error === 'network') {
          this.handleRecognitionError('network');
          return;
        }

        // 'no-speech' and 'aborted' are normal lifecycle events handled in onend
      };

      rec.onend = () => {
        this.handleRecognitionInterruption();
      };

      this.rec = rec;
      rec.start();
    } catch (err: any) {
      console.warn('[VoiceEngine] Could not start SpeechRecognition instance:', err);
      this.isStarting = false;
      this.isRunning = false;
      this.rec = null;

      if (!this.isDestroyed && this.isAllowed) {
        if (this.restartTimer) clearTimeout(this.restartTimer);
        this.restartTimer = setTimeout(() => {
          this._startRec();
        }, 600);
      }
    }
  }
}
