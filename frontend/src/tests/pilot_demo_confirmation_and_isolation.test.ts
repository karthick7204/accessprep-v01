/**
 * ACCESSPREP-X — Pilot Demo Confirmation Flow & Mock Exam Voice Command Isolation Test Suite
 *
 * Verifies:
 *  1. Pilot Demo Start Confirmation State Machine (Step 1–4)
 *  2. Pilot Demo Submission Confirmation State Machine
 *  3. Cross-Module Examination Context Isolation (PILOT_DEMO vs MOCK_EXAM vs NONE)
 *  4. NavigationController + matchScreenNavigation isolation for "Submit examination."
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ExamConfirmationStateMachine,
  PILOT_DEMO_START_CONFIRM_PROMPT,
  PILOT_DEMO_STARTED_SPEECH,
  PILOT_DEMO_START_CANCELLED_SPEECH,
  PILOT_DEMO_START_UNCLEAR_PROMPT,
  PILOT_DEMO_SUBMIT_CONFIRM_PROMPT,
  PILOT_DEMO_SUBMITTED_SPEECH,
  PILOT_DEMO_SUBMIT_CANCELLED_SPEECH,
  PILOT_DEMO_ALREADY_COMPLETED_SPEECH,
  NO_ACTIVE_EXAM_SUBMIT_SPEECH,
  MOCK_EXAM_SUBMIT_CONFIRM_PROMPT
} from '../voice/examContextResolver.ts';
import { matchScreenNavigation } from '../voice/commandParser.ts';
import { NavigationController } from '../voice/NavigationController.ts';
import { parseSpokenAnswer } from '../utils/answerParser.ts';
import type { ScreenId } from '../types/screens.ts';

// ─────────────────────────────────────────────────────────────────────────────
// 1. PILOT DEMO START CONFIRMATION FLOW
// ─────────────────────────────────────────────────────────────────────────────

test('Pilot Demo Start: User requests start -> Confirmation is requested (never starts immediately)', () => {
  const startPhrases = [
    'Start examination.',
    'Begin test.',
    'Start pilot demo.',
    'Begin pilot examination.'
  ];

  for (const phrase of startPhrases) {
    const machine = new ExamConfirmationStateMachine('PILOT_DEMO', 'PILOT_INTRODUCTION');
    const res = machine.processVoiceCommand(phrase);

    assert.equal(res.handled, true, `Phrase "${phrase}" should be handled`);
    assert.equal(res.action, 'REQUEST_PILOT_START_CONFIRM');
    assert.equal(machine.interactionState, 'CONFIRMING_START');
    assert.equal(machine.examStartCount, 0, 'Must NOT start exam before explicit YES confirmation');
    assert.equal(res.spokenResponse, PILOT_DEMO_START_CONFIRM_PROMPT);
  }
});

test('Pilot Demo Start: User says YES / Confirm / Start now -> Pilot Demo starts', () => {
  const confirmPhrases = ['Yes.', 'Confirm.', 'Start now.'];

  for (const confirmPhrase of confirmPhrases) {
    const machine = new ExamConfirmationStateMachine('PILOT_DEMO', 'PILOT_INTRODUCTION');
    machine.processVoiceCommand('Start examination.');
    assert.equal(machine.interactionState, 'CONFIRMING_START');

    const res = machine.processVoiceCommand(confirmPhrase);
    assert.equal(res.handled, true);
    assert.equal(res.action, 'CONFIRM_PILOT_START');
    assert.equal(machine.interactionState, 'PILOT_RUNNING');
    assert.equal(machine.examStartCount, 1);
    assert.equal(res.spokenResponse, PILOT_DEMO_STARTED_SPEECH);
  }
});

test('Pilot Demo Start: User says NO / Cancel / Not now / Go back -> Pilot Demo does not start', () => {
  const cancelPhrases = ['No.', 'Cancel.', 'Not now.', 'Go back.'];

  for (const cancelPhrase of cancelPhrases) {
    const machine = new ExamConfirmationStateMachine('PILOT_DEMO', 'PILOT_INTRODUCTION');
    machine.processVoiceCommand('Start examination.');
    assert.equal(machine.interactionState, 'CONFIRMING_START');

    const res = machine.processVoiceCommand(cancelPhrase);
    assert.equal(res.handled, true);
    assert.equal(res.action, 'CANCEL_PILOT_START');
    assert.equal(machine.interactionState, 'PILOT_INTRODUCTION');
    assert.equal(machine.examStartCount, 0);
    assert.equal(res.spokenResponse, PILOT_DEMO_START_CANCELLED_SPEECH);
  }
});

test('Pilot Demo Start: Unrelated speech, repeated start request, and unclear response do not auto-start', () => {
  const machine = new ExamConfirmationStateMachine('PILOT_DEMO', 'PILOT_INTRODUCTION');

  // Unrelated speech in introduction does not start or enter confirmation
  const unrelatedIntro = machine.processVoiceCommand('What is the weather today');
  assert.equal(unrelatedIntro.handled, false);
  assert.equal(machine.interactionState, 'PILOT_INTRODUCTION');
  assert.equal(machine.examStartCount, 0);

  // Enter confirmation
  machine.processVoiceCommand('Start examination.');
  assert.equal(machine.interactionState, 'CONFIRMING_START');

  // Repeated start request does not create duplicate session and stays in CONFIRMING_START
  const repeatedStart = machine.processVoiceCommand('Start examination.');
  assert.equal(repeatedStart.action, 'RETRY_PILOT_START_CONFIRM');
  assert.equal(machine.interactionState, 'CONFIRMING_START');
  assert.equal(machine.examStartCount, 0);

  // Unclear response while confirming asks again and remains in CONFIRMING_START
  const unclear = machine.processVoiceCommand('Maybe later I am thinking');
  assert.equal(unclear.action, 'RETRY_PILOT_START_CONFIRM');
  assert.equal(machine.interactionState, 'CONFIRMING_START');
  assert.equal(machine.examStartCount, 0);
  assert.equal(unclear.spokenResponse, PILOT_DEMO_START_UNCLEAR_PROMPT);

  // Confirming YES afterwards starts exactly 1 session
  machine.processVoiceCommand('Yes');
  assert.equal(machine.interactionState, 'PILOT_RUNNING');
  assert.equal(machine.examStartCount, 1);

  // Repeating start command while already running does not start a second session
  const duplicateWhileRunning = machine.processVoiceCommand('Start examination');
  assert.equal(machine.examStartCount, 1);
  assert.equal(machine.interactionState, 'PILOT_RUNNING');
  assert.ok(duplicateWhileRunning.spokenResponse.includes('already in progress'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. PILOT DEMO SUBMISSION CONFIRMATION FLOW
// ─────────────────────────────────────────────────────────────────────────────

test('Pilot Demo Submission: User says "Submit examination." -> Pilot Demo confirmation appears', () => {
  const machine = new ExamConfirmationStateMachine('PILOT_DEMO', 'PILOT_RUNNING');
  const res = machine.processVoiceCommand('Submit examination.');

  assert.equal(res.handled, true);
  assert.equal(res.action, 'REQUEST_PILOT_SUBMIT_CONFIRM');
  assert.equal(machine.interactionState, 'CONFIRMING_SUBMISSION');
  assert.equal(machine.examSubmitCount, 0, 'Must wait for explicit YES before submitting');
  assert.equal(res.spokenResponse, PILOT_DEMO_SUBMIT_CONFIRM_PROMPT);
});

test('Pilot Demo Submission: User confirms YES -> Pilot Demo is submitted once', () => {
  const machine = new ExamConfirmationStateMachine('PILOT_DEMO', 'PILOT_RUNNING');
  machine.processVoiceCommand('Submit examination.');
  assert.equal(machine.interactionState, 'CONFIRMING_SUBMISSION');

  const res = machine.processVoiceCommand('Yes.');
  assert.equal(res.handled, true);
  assert.equal(res.action, 'CONFIRM_PILOT_SUBMIT');
  assert.equal(machine.interactionState, 'COMPLETED');
  assert.equal(machine.examSubmitCount, 1);
  assert.equal(res.spokenResponse, PILOT_DEMO_SUBMITTED_SPEECH);
});

test('Pilot Demo Submission: User confirms NO or says Cancel -> Pilot Demo continues', () => {
  for (const phrase of ['No.', 'Cancel.', 'Cancel submission.']) {
    const machine = new ExamConfirmationStateMachine('PILOT_DEMO', 'PILOT_RUNNING');
    machine.processVoiceCommand('Submit examination.');
    assert.equal(machine.interactionState, 'CONFIRMING_SUBMISSION');

    const res = machine.processVoiceCommand(phrase);
    assert.equal(res.handled, true);
    assert.equal(res.action, 'CANCEL_PILOT_SUBMIT');
    assert.equal(machine.interactionState, 'PILOT_RUNNING');
    assert.equal(machine.examSubmitCount, 0);
    assert.equal(res.spokenResponse, PILOT_DEMO_SUBMIT_CANCELLED_SPEECH);
  }
});

test('Pilot Demo Submission: Repeated submit command and post-completion submission are guarded', () => {
  const machine = new ExamConfirmationStateMachine('PILOT_DEMO', 'PILOT_RUNNING');
  machine.processVoiceCommand('Submit examination.');
  assert.equal(machine.interactionState, 'CONFIRMING_SUBMISSION');

  // Repeating "Submit examination." while confirming does not submit without YES
  const repeatSubmit = machine.processVoiceCommand('Submit examination.');
  assert.equal(repeatSubmit.action, 'RETRY_PILOT_SUBMIT_CONFIRM');
  assert.equal(machine.interactionState, 'CONFIRMING_SUBMISSION');
  assert.equal(machine.examSubmitCount, 0);

  // Confirm submission
  machine.processVoiceCommand('Confirm submission.');
  assert.equal(machine.interactionState, 'COMPLETED');
  assert.equal(machine.examSubmitCount, 1);

  // Once completed, further submission is blocked
  const afterComplete = machine.processVoiceCommand('Submit examination.');
  assert.equal(afterComplete.action, 'BLOCK_ALREADY_COMPLETED');
  assert.equal(machine.examSubmitCount, 1);
  assert.equal(afterComplete.spokenResponse, PILOT_DEMO_ALREADY_COMPLETED_SPEECH);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. CROSS-MODULE ISOLATION (PILOT_DEMO vs MOCK_EXAM vs NONE)
// ─────────────────────────────────────────────────────────────────────────────

test('Cross-Module Isolation: PILOT_DEMO vs MOCK_EXAM vs NONE voice command routing', () => {
  // Case 1: PILOT_DEMO + "Submit examination" -> Submits Pilot Demo
  const pilotMachine = new ExamConfirmationStateMachine('PILOT_DEMO', 'PILOT_RUNNING');
  const pilotSubmit = pilotMachine.processVoiceCommand('Submit examination');
  assert.equal(pilotSubmit.action, 'REQUEST_PILOT_SUBMIT_CONFIRM');
  assert.equal(pilotSubmit.spokenResponse, PILOT_DEMO_SUBMIT_CONFIRM_PROMPT);

  // Case 2: MOCK_EXAM + "Submit examination" -> Submits Mock Exam
  const mockMachine = new ExamConfirmationStateMachine('MOCK_EXAM', 'PILOT_RUNNING');
  const mockSubmit = mockMachine.processVoiceCommand('Submit examination');
  assert.equal(mockSubmit.action, 'REQUEST_MOCK_SUBMIT_CONFIRM');
  assert.equal(mockSubmit.spokenResponse, MOCK_EXAM_SUBMIT_CONFIRM_PROMPT);

  // Case 3: PILOT_DEMO + "Start mock examination" -> Blocked, must not silently switch modules
  const pilotBlockMock = pilotMachine.processVoiceCommand('Start mock examination');
  assert.equal(pilotBlockMock.action, 'BLOCK_CROSS_MODULE_SWITCH');
  assert.equal(pilotMachine.activeContext, 'PILOT_DEMO');

  // Case 4: MOCK_EXAM + Pilot Demo submission command -> Blocked, must not submit Pilot Demo or Mock Exam
  const mockFresh = new ExamConfirmationStateMachine('MOCK_EXAM', 'PILOT_RUNNING');
  const mockBlockPilot = mockFresh.processVoiceCommand('Submit pilot demo');
  assert.equal(mockBlockPilot.action, 'BLOCK_CROSS_MODULE_SWITCH');
  assert.equal(mockFresh.examSubmitCount, 0);

  // Case 5: NONE + "Submit examination" -> Announce no active examination
  const noneMachine = new ExamConfirmationStateMachine('NONE', 'IDLE');
  const noneSubmit = noneMachine.processVoiceCommand('Submit examination');
  assert.equal(noneSubmit.action, 'NO_ACTIVE_EXAM');
  assert.equal(noneSubmit.spokenResponse, NO_ACTIVE_EXAM_SUBMIT_SPEECH);

  // Case 6: PILOT_DEMO + "Confirm submission" -> Confirm only pending Pilot Demo submission
  const pilotConfirm = pilotMachine.processVoiceCommand('Confirm submission');
  assert.equal(pilotConfirm.action, 'CONFIRM_PILOT_SUBMIT');
  assert.equal(pilotMachine.examSubmitCount, 1);
  assert.equal(mockMachine.examSubmitCount, 0, 'Mock Exam submit count must remain 0');

  // Case 7: MOCK_EXAM + "Confirm submission" -> Confirm only pending Mock Exam submission
  const mockConfirm = mockMachine.processVoiceCommand('Confirm submission');
  assert.equal(mockConfirm.action, 'CONFIRM_MOCK_SUBMIT');
  assert.equal(mockMachine.examSubmitCount, 1);
});

test('NavigationController & Parser Isolation: "Submit examination." never matches Mock Examination navigation', async () => {
  // 1. matchScreenNavigation must return null for "Submit examination." across all screens
  assert.equal(matchScreenNavigation('Submit examination.', 'pilot_demo'), null);
  assert.equal(matchScreenNavigation('Submit examination', 'pilot_demo'), null);
  assert.equal(matchScreenNavigation('Submit examination.', 'mock_exam'), null);
  assert.equal(matchScreenNavigation('Submit examination.', 'dashboard'), null);
  assert.equal(matchScreenNavigation('Start examination.', 'pilot_demo'), null);
  assert.equal(matchScreenNavigation('Begin test.', 'pilot_demo'), null);

  // 2. parseSpokenAnswer recognizes "Submit examination." with trailing punctuation as 'submit' control
  const parsed = parseSpokenAnswer('Submit examination.');
  assert.deepEqual(parsed, { type: 'control', command: 'submit' });

  // 3. When no exam is active (e.g. on dashboard), NavigationController announces NO_ACTIVE_EXAM_SUBMIT_SPEECH
  const navigated: ScreenId[] = [];
  const controller = new NavigationController({
    context: {
      currentScreen: 'dashboard',
      user: {
        id: 'usr_1',
        rollNumber: 'R1',
        name: 'Student',
        email: 's@test.com',
        passwordHash: 'x',
        role: 'candidate',
        pwdCategory: 'None',
        needScribe: false,
        examRegion: 'NR',
        examLanguage: 'English',
        createdAt: new Date().toISOString()
      },
      isExamActive: false,
      pendingExamExit: null,
      historyStack: [],
      lastSpokenText: ''
    },
    navigate: (s) => navigated.push(s),
    speak: () => {}
  });

  const navRes = await controller.processTranscript('Submit examination.');
  assert.equal(navRes.status, 'system_handled');
  assert.equal(navRes.spokenResponse, NO_ACTIVE_EXAM_SUBMIT_SPEECH);
  assert.equal(navigated.length, 0, 'Must never navigate to mock_exam on "Submit examination."');
});
