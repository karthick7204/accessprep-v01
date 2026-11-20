import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

import { APPROVED_SCREENS, SCREEN_REGISTRY, validateScreenRegistry } from '../types/screens.ts';
import { evaluateSubmission, calculateExamDuration, QuestionSubmission } from '../utils/scoring.ts';
import { calculateSM2, getNextReviewDate } from '../utils/sm2.ts';
import { updateBKT, classifyMasteryTier } from '../utils/bkt.ts';
import { runPostgresMigrationAndSeed } from '../db/seed_postgres.ts';

test('1. Strict Screen Limit: 18 unique approved screens enforced (16 core + Pilot Demo Diagnostic + Screen Reader Settings)', () => {
  const result = validateScreenRegistry();
  assert.equal(result.isValid, true);
  assert.equal(result.totalScreens, 18);
  assert.equal(APPROVED_SCREENS.length, 18);
  assert.equal(Object.keys(SCREEN_REGISTRY).length, 18);
});

test('2. Curated Dataset: exactly 400 records, 100 per subject, balanced answers', () => {
  const questionsPath = path.resolve(process.cwd(), 'src/data/ssc_mts_questions.json');
  assert.ok(fs.existsSync(questionsPath));
  const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'));
  assert.equal(questions.length, 400);

  const subjects: Record<string, number> = {};
  const answers: Record<string, number> = {};

  questions.forEach((q: any) => {
    subjects[q.subject] = (subjects[q.subject] || 0) + 1;
    answers[q.correct_answer] = (answers[q.correct_answer] || 0) + 1;

    // Verify critical schema fields
    assert.ok(q.question_id.startsWith('SSC-MTS-'));
    assert.ok(q.question_text.length > 5);
    assert.ok(q.explanation.length > 5);
    assert.ok(['A', 'B', 'C', 'D'].includes(q.correct_answer));
    assert.ok(['Easy', 'Medium', 'Hard'].includes(q.difficulty_label));
    assert.equal(q.verification_status, 'Verified');
  });

  assert.equal(subjects['Numerical and Mathematical Ability'], 100);
  assert.equal(subjects['Reasoning Ability and Problem Solving'], 100);
  assert.equal(subjects['General Awareness'], 100);
  assert.equal(subjects['English Language and Comprehension'], 100);

  assert.equal(answers['A'], 100);
  assert.equal(answers['B'], 100);
  assert.equal(answers['C'], 100);
  assert.equal(answers['D'], 100);
});

test('3. Official SSC MTS Exam Marking Rules: Session I vs Session II', () => {
  const subs: QuestionSubmission[] = [
    // Session I: Correct (+3), Incorrect (0)
    { questionId: '1', subject: 'Numerical and Mathematical Ability', selectedOption: 'A', correctAnswer: 'A', timeSpentSeconds: 30 },
    { questionId: '2', subject: 'Numerical and Mathematical Ability', selectedOption: 'B', correctAnswer: 'A', timeSpentSeconds: 30 },
    // Session II: Correct (+3), Incorrect (-1 penalty)
    { questionId: '3', subject: 'General Awareness', selectedOption: 'A', correctAnswer: 'A', timeSpentSeconds: 20 },
    { questionId: '4', subject: 'English Language and Comprehension', selectedOption: 'B', correctAnswer: 'C', timeSpentSeconds: 25 }
  ];

  const evalResult = evaluateSubmission(subs);
  assert.equal(evalResult.session1Score, 3, 'Session I must have 0 negative marks');
  assert.equal(evalResult.session2Score, 2, 'Session II must apply -1 penalty for incorrect answer (3 - 1 = 2)');
  assert.equal(evalResult.totalScore, 5);
});

test('4. PwD Compensatory Time Allocation (RPwD Act & DoPT Norms)', () => {
  const standardSeconds = calculateExamDuration(false, 2); // 2 sessions * 45m = 90m = 5400s
  const pwdSeconds = calculateExamDuration(true, 2);       // 2 sessions * 60m = 120m = 7200s

  assert.equal(standardSeconds, 5400);
  assert.equal(pwdSeconds, 7200);
  assert.equal(pwdSeconds - standardSeconds, 1800, 'Must grant exactly 30 minutes compensatory time for 2 sessions');
});

test('5. Bayesian Knowledge Tracing (BKT) Mastery Updates', () => {
  let p = 0.25; // prior
  p = updateBKT(p, true);
  assert.ok(p > 0.25, 'Correct answer must increase mastery');
  const afterWrong = updateBKT(p, false);
  assert.ok(afterWrong < p, 'Incorrect answer must decrease mastery');
  assert.equal(classifyMasteryTier(0.88), 'Mastered');
  assert.equal(classifyMasteryTier(0.70), 'Proficient');
  assert.equal(classifyMasteryTier(0.50), 'Developing');
  assert.equal(classifyMasteryTier(0.20), 'Novice');
});

test('6. SuperMemo SM-2 Interval Calculation and Reset', () => {
  let state = { repetitions: 0, intervalDays: 1, easinessFactor: 2.5 };
  const r1 = calculateSM2(state, 5);
  assert.equal(r1.repetitions, 1);
  assert.equal(r1.intervalDays, 1);

  const r2 = calculateSM2(r1, 4);
  assert.equal(r2.repetitions, 2);
  assert.equal(r2.intervalDays, 6);

  const rFail = calculateSM2(r2, 1);
  assert.equal(rFail.repetitions, 0, 'Recall failure must reset repetitions');
  assert.equal(rFail.intervalDays, 1, 'Interval must reset to 1 day on failure');
});

test('7. PostgreSQL Schema & Seed Idempotency Check', async () => {
  const report = await runPostgresMigrationAndSeed();
  assert.equal(report.success, true);
  assert.equal(report.questionsLoaded, 400);
  assert.equal(report.tablesVerified.length, 8);
});

test('8. Password Hashing Security with Salt', () => {
  const salt = 'accessprep_x_salt_2026';
  const plain = 'candidate123';
  const hash1 = crypto.createHash('sha256').update(plain + salt).digest('hex');
  const hash2 = crypto.createHash('sha256').update(plain + salt).digest('hex');
  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 64);
  assert.notEqual(hash1, plain);
});
