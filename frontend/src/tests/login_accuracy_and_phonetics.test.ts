import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSpokenName,
  normalizeSpokenEmail,
  spellOutIdentifier,
  validateLoginIdentifier
} from '../utils/authVoiceUtils.ts';

test('Phonetic Name Normalization: Corrects speech recognition distortions to exact Indian proper names', () => {
  // Ashwin variants
  assert.equal(normalizeSpokenName('ash wind'), 'Ashwin');
  assert.equal(normalizeSpokenName('ash win'), 'Ashwin');
  assert.equal(normalizeSpokenName('aswin'), 'Ashwin');
  assert.equal(normalizeSpokenName('ashwan'), 'Ashwin');
  assert.equal(normalizeSpokenName('ash wine'), 'Ashwin');
  assert.equal(normalizeSpokenName('ashwin'), 'Ashwin');

  // Conversational prefix stripping
  assert.equal(normalizeSpokenName('my name is ash wind'), 'Ashwin');
  assert.equal(normalizeSpokenName('i am ashwin'), 'Ashwin');
  assert.equal(normalizeSpokenName('candidate name is ash win'), 'Ashwin');

  // Multi-word names with surnames
  assert.equal(normalizeSpokenName('ash wind sharma'), 'Ashwin Sharma');
  assert.equal(normalizeSpokenName('ash win kumar'), 'Ashwin Kumar');
  assert.equal(normalizeSpokenName('ra vee verma'), 'Ravi Verma');
  assert.equal(normalizeSpokenName('pree ya patel'), 'Priya Patel');

  // Other common Indian names
  assert.equal(normalizeSpokenName('ra vee'), 'Ravi');
  assert.equal(normalizeSpokenName('robbie'), 'Ravi');
  assert.equal(normalizeSpokenName('pree ya'), 'Priya');
  assert.equal(normalizeSpokenName('rah ul'), 'Rahul');
  assert.equal(normalizeSpokenName('am it'), 'Amit');
  assert.equal(normalizeSpokenName('san jay'), 'Sanjay');
  assert.equal(normalizeSpokenName('soo raj'), 'Suraj');
  assert.equal(normalizeSpokenName('an kit'), 'Ankit');
  assert.equal(normalizeSpokenName('ad it ya'), 'Aditya');
  assert.equal(normalizeSpokenName('ar jun'), 'Arjun');
  assert.equal(normalizeSpokenName('ro hit'), 'Rohit');
  assert.equal(normalizeSpokenName('ka vya'), 'Kavya');
  assert.equal(normalizeSpokenName('poo ja'), 'Pooja');
  assert.equal(normalizeSpokenName('di vya'), 'Divya');
  assert.equal(normalizeSpokenName('vi nay'), 'Vinay');
  assert.equal(normalizeSpokenName('su neel'), 'Sunil');
  assert.equal(normalizeSpokenName('mah esh'), 'Mahesh');
  assert.equal(normalizeSpokenName('su resh'), 'Suresh');
  assert.equal(normalizeSpokenName('la kshmi'), 'Lakshmi');
  assert.equal(normalizeSpokenName('aa rav'), 'Aarav');
});

test('Spoken Email & Identifier Normalization: Handles proper names in emails and standalone input', () => {
  // Spoken names in email addresses
  assert.equal(
    normalizeSpokenEmail('ash wind at gmail dot com'),
    'ashwin@gmail.com'
  );
  assert.equal(
    normalizeSpokenEmail('ash win at gmail dot com'),
    'ashwin@gmail.com'
  );
  assert.equal(
    normalizeSpokenEmail('ashwin at accessprep dot nic dot in'),
    'ashwin@accessprep.nic.in'
  );

  // Standalone candidate names as login identifiers
  assert.equal(normalizeSpokenEmail('ash wind'), 'Ashwin');
  assert.equal(normalizeSpokenEmail('ash win'), 'Ashwin');
  assert.equal(normalizeSpokenEmail('Ashwin'), 'Ashwin');
  assert.equal(normalizeSpokenEmail('my name is ash wind'), 'Ashwin');
});

test('Identifier Spell-Out: Accurately spells out each letter and symbol for blind candidates', () => {
  assert.equal(spellOutIdentifier('Ashwin'), 'A, S, H, W, I, N');
  assert.equal(spellOutIdentifier('Ravi'), 'R, A, V, I');
  assert.equal(
    spellOutIdentifier('ashwin@gmail.com'),
    'A, S, H, W, I, N, at, G, M, A, I, L, dot, C, O, M'
  );
  assert.equal(
    spellOutIdentifier('SSC-2026-MTS-01'),
    'S, S, C, dash, 2, 0, 2, 6, dash, M, T, S, dash, 0, 1'
  );
  assert.equal(
    spellOutIdentifier('user_name+01'),
    'U, S, E, R, underscore, N, A, M, E, plus, 0, 1'
  );
});

test('Login Identifier Validation: Supports candidate names, roll numbers, and emails', () => {
  assert.equal(validateLoginIdentifier('Ashwin').valid, true);
  assert.equal(validateLoginIdentifier('Ashwin Sharma').valid, true);
  assert.equal(validateLoginIdentifier('ashwin@gmail.com').valid, true);
  assert.equal(validateLoginIdentifier('SSC-2026-MTS-01').valid, true);
  assert.equal(validateLoginIdentifier('').valid, false);
  assert.equal(validateLoginIdentifier('   ').valid, false);
});
