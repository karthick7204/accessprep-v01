/**
 * ACCESSPREP-X — User Requirements Verification Test Suite
 * Validates:
 * 1. "start exam" -> voice_practice vs "mock exam" -> mock_exam routing
 * 2. "Hey Vision" time-of-day greeting, personalization, and voice navigation hints
 * 3. Strict numeric CAPTCHA verification (rejects wrong digits & random speech, accepts valid digits)
 * 4. Stop command parsing and priority handling
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { matchScreenNavigation, parseSystemControl, parseVisionWakeWord } from '../voice/commandParser.ts';
import {
  generateHumanVerificationChallenge,
  verifyChallengeResponse,
  calculateSimilarity,
  extractDigits
} from '../utils/humanVerification.ts';
import { NavigationController } from '../voice/NavigationController.ts';
import type { NavigationContext } from '../voice/commandTypes.ts';

test('User Requirement 1: "start exam" routes to voice practice', () => {
  const result = matchScreenNavigation('start exam');
  assert.ok(result, 'Expected match for "start exam"');
  assert.equal(result!.target.screenId, 'voice_practice', 'Should route to voice practice');

  const practice = matchScreenNavigation('start practice');
  assert.ok(practice, 'Expected match for "start practice"');
  assert.equal(practice!.target.screenId, 'voice_practice');
});

test('User Requirement 1B: "mock exam" routes to mock examination', () => {
  const result = matchScreenNavigation('mock exam');
  assert.ok(result, 'Expected match for "mock exam"');
  assert.equal(result!.target.screenId, 'mock_exam', 'Should route to mock_exam');

  const fullMock = matchScreenNavigation('start mock test');
  assert.ok(fullMock);
  assert.equal(fullMock!.target.screenId, 'mock_exam');
});

test('User Requirement 2: Strict Numeric CAPTCHA rejects incorrect digits or random speech', () => {
  const target = '4 2 9 1';

  // 1. Correct exact digits (words or numbers)
  assert.equal(calculateSimilarity('4 2 9 1', target), 1.0);
  assert.equal(calculateSimilarity('four two nine one', target), 1.0);
  assert.equal(calculateSimilarity('4291', target), 1.0);

  // 2. Incorrect digits MUST return 0.0 (must NOT authenticate)
  assert.equal(calculateSimilarity('4 2 9 8', target), 0.0, 'Wrong last digit must fail');
  assert.equal(calculateSimilarity('1 2 3 4', target), 0.0, 'Completely wrong digits must fail');
  assert.equal(calculateSimilarity('4 2 9', target), 0.0, 'Missing digit must fail');

  // 3. Random words without numbers must return 0.0
  assert.equal(calculateSimilarity('hello world authenticate me', target), 0.0, 'Random speech must fail');
  assert.equal(calculateSimilarity('i am ready to log in', target), 0.0, 'General speech must fail');

  // 4. verifyChallengeResponse fails with incorrect candidate input
  const challenge = generateHumanVerificationChallenge('test_ip');
  const failRes = verifyChallengeResponse(challenge.challengeId, '9 9 9 9');
  assert.equal(failRes.success, false, 'Must reject incorrect digits');
  assert.equal(failRes.verificationToken, undefined);
});

test('User Requirement 3: "stop" command is detected across variations', () => {
  assert.equal(parseSystemControl('stop'), 'stop_speaking');
  assert.equal(parseSystemControl('stop speaking'), 'stop_speaking');
  assert.equal(parseSystemControl('stop reading'), 'stop_speaking');
  assert.equal(parseSystemControl('hey vision stop'), 'stop_speaking');
  assert.equal(parseSystemControl('vision stop'), 'stop_speaking');
  assert.equal(parseSystemControl('silence'), 'stop_speaking');
  assert.equal(parseSystemControl('be quiet'), 'stop_speaking');
});

test('User Requirement 4: "Hey Vision" greets user and gives navigation guide', async () => {
  let spoken = '';
  let visionActive = false;
  let listeningStarted = false;

  const ctx: NavigationContext = {
    currentScreen: 'dashboard',
    user: {
      id: 'usr_01',
      rollNumber: 'SSC-01',
      name: 'Arnav Sharma',
      email: 'arnav@example.com',
      passwordHash: 'hash',
      role: 'candidate',
      pwdCategory: 'Visually Impaired',
      needScribe: true,
      examRegion: 'NR',
      examLanguage: 'English',
      createdAt: new Date().toISOString()
    },
    isExamActive: false,
    pendingExamExit: null,
    historyStack: [],
    lastSpokenText: '',
    isVisionAssistantActive: false
  };

  const controller = new NavigationController({
    context: ctx,
    navigate: () => {},
    speak: (text) => { spoken = text; },
    stopSpeak: () => {},
    logout: () => {},
    startListening: () => { listeningStarted = true; },
    onToggleVision: (active) => { visionActive = active; }
  });

  const res = await controller.processTranscript('Hey Vision');
  assert.equal(res.status, 'system_handled');
  assert.equal(visionActive, true, 'Should activate vision assistant');
  assert.ok(res.spokenResponse.includes('Arnav'), 'Greeting should include user first name "Arnav"');
  assert.ok(res.spokenResponse.includes('welcome back'), 'Should say welcome back');
  assert.ok(res.spokenResponse.includes('Start practice') || res.spokenResponse.includes('Start exam'), 'Should explain start practice/exam');
  assert.ok(res.spokenResponse.includes('Mock exam'), 'Should explain mock exam');
});

test('User Requirement 5: "stop" interrupts audio and triggers listening in NavigationController', async () => {
  let stopCalled = false;
  let listeningCalled = false;

  const ctx: NavigationContext = {
    currentScreen: 'dashboard',
    user: null,
    isExamActive: false,
    pendingExamExit: null,
    historyStack: [],
    lastSpokenText: '',
    isVisionAssistantActive: true
  };

  const controller = new NavigationController({
    context: ctx,
    navigate: () => {},
    speak: () => {},
    stopSpeak: () => { stopCalled = true; },
    logout: () => {},
    startListening: () => { listeningCalled = true; }
  });

  const res = await controller.processTranscript('stop');
  assert.equal(res.status, 'system_handled');
  assert.equal(stopCalled, true, 'stopSpeakFn must be called');
  assert.equal(listeningCalled, true, 'startListening must be called');
});
