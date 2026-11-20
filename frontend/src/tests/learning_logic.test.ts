import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSubmission, isSession1Subject, calculateExamDuration, QuestionSubmission } from '../utils/scoring.ts';
import { calculateSM2 } from '../utils/sm2.ts';
import { updateBKT, classifyMasteryTier } from '../utils/bkt.ts';

test('SSC MTS Scoring: Session I has +3 for correct and NO negative marking for incorrect', () => {
  const submissions: QuestionSubmission[] = [
    {
      questionId: 'Q1',
      subject: 'Numerical and Mathematical Ability',
      selectedOption: 'A',
      correctAnswer: 'A',
      timeSpentSeconds: 45
    },
    {
      questionId: 'Q2',
      subject: 'Numerical and Mathematical Ability',
      selectedOption: 'B',
      correctAnswer: 'C', // wrong
      timeSpentSeconds: 50
    },
    {
      questionId: 'Q3',
      subject: 'Reasoning Ability and Problem Solving',
      selectedOption: null, // unattempted
      correctAnswer: 'D',
      timeSpentSeconds: 10
    }
  ];

  const result = evaluateSubmission(submissions);
  assert.equal(result.session1Score, 3, 'Correct answer gets 3 marks, wrong gets 0 in Session I');
  assert.equal(result.totalIncorrect, 1);
  assert.equal(result.totalUnattempted, 1);
  assert.equal(result.totalAttempted, 2);
  assert.equal(result.session1Max, 9);
});

test('SSC MTS Scoring: Session II applies -1 penalty for incorrect answer', () => {
  const submissions: QuestionSubmission[] = [
    {
      questionId: 'Q1',
      subject: 'General Awareness',
      selectedOption: 'A',
      correctAnswer: 'A', // +3
      timeSpentSeconds: 30
    },
    {
      questionId: 'Q2',
      subject: 'English Language and Comprehension',
      selectedOption: 'B',
      correctAnswer: 'C', // -1 penalty
      timeSpentSeconds: 25
    }
  ];

  const result = evaluateSubmission(submissions);
  // Session II net: 3 - 1 = 2
  assert.equal(result.session2Score, 2, 'Session II score should be 3 - 1 = 2 marks');
  assert.equal(result.totalScore, 2);
  assert.equal(result.accuracyPercentage, 50);
});

test('PwD compensatory time calculation grants 60 min per 45 min session', () => {
  const normalDuration = calculateExamDuration(false, 2); // 45 * 2 = 90 min = 5400s
  const pwdDuration = calculateExamDuration(true, 2);     // 60 * 2 = 120 min = 7200s
  assert.equal(normalDuration, 5400);
  assert.equal(pwdDuration, 7200);
});

test('SM-2 Spaced Repetition increments intervals on successful recall and resets on failure', () => {
  let state = { repetitions: 0, intervalDays: 0, easinessFactor: 2.5 };
  
  // First correct recall (q=4)
  state = calculateSM2(state, 4);
  assert.equal(state.repetitions, 1);
  assert.equal(state.intervalDays, 1);

  // Second correct recall (q=5)
  state = calculateSM2(state, 5);
  assert.equal(state.repetitions, 2);
  assert.equal(state.intervalDays, 6);

  // Failed recall (q=1)
  state = calculateSM2(state, 1);
  assert.equal(state.repetitions, 0, 'Repetitions reset to 0 upon recall failure');
  assert.equal(state.intervalDays, 1, 'Interval reset to 1 day');
});

test('BKT Bayesian Knowledge Tracing increases p_known on correct answer and decreases on incorrect', () => {
  const prior = 0.30;
  const afterCorrect = updateBKT(prior, true);
  assert.ok(afterCorrect > prior, `p_known after correct (${afterCorrect}) must exceed prior (${prior})`);

  const afterIncorrect = updateBKT(afterCorrect, false);
  assert.ok(afterIncorrect < afterCorrect, `p_known after incorrect (${afterIncorrect}) must decrease`);

  assert.equal(classifyMasteryTier(0.90), 'Mastered');
  assert.equal(classifyMasteryTier(0.70), 'Proficient');
  assert.equal(classifyMasteryTier(0.50), 'Developing');
  assert.equal(classifyMasteryTier(0.20), 'Novice');
});
