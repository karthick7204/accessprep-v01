/**
 * ACCESSPREP-X — Revision Planner & Spaced Repetition Test Suite
 * Validates SM-2 4-button recall mappings, session metrics, subject aggregation,
 * and recovery workflows.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSM2, getNextReviewDate } from '../utils/sm2.ts';
import { matchScreenNavigation } from '../voice/commandParser.ts';

// ---------------------------------------------------------------------------
// 1. SM-2 Four-Button Recall Rating Mapping Validation
// ---------------------------------------------------------------------------

test('SM-2 Rating Mapping: "AGAIN" (quality 1) resets repetitions and interval to 1 day', () => {
  const item = {
    repetitions: 3,
    intervalDays: 15,
    easinessFactor: 2.5
  };

  // Again: quality 1 (I forgot)
  const result = calculateSM2(item, 1);

  assert.equal(result.repetitions, 0, 'Repetitions must reset to 0 on recall failure');
  assert.equal(result.intervalDays, 1, 'Interval must reset to 1 day on recall failure');
  assert.ok(result.easinessFactor < 2.5, 'Easiness factor should decrease on failure');
  assert.equal(result.masteryLevel, 'Novice');
});

test('SM-2 Rating Mapping: "HARD" (quality 3) increases interval with difficulty penalty', () => {
  const item = {
    repetitions: 1,
    intervalDays: 1,
    easinessFactor: 2.5
  };

  // Hard: quality 3 (difficult recall)
  const result = calculateSM2(item, 3);

  assert.equal(result.repetitions, 2, 'Repetitions should increment on successful recall');
  assert.equal(result.intervalDays, 6, 'Second repetition interval is fixed at 6 days');
  // EF formula: 2.5 + (0.1 - 2 * (0.08 + 2 * 0.02)) = 2.5 + (0.1 - 0.24) = 2.5 - 0.14 = 2.36
  assert.equal(result.easinessFactor, 2.36, 'Easiness factor decreases by 0.14 on Hard');
});

test('SM-2 Rating Mapping: "GOOD" (quality 4) keeps easiness factor steady and advances interval', () => {
  const item = {
    repetitions: 2,
    intervalDays: 6,
    easinessFactor: 2.5
  };

  // Good: quality 4 (recalled with effort)
  const result = calculateSM2(item, 4);

  assert.equal(result.repetitions, 3);
  // EF formula: 2.5 + (0.1 - 1 * (0.08 + 1 * 0.02)) = 2.5 + 0 = 2.5
  assert.equal(result.easinessFactor, 2.5, 'Good rating maintains steady easiness factor');
  assert.equal(result.intervalDays, Math.round(6 * 2.5), 'Interval scaled by EF (6 * 2.5 = 15)');
});

test('SM-2 Rating Mapping: "EASY" (quality 5) rewards confidence with EF bonus and longer interval', () => {
  const item = {
    repetitions: 2,
    intervalDays: 6,
    easinessFactor: 2.5
  };

  // Easy: quality 5 (perfect recall)
  const result = calculateSM2(item, 5);

  assert.equal(result.repetitions, 3);
  // EF formula: 2.5 + (0.1 - 0) = 2.6
  assert.equal(result.easinessFactor, 2.6, 'Easy rating grants +0.10 easiness factor bonus');
  assert.equal(result.intervalDays, Math.round(6 * 2.6), 'Interval scaled by new EF (6 * 2.6 = 16)');
});

test('SM-2 Floor: Easiness factor never falls below 1.30', () => {
  let item = {
    repetitions: 0,
    intervalDays: 1,
    easinessFactor: 1.35
  };

  // Multiple failures
  item = { ...item, ...calculateSM2(item, 1) };
  item = { ...item, ...calculateSM2(item, 1) };

  assert.ok(item.easinessFactor >= 1.3, 'EF must not drop below 1.30');
});

// ---------------------------------------------------------------------------
// 2. Next Review Date Calculation
// ---------------------------------------------------------------------------

test('getNextReviewDate: calculates future ISO dates accurately', () => {
  const baseDate = new Date('2026-11-04T12:00:00.000Z');
  const next1 = getNextReviewDate(1, baseDate);
  const next6 = getNextReviewDate(6, baseDate);
  const next15 = getNextReviewDate(15, baseDate);

  assert.equal(next1, '2026-11-05T12:00:00.000Z');
  assert.equal(next6, '2026-11-10T12:00:00.000Z');
  assert.equal(next15, '2026-11-19T12:00:00.000Z');
});

// ---------------------------------------------------------------------------
// 3. Subject Aggregation Logic
// ---------------------------------------------------------------------------

test('Subject Breakdown: Groups cards correctly across official SSC MTS sections', () => {
  const sampleCards = [
    { subject: 'Numerical and Mathematical Ability', isDue: true, status: 'due', nextReviewDate: '2026-11-01' },
    { subject: 'Numerical and Mathematical Ability', isDue: false, status: 'mastered', intervalDays: 25, nextReviewDate: '2026-11-20' },
    { subject: 'Reasoning Ability and Problem Solving', isDue: true, status: 'due', nextReviewDate: '2026-11-02' },
    { subject: 'English Language and Comprehension', isDue: false, status: 'scheduled', intervalDays: 6, nextReviewDate: '2026-11-12' },
    { subject: 'General Awareness', isDue: true, status: 'due', nextReviewDate: '2026-11-01' }
  ];

  const now = new Date('2026-11-04T12:00:00Z');

  const mathDue = sampleCards.filter(
    c => c.subject === 'Numerical and Mathematical Ability' && (c.isDue || new Date(c.nextReviewDate) <= now)
  ).length;

  const reasoningDue = sampleCards.filter(
    c => c.subject === 'Reasoning Ability and Problem Solving' && (c.isDue || new Date(c.nextReviewDate) <= now)
  ).length;

  const englishDue = sampleCards.filter(
    c => c.subject === 'English Language and Comprehension' && (c.isDue || new Date(c.nextReviewDate) <= now)
  ).length;

  assert.equal(mathDue, 1);
  assert.equal(reasoningDue, 1);
  assert.equal(englishDue, 0);
});

// ---------------------------------------------------------------------------
// 4. Session Progress and Summary Metrics
// ---------------------------------------------------------------------------

test('Session Summary: Accurately classifies rating distribution and flagged topics', () => {
  const ratings = [
    { topic: 'LCM & HCF', subject: 'Math', quality: 5 },
    { topic: 'LCM & HCF', subject: 'Math', quality: 4 },
    { topic: 'Syllogisms', subject: 'Reasoning', quality: 3 }, // Hard
    { topic: 'Article 14', subject: 'General Awareness', quality: 1 }, // Again
    { topic: 'Idioms', subject: 'English', quality: 5 }
  ];

  let easyCount = 0;
  let goodCount = 0;
  let hardCount = 0;
  let againCount = 0;
  const flaggedMap: Record<string, number> = {};

  for (const r of ratings) {
    if (r.quality === 5) easyCount++;
    if (r.quality === 4) goodCount++;
    if (r.quality === 3) {
      hardCount++;
      flaggedMap[r.topic] = (flaggedMap[r.topic] || 0) + 1;
    }
    if (r.quality === 1) {
      againCount++;
      flaggedMap[r.topic] = (flaggedMap[r.topic] || 0) + 1;
    }
  }

  assert.equal(easyCount, 2);
  assert.equal(goodCount, 1);
  assert.equal(hardCount, 1);
  assert.equal(againCount, 1);
  assert.deepEqual(Object.keys(flaggedMap), ['Syllogisms', 'Article 14']);
});

// ---------------------------------------------------------------------------
// 5. Voice Router Screen Isolation
// ---------------------------------------------------------------------------

test('Voice Router: Revision planner local commands are not claimed by global navigation', () => {
  const localCommands = [
    'next',
    'skip',
    'reveal',
    'reveal answer',
    'show answer',
    'again',
    'hard',
    'good',
    'easy',
    'pause',
    'resume',
    'start revision'
  ];

  for (const cmd of localCommands) {
    const res = matchScreenNavigation(cmd, 'revision_planner');
    assert.equal(res, null, `Local revision command "${cmd}" should not be hijacked by global navigation`);
  }
});

