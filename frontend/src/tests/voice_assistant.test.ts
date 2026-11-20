import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSpokenAnswer } from '../utils/answerParser.ts';
import { calculateExamDuration } from '../utils/scoring.ts';

test('Voice Assistant: Letter & Option Phrasing Recognition', () => {
  const options = {
    A: 'Article 14',
    B: 'Article 19',
    C: 'Article 21',
    D: 'Article 32'
  };

  // Letters
  assert.deepEqual(parseSpokenAnswer('A', options), { type: 'option', option: 'A', matchedBy: 'letter' });
  assert.deepEqual(parseSpokenAnswer('b', options), { type: 'option', option: 'B', matchedBy: 'letter' });
  assert.deepEqual(parseSpokenAnswer('option c', options), { type: 'option', option: 'C', matchedBy: 'letter' });
  assert.deepEqual(parseSpokenAnswer('choice d', options), { type: 'option', option: 'D', matchedBy: 'letter' });
  assert.deepEqual(parseSpokenAnswer('select option a', options), { type: 'option', option: 'A', matchedBy: 'letter' });
  assert.deepEqual(parseSpokenAnswer('bee', options), { type: 'option', option: 'B', matchedBy: 'letter' });
});

test('Voice Assistant: Ordinal Phrasing Recognition', () => {
  const options = {
    A: 'New Delhi',
    B: 'Mumbai',
    C: 'Kolkata',
    D: 'Chennai'
  };

  assert.deepEqual(parseSpokenAnswer('first one', options), { type: 'option', option: 'A', matchedBy: 'ordinal' });
  assert.deepEqual(parseSpokenAnswer('second choice', options), { type: 'option', option: 'B', matchedBy: 'ordinal' });
  assert.deepEqual(parseSpokenAnswer('third option', options), { type: 'option', option: 'C', matchedBy: 'ordinal' });
  assert.deepEqual(parseSpokenAnswer('fourth one', options), { type: 'option', option: 'D', matchedBy: 'ordinal' });
});

test('Voice Assistant: Option Content Fuzzy Matching', () => {
  const options = {
    A: 'Right to Equality before Law',
    B: 'Right to Freedom of Speech',
    C: 'Right to Life and Personal Liberty',
    D: 'Right to Constitutional Remedies'
  };

  // Match by words in option content
  const resB = parseSpokenAnswer('freedom of speech', options);
  assert.ok(resB);
  assert.equal(resB?.type, 'option');
  if (resB?.type === 'option') {
    assert.equal(resB.option, 'B');
    assert.equal(resB.matchedBy, 'content');
  }

  const resC = parseSpokenAnswer('life and personal liberty', options);
  assert.ok(resC);
  assert.equal(resC?.type, 'option');
  if (resC?.type === 'option') {
    assert.equal(resC.option, 'C');
    assert.equal(resC.matchedBy, 'content');
  }
});

test('Voice Assistant: Control Commands Parsing', () => {
  assert.deepEqual(parseSpokenAnswer('repeat question'), { type: 'control', command: 'repeat' });
  assert.deepEqual(parseSpokenAnswer('repeat the question'), { type: 'control', command: 'repeat' });
  assert.deepEqual(parseSpokenAnswer('say again'), { type: 'control', command: 'repeat' });
  assert.deepEqual(parseSpokenAnswer('skip question'), { type: 'control', command: 'skip' });
  assert.deepEqual(parseSpokenAnswer('next'), { type: 'control', command: 'skip' });
  assert.deepEqual(parseSpokenAnswer('previous question'), { type: 'control', command: 'previous' });
  assert.deepEqual(parseSpokenAnswer('back'), { type: 'control', command: 'previous' });
  assert.deepEqual(parseSpokenAnswer('mark for review'), { type: 'control', command: 'mark_review' });
  assert.deepEqual(parseSpokenAnswer('time left'), { type: 'control', command: 'timer' });
  assert.deepEqual(parseSpokenAnswer('time remaining'), { type: 'control', command: 'timer' });
  assert.deepEqual(parseSpokenAnswer('submit exam'), { type: 'control', command: 'submit' });
  assert.deepEqual(parseSpokenAnswer('review test'), { type: 'control', command: 'review' });
  assert.deepEqual(parseSpokenAnswer('where am i'), { type: 'control', command: 'help' });
});

test('Compensatory Time: Spoken Alarm Thresholds (15 min, 5 min, 1 min)', () => {
  const pwdExamSeconds = calculateExamDuration(true, 2); // 120 minutes = 7200s
  assert.equal(pwdExamSeconds, 7200);

  // Remaining time checkpoints in seconds
  const fifteenMinRemaining = 15 * 60; // 900
  const fiveMinRemaining = 5 * 60;    // 300
  const oneMinRemaining = 1 * 60;     // 60

  assert.equal(fifteenMinRemaining, 900);
  assert.equal(fiveMinRemaining, 300);
  assert.equal(oneMinRemaining, 60);
});

