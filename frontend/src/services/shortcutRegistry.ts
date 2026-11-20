/**
 * ACCESSPREP-X — Centralized Keyboard Shortcut Registry
 * ============================================================================
 * Single authoritative source of truth for all keyboard shortcuts in the application.
 * Defines the real, verified shortcuts, their exact destinations, scopes, and descriptions.
 * The Keyboard Shortcuts Help Dialog and central keyboard event listeners generate
 * their state directly from this registry.
 */

import { ScreenId, SCREEN_REGISTRY } from '../types/screens.ts';

export type ShortcutScope =
  | 'global'
  | 'auth'
  | 'dashboard'
  | 'topics'
  | 'voice_practice'
  | 'mock_exam'
  | 'pilot_demo'
  | 'results'
  | 'ai_tutor'
  | 'revision_planner'
  | 'progress'
  | 'accessibility_settings'
  | 'screen_reader_settings'
  | 'learning_history';

export type ShortcutCategory = 'navigation' | 'accessibility' | 'auth' | 'practice_exam';

export interface ShortcutDefinition {
  id: string;
  keyLabel: string;             // Display representation, e.g. "Alt + D" or "K"
  key: string;                  // Base key, e.g. "d" or "k" or "F2"
  code?: string;                // e.g. "Space"
  altKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  action: string;               // Short action title, e.g. "Candidate Dashboard"
  description: string;          // Full human-readable description
  destination?: ScreenId;       // Exact target ScreenId if it navigates
  scope: ShortcutScope;         // Specific screen or 'global' / 'auth'
  requiresAuth: boolean;
  enabled: boolean;
  category: ShortcutCategory;
}

export const MASTER_SHORTCUT_REGISTRY: readonly ShortcutDefinition[] = [
  // =========================================================================
  // 1. GLOBAL ACCESSIBILITY & ASSISTANT CONTROLS (Available Everywhere)
  // =========================================================================
  {
    id: 'global-vision-assistant-toggle',
    keyLabel: 'Alt + Space',
    key: ' ',
    code: 'Space',
    altKey: true,
    action: 'Activate Vision Voice Assistant',
    description: 'Toggles the speech-enabled Vision Assistant microphone listening state on or off.',
    scope: 'global',
    requiresAuth: false,
    enabled: true,
    category: 'accessibility'
  },
  {
    id: 'global-voice-mode-toggle',
    keyLabel: 'Alt + V',
    key: 'v',
    altKey: true,
    action: 'Switch to Voice Assistance Mode',
    description: 'Activates full Voice Assistance Mode with automatic speech announcements and always-on mic.',
    scope: 'global',
    requiresAuth: false,
    enabled: true,
    category: 'accessibility'
  },
  {
    id: 'global-keyboard-mode-toggle',
    keyLabel: 'Alt + K',
    key: 'k',
    altKey: true,
    action: 'Switch to Keyboard Shortcut Mode',
    description: 'Switches interaction mode to high-visibility Keyboard Shortcut Mode without speech interruptions.',
    scope: 'global',
    requiresAuth: true,
    enabled: true,
    category: 'accessibility'
  },
  {
    id: 'global-manual-mode-toggle',
    keyLabel: 'Alt + M',
    key: 'm',
    altKey: true,
    action: 'Switch to Independent Manual Mode',
    description: 'Disables synthetic audio and speech recognition for NVDA/JAWS screen-reader users.',
    scope: 'global',
    requiresAuth: true,
    enabled: true,
    category: 'accessibility'
  },
  {
    id: 'global-stop-speech',
    keyLabel: 'Escape',
    key: 'Escape',
    action: 'Stop Speech / Close Dialog',
    description: 'Immediately halts ongoing speech synthesis, closes open dialogs, or unfocuses active text inputs.',
    scope: 'global',
    requiresAuth: false,
    enabled: true,
    category: 'accessibility'
  },
  {
    id: 'global-shortcut-reference',
    keyLabel: 'K',
    key: 'k',
    action: 'Open Keyboard Shortcuts Help',
    description: 'Opens this accessible, context-aware keyboard shortcuts reference dialog.',
    scope: 'global',
    requiresAuth: false,
    enabled: true,
    category: 'accessibility'
  },

  // =========================================================================
  // 2. AUTHENTICATION & LOGIN SHORTCUTS (Login & Registration Screens)
  // =========================================================================
  {
    id: 'auth-focus-email',
    keyLabel: 'L',
    key: 'l',
    action: 'Focus Email / Roll Number Field',
    description: 'Directly moves keyboard focus to the Candidate Identifier field without mouse navigation.',
    destination: 'login',
    scope: 'auth',
    requiresAuth: false,
    enabled: true,
    category: 'auth'
  },
  {
    id: 'auth-focus-password',
    keyLabel: 'P',
    key: 'p',
    action: 'Focus Password Field',
    description: 'Focuses confidential password input. Passwords are typed privately and never spoken aloud.',
    destination: 'login',
    scope: 'auth',
    requiresAuth: false,
    enabled: true,
    category: 'auth'
  },
  {
    id: 'auth-auto-write-captcha',
    keyLabel: 'C',
    key: 'c',
    action: 'Auto-Fill Audio Verification Code',
    description: 'Automatically transcribes and enters the 4-digit audio verification challenge for blind candidates.',
    destination: 'login',
    scope: 'auth',
    requiresAuth: false,
    enabled: true,
    category: 'auth'
  },
  {
    id: 'auth-play-captcha',
    keyLabel: 'R',
    key: 'r',
    action: 'Play Audio Verification Code Aloud',
    description: 'Speaks the 4-digit human verification challenge aloud at a slow, clear cadence.',
    destination: 'login',
    scope: 'auth',
    requiresAuth: false,
    enabled: true,
    category: 'auth'
  },
  {
    id: 'auth-reread-field',
    keyLabel: 'F2',
    key: 'F2',
    action: 'Re-Read Current Field Value',
    description: 'Reads out the spelling of the current email, password presence, or verification digits.',
    scope: 'auth',
    requiresAuth: false,
    enabled: true,
    category: 'auth'
  },
  {
    id: 'auth-confirm-yes',
    keyLabel: 'Y',
    key: 'y',
    action: 'Confirm Field Value or Sign In',
    description: 'Approves the spelled email address or approves the final pre-submit confirmation.',
    scope: 'auth',
    requiresAuth: false,
    enabled: true,
    category: 'auth'
  },
  {
    id: 'auth-confirm-no',
    keyLabel: 'N',
    key: 'n',
    action: 'Clear Field or Cancel Submission',
    description: 'Clears an unconfirmed field to re-enter, or cancels submission to review inputs.',
    scope: 'auth',
    requiresAuth: false,
    enabled: true,
    category: 'auth'
  },
  {
    id: 'auth-submit-review',
    keyLabel: 'S',
    key: 's',
    action: 'Review Details & Submit Login',
    description: 'Triggers pre-submit confirmation check and authenticates candidate into the portal.',
    scope: 'auth',
    requiresAuth: false,
    enabled: true,
    category: 'auth'
  },
  {
    id: 'auth-help',
    keyLabel: 'H',
    key: 'h',
    action: 'Login & Verification Help',
    description: 'Reads complete auditory instructions for logging in and completing the accessible CAPTCHA.',
    scope: 'auth',
    requiresAuth: false,
    enabled: true,
    category: 'auth'
  },

  // =========================================================================
  // 3. CORE SCREEN NAVIGATION SHORTCUTS (Authenticated Candidate Portal)
  // =========================================================================
  {
    id: 'nav-dashboard',
    keyLabel: 'Alt + D',
    key: 'd',
    altKey: true,
    action: 'Candidate Dashboard',
    description: 'Navigates to the Candidate Assessment Dashboard (Screen 4).',
    destination: 'dashboard',
    scope: 'global',
    requiresAuth: true,
    enabled: true,
    category: 'navigation'
  },
  {
    id: 'nav-topics',
    keyLabel: 'Alt + S',
    key: 's',
    altKey: true,
    action: 'Subject & Topic Explorer',
    description: 'Navigates to the Subject & Topic Explorer (Screen 5) covering all 4 SSC MTS sections.',
    destination: 'topics',
    scope: 'global',
    requiresAuth: true,
    enabled: true,
    category: 'navigation'
  },
  {
    id: 'nav-voice-practice',
    keyLabel: 'Alt + P',
    key: 'p',
    altKey: true,
    action: 'Voice-First Practice Session',
    description: 'Navigates to Voice-First Practice (Screen 6) with immediate acoustic feedback.',
    destination: 'voice_practice',
    scope: 'global',
    requiresAuth: true,
    enabled: true,
    category: 'navigation'
  },
  {
    id: 'nav-pilot-demo',
    keyLabel: 'Alt + O',
    key: 'o',
    altKey: true,
    action: 'Pilot Demo Diagnostic',
    description: 'Navigates to the 20-question Pilot Demo Diagnostic (Screen 17).',
    destination: 'pilot_demo',
    scope: 'global',
    requiresAuth: true,
    enabled: true,
    category: 'navigation'
  },
  {
    id: 'nav-mock-exam',
    keyLabel: 'Alt + E',
    key: 'e',
    altKey: true,
    action: 'Accessible Mock Examination',
    description: 'Navigates to the full timed SSC MTS Mock Examination (Screen 7).',
    destination: 'mock_exam',
    scope: 'global',
    requiresAuth: true,
    enabled: true,
    category: 'navigation'
  },
  {
    id: 'nav-results',
    keyLabel: 'Alt + U',
    key: 'u',
    altKey: true,
    action: 'Results & Explanations',
    description: 'Navigates to Examination Results & Step-by-Step Academic Explanations (Screen 8).',
    destination: 'results',
    scope: 'global',
    requiresAuth: true,
    enabled: true,
    category: 'navigation'
  },
  {
    id: 'nav-ai-tutor',
    keyLabel: 'Alt + T',
    key: 't',
    altKey: true,
    action: 'AI Syllabus Tutor',
    description: 'Navigates to the AI Syllabus Tutor (Screen 9) for concept clarification and inquiries.',
    destination: 'ai_tutor',
    scope: 'global',
    requiresAuth: true,
    enabled: true,
    category: 'navigation'
  },
  {
    id: 'nav-revision-planner',
    keyLabel: 'Alt + R',
    key: 'r',
    altKey: true,
    action: 'Revision Planner',
    description: 'Navigates to the Spaced Repetition Revision Planner (Screen 10).',
    destination: 'revision_planner',
    scope: 'global',
    requiresAuth: true,
    enabled: true,
    category: 'navigation'
  },
  {
    id: 'nav-progress',
    keyLabel: 'Alt + A',
    key: 'a',
    altKey: true,
    action: 'Progress Analytics',
    description: 'Navigates to Progress & Performance Analytics Dashboard (Screen 11).',
    destination: 'progress',
    scope: 'global',
    requiresAuth: true,
    enabled: true,
    category: 'navigation'
  },
  {
    id: 'nav-learning-history',
    keyLabel: 'Alt + H',
    key: 'h',
    altKey: true,
    action: 'Transcript Workspace',
    description: 'Navigates to Candidate Learning History & Transcript Workspace (Screen 14).',
    destination: 'learning_history',
    scope: 'global',
    requiresAuth: true,
    enabled: true,
    category: 'navigation'
  },
  {
    id: 'nav-accessibility-settings',
    keyLabel: 'Alt + C',
    key: 'c',
    altKey: true,
    action: 'Accessibility Settings',
    description: 'Navigates to Accessibility Settings (Screen 13) for high contrast and font scaling.',
    destination: 'accessibility_settings',
    scope: 'global',
    requiresAuth: false,
    enabled: true,
    category: 'navigation'
  },
  {
    id: 'nav-screen-reader-settings',
    keyLabel: 'Alt + W',
    key: 'w',
    altKey: true,
    action: 'Screen Reader Settings',
    description: 'Navigates to Screen Reader Settings (Screen 18) for voice pitch, rate, and audio speed.',
    destination: 'screen_reader_settings',
    scope: 'global',
    requiresAuth: false,
    enabled: true,
    category: 'navigation'
  },
  {
    id: 'nav-logout',
    keyLabel: 'Alt + L',
    key: 'l',
    altKey: true,
    action: 'Sign Out / Logout',
    description: 'Signs out the current candidate session and returns safely to the login screen.',
    destination: 'login',
    scope: 'global',
    requiresAuth: true,
    enabled: true,
    category: 'navigation'
  },

  // =========================================================================
  // 4. EXAMINATION & PRACTICE ACTIVE CONTROLS
  // =========================================================================
  {
    id: 'exam-opt-a',
    keyLabel: 'A or 1',
    key: 'a',
    action: 'Select Option A',
    description: 'Selects or answers Option A for the current practice or examination question.',
    scope: 'voice_practice',
    requiresAuth: true,
    enabled: true,
    category: 'practice_exam'
  },
  {
    id: 'exam-opt-b',
    keyLabel: 'B or 2',
    key: 'b',
    action: 'Select Option B',
    description: 'Selects or answers Option B for the current practice or examination question.',
    scope: 'voice_practice',
    requiresAuth: true,
    enabled: true,
    category: 'practice_exam'
  },
  {
    id: 'exam-opt-c',
    keyLabel: 'C or 3',
    key: 'c',
    action: 'Select Option C',
    description: 'Selects or answers Option C for the current practice or examination question.',
    scope: 'voice_practice',
    requiresAuth: true,
    enabled: true,
    category: 'practice_exam'
  },
  {
    id: 'exam-opt-d',
    keyLabel: 'D or 4',
    key: 'd',
    action: 'Select Option D',
    description: 'Selects or answers Option D for the current practice or examination question.',
    scope: 'voice_practice',
    requiresAuth: true,
    enabled: true,
    category: 'practice_exam'
  },
  {
    id: 'exam-read-question',
    keyLabel: 'Space',
    key: ' ',
    action: 'Read Question Aloud (Full Question with Options)',
    description: 'Reads the active question with section prefix and all four options (auto-read mode, Space bar).',
    scope: 'mock_exam',
    requiresAuth: true,
    enabled: true,
    category: 'practice_exam'
  },
  {
    id: 'exam-repeat-question',
    keyLabel: 'R',
    key: 'r',
    action: 'Repeat Question Text Only',
    description: 'Speaks ONLY the question text — no prefix, no question number, no options. Works in Voice Practice, Mock Exam, and Pilot Demo.',
    scope: 'voice_practice',
    requiresAuth: true,
    enabled: true,
    category: 'practice_exam'
  },
  {
    id: 'exam-repeat-options',
    keyLabel: 'O',
    key: 'o',
    action: 'Read Options Aloud (Repeat Options Only)',
    description: 'Speaks ONLY the answer options A, B, C, D — no "The options are:" intro. Works in Voice Practice, Mock Exam, and Pilot Demo.',
    scope: 'voice_practice',
    requiresAuth: true,
    enabled: true,
    category: 'practice_exam'
  },
  {
    id: 'exam-mark-review',
    keyLabel: 'M',
    key: 'm',
    action: 'Mark for Review',
    description: 'Flags the current question for review before final submission.',
    scope: 'mock_exam',
    requiresAuth: true,
    enabled: true,
    category: 'practice_exam'
  },
  {
    id: 'exam-read-explanation',
    keyLabel: 'E',
    key: 'e',
    action: 'Read Academic Explanation',
    description: 'Reads the step-by-step academic explanation and official derivation aloud.',
    scope: 'voice_practice',
    requiresAuth: true,
    enabled: true,
    category: 'practice_exam'
  },
  {
    id: 'exam-request-exit',
    keyLabel: 'Alt + Shift + X',
    key: 'x',
    altKey: true,
    shiftKey: true,
    action: 'Exit Examination & Submit',
    description: 'Requests accessible confirmation to submit your answers and exit the active Mock Exam or Pilot Demo.',
    scope: 'mock_exam',
    requiresAuth: true,
    enabled: true,
    category: 'practice_exam'
  }
];

/**
 * Get verified shortcuts filtered context-aware by the user's current screen and auth status.
 */
export function getShortcutsForContext(
  currentScreen: ScreenId,
  isAuthenticated: boolean
): {
  screenSpecificShortcuts: ShortcutDefinition[];
  globalNavigationShortcuts: ShortcutDefinition[];
  accessibilityShortcuts: ShortcutDefinition[];
} {
  const isAuthScreen = currentScreen === 'login' || currentScreen === 'register';

  // 1. Accessibility & system control shortcuts
  const accessibilityShortcuts = MASTER_SHORTCUT_REGISTRY.filter((s) => {
    if (s.category !== 'accessibility') return false;
    if (s.requiresAuth && !isAuthenticated) return false;
    return true;
  });

  // 2. Screen-specific shortcuts
  const screenSpecificShortcuts = MASTER_SHORTCUT_REGISTRY.filter((s) => {
    if (isAuthScreen) {
      return s.scope === 'auth';
    }
    if (s.scope === currentScreen) {
      return true;
    }
    // Also include exam shortcuts on mock_exam and pilot_demo
    if (
      (currentScreen === 'mock_exam' || currentScreen === 'pilot_demo' || currentScreen === 'voice_practice') &&
      s.category === 'practice_exam'
    ) {
      return true;
    }
    return false;
  });

  // 3. Navigation shortcuts
  const globalNavigationShortcuts = MASTER_SHORTCUT_REGISTRY.filter((s) => {
    if (s.category !== 'navigation') return false;
    if (s.requiresAuth && !isAuthenticated) return false;
    // Don't show navigation on login screen if user is unauthenticated
    if (isAuthScreen && !isAuthenticated) return false;
    return true;
  });

  return {
    screenSpecificShortcuts,
    globalNavigationShortcuts,
    accessibilityShortcuts
  };
}

/**
 * Format a list of shortcut definitions into a clean spoken summary for Voice Assistant and screen readers.
 */
export function formatShortcutsForSpeech(shortcuts: ShortcutDefinition[]): string {
  if (!shortcuts || shortcuts.length === 0) return 'No shortcuts available for this view.';

  return shortcuts
    .map((s) => `Press ${s.keyLabel} for ${s.action}. ${s.description}`)
    .join(' ');
}

/**
 * Lookup a navigation destination from an Alt+Key combination.
 * Guaranteed to match SCREEN_REGISTRY destinations.
 */
export function resolveNavigationShortcut(keyChar: string): { destination: ScreenId; title: string } | null {
  const normalizedKey = keyChar.toLowerCase();
  const match = MASTER_SHORTCUT_REGISTRY.find(
    (s) => s.category === 'navigation' && s.altKey && s.key.toLowerCase() === normalizedKey && s.destination
  );

  if (match && match.destination && SCREEN_REGISTRY[match.destination]) {
    return {
      destination: match.destination,
      title: SCREEN_REGISTRY[match.destination].title
    };
  }

  return null;
}
