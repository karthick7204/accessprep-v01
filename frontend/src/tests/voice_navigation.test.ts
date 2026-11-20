/**
 * ACCESSPREP-X — Global Voice Navigation Test Suite
 * Tests the pure-logic layer: commandParser and NavigationController.
 * No browser APIs or React needed; runs entirely in Node via tsx --test.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cleanVoiceTranscript,
  normalizePhonetics,
  parseConfirmationIntent,
  parseSystemControl,
  parseAssistanceIntent,
  matchScreenNavigation,
  stripNavigationPrefixes
} from '../voice/commandParser.ts';

import { SCREEN_TARGETS } from '../voice/commandRegistry.ts';
import { NavigationController, getScreenBlockReason } from '../voice/NavigationController.ts';
import { NavigationContext } from '../voice/commandTypes.ts';
import { ScreenId, APPROVED_SCREENS } from '../types/screens.ts';
import { User } from '../db/database.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCandidateUser(): User {
  return {
    id: 'usr_test_candidate',
    name: 'Test Candidate',
    email: 'candidate@test.com',
    passwordHash: 'x',
    role: 'candidate',
    rollNumber: 'TEST001',
    pwdCategory: 'None',
    needScribe: false,
    examRegion: 'Delhi',
    examLanguage: 'English',
    createdAt: new Date().toISOString()
  };
}

function makeAdminUser(): User {
  return { ...makeCandidateUser(), id: 'usr_admin', role: 'admin', name: 'Admin User' };
}

function makeContext(overrides: Partial<NavigationContext> = {}): NavigationContext {
  return {
    currentScreen: 'dashboard',
    user: makeCandidateUser(),
    isExamActive: false,
    pendingExamExit: null,
    historyStack: [],
    lastSpokenText: '',
    ...overrides
  };
}

function makeController(ctx?: Partial<NavigationContext>): {
  controller: NavigationController;
  navigated: ScreenId[];
  spoken: string[];
  loggedOut: boolean;
} {
  const navigated: ScreenId[] = [];
  const spoken: string[] = [];
  let loggedOut = false;

  const controller = new NavigationController({
    context: makeContext(ctx),
    navigate: (s) => navigated.push(s),
    speak: (t) => spoken.push(t),
    stopSpeak: () => {},
    logout: () => { loggedOut = true; }
  });

  return { controller, navigated, spoken, loggedOut };
}

// ---------------------------------------------------------------------------
// 1. Text normalization
// ---------------------------------------------------------------------------

test('Parser: cleanVoiceTranscript removes punctuation and lowercases', () => {
  assert.equal(cleanVoiceTranscript("Go to AI Tutor!"), 'go to ai tutor');
  assert.equal(cleanVoiceTranscript("OPEN Mock-Exam?"), 'open mock exam');
  assert.equal(cleanVoiceTranscript("  dashboard  "), 'dashboard');
  // Punctuation replaced by spaces then collapsed to single space
  assert.equal(cleanVoiceTranscript("Can you, open... settings!"), 'can you open settings');
});

test('Parser: normalizePhonetics fixes common homophones', () => {
  assert.equal(normalizePhonetics('eye tutor'), 'ai tutor');
  assert.equal(normalizePhonetics('i tutor'), 'ai tutor');
  assert.equal(normalizePhonetics('mark test'), 'mock test');
  assert.equal(normalizePhonetics('mark exam'), 'mock exam');
  assert.equal(normalizePhonetics('dash board'), 'dashboard');
});

test('Parser: stripNavigationPrefixes removes filler verbs', () => {
  assert.equal(stripNavigationPrefixes('go to dashboard'), 'dashboard');
  assert.equal(stripNavigationPrefixes('open ai tutor'), 'ai tutor');
  assert.equal(stripNavigationPrefixes('please take me to revision planner'), 'revision planner');
  // "show my progress" → strips "show my" prefix → "progress"
  assert.equal(stripNavigationPrefixes('show my progress'), 'progress');
  assert.equal(stripNavigationPrefixes('navigate to mock exam'), 'mock exam');
  assert.equal(stripNavigationPrefixes('dashboard'), 'dashboard');
});

// ---------------------------------------------------------------------------
// 2. Confirmation intent
// ---------------------------------------------------------------------------

test('Parser: parseConfirmationIntent detects Yes', () => {
  assert.equal(parseConfirmationIntent('yes'), 'yes');
  assert.equal(parseConfirmationIntent('yeah'), 'yes');
  assert.equal(parseConfirmationIntent('sure'), 'yes');
  assert.equal(parseConfirmationIntent('confirm'), 'yes');
  assert.equal(parseConfirmationIntent('pause and leave'), 'yes');
  assert.equal(parseConfirmationIntent('ok'), 'yes');
});

test('Parser: parseConfirmationIntent detects No', () => {
  assert.equal(parseConfirmationIntent('no'), 'no');
  assert.equal(parseConfirmationIntent('cancel'), 'no');
  assert.equal(parseConfirmationIntent('stay'), 'no');
  assert.equal(parseConfirmationIntent('resume'), 'no');
  assert.equal(parseConfirmationIntent('resume exam'), 'no');
  assert.equal(parseConfirmationIntent('do not leave'), 'no');
});

test('Parser: parseConfirmationIntent returns null for ambiguous', () => {
  assert.equal(parseConfirmationIntent('maybe'), null);
  assert.equal(parseConfirmationIntent('what'), null);
  assert.equal(parseConfirmationIntent(''), null);
});

// ---------------------------------------------------------------------------
// 3. System control
// ---------------------------------------------------------------------------

test('Parser: parseSystemControl detects stop speaking', () => {
  assert.equal(parseSystemControl('stop speaking'), 'stop_speaking');
  assert.equal(parseSystemControl('be quiet'), 'stop_speaking');
  assert.equal(parseSystemControl('silence'), 'stop_speaking');
  assert.equal(parseSystemControl('mute'), 'stop_speaking');
});

test('Parser: parseSystemControl detects repeat', () => {
  assert.equal(parseSystemControl('repeat'), 'repeat');
  assert.equal(parseSystemControl('say that again'), 'repeat');
  assert.equal(parseSystemControl('say again'), 'repeat');
});

test('Parser: parseSystemControl returns null for other phrases', () => {
  assert.equal(parseSystemControl('dashboard'), null);
  assert.equal(parseSystemControl('open mock exam'), null);
});

// ---------------------------------------------------------------------------
// 4. Assistance intent
// ---------------------------------------------------------------------------

test('Parser: parseAssistanceIntent detects where_am_i', () => {
  assert.equal(parseAssistanceIntent('where am i'), 'where_am_i');
  assert.equal(parseAssistanceIntent('what screen is this'), 'where_am_i');
  assert.equal(parseAssistanceIntent('current screen'), 'where_am_i');
});

test('Parser: parseAssistanceIntent detects what_can_i_do', () => {
  assert.equal(parseAssistanceIntent('what can i do here'), 'what_can_i_do');
  assert.equal(parseAssistanceIntent('what can i do'), 'what_can_i_do');
  assert.equal(parseAssistanceIntent('available actions'), 'what_can_i_do');
});

test('Parser: parseAssistanceIntent detects help_navigation', () => {
  assert.equal(parseAssistanceIntent('help me navigate'), 'help_navigation');
  assert.equal(parseAssistanceIntent('help'), 'help_navigation');
  assert.equal(parseAssistanceIntent('commands'), 'help_navigation');
  assert.equal(parseAssistanceIntent('menu'), 'help_navigation');
});

test('Parser: parseAssistanceIntent detects go_back', () => {
  assert.equal(parseAssistanceIntent('go back'), 'go_back');
  assert.equal(parseAssistanceIntent('back'), 'go_back');
  assert.equal(parseAssistanceIntent('take me back'), 'go_back');
});

test('Parser: parseAssistanceIntent detects logout', () => {
  assert.equal(parseAssistanceIntent('log out'), 'logout');
  assert.equal(parseAssistanceIntent('logout'), 'logout');
  assert.equal(parseAssistanceIntent('sign out'), 'logout');
});

// ---------------------------------------------------------------------------
// 5. Screen matching — all 16 screens
// ---------------------------------------------------------------------------

test('Screen matching: dashboard aliases', () => {
  const cases = ['dashboard', 'home', 'go to dashboard', 'take me home', 'overview'];
  for (const phrase of cases) {
    const result = matchScreenNavigation(phrase);
    assert.ok(result, `Expected match for "${phrase}"`);
    assert.equal(result!.target.screenId, 'dashboard', `Expected dashboard for "${phrase}"`);
  }
});

test('Screen matching: mock exam aliases', () => {
  const cases = [
    'mock exam',
    'mock examination',
    'start mock test',
    'give exam',
    'mock test',
    'take test',
    'full test',
    'open exam'
  ];
  for (const phrase of cases) {
    const result = matchScreenNavigation(phrase);
    assert.ok(result, `Expected match for "${phrase}"`);
    assert.equal(result!.target.screenId, 'mock_exam', `Expected mock_exam for "${phrase}"`);
  }
});

test('Screen matching: ai tutor aliases', () => {
  const cases = ['ai tutor', 'open ai tutor', 'ask my tutor', 'tutor', 'talk to tutor'];
  for (const phrase of cases) {
    const result = matchScreenNavigation(phrase);
    assert.ok(result, `Expected match for "${phrase}"`);
    assert.equal(result!.target.screenId, 'ai_tutor', `Expected ai_tutor for "${phrase}"`);
  }
});

test('Screen matching: voice practice aliases', () => {
  const cases = ['voice practice', 'practice', 'start practice', 'practice session'];
  for (const phrase of cases) {
    const result = matchScreenNavigation(phrase);
    assert.ok(result, `Expected match for "${phrase}"`);
    assert.equal(result!.target.screenId, 'voice_practice', `Expected voice_practice for "${phrase}"`);
  }
});

test('Screen matching: revision planner aliases', () => {
  const cases = ['revision planner', 'revision', 'flashcards', 'spaced repetition', 'study cards'];
  for (const phrase of cases) {
    const result = matchScreenNavigation(phrase);
    assert.ok(result, `Expected match for "${phrase}"`);
    assert.equal(result!.target.screenId, 'revision_planner', `Expected revision_planner for "${phrase}"`);
  }
});

test('Screen matching: progress aliases', () => {
  const cases = ['progress', 'my progress', 'analytics', 'scorecard', 'show my progress'];
  for (const phrase of cases) {
    const result = matchScreenNavigation(phrase);
    assert.ok(result, `Expected match for "${phrase}"`);
    assert.equal(result!.target.screenId, 'progress', `Expected progress for "${phrase}"`);
  }
});

test('Screen matching: topic mastery aliases', () => {
  const cases = ['topic mastery', 'mastery', 'bkt', 'knowledge tracing'];
  for (const phrase of cases) {
    const result = matchScreenNavigation(phrase);
    assert.ok(result, `Expected match for "${phrase}"`);
    assert.equal(result!.target.screenId, 'topic_mastery', `Expected topic_mastery for "${phrase}"`);
  }
});

test('Screen matching: accessibility settings aliases', () => {
  const cases = ['accessibility settings', 'settings', 'contrast', 'preferences'];
  for (const phrase of cases) {
    const result = matchScreenNavigation(phrase);
    assert.ok(result, `Expected match for "${phrase}"`);
    assert.equal(result!.target.screenId, 'accessibility_settings', `Expected accessibility_settings for "${phrase}"`);
  }
});

test('Screen matching: screen reader settings aliases', () => {
  const cases = ['screen reader settings', 'open screen reader settings', 'screen reader', 'voice settings'];
  for (const phrase of cases) {
    const result = matchScreenNavigation(phrase);
    assert.ok(result, `Expected match for "${phrase}"`);
    assert.equal(result!.target.screenId, 'screen_reader_settings', `Expected screen_reader_settings for "${phrase}"`);
  }
});

test('Screen matching: learning history aliases', () => {
  const cases = ['learning history', 'history', 'past tests', 'archive'];
  for (const phrase of cases) {
    const result = matchScreenNavigation(phrase);
    assert.ok(result, `Expected match for "${phrase}"`);
    assert.equal(result!.target.screenId, 'learning_history', `Expected learning_history for "${phrase}"`);
  }
});

test('Screen matching: topics aliases', () => {
  const cases = ['topics', 'subjects', 'syllabus', 'explore topics', 'curriculum'];
  for (const phrase of cases) {
    const result = matchScreenNavigation(phrase);
    assert.ok(result, `Expected match for "${phrase}"`);
    assert.equal(result!.target.screenId, 'topics', `Expected topics for "${phrase}"`);
  }
});

test('Screen matching: results aliases', () => {
  const cases = ['results', 'my results', 'score', 'explanations'];
  for (const phrase of cases) {
    const result = matchScreenNavigation(phrase);
    assert.ok(result, `Expected match for "${phrase}"`);
    assert.equal(result!.target.screenId, 'results', `Expected results for "${phrase}"`);
  }
});

test('Screen matching: login aliases', () => {
  const cases = ['login', 'log in', 'sign in', 'candidate login'];
  for (const phrase of cases) {
    const result = matchScreenNavigation(phrase);
    assert.ok(result, `Expected match for "${phrase}"`);
    assert.equal(result!.target.screenId, 'login', `Expected login for "${phrase}"`);
  }
});

test('Screen matching: register aliases', () => {
  const cases = ['register', 'registration', 'sign up', 'create account'];
  for (const phrase of cases) {
    const result = matchScreenNavigation(phrase);
    assert.ok(result, `Expected match for "${phrase}"`);
    assert.equal(result!.target.screenId, 'register', `Expected register for "${phrase}"`);
  }
});

test('Screen matching: admin screens — model_evaluation and model_training', () => {
  const evalResult = matchScreenNavigation('model evaluation');
  assert.ok(evalResult);
  assert.equal(evalResult!.target.screenId, 'model_evaluation');

  const trainResult = matchScreenNavigation('model training');
  assert.ok(trainResult);
  assert.equal(trainResult!.target.screenId, 'model_training');
});

test('Screen matching: subject-filtered practice triggers', () => {
  const cases: { phrase: string; subject: string }[] = [
    { phrase: 'practice reasoning', subject: 'Reasoning Ability and Problem Solving' },
    { phrase: 'practice math', subject: 'Numerical and Mathematical Ability' },
    { phrase: 'practice numerical', subject: 'Numerical and Mathematical Ability' },
    { phrase: 'practice english', subject: 'English Language and Comprehension' },
    { phrase: 'practice general awareness', subject: 'General Awareness' }
  ];

  for (const { phrase, subject } of cases) {
    const result = matchScreenNavigation(phrase);
    assert.ok(result, `Expected match for "${phrase}"`);
    assert.equal(result!.target.screenId, 'voice_practice', `Expected voice_practice for "${phrase}"`);
    assert.equal(result!.subjectFilter, subject, `Expected subject "${subject}" for "${phrase}"`);
  }
});

test('Screen matching: returns null for unrecognized phrases', () => {
  const cases = ['banana', 'hello there', 'xyz123', 'test me'];
  for (const phrase of cases) {
    const result = matchScreenNavigation(phrase);
    assert.equal(result, null, `Expected null for unrecognized phrase "${phrase}"`);
  }
});

// ---------------------------------------------------------------------------
// 6. Role-based screen access
// ---------------------------------------------------------------------------

test('getScreenBlockReason: candidate blocked from admin screens', () => {
  const candidate = makeCandidateUser();
  assert.ok(getScreenBlockReason('model_evaluation', candidate));
  assert.ok(getScreenBlockReason('model_training', candidate));
});

test('getScreenBlockReason: admin can access all screens', () => {
  const admin = makeAdminUser();
  assert.equal(getScreenBlockReason('model_evaluation', admin), null);
  assert.equal(getScreenBlockReason('model_training', admin), null);
});

test('getScreenBlockReason: unauthenticated user blocked from auth-required screens', () => {
  assert.ok(getScreenBlockReason('dashboard', null));
  assert.ok(getScreenBlockReason('mock_exam', null));
  assert.ok(getScreenBlockReason('ai_tutor', null));
});

test('getScreenBlockReason: unauthenticated user can access public screens', () => {
  assert.equal(getScreenBlockReason('login', null), null);
  assert.equal(getScreenBlockReason('register', null), null);
  assert.equal(getScreenBlockReason('accessibility_settings', null), null);
  assert.equal(getScreenBlockReason('welcome', null), null);
});

// ---------------------------------------------------------------------------
// 7. NavigationController — global navigation
// ---------------------------------------------------------------------------

test('NavigationController: routes dashboard command and speaks confirmation', async () => {
  const { controller, navigated, spoken } = makeController();
  const result = await controller.processTranscript('go to dashboard');
  assert.equal(result.status, 'success');
  assert.equal(result.destination, 'dashboard');
  assert.ok(result.spokenResponse.toLowerCase().includes('dashboard'));
  assert.deepEqual(navigated, ['dashboard']);
});

test('NavigationController: routes mock exam command', async () => {
  const { controller, navigated } = makeController({ currentScreen: 'dashboard' });
  const result = await controller.processTranscript('start mock test');
  assert.equal(result.status, 'success');
  assert.equal(result.destination, 'mock_exam');
  assert.deepEqual(navigated, ['mock_exam']);
});

test('NavigationController: routes ai tutor command', async () => {
  const { controller, navigated } = makeController();
  const result = await controller.processTranscript('open ai tutor');
  assert.equal(result.status, 'success');
  assert.equal(result.destination, 'ai_tutor');
  assert.deepEqual(navigated, ['ai_tutor']);
});

test('NavigationController: routes progress command', async () => {
  const { controller, navigated } = makeController();
  const result = await controller.processTranscript('show my progress');
  assert.equal(result.status, 'success');
  assert.equal(result.destination, 'progress');
  assert.deepEqual(navigated, ['progress']);
});

// ---------------------------------------------------------------------------
// 8. Admin screen restriction
// ---------------------------------------------------------------------------

test('NavigationController: candidate blocked from model_evaluation', async () => {
  const { controller, navigated } = makeController({ user: makeCandidateUser() });
  const result = await controller.processTranscript('model evaluation');
  assert.equal(result.status, 'forbidden_role');
  assert.equal(navigated.length, 0);
});

test('NavigationController: candidate blocked from model_training', async () => {
  const { controller, navigated } = makeController({ user: makeCandidateUser() });
  const result = await controller.processTranscript('model training');
  assert.equal(result.status, 'forbidden_role');
  assert.equal(navigated.length, 0);
});

test('NavigationController: admin can navigate to model_evaluation', async () => {
  const { controller, navigated } = makeController({ user: makeAdminUser() });
  const result = await controller.processTranscript('model evaluation');
  assert.equal(result.status, 'success');
  assert.equal(result.destination, 'model_evaluation');
  assert.deepEqual(navigated, ['model_evaluation']);
});

// ---------------------------------------------------------------------------
// 9. Active exam safety guard
// ---------------------------------------------------------------------------

test('NavigationController: navigation blocked when exam is active', async () => {
  const { controller, navigated } = makeController({
    currentScreen: 'mock_exam',
    isExamActive: true
  });
  const result = await controller.processTranscript('go to dashboard');
  assert.equal(result.status, 'blocked_by_active_exam');
  assert.equal(result.needsConfirmation, true);
  assert.equal(navigated.length, 0); // No navigation yet
  assert.ok(result.spokenResponse.toLowerCase().includes('examination'));
});

test('NavigationController: "Yes" to exam exit proceeds with navigation', async () => {
  const { controller, navigated } = makeController({
    currentScreen: 'mock_exam',
    isExamActive: true
  });

  // Trigger exam block first
  const blockResult = await controller.processTranscript('go to ai tutor');
  assert.equal(blockResult.status, 'blocked_by_active_exam');

  // Now confirm Yes
  const yesResult = await controller.processTranscript('yes');
  assert.equal(yesResult.status, 'success');
  assert.equal(yesResult.destination, 'ai_tutor');
  assert.deepEqual(navigated, ['ai_tutor']);
});

test('NavigationController: "No" to exam exit stays on mock exam', async () => {
  const { controller, navigated } = makeController({
    currentScreen: 'mock_exam',
    isExamActive: true
  });

  // Trigger exam block
  await controller.processTranscript('go to dashboard');

  // Refuse to leave
  const noResult = await controller.processTranscript('no');
  assert.equal(noResult.status, 'local_handled');
  assert.ok(noResult.spokenResponse.toLowerCase().includes('examination'));
  assert.equal(navigated.length, 0); // Still no navigation
});

test('NavigationController: ambiguous during pending exam exit re-prompts', async () => {
  const { controller } = makeController({
    currentScreen: 'mock_exam',
    isExamActive: true
  });

  await controller.processTranscript('open ai tutor');

  // Say something unrelated while pending
  const ambiguousResult = await controller.processTranscript('what is the capital of India');
  assert.equal(ambiguousResult.status, 'ambiguous');
  assert.ok(ambiguousResult.spokenResponse.toLowerCase().includes('examination'));
});

// ---------------------------------------------------------------------------
// 10. Assistance intents
// ---------------------------------------------------------------------------

test('NavigationController: "where am i" returns current screen info', async () => {
  const { controller } = makeController({ currentScreen: 'progress' });
  const result = await controller.processTranscript('where am i');
  assert.equal(result.status, 'assistance_provided');
  assert.ok(result.spokenResponse.toLowerCase().includes('progress'));
});

test('NavigationController: "what can i do here" returns screen summary', async () => {
  const { controller } = makeController({ currentScreen: 'ai_tutor' });
  const result = await controller.processTranscript('what can i do here');
  assert.equal(result.status, 'assistance_provided');
  assert.ok(result.spokenResponse.length > 20);
});

test('NavigationController: "help me navigate" lists available screens', async () => {
  const { controller } = makeController({ user: makeCandidateUser() });
  const result = await controller.processTranscript('help me navigate');
  assert.equal(result.status, 'assistance_provided');
  assert.ok(result.spokenResponse.toLowerCase().includes('dashboard'));
  assert.ok(result.spokenResponse.toLowerCase().includes('mock'));
  // Admin-only screens should NOT be listed for a candidate
  assert.ok(!result.spokenResponse.toLowerCase().includes('model evaluation'));
});

test('NavigationController: "help me navigate" lists admin screens for admin', async () => {
  const { controller } = makeController({ user: makeAdminUser() });
  const result = await controller.processTranscript('help me navigate');
  assert.equal(result.status, 'assistance_provided');
  assert.ok(result.spokenResponse.toLowerCase().includes('evaluation'));
});

// ---------------------------------------------------------------------------
// 11. System controls
// ---------------------------------------------------------------------------

test('NavigationController: "stop speaking" handled without navigation', async () => {
  const { controller, navigated } = makeController();
  const result = await controller.processTranscript('stop speaking');
  assert.equal(result.status, 'system_handled');
  assert.equal(result.spokenResponse, '');
  assert.equal(navigated.length, 0);
});

test('NavigationController: "repeat" replays last spoken text', async () => {
  const { controller } = makeController();
  controller.recordSpokenText('Opening your candidate dashboard now.');
  const result = await controller.processTranscript('repeat');
  assert.equal(result.status, 'system_handled');
  assert.equal(result.spokenResponse, 'Opening your candidate dashboard now.');
});

// ---------------------------------------------------------------------------
// 12. Logout
// ---------------------------------------------------------------------------

test('NavigationController: logout intent triggers logout outside exam', async () => {
  const { controller, loggedOut } = makeController({ currentScreen: 'dashboard' });

  // Not in exam — logout should proceed immediately
  let didLogout = false;
  const c2 = new NavigationController({
    context: makeContext(),
    navigate: () => {},
    speak: () => {},
    stopSpeak: () => {},
    logout: () => { didLogout = true; }
  });

  const result = await c2.processTranscript('log out');
  assert.equal(result.status, 'system_handled');
  assert.ok(didLogout);
});

// ---------------------------------------------------------------------------
// 13. Screen-local handler priority
// ---------------------------------------------------------------------------

test('NavigationController: screen-local handler takes priority over global nav', async () => {
  const { controller, navigated } = makeController();

  // Screen handler consumes all speech
  const localHandler = (_: string): boolean => true;

  const result = await controller.processTranscript('go to dashboard', localHandler);
  assert.equal(result.status, 'local_handled');
  // navigateTo should NOT have been called because local handler consumed it
  assert.equal(navigated.length, 0);
});

test('NavigationController: global nav fires when screen handler returns false', async () => {
  const { controller, navigated } = makeController();

  // Screen handler doesn't consume this input
  const localHandler = (_: string): boolean => false;

  const result = await controller.processTranscript('go to dashboard', localHandler);
  assert.equal(result.status, 'success');
  assert.equal(navigated.length, 1);
  assert.equal(navigated[0], 'dashboard');
});

// ---------------------------------------------------------------------------
// 14. Unauthenticated access
// ---------------------------------------------------------------------------

test('NavigationController: unauthenticated user redirected to login', async () => {
  const { controller, navigated } = makeController({ user: null });
  const result = await controller.processTranscript('go to dashboard');
  assert.equal(result.status, 'unauthenticated');
  assert.equal(navigated[0], 'login');
});

// ---------------------------------------------------------------------------
// 15. Unrecognized fallback
// ---------------------------------------------------------------------------

test('NavigationController: unrecognized phrase returns helpful fallback', async () => {
  const { controller } = makeController();
  const result = await controller.processTranscript('open the window please');
  assert.equal(result.status, 'unrecognized');
  assert.ok(result.spokenResponse.toLowerCase().includes('try saying'));
});

// ---------------------------------------------------------------------------
// 16. Registry integrity check
// ---------------------------------------------------------------------------

test('Voice Registry: all 18 APPROVED_SCREENS have entries in SCREEN_TARGETS', () => {
  for (const screenId of APPROVED_SCREENS) {
    const target = SCREEN_TARGETS[screenId];
    assert.ok(target, `Missing registry entry for screen: ${screenId}`);
    assert.ok(target.aliases.length > 0, `Screen ${screenId} has no aliases`);
    assert.ok(target.spokenName.length > 0, `Screen ${screenId} has no spokenName`);
  }
});

test('Voice Registry: exactly 18 screen targets registered', () => {
  const count = Object.keys(SCREEN_TARGETS).length;
  assert.equal(count, 18, `Expected 18 SCREEN_TARGETS, got ${count}`);
});

// ---------------------------------------------------------------------------
// 17. Hey Vision & Settings Screen Descriptions
// ---------------------------------------------------------------------------

test('Wake Word: "Hey Vision" includes Accessibility Settings and Screen Reader Settings in spoken response', async () => {
  const { controller } = makeController({ currentScreen: 'dashboard' });
  const result = await controller.processTranscript('hey vision');
  assert.equal(result.status, 'system_handled');
  const lower = result.spokenResponse.toLowerCase();
  assert.ok(lower.includes('accessibility settings'), 'Expected spoken response to mention accessibility settings');
  assert.ok(lower.includes('screen reader settings'), 'Expected spoken response to mention screen reader settings');
  assert.ok(lower.includes('font face') || lower.includes('typography') || lower.includes('font'), 'Expected description of font face/typography');
  assert.ok(lower.includes('speech rate') || lower.includes('pitch') || lower.includes('speech speed'), 'Expected description of speech controls');
});

test('Wake Word: "Hey Vision" on Accessibility Settings gives context-aware page commands', async () => {
  const { controller } = makeController({ currentScreen: 'accessibility_settings' });
  const result = await controller.processTranscript('hey vision');
  assert.equal(result.status, 'system_handled');
  const lower = result.spokenResponse.toLowerCase();
  assert.ok(lower.includes('accessibility settings'), 'Expected reference to current page');
  assert.ok(lower.includes('font face') || lower.includes('hyperlegible') || lower.includes('font'), 'Expected font face command guidance');
  assert.ok(lower.includes('font'), 'Expected font scaling command guidance');
  assert.ok(lower.includes('compensatory time'), 'Expected compensatory time guidance');
});

test('Wake Word: "Hey Vision" on Screen Reader Settings gives context-aware page commands', async () => {
  const { controller } = makeController({ currentScreen: 'screen_reader_settings' });
  const result = await controller.processTranscript('hey vision');
  assert.equal(result.status, 'system_handled');
  const lower = result.spokenResponse.toLowerCase();
  assert.ok(lower.includes('screen reader settings'), 'Expected reference to current page');
  assert.ok(lower.includes('speech speed') || lower.includes('speed 2x'), 'Expected speech speed command guidance');
  assert.ok(lower.includes('pitch'), 'Expected pitch command guidance');
  assert.ok(lower.includes('volume'), 'Expected volume command guidance');
  assert.ok(lower.includes('save preferences') || lower.includes('save'), 'Expected save preferences guidance');
});

test('Screen matching: expanded accessibility settings aliases', () => {
  const cases = [
    'accessibility settings',
    'open accessibility settings',
    'go to accessibility settings',
    'contrast settings',
    'visual settings',
    'visual accessibility',
    'color theme',
    'accessibility menu'
  ];
  for (const phrase of cases) {
    const result = matchScreenNavigation(phrase);
    assert.ok(result, `Expected match for "${phrase}"`);
    assert.equal(result!.target.screenId, 'accessibility_settings', `Expected accessibility_settings for "${phrase}"`);
  }
});

test('Screen matching: expanded screen reader settings aliases', () => {
  const cases = [
    'screen reader settings',
    'open screen reader settings',
    'go to screen reader settings',
    'voice settings',
    'open voice settings',
    'speech settings',
    'audio settings',
    'screen reader options',
    'voice speed'
  ];
  for (const phrase of cases) {
    const result = matchScreenNavigation(phrase);
    assert.ok(result, `Expected match for "${phrase}"`);
    assert.equal(result!.target.screenId, 'screen_reader_settings', `Expected screen_reader_settings for "${phrase}"`);
  }
});
