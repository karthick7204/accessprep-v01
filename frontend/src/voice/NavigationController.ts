/**
 * ACCESSPREP-X — Global Voice Navigation Controller
 *
 * Priority chain (highest → lowest):
 *   1. Wake-word gating ("Hey Vision" activation & deactivation)
 *   2. Speech setting commands (speed & pitch)
 *   3. Confirmation (Yes / No for active-exam exit prompt)
 *   4. Screen-specific active voice handler (registered by MockExam / VoicePractice / PilotDemo / etc.)
 *   5. System controls (stop speaking, repeat last speech, pause, resume, slower)
 *   6. Active-exam safety guard (intercepts any navigation away from live exam)
 *   7. Global & page-specific assistance intents (where am I / help / what can I do)
 *   8. Global navigation routing (match transcript → screen)
 *   9. Logout intent
 *   10. Unrecognized fallback
 *
 * The controller is a plain class — no React hooks — so it is testable in Node.
 */

import { ScreenId, APPROVED_SCREENS, SCREEN_REGISTRY } from '../types/screens.ts';
import { User } from '../db/database.ts';
import {
  cleanVoiceTranscript,
  normalizePhonetics,
  parseConfirmationIntent,
  parseSystemControl,
  parseAssistanceIntent,
  parseVisionWakeWord,
  parseSpeechSettingCommand,
  SpeechSettingCommand,
  parseFontFaceCommand,
  FontFaceCommand,
  matchScreenNavigation,
  MatchedScreenResult
} from './commandParser.ts';
import { SCREEN_TARGETS } from './commandRegistry.ts';
import { NavigationCommandResult, NavigationContext } from './commandTypes.ts';
import {
  isSubmitExamRequestPhrase,
  NO_ACTIVE_EXAM_SUBMIT_SPEECH
} from './examContextResolver.ts';

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function buildSpokenScreenInfo(screenId: ScreenId): string {
  const meta = SCREEN_REGISTRY[screenId];
  const target = SCREEN_TARGETS[screenId];
  if (!meta || !target) return `Screen ${screenId.replace(/_/g, ' ')}`;
  return `${target.spokenName}. ${target.actionSummary}`;
}

export function buildPageSpecificHelp(screenId: ScreenId): string {
  switch (screenId) {
    case 'login':
      return 'On Candidate Login, you can say: Start Voice Login, Read Instructions, Read All Fields, Explain This Page, Repeat CAPTCHA, Refresh CAPTCHA, Use Keyboard, Use Voice, or Go to Registration.';
    case 'register':
      return 'On Candidate Registration, you can say: Start Voice Registration, Read Instructions, Read All Fields, Explain This Page, Repeat CAPTCHA, Refresh CAPTCHA, Use Keyboard, Use Voice, or Go to Login.';
    case 'dashboard':
      return 'On the Dashboard, you can say: Open Subjects, Open Results, Open Mock Exam, Open Pilot Demo, or Open Revision Planner.';
    case 'topics':
      return 'On Subjects, you can say: Open Numerical Ability, Open Reasoning, Open General Awareness, or Open English.';
    case 'voice_practice':
      return 'In Voice Practice, you can say: Select Subject, Start Practice, Repeat Question, Repeat Options, Option A, Option B, Option C, Option D, or Skip Question.';
    case 'pilot_demo':
      return 'In Pilot Demo Diagnostic, you can say: Start Diagnostic, Repeat Question, Option A, Option B, Option C, Option D, Mark for Review, Clear Response, Exit Examination, Submit Diagnostic, View Analysis, Explain Mistakes, Yes, No, Repeat Explanation, or Skip Explanation. To exit using keyboard at any time, press Alt + Shift + X.';
    case 'mock_exam':
      return 'In Mock Examination, you can say: Read Instructions, Begin Exam, Option A, Option B, Option C, Option D, Mark for Review, Clear Response, Next Question, Time Remaining, Exit Examination, or Submit Exam. To exit using keyboard at any time, press Alt + Shift + X.';
    case 'results':
      return 'On Results, you can say: Read Score, Explain Mistakes, Open Subject Analysis, or Review Answers.';
    case 'revision_planner':
      return 'In Revision Planner, you can say: Select Subject, Start Revision, Show Answer, Easy, Good, Hard, Forgot, or Next Card.';
    case 'ai_tutor':
      return 'In AI Tutor, you can ask any syllabus doubt, say Repeat Answer, Stop Speaking, or Clear Chat.';
    case 'learning_history':
      return 'In Transcript Workspace, you can say: Start Recording to begin live speech transcription, Stop Recording to end dictation, Copy or press Control C to copy your transcript to clipboard, Read Transcript Aloud, Pause Recording, Resume Recording, Save Transcript, Export Transcript, or Clear Transcript.';
    case 'screen_reader_settings':
      return 'In Screen Reader Settings, you can control all buttons by voice. Say: Set speech speed to 1.5x, Speed 2x, Faster speech, or Slower speech to adjust speed. Say: Set pitch to 1.2, Higher pitch, or Normal pitch. Say: Set volume to 80 percent. Say: Test voice to play sample audio. Say: Save preferences to apply settings. Say: Restore defaults to reset. Say: Toggle question reading or Toggle option reading. Say: Open accessibility settings to adjust font face and sizing. Say: Stop listening to deactivate the voice assistant.';
    case 'accessibility_settings':
      return 'In Accessibility Settings, you can control all options by voice. Say: Default font, Hyperlegible font, Dyslexia font, Verdana font, Serif font, or Monospace font to change font face. Say: Normal font, Large font, Extra large font, or Maximum font to scale text. Say: Enable compensatory time or Disable compensatory time for PwD timing. Say: Test voice to test audio. Say: Reset defaults to restore settings. Say: Read current settings to hear your setup. Say: Open screen reader settings to adjust speech audio. Say: Stop listening to deactivate the voice assistant.';
    case 'progress':
      return 'On Progress Analytics, you can say: Read Score Trends, Speed Analysis, or Return to Dashboard.';
    case 'topic_mastery':
      return 'On Topic Mastery, you can say: Search Topic, Practice Weak Topics, or Return to Dashboard.';
    case 'model_evaluation':
      return 'On Model Evaluation, you can say: Run Evaluation, View Confusion Matrix, or Return to Dashboard.';
    case 'model_training':
      return 'On Dataset and Training, you can say: Validate Schema, Start Training, or Return to Dashboard.';
    default:
      return 'You can say: Go to Dashboard, Open Subjects, Voice Practice, Mock Exam, Results, or Screen Reader Settings.';
  }
}

function buildHelpNavigation(user: User | null): string {
  const isAdmin = user?.role === 'admin';
  const candidateScreens = [
    'Dashboard', 'Explore Subjects', 'Voice Practice', 'Pilot Demo Diagnostic', 'Mock Examination',
    'AI Tutor', 'Revision Planner', 'Progress Analytics', 'Topic Mastery',
    'Learning History', 'Accessibility Settings', 'Screen Reader Settings'
  ];
  const adminExtra = isAdmin ? ', Model Evaluation, Dataset and Training' : '';
  return (
    `You can navigate to any of these screens: ${candidateScreens.join(', ')}${adminExtra}. ` +
    `Say the screen name clearly. For example: "Go to AI Tutor", "Open Mock Examination", ` +
    `"Show my progress", or simply "Dashboard".`
  );
}

// ---------------------------------------------------------------------------
// Controller class
// ---------------------------------------------------------------------------

export class NavigationController {
  private context: NavigationContext;
  private navigateFn: (screen: ScreenId) => void;
  private speakFn: (text: string, onEnd?: () => void) => void;
  private stopSpeakFn: () => void;
  private pauseSpeakFn?: () => void;
  private resumeSpeakFn?: () => void;
  private slowDownFn?: () => void;
  private onSpeechSettingFn?: (setting: SpeechSettingCommand) => void;
  private onFontFaceFn?: (font: FontFaceCommand) => void;
  private logoutFn: () => void;
  private onToggleVisionFn?: (active: boolean) => void;
  private onSwitchModeFn?: (mode: 'voice' | 'keyboard' | 'manual') => void;
  private startListeningFn?: () => void;
  private lastSpokenText: string = '';

  constructor(opts: {
    context: NavigationContext;
    navigate: (screen: ScreenId) => void;
    speak: (text: string, onEnd?: () => void) => void;
    stopSpeak?: () => void;
    pauseSpeak?: () => void;
    resumeSpeak?: () => void;
    slowDown?: () => void;
    onSpeechSetting?: (setting: SpeechSettingCommand) => void;
    onFontFace?: (font: FontFaceCommand) => void;
    logout?: () => void;
    onToggleVision?: (active: boolean) => void;
    onSwitchMode?: (mode: 'voice' | 'keyboard' | 'manual') => void;
    startListening?: () => void;
  }) {
    this.context = opts.context;
    this.navigateFn = opts.navigate;
    this.speakFn = opts.speak;
    this.stopSpeakFn = opts.stopSpeak || (() => {});
    this.pauseSpeakFn = opts.pauseSpeak;
    this.resumeSpeakFn = opts.resumeSpeak;
    this.slowDownFn = opts.slowDown;
    this.onSpeechSettingFn = opts.onSpeechSetting;
    this.onFontFaceFn = opts.onFontFace;
    this.logoutFn = opts.logout || (() => {});
    this.onToggleVisionFn = opts.onToggleVision;
    this.onSwitchModeFn = opts.onSwitchMode;
    this.startListeningFn = opts.startListening;
  }

  /** Update context (called on each React render cycle from AccessibilityContext) */
  updateContext(ctx: Partial<NavigationContext>): void {
    this.context = { ...this.context, ...ctx };
  }

  setOnFontFace(fn: (font: FontFaceCommand) => void): void {
    this.onFontFaceFn = fn;
  }

  /** Store last-spoken text so "Repeat" can replay it */
  recordSpokenText(text: string): void {
    this.lastSpokenText = text;
  }

  /**
   * Main entry point: process a voice transcript through the full priority chain.
   * Returns a NavigationCommandResult — the caller decides how to present it.
   */
  async processTranscript(
    rawTranscript: string,
    activeVoiceHandler?: ((t: string, meta?: { confidence?: number }) => boolean | Promise<boolean>) | null,
    meta?: { confidence?: number }
  ): Promise<NavigationCommandResult> {
    const clean = cleanVoiceTranscript(rawTranscript);
    const normalized = normalizePhonetics(clean);

    const base: Omit<NavigationCommandResult, 'status' | 'spokenResponse'> = {
      originalTranscript: rawTranscript,
      cleanTranscript: clean
    };

    // ───────────────────────────────────────────
    // PRIORITY 1: Wake-word Detection & Gating
    // ───────────────────────────────────────────
    const wakeWord = parseVisionWakeWord(clean);

    if (wakeWord === 'activate_vision') {
      if (this.onToggleVisionFn) {
        this.onToggleVisionFn(true);
      }
      this.context.isVisionAssistantActive = true;

      // Check if user combined wake word with a command (e.g. "Hey Vision open mock exam")
      const remainder = clean
        .replace(/^(hey vision assistant|hey vision|activate vision assistant|activate vision|turn on vision|enable vision|start vision|vision assistant|vision|hi vision|hello vision|okay vision|ok vision|a vision|hey visual|hai vision)\s*/i, '')
        .trim();

      if (remainder) {
        return this.processTranscript(remainder, activeVoiceHandler, meta);
      }

      // Time-of-day greeting
      const hour = new Date().getHours();
      let timeGreeting = 'Good evening';
      if (hour < 12) {
        timeGreeting = 'Good morning';
      } else if (hour < 17) {
        timeGreeting = 'Good afternoon';
      }

      // Candidate name personalization (e.g., "Aarav Sharma (Candidate)" -> "Aarav")
      let candidateName = 'Candidate';
      if (this.context.user?.name) {
        const firstName = this.context.user.name.split(' ')[0].replace(/[^\w]/g, '');
        if (firstName) {
          candidateName = firstName;
        }
      }

      let spokenResponse = '';

      if (this.context.currentScreen === 'accessibility_settings') {
        spokenResponse = `${timeGreeting}, ${candidateName}! You are on Accessibility Settings. Here is how you can control this page with your voice. ` +
          `Say "Default font", "Hyperlegible font", "Dyslexia font", "Verdana font", "Serif font", or "Monospace font" to change the website font face. ` +
          `Say "Normal font", "Large font", "Extra large font", or "Maximum font" to scale text size. ` +
          `Say "Enable dyslexia font" or "Disable dyslexia font" to toggle readable typography. ` +
          `Say "Enable compensatory time" or "Disable compensatory time" for 60-minute PwD exam time accommodations. ` +
          `Say "Test voice" to test audio playback, "Reset defaults" to restore standard settings, or "Read current settings" to hear your configuration. ` +
          `Say "Screen reader settings" to adjust speech rate, voice pitch, volume, and reading preferences. ` +
          `Say "Stop" at any time to silence speech. What would you like to adjust?`;
      } else if (this.context.currentScreen === 'screen_reader_settings') {
        spokenResponse = `${timeGreeting}, ${candidateName}! You are on Screen Reader Settings. Here is how you can control this page with your voice. ` +
          `Say "Set speech speed to 1.5x", "Speed 2x", "Speed 0.5x", "Faster speech", or "Slower speech" to adjust reading speed. ` +
          `Say "Set pitch to 1.2", "Higher pitch", "Lower pitch", or "Normal pitch" to tune voice pitch. ` +
          `Say "Set volume to 80 percent" or "Volume 100" to adjust audio volume. ` +
          `Say "Test voice" to hear a sample announcement. ` +
          `Say "Save preferences" or "Save settings" to save your configuration. ` +
          `Say "Restore defaults" to reset speech settings to default values. ` +
          `Say "Toggle question reading" or "Toggle option reading" to customize automatic reading. ` +
          `Say "Accessibility settings" to switch to font face, scaling, and PwD options. ` +
          `Say "Stop" at any time to silence speech. What would you like to adjust?`;
      } else if (this.context.currentScreen === 'learning_history') {
        spokenResponse = `${timeGreeting}, ${candidateName}! You are on Candidate Transcript Workspace. Here is how you can control this page with your voice. ` +
          `Say "Start Recording" to begin live dictation and speech-to-text transcription. ` +
          `Say "Stop Recording" to end dictation. ` +
          `Say "Copy" or press Control C to copy your transcript to clipboard. ` +
          `Say "Read transcript" or "Read aloud" to listen to your recorded text. ` +
          `Say "Pause recording" or "Resume recording" to control dictation. ` +
          `Say "Save transcript" to store your notes, or "Export transcript" to download as a text file. ` +
          `Say "Clear transcript" to erase current text. ` +
          `Say "Open audit log", "Voice recognition log", or "Privacy settings" to switch tabs. ` +
          `Say "Stop" at any time to silence speech. What would you like to do?`;
      } else {
        spokenResponse = `${timeGreeting}, ${candidateName}, welcome back! I am your Vision Assistant. ` +
          `Here is what you can do. ` +
          `Say "Start practice" or "Start exam" to begin voice practice questions. ` +
          `Say "Mock exam" or "Mock test" for a full timed mock examination. ` +
          `Say "AI tutor" or "Tutor" to ask any subject doubt. ` +
          `Say "Revision planner" or "Tuition planner" to review flashcards. ` +
          `Say "Transcript workspace" to dictate notes and transcribe speech in real time. ` +
          `Say "My progress" or "Analytics" to see your score trends. ` +
          `Say "Topic mastery" to view your skill levels. ` +
          `Say "Dashboard" or "Read dashboard" to return to the home screen. ` +
          `Say "Subjects" to explore the SSC MTS syllabus. ` +
          `Say "Accessibility settings" to customize font face, typography scaling, and compensatory time. ` +
          `Say "Screen reader settings" to adjust speech rate, voice pitch, volume, and reading preferences. ` +
          `You can also use keyboard shortcuts: Alt+D for Dashboard, Alt+P for Voice Practice, Alt+M for Mock Exam, Alt+T for AI Tutor, Alt+R for Revision Planner, and Alt+Arrow keys to move between screens. ` +
          `On any page, say "Stop" to stop reading and start listening. ` +
          `What would you like to do?`;
      }

      return {
        ...base,
        status: 'system_handled',
        spokenResponse
      };
    }

    if (wakeWord === 'deactivate_vision') {
      if (this.onToggleVisionFn) {
        this.onToggleVisionFn(false);
      }
      this.context.isVisionAssistantActive = false;
      return {
        ...base,
        status: 'system_handled',
        spokenResponse: 'Vision Assistant deactivated.'
      };
    }

    // PRIORITY 1.5: Global Accessibility Mode Switching Commands
    if (
      clean === 'switch to vision mode' ||
      clean === 'switch to voice mode' ||
      clean === 'vision mode' ||
      clean === 'voice mode' ||
      clean === 'activate vision mode' ||
      clean === 'activate voice mode'
    ) {
      if (this.onSwitchModeFn) this.onSwitchModeFn('voice');
      return {
        ...base,
        status: 'system_handled',
        spokenResponse: 'Voice Assistance Mode activated. I will guide you through the application.'
      };
    }

    if (
      clean === 'switch to keyboard mode' ||
      clean === 'switch to shortcut mode' ||
      clean === 'keyboard mode' ||
      clean === 'shortcut mode' ||
      clean === 'keyboard shortcut mode'
    ) {
      if (this.onSwitchModeFn) this.onSwitchModeFn('keyboard');
      return {
        ...base,
        status: 'system_handled',
        spokenResponse: 'Keyboard Shortcut Mode activated. Use Alt+K, Alt+V, or Alt+M to manage modes, and Alt+H for keyboard help.'
      };
    }

    if (
      clean === 'switch to manual mode' ||
      clean === 'manual mode' ||
      clean === 'independent mode' ||
      clean === 'independent manual mode' ||
      clean === 'i will do it myself' ||
      clean === 'ill do it myself' ||
      clean === 'do it myself'
    ) {
      if (this.onSwitchModeFn) this.onSwitchModeFn('manual');
      return {
        ...base,
        status: 'system_handled',
        spokenResponse: 'Independent Manual Mode activated. Automatic speech and microphone are turned off.'
      };
    }

    // In wake-word only mode (isVisionAssistantActive === false), ignore global speech silently
    // UNLESS an active screen-level voice handler is registered (e.g. PilotDemo, MockExam, VoicePractice)
    if (this.context.isVisionAssistantActive === false && !activeVoiceHandler) {
      return {
        ...base,
        status: 'system_handled',
        spokenResponse: ''
      };
    }

    // ───────────────────────────────────────────
    // PRIORITY 2: Speech Setting Adjustments (Rate & Pitch)
    // ───────────────────────────────────────────
    const speechSetting = parseSpeechSettingCommand(clean);
    if (speechSetting) {
      if (this.onSpeechSettingFn) {
        this.onSpeechSettingFn(speechSetting);
      }
      const response =
        speechSetting.type === 'rate'
          ? `Speech rate set to ${speechSetting.value}x speed.`
          : `Speech pitch set to ${speechSetting.value}.`;
      return {
        ...base,
        status: 'system_handled',
        spokenResponse: response
      };
    }

    // ───────────────────────────────────────────
    // PRIORITY 2.5: Font Face Setting Adjustments
    // ───────────────────────────────────────────
    const fontCommand = parseFontFaceCommand(clean);
    if (fontCommand) {
      if (this.onFontFaceFn) {
        this.onFontFaceFn(fontCommand);
      }
      const names: Record<FontFaceCommand, string> = {
        system: 'System Default Inter',
        hyperlegible: 'Atkinson Hyperlegible',
        opendyslexic: 'OpenDyslexic',
        verdana: 'Verdana',
        serif: 'Georgia Serif',
        mono: 'Monospace'
      };
      return {
        ...base,
        status: 'system_handled',
        spokenResponse: `Font face changed to ${names[fontCommand]}.`
      };
    }

    // ───────────────────────────────────────────
    // PRIORITY 3: Active Exam Exit Confirmation (Yes / No)
    // ───────────────────────────────────────────
    if (this.context.pendingExamExit) {
      const confirmation = parseConfirmationIntent(clean);

      if (confirmation === 'yes') {
        const dest = this.context.pendingExamExit.destination;
        const title = this.context.pendingExamExit.title;
        this.context.pendingExamExit = null;
        this.context.isExamActive = false;

        const response = `Pausing examination. Navigating to ${title}.`;
        this.navigateFn(dest);
        return { ...base, status: 'success', destination: dest, destinationTitle: title, spokenResponse: response };
      }

      if (confirmation === 'no') {
        this.context.pendingExamExit = null;
        const response = `Staying in the examination. Good luck! The timer is still running.`;
        return { ...base, status: 'local_handled', spokenResponse: response };
      }

      // Ambiguous — remind user of the pending confirmation
      const pending = this.context.pendingExamExit;
      const reminder =
        `An examination is in progress. I am still waiting for your answer. ` +
        `Say Yes to pause and go to ${pending.title}, or say No to stay and continue the exam.`;
      return { ...base, status: 'ambiguous', spokenResponse: reminder };
    }

    // ───────────────────────────────────────────
    // PRIORITY 3.5: Universal Stop Speaking (Interprets "stop" immediately across all pages)
    // ───────────────────────────────────────────
    const systemIntent = parseSystemControl(clean);
    if (systemIntent === 'stop_speaking') {
      this.stopSpeakFn();
      if (this.startListeningFn) {
        this.startListeningFn();
      }
      if (activeVoiceHandler) {
        try {
          await activeVoiceHandler(rawTranscript, meta);
        } catch {}
      }
      return { ...base, status: 'system_handled', spokenResponse: '' };
    }

    // ───────────────────────────────────────────
    // PRIORITY 4: Screen-specific voice handler FIRST
    // Allows question screens to intercept "repeat question", "repeat options", etc.
    // ───────────────────────────────────────────
    if (activeVoiceHandler) {
      try {
        const handled = await activeVoiceHandler(rawTranscript, meta);
        if (handled) {
          return { ...base, status: 'local_handled', spokenResponse: '' };
        }
      } catch (err) {
        console.warn('[NavigationController] Screen handler error:', err);
      }
    }

    // ───────────────────────────────────────────
    // PRIORITY 5: System controls (pause, resume, slower, repeat)
    // ───────────────────────────────────────────

    if (systemIntent === 'pause_reading') {
      if (this.pauseSpeakFn) {
        this.pauseSpeakFn();
      }
      return { ...base, status: 'system_handled', spokenResponse: '' };
    }

    if (systemIntent === 'resume_reading') {
      if (this.resumeSpeakFn) {
        this.resumeSpeakFn();
      }
      return { ...base, status: 'system_handled', spokenResponse: '' };
    }

    if (systemIntent === 'read_slower') {
      if (this.slowDownFn) {
        this.slowDownFn();
      }
      return { ...base, status: 'system_handled', spokenResponse: '' };
    }

    if (systemIntent === 'repeat') {
      const textToRepeat = this.lastSpokenText || 'Nothing has been spoken yet.';
      return { ...base, status: 'system_handled', spokenResponse: textToRepeat };
    }

    if (systemIntent === 'scroll_down') {
      if (typeof window !== 'undefined') {
        const scrollTarget = document.getElementById('main-content')?.parentElement || window;
        scrollTarget.scrollBy({ top: 350, behavior: 'smooth' });
      }
      return { ...base, status: 'system_handled', spokenResponse: 'Scrolled down.' };
    }

    if (systemIntent === 'scroll_up') {
      if (typeof window !== 'undefined') {
        const scrollTarget = document.getElementById('main-content')?.parentElement || window;
        scrollTarget.scrollBy({ top: -350, behavior: 'smooth' });
      }
      return { ...base, status: 'system_handled', spokenResponse: 'Scrolled up.' };
    }

    // ───────────────────────────────────────────
    // PRIORITY 6: Active exam safety guard
    // ───────────────────────────────────────────
    const isNavigationAttempt = matchScreenNavigation(rawTranscript, this.context.currentScreen);
    const assistanceIntent = parseAssistanceIntent(clean);
    const isLogout = clean === 'log out' || clean === 'logout' || clean === 'sign out' || clean === 'sign off' || clean === 'exit portal' || clean === 'quit';

    if (
      this.context.isExamActive &&
      (this.context.currentScreen === 'mock_exam' || this.context.currentScreen === 'pilot_demo') &&
      (isNavigationAttempt || (isLogout && this.context.isExamActive))
    ) {
      const destinationTitle = isNavigationAttempt
        ? isNavigationAttempt.target.spokenName
        : 'the logout page';
      const destination: ScreenId = isNavigationAttempt
        ? isNavigationAttempt.target.screenId
        : 'login';

      this.context.pendingExamExit = { destination, title: destinationTitle };

      const response =
        `An examination is in progress. ` +
        `Do you want to submit your answers and exit to ${destinationTitle}? ` +
        `You can press Alt + Shift + X or say Exit Exam to exit. ` +
        `Say Yes to submit and leave, or No to continue the examination.`;

      return {
        ...base,
        status: 'blocked_by_active_exam',
        destination,
        destinationTitle,
        spokenResponse: response,
        needsConfirmation: true
      };
    }

    // ───────────────────────────────────────────
    // PRIORITY 7: Global assistance & Page-specific help
    // ───────────────────────────────────────────
    if (assistanceIntent) {
      return this._handleAssistance(assistanceIntent, base);
    }

    // ───────────────────────────────────────────
    // PRIORITY 8: Global navigation routing
    // ───────────────────────────────────────────
    if (isNavigationAttempt) {
      return this._handleNavigation(isNavigationAttempt, base);
    }

    // ───────────────────────────────────────────
    // PRIORITY 8.5: Exam Submission Command when No Exam is Active (Context = NONE)
    // ───────────────────────────────────────────
    if (
      isSubmitExamRequestPhrase(clean) ||
      clean === 'confirm submission' ||
      clean === 'cancel submission'
    ) {
      return {
        ...base,
        status: 'system_handled',
        spokenResponse: NO_ACTIVE_EXAM_SUBMIT_SPEECH
      };
    }

    // ───────────────────────────────────────────
    // PRIORITY 9: Logout intent (outside exam)
    // ───────────────────────────────────────────
    if (isLogout) {
      this.logoutFn();
      return {
        ...base,
        status: 'system_handled',
        spokenResponse: 'Logging out of the candidate portal. Goodbye.'
      };
    }

    // ───────────────────────────────────────────
    // PRIORITY 10: Unrecognized fallback
    // ───────────────────────────────────────────
    return {
      ...base,
      status: 'unrecognized',
      spokenResponse:
        `Sorry, I did not understand "${rawTranscript}". ` +
        `Try saying "Help" for this screen's commands, or "Go to Dashboard".`
    };
  }

  // ---------------------------------------------------------------------------
  // Internal Handlers
  // ---------------------------------------------------------------------------

  private _handleAssistance(
    intent: 'where_am_i' | 'what_can_i_do' | 'help_navigation' | 'go_back' | 'logout',
    base: Omit<NavigationCommandResult, 'status' | 'spokenResponse'>
  ): NavigationCommandResult {
    const { currentScreen, user, historyStack } = this.context;

    switch (intent) {
      case 'where_am_i': {
        const info = buildSpokenScreenInfo(currentScreen);
        return { ...base, status: 'assistance_provided', spokenResponse: `You are on the ${info}` };
      }

      case 'what_can_i_do': {
        const pageHelp = buildPageSpecificHelp(currentScreen);
        return {
          ...base,
          status: 'assistance_provided',
          spokenResponse: pageHelp
        };
      }

      case 'help_navigation': {
        return {
          ...base,
          status: 'assistance_provided',
          spokenResponse: buildHelpNavigation(user)
        };
      }

      case 'go_back': {
        if (historyStack.length >= 2) {
          const previous = historyStack[historyStack.length - 2];
          const title = SCREEN_TARGETS[previous]?.spokenName || previous;
          this.navigateFn(previous);
          return {
            ...base,
            status: 'success',
            destination: previous,
            destinationTitle: title,
            spokenResponse: `Going back to ${title}.`
          };
        }
        // No history — fall back to dashboard
        const dashTitle = SCREEN_TARGETS['dashboard'].spokenName;
        this.navigateFn('dashboard');
        return {
          ...base,
          status: 'success',
          destination: 'dashboard',
          destinationTitle: dashTitle,
          spokenResponse: `Taking you back to the ${dashTitle}.`
        };
      }

      case 'logout': {
        this.logoutFn();
        return {
          ...base,
          status: 'system_handled',
          spokenResponse: 'Logging out of the candidate portal. Goodbye.'
        };
      }
    }
  }

  private _handleNavigation(
    match: MatchedScreenResult,
    base: Omit<NavigationCommandResult, 'status' | 'spokenResponse'>
  ): NavigationCommandResult {
    const { target, subjectFilter, subjectLabel } = match;
    const { user } = this.context;

    // Role check: admin-only screen attempted by candidate
    if (target.isAdminOnly && user?.role !== 'admin') {
      const response =
        `Access to ${target.spokenName} is restricted to academic reviewers and administrators. ` +
        `You are signed in as a candidate.`;
      return {
        ...base,
        status: 'forbidden_role',
        destination: target.screenId,
        destinationTitle: target.spokenName,
        spokenResponse: response
      };
    }

    // Auth check: screen requires login, but no session
    if (target.requiresAuth && !user) {
      this.navigateFn('login');
      return {
        ...base,
        status: 'unauthenticated',
        destination: 'login',
        destinationTitle: 'Candidate Login',
        spokenResponse: `Please sign in to access ${target.spokenName}. Opening the login screen.`
      };
    }

    // Navigate to target screen
    this.navigateFn(target.screenId);

    const spokenSubject = subjectLabel ? ` for ${subjectLabel}` : '';
    let response = `Opening ${target.spokenName}${spokenSubject}.`;

    if (target.screenId === 'learning_history') {
      response = `Opening ${target.spokenName}. This workspace converts everything you say into text in real time. After it opens, say "Start Recording" to begin dictating, and "Stop Recording" when done. Say "Copy" or press Control C to copy your transcript.`;
    }

    return {
      ...base,
      status: 'success',
      destination: target.screenId,
      destinationTitle: target.spokenName,
      spokenResponse: response
    };
  }
}

/**
 * Helper to explain why a navigation command was blocked.
 * Supports both:
 * 1. getScreenBlockReason(result: NavigationCommandResult): string
 * 2. getScreenBlockReason(screenId: ScreenId, user: User | null): string | null
 */
export function getScreenBlockReason(
  screenIdOrResult: ScreenId | NavigationCommandResult,
  user?: User | null
): string | null {
  if (typeof screenIdOrResult === 'object' && screenIdOrResult !== null && 'status' in screenIdOrResult) {
    switch (screenIdOrResult.status) {
      case 'blocked_by_active_exam':
        return 'An examination is currently active. Pause or submit before leaving.';
      case 'forbidden_role':
        return 'This screen is restricted to administrators and reviewers.';
      case 'unauthenticated':
        return 'You must sign in to access this screen.';
      default:
        return '';
    }
  }

  const screenId = screenIdOrResult as ScreenId;
  const target = SCREEN_TARGETS[screenId];
  if (!target) return `Screen "${screenId}" is not in the registry.`;

  if (target.isAdminOnly && user?.role !== 'admin') {
    return `Admin only: ${target.spokenName}`;
  }

  if (target.requiresAuth && !user) {
    return `Login required: ${target.spokenName}`;
  }

  return null;
}
