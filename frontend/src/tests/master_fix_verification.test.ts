import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseVisionWakeWord,
  parseSpeechSettingCommand,
  parseSubjectSelectionIntent,
  parseAssistanceIntent
} from '../voice/commandParser.ts';

import { NavigationController } from '../voice/NavigationController.ts';
import { NavigationContext } from '../voice/commandTypes.ts';
import { ScreenId, APPROVED_SCREENS } from '../types/screens.ts';
import { User } from '../db/database.ts';

function makeUser(): User {
  return {
    id: 'usr_test_01',
    name: 'Test Candidate',
    email: 'test@candidate.in',
    passwordHash: 'hash',
    role: 'candidate',
    rollNumber: 'SSC-2026-MTS-01',
    pwdCategory: 'Visually Impaired',
    needScribe: false,
    examRegion: 'Southern Region',
    examLanguage: 'English',
    createdAt: new Date().toISOString()
  };
}

function makeContext(overrides: Partial<NavigationContext> = {}): NavigationContext {
  return {
    currentScreen: 'dashboard',
    user: makeUser(),
    isExamActive: false,
    pendingExamExit: null,
    historyStack: ['dashboard'],
    lastSpokenText: '',
    isVisionAssistantActive: true,
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// 1. "Hey Vision" Wake-Word & Gating
// ---------------------------------------------------------------------------

test('Wake Word: "Hey Vision" triggers activation', () => {
  assert.equal(parseVisionWakeWord('hey vision'), 'activate_vision');
  assert.equal(parseVisionWakeWord('Hey Vision'), 'activate_vision');
  assert.equal(parseVisionWakeWord('hey vision open mock exam'), 'activate_vision');
  assert.equal(parseVisionWakeWord('vision'), 'activate_vision');
  assert.equal(parseVisionWakeWord('activate vision'), 'activate_vision');
});

test('Wake Word: Deactivation triggers properly', () => {
  assert.equal(parseVisionWakeWord('deactivate vision'), 'deactivate_vision');
  assert.equal(parseVisionWakeWord('stop vision'), 'deactivate_vision');
  assert.equal(parseVisionWakeWord('turn off vision'), 'deactivate_vision');
});

test('Silent Wake-Word Gating: When isVisionAssistantActive is false, non-wake speech is ignored silently', async () => {
  const navigated: ScreenId[] = [];
  const controller = new NavigationController({
    context: makeContext({ isVisionAssistantActive: false }),
    navigate: (s) => navigated.push(s),
    speak: () => {},
    stopSpeak: () => {},
    logout: () => {}
  });

  // Non-wake speech should be silently ignored (empty spokenResponse, no navigation)
  const res1 = await controller.processTranscript('open mock exam');
  assert.equal(res1.status, 'system_handled');
  assert.equal(res1.spokenResponse, '');
  assert.equal(navigated.length, 0);

  const res2 = await controller.processTranscript('go to dashboard');
  assert.equal(res2.status, 'system_handled');
  assert.equal(res2.spokenResponse, '');
  assert.equal(navigated.length, 0);
});

test('Wake Word Activation with Attached Command: Activates and immediately routes attached command', async () => {
  const navigated: ScreenId[] = [];
  let visionToggled: boolean | null = null;

  const controller = new NavigationController({
    context: makeContext({ isVisionAssistantActive: false }),
    navigate: (s) => navigated.push(s),
    speak: () => {},
    stopSpeak: () => {},
    logout: () => {},
    onToggleVision: (active) => { visionToggled = active; }
  });

  const res = await controller.processTranscript('hey vision open mock exam');
  assert.equal(visionToggled, true);
  assert.equal(res.status, 'success');
  assert.equal(res.destination, 'mock_exam');
  assert.deepEqual(navigated, ['mock_exam']);
});

// ---------------------------------------------------------------------------
// 2. Speech Rate & Pitch Spoken Adjustments
// ---------------------------------------------------------------------------

test('Speech Setting: Recognizes rate presets (0.5x, 1x, 1.5x, 2x, 2.5x, 3x)', () => {
  const cases: [string, number][] = [
    ['set speed to 0.5x', 0.5],
    ['set speech speed to 1x', 1.0],
    ['set speech rate to 1.5x', 1.5],
    ['set speed to 2x', 2.0],
    ['set speed to 2.5x', 2.5],
    ['set speech speed to 3x', 3.0],
    ['1.5x speed', 1.5],
    ['2.5x', 2.5]
  ];

  for (const [phrase, expected] of cases) {
    const res = parseSpeechSettingCommand(phrase);
    assert.ok(res, `Failed for phrase: "${phrase}"`);
    assert.equal(res!.type, 'rate');
    assert.equal(res!.value, expected);
  }
});

test('Speech Setting: Recognizes pitch commands', () => {
  const cases: [string, number][] = [
    ['set pitch to 1.0', 1.0],
    ['set speech pitch to 1.4', 1.4],
    ['set pitch to 0.8', 0.8]
  ];

  for (const [phrase, expected] of cases) {
    const res = parseSpeechSettingCommand(phrase);
    assert.ok(res, `Failed for phrase: "${phrase}"`);
    assert.equal(res!.type, 'pitch');
    assert.equal(res!.value, expected);
  }
});

// ---------------------------------------------------------------------------
// 3. Spoken Subject Selection & Recommendation Intents
// ---------------------------------------------------------------------------

test('Subject Selection: Parses subject names and aliases', () => {
  const math = parseSubjectSelectionIntent('numerical ability');
  assert.ok(math);
  assert.equal(math!.type, 'choose_subject');
  if (math!.type === 'choose_subject') {
    assert.equal(math!.subject, 'Numerical and Mathematical Ability');
  }

  const reasoning = parseSubjectSelectionIntent('practice reasoning');
  assert.ok(reasoning);
  assert.equal(reasoning!.type, 'choose_subject');
  if (reasoning!.type === 'choose_subject') {
    assert.equal(reasoning!.subject, 'Reasoning Ability and Problem Solving');
  }

  const ga = parseSubjectSelectionIntent('select general awareness');
  assert.ok(ga);
  assert.equal(ga!.type, 'choose_subject');
  if (ga!.type === 'choose_subject') {
    assert.equal(ga!.subject, 'General Awareness');
  }

  const en = parseSubjectSelectionIntent('choose english');
  assert.ok(en);
  assert.equal(en!.type, 'choose_subject');
  if (en!.type === 'choose_subject') {
    assert.equal(en!.subject, 'English Language and Comprehension');
  }
});

test('Subject Selection: Parses recommendation intents', () => {
  const rec1 = parseSubjectSelectionIntent('what should i revise');
  assert.ok(rec1);
  assert.equal(rec1!.type, 'recommend_subject');

  const rec2 = parseSubjectSelectionIntent('recommend a subject');
  assert.ok(rec2);
  assert.equal(rec2!.type, 'recommend_subject');

  const rec3 = parseSubjectSelectionIntent('recommend weak topics');
  assert.ok(rec3);
  assert.equal(rec3!.type, 'recommend_subject');
});

// ---------------------------------------------------------------------------
// 4. Page-Specific Voice Assistance Help
// ---------------------------------------------------------------------------

test('Page-Specific Assistance: Returns screen-specific contextual help', async () => {
  const screens: ScreenId[] = [
    'dashboard',
    'mock_exam',
    'voice_practice',
    'pilot_demo',
    'results',
    'revision_planner',
    'ai_tutor',
    'learning_history',
    'screen_reader_settings'
  ];

  for (const screen of screens) {
    const controller = new NavigationController({
      context: makeContext({ currentScreen: screen }),
      navigate: () => {},
      speak: () => {},
      stopSpeak: () => {},
      logout: () => {}
    });

    const res = await controller.processTranscript('what can i do here');
    assert.equal(res.status, 'assistance_provided');
    assert.ok(res.spokenResponse.length > 25, `Help response too short for screen: ${screen}`);
  }
});

// ---------------------------------------------------------------------------
// 5. Approved Screen Count Verification
// ---------------------------------------------------------------------------

test('Approved Screens: Exactly 18 registered screens verified', () => {
  assert.equal(APPROVED_SCREENS.length, 18, `Expected 18 approved screens, found ${APPROVED_SCREENS.length}`);
  assert.ok(APPROVED_SCREENS.includes('screen_reader_settings'));
  assert.ok(APPROVED_SCREENS.includes('pilot_demo'));
  assert.ok(APPROVED_SCREENS.includes('learning_history'));
  assert.ok(APPROVED_SCREENS.includes('revision_planner'));
});

// ---------------------------------------------------------------------------
// 6. Numeric Audio CAPTCHA Verification
// ---------------------------------------------------------------------------

test('Numeric Audio CAPTCHA: extractDigits converts spoken number words and raw digits', async () => {
  const { extractDigits, calculateSimilarity } = await import('../utils/humanVerification.ts');

  assert.equal(extractDigits('four eight two'), '482');
  assert.equal(extractDigits('seven four nine'), '749');
  assert.equal(extractDigits('3 8 2 5'), '3825');
  assert.equal(extractDigits('482'), '482');

  // Exact digit match
  assert.equal(calculateSimilarity('482', '4 8 2'), 1.0);
  assert.equal(calculateSimilarity('four eight two', '4 8 2'), 1.0);
  assert.equal(calculateSimilarity('seven four nine', '7 4 9'), 1.0);
  assert.equal(calculateSimilarity('3 8 2 5', '3 8 2 5'), 1.0);

  // Mismatched digits
  assert.ok(calculateSimilarity('123', '4 8 2') < 0.75);
});

test('Numeric Audio CAPTCHA: Challenge verification succeeds with digits or spoken words', async () => {
  const { generateHumanVerificationChallenge, verifyChallengeResponse, extractDigits } = await import('../utils/humanVerification.ts');

  const challenge = generateHumanVerificationChallenge('test_ip');
  assert.ok(challenge.phrase, 'Challenge must have phrase');
  const digits = extractDigits(challenge.phrase);
  assert.ok(digits.length >= 3 && digits.length <= 4, `Expected 3 or 4 digits, got ${digits.length}`);

  // Test verification using raw digits
  const res = verifyChallengeResponse(challenge.challengeId, digits);
  assert.equal(res.success, true);
  assert.ok(res.verificationToken);
});

// ---------------------------------------------------------------------------
// 7. Scroll Down and Scroll Up Voice Commands
// ---------------------------------------------------------------------------

test('Voice Controls: parseSystemControl recognizes scroll down and scroll up', async () => {
  const { parseSystemControl } = await import('../voice/commandParser.ts');

  assert.equal(parseSystemControl('scroll down'), 'scroll_down');
  assert.equal(parseSystemControl('scroll page down'), 'scroll_down');
  assert.equal(parseSystemControl('page down'), 'scroll_down');

  assert.equal(parseSystemControl('scroll up'), 'scroll_up');
  assert.equal(parseSystemControl('scroll page up'), 'scroll_up');
  assert.equal(parseSystemControl('page up'), 'scroll_up');
});


