/**
 * ACCESSPREP-X — Voice Practice Question Progression & State Machine Test Suite
 * Validates sequential question advancement, synchronous submission guards,
 * manual repeat invariance, and completion handling.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSpokenAnswer } from '../utils/answerParser.ts';
import {
  formatFullQuestionPrompt,
  formatAllOptionsPrompt,
  formatSingleOptionPrompt
} from '../utils/repeatQuestionHelper.ts';
import type { Question } from '../db/database.ts';

// ---------------------------------------------------------------------------
// Mock Question Bank
// ---------------------------------------------------------------------------

const mockQuestions: Question[] = [
  {
    question_id: 'MTS-NA-001',
    subject: 'Numerical and Mathematical Ability',
    topic: 'LCM and HCF',
    subtopic: 'Multiples',
    question_text: 'What is the LCM of 12 and 18?',
    question_type: 'MCQ',
    option_a: '24',
    option_b: '36',
    option_c: '48',
    option_d: '72',
    correct_answer: 'B',
    explanation: 'Multiples of 18 are 18, 36, 54. 36 is divisible by 12, so LCM is 36.',
    difficulty_label: 'Easy',
    source_name: 'SSC MTS PYQ',
    source_reference: '2023 Shift 1',
    source_type: 'PYQ',
    verification_status: 'Verified',
    language: 'en',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    dataset_version: 'v1.0'
  },
  {
    question_id: 'MTS-NA-002',
    subject: 'Numerical and Mathematical Ability',
    topic: 'Percentages',
    subtopic: 'Profit and Loss',
    question_text: 'A shopkeeper sells an article for Rs. 500 gaining 25%. What is the cost price?',
    question_type: 'MCQ',
    option_a: 'Rs. 400',
    option_b: 'Rs. 425',
    option_c: 'Rs. 450',
    option_d: 'Rs. 375',
    correct_answer: 'A',
    explanation: 'Cost price = Selling price / 1.25 = 500 / 1.25 = Rs. 400.',
    difficulty_label: 'Medium',
    source_name: 'SSC MTS PYQ',
    source_reference: '2023 Shift 2',
    source_type: 'PYQ',
    verification_status: 'Verified',
    language: 'en',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    dataset_version: 'v1.0'
  },
  {
    question_id: 'MTS-RE-001',
    subject: 'Reasoning Ability and Problem Solving',
    topic: 'Coding-Decoding',
    subtopic: 'Letter Shifting',
    question_text: 'If APPLE is coded as BQQMF, how is MANGO coded?',
    question_type: 'MCQ',
    option_a: 'NBOHP',
    option_b: 'NCOHP',
    option_c: 'NBOHQ',
    option_d: 'NBOIP',
    correct_answer: 'A',
    explanation: 'Each letter is shifted forward by +1 position in alphabet.',
    difficulty_label: 'Easy',
    source_name: 'SSC MTS PYQ',
    source_reference: '2022 Shift 1',
    source_type: 'PYQ',
    verification_status: 'Verified',
    language: 'en',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    dataset_version: 'v1.0'
  },
  {
    question_id: 'MTS-GA-001',
    subject: 'General Awareness',
    topic: 'Indian Polity',
    subtopic: 'Fundamental Rights',
    question_text: 'Which Article of the Indian Constitution guarantees Right to Equality?',
    question_type: 'MCQ',
    option_a: 'Article 14',
    option_b: 'Article 19',
    option_c: 'Article 21',
    option_d: 'Article 32',
    correct_answer: 'A',
    explanation: 'Articles 14 to 18 provide for Right to Equality, with Article 14 establishing equality before law.',
    difficulty_label: 'Easy',
    source_name: 'SSC MTS PYQ',
    source_reference: '2021 Shift 1',
    source_type: 'PYQ',
    verification_status: 'Verified',
    language: 'en',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    dataset_version: 'v1.0'
  }
];

// ---------------------------------------------------------------------------
// 1. Question Progression Controller Simulator
// ---------------------------------------------------------------------------

class VoicePracticeSimulator {
  currentIndex: number = 0;
  questions: Question[];
  sessionStep:
    | 'LOADING'
    | 'READING_QUESTION'
    | 'LISTENING'
    | 'PROCESSING_ANSWER'
    | 'SPEAKING_FEEDBACK'
    | 'ADVANCING'
    | 'COMPLETED' = 'LOADING';

  isSubmitting: boolean = false;
  hasAnsweredCurrent: boolean = false;
  submittedAttempts: Array<{ questionId: string; option: string; isCorrect: boolean }> = [];
  spokenPrompts: string[] = [];

  constructor(questions: Question[]) {
    this.questions = questions;
    this.init();
  }

  init() {
    this.currentIndex = 0;
    this.sessionStep = 'READING_QUESTION';
    const q1 = this.questions[0];
    const prompt = formatFullQuestionPrompt(q1, 0, this.questions.length);
    this.spokenPrompts.push(prompt);
    // Question finished reading -> ready to listen
    this.sessionStep = 'LISTENING';
  }

  async answerQuestion(transcript: string): Promise<boolean> {
    if (
      this.isSubmitting ||
      this.hasAnsweredCurrent ||
      this.sessionStep !== 'LISTENING'
    ) {
      return false; // Rejected duplicate or illegal transition
    }

    const currentQ = this.questions[this.currentIndex];
    const optionsMap = {
      A: currentQ.option_a,
      B: currentQ.option_b,
      C: currentQ.option_c,
      D: currentQ.option_d
    };

    const parsed = parseSpokenAnswer(transcript, optionsMap);
    if (!parsed) return false;

    if (parsed.type === 'control') {
      if (parsed.command === 'repeat') {
        // Manual repeat: re-read current question WITHOUT advancing!
        this.spokenPrompts.push(formatFullQuestionPrompt(currentQ, this.currentIndex, this.questions.length));
        return true;
      }
      if (parsed.command === 'repeat_options') {
        this.spokenPrompts.push(formatAllOptionsPrompt(currentQ));
        return true;
      }
    }

    if (parsed.type === 'option') {
      // Synchronous Guard
      this.isSubmitting = true;
      this.hasAnsweredCurrent = true;
      this.sessionStep = 'PROCESSING_ANSWER';

      // Simulate asynchronous network flight
      await new Promise((r) => setTimeout(r, 20));

      const isCorrect = parsed.option.toUpperCase() === currentQ.correct_answer.toUpperCase();
      this.submittedAttempts.push({
        questionId: currentQ.question_id,
        option: parsed.option,
        isCorrect
      });

      this.sessionStep = 'SPEAKING_FEEDBACK';
      const feedback = isCorrect ? `Correct! ${currentQ.explanation}` : `Incorrect.`;
      this.spokenPrompts.push(feedback);

      // Advance
      this.advance();
      return true;
    }

    return false;
  }

  advance() {
    this.sessionStep = 'ADVANCING';
    if (this.currentIndex >= this.questions.length - 1) {
      this.sessionStep = 'COMPLETED';
      this.spokenPrompts.push('Practice session complete!');
      return;
    }

    this.currentIndex += 1;
    this.isSubmitting = false;
    this.hasAnsweredCurrent = false;

    const nextQ = this.questions[this.currentIndex];
    this.sessionStep = 'READING_QUESTION';
    this.spokenPrompts.push(formatFullQuestionPrompt(nextQ, this.currentIndex, this.questions.length));
    this.sessionStep = 'LISTENING';
  }
}

// ---------------------------------------------------------------------------
// 2. Progression Test Cases
// ---------------------------------------------------------------------------

test('Voice Practice Progression: Question 1 -> Answer B -> Question 2', async () => {
  const sim = new VoicePracticeSimulator(mockQuestions);
  assert.equal(sim.currentIndex, 0, 'Starts at Question 1');
  assert.equal(sim.sessionStep, 'LISTENING');
  assert.ok(sim.spokenPrompts[0].includes('Question 1 of 4'));
  assert.ok(sim.spokenPrompts[0].includes('What is the LCM of 12 and 18?'));

  // Student answers Question 1 with Option B
  const handled = await sim.answerQuestion('Option B');
  assert.equal(handled, true);

  // Assert Question 1 was recorded and session advanced to Question 2
  assert.equal(sim.submittedAttempts.length, 1);
  assert.equal(sim.submittedAttempts[0].questionId, 'MTS-NA-001');
  assert.equal(sim.submittedAttempts[0].option, 'B');
  assert.equal(sim.submittedAttempts[0].isCorrect, true);

  // Verify Question 2 is now loaded and read
  assert.equal(sim.currentIndex, 1, 'Index must advance to 1 (Question 2)');
  assert.equal(sim.sessionStep, 'LISTENING');
  const q2Prompt = sim.spokenPrompts[sim.spokenPrompts.length - 1];
  assert.ok(q2Prompt.includes('Question 2 of 4'), 'Next prompt must be Question 2');
  assert.ok(q2Prompt.includes('A shopkeeper sells an article'));
});

test('Voice Practice Progression: Complete Sequence Q1 -> Q2 -> Q3 -> Q4', async () => {
  const sim = new VoicePracticeSimulator(mockQuestions);

  // Q1 -> Answer B
  await sim.answerQuestion('Option B');
  assert.equal(sim.currentIndex, 1, 'Advanced to Question 2');

  // Q2 -> Answer A
  await sim.answerQuestion('Option A');
  assert.equal(sim.currentIndex, 2, 'Advanced to Question 3');

  // Q3 -> Answer A
  await sim.answerQuestion('Option A');
  assert.equal(sim.currentIndex, 3, 'Advanced to Question 4');

  // Q4 -> Answer A
  await sim.answerQuestion('Option A');
  assert.equal(sim.sessionStep, 'COMPLETED', 'Session completes after last question');
  assert.equal(sim.submittedAttempts.length, 4, 'Exactly 4 questions submitted');
  assert.ok(sim.spokenPrompts[sim.spokenPrompts.length - 1].includes('Practice session complete'));
});

test('Voice Practice Guards: duplicate voice transcript does not double-advance', async () => {
  const sim = new VoicePracticeSimulator(mockQuestions);
  assert.equal(sim.currentIndex, 0);

  // Simulate first recognition event
  const p1 = sim.answerQuestion('Option B');

  // Simulate immediate second duplicate transcript before advance finishes
  const p2 = sim.answerQuestion('Option B');

  const [res1, res2] = await Promise.all([p1, p2]);
  assert.equal(res1, true, 'First transcript accepted');
  assert.equal(res2, false, 'Duplicate transcript rejected while processing');

  assert.equal(sim.submittedAttempts.length, 1, 'Only 1 attempt recorded');
  assert.equal(sim.currentIndex, 1, 'Advanced by exactly 1 question');
});

test('Voice Practice Invariance: Manual Repeat Question does NOT increment question index', async () => {
  const sim = new VoicePracticeSimulator(mockQuestions);
  assert.equal(sim.currentIndex, 0);

  // Student says "Repeat question"
  const handled = await sim.answerQuestion('repeat question');
  assert.equal(handled, true);

  // Must still be at Question 1
  assert.equal(sim.currentIndex, 0, 'Current index must remain 0 on manual repeat');
  assert.equal(sim.submittedAttempts.length, 0, 'No attempt should be submitted on repeat');
  assert.ok(sim.spokenPrompts[sim.spokenPrompts.length - 1].includes('Question 1 of 4'));
});

test('Voice Practice Invariance: Manual Repeat Options does NOT increment question index', async () => {
  const sim = new VoicePracticeSimulator(mockQuestions);
  assert.equal(sim.currentIndex, 0);

  // Student says "Repeat options"
  const handled = await sim.answerQuestion('repeat options');
  assert.equal(handled, true);

  assert.equal(sim.currentIndex, 0, 'Current index must remain 0 on repeat options');
  assert.equal(sim.submittedAttempts.length, 0, 'No attempt submitted');
  assert.ok(sim.spokenPrompts[sim.spokenPrompts.length - 1].includes('The options are:'));
});
