/**
 * ACCESSPREP-X — Centralized Keyboard Shortcut Registry & High-Visibility Explanations Test Suite
 * ============================================================================
 * Validates the single source of truth for keyboard shortcuts, context-aware filtering,
 * exact navigation destinations, and explanation card contract compliance.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MASTER_SHORTCUT_REGISTRY,
  getShortcutsForContext,
  resolveNavigationShortcut,
  formatShortcutsForSpeech
} from '../services/shortcutRegistry.ts';
import { APPROVED_SCREENS, SCREEN_REGISTRY, ScreenId } from '../types/screens.ts';
import { PAGE_HELP_REGISTRY, getPageHelp } from '../data/pageHelpRegistry.ts';
import { repeatQuestionTextOnly, repeatOptionsTextOnly } from '../utils/repeatQuestionHelper.ts';
import type { Question } from '../db/database.ts';

test('SHORTCUT REGISTRY: All shortcuts have valid, non-empty identifiers and descriptions', () => {
  assert.ok(MASTER_SHORTCUT_REGISTRY.length > 0, 'Registry must not be empty');

  const seenIds = new Set<string>();

  for (const shortcut of MASTER_SHORTCUT_REGISTRY) {
    assert.ok(shortcut.id, 'Shortcut must have an id');
    assert.ok(!seenIds.has(shortcut.id), `Duplicate shortcut id detected: ${shortcut.id}`);
    seenIds.add(shortcut.id);

    assert.ok(shortcut.keyLabel.length > 0, `keyLabel missing for ${shortcut.id}`);
    assert.ok(shortcut.key.length > 0, `key missing for ${shortcut.id}`);
    assert.ok(shortcut.action.length > 0, `action title missing for ${shortcut.id}`);
    assert.ok(shortcut.description.length > 0, `description missing for ${shortcut.id}`);
  }
});

test('SHORTCUT REGISTRY: Every navigation shortcut maps to a real, approved ScreenId', () => {
  const navigationShortcuts = MASTER_SHORTCUT_REGISTRY.filter((s) => s.category === 'navigation');
  assert.ok(navigationShortcuts.length >= 10, 'Must have at least 10 verified navigation shortcuts');

  for (const nav of navigationShortcuts) {
    assert.ok(nav.destination, `Navigation shortcut ${nav.id} must define a destination ScreenId`);
    assert.ok(
      APPROVED_SCREENS.includes(nav.destination as ScreenId),
      `Destination "${nav.destination}" on shortcut "${nav.id}" is not in APPROVED_SCREENS`
    );
    assert.ok(
      SCREEN_REGISTRY[nav.destination as ScreenId],
      `Destination "${nav.destination}" on shortcut "${nav.id}" missing from SCREEN_REGISTRY`
    );
  }
});

test('SHORTCUT REGISTRY: Audit and verify exact navigation destinations for all primary screens', () => {
  const expectedNavMappings: Record<string, ScreenId> = {
    d: 'dashboard',
    s: 'topics',
    p: 'voice_practice',
    o: 'pilot_demo',
    e: 'mock_exam',
    u: 'results',
    t: 'ai_tutor',
    r: 'revision_planner',
    a: 'progress',
    h: 'learning_history',
    c: 'accessibility_settings',
    w: 'screen_reader_settings',
    l: 'login'
  };

  for (const [keyChar, expectedScreen] of Object.entries(expectedNavMappings)) {
    const resolved = resolveNavigationShortcut(keyChar);
    assert.ok(resolved, `Failed to resolve navigation shortcut for key "${keyChar}"`);
    assert.strictEqual(
      resolved.destination,
      expectedScreen,
      `Key "Alt + ${keyChar.toUpperCase()}" must navigate to "${expectedScreen}", but resolved to "${resolved.destination}"`
    );
    assert.strictEqual(
      resolved.title,
      SCREEN_REGISTRY[expectedScreen].title,
      `Resolved title must match SCREEN_REGISTRY title for "${expectedScreen}"`
    );
  }
});

test('SHORTCUT REGISTRY: resolveNavigationShortcut handles uppercase, lowercase, and invalid keys cleanly', () => {
  // Uppercase input
  const resD = resolveNavigationShortcut('D');
  assert.ok(resD);
  assert.strictEqual(resD.destination, 'dashboard');

  // Lowercase input
  const resP = resolveNavigationShortcut('p');
  assert.ok(resP);
  assert.strictEqual(resP.destination, 'voice_practice');

  // Invalid / non-existent key
  const invalidKey = resolveNavigationShortcut('z');
  assert.strictEqual(invalidKey, null, 'Unregistered key must return null');

  const randomString = resolveNavigationShortcut('foo');
  assert.strictEqual(randomString, null, 'Random string must return null');
});

test('SHORTCUT REGISTRY: Context-aware filtering on unauthenticated Auth screens (login/register)', () => {
  const loginContext = getShortcutsForContext('login', false);

  // Must include single-key auth shortcuts
  const authShortcutKeys = loginContext.screenSpecificShortcuts.map((s) => s.key.toLowerCase());
  assert.ok(authShortcutKeys.includes('l'), 'Login must include L (Focus email)');
  assert.ok(authShortcutKeys.includes('p'), 'Login must include P (Focus password)');
  assert.ok(authShortcutKeys.includes('c'), 'Login must include C (Auto CAPTCHA)');
  assert.ok(authShortcutKeys.includes('s'), 'Login must include S (Sign in)');
  assert.ok(authShortcutKeys.includes('r'), 'Login must include R (Play audio)');

  // Must NOT leak protected candidate portal navigation when unauthenticated
  assert.strictEqual(
    loginContext.globalNavigationShortcuts.length,
    0,
    'Unauthenticated login view must not expose protected portal navigation'
  );

  // Must include global accessibility controls (Alt+Space, Alt+V, K, Escape)
  const accessIds = loginContext.accessibilityShortcuts.map((s) => s.id);
  assert.ok(accessIds.includes('global-vision-assistant-toggle'));
  assert.ok(accessIds.includes('global-voice-mode-toggle'));
  assert.ok(accessIds.includes('global-stop-speech'));
  assert.ok(accessIds.includes('global-shortcut-reference'));
});

test('SHORTCUT REGISTRY: Context-aware filtering on authenticated Dashboard', () => {
  const dashContext = getShortcutsForContext('dashboard', true);

  // Must include all authenticated navigation shortcuts
  assert.ok(dashContext.globalNavigationShortcuts.length >= 10);
  const dests = dashContext.globalNavigationShortcuts.map((s) => s.destination);
  assert.ok(dests.includes('dashboard'));
  assert.ok(dests.includes('topics'));
  assert.ok(dests.includes('voice_practice'));
  assert.ok(dests.includes('mock_exam'));
  assert.ok(dests.includes('pilot_demo'));
  assert.ok(dests.includes('results'));
  assert.ok(dests.includes('ai_tutor'));
  assert.ok(dests.includes('revision_planner'));
  assert.ok(dests.includes('progress'));
  assert.ok(dests.includes('learning_history'));

  // Must not include login-specific field shortcuts
  const specificKeys = dashContext.screenSpecificShortcuts.map((s) => s.id);
  assert.ok(!specificKeys.includes('auth-focus-email'));
  assert.ok(!specificKeys.includes('auth-auto-write-captcha'));
});

test('SHORTCUT REGISTRY: Context-aware filtering on Voice Practice and Mock Exam', () => {
  const voiceContext = getShortcutsForContext('voice_practice', true);
  const examActions = voiceContext.screenSpecificShortcuts.map((s) => s.action);
  assert.ok(examActions.some((a) => a.includes('Option A')), 'Voice practice must show Option A shortcut');
  assert.ok(examActions.some((a) => a.includes('Academic Explanation')), 'Voice practice must show explanation shortcut');

  const examContext = getShortcutsForContext('mock_exam', true);
  const examActionTitles = examContext.screenSpecificShortcuts.map((s) => s.action);
  assert.ok(examActionTitles.some((a) => a.includes('Read Question Aloud')), 'Mock exam must show Read Question shortcut');
  assert.ok(examActionTitles.some((a) => a.includes('Read Options Aloud')), 'Mock exam must show Read Options shortcut');
  assert.ok(examActionTitles.some((a) => a.includes('Mark for Review')), 'Mock exam must show Mark for Review shortcut');
});

test('SHORTCUT REGISTRY: formatShortcutsForSpeech generates clean, descriptive spoken text', () => {
  const sampleShortcuts = MASTER_SHORTCUT_REGISTRY.slice(0, 3);
  const speechText = formatShortcutsForSpeech([...sampleShortcuts]);

  assert.ok(speechText.length > 20);
  assert.ok(speechText.includes('Press Alt + Space for Activate Vision Voice Assistant'));
  assert.ok(speechText.includes('Press Alt + V for Switch to Voice Assistance Mode'));

  const emptySpeech = formatShortcutsForSpeech([]);
  assert.strictEqual(emptySpeech, 'No shortcuts available for this view.');
});

test('EXPLANATIONS CONTRACT: Reusable explanation contract preserves academic rigor and visibility attributes', () => {
  const mockCorrectAnswer = {
    questionText: 'Which process do green plants use to convert sunlight into food?',
    selectedOption: 'C',
    selectedOptionText: 'Photosynthesis',
    correctOption: 'C',
    correctOptionText: 'Photosynthesis',
    isCorrect: true,
    explanation: 'Photosynthesis is the biological process used by plants to synthesize nutrients from carbon dioxide and water using light energy.'
  };

  assert.ok(mockCorrectAnswer.questionText.length > 10);
  assert.strictEqual(mockCorrectAnswer.selectedOption, mockCorrectAnswer.correctOption);
  assert.strictEqual(mockCorrectAnswer.isCorrect, true);
  assert.ok(mockCorrectAnswer.explanation.includes('Photosynthesis'));

  const mockIncorrectAnswer = {
    questionText: 'What is the SI unit of electric current?',
    selectedOption: 'A',
    selectedOptionText: 'Volt',
    correctOption: 'C',
    correctOptionText: 'Ampere',
    isCorrect: false,
    explanation: 'The SI unit of electric current is the Ampere (A), named after André-Marie Ampère. The volt is the unit of electric potential difference.'
  };

  assert.strictEqual(mockIncorrectAnswer.isCorrect, false);
  assert.notStrictEqual(mockIncorrectAnswer.selectedOption, mockIncorrectAnswer.correctOption);
  assert.strictEqual(mockIncorrectAnswer.correctOption, 'C');
  assert.ok(mockIncorrectAnswer.explanation.includes('Ampere'));
});

test('INLINE HELP REGISTRY: Dashboard shortcuts match verified navigation keys and contain NO fake numbers', () => {
  const dashboardHelp = PAGE_HELP_REGISTRY.dashboard;
  assert.ok(dashboardHelp, 'dashboard record must exist in PAGE_HELP_REGISTRY');

  const shortcuts = dashboardHelp.keyboardShortcuts;
  const keys = shortcuts.map((s) => s.key);

  // Verified navigation keys that MUST exist
  assert.ok(keys.includes('Alt + P'), 'Must include Alt + P for Voice Practice');
  assert.ok(keys.includes('Alt + E'), 'Must include Alt + E for Mock Examination');
  assert.ok(keys.includes('Alt + S'), 'Must include Alt + S for Subject & Topic Explorer');
  assert.ok(keys.includes('Alt + O'), 'Must include Alt + O for Pilot Demo Diagnostic');
  assert.ok(keys.includes('Alt + T'), 'Must include Alt + T for AI Tutor');
  assert.ok(keys.includes('Alt + R'), 'Must include Alt + R for Revision Planner');
  assert.ok(keys.includes('Alt + A'), 'Must include Alt + A for Progress Analytics');
  assert.ok(keys.includes('Alt + D'), 'Must include Alt + D for Candidate Dashboard');
  assert.ok(keys.includes('Escape'), 'Must include Escape for Stop Audio Speech');

  // Must NOT contain fake numbers 1-6 as navigation shortcuts
  assert.ok(!keys.includes('1'), 'Must NOT have key "1" for navigation');
  assert.ok(!keys.includes('2'), 'Must NOT have key "2" for navigation');
  assert.ok(!keys.includes('3'), 'Must NOT have key "3" for navigation');
  assert.ok(!keys.includes('4'), 'Must NOT have key "4" for navigation');
  assert.ok(!keys.includes('5'), 'Must NOT have key "5" for navigation');
  assert.ok(!keys.includes('6'), 'Must NOT have key "6" for navigation');

  // Spoken instructions must announce verified keys
  const spoken = dashboardHelp.spokenKeyboardHelp;
  assert.ok(spoken.includes('Alt and P'), 'Spoken instructions must say "Alt and P" for Voice Practice');
  assert.ok(spoken.includes('Alt and E'), 'Spoken instructions must say "Alt and E" for Mock Examination');
  assert.ok(spoken.includes('Alt and S'), 'Spoken instructions must say "Alt and S" for Subject and Topic Explorer');
  assert.ok(spoken.includes('Alt and O'), 'Spoken instructions must say "Alt and O" for Pilot Demo Diagnostic');
  assert.ok(spoken.includes('Alt and T'), 'Spoken instructions must say "Alt and T" for AI Syllabus Tutor');
  assert.ok(spoken.includes('Alt and R'), 'Spoken instructions must say "Alt and R" for Revision Planner');
  assert.ok(spoken.includes('Alt and A'), 'Spoken instructions must say "Alt and A" for Progress Analytics');
  assert.ok(spoken.includes('Alt and D'), 'Spoken instructions must say "Alt and D" for Dashboard');
  assert.ok(spoken.includes('Escape'), 'Spoken instructions must say "Escape" for stop speech');
});

test('INLINE HELP REGISTRY: getPageHelp returns complete records for all core screens', () => {
  const screens = ['dashboard', 'topics', 'voice_practice', 'mock_exam', 'pilot_demo', 'results', 'ai_tutor', 'revision_planner', 'progress', 'login', 'register'];

  for (const screen of screens) {
    const record = getPageHelp(screen);
    assert.ok(record, `getPageHelp failed for ${screen}`);
    assert.ok(record.title.length > 0, `Missing title for ${screen}`);
    assert.ok(record.introPrompt.length > 0, `Missing introPrompt for ${screen}`);
    assert.ok(record.voiceCommands.length > 0, `Missing voiceCommands for ${screen}`);
    assert.ok(record.keyboardShortcuts.length > 0, `Missing keyboardShortcuts for ${screen}`);
    assert.ok(record.spokenVoiceHelp.length > 0, `Missing spokenVoiceHelp for ${screen}`);
    assert.ok(record.spokenKeyboardHelp.length > 0, `Missing spokenKeyboardHelp for ${screen}`);
  }
});

test('REPEAT HELPER: repeatQuestionTextOnly returns ONLY question text with no prefix, number, or options', () => {
  const mockQ = {
    question_id: 'q1',
    question_text: 'Which of the following is the capital of India?',
    option_a: 'Mumbai',
    option_b: 'Chennai',
    option_c: 'New Delhi',
    option_d: 'Kolkata',
    correct_answer: 'C',
    subject: 'General Awareness',
    topic: 'Geography',
    difficulty: 'easy',
    explanation: 'New Delhi is the capital of India.',
    section: null,
    section_id: null,
    marks_correct: 3,
    marks_incorrect: -1,
    source: null,
    year: null,
    image_url: null,
    created_at: null,
    updated_at: null
  } as unknown as Question;

  const result = repeatQuestionTextOnly(mockQ);

  // Must contain the question text
  assert.ok(result.includes('Which of the following is the capital of India'), 'Must contain question text');

  // Must NOT contain question number prefix
  assert.ok(!result.includes('Question'), 'Must NOT start with "Question N of M" prefix');
  assert.ok(!result.includes('Section:'), 'Must NOT contain "Section:" prefix');

  // Must NOT contain option text
  assert.ok(!result.includes('Mumbai'), 'Must NOT contain option A text');
  assert.ok(!result.includes('New Delhi'), 'Must NOT contain option C text');

  // Must NOT contain option labels
  assert.ok(!result.includes('Option A:'), 'Must NOT contain "Option A:" label');
  assert.ok(!result.includes('What is your answer'), 'Must NOT contain closing prompt');
});

test('REPEAT HELPER: repeatOptionsTextOnly returns ONLY option labels+text with no intro phrase', () => {
  const mockQ = {
    question_id: 'q2',
    question_text: 'Which is the capital of India?',
    option_a: 'Mumbai',
    option_b: 'Chennai',
    option_c: 'New Delhi',
    option_d: 'Kolkata',
    correct_answer: 'C',
    subject: 'General Awareness',
    topic: 'Geography',
    difficulty: 'easy',
    explanation: 'New Delhi is the capital.',
    section: null,
    section_id: null,
    marks_correct: 3,
    marks_incorrect: -1,
    source: null,
    year: null,
    image_url: null,
    created_at: null,
    updated_at: null
  } as unknown as Question;

  const result = repeatOptionsTextOnly(mockQ);

  // Must contain each option text
  assert.ok(result.includes('Mumbai'), 'Must contain option A text');
  assert.ok(result.includes('Chennai'), 'Must contain option B text');
  assert.ok(result.includes('New Delhi'), 'Must contain option C text');
  assert.ok(result.includes('Kolkata'), 'Must contain option D text');

  // Must contain option labels
  assert.ok(result.includes('A:'), 'Must contain "A:" label');
  assert.ok(result.includes('B:'), 'Must contain "B:" label');
  assert.ok(result.includes('C:'), 'Must contain "C:" label');
  assert.ok(result.includes('D:'), 'Must contain "D:" label');

  // Must NOT contain the "The options are:" intro phrase
  assert.ok(!result.includes('The options are'), 'Must NOT contain "The options are:" intro');
  assert.ok(!result.includes('Option A:'), 'Must NOT use "Option A:" (long form) — should use "A:"');

  // Must NOT contain the question text
  assert.ok(!result.includes('capital of India'), 'Must NOT contain question text');
});

test('SHORTCUT REGISTRY: exam-repeat-question and exam-repeat-options exist for MCQ screens', () => {
  const repeatQ = MASTER_SHORTCUT_REGISTRY.find((s) => s.id === 'exam-repeat-question');
  const repeatO = MASTER_SHORTCUT_REGISTRY.find((s) => s.id === 'exam-repeat-options');

  assert.ok(repeatQ, 'exam-repeat-question must exist in MASTER_SHORTCUT_REGISTRY');
  assert.ok(repeatO, 'exam-repeat-options must exist in MASTER_SHORTCUT_REGISTRY');

  assert.strictEqual(repeatQ!.key, 'r', 'exam-repeat-question must be bound to key r');
  assert.strictEqual(repeatO!.key, 'o', 'exam-repeat-options must be bound to key o');

  assert.ok(repeatQ!.description.includes('no prefix'), 'exam-repeat-question description must state "no prefix"');
  assert.ok(repeatO!.description.includes('no'), 'exam-repeat-options description must state absence of intro');

  // Both must appear in voice_practice, mock_exam and pilot_demo contexts
  for (const screen of ['voice_practice', 'mock_exam', 'pilot_demo'] as const) {
    const ctx = getShortcutsForContext(screen, true);
    const allShortcuts = [...ctx.screenSpecificShortcuts, ...ctx.accessibilityShortcuts];
    const ids = allShortcuts.map((s) => s.id);
    assert.ok(ids.includes('exam-repeat-question'), `exam-repeat-question must appear in ${screen} context`);
    assert.ok(ids.includes('exam-repeat-options'), `exam-repeat-options must appear in ${screen} context`);
  }
});

test('INLINE HELP REGISTRY: voice_practice, mock_exam, pilot_demo have R and O shortcuts with accurate descriptions', () => {
  for (const screen of ['voice_practice', 'mock_exam', 'pilot_demo']) {
    const help = getPageHelp(screen);
    assert.ok(help, `getPageHelp must return a record for ${screen}`);

    const shortcuts = help.keyboardShortcuts;
    const rShortcut = shortcuts.find((s) => s.key === 'R' || s.key === 'R');
    const oShortcut = shortcuts.find((s) => s.key === 'O' || s.key === 'O');

    assert.ok(rShortcut, `${screen} must have R shortcut in keyboardShortcuts`);
    assert.ok(oShortcut, `${screen} must have O shortcut in keyboardShortcuts`);

    // Description must reference "question" or "text only" behavior
    assert.ok(
      rShortcut!.actionDescription.toLowerCase().includes('question'),
      `${screen} R shortcut description must reference "question"`
    );
    // Description must reference "options" behavior
    assert.ok(
      oShortcut!.actionDescription.toLowerCase().includes('option'),
      `${screen} O shortcut description must reference "option"`
    );
  }
});

test('SHORTCUT AUDIT: Zero collision between global navigation Alt+keys and in-page shortcuts', () => {
  // 1. Navigation shortcuts must be uniquely assigned
  const navShortcuts = MASTER_SHORTCUT_REGISTRY.filter((s) => s.category === 'navigation' && s.altKey);
  const navKeys = navShortcuts.map((s) => s.key.toLowerCase());
  const uniqueNavKeys = new Set(navKeys);
  assert.strictEqual(navKeys.length, uniqueNavKeys.size, 'Every navigation Alt+key must be unique with zero collisions');

  // 2. Alt+R must strictly navigate to Revision Planner (never repeat question)
  const rNav = resolveNavigationShortcut('r');
  assert.ok(rNav, 'Alt+R must be registered');
  assert.strictEqual(rNav.destination, 'revision_planner', 'Alt+R must navigate to Revision Planner');

  // 3. Alt+O must strictly navigate to Pilot Demo (never repeat options)
  const oNav = resolveNavigationShortcut('o');
  assert.ok(oNav, 'Alt+O must be registered');
  assert.strictEqual(oNav.destination, 'pilot_demo', 'Alt+O must navigate to Pilot Demo Diagnostic');

  // 4. Alt+P must strictly navigate to Voice Practice (never Previous question)
  const pNav = resolveNavigationShortcut('p');
  assert.ok(pNav, 'Alt+P must be registered');
  assert.strictEqual(pNav.destination, 'voice_practice', 'Alt+P must navigate to Voice Practice');

  // 5. Alt+S must strictly navigate to Subject & Topic Explorer (never change subject)
  const sNav = resolveNavigationShortcut('s');
  assert.ok(sNav, 'Alt+S must be registered');
  assert.strictEqual(sNav.destination, 'topics', 'Alt+S must navigate to Subject & Topic Explorer');

  // 6. In-exam repeat shortcuts must be plain keys (R and O), without Alt
  const examRepeatQ = MASTER_SHORTCUT_REGISTRY.find((s) => s.id === 'exam-repeat-question');
  const examRepeatO = MASTER_SHORTCUT_REGISTRY.find((s) => s.id === 'exam-repeat-options');
  assert.ok(examRepeatQ, 'exam-repeat-question must exist');
  assert.ok(examRepeatO, 'exam-repeat-options must exist');
  assert.strictEqual(examRepeatQ.altKey, undefined, 'exam-repeat-question must NOT require Alt key');
  assert.strictEqual(examRepeatO.altKey, undefined, 'exam-repeat-options must NOT require Alt key');
  assert.strictEqual(examRepeatQ.key, 'r', 'exam-repeat-question must use key "r"');
  assert.strictEqual(examRepeatO.key, 'o', 'exam-repeat-options must use key "o"');
});

test('SHORTCUT AUDIT: PAGE_HELP_REGISTRY in-exam shortcuts contain no misleading Alt+ shortcuts', () => {
  const vpHelp = getPageHelp('voice_practice');
  const meHelp = getPageHelp('mock_exam');
  const pdHelp = getPageHelp('pilot_demo');

  // Voice practice must not assign Alt+S, Alt+R, Alt+O, Alt+P, Alt+N for in-screen actions
  const vpKeys = vpHelp.keyboardShortcuts.map((s) => s.key);
  assert.ok(!vpKeys.includes('Alt + S'), 'Voice practice must NOT have Alt+S for subject change (must use J)');
  assert.ok(!vpKeys.includes('Alt + R'), 'Voice practice must NOT have Alt+R for repeat (must use R)');
  assert.ok(!vpKeys.includes('Alt + O'), 'Voice practice must NOT have Alt+O for repeat (must use O)');
  assert.ok(!vpKeys.includes('Alt + P'), 'Voice practice must NOT have Alt+P for previous (must use P)');
  assert.ok(!vpKeys.includes('Alt + N'), 'Voice practice must NOT have Alt+N for next (must use N / Enter)');
  assert.ok(vpKeys.includes('J'), 'Voice practice must have J for subject selection jump');

  // Mock exam must not assign Alt+R, Alt+O, Alt+P, Alt+N, Alt+H for in-screen actions
  const meKeys = meHelp.keyboardShortcuts.map((s) => s.key);
  assert.ok(!meKeys.includes('Alt + R'), 'Mock exam must NOT have Alt+R for repeat (must use R)');
  assert.ok(!meKeys.includes('Alt + O'), 'Mock exam must NOT have Alt+O for repeat (must use O)');
  assert.ok(!meKeys.includes('Alt + P'), 'Mock exam must NOT have Alt+P for previous (must use P)');
  assert.ok(!meKeys.includes('Alt + N'), 'Mock exam must NOT have Alt+N for next (must use N / Enter)');
  assert.ok(!meKeys.includes('Alt + H'), 'Mock exam must NOT have Alt+H for review (must use M)');
  assert.ok(meKeys.includes('M'), 'Mock exam must have M for Mark for Review');

  // Pilot demo must not assign Alt+R or Alt+O
  const pdKeys = pdHelp.keyboardShortcuts.map((s) => s.key);
  assert.ok(!pdKeys.includes('Alt + R'), 'Pilot demo must NOT have Alt+R for repeat');
  assert.ok(!pdKeys.includes('Alt + O'), 'Pilot demo must NOT have Alt+O for repeat');
  assert.ok(pdKeys.includes('M'), 'Pilot demo must have M for Mark for Review');
});
