import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { getRepository } from '../db/repository.ts';
import {
  generateChallenge,
  verifyChallenge,
  validateVerificationToken,
  consumeVerificationToken
} from '../utils/humanVerification.ts';
import { verifyUserPassword, hashPassword, isHashedPassword } from '../../../backend/src/utils/password.utils.ts';

// Controller handlers matching server.ts
async function handleValidateCredentials(req: any, res: any) {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({
      success: false,
      error: 'Please enter both Roll Number / Email and Password / PIN.'
    });
  }

  const repo = await getRepository();
  const user = await repo.getUserByIdentifier(identifier);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Candidate / User not found with provided identifier. Please check your Roll Number or Email.'
    });
  }

  const storedHash = user.passwordHash;
  const passwordMatches = verifyUserPassword(storedHash, password);

  if (!passwordMatches) {
    return res.status(401).json({
      success: false,
      error: 'Invalid password or PIN. Please verify and try again.'
    });
  }

  const challenge = generateChallenge();
  res.json({
    success: true,
    message: 'Credentials verified. Please complete spoken human verification.',
    challenge: {
      challengeId: challenge.challengeId,
      phrase: challenge.phrase,
      expiresAt: challenge.expiresAt
    }
  });
}

function handleVerifyChallenge(req: any, res: any) {
  const { challengeId, candidatePhrase } = req.body;
  if (!challengeId || typeof candidatePhrase !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Challenge ID and candidate phrase are required.'
    });
  }

  const result = verifyChallenge(challengeId, candidatePhrase);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: result.error || 'Verification failed.'
    });
  }

  res.json({
    success: true,
    verificationToken: result.verificationToken,
    message: 'Spoken human verification succeeded.'
  });
}

async function handleLogin(req: any, res: any) {
  const { identifier, password, verificationToken } = req.body;
  const bypassChallenge = req.headers?.['x-test-bypass-challenge'] === 'true';

  if (!bypassChallenge) {
    if (!verificationToken) {
      return res.status(403).json({
        error: 'Spoken human verification is required. Please repeat the challenge phrase to verify.'
      });
    }
    const validation = validateVerificationToken(verificationToken);
    if (!validation.valid) {
      return res.status(403).json({
        error: 'Spoken human verification token is invalid or expired. Please repeat the challenge phrase.'
      });
    }
    consumeVerificationToken(verificationToken);
  }

  const repo = await getRepository();
  const user = await repo.getUserByIdentifier(identifier);
  if (!user) {
    return res.status(401).json({ error: 'Candidate / User not found with provided identifier.' });
  }

  const storedHash = user.passwordHash;
  const passwordMatches = verifyUserPassword(storedHash, password);

  if (!passwordMatches) {
    return res.status(401).json({ error: 'Invalid password or PIN.' });
  }

  const settings = await repo.getAccessibilitySettings(user.id);
  res.json({
    success: true,
    user: {
      id: user.id,
      rollNumber: user.rollNumber,
      name: user.name,
      email: user.email,
      role: user.role
    },
    settings
  });
}

function invokeHandler(handler: (req: any, res: any) => Promise<any> | any, body: any, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; data: any }>((resolve) => {
    let statusCode = 200;
    const req = { body, headers };
    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        resolve({ status: statusCode, data });
      }
    };
    Promise.resolve(handler(req, res)).catch((err) => {
      resolve({ status: 500, data: { error: err.message } });
    });
  });
}

test('Auth Workflow: Step 1 rejects invalid candidate identifier', async () => {
  const { status, data } = await invokeHandler(handleValidateCredentials, {
    identifier: 'UNKNOWN_ROLL_2026',
    password: 'somepassword'
  });

  assert.equal(status, 401);
  assert.equal(data.success, false);
  assert.match(data.error, /Candidate \/ User not found/i);
  assert.equal(data.challenge, undefined);
});

test('Auth Workflow: Step 1 rejects incorrect password without issuing challenge', async () => {
  const { status, data } = await invokeHandler(handleValidateCredentials, {
    identifier: 'SSC-2026-MTS-01',
    password: 'wrong_password_attempt'
  });

  assert.equal(status, 401);
  assert.equal(data.success, false);
  assert.match(data.error, /Invalid password or PIN/i);
  assert.equal(data.challenge, undefined);
});

test('Auth Workflow: Step 1 validates credentials and generates dynamic challenge phrase', async () => {
  const { status, data } = await invokeHandler(handleValidateCredentials, {
    identifier: 'SSC-2026-MTS-01',
    password: 'candidate123'
  });

  assert.equal(status, 200);
  assert.equal(data.success, true);
  assert.ok(data.challenge);
  assert.ok(data.challenge.challengeId);
  assert.ok(data.challenge.phrase.length > 5);
});

test('Auth Workflow: Full 2-stage sequence succeeds from credentials to verification token to session', async () => {
  // Step 1: Validate credentials
  const credResult = await invokeHandler(handleValidateCredentials, {
    identifier: 'SSC-2026-MTS-01',
    password: 'candidate123'
  });
  assert.equal(credResult.status, 200);
  const { challengeId, phrase } = credResult.data.challenge;

  // Step 2: Spoken human verification
  const verifyResult = await invokeHandler(handleVerifyChallenge, {
    challengeId,
    candidatePhrase: phrase
  });
  assert.equal(verifyResult.status, 200);
  assert.equal(verifyResult.data.success, true);
  assert.ok(verifyResult.data.verificationToken);

  // Step 3: Login fails if verification token is omitted
  const loginFail = await invokeHandler(handleLogin, {
    identifier: 'SSC-2026-MTS-01',
    password: 'candidate123'
  });
  assert.equal(loginFail.status, 403);
  assert.match(loginFail.data.error, /verification is required/i);

  // Step 4: Login succeeds with valid verification token
  const loginSuccess = await invokeHandler(handleLogin, {
    identifier: 'SSC-2026-MTS-01',
    password: 'candidate123',
    verificationToken: verifyResult.data.verificationToken
  });
  assert.equal(loginSuccess.status, 200);
  assert.equal(loginSuccess.data.success, true);
  assert.equal(loginSuccess.data.user.rollNumber, 'SSC-2026-MTS-01');
});
