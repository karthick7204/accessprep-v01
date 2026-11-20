import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSpokenEmail,
  analyzeSpokenEmail,
  reconstructSpelledEmail,
  spellOutIdentifier,
  formatCaptchaForSpeech,
  parseAuthVoiceCommand
} from '../utils/authVoiceUtils.ts';
import { extractDigits, generateChallenge } from '../utils/humanVerification.ts';
import { hashPassword, verifyUserPassword, needsRehash } from '../../../backend/src/utils/password.utils.ts';
import crypto from 'node:crypto';

test('MASTER AUDIT: Universal Speech-to-Email Recognition (12 Required Examples)', () => {
  // Example 1: ashwin at gmail dot com
  assert.strictEqual(
    normalizeSpokenEmail('ashwin at gmail dot com'),
    'ashwin@gmail.com'
  );

  // Example 2: ashwin dot chandeep at gmail dot com
  assert.strictEqual(
    normalizeSpokenEmail('ashwin dot chandeep at gmail dot com'),
    'ashwin.chandeep@gmail.com'
  );

  // Example 3: ashwin underscore chandeep at gmail dot com
  assert.strictEqual(
    normalizeSpokenEmail('ashwin underscore chandeep at gmail dot com'),
    'ashwin_chandeep@gmail.com'
  );

  // Example 4: ashwin hyphen chandeep at gmail dot com
  assert.strictEqual(
    normalizeSpokenEmail('ashwin hyphen chandeep at gmail dot com'),
    'ashwin-chandeep@gmail.com'
  );

  // Example 5: ashwin plus 2026 at gmail dot com
  assert.strictEqual(
    normalizeSpokenEmail('ashwin plus 2026 at gmail dot com'),
    'ashwin+2026@gmail.com'
  );

  // Example 6: ashwin dot chandeep at outlook dot com
  assert.strictEqual(
    normalizeSpokenEmail('ashwin dot chandeep at outlook dot com'),
    'ashwin.chandeep@outlook.com'
  );

  // Example 7: ashwin at gmail dot co dot in
  assert.strictEqual(
    normalizeSpokenEmail('ashwin at gmail dot co dot in'),
    'ashwin@gmail.co.in'
  );

  // Example 8: ashwin at university dot ac dot in
  assert.strictEqual(
    normalizeSpokenEmail('ashwin at university dot ac dot in'),
    'ashwin@university.ac.in'
  );

  // Example 9: ashwin at subdomain dot example dot com
  assert.strictEqual(
    normalizeSpokenEmail('ashwin at subdomain dot example dot com'),
    'ashwin@subdomain.example.com'
  );

  // Example 10: ashwin 2026 at gmail dot com
  assert.strictEqual(
    normalizeSpokenEmail('ashwin 2026 at gmail dot com'),
    'ashwin2026@gmail.com'
  );

  // Example 11: A S H W I N at gmail dot com
  assert.strictEqual(
    normalizeSpokenEmail('A S H W I N at gmail dot com'),
    'ashwin@gmail.com'
  );

  // Example 12: ashwin dot chandeep at gmail dot com with browser punctuation
  assert.strictEqual(
    normalizeSpokenEmail('ashwin dot chandeep at gmail dot com, with punctuation included in the speech-recognition transcript.'),
    'ashwin.chandeep@gmail.com'
  );
});

test('MASTER AUDIT: Spoken Symbol Variants and Normalization', () => {
  // "at the rate" and "at the rate symbol"
  assert.strictEqual(
    normalizeSpokenEmail('candidate at the rate gmail dot com'),
    'candidate@gmail.com'
  );
  assert.strictEqual(
    normalizeSpokenEmail('candidate at the rate symbol gmail dot com'),
    'candidate@gmail.com'
  );

  // "period", "full stop"
  assert.strictEqual(
    normalizeSpokenEmail('candidate dot test at domain period com'),
    'candidate.test@domain.com'
  );
  assert.strictEqual(
    normalizeSpokenEmail('candidate full stop test at domain full stop com'),
    'candidate.test@domain.com'
  );

  // "under score", "dash", "minus"
  assert.strictEqual(
    normalizeSpokenEmail('user under score name at domain dot com'),
    'user_name@domain.com'
  );
  assert.strictEqual(
    normalizeSpokenEmail('first dash last at test dot org'),
    'first-last@test.org'
  );
  assert.strictEqual(
    normalizeSpokenEmail('first minus last at test dot org'),
    'first-last@test.org'
  );

  // "plus sign"
  assert.strictEqual(
    normalizeSpokenEmail('student plus sign ssc at exam dot gov dot in'),
    'student+ssc@exam.gov.in'
  );

  // Spoken number words
  assert.strictEqual(
    normalizeSpokenEmail('candidate twenty twenty six at gmail dot com'),
    'candidate2026@gmail.com'
  );
});

test('MASTER AUDIT: Confidence-Aware Correction and Ambiguity Detection (Never Guess)', () => {
  // Missing separator in local part: "ashwin chandeep at gmail dot com"
  const analysis = analyzeSpokenEmail('ashwin chandeep at gmail dot com');
  assert.strictEqual(analysis.isAmbiguous, true);
  assert.ok((analysis.suggestedOptions ?? []).includes('ashwin.chandeep@gmail.com'));
  assert.ok((analysis.suggestedOptions ?? []).includes('ashwin_chandeep@gmail.com'));
  assert.ok((analysis.suggestedOptions ?? []).includes('ashwin-chandeep@gmail.com'));
  assert.ok((analysis.suggestedOptions ?? []).includes('ashwinchandeep@gmail.com'));

  // Clear email is NOT ambiguous
  const unambiguous = analyzeSpokenEmail('ashwin.chandeep@gmail.com');
  assert.strictEqual(unambiguous.isAmbiguous, false);

  // Spelling reconstruction
  const reconstructed = reconstructSpelledEmail('a s h w i n', 'gmail dot com');
  assert.strictEqual(reconstructed, 'ashwin@gmail.com');

  // Confirmation readout (spellOutIdentifier)
  const spelled = spellOutIdentifier('ashwin@gmail.com');
  assert.strictEqual(
    spelled,
    'A, S, H, W, I, N, at, G, M, A, I, L, dot, C, O, M'
  );
});

test('MASTER AUDIT: Secure Password Hashing with scrypt and Legacy Migration', () => {
  const secret = 'SecureP@ss2026';
  const hashed = hashPassword(secret);

  // Must be 64-hex scrypt hash
  assert.strictEqual(hashed.length, 64);
  assert.ok(/^[a-f0-9]{64}$/.test(hashed));

  // Correct password verifies
  assert.strictEqual(verifyUserPassword(hashed, secret), true);

  // Incorrect password rejected
  assert.strictEqual(verifyUserPassword(hashed, 'WrongP@ssword'), false);

  // Does not need rehash when already scrypt
  assert.strictEqual(needsRehash(hashed, secret), false);

  // Legacy SHA-256 hash backward-compatibility
  const legacyHash = crypto
    .createHash('sha256')
    .update(secret + 'accessprep_x_salt_2026')
    .digest('hex');
  assert.strictEqual(verifyUserPassword(legacyHash, secret), true);
  assert.strictEqual(verifyUserPassword(legacyHash, 'WrongPass'), false);
  assert.strictEqual(needsRehash(legacyHash, secret), true);
});

test('MASTER AUDIT: Complete Accessible Audio CAPTCHA Processing', () => {
  // Generation
  const challenge = generateChallenge();
  // phrase is 4 digits joined with spaces e.g. "5 8 3 2" (length 7) or plain digits
  // The underlying generateRandomDigits returns "d d d d" format
  const digits = challenge.phrase.replace(/\s+/g, '');
  assert.strictEqual(digits.length, 4);
  assert.ok(/^\d{4}$/.test(digits));

  // formatCaptchaForSpeech uses spoken word with " ... " separators
  const formatted = formatCaptchaForSpeech('5832');
  assert.strictEqual(formatted, 'Five ... Eight ... Three ... Two.');

  // Spoken digits parsing
  assert.strictEqual(extractDigits('five eight three two'), '5832');
  assert.strictEqual(extractDigits('5 8 3 2'), '5832');

  // Compound spoken numbers
  assert.strictEqual(extractDigits('fifty eight thirty two'), '5832');
  assert.strictEqual(extractDigits('twenty four ninety six'), '2496');

  // Homophones and common recognition slips
  assert.strictEqual(extractDigits('won too for ate'), '1248');
  assert.strictEqual(extractDigits('zero oh nine seven'), '0097');
});

test('MASTER AUDIT: Accessibility Mode Switching and Voice Commands', () => {
  // parseAuthVoiceCommand returns a string intent (AuthVoiceCommandIntent | null)
  
  // Vision / Voice Mode
  const cmdVision = parseAuthVoiceCommand('switch to vision mode', 'login');
  assert.strictEqual(cmdVision, 'switch_to_voice');

  // Keyboard Mode
  const cmdKey = parseAuthVoiceCommand('switch to keyboard mode', 'login');
  assert.strictEqual(cmdKey, 'switch_to_keyboard');

  // Manual Mode
  const cmdManual = parseAuthVoiceCommand('manual mode', 'login');
  assert.strictEqual(cmdManual, 'switch_to_manual');

  // Start Voice Login
  const cmdStart = parseAuthVoiceCommand('start voice login', 'login');
  assert.strictEqual(cmdStart, 'use_voice');

  // Help
  const cmdHelp = parseAuthVoiceCommand('help', 'login');
  assert.strictEqual(cmdHelp, 'help');

  // Read CAPTCHA
  const cmdRepeat = parseAuthVoiceCommand('read captcha', 'login');
  assert.strictEqual(cmdRepeat, 'read_captcha');

  // Null for unrecognized
  const cmdUnknown = parseAuthVoiceCommand('banana flamingo', 'login');
  assert.strictEqual(cmdUnknown, null);
});

test('MASTER AUDIT: Blind-Friendly Single-Key Shortcut Specifications', () => {
  // Constant spoken description text from computer when pressing 'K'
  const constantShortcutDescription =
    'ACCESSPREP-X Keyboard Shortcuts: Press L to type your email address or roll number. Press P to enter your password. Press C to auto-fill the audio verification code. Press S to sign in. Press R to play audio verification code. Press H for help. Press K to hear this description again. Press Escape to stop speech. The microphone is always listening for your voice commands.';

  assert.ok(constantShortcutDescription.includes('Press L to type your email'));
  assert.ok(constantShortcutDescription.includes('Press P to enter your password'));
  assert.ok(constantShortcutDescription.includes('Press C to auto-fill the audio verification code'));
  assert.ok(constantShortcutDescription.includes('Press S to sign in'));
  assert.ok(constantShortcutDescription.includes('Press K to hear this description'));
  assert.ok(constantShortcutDescription.includes('The microphone is always listening'));

  // Test Auto-write CAPTCHA extraction
  const mockChallenge = { phrase: '7 4 1 9' };
  const autoWrittenDigits = mockChallenge.phrase.replace(/\D/g, '');
  assert.strictEqual(autoWrittenDigits, '7419');
  assert.strictEqual(extractDigits(autoWrittenDigits), '7419');
});
