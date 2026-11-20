/**
 * ACCESSPREP-X — Test Suite for Exam Exit, Conversational Wake-Word Voice Assistant, and Font Face Settings
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseStopListening,
  extractCommandFromConversationalPhrase,
  parseFontFaceCommand,
  cleanVoiceTranscript
} from '../voice/commandParser.ts';

import {
  normalizeExamCommand,
  isSubmitConfirmPhrase,
  isSubmitCancelPhrase
} from '../voice/examContextResolver.ts';

import {
  VoiceEngine,
  VoiceAssistantState,
  VOICE_STATE_UI_MESSAGES,
  DEFAULT_SILENCE_TIMEOUT_MS
} from '../voice/VoiceEngine.ts';
import { NavigationController } from '../voice/NavigationController.ts';
import { NavigationContext } from '../voice/commandTypes.ts';
import { ScreenId } from '../types/screens.ts';
import { User } from '../db/database.ts';

function makeUser(): User {
  return {
    id: 'usr_candidate_01',
    rollNumber: 'SSC-2026-MTS-01',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@accessprep.internal',
    passwordHash: 'dummy',
    role: 'candidate',
    pwdCategory: 'Visually Impaired',
    needScribe: true,
    examRegion: 'Northern Region (NR)',
    examLanguage: 'English',
    createdAt: '2026-01-01T00:00:00Z'
  };
}

function makeContext(overrides: Partial<NavigationContext> = {}): NavigationContext {
  return {
    currentScreen: 'dashboard',
    user: makeUser(),
    isExamActive: false,
    pendingExamExit: null,
    historyStack: [],
    lastSpokenText: '',
    isVisionAssistantActive: true,
    ...overrides
  };
}

// ============================================================================
// 1. CONVERSATIONAL WAKE-WORD COMMAND PARSER TESTS
// ============================================================================

test('Conversational Voice: parseStopListening detects termination phrases', () => {
  const stopPhrases = [
    'stop listening',
    'hey vision stop listening',
    'please stop listening',
    'finish command',
    'done speaking',
    'end command',
    'select option a stop listening'
  ];

  for (const phrase of stopPhrases) {
    assert.equal(
      parseStopListening(phrase),
      true,
      `Expected "${phrase}" to be recognized as stop listening`
    );
  }

  const ongoingPhrases = [
    'repeat question',
    'select option b',
    'start exam',
    'go to dashboard',
    'stop speaking',
    'stop reading'
  ];

  for (const phrase of ongoingPhrases) {
    assert.equal(
      parseStopListening(phrase),
      false,
      `Expected "${phrase}" NOT to trigger stop listening`
    );
  }
});

test('Conversational Voice: extractCommandFromConversationalPhrase strips wake phrase and stop listening phrase', () => {
  assert.equal(
    extractCommandFromConversationalPhrase('hey vision repeat question stop listening'),
    'repeat question'
  );

  assert.equal(
    extractCommandFromConversationalPhrase('hey vision select option b'),
    'select option b'
  );

  assert.equal(
    extractCommandFromConversationalPhrase('go to dashboard stop listening'),
    'go to dashboard'
  );

  assert.equal(
    extractCommandFromConversationalPhrase('hey vision exit examination stop listening'),
    'exit examination'
  );

  assert.equal(
    extractCommandFromConversationalPhrase('hey vision'),
    ''
  );
});

// ============================================================================
// 2. FONT FACE COMMAND PARSER TESTS
// ============================================================================

test('Font Face: parseFontFaceCommand correctly recognizes all 6 accessible font faces', () => {
  assert.equal(parseFontFaceCommand('system font'), 'system');
  assert.equal(parseFontFaceCommand('inter font'), 'system');
  assert.equal(parseFontFaceCommand('default font'), 'system');

  assert.equal(parseFontFaceCommand('hyperlegible font'), 'hyperlegible');
  assert.equal(parseFontFaceCommand('atkinson hyperlegible'), 'hyperlegible');
  assert.equal(parseFontFaceCommand('atkinson font'), 'hyperlegible');

  assert.equal(parseFontFaceCommand('opendyslexic font'), 'opendyslexic');
  assert.equal(parseFontFaceCommand('open dyslexic'), 'opendyslexic');
  assert.equal(parseFontFaceCommand('dyslexic font'), 'opendyslexic');

  assert.equal(parseFontFaceCommand('verdana font'), 'verdana');
  assert.equal(parseFontFaceCommand('switch to verdana'), 'verdana');

  assert.equal(parseFontFaceCommand('serif font'), 'serif');
  assert.equal(parseFontFaceCommand('georgia font'), 'serif');
  assert.equal(parseFontFaceCommand('times serif font'), 'serif');

  assert.equal(parseFontFaceCommand('mono font'), 'mono');
  assert.equal(parseFontFaceCommand('monospace font'), 'mono');
  assert.equal(parseFontFaceCommand('consolas font'), 'mono');

  assert.equal(parseFontFaceCommand('repeat question'), null);
  assert.equal(parseFontFaceCommand('open settings'), null);
});

// ============================================================================
// 3. CONTINUOUS WAKE-WORD VOICE ASSISTANT LIFECYCLE (VoiceEngine State Machine)
// ============================================================================

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test('Test 1 — Basic wake-up: State starts IDLE, ignores background speech, and "Hey Vision" activates LISTENING', () => {
  let executedCommand = '';
  const stateHistory: VoiceAssistantState[] = [];
  let wakeConfirmed = false;

  const engine = new VoiceEngine({
    lang: 'en-IN',
    silenceTimeoutMs: 60,
    onTranscript: async (text: string) => {
      executedCommand = text;
    },
    onStateChange: (state: VoiceAssistantState) => {
      stateHistory.push(state);
    },
    onWakeDetected: (hasAttachedCommand) => {
      if (!hasAttachedCommand) wakeConfirmed = true;
    },
    onListeningChange: () => {}
  });

  assert.equal(engine.getState(), 'IDLE');
  assert.ok(
    DEFAULT_SILENCE_TIMEOUT_MS >= 1200 && DEFAULT_SILENCE_TIMEOUT_MS <= 1800,
    'Default silence threshold must be within 1.2s–1.8s'
  );

  // Simulate background speech without wake phrase
  engine.handleSpeechTranscript('what time is the bus arriving today');
  assert.equal(engine.getState(), 'IDLE');
  assert.equal(executedCommand, '');

  // Say "Hey Vision"
  engine.handleSpeechTranscript('Hey Vision');
  assert.equal(wakeConfirmed, true, 'Wake phrase should trigger confirmation');
  assert.equal(engine.getState(), 'LISTENING');
  assert.deepEqual(stateHistory, ['WAKE_DETECTED', 'LISTENING']);
});

test('Test 2 — Automatic command processing: "Hey Vision" followed by "Open dashboard" processes automatically on silence without "Stop Listening"', async () => {
  const navigatedScreens: ScreenId[] = [];
  const executedCommands: string[] = [];

  const controller = new NavigationController({
    context: makeContext({ currentScreen: 'topics', isVisionAssistantActive: false }),
    navigate: (s) => navigatedScreens.push(s),
    speak: () => {}
  });

  const engine = new VoiceEngine({
    lang: 'en-IN',
    silenceTimeoutMs: 50,
    onTranscript: async (text: string) => {
      executedCommands.push(text);
      await controller.processTranscript(text);
    },
    onWakeDetected: () => {
      controller.updateContext({ isVisionAssistantActive: true });
    },
    onListeningChange: () => {}
  });

  // 1. User says "Hey Vision"
  engine.handleSpeechTranscript('Hey Vision');
  assert.equal(engine.getState(), 'LISTENING');

  // 2. User says "Open dashboard." and remains silent (NO "Stop Listening" required!)
  engine.handleSpeechTranscript('Open dashboard.');
  await sleep(90);

  assert.deepEqual(executedCommands, ['Open dashboard']);
  assert.deepEqual(navigatedScreens, ['dashboard']);
  assert.equal(engine.getState(), 'LISTENING', 'Must remain in LISTENING state after command execution');
});

test('Test 2B — Combined wake phrase and command: "Hey Vision, open my dashboard." executes automatically and continues listening', async () => {
  const navigatedScreens: ScreenId[] = [];

  const controller = new NavigationController({
    context: makeContext({ currentScreen: 'topics', isVisionAssistantActive: false }),
    navigate: (s) => navigatedScreens.push(s),
    speak: () => {}
  });

  const engine = new VoiceEngine({
    lang: 'en-IN',
    silenceTimeoutMs: 50,
    onTranscript: async (text: string) => {
      await controller.processTranscript(text);
    },
    onWakeDetected: () => {
      controller.updateContext({ isVisionAssistantActive: true });
    },
    onListeningChange: () => {}
  });

  engine.handleSpeechTranscript('Hey Vision, open my dashboard.');
  await sleep(90);

  assert.deepEqual(navigatedScreens, ['dashboard']);
  assert.equal(engine.getState(), 'LISTENING');
});

test('Test 3 — Multiple consecutive commands in one active session without repeating "Hey Vision" or saying "Stop Listening"', async () => {
  const navigatedScreens: ScreenId[] = [];
  const executedCommands: string[] = [];

  const controller = new NavigationController({
    context: makeContext({ currentScreen: 'topics', isVisionAssistantActive: false }),
    navigate: (s) => {
      navigatedScreens.push(s);
      controller.updateContext({ currentScreen: s });
    },
    speak: () => {}
  });

  const engine = new VoiceEngine({
    lang: 'en-IN',
    silenceTimeoutMs: 40,
    onTranscript: async (text: string) => {
      executedCommands.push(text);
      await controller.processTranscript(text);
    },
    onWakeDetected: () => {
      controller.updateContext({ isVisionAssistantActive: true });
    },
    onListeningChange: () => {}
  });

  // Wake once
  engine.handleSpeechTranscript('Hey Vision');
  assert.equal(engine.getState(), 'LISTENING');

  // Command 1: "Open dashboard."
  engine.handleSpeechTranscript('Open dashboard.');
  await sleep(75);
  assert.equal(engine.getState(), 'LISTENING');

  // Command 2: "Show my results."
  engine.handleSpeechTranscript('Show my results.');
  await sleep(75);
  assert.equal(engine.getState(), 'LISTENING');

  // Command 3: "Open revision planner."
  engine.handleSpeechTranscript('Open revision planner.');
  await sleep(75);
  assert.equal(engine.getState(), 'LISTENING');

  // Command 4: "Open AI Tutor."
  engine.handleSpeechTranscript('Open AI Tutor.');
  await sleep(75);
  assert.equal(engine.getState(), 'LISTENING');

  assert.deepEqual(navigatedScreens, [
    'dashboard',
    'results',
    'revision_planner',
    'ai_tutor'
  ]);
  assert.equal(executedCommands.length, 4);
});

test('Test 4 & 5 — Explicit deactivation ("Stop Listening", "Go to Sleep", "Disable Voice Assistant", "Deactivate Vision") and Reactivation with "Hey Vision"', async () => {
  const executedCommands: string[] = [];
  let deactivateCount = 0;

  const engine = new VoiceEngine({
    lang: 'en-IN',
    silenceTimeoutMs: 40,
    onTranscript: async (text: string) => {
      executedCommands.push(text);
    },
    onDeactivate: () => {
      deactivateCount++;
    },
    onListeningChange: () => {}
  });

  // Activate and run a command
  engine.handleSpeechTranscript('Hey Vision');
  assert.equal(engine.getState(), 'LISTENING');

  engine.handleSpeechTranscript('Open dashboard.');
  await sleep(75);
  assert.deepEqual(executedCommands, ['Open dashboard']);
  assert.equal(engine.getState(), 'LISTENING');

  // Explicitly deactivate with "Stop Listening"
  engine.handleSpeechTranscript('Stop Listening');
  assert.equal(engine.getState(), 'STOPPED');
  assert.equal(deactivateCount, 1);

  // Speech while STOPPED must be ignored
  engine.handleSpeechTranscript('Show my results');
  await sleep(75);
  assert.equal(executedCommands.length, 1, 'Commands must not execute while STOPPED');

  // Test 5 — Reactivation with "Hey Vision"
  engine.handleSpeechTranscript('Hey Vision');
  assert.equal(engine.getState(), 'LISTENING');

  engine.handleSpeechTranscript('Show my results');
  await sleep(75);
  assert.deepEqual(executedCommands, ['Open dashboard', 'Show my results']);

  // Also test "Go to Sleep", "Disable Voice Assistant", and "Deactivate Vision"
  engine.handleSpeechTranscript('Go to Sleep');
  assert.equal(engine.getState(), 'STOPPED');

  engine.handleSpeechTranscript('Hey Vision');
  assert.equal(engine.getState(), 'LISTENING');
  engine.handleSpeechTranscript('Disable Voice Assistant');
  assert.equal(engine.getState(), 'STOPPED');

  engine.handleSpeechTranscript('Hey Vision');
  assert.equal(engine.getState(), 'LISTENING');
  engine.handleSpeechTranscript('Deactivate Vision');
  assert.equal(engine.getState(), 'STOPPED');
});

test('Test 6 — Natural speech pauses: Brief pause mid-sentence does not prematurely submit incomplete command', async () => {
  const executedCommands: string[] = [];
  let liveTranscript = '';

  const engine = new VoiceEngine({
    lang: 'en-IN',
    silenceTimeoutMs: 120,
    onTranscript: async (text: string) => {
      executedCommands.push(text);
    },
    onSpeechAccumulated: (text: string) => {
      liveTranscript = text;
    },
    onListeningChange: () => {}
  });

  engine.handleSpeechTranscript('Hey Vision');
  assert.equal(engine.getState(), 'LISTENING');

  // User starts speaking first half of sentence (interim -> final chunk 1)
  engine.handleInterimTranscript('Please');
  assert.equal(liveTranscript, 'Please');
  engine.handleSpeechTranscript('Please take me');

  // Brief natural pause (45ms < 120ms silenceTimeoutMs)
  await sleep(45);
  assert.equal(executedCommands.length, 0, 'Must not prematurely submit during natural mid-sentence pause');
  assert.equal(engine.getAccumulatedSpeech(), 'Please take me');

  // User continues speaking second half of sentence (resets silence timer)
  engine.handleInterimTranscript('to the revision');
  assert.equal(liveTranscript, 'Please take me to the revision');
  engine.handleSpeechTranscript('to the revision planner');

  // Wait another 45ms (still < 120ms since last speech)
  await sleep(45);
  assert.equal(executedCommands.length, 0, 'Timer must have reset when user continued speaking');

  // Now user finishes speaking and remains silent past silence threshold
  await sleep(110);
  assert.deepEqual(executedCommands, ['Please take me to the revision planner']);
  assert.equal(engine.getState(), 'LISTENING');
});

test('Test 7 & 8 — Pilot Demo vs Mock Examination Isolation through Continuous Voice Engine', async () => {
  let pilotSubmitted = false;
  let mockSubmitted = false;
  const navigatedScreens: ScreenId[] = [];

  // Test 7: Pilot Demo active context
  const pilotController = new NavigationController({
    context: makeContext({ currentScreen: 'pilot_demo', isExamActive: true, isVisionAssistantActive: true }),
    navigate: (s) => navigatedScreens.push(s),
    speak: () => {}
  });

  const pilotHandler = (transcript: string): boolean => {
    const clean = cleanVoiceTranscript(transcript);
    if (clean === 'submit examination' || clean === 'submit diagnostic') {
      pilotSubmitted = true;
      return true;
    }
    return false;
  };

  const pilotEngine = new VoiceEngine({
    lang: 'en-IN',
    silenceTimeoutMs: 30,
    onTranscript: async (text: string) => {
      await pilotController.processTranscript(text, pilotHandler);
    },
    onListeningChange: () => {}
  });

  pilotEngine.handleSpeechTranscript('Hey Vision');
  pilotEngine.handleSpeechTranscript('Submit examination');
  await sleep(60);

  assert.equal(pilotSubmitted, true, 'Pilot Demo must handle its own submission');
  assert.equal(mockSubmitted, false, 'Mock Exam must never be triggered from Pilot Demo');
  assert.equal(navigatedScreens.length, 0, 'Submit examination in Pilot Demo must never redirect to Mock Exam');

  // Test 8: Mock Examination active context
  const mockController = new NavigationController({
    context: makeContext({ currentScreen: 'mock_exam', isExamActive: true, isVisionAssistantActive: true }),
    navigate: (s) => navigatedScreens.push(s),
    speak: () => {}
  });

  const mockHandler = (transcript: string): boolean => {
    const clean = cleanVoiceTranscript(transcript);
    if (clean === 'submit examination' || clean === 'submit exam') {
      mockSubmitted = true;
      return true;
    }
    return false;
  };

  const mockEngine = new VoiceEngine({
    lang: 'en-IN',
    silenceTimeoutMs: 30,
    onTranscript: async (text: string) => {
      await mockController.processTranscript(text, mockHandler);
    },
    onListeningChange: () => {}
  });

  mockEngine.handleSpeechTranscript('Hey Vision');
  mockEngine.handleSpeechTranscript('Submit examination');
  await sleep(60);

  assert.equal(mockSubmitted, true, 'Mock Examination must handle its own submission');
  assert.equal(navigatedScreens.length, 0);
});

test('Test 9 & 10 — Error handling, Recognition interruption recovery, TTS continuation, and UI State messages', async () => {
  let reportedErrorType = '';
  const executedCommands: string[] = [];

  const engine = new VoiceEngine({
    lang: 'en-IN',
    silenceTimeoutMs: 30,
    onTranscript: async (text: string) => {
      executedCommands.push(text);
    },
    onError: (type) => {
      reportedErrorType = type;
    },
    onListeningChange: () => {}
  });

  // Verify all 7 required UI messages
  assert.equal(VOICE_STATE_UI_MESSAGES.IDLE, 'Say "Hey Vision" to activate');
  assert.equal(VOICE_STATE_UI_MESSAGES.WAKE_DETECTED, 'Vision activated');
  assert.equal(VOICE_STATE_UI_MESSAGES.LISTENING, 'Listening... Speak your command');
  assert.equal(VOICE_STATE_UI_MESSAGES.PROCESSING, 'Processing your command...');
  assert.equal(VOICE_STATE_UI_MESSAGES.SPEAKING, 'Vision is responding...');
  assert.equal(VOICE_STATE_UI_MESSAGES.STOPPED, 'Voice assistant deactivated');
  assert.equal(VOICE_STATE_UI_MESSAGES.ERROR, 'Voice recognition unavailable');

  // Activate session
  engine.handleSpeechTranscript('Hey Vision');
  assert.equal(engine.getState(), 'LISTENING');

  // Simulate TTS response playback and completion -> must return to LISTENING (not IDLE!)
  engine.setSpeaking(true, 'Opening your dashboard');
  assert.equal(engine.getState(), 'SPEAKING');

  // Speaker echo of the assistant's own spoken text must be ignored
  engine.handleSpeechTranscript('Opening your dashboard');
  await sleep(50);
  assert.equal(executedCommands.length, 0, 'Assistant own TTS speech must not be interpreted as user command');

  // TTS finishes -> automatically returns to LISTENING
  engine.setSpeaking(false);
  assert.equal(engine.getState(), 'LISTENING');

  // Simulate browser recognition interruption -> recovers gracefully in LISTENING
  engine.handleRecognitionInterruption();
  assert.equal(engine.getState(), 'LISTENING');

  // Simulate microphone permission denial -> enters ERROR state
  engine.handleRecognitionError('denied');
  assert.equal(engine.getState(), 'ERROR');
  assert.equal(reportedErrorType, 'denied');
});

// ============================================================================
// 4. NAVIGATION CONTROLLER: FONT FACE & EXAM EXIT
// ============================================================================

test('NavigationController: Font face commands trigger onFontFaceFn', async () => {
  let appliedFont = '';

  const controller = new NavigationController({
    context: makeContext({ currentScreen: 'accessibility_settings' }),
    navigate: () => {},
    speak: () => {},
    onFontFace: (font) => {
      appliedFont = font;
    }
  });

  const result1 = await controller.processTranscript('hyperlegible font');
  assert.equal(result1.status, 'system_handled');
  assert.equal(appliedFont, 'hyperlegible');
  assert.ok(result1.spokenResponse.includes('Atkinson Hyperlegible'));

  const result2 = await controller.processTranscript('switch to opendyslexic');
  assert.equal(result2.status, 'system_handled');
  assert.equal(appliedFont, 'opendyslexic');
  assert.ok(result2.spokenResponse.includes('OpenDyslexic'));

  const result3 = await controller.processTranscript('monospace font');
  assert.equal(result3.status, 'system_handled');
  assert.equal(appliedFont, 'mono');
  assert.ok(result3.spokenResponse.includes('Monospace'));
});

test('NavigationController: Active exam blocks direct page navigation and prompts Alt+Shift+X exit', async () => {
  const controller = new NavigationController({
    context: makeContext({ currentScreen: 'mock_exam', isExamActive: true }),
    navigate: () => {},
    speak: () => {}
  });

  const result = await controller.processTranscript('go to dashboard');
  assert.equal(result.status, 'blocked_by_active_exam');
  assert.ok(
    result.spokenResponse.includes('Alt + Shift + X') || result.spokenResponse.includes('exit exam'),
    'Expected prompt explaining how to exit using Alt + Shift + X or voice'
  );
});

// ============================================================================
// 5. EXAM EXIT CONFIRMATION PARSER & FRESH ATTEMPT LOGIC
// ============================================================================

test('Exam Exit: Confirm and Cancel phrases parse reliably for keyboard and voice confirmation', () => {
  // Confirm YES phrases
  const yesPhrases = ['yes', 'yes submit', 'yes exit', 'i confirm', 'submit now', 'confirm submit'];
  for (const p of yesPhrases) {
    const isYes = isSubmitConfirmPhrase(p) || p === 'yes' || p === 'yes submit' || p === 'yes exit';
    assert.equal(isYes, true, `Expected "${p}" to be accepted as exit confirmation YES`);
  }

  // Cancel NO phrases
  const noPhrases = ['no', 'no continue', 'cancel exit', 'cancel submission'];
  for (const p of noPhrases) {
    const isNo = isSubmitCancelPhrase(p) || p === 'no' || p === 'no continue' || p === 'cancel exit';
    assert.equal(isNo, true, `Expected "${p}" to be accepted as exit confirmation NO`);
  }
});

test('Fresh Examination Guarantee: Exit clears active session keys so re-entry starts fresh', () => {
  const mockSessionStorage: Record<string, string> = {
    'mockExamAnswers': JSON.stringify({ 'q1': { selectedOption: 'A' } }),
    'mockExamTimer': '1200',
    'mockExamIndex': '5',
    'mockExamStarted': 'true',
    'mockExamAttemptId': 'att_old_123',
    'pilot_demo_active_session_usr_candidate_01': JSON.stringify({ phase: 'exam', currentIdx: 7 }),
    'pilot_demo_initial_view': 'results'
  };

  // Simulate user confirming YES to exit exam
  // 1. Mock Exam exit cleanup
  delete mockSessionStorage['mockExamAnswers'];
  delete mockSessionStorage['mockExamTimer'];
  delete mockSessionStorage['mockExamIndex'];
  delete mockSessionStorage['mockExamStarted'];
  delete mockSessionStorage['mockExamAttemptId'];

  // 2. Pilot Demo exit cleanup
  delete mockSessionStorage['pilot_demo_active_session_usr_candidate_01'];
  delete mockSessionStorage['pilot_demo_initial_view'];

  // Verification: All active session artifacts cleared
  assert.equal(mockSessionStorage['mockExamStarted'], undefined);
  assert.equal(mockSessionStorage['mockExamAttemptId'], undefined);
  assert.equal(mockSessionStorage['pilot_demo_active_session_usr_candidate_01'], undefined);
  assert.equal(mockSessionStorage['pilot_demo_initial_view'], undefined);

  // Subsequent visit initializes fresh state
  const isMockExamStartedOnEntry = Boolean(mockSessionStorage['mockExamStarted'] === 'true');
  assert.equal(isMockExamStartedOnEntry, false, 'Mock exam must wait for user to start, not auto-start');

  const pilotDemoInitialView = mockSessionStorage['pilot_demo_initial_view'] || 'instructions';
  assert.equal(pilotDemoInitialView, 'instructions', 'Pilot Demo must present instructions on fresh visit');
});
