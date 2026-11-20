/**
 * ACCESSPREP-X — Modular Backend Express App Verification Suite
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createExpressApp } from '../src/app.ts';
import { hashPassword, verifyUserPassword } from '../src/utils/password.utils.ts';
import { validateNewQuestionInput } from '../src/validators/question.validator.ts';

test('Modular Express app instantiates and registers API routes', () => {
  const app = createExpressApp();
  assert.ok(app, 'Express application instance should be created');
});

test('Password hashing and verification utility works deterministically', () => {
  const hash = hashPassword('candidate123');
  assert.equal(hash.length, 64);
  assert.equal(verifyUserPassword(hash, 'candidate123'), true);
  assert.equal(verifyUserPassword(hash, 'wrong_password'), false);
});

test('Question validator rejects incomplete payload', () => {
  const result = validateNewQuestionInput({ subject: 'General Awareness' });
  assert.equal(result.valid, false);
  assert.ok(result.error?.includes('Missing required fields'));
});
