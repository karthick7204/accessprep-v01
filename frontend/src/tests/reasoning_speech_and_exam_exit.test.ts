import test from 'node:test';
import assert from 'node:assert';
import {
  formatReasoningQuestionSpeech,
  formatReasoningOptionSpeech
} from '../utils/reasoningSpeechFormatter.ts';
import {
  speakableQuestionText,
  speakableOptionText,
  repeatQuestionTextOnly,
  repeatOptionsTextOnly,
  formatFullQuestionPrompt
} from '../utils/repeatQuestionHelper.ts';
import { MASTER_SHORTCUT_REGISTRY, getShortcutsForContext } from '../services/shortcutRegistry.ts';
import { getPageHelp } from '../data/pageHelpRegistry.ts';
import { Question } from '../db/database.ts';

test('PART 1 — Reasoning Speech: Quoted coding sequences are converted to character-by-character speech', () => {
  const input = "In a certain code language, if 'WATER' is written as 'YCVGT', how will 'DREAM' be written in that code?";
  const spoken = formatReasoningQuestionSpeech(input, 'Reasoning Ability and Problem Solving', 'Coding-Decoding');
  
  // 'WATER' -> W-A-T-E-R, 'YCVGT' -> Y-C-V-G-T, 'DREAM' -> D-R-E-A-M
  assert.strictEqual(
    spoken,
    'In a certain code language, if W-A-T-E-R is written as Y-C-V-G-T, how will D-R-E-A-M be written in that code?'
  );

  // Ordinary English words must remain untouched
  assert.ok(spoken.includes('In a certain code language'));
  assert.ok(spoken.includes('is written as'));
  assert.ok(spoken.includes('how will'));
  assert.ok(spoken.includes('be written in that code?'));
});

test('PART 1 — Reasoning Speech: Coding question options are read character by character', () => {
  const optA = formatReasoningOptionSpeech('FTHCO', 'Reasoning Ability and Problem Solving', 'Coding-Decoding');
  const optB = formatReasoningOptionSpeech('ETFCO', 'Reasoning Ability and Problem Solving', 'Coding-Decoding');
  const optC = formatReasoningOptionSpeech('FTGCO', 'Reasoning Ability and Problem Solving', 'Coding-Decoding');
  const optD = formatReasoningOptionSpeech('FSGCN', 'Reasoning Ability and Problem Solving', 'Coding-Decoding');

  assert.strictEqual(optA, 'F-T-H-C-O');
  assert.strictEqual(optB, 'E-T-F-C-O');
  assert.strictEqual(optC, 'F-T-G-C-O');
  assert.strictEqual(optD, 'F-S-G-C-N');
});

test('PART 1 — Reasoning Speech: Unquoted letter cluster analogies are spelled out character by character', () => {
  const input = 'Select the related letter cluster: BCD : GHI :: JKL : ?';
  const spoken = formatReasoningQuestionSpeech(input, 'Reasoning Ability and Problem Solving', 'Analogies');

  assert.ok(spoken.includes('B-C-D'));
  assert.ok(spoken.includes('G-H-I'));
  assert.ok(spoken.includes('J-K-L'));
  assert.ok(spoken.includes('Select the related letter cluster'));

  const optA = formatReasoningOptionSpeech('OPQ', 'Reasoning Ability and Problem Solving', 'Analogies');
  assert.strictEqual(optA, 'O-P-Q');
});

test('PART 1 — Reasoning Speech: Ordinary non-reasoning questions and options are NOT spelled out', () => {
  const questionText = 'Which of the following is the capital of India?';
  const spokenQ = speakableQuestionText(questionText, 'General Awareness', 'Indian Geography');
  assert.strictEqual(spokenQ, 'Which of the following is the capital of India?');

  const optA = speakableOptionText('Mumbai', 'General Awareness', 'Indian Geography');
  const optB = speakableOptionText('New Delhi', 'General Awareness', 'Indian Geography');
  assert.strictEqual(optA, 'Mumbai');
  assert.strictEqual(optB, 'New Delhi');
});

test('PART 1 — Reasoning Speech: Numerical options are read as numbers, not spelled', () => {
  const optA = formatReasoningOptionSpeech('82', 'Reasoning Ability and Problem Solving', 'Coding-Decoding');
  const optB = formatReasoningOptionSpeech('84', 'Reasoning Ability and Problem Solving', 'Coding-Decoding');
  assert.strictEqual(optA, '82');
  assert.strictEqual(optB, '84');
});

test('PART 1 — Reasoning Speech: Stop words in coding questions are never spelled out', () => {
  const input = 'In a code language, if CODE is CODED then FIND the WORD.';
  const spoken = formatReasoningQuestionSpeech(input, 'Reasoning Ability and Problem Solving', 'Coding-Decoding');
  // 'In', 'a', 'code', 'language', 'if', 'CODE', 'CODED', 'then', 'FIND', 'the', 'WORD'
  // Common reasoning/English words should remain natural words
  assert.ok(spoken.includes('code language'));
});

test('PART 1 — repeatQuestionTextOnly & repeatOptionsTextOnly with reasoning formatter', () => {
  const sampleQ: Question = {
    question_id: 'SSC-MTS-REA-011',
    subject: 'Reasoning Ability and Problem Solving',
    topic: 'Coding-Decoding',
    subtopic: 'Letter and Number Coding',
    question_text: "In a certain code language, if 'WATER' is written as 'YCVGT', how will 'DREAM' be written in that code?",
    question_type: 'multiple_choice',
    option_a: 'FTHCO',
    option_b: 'ETFCO',
    option_c: 'FTGCO',
    option_d: 'FSGCN',
    correct_answer: 'C',
    explanation: 'Each letter is shifted forward by 2.',
    difficulty_label: 'Easy',
    source_name: 'SSC Official',
    source_reference: 'SSC MTS 2023',
    source_type: 'Official Exam Paper',
    verification_status: 'Verified',
    language: 'English',
    created_at: '2026-03-15T09:00:00Z',
    updated_at: '2026-03-15T09:00:00Z',
    dataset_version: 'v1.0'
  };

  const questionSpeech = repeatQuestionTextOnly(sampleQ);
  assert.strictEqual(
    questionSpeech,
    'In a certain code language, if W-A-T-E-R is written as Y-C-V-G-T, how will D-R-E-A-M be written in that code?'
  );

  const optionsSpeech = repeatOptionsTextOnly(sampleQ);
  assert.strictEqual(
    optionsSpeech,
    'A: F-T-H-C-O. B: E-T-F-C-O. C: F-T-G-C-O. D: F-S-G-C-N.'
  );

  const fullPrompt = formatFullQuestionPrompt(sampleQ, 0, 90);
  assert.ok(fullPrompt.includes('W-A-T-E-R is written as Y-C-V-G-T'));
  assert.ok(fullPrompt.includes('Option A: F-T-H-C-O'));
  assert.ok(fullPrompt.includes('Option B: E-T-F-C-O'));
  assert.ok(fullPrompt.includes('Option C: F-T-G-C-O'));
  assert.ok(fullPrompt.includes('Option D: F-S-G-C-N'));
});

test('PARTS 2 & 3 — Exam Exit Shortcut: Alt+Shift+X registered in MASTER_SHORTCUT_REGISTRY', () => {
  const exitShortcut = MASTER_SHORTCUT_REGISTRY.find((s) => s.id === 'exam-request-exit');
  assert.ok(exitShortcut, 'exam-request-exit shortcut must be defined in MASTER_SHORTCUT_REGISTRY');
  assert.strictEqual(exitShortcut.keyLabel, 'Alt + Shift + X');
  assert.strictEqual(exitShortcut.key, 'x');
  assert.strictEqual(exitShortcut.altKey, true);
  assert.strictEqual(exitShortcut.shiftKey, true);
  assert.strictEqual(exitShortcut.category, 'practice_exam');
});

test('PARTS 2 & 3 — Exam Exit Shortcut: Included in context shortcuts for mock_exam and pilot_demo', () => {
  const mockContext = getShortcutsForContext('mock_exam', true);
  const hasInMock = mockContext.screenSpecificShortcuts.some((s) => s.id === 'exam-request-exit');
  assert.ok(hasInMock, 'exam-request-exit should be available in mock_exam context');

  const pilotContext = getShortcutsForContext('pilot_demo', true);
  const hasInPilot = pilotContext.screenSpecificShortcuts.some((s) => s.id === 'exam-request-exit');
  assert.ok(hasInPilot, 'exam-request-exit should be available in pilot_demo context');
});

test('PARTS 6 & 7 — Page Help Registry documents Alt+Shift+X for mock_exam and pilot_demo', () => {
  const mockHelp = getPageHelp('mock_exam');
  assert.ok(mockHelp, 'mock_exam help must exist');
  const mockExitHelp = mockHelp.keyboardShortcuts.find((k) => k.key.includes('Alt + Shift + X'));
  assert.ok(mockExitHelp, 'mock_exam page help must document Alt + Shift + X');

  const pilotHelp = getPageHelp('pilot_demo');
  assert.ok(pilotHelp, 'pilot_demo help must exist');
  const pilotExitHelp = pilotHelp.keyboardShortcuts.find((k) => k.key.includes('Alt + Shift + X'));
  assert.ok(pilotExitHelp, 'pilot_demo page help must document Alt + Shift + X');
});
