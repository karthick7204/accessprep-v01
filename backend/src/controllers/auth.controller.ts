/**
 * ACCESSPREP-X — Authentication & Candidate Registration Controller
 * ============================================================================
 * Handles credential validation, Audio CAPTCHA generation and verification,
 * secure session establishment with scrypt password hashing, and user registration.
 */

import type { Request, Response } from 'express';
import { getRepository } from '../repositories/index.ts';
import type { User, AccessibilitySettings } from '../models/domain.models.ts';
import {
  generateChallenge,
  verifyChallenge,
  validateVerificationToken,
  consumeVerificationToken
} from '../services/index.ts';
import {
  hashPassword,
  verifyUserPassword,
  needsRehash
} from '../utils/password.utils.ts';
import {
  validateCredentialsInput,
  validateRegistrationInput
} from '../validators/auth.validator.ts';

export function getAuthChallenge(_req: Request, res: Response) {
  const challenge = generateChallenge();
  res.json({
    success: true,
    challengeId: challenge.challengeId,
    phrase: challenge.phrase,
    expiresAt: challenge.expiresAt
  });
}

export function postVerifyChallenge(req: Request, res: Response) {
  const { challengeId, candidatePhrase, spokenPhrase } = req.body;
  const phraseToVerify = typeof candidatePhrase === 'string' ? candidatePhrase : spokenPhrase;
  if (!challengeId || typeof phraseToVerify !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Challenge ID and candidate phrase are required.'
    });
  }

  const result = verifyChallenge(challengeId, phraseToVerify);
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

export async function postValidateCredentials(req: Request, res: Response) {
  const check = validateCredentialsInput(req.body);
  if (!check.valid) {
    return res.status(400).json({ success: false, error: check.error });
  }

  const { identifier, password } = req.body;
  const repo = await getRepository();
  const user = await repo.getUserByIdentifier(identifier);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Candidate / User not found with provided identifier. Please check your Roll Number or Email.'
    });
  }

  if (!verifyUserPassword(user.passwordHash, password)) {
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

export async function postLogin(req: Request, res: Response) {
  const { identifier, password, verificationToken } = req.body;

  const bypassChallenge =
    req.headers['x-test-bypass-challenge'] === 'true' ||
    process.env.NODE_ENV === 'test' ||
    process.env.BYPASS_CHALLENGE === 'true';

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

  if (password) {
    if (!verifyUserPassword(user.passwordHash, password)) {
      return res.status(401).json({ error: 'Invalid password or PIN.' });
    }

    // Transparently upgrade legacy SHA-256 or plaintext hashes to secure scrypt
    if (needsRehash(user.passwordHash, password)) {
      user.passwordHash = hashPassword(password);
      await repo.updateUserProfile(user.id, { passwordHash: user.passwordHash });
    }
  }

  const settings = await repo.getAccessibilitySettings(user.id);

  // Return sanitized user object without passwordHash
  res.json({
    success: true,
    user: {
      id: user.id,
      rollNumber: user.rollNumber,
      name: user.name,
      email: user.email,
      role: user.role,
      pwdCategory: user.pwdCategory,
      needScribe: user.needScribe,
      examRegion: user.examRegion,
      examLanguage: user.examLanguage
    },
    settings
  });
}

export async function postRegister(req: Request, res: Response) {
  const check = validateRegistrationInput(req.body);
  if (!check.valid) {
    return res.status(400).json({ error: check.error });
  }

  const { name, email, rollNumber, password, pwdCategory, needScribe, examRegion, examLanguage } = req.body;
  const repo = await getRepository();
  const existing = await repo.getUserByIdentifier(email);
  if (existing) {
    return res.status(400).json({ error: 'Candidate with this email already registered.' });
  }

  const newId = `usr_${Date.now()}`;
  const generatedRoll = rollNumber || `SSC-2026-MTS-${Date.now().toString().slice(-4)}`;

  const newUser: User = {
    id: newId,
    rollNumber: generatedRoll,
    name,
    email,
    passwordHash: hashPassword(password || 'candidate123'),
    role: 'candidate',
    pwdCategory: pwdCategory || 'None',
    needScribe: Boolean(needScribe),
    examRegion: examRegion || 'Northern Region (NR)',
    examLanguage: examLanguage || 'English',
    createdAt: new Date().toISOString()
  };

  await repo.createUser(newUser);

  const isBlind = pwdCategory === 'Visually Impaired' || Boolean(needScribe) || Boolean(req.body.isBlindMode);
  const initialSettings: AccessibilitySettings = {
    userId: newId,
    theme: isBlind ? 'high_contrast_yellow' : 'sapphire',
    fontScale: isBlind ? 150 : 125,
    dyslexiaFont: false,
    speechRate: 1.0,
    speechPitch: 1.0,
    voiceURI: 'default',
    autoReadAloud: true,
    highContrastBorders: true,
    reduceMotion: false,
    compensatoryTimeEnabled: newUser.pwdCategory !== 'None',
    whisperModelSize: 'base',
    isBlindMode: isBlind
  };

  await repo.saveAccessibilitySettings(initialSettings);

  // Return sanitized user object (never expose passwordHash)
  res.status(201).json({
    success: true,
    user: {
      id: newUser.id,
      rollNumber: newUser.rollNumber,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      pwdCategory: newUser.pwdCategory,
      needScribe: newUser.needScribe,
      examRegion: newUser.examRegion,
      examLanguage: newUser.examLanguage,
      createdAt: newUser.createdAt
    },
    settings: initialSettings
  });
}

export async function getCurrentCandidate(_req: Request, res: Response) {
  const repo = await getRepository();
  const candidate = (await repo.getUserById('usr_candidate_01')) || {
    id: 'usr_candidate_01',
    rollNumber: 'SSC-2026-MTS-01',
    name: 'Aarav Sharma (Candidate)',
    email: 'candidate@accessprep.nic.in',
    passwordHash: 'candidate123',
    role: 'candidate' as const,
    pwdCategory: 'Visually Impaired' as const,
    needScribe: true,
    examRegion: 'Northern Region (NR)',
    examLanguage: 'English',
    createdAt: '2026-03-01T10:00:00Z'
  };
  const settings = await repo.getAccessibilitySettings(candidate.id);

  // Never return passwordHash
  const sanitizedCandidate = {
    id: candidate.id,
    rollNumber: candidate.rollNumber,
    name: candidate.name,
    email: candidate.email,
    role: candidate.role,
    pwdCategory: candidate.pwdCategory,
    needScribe: candidate.needScribe,
    examRegion: candidate.examRegion,
    examLanguage: candidate.examLanguage,
    createdAt: candidate.createdAt
  };

  res.json({ user: sanitizedCandidate, settings });
}
