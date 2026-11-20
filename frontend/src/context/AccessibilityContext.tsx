/**
 * ACCESSPREP-X — AccessibilityContext
 * =====================================================================
 * Central accessibility provider and voice coordinator designed
 * for blind, visually impaired, and PwD SSC MTS candidates.
 *
 * Integrates:
 *  • VoiceEngine: Robust microphone speech recognition engine
 *  • NavigationController: 10-priority command & navigation router
 *  • SpeechSynthesis: Chromium-safe speech output with freeze protection
 *  • AudioBeacons: Auditory earcons for listening, success, and alert
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode
} from 'react';
import { ScreenId, APPROVED_SCREENS, SCREEN_REGISTRY } from '../types/screens.ts';
import { User, AccessibilitySettings } from '../db/database.ts';
export type { User, AccessibilitySettings };
import { audioBeacon } from '../utils/audioBeacon.ts';
import { NavigationController } from '../voice/NavigationController.ts';
import { NavigationContext } from '../voice/commandTypes.ts';
import {
  VoiceEngine,
  VoiceAssistantState,
  VOICE_STATE_UI_MESSAGES,
  getVoiceStateMessage
} from '../voice/VoiceEngine.ts';
export type { VoiceAssistantState };
export { VOICE_STATE_UI_MESSAGES, getVoiceStateMessage };
import { AccessibilityModeSelectorModal } from '../components/accessibility/AccessibilityModeSelectorModal.tsx';
import { resolveNavigationShortcut } from '../services/shortcutRegistry.ts';
import { getPageHelp } from '../data/pageHelpRegistry.ts';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AccessibilityInteractionMode = 'unselected' | 'voice' | 'keyboard' | 'manual';
export type ThemeMode = 'default' | 'sapphire' | 'high-contrast-yellow' | 'monochrome' | 'soft-dark';
export type FontSize = 'normal' | 'large' | 'xlarge' | 'xxlarge';
export type FontFace = 'system' | 'hyperlegible' | 'opendyslexic' | 'verdana' | 'serif' | 'mono';

export interface AccessibilityContextType {
  currentScreen: ScreenId;
  navigateTo: (screen: ScreenId | string) => void;
  setCurrentScreen: (screen: ScreenId | string) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  loginUser: (user: User, settings?: AccessibilitySettings) => void;
  logout: () => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (c: boolean) => void;
  toggleSidebar: () => void;
  isMobileNavOpen: boolean;
  setIsMobileNavOpen: (o: boolean) => void;
  toggleMobileNav: () => void;
  settings: AccessibilitySettings;
  updateSettings: (newSettings: Partial<AccessibilitySettings>) => void;
  speakText: (text: string, onEnd?: () => void) => void;
  speak: (text: string, onEnd?: () => void) => void;
  stopSpeaking: () => void;
  pauseSpeaking: () => void;
  resumeSpeaking: () => void;
  isPausedSpeaking: boolean;
  slowDownSpeech: () => void;
  isSpeaking: boolean;
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  activeAnnouncement: { message: string; priority: 'polite' | 'assertive' } | null;
  announceMessage: string;
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  fontSize: FontSize;
  setFontSize: (f: FontSize) => void;
  fontFace: FontFace;
  setFontFace: (font: FontFace) => void;
  voiceAssistantState: VoiceAssistantState;
  capturedVoiceText: string;
  dyslexiaFont: boolean;
  setDyslexiaFont: (d: boolean) => void;
  speechRate: number;
  setSpeechRate: (r: number) => void;
  compensatoryTime: boolean;
  setCompensatoryTime: (c: boolean) => void;
  whisperModel: 'tiny' | 'base' | 'small';
  setWhisperModel: (m: 'tiny' | 'base' | 'small') => void;

  // Vision / Blind Mode
  isBlindMode: boolean;
  setIsBlindMode: (enabled: boolean) => void;
  toggleBlindMode: () => void;
  isVisionMode: boolean;
  setIsVisionMode: (enabled: boolean) => void;
  toggleVisionMode: () => void;
  isVisionAssistantActive: boolean;
  activateVisionAssistant: () => void;
  deactivateVisionAssistant: () => void;
  showKeyboardShortcutsModal: boolean;
  setShowKeyboardShortcutsModal: (show: boolean) => void;

  // Interaction Mode
  interactionMode: AccessibilityInteractionMode;
  setInteractionMode: (mode: AccessibilityInteractionMode, remember?: boolean) => void;
  selectInteractionMode: (mode: AccessibilityInteractionMode, remember?: boolean) => void;
  showModeSelectorModal: boolean;
  setShowModeSelectorModal: (show: boolean) => void;
  resetInteractionMode: () => void;

  // Voice Engine State
  isVoiceListening: boolean;
  micPermissionStatus: 'unknown' | 'granted' | 'denied' | 'unsupported';
  startVoiceListening: () => void;
  stopVoiceListening: () => void;
  registerVoiceHandler: (handler: (transcript: string, meta?: { confidence?: number }) => boolean | Promise<boolean>) => () => void;
  playBeacon: (type?: 'listening' | 'success' | 'alert') => void;

  // Exam guard
  isExamActive: boolean;
  setIsExamActive: (active: boolean) => void;
  pendingExamExit: { destination: ScreenId; title: string } | null;
  confirmExamExit: (proceed: boolean) => void;
  executeVoiceCommand: (transcript: string) => Promise<void>;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  userId: 'usr_candidate_01',
  theme: 'sapphire',
  fontScale: 125,
  dyslexiaFont: false,
  speechRate: 1.0,
  speechPitch: 1.0,
  voiceURI: 'default',
  autoReadAloud: false,
  highContrastBorders: true,
  reduceMotion: false,
  compensatoryTimeEnabled: true,
  whisperModelSize: 'base',
  isBlindMode: false,
  speechVolume: 1.0,
  recognitionLang: 'en-IN',
  fontFace: 'system'
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

// ─── Screen mapping ──────────────────────────────────────────────────────────

export const SCREEN_TO_PATH: Record<ScreenId, string> = {
  welcome: '/welcome', login: '/login', register: '/register',
  dashboard: '/dashboard', topics: '/subjects', voice_practice: '/voice-practice',
  mock_exam: '/mock-exam', results: '/results', ai_tutor: '/ai-tutor',
  revision_planner: '/revision', progress: '/progress', topic_mastery: '/topic-mastery',
  accessibility_settings: '/accessibility-settings', screen_reader_settings: '/screen-reader-settings',
  learning_history: '/history', model_evaluation: '/model-evaluation',
  model_training: '/model-training', pilot_demo: '/pilot-demo'
};

export const PATH_TO_SCREEN: Record<string, ScreenId> = {
  '': 'dashboard', '/': 'dashboard',
  'welcome': 'welcome', '/welcome': 'welcome',
  'login': 'login', '/login': 'login',
  'register': 'register', '/register': 'register',
  'dashboard': 'dashboard', '/dashboard': 'dashboard',
  'subjects': 'topics', '/subjects': 'topics', 'topics': 'topics', '/topics': 'topics',
  'voice-practice': 'voice_practice', '/voice-practice': 'voice_practice',
  'voice_practice': 'voice_practice', '/voice_practice': 'voice_practice',
  'mock-exam': 'mock_exam', '/mock-exam': 'mock_exam',
  'mock_exam': 'mock_exam', '/mock_exam': 'mock_exam',
  'pilot-demo': 'pilot_demo', '/pilot-demo': 'pilot_demo',
  'pilot_demo': 'pilot_demo', '/pilot_demo': 'pilot_demo',
  'results': 'results', '/results': 'results',
  'ai-tutor': 'ai_tutor', '/ai-tutor': 'ai_tutor',
  'ai_tutor': 'ai_tutor', '/ai_tutor': 'ai_tutor',
  'revision': 'revision_planner', '/revision': 'revision_planner',
  'revision-planner': 'revision_planner', '/revision-planner': 'revision_planner',
  'revision_planner': 'revision_planner', '/revision_planner': 'revision_planner',
  'progress': 'progress', '/progress': 'progress',
  'topic-mastery': 'topic_mastery', '/topic-mastery': 'topic_mastery',
  'topic_mastery': 'topic_mastery', '/topic_mastery': 'topic_mastery',
  'accessibility-settings': 'accessibility_settings', '/accessibility-settings': 'accessibility_settings',
  'accessibility_settings': 'accessibility_settings', '/accessibility_settings': 'accessibility_settings',
  'screen-reader-settings': 'screen_reader_settings', '/screen-reader-settings': 'screen_reader_settings',
  'screen_reader_settings': 'screen_reader_settings', '/screen_reader_settings': 'screen_reader_settings',
  'history': 'learning_history', '/history': 'learning_history',
  'learning-history': 'learning_history', '/learning-history': 'learning_history',
  'learning_history': 'learning_history', '/learning_history': 'learning_history',
  'model-evaluation': 'model_evaluation', '/model-evaluation': 'model_evaluation',
  'model_evaluation': 'model_evaluation', '/model_evaluation': 'model_evaluation',
  'model-training': 'model_training', '/model-training': 'model_training',
  'model_training': 'model_training', '/model_training': 'model_training'
};

function normalizeToApprovedScreen(raw: string): ScreenId | null {
  if (APPROVED_SCREENS.includes(raw as ScreenId)) return raw as ScreenId;
  const withUnderscore = raw.replace(/-/g, '_') as ScreenId;
  if (APPROVED_SCREENS.includes(withUnderscore)) return withUnderscore;
  return null;
}

function getSavedSessionUser(): User | null {
  try {
    const raw = localStorage.getItem('accessprep_session_user');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function getInitialInteractionMode(): AccessibilityInteractionMode {
  try {
    if (typeof window === 'undefined') return 'voice';
    const remembered = localStorage.getItem('accessprep_remember_mode') === 'true';
    if (remembered) {
      const preferred = localStorage.getItem('accessprep_preferred_mode') as AccessibilityInteractionMode;
      if (preferred === 'voice' || preferred === 'keyboard' || preferred === 'manual') {
        return preferred;
      }
    }
    const sessionMode = sessionStorage.getItem('accessprep_session_mode') as AccessibilityInteractionMode;
    if (sessionMode === 'voice' || sessionMode === 'keyboard' || sessionMode === 'manual') {
      return sessionMode;
    }
  } catch {}
  return 'voice'; // Default directly to Voice Assistance (Vision Mode) so blind candidates are never blocked
}

function resolveScreenFromLocation(): ScreenId | null {
  try {
    if (typeof window === 'undefined') return null;
    const rawPath = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
    if (rawPath && PATH_TO_SCREEN[rawPath]) return PATH_TO_SCREEN[rawPath];
    if (rawPath) { const f = normalizeToApprovedScreen(rawPath); if (f) return f; }
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (hash) {
      const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : hash);
      const s = params.get('screen');
      if (s) { if (PATH_TO_SCREEN[s]) return PATH_TO_SCREEN[s]; const f2 = normalizeToApprovedScreen(s); if (f2) return f2; }
      const direct = hash.split(/[?&]/)[0];
      if (PATH_TO_SCREEN[direct]) return PATH_TO_SCREEN[direct];
    }
  } catch {}
  return null;
}

// ─── Accessibility Provider Component ────────────────────────────────────────

export function AccessibilityProvider({ children }: { children: ReactNode }) {

  const getInitialScreen = (): ScreenId => {
    const savedUser = getSavedSessionUser();
    const resolved = resolveScreenFromLocation();
    if (resolved) {
      if (savedUser && (resolved === 'login' || resolved === 'register' || resolved === 'welcome')) return 'dashboard';
      const meta = SCREEN_REGISTRY[resolved];
      if (meta?.requiresAuth && !savedUser) return 'login';
      return resolved;
    }
    return savedUser ? 'dashboard' : 'login';
  };

  // State
  const [currentScreen, setCurrentScreenState] = useState<ScreenId>(getInitialScreen);
  const [user, setUser] = useState<User | null>(getSavedSessionUser);
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPausedSpeaking, setIsPausedSpeaking] = useState(false);
  const [activeAnnouncement, setActiveAnnouncement] = useState<{ message: string; priority: 'polite' | 'assertive' } | null>(null);

  const [isBlindMode, setIsBlindModeState] = useState<boolean>(() => {
    try {
      const savedUser = getSavedSessionUser();
      const localFlag = localStorage.getItem('accessprep_blind_mode');
      if (localFlag !== null) return localFlag === 'true';
      if (savedUser?.pwdCategory === 'Visually Impaired' || savedUser?.needScribe) return true;
    } catch {}
    return false;
  });

  const [isVisionAssistantActive, setIsVisionAssistantActive] = useState(false);
  const [showKeyboardShortcutsModal, setShowKeyboardShortcutsModalState] = useState(false);
  const [interactionMode, setInteractionModeState] = useState<AccessibilityInteractionMode>(getInitialInteractionMode);
  const [showModeSelectorModal, setShowModeSelectorModal] = useState<boolean>(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [micPermissionStatus, setMicPermissionStatus] = useState<'unknown' | 'granted' | 'denied' | 'unsupported'>('unknown');
  const [isExamActive, setIsExamActiveState] = useState(false);
  const [pendingExamExit, setPendingExamExit] = useState<{ destination: ScreenId; title: string } | null>(null);
  const [fontFace, setFontFaceState] = useState<FontFace>(() => {
    try {
      const saved = localStorage.getItem('accessprep_font_face');
      if (saved && ['system', 'hyperlegible', 'opendyslexic', 'verdana', 'serif', 'mono'].includes(saved)) {
        return saved as FontFace;
      }
    } catch {}
    return 'system';
  });
  const [voiceAssistantState, setVoiceAssistantState] = useState<VoiceAssistantState>('IDLE');
  const [capturedVoiceText, setCapturedVoiceText] = useState<string>('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('accessprep_sidebar_collapsed') === 'true'; } catch { return false; }
  });
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Refs
  const currentScreenRef = useRef<ScreenId>(currentScreen);
  currentScreenRef.current = currentScreen;
  const userRef = useRef<User | null>(user);
  userRef.current = user;
  const settingsRef = useRef<AccessibilitySettings>(settings);
  settingsRef.current = settings;
  const interactionModeRef = useRef<AccessibilityInteractionMode>(interactionMode);
  interactionModeRef.current = interactionMode;
  const isSpeakingRef = useRef(false);
  const isExamActiveRef = useRef(false);
  const historyStackRef = useRef<ScreenId[]>([]);
  const navControllerRef = useRef<NavigationController | null>(null);
  const voiceEngineRef = useRef<VoiceEngine | null>(null);
  const activeVoiceHandlerRef = useRef<((t: string, m?: { confidence?: number }) => boolean | Promise<boolean>) | null>(null);

  // TTS Safeguards
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechWatchdogRef = useRef<any>(null);
  const speechKeepAliveRef = useRef<any>(null);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => { const n = !prev; try { localStorage.setItem('accessprep_sidebar_collapsed', String(n)); } catch {} return n; });
  }, []);

  const toggleMobileNav = useCallback(() => setIsMobileNavOpen(p => !p), []);

  // 1. Announcer (ARIA live region)
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setActiveAnnouncement({ message, priority });
    setTimeout(() => setActiveAnnouncement(null), 4000);
  }, []);

  useEffect(() => {
    const fontClasses = [
      'font-face-system',
      'font-face-hyperlegible',
      'font-face-opendyslexic',
      'font-face-verdana',
      'font-face-serif',
      'font-face-mono'
    ];
    document.body.classList.remove(...fontClasses);
    document.body.classList.add(`font-face-${fontFace}`);
  }, [fontFace]);

  // 2. TTS: speakText with Chromium Freeze Protection
  const stopSpeaking = useCallback(() => {
    if (speechWatchdogRef.current) {
      clearTimeout(speechWatchdogRef.current);
      speechWatchdogRef.current = null;
    }
    if (speechKeepAliveRef.current) {
      clearInterval(speechKeepAliveRef.current);
      speechKeepAliveRef.current = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    activeUtteranceRef.current = null;
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    setIsPausedSpeaking(false);

    // Reset speaking flag in engine so full command recognition resumes
    voiceEngineRef.current?.setSpeaking(false);
    voiceEngineRef.current?.resume();
  }, []);

  const pauseSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setIsPausedSpeaking(true);
    }
  }, []);

  const resumeSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPausedSpeaking(false);
    }
  }, []);

  const speakText = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) {
      if (onEnd) onEnd();
      return;
    }

    // Independent Manual Mode: do not auto-synthesize speech
    if (interactionModeRef.current === 'manual') {
      if (onEnd) onEnd();
      return;
    }

    // Cancel any ongoing speech & pause microphone
    if (speechWatchdogRef.current) clearTimeout(speechWatchdogRef.current);
    if (speechKeepAliveRef.current) clearInterval(speechKeepAliveRef.current);
    window.speechSynthesis.cancel();

    isSpeakingRef.current = true;
    setIsSpeaking(true);
    setIsPausedSpeaking(false);

    const cleanT = text.replace(/<[^>]*>?/gm, '').trim();

    // Keep microphone listening during TTS so the user can say "STOP" on ANY screen, while suppressing speaker echo
    voiceEngineRef.current?.setSpeaking(true, cleanT);

    const utterance = new SpeechSynthesisUtterance(cleanT);
    activeUtteranceRef.current = utterance; // Prevent garbage collection

    const s = settingsRef.current;
    utterance.rate = Math.max(0.1, Math.min(10, s.speechRate ?? 1.0));
    utterance.pitch = Math.max(0.1, Math.min(2, s.speechPitch ?? 1.0));
    utterance.volume = Math.max(0, Math.min(1, s.speechVolume ?? 1.0));

    if (s.voiceURI && s.voiceURI !== 'default') {
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find(v => v.voiceURI === s.voiceURI);
      if (match) utterance.voice = match;
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;

      if (speechWatchdogRef.current) {
        clearTimeout(speechWatchdogRef.current);
        speechWatchdogRef.current = null;
      }
      if (speechKeepAliveRef.current) {
        clearInterval(speechKeepAliveRef.current);
        speechKeepAliveRef.current = null;
      }

      activeUtteranceRef.current = null;
      isSpeakingRef.current = false;
      setIsSpeaking(false);

      // Speech finished: reset speaking state so continuous session automatically returns to LISTENING
      voiceEngineRef.current?.setSpeaking(false);
      setCapturedVoiceText('');

      if (onEnd) {
        onEnd();
      }

      // Resume full command recognition
      voiceEngineRef.current?.resume();
    };

    utterance.onend = finish;
    utterance.onerror = finish;
    utterance.onstart = () => {
      setIsSpeaking(true);
      isSpeakingRef.current = true;
      voiceEngineRef.current?.setState('SPEAKING');
      setVoiceAssistantState('SPEAKING');
    };

    // Chromium keep-alive: pulse pause/resume to prevent speech from stalling on long strings
    speechKeepAliveRef.current = setInterval(() => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 4500);

    // Watchdog timer: safety cleanup in case onend never fires
    const maxDurationMs = Math.max(4000, cleanT.length * 95 + 3000);
    speechWatchdogRef.current = setTimeout(() => {
      finish();
    }, maxDurationMs);

    window.speechSynthesis.speak(utterance);
  }, []);

  // Context-Aware Inline Keyboard Shortcuts handler (Never opens a modal dialog / popup)
  const openInlineKeyboardShortcuts = useCallback(() => {
    window.dispatchEvent(new CustomEvent('accessprep:show-inline-keyboard-help'));
    const bannerEl =
      document.getElementById('page-help-banner-heading') ||
      document.querySelector('[aria-labelledby="page-help-banner-heading"]');
    if (bannerEl) {
      bannerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    const isAuth = currentScreenRef.current === 'login' || currentScreenRef.current === 'register';
    if (isAuth) {
      const authHelp =
        'ACCESSPREP-X Keyboard Shortcuts: Press L to type your email address or roll number. Press P to enter your password. Press C to auto-fill the audio verification code. Press S to sign in. Press R to play audio verification code. Press F 2 to re-read the current field. Press Y to confirm. Press N to clear or cancel. Press H for help. Press K to hear this description again. Press Escape to stop speech. The microphone is always listening for your voice commands.';
      announce(authHelp, 'assertive');
      speakText(authHelp);
    } else {
      const rec = getPageHelp(currentScreenRef.current);
      const textToSpeak = `${rec.spokenKeyboardHelp} Press R to replay, press V for voice commands, or press S to continue.`;
      announce(`Reading keyboard shortcuts for ${rec.title}`, 'polite');
      speakText(textToSpeak);
    }
  }, [announce, speakText]);

  const setShowKeyboardShortcutsModal = useCallback((show: boolean) => {
    if (show) {
      openInlineKeyboardShortcuts();
    }
    setShowKeyboardShortcutsModalState(false);
  }, [openInlineKeyboardShortcuts]);

  // 3. Navigation handler
  const navigateTo = useCallback((screen: ScreenId | string) => {
    const matched = normalizeToApprovedScreen(screen as string);
    if (!matched) {
      console.warn(`[AccessibilityContext] Unapproved screen: "${screen}"`);
      return;
    }

    if (
      isExamActiveRef.current &&
      (currentScreenRef.current === 'mock_exam' || currentScreenRef.current === 'pilot_demo') &&
      matched !== currentScreenRef.current
    ) {
      const destTitle = SCREEN_REGISTRY[matched]?.title || matched;
      const pending = { destination: matched, title: destTitle };
      setPendingExamExit(pending);
      announce('You are currently taking an examination. Do you want to submit your answers and exit?', 'assertive');
      speakText('You are currently taking an examination. Do you want to submit your answers and exit?');
      return;
    }

    const prevScreen = currentScreenRef.current;
    if (prevScreen !== matched) {
      historyStackRef.current = [...historyStackRef.current.slice(-9), prevScreen];
    }

    const meta = SCREEN_REGISTRY[matched];
    const currentUser = userRef.current || getSavedSessionUser();
    if (meta?.requiresAuth && !currentUser) {
      setCurrentScreenState('login');
      currentScreenRef.current = 'login';
      try { window.history.pushState({ screen: 'login' }, '', '/login'); } catch { window.location.hash = 'screen=login'; }
      announce('Authentication required. Please sign in.', 'assertive');
      return;
    }

    setCurrentScreenState(matched);
    currentScreenRef.current = matched;

    const targetPath = SCREEN_TO_PATH[matched] || `/${matched.replace(/_/g, '-')}`;
    try {
      if (window.location.pathname !== targetPath) window.history.pushState({ screen: matched }, '', targetPath);
    } catch {
      window.location.hash = `screen=${matched}`;
    }

    window.scrollTo({ top: 0, behavior: settingsRef.current.reduceMotion ? 'auto' : 'smooth' });
    announce(`Navigated to ${matched.replace(/_/g, ' ')}.`, 'polite');

    setTimeout(() => {
      const m = document.getElementById('main-content');
      if (m) m.focus();
    }, 150);

    if (navControllerRef.current) {
      navControllerRef.current.updateContext({
        currentScreen: matched,
        historyStack: historyStackRef.current
      });
    }
  }, [announce, speakText]);

  // 4. Voice Command Execution (routes transcript through NavigationController)
  const executeVoiceCommand = useCallback(async (rawTranscript: string) => {
    if (!navControllerRef.current) return;

    const result = await navControllerRef.current.processTranscript(
      rawTranscript,
      activeVoiceHandlerRef.current
    );

    if (result.status === 'success') {
      audioBeacon.playSuccessBeacon();
    } else if (result.status === 'blocked_by_active_exam' || result.status === 'forbidden_role') {
      audioBeacon.playAlertBeacon();
    }

    if (result.spokenResponse) {
      navControllerRef.current.recordSpokenText(result.spokenResponse);
      speakText(result.spokenResponse);
    }

    if (result.announcement) {
      announce(result.announcement, 'assertive');
    }
  }, [speakText, announce]);

  // 5. VoiceEngine factory
  const getEngine = useCallback((): VoiceEngine => {
    if (!voiceEngineRef.current) {
      voiceEngineRef.current = new VoiceEngine({
        lang: settingsRef.current?.recognitionLang || 'en-IN',
        onTranscript: async (raw: string) => {
          await executeVoiceCommand(raw);
        },
        onListeningChange: (listening: boolean) => {
          setIsVoiceListening(listening);
          if (listening) setMicPermissionStatus('granted');
        },
        onStateChange: (state) => {
          setVoiceAssistantState(state);
          if (state === 'WAKE_DETECTED') {
            announce('Vision activated', 'polite');
          } else if (state === 'LISTENING') {
            announce('Listening... Speak your command', 'polite');
          } else if (state === 'PROCESSING') {
            announce('Processing your command...', 'polite');
          } else if (state === 'SPEAKING') {
            announce('Vision is responding...', 'polite');
          } else if (state === 'STOPPED') {
            setCapturedVoiceText('');
            announce('Voice assistant deactivated', 'polite');
          } else if (state === 'ERROR') {
            setCapturedVoiceText('');
            announce('Voice recognition unavailable', 'assertive');
          } else if (state === 'IDLE') {
            setCapturedVoiceText('');
          }
        },
        onWakeDetected: (hasAttachedCommand: boolean) => {
          setIsVisionAssistantActive(true);
          setIsBlindModeState(true);
          try { localStorage.setItem('accessprep_blind_mode', 'true'); } catch {}
          if (navControllerRef.current) {
            navControllerRef.current.updateContext({ isVisionAssistantActive: true });
          }
          if (!hasAttachedCommand) {
            speakText("Yes, I'm listening.");
          }
        },
        onDeactivate: () => {
          setIsVisionAssistantActive(false);
          if (navControllerRef.current) {
            navControllerRef.current.updateContext({ isVisionAssistantActive: false });
          }
          speakText('Voice assistant deactivated.');
        },
        onSpeechAccumulated: (text: string) => {
          setCapturedVoiceText(text);
        },
        onPlayBeacon: (type) => {
          playBeacon(type);
        },
        onStopSpeaking: () => {
          stopSpeaking();
          announce('Speech stopped.', 'polite');
        },
        onError: (errorType: 'denied' | 'unsupported' | 'error', message: string) => {
          if (errorType === 'denied') {
            setMicPermissionStatus('denied');
          } else if (errorType === 'unsupported') {
            setMicPermissionStatus('unsupported');
          }
          announce(message, 'assertive');
        }
      });
    }
    return voiceEngineRef.current;
  }, [executeVoiceCommand, stopSpeaking, speakText, announce]);

  // 6. Settings Management
  const updateSettings = useCallback((newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => {
      const merged = { ...prev, ...newSettings, userId: userRef.current?.id || prev.userId || 'usr_candidate_01' };
      fetch('/api/settings/accessibility', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(merged)
      }).catch(e => console.warn('Settings sync error:', e));
      return merged;
    });
  }, []);

  const setFontFace = useCallback((newFont: FontFace) => {
    setFontFaceState(newFont);
    try {
      localStorage.setItem('accessprep_font_face', newFont);
    } catch {}
    updateSettings({ fontFace: newFont });
  }, [updateSettings]);

  const slowDownSpeech = useCallback(() => {
    const cur = settingsRef.current.speechRate || 1.0;
    const next = Math.max(0.6, Math.round((cur - 0.15) * 100) / 100);
    updateSettings({ speechRate: next });
    announce(`Speech rate slowed to ${Math.round(next * 100)} percent.`, 'polite');
    speakText(`Speech rate set to ${Math.round(next * 100)} percent.`);
  }, [updateSettings, announce, speakText]);

  const setIsBlindMode = useCallback((enabled: boolean) => {
    setIsBlindModeState(enabled);
    try { localStorage.setItem('accessprep_blind_mode', String(enabled)); } catch {}
    updateSettings({ isBlindMode: enabled, autoReadAloud: enabled });
  }, [updateSettings]);

  const toggleBlindMode = useCallback(() => setIsBlindMode(!isBlindMode), [isBlindMode, setIsBlindMode]);

  // 7. Vision Assistant Activation ("Hey Vision" response)
  const activateVisionAssistant = useCallback(() => {
    setIsVisionAssistantActive(true);
    setIsBlindMode(true);

    if (navControllerRef.current) {
      navControllerRef.current.updateContext({ isVisionAssistantActive: true });
    }

    const engine = getEngine();
    engine.start();
    engine.triggerWakeWordActivation(true);
  }, [setIsBlindMode, getEngine]);

  const deactivateVisionAssistant = useCallback(() => {
    getEngine().deactivateSession();
  }, [getEngine]);

  // 8. Voice listening triggers
  const startVoiceListening = useCallback(() => {
    setIsVisionAssistantActive(true);
    if (navControllerRef.current) {
      navControllerRef.current.updateContext({ isVisionAssistantActive: true });
    }
    const engine = getEngine();
    engine.start();
    engine.triggerWakeWordActivation(false);
  }, [getEngine]);

  const stopVoiceListening = useCallback(() => {
    getEngine().triggerStopListening();
  }, [getEngine]);

  // Accessibility Interaction Mode selection & management
  const selectInteractionMode = useCallback((mode: AccessibilityInteractionMode, remember: boolean = true) => {
    setInteractionModeState(mode);
    interactionModeRef.current = mode;
    try {
      sessionStorage.setItem('accessprep_session_mode', mode);
      if (remember) {
        localStorage.setItem('accessprep_remember_mode', 'true');
        localStorage.setItem('accessprep_preferred_mode', mode);
      }
    } catch {}

    if (mode === 'voice') {
      setIsBlindModeState(true);
      try { localStorage.setItem('accessprep_blind_mode', 'true'); } catch {}
      setIsVisionAssistantActive(true);
      if (navControllerRef.current) {
        navControllerRef.current.updateContext({ isVisionAssistantActive: true });
      }
      audioBeacon.playSuccessBeacon();
      announce('Voice Assistance Mode activated. Vision Assistant is ready.', 'assertive');
      speakText('Voice Assistance Mode activated. You can speak commands or say Help at any time.');
    } else if (mode === 'keyboard') {
      setIsBlindModeState(false);
      try { localStorage.setItem('accessprep_blind_mode', 'false'); } catch {}
      setIsVisionAssistantActive(false);
      if (navControllerRef.current) {
        navControllerRef.current.updateContext({ isVisionAssistantActive: false });
      }
      stopSpeaking();
      stopVoiceListening();
      announce('Keyboard Shortcut Mode activated. Press K for keyboard help, or Alt+V to switch to voice mode.', 'polite');
    } else if (mode === 'manual') {
      setIsBlindModeState(false);
      try { localStorage.setItem('accessprep_blind_mode', 'false'); } catch {}
      setIsVisionAssistantActive(false);
      if (navControllerRef.current) {
        navControllerRef.current.updateContext({ isVisionAssistantActive: false });
      }
      stopSpeaking();
      stopVoiceListening();
      announce('Independent Manual Mode activated. Automatic speech synthesis and microphone are disabled.', 'polite');
    }
  }, [stopSpeaking, stopVoiceListening, announce, speakText]);

  const resetInteractionMode = useCallback(() => {
    try {
      localStorage.removeItem('accessprep_remember_mode');
      localStorage.removeItem('accessprep_preferred_mode');
      sessionStorage.removeItem('accessprep_session_mode');
    } catch {}
    setInteractionModeState('unselected');
    interactionModeRef.current = 'unselected';
    setShowModeSelectorModal(true);
    announce('Interaction mode reset. Please select how you would like to use ACCESSPREP-X.', 'polite');
  }, [announce]);

  const registerVoiceHandler = useCallback((handler: (transcript: string, meta?: { confidence?: number }) => boolean | Promise<boolean>) => {
    activeVoiceHandlerRef.current = handler;
    return () => {
      if (activeVoiceHandlerRef.current === handler) activeVoiceHandlerRef.current = null;
    };
  }, []);

  const playBeacon = useCallback((type: 'listening' | 'success' | 'alert' = 'listening') => {
    if (type === 'listening') audioBeacon.playListeningBeacon();
    else if (type === 'success') audioBeacon.playSuccessBeacon();
    else audioBeacon.playAlertBeacon();
  }, []);

  // 9. Exam safety guard
  const setIsExamActive = useCallback((active: boolean) => {
    setIsExamActiveState(active);
    isExamActiveRef.current = active;
    if (navControllerRef.current) navControllerRef.current.updateContext({ isExamActive: active });
  }, []);

  const confirmExamExit = useCallback((proceed: boolean) => {
    const pending = pendingExamExit;
    setPendingExamExit(null);
    if (navControllerRef.current) navControllerRef.current.updateContext({ pendingExamExit: null });
    if (proceed && pending) {
      setIsExamActive(false);
      setTimeout(() => navigateTo(pending.destination), 50);
      speakText(`Pausing examination. Navigating to ${pending.title}.`);
    } else {
      speakText('Staying in examination. Good luck! The timer is running.');
    }
  }, [pendingExamExit, setIsExamActive, navigateTo, speakText]);

  // 10. Login / Logout lifecycle
  const loginUser = useCallback((loggedInUser: User, newSettings?: AccessibilitySettings) => {
    setUser(loggedInUser);
    userRef.current = loggedInUser;
    try { localStorage.setItem('accessprep_session_user', JSON.stringify(loggedInUser)); } catch {}

    const isBlind = loggedInUser.pwdCategory === 'Visually Impaired' || loggedInUser.needScribe || Boolean(newSettings?.isBlindMode);
    if (newSettings) setSettings({ ...newSettings, isBlindMode: isBlind });
    setIsBlindModeState(isBlind);
    try { localStorage.setItem('accessprep_blind_mode', String(isBlind)); } catch {}

    // Silence any speech
    stopSpeaking();

    // Reset vision assistant to standby
    setIsVisionAssistantActive(false);

    // Start microphone engine so candidate can say "Hey Vision"
    const engine = getEngine();
    setTimeout(() => {
      engine.start();
    }, 250);
  }, [getEngine, stopSpeaking]);

  const logout = useCallback(() => {
    stopSpeaking();
    getEngine().stop();
    setUser(null);
    userRef.current = null;
    try { localStorage.removeItem('accessprep_session_user'); sessionStorage.clear(); } catch {}
    setCurrentScreenState('login');
    currentScreenRef.current = 'login';
    try { window.history.pushState({ screen: 'login' }, '', '/login'); } catch { window.location.hash = 'screen=login'; }
    announce('Logged out successfully. Please sign in to continue.', 'polite');
  }, [getEngine, stopSpeaking, announce]);

  // 11. NavigationController instance creation and render synchronization
  useEffect(() => {
    if (!navControllerRef.current) {
      const ctx: NavigationContext = {
        currentScreen: currentScreenRef.current,
        user,
        isExamActive: false,
        pendingExamExit: null,
        historyStack: [],
        lastSpokenText: '',
        isVisionAssistantActive
      };

      navControllerRef.current = new NavigationController({
        context: ctx,
        navigate: (screen: ScreenId) => navigateTo(screen),
        speak: (text: string, onEnd?: () => void) => speakText(text, onEnd),
        stopSpeak: () => stopSpeaking(),
        pauseSpeak: () => pauseSpeaking(),
        resumeSpeak: () => resumeSpeaking(),
        slowDown: () => slowDownSpeech(),
        onSpeechSetting: (setting) => {
          if (setting.type === 'rate') updateSettings({ speechRate: setting.value });
          else if (setting.type === 'pitch') updateSettings({ speechPitch: setting.value });
        },
        onFontFace: (f) => setFontFace(f),
        logout: () => logout(),
        startListening: () => getEngine().start(),
        onToggleVision: (active: boolean) => {
          setIsVisionAssistantActive(active);
          setIsBlindModeState(active);
          if (navControllerRef.current) {
            navControllerRef.current.updateContext({ isVisionAssistantActive: active });
          }
        },
        onSwitchMode: (mode: 'voice' | 'keyboard' | 'manual') => {
          selectInteractionMode(mode, false);
        }
      });
    } else {
      navControllerRef.current.updateContext({
        currentScreen: currentScreenRef.current,
        user,
        isVisionAssistantActive
      });
    }
  });

  // 12. Keep microphone alive across authenticated screens
  useEffect(() => {
    if (user && currentScreen !== 'login' && currentScreen !== 'register') {
      const engine = getEngine();
      if (!engine.isListening() && !isSpeakingRef.current) {
        engine.start();
      }
    }
  }, [user, currentScreen, getEngine]);

  // 13. Teardown
  useEffect(() => {
    return () => {
      voiceEngineRef.current?.destroy();
    };
  }, []);

  // 14. Session restore on mount
  useEffect(() => {
    const savedUser = getSavedSessionUser();
    if (savedUser) {
      setUser(savedUser);
      userRef.current = savedUser;
      fetch('/api/auth/me')
        .then(r => r.json())
        .then(data => {
          if (data.settings) {
            setSettings(data.settings);
            if (data.settings.isBlindMode !== undefined) setIsBlindModeState(Boolean(data.settings.isBlindMode));
          }
        })
        .catch(() => {});
    }
  }, []);

  // 15. URL routing sync
  useEffect(() => {
    const handleUrlChange = () => {
      const resolved = resolveScreenFromLocation();
      if (resolved && resolved !== currentScreenRef.current) {
        const meta = SCREEN_REGISTRY[resolved];
        const currentUser = userRef.current || getSavedSessionUser();
        if (meta?.requiresAuth && !currentUser) {
          setCurrentScreenState('login');
          currentScreenRef.current = 'login';
          window.location.hash = 'screen=login';
          return;
        }
        setCurrentScreenState(resolved);
        currentScreenRef.current = resolved;
      }
    };
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  // 16. Theme & display class sync
  useEffect(() => {
    document.body.className = '';
    document.body.classList.add(`theme-${settings.theme}`);
    document.body.classList.add(`font-scale-${settings.fontScale}`);
    if (settings.dyslexiaFont) document.body.classList.add('font-dyslexic');
    if (settings.reduceMotion) document.body.classList.add('reduce-motion');
  }, [settings]);

  // 17. Centralized keyboard shortcut registry & Blind-Friendly Single-Key Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // Escape: Stop ongoing speech immediately (and unfocus input if typing)
      if (e.key === 'Escape') {
        if (isTyping) {
          target.blur();
        }
        stopSpeaking();
        if (interactionModeRef.current === 'voice') {
          audioBeacon.playListeningBeacon();
          announce('Speech stopped. Vision Assistant is listening.', 'polite');
        } else {
          announce('Speech stopped.', 'polite');
        }
        return;
      }

      // If user is actively typing in a form input, preserve standard character typing
      if (isTyping) {
        return;
      }

      const key = e.key.toLowerCase();
      const isAuthScreen = currentScreenRef.current === 'login' || currentScreenRef.current === 'register';

      // 1. Single-Key 'K': Context-Aware Keyboard Shortcuts Announcement & Inline Guide Display (NO POPUPS)
      if ((key === 'k' && !e.ctrlKey && !e.metaKey && !e.altKey) || (e.altKey && key === 'k' && isAuthScreen)) {
        e.preventDefault();
        openInlineKeyboardShortcuts();
        return;
      }

      // 2. Auth Screen Single-Key Shortcuts (L, P, C, S, R, H)
      if (isAuthScreen && !e.ctrlKey && !e.metaKey) {
        // [L]: Focus Email / Roll Number field
        if (key === 'l' || (e.altKey && key === 'e') || (e.altKey && key === 'l')) {
          e.preventDefault();
          const el = (document.getElementById('candidate-identifier') ||
            document.getElementById('register-email') ||
            document.querySelector('input[name="identifier"]') ||
            document.querySelector('input[name="email"]') ||
            document.querySelector('input[type="email"]')) as HTMLInputElement | null;
          if (el) {
            el.focus();
            const msg = 'Email field focused. You can now type your registered email address or roll number.';
            announce(msg, 'assertive');
            speakText(msg);
          }
          return;
        }

        // [P]: Focus Password field
        if (key === 'p' || (e.altKey && key === 'p')) {
          e.preventDefault();
          const el = (document.getElementById('candidate-password') ||
            document.getElementById('register-password') ||
            document.querySelector('input[name="password"]') ||
            document.querySelector('input[type="password"]')) as HTMLInputElement | null;
          if (el) {
            el.focus();
            const msg = 'Password field focused. Please enter your confidential password using your keyboard.';
            announce(msg, 'assertive');
            speakText(msg);
          }
          return;
        }

        // [C]: Auto-Write Audio CAPTCHA (Single key for blind candidates)
        if (key === 'c' || (e.altKey && key === 'c')) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('accessprep:auto-fill-captcha'));
          return;
        }

        // [S]: Sign In / Submit Form
        if (key === 's' || (e.altKey && key === 's')) {
          e.preventDefault();
          const submitBtn = (document.querySelector('button[type="submit"]') ||
            document.querySelector('button[aria-label*="Sign In"]') ||
            document.querySelector('button[aria-label*="Create"]')) as HTMLButtonElement | null;
          if (submitBtn) {
            const msg = currentScreenRef.current === 'login' ? 'Signing in...' : 'Creating account...';
            announce(msg, 'assertive');
            speakText(msg);
            submitBtn.click();
          }
          return;
        }

        // [R]: Play / Repeat Audio CAPTCHA
        if (key === 'r' || (e.altKey && key === 'r')) {
          e.preventDefault();
          const btn = document.querySelector('button[aria-label*="Play Audio CAPTCHA"]') as HTMLButtonElement | null;
          if (btn) {
            btn.click();
          }
          return;
        }

        // [H]: Page Help / Instructions
        if (key === 'h' || (e.altKey && key === 'h')) {
          e.preventDefault();
          const helpText = currentScreenRef.current === 'login'
            ? 'Candidate Login Help: Press L to type your email address or roll number. Press P to enter your password. Press C to auto-fill the audio verification code. Press S to sign in. Press R to play audio verification code. Press K to hear all keyboard shortcuts.'
            : 'Candidate Registration Help: Press L to type your email address. Press P to enter your password. Press C to auto-fill the audio verification code. Press S to create account. Press R to play audio verification code. Press K to hear all keyboard shortcuts.';
          announce(helpText, 'assertive');
          speakText(helpText);
          return;
        }
      }

      // 3. Mode switching & modal shortcuts
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        // Alt+V: Switch to Voice Assistance (Vision Mode)
        if (key === 'v') {
          e.preventDefault();
          selectInteractionMode('voice', false);
          return;
        }

        // Alt+K: Switch to Keyboard Shortcut Mode (when not on auth page)
        if (key === 'k') {
          e.preventDefault();
          selectInteractionMode('keyboard', false);
          return;
        }

        // Alt+M: Switch to Independent Manual Mode
        if (key === 'm') {
          e.preventDefault();
          selectInteractionMode('manual', false);
          return;
        }

        // Alt+Space: Toggle/Activate Vision Assistant (Hey Vision / Stop listening)
        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          if (voiceAssistantState === 'LISTENING' || voiceAssistantState === 'WAKE_DETECTED') {
            getEngine().triggerStopListening();
          } else {
            activateVisionAssistant();
          }
          return;
        }

        // Alt+Shift+X — Request exam exit if exam is active
        if (e.shiftKey && key === 'x') {
          if (isExamActiveRef.current) {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('accessprep:request-exam-exit'));
            return;
          }
        }

        // Alt+/: Shortcuts reference -> Route to inline guide (NO POPUPS)
        if (key === '/' || e.key === '?') {
          e.preventDefault();
          openInlineKeyboardShortcuts();
          return;
        }

        // Alt+Shift+A: Open Accessibility Mode Selection Modal
        if (e.shiftKey && key === 'a') {
          e.preventDefault();
          setShowModeSelectorModal(true);
          return;
        }

        // If user is typing in a form input, avoid intercepting screen navigation
        if (isTyping) return;

        // Global screen navigation (only when authenticated and NOT on login/register)
        if (!isAuthScreen && userRef.current) {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const seq: ScreenId[] = [
              'dashboard', 'topics', 'voice_practice', 'pilot_demo',
              'mock_exam', 'results', 'ai_tutor', 'revision_planner',
              'progress', 'accessibility_settings',
              'screen_reader_settings', 'learning_history'
            ];
            const curr = seq.indexOf(currentScreenRef.current);
            const idx = e.key === 'ArrowDown'
              ? (curr >= 0 && curr < seq.length - 1 ? curr + 1 : 0)
              : (curr > 0 ? curr - 1 : seq.length - 1);
            navigateTo(seq[idx]);
            return;
          }

          // Authoritative Registry-driven navigation matching SCREEN_REGISTRY destinations exactly
          const navMatch = resolveNavigationShortcut(key);
          if (navMatch) {
            e.preventDefault();
            announce(`Navigating to ${navMatch.title}`, 'assertive');
            navigateTo(navMatch.destination);
            return;
          }

          if (key === 'l') {
            e.preventDefault();
            announce('Signing out of candidate session', 'assertive');
            logout();
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateTo, logout, stopSpeaking, activateVisionAssistant, deactivateVisionAssistant, setIsBlindMode, isBlindMode, announce, selectInteractionMode, speakText]);

  // 18. Ensure background microphone wake-word standby runs after candidate interaction
  useEffect(() => {
    const handleScreenClickOrTouch = () => {
      if (interactionModeRef.current !== 'manual') {
        const engine = getEngine();
        if (!engine.isRecognitionRunning() && engine.getState() !== 'ERROR') {
          engine.start();
        }
      }
    };

    window.addEventListener('click', handleScreenClickOrTouch, { capture: true });
    window.addEventListener('pointerdown', handleScreenClickOrTouch, { capture: true });
    window.addEventListener('touchstart', handleScreenClickOrTouch, { capture: true });

    return () => {
      window.removeEventListener('click', handleScreenClickOrTouch, { capture: true });
      window.removeEventListener('pointerdown', handleScreenClickOrTouch, { capture: true });
      window.removeEventListener('touchstart', handleScreenClickOrTouch, { capture: true });
    };
  }, [getEngine]);

  // Computed properties
  const theme = (settings.theme === 'sapphire' ? 'default' : settings.theme) as ThemeMode;
  const setTheme = (t: ThemeMode) => updateSettings({ theme: (t === 'default' ? 'sapphire' : t) as any });
  const fontSizeMap: Record<number, FontSize> = { 100: 'normal', 125: 'large', 150: 'xlarge', 175: 'xxlarge', 200: 'xxlarge' };
  const fontScaleMap: Record<FontSize, number> = { normal: 100, large: 125, xlarge: 150, xxlarge: 175 };
  const fontSize = fontSizeMap[settings.fontScale] || 'large';
  const setFontSize = (f: FontSize) => updateSettings({ fontScale: fontScaleMap[f] || 125 });
  const dyslexiaFont = !!settings.dyslexiaFont;
  const setDyslexiaFont = (d: boolean) => updateSettings({ dyslexiaFont: d });
  const speechRate = settings.speechRate || 1.0;
  const setSpeechRate = (r: number) => updateSettings({ speechRate: r });
  const compensatoryTime = !!settings.compensatoryTimeEnabled;
  const setCompensatoryTime = (c: boolean) => updateSettings({ compensatoryTimeEnabled: c });
  const whisperModel = settings.whisperModelSize || 'base';
  const setWhisperModel = (m: 'tiny' | 'base' | 'small') => updateSettings({ whisperModelSize: m });

  return (
    <AccessibilityContext.Provider
      value={{
        currentScreen,
        navigateTo,
        setCurrentScreen: navigateTo,
        user, setUser, loginUser, logout,
        isSidebarCollapsed, setIsSidebarCollapsed, toggleSidebar,
        isMobileNavOpen, setIsMobileNavOpen, toggleMobileNav,
        settings, updateSettings,
        speakText, speak: speakText,
        stopSpeaking, pauseSpeaking, resumeSpeaking, isPausedSpeaking,
        slowDownSpeech, isSpeaking,
        announce, activeAnnouncement, announceMessage: activeAnnouncement?.message || '',
        theme, setTheme, fontSize, setFontSize,
        fontFace, setFontFace,
        voiceAssistantState, capturedVoiceText,
        dyslexiaFont, setDyslexiaFont, speechRate, setSpeechRate,
        compensatoryTime, setCompensatoryTime, whisperModel, setWhisperModel,
        isBlindMode, setIsBlindMode, toggleBlindMode,
        isVisionMode: isBlindMode, setIsVisionMode: setIsBlindMode, toggleVisionMode: toggleBlindMode,
        isVisionAssistantActive, activateVisionAssistant, deactivateVisionAssistant,
        showKeyboardShortcutsModal, setShowKeyboardShortcutsModal,
        interactionMode,
        setInteractionMode: selectInteractionMode,
        selectInteractionMode,
        showModeSelectorModal,
        setShowModeSelectorModal,
        resetInteractionMode,
        isVoiceListening, micPermissionStatus,
        startVoiceListening, stopVoiceListening,
        registerVoiceHandler, playBeacon,
        isExamActive, setIsExamActive, pendingExamExit, confirmExamExit,
        executeVoiceCommand
      }}
    >
      <div id="voice-engine-aria-live" aria-live="polite" aria-atomic="true" className="sr-only" />
      <AccessibilityModeSelectorModal
        isOpen={showModeSelectorModal}
        onClose={() => setShowModeSelectorModal(false)}
        onSelectMode={selectInteractionMode}
        speakText={speakText}
        stopSpeaking={stopSpeaking}
        announce={announce}
      />
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityContextType {
  const context = useContext(AccessibilityContext);
  if (!context) throw new Error('useAccessibility must be used within an AccessibilityProvider');
  return context;
}
