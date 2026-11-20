import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateHumanVerificationChallenge,
  verifyChallengeResponse,
  validateVerificationToken,
  consumeVerificationToken,
  calculateWordSimilarity,
  normalizeVerificationPhrase
} from '../utils/humanVerification.ts';
import { SCREEN_TO_PATH, PATH_TO_SCREEN } from '../context/AccessibilityContext.tsx';
import { APPROVED_SCREENS } from '../types/screens.ts';

test('Spoken Verification: Challenge Generation produces dynamic phrases with secure tokens', () => {
  const c1 = generateHumanVerificationChallenge('test_ip_1');
  const c2 = generateHumanVerificationChallenge('test_ip_2');

  assert.ok(c1.challengeId, 'Must have challengeId');
  assert.ok(c1.phrase, 'Must have verification phrase');
  assert.ok(c1.token, 'Must have validation token');
  assert.equal(c1.maxAttempts, 5);
  assert.equal(c1.attemptsUsed, 0);
  assert.ok(c1.expiresAt > Date.now(), 'Must not be expired upon creation');
});

test('Spoken Verification: Normalization removes punctuation, ignores case, and cleans whitespace', () => {
  const raw1 = '  The APPLE is Red.  ';
  const raw2 = 'the, apple is - red!';
  assert.equal(normalizeVerificationPhrase(raw1), 'the apple is red');
  assert.equal(normalizeVerificationPhrase(raw2), 'the apple is red');
});

test('Spoken Verification: Word similarity threshold accepts accurate and minor speech variations', () => {
  const target = 'The apple is red';
  
  // Exact match
  assert.equal(calculateWordSimilarity('the apple is red', target), 1.0);

  // Minor phonetic/speech recognition variance (3 out of 4 words match => 0.75 >= 0.75)
  const minor = calculateWordSimilarity('apple is red', target);
  assert.ok(minor >= 0.75, `Expected >= 0.75, got ${minor}`);

  // Completely incorrect speech
  const wrong = calculateWordSimilarity('the sky is blue and raining outside', target);
  assert.ok(wrong < 0.6, `Expected < 0.6, got ${wrong}`);
});

test('Spoken Verification: Verification succeeds with valid spoken phrase', () => {
  const challenge = generateHumanVerificationChallenge('ip_valid_user');
  const result = verifyChallengeResponse(challenge.challengeId, challenge.phrase);

  assert.equal(result.success, true);
  assert.ok(result.verificationToken, 'Must issue verified token upon success');

  // Verify the issued verification token
  const validation = validateVerificationToken(result.verificationToken!);
  assert.equal(validation.valid, true);
});

test('Spoken Verification: Verification fails and increments attempts with incorrect response', () => {
  const challenge = generateHumanVerificationChallenge('ip_fail_user');
  const result = verifyChallengeResponse(challenge.challengeId, 'completely wrong phrase');

  assert.equal(result.success, false);
  assert.equal(result.attemptsRemaining, 4);
  assert.equal(result.verificationToken, undefined);
});

test('Spoken Verification: Reject expired challenge', () => {
  const challenge = generateHumanVerificationChallenge('ip_expire');
  // Artificially expire the challenge
  challenge.expiresAt = Date.now() - 1000;

  const result = verifyChallengeResponse(challenge.challengeId, challenge.phrase);
  assert.equal(result.success, false);
  assert.match(result.error || '', /expired/i);
});

test('Spoken Verification: Enforces max attempts lockout', () => {
  const challenge = generateHumanVerificationChallenge('ip_lockout');

  // Exhaust 5 attempts
  for (let i = 0; i < 5; i++) {
    verifyChallengeResponse(challenge.challengeId, 'wrong phrase');
  }

  // 6th attempt should be blocked
  const result = verifyChallengeResponse(challenge.challengeId, challenge.phrase);
  assert.equal(result.success, false);
  assert.match(result.error || '', /maximum attempts/i);
});

test('Spoken Verification: Invalid or tampered tokens are rejected', () => {
  const invalid1 = validateVerificationToken('random_invalid_token');
  assert.equal(invalid1.valid, false);

  const invalid2 = validateVerificationToken('');
  assert.equal(invalid2.valid, false);
});

test('Spoken Verification: Token is single-use and cannot be replayed', () => {
  const challenge = generateHumanVerificationChallenge('ip_replay_test');
  const result = verifyChallengeResponse(challenge.challengeId, challenge.phrase);
  assert.equal(result.success, true);
  assert.ok(result.verificationToken);

  // First validation succeeds
  const first = validateVerificationToken(result.verificationToken);
  assert.equal(first.valid, true);

  // Consume token
  const consumed = consumeVerificationToken(result.verificationToken);
  assert.equal(consumed, true);

  // Second validation must fail
  const second = validateVerificationToken(result.verificationToken);
  assert.equal(second.valid, false);
});

test('Routing & Screens: Screen Reader Settings and Accessibility Settings have isolated paths', () => {
  assert.equal(APPROVED_SCREENS.length, 18);
  assert.ok(APPROVED_SCREENS.includes('screen_reader_settings'));
  assert.ok(APPROVED_SCREENS.includes('accessibility_settings'));

  assert.equal(SCREEN_TO_PATH['screen_reader_settings'], '/screen-reader-settings');
  assert.equal(SCREEN_TO_PATH['accessibility_settings'], '/accessibility-settings');

  assert.equal(PATH_TO_SCREEN['/screen-reader-settings'], 'screen_reader_settings');
  assert.equal(PATH_TO_SCREEN['screen-reader-settings'], 'screen_reader_settings');
  assert.equal(PATH_TO_SCREEN['/accessibility-settings'], 'accessibility_settings');
  assert.equal(PATH_TO_SCREEN['accessibility-settings'], 'accessibility_settings');

  // Verify all 18 approved screens have mapped paths
  for (const screen of APPROVED_SCREENS) {
    assert.ok(SCREEN_TO_PATH[screen], `Path missing for screen: ${screen}`);
  }
});

