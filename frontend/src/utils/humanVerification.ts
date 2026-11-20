function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export interface SpokenChallenge {
  challengeId: string;
  phrase: string;
  token?: string;
  expiresAt: number;
  attempts: number;
  attemptsUsed?: number;
  maxAttempts: number;
  verified: boolean;
  verificationToken?: string;
}

export const VERIFIED_SPOKEN_PHRASES = [
  'The apple is red.',
  'The sky is clear and blue.',
  'Education empowers every citizen.',
  'Practice makes learning easy.',
  'Reading books brings knowledge.',
  'Sunshine brightens the morning.',
  'A healthy mind thinks clearly.',
  'Continuous effort leads to success.',
  'Knowledge is our greatest strength.',
  'Kindness and patience solve problems.',
  'Honesty builds lasting trust.',
  'Daily revision sharpens memory.'
];

const SINGLE_DIGIT_MAP: Record<string, string> = {
  zero: '0',
  oh: '0',
  o: '0',
  one: '1',
  won: '1',
  two: '2',
  to: '2',
  too: '2',
  three: '3',
  tree: '3',
  free: '3',
  four: '4',
  for: '4',
  fore: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  ate: '8',
  nine: '9'
};

const TENS_WORD_MAP: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90
};

const TEENS_WORD_MAP: Record<string, string> = {
  ten: '10',
  eleven: '11',
  twelve: '12',
  thirteen: '13',
  fourteen: '14',
  fifteen: '15',
  sixteen: '16',
  seventeen: '17',
  eighteen: '18',
  nineteen: '19'
};

/**
 * Extracts sequence of numerical digits from text, converting spoken number words,
 * homophones, compound numbers (e.g. "fifty eight thirty two" -> "5832"),
 * and standard numeric characters to digits.
 */
export function extractDigits(text: string): string {
  if (!text) return '';
  const clean = normalizePhrase(text);
  const words = clean.split(' ').filter(Boolean);
  let result = '';

  for (let i = 0; i < words.length; i++) {
    const w = words[i];

    // Check compound tens (e.g., "fifty" + "eight" -> 58)
    if (TENS_WORD_MAP[w] !== undefined) {
      const tensVal = TENS_WORD_MAP[w];
      const nextWord = words[i + 1];
      if (nextWord && SINGLE_DIGIT_MAP[nextWord] && SINGLE_DIGIT_MAP[nextWord] !== '0') {
        const unitsVal = parseInt(SINGLE_DIGIT_MAP[nextWord], 10);
        result += String(tensVal + unitsVal);
        i++; // skip next word
      } else {
        result += String(tensVal);
      }
      continue;
    }

    if (TEENS_WORD_MAP[w]) {
      result += TEENS_WORD_MAP[w];
      continue;
    }

    if (SINGLE_DIGIT_MAP[w]) {
      result += SINGLE_DIGIT_MAP[w];
      continue;
    }

    // Direct numeric digits
    const digitsOnly = w.replace(/\D/g, '');
    if (digitsOnly) {
      result += digitsOnly;
    }
  }

  return result;
}

/**
 * Generates a 4-digit cryptographically random numeric audio CAPTCHA string.
 */
export function generateRandomDigits(): string {
  const digits: number[] = [];
  const randomBytes = new Uint8Array(4);
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(randomBytes);
    for (let i = 0; i < 4; i++) {
      digits.push(randomBytes[i] % 10);
    }
  } else {
    for (let i = 0; i < 4; i++) {
      digits.push(Math.floor(Math.random() * 10));
    }
  }
  return digits.join(' ');
}

// In-memory challenge store (cleaned up periodically)
const challengeStore = new Map<string, SpokenChallenge>();
const verifiedTokenStore = new Map<string, { expiresAt: number; used: boolean }>();

// Clean expired tokens every 5 minutes
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [id, ch] of challengeStore.entries()) {
    if (ch.expiresAt < now) {
      challengeStore.delete(id);
    }
  }
  for (const [token, data] of verifiedTokenStore.entries()) {
    if (data.expiresAt < now || data.used) {
      verifiedTokenStore.delete(token);
    }
  }
}, 5 * 60 * 1000);
if (typeof cleanupTimer.unref === 'function') {
  cleanupTimer.unref();
}

export function normalizePhrase(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const normalizeVerificationPhrase = normalizePhrase;

/**
 * Calculates word similarity between candidate response and challenge phrase.
 * Returns ratio between 0 and 1.
 */
export function calculateSimilarity(candidate: string, target: string): number {
  const normCandidate = normalizePhrase(candidate);
  const normTarget = normalizePhrase(target);

  if (normCandidate === normTarget) return 1.0;
  if (!normCandidate || !normTarget) return 0.0;

  // 1. Numeric Audio CAPTCHA evaluation (digits and spoken number words)
  const targetDigits = extractDigits(target);
  const candidateDigits = extractDigits(candidate);

  if (targetDigits.length >= 2) {
    if (candidateDigits.length === 0) return 0.0;
    // For numeric audio CAPTCHA, all digits must match exactly
    return candidateDigits === targetDigits ? 1.0 : 0.0;
  }

  // 2. Text phrase evaluation (F1 score)
  const candidateWords = normCandidate.split(' ');
  const targetWords = normTarget.split(' ');

  // Exact word matches count
  let matchCount = 0;
  const targetCopy = [...targetWords];

  for (const word of candidateWords) {
    const idx = targetCopy.indexOf(word);
    if (idx !== -1) {
      matchCount++;
      targetCopy.splice(idx, 1);
    }
  }

  const recall = matchCount / targetWords.length;
  const precision = matchCount / candidateWords.length;

  // F1 score
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

export const calculateWordSimilarity = calculateSimilarity;

export function generateHumanVerificationChallenge(
  _identifier?: string,
  ttlMs = 3 * 60 * 1000
): SpokenChallenge {
  const challengeId = `ch_${Date.now()}_${randomHex(8)}`;
  const phrase = generateRandomDigits();
  const expiresAt = Date.now() + ttlMs;

  const challenge: SpokenChallenge = {
    challengeId,
    phrase,
    token: `tok_${randomHex(8)}`,
    expiresAt,
    attempts: 0,
    attemptsUsed: 0,
    maxAttempts: 5,
    verified: false
  };

  challengeStore.set(challengeId, challenge);
  return challenge;
}

export function generateChallenge(ttlMs = 3 * 60 * 1000): {
  challengeId: string;
  phrase: string;
  expiresAt: number;
} {
  const c = generateHumanVerificationChallenge('server', ttlMs);
  return {
    challengeId: c.challengeId,
    phrase: c.phrase,
    expiresAt: c.expiresAt
  };
}

export function verifyChallengeResponse(
  challengeId: string,
  candidatePhrase: string
): {
  success: boolean;
  attemptsRemaining?: number;
  verificationToken?: string;
  error?: string;
} {
  const challenge = challengeStore.get(challengeId);

  if (!challenge) {
    return {
      success: false,
      error: 'Challenge not found or has expired. Please request a new verification challenge.',
      attemptsRemaining: 0
    };
  }

  if (Date.now() > challenge.expiresAt) {
    return {
      success: false,
      error: 'Verification challenge has expired. Please request a new verification challenge.',
      attemptsRemaining: Math.max(0, challenge.maxAttempts - challenge.attempts)
    };
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    return {
      success: false,
      error: 'Maximum attempts exceeded. Please request a new challenge.',
      attemptsRemaining: 0
    };
  }

  challenge.attempts++;
  challenge.attemptsUsed = challenge.attempts;

  const similarity = calculateSimilarity(candidatePhrase, challenge.phrase);
  const isMatch = similarity >= 0.75; // Allows minor pronunciation/STT homophone variations

  const attemptsRemaining = Math.max(0, challenge.maxAttempts - challenge.attempts);

  if (!isMatch) {
    return {
      success: false,
      attemptsRemaining,
      error: attemptsRemaining <= 0
        ? 'Maximum attempts exceeded. Please request a new challenge.'
        : `Spoken phrase did not match. Please listen again and repeat clearly (${attemptsRemaining} attempt${attemptsRemaining > 1 ? 's' : ''} remaining), or use the keyboard alternative.`
    };
  }

  // Verification passed
  const verificationToken = `vt_${Date.now()}_${randomHex(16)}`;
  challenge.verified = true;
  challenge.verificationToken = verificationToken;

  verifiedTokenStore.set(verificationToken, {
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    used: false
  });

  return {
    success: true,
    verificationToken,
    attemptsRemaining
  };
}

export function verifyChallenge(
  challengeId: string,
  candidatePhrase: string
): {
  success: boolean;
  error?: string;
  verificationToken?: string;
} {
  return verifyChallengeResponse(challengeId, candidatePhrase);
}

export function validateVerificationToken(token?: string): { valid: boolean; error?: string } {
  if (!token || typeof token !== 'string') return { valid: false, error: 'Token missing' };
  const record = verifiedTokenStore.get(token);
  if (!record) return { valid: false, error: 'Token not found' };
  if (record.used) return { valid: false, error: 'Token already used' };
  if (Date.now() > record.expiresAt) {
    verifiedTokenStore.delete(token);
    return { valid: false, error: 'Token expired' };
  }
  return { valid: true };
}

export function consumeVerificationToken(token?: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const record = verifiedTokenStore.get(token);
  if (!record || record.used || Date.now() > record.expiresAt) {
    return false;
  }
  record.used = true;
  return true;
}
