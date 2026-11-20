/**
 * ACCESSPREP-X — Authentication Voice & Validation Utilities
 * ============================================================================
 * Pure utility functions for spoken email normalization, confidence-aware
 * ambiguity detection, digit-by-digit Audio CAPTCHA speech formatting,
 * context-aware voice command detection, and accessible credential validation.
 */

import { extractDigits } from './humanVerification.ts';

const DIGIT_SPOKEN_WORD: Record<string, string> = {
  '0': 'Zero',
  '1': 'One',
  '2': 'Two',
  '3': 'Three',
  '4': 'Four',
  '5': 'Five',
  '6': 'Six',
  '7': 'Seven',
  '8': 'Eight',
  '9': 'Nine'
};

const SPOKEN_NUMBER_WORDS: Record<string, string> = {
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
 * Phonetic dictionary mapping speech-recognition distortions to correctly
 * spelled Indian proper names and surnames.
 */
export const PHONETIC_NAME_MAP: Record<string, string> = {
  'ash wind': 'Ashwin',
  'ash win': 'Ashwin',
  'aswin': 'Ashwin',
  'ashwan': 'Ashwin',
  'ashwinn': 'Ashwin',
  'ash wine': 'Ashwin',
  'ash wing': 'Ashwin',
  'as win': 'Ashwin',
  'ashwin': 'Ashwin',
  'ra vee': 'Ravi',
  'robbie': 'Ravi',
  'ravii': 'Ravi',
  'ravi': 'Ravi',
  'pree ya': 'Priya',
  'preya': 'Priya',
  'priya': 'Priya',
  'rah ul': 'Rahul',
  'raahul': 'Rahul',
  'rahul': 'Rahul',
  'am it': 'Amit',
  'ahmit': 'Amit',
  'amit': 'Amit',
  'soo raj': 'Suraj',
  'su raj': 'Suraj',
  'suraj': 'Suraj',
  'san jay': 'Sanjay',
  'sun jay': 'Sanjay',
  'sanjay': 'Sanjay',
  'an kit': 'Ankit',
  'ankit': 'Ankit',
  'ad it ya': 'Aditya',
  'aditya': 'Aditya',
  'ar jun': 'Arjun',
  'arjun': 'Arjun',
  'ro hit': 'Rohit',
  'rohit': 'Rohit',
  'ni tin': 'Nitin',
  'nitin': 'Nitin',
  'ka vya': 'Kavya',
  'kavya': 'Kavya',
  'poo ja': 'Pooja',
  'puja': 'Pooja',
  'pooja': 'Pooja',
  'di vya': 'Divya',
  'divya': 'Divya',
  'mee na': 'Meena',
  'meena': 'Meena',
  'vi nay': 'Vinay',
  'vinay': 'Vinay',
  'su neel': 'Sunil',
  'suneel': 'Sunil',
  'sunil': 'Sunil',
  'mah esh': 'Mahesh',
  'mahesh': 'Mahesh',
  'su resh': 'Suresh',
  'suresh': 'Suresh',
  'ra mesh': 'Ramesh',
  'ramesh': 'Ramesh',
  'na resh': 'Naresh',
  'naresh': 'Naresh',
  'mu kesh': 'Mukesh',
  'mukesh': 'Mukesh',
  'la kshmi': 'Lakshmi',
  'laxmi': 'Lakshmi',
  'lakshmi': 'Lakshmi',
  'aa rav': 'Aarav',
  'a rav': 'Aarav',
  'aaraav': 'Aarav',
  'aarav': 'Aarav',
  'shar ma': 'Sharma',
  'sharma': 'Sharma',
  'ver ma': 'Verma',
  'verma': 'Verma',
  'pa tel': 'Patel',
  'patel': 'Patel',
  'ku mar': 'Kumar',
  'kumar': 'Kumar',
  'singh': 'Singh',
  'gup ta': 'Gupta',
  'gupta': 'Gupta'
};

/**
 * Normalizes spoken proper names, applying phonetic correction rules
 * for Indian names that are frequently distorted by standard speech recognition.
 */
export function normalizeSpokenName(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  let text = raw
    .trim()
    .toLowerCase()
    .replace(/^(my name is|i am|name is|candidate name is|this is|enter name|it is)\s+/i, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return '';

  // Direct full-phrase phonetic match
  if (PHONETIC_NAME_MAP[text]) {
    return PHONETIC_NAME_MAP[text];
  }

  // Multi-word phrase matching (e.g. "ash wind sharma" -> "Ashwin Sharma")
  let processed = text;
  for (const [misheard, corrected] of Object.entries(PHONETIC_NAME_MAP)) {
    const regex = new RegExp(`\\b${misheard}\\b`, 'gi');
    if (regex.test(processed)) {
      processed = processed.replace(regex, corrected);
    }
  }

  // Capitalize each token properly
  return processed
    .split(/\s+/)
    .map((word) => {
      if (!word) return '';
      if (word[0] === word[0].toUpperCase() && word.slice(1) === word.slice(1).toLowerCase()) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Spells out an identifier (email, roll number, or name) letter-by-letter
 * and symbol-by-symbol for auditory confirmation by visually impaired candidates.
 * Example: "Ashwin" -> "A, S, H, W, I, N"
 * Example: "ashwin@gmail.com" -> "A, S, H, W, I, N, at, G, M, A, I, L, dot, C, O, M"
 */
export function spellOutIdentifier(identifier: string): string {
  if (!identifier) return '';
  const chars = identifier.trim().split('');
  return chars
    .map((char) => {
      if (char === '@') return 'at';
      if (char === '.') return 'dot';
      if (char === '-') return 'dash';
      if (char === '_') return 'underscore';
      if (char === '+') return 'plus';
      if (char === ' ') return 'space';
      return char.toUpperCase();
    })
    .join(', ');
}

/**
 * Formats an Audio CAPTCHA code into individual spoken digits separated by pauses.
 * Example: "5832" -> "Five ... Eight ... Three ... Two."
 */
export function formatCaptchaForSpeech(phrase: string): string {
  if (!phrase) return '';
  const digits = extractDigits(phrase);
  if (!digits) return phrase;

  const words = digits
    .split('')
    .map((d) => DIGIT_SPOKEN_WORD[d] || d);

  return `${words.join(' ... ')}.`;
}

/**
 * Normalizes spoken email or candidate roll number input into a clean identifier.
 * Comprehensively supports:
 *  - Spoken symbols: dot, period, full stop, point, at, at the rate, at the rate symbol,
 *    at sign, at symbol, underscore, under score, hyphen, dash, minus, plus, plus sign.
 *  - Spaced individual letters (e.g., "A S H W I N at gmail dot com" -> "ashwin@gmail.com").
 *  - Spoken digits and number words (e.g., "ashwin 2026 at gmail dot com" -> "ashwin2026@gmail.com").
 *  - Multi-part domains (e.g., "university dot ac dot in" -> "university.ac.in").
 *  - Subdomains (e.g., "subdomain dot example dot com" -> "subdomain.example.com").
 *  - Automatic stripping of speech recognition trailing punctuation (. , ! ?).
 */
export function normalizeSpokenEmail(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  let text = raw.trim().toLowerCase();

  // Strip introductory conversational phrases
  text = text
    .replace(/^(my email address is|my email is|email is|email address|it is|this is|enter email|enter|type|my identifier is|my name is)\s+/i, '')
    .trim();

  // Strip trailing sentence punctuation from speech recognition engines
  text = text.replace(/[.,!?;:]+$/, '').trim();

  // Strip inline speech-recognition pauses or comma separators
  text = text.replace(/[,;!?"'()[\]{}]/g, ' ');

  // Check if user is speaking an SSC roll number (e.g. "ssc 2026 mts 01")
  const rollCheck = text.replace(/[\s\-_]+/g, '');
  const rollMatch = rollCheck.match(/^ssc(\d{4})mts(\d{1,4})$/i);
  if (rollMatch) {
    return `SSC-${rollMatch[1]}-MTS-${rollMatch[2].padStart(2, '0')}`;
  }

  // If input contains no email markers (@, at, dot, period), check if it's a spoken name
  const hasEmailMarker = /\b(at|dot|period|point|full stop|@|\.)\b/i.test(text);
  if (!hasEmailMarker) {
    const candidateName = normalizeSpokenName(text);
    if (candidateName) {
      return candidateName;
    }
  }

  // Pre-process phonetic names before email '@' (e.g. "ash wind at gmail dot com" -> "ashwin at gmail dot com")
  for (const [misheard, corrected] of Object.entries(PHONETIC_NAME_MAP)) {
    const rx = new RegExp(`\\b${misheard}\\b`, 'gi');
    if (rx.test(text)) {
      text = text.replace(rx, corrected.toLowerCase().replace(/\s+/g, ''));
    }
  }

  // 1. Normalize multi-word symbol phrases first (before single-word tokens)
  text = text
    .replace(/\bat the rate of\b/g, ' @ ')
    .replace(/\bat the rate symbol\b/g, ' @ ')
    .replace(/\bat the rate\b/g, ' @ ')
    .replace(/\bat symbol\b/g, ' @ ')
    .replace(/\bat sign\b/g, ' @ ')
    .replace(/\bplus sign\b/g, ' + ')
    .replace(/\bunder score\b/g, ' _ ')
    .replace(/\bfull stop\b/g, ' . ')
    .replace(/\bdot co dot in\b/g, ' .co.in ')
    .replace(/\bdot nic dot in\b/g, ' .nic.in ')
    .replace(/\bdot gov dot in\b/g, ' .gov.in ')
    .replace(/\bdot ac dot in\b/g, ' .ac.in ')
    .replace(/\bdot org dot in\b/g, ' .org.in ')
    .replace(/\bdot com\b/g, ' .com ')
    .replace(/\bdot in\b/g, ' .in ')
    .replace(/\bdot org\b/g, ' .org ')
    .replace(/\bdot net\b/g, ' .net ')
    .replace(/\bdot edu\b/g, ' .edu ')
    .replace(/\bdot gov\b/g, ' .gov ')
    .replace(/\bunderscore\b/g, ' _ ')
    .replace(/\bhyphen\b/g, ' - ')
    .replace(/\bdash\b/g, ' - ')
    .replace(/\bminus\b/g, ' - ')
    .replace(/\bplus\b/g, ' + ')
    .replace(/\b(?:dot|period|point)\b/g, ' . ')
    .replace(/\bat\b/g, ' @ ');

  // 2. Tokenize and convert spoken numbers and combine spaced single letters
  const tokens = text.split(/\s+/).filter(Boolean);

  // Identify where '@' is located
  const atIdx = tokens.indexOf('@');
  if (atIdx === -1) {
    // If no '@', check if the user spoke symbols or numbers
    const processedTokens = tokens.map((token) => SPOKEN_NUMBER_WORDS[token] ?? token);
    return processedTokens.join('').replace(/[^a-z0-9@._+\-]/g, '').replace(/[.]+$/, '');
  }

  const localTokens = tokens.slice(0, atIdx);
  const domainTokens = tokens.slice(atIdx + 1);

  // Process local part:
  // - Convert number words ("2026" or "two zero two six" or "twenty twenty six")
  // - Join consecutive single letters (e.g. ['a', 's', 'h', 'w', 'i', 'n'] -> "ashwin")
  let localPart = '';
  for (let i = 0; i < localTokens.length; i++) {
    const tok = localTokens[i];

    // Compound tens (e.g. "twenty" + "six" -> 26 or "twenty" -> 20)
    if (TENS_WORD_MAP[tok] !== undefined) {
      const tensVal = TENS_WORD_MAP[tok];
      const nextTok = localTokens[i + 1];
      if (nextTok && SPOKEN_NUMBER_WORDS[nextTok] && SPOKEN_NUMBER_WORDS[nextTok] !== '0') {
        const unitsVal = parseInt(SPOKEN_NUMBER_WORDS[nextTok], 10);
        localPart += String(tensVal + unitsVal);
        i++; // skip next
      } else {
        localPart += String(tensVal);
      }
      continue;
    }

    if (TEENS_WORD_MAP[tok]) {
      localPart += TEENS_WORD_MAP[tok];
      continue;
    }

    const numWord = SPOKEN_NUMBER_WORDS[tok];
    if (numWord) {
      localPart += numWord;
    } else if (tok === '.' || tok === '_' || tok === '-' || tok === '+') {
      localPart += tok;
    } else {
      localPart += tok;
    }
  }

  // Process domain part:
  // - Combine domain tokens, ensuring '.' stays preserved
  let domainPart = '';
  for (let i = 0; i < domainTokens.length; i++) {
    const tok = domainTokens[i];
    if (tok.startsWith('.')) {
      domainPart += tok;
    } else if (domainTokens[i - 1] === '.' || domainPart.endsWith('.')) {
      domainPart += tok;
    } else if (tok === '.') {
      domainPart += '.';
    } else if (domainPart === '') {
      domainPart += tok;
    } else {
      domainPart += '.' + tok;
    }
  }

  // Clean trailing dots and invalid chars
  localPart = localPart.replace(/[^a-z0-9._+\-]/g, '');
  domainPart = domainPart.replace(/[^a-z0-9.\-]/g, '').replace(/^[.]+/, '').replace(/[.]+$/, '');

  // Trim domain to the first recognized TLD boundary.
  // Try compound TLDs first (e.g., gov.in, co.in, ac.in), then simple TLDs (com, org, in…)
  const compoundTLD = /(^[a-z0-9.\-]+?\.(ac\.in|co\.in|org\.in|gov\.in|nic\.in|edu\.in))(\..+)?$/.exec(domainPart);
  if (compoundTLD) {
    domainPart = compoundTLD[1];
  } else {
    const simpleTLD = /(^[a-z0-9.\-]+?\.(com|org|net|edu|gov|in|io|ai|dev))(\..+)?$/.exec(domainPart);
    if (simpleTLD) {
      domainPart = simpleTLD[1];
    }
  }

  if (!localPart || !domainPart) {
    return (localPart + '@' + domainPart).replace(/^@|@$/g, '');
  }

  return `${localPart}@${domainPart}`;
}

export interface SpokenEmailAnalysis {
  raw: string;
  normalized: string;
  isValid: boolean;
  isAmbiguous: boolean;
  ambiguityReason?: 'missing_separator' | 'spelling_uncertain' | 'incomplete_domain' | 'no_at_symbol';
  spelledOut: string;
  suggestedOptions?: string[];
  localPart?: string;
  domain?: string;
}

/**
 * Analyzes a spoken email transcript for ambiguity and confidence.
 * Detects if the local part contains distinct words without an explicit spoken
 * separator (e.g. "Ashwin Chandeep at Gmail dot com"), preventing silent incorrect guesses.
 */
export function analyzeSpokenEmail(raw: string): SpokenEmailAnalysis {
  if (!raw || typeof raw !== 'string') {
    return {
      raw: '',
      normalized: '',
      isValid: false,
      isAmbiguous: false,
      spelledOut: ''
    };
  }

  const normalized = normalizeSpokenEmail(raw);
  const isValid = validateEmailFormat(normalized);
  const spelledOut = spellOutIdentifier(normalized);

  const clean = raw
    .toLowerCase()
    .replace(/[.,!?;:]+$/, '')
    .trim();

  // Check if transcript contains '@' or spoken 'at'
  const hasAt = /\b(at|at the rate|@)\b/i.test(clean);
  if (!hasAt) {
    return {
      raw,
      normalized,
      isValid,
      isAmbiguous: false,
      ambiguityReason: 'no_at_symbol',
      spelledOut
    };
  }

  // Split around the 'at' marker to inspect raw local-part words
  const parts = clean.split(/\b(?:at the rate of|at the rate symbol|at the rate|at sign|at symbol|at|@)\b/i);
  if (parts.length < 2) {
    return {
      raw,
      normalized,
      isValid,
      isAmbiguous: false,
      spelledOut
    };
  }

  const rawLocal = parts[0].trim();
  const rawDomain = parts.slice(1).join(' ').trim();

  // Check if explicit separator words were spoken in local part
  const hasExplicitSeparator = /\b(dot|period|point|full stop|underscore|under score|hyphen|dash|minus|plus)\b/i.test(rawLocal);

  // Tokenize rawLocal into words
  const localWords = rawLocal.split(/\s+/).filter(Boolean);

  // If there are 2 or more alphabetic words with lengths >= 2 without any separator,
  // this is ambiguous (e.g. "Ashwin Chandeep at Gmail dot com")
  const alphaWords = localWords.filter((w) => /^[a-z]{2,}$/i.test(w) && !SPOKEN_NUMBER_WORDS[w]);

  if (!hasExplicitSeparator && alphaWords.length >= 2) {
    const domainNorm = normalizeSpokenEmail(`test at ${rawDomain}`).split('@')[1] || 'gmail.com';
    const baseW1 = alphaWords[0];
    const baseW2 = alphaWords[1];

    const suggestedOptions = [
      `${baseW1}.${baseW2}@${domainNorm}`,
      `${baseW1}_${baseW2}@${domainNorm}`,
      `${baseW1}-${baseW2}@${domainNorm}`,
      `${baseW1}${baseW2}@${domainNorm}`
    ];

    return {
      raw,
      normalized,
      isValid,
      isAmbiguous: true,
      ambiguityReason: 'missing_separator',
      suggestedOptions,
      localPart: rawLocal,
      domain: domainNorm,
      spelledOut
    };
  }

  return {
    raw,
    normalized,
    isValid,
    isAmbiguous: false,
    spelledOut,
    localPart: normalized.split('@')[0],
    domain: normalized.split('@')[1]
  };
}

/**
 * Reconstructs an email address from spelled-out letters and spoken symbols.
 * Example: "a s h w i n dot c h a n d e e p at gmail dot com" -> "ashwin.chandeep@gmail.com"
 * Supports optional domainContext parameter: reconstructSpelledEmail("a s h w i n", "gmail dot com") -> "ashwin@gmail.com"
 */
export function reconstructSpelledEmail(spelledText: string, domainContext?: string): string {
  if (!spelledText) return '';
  if (domainContext && !spelledText.includes('@') && !/\bat\b/i.test(spelledText)) {
    return normalizeSpokenEmail(`${spelledText} at ${domainContext}`);
  }
  return normalizeSpokenEmail(spelledText);
}

/**
 * Validates standard email format.
 */
export function validateEmailFormat(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

/**
 * Validates Login identifier: accepts a valid email address,
 * an SSC Roll Number (e.g., SSC-2026-MTS-01, SSC-ADMIN-01),
 * or a registered candidate name (e.g., "Ashwin", "Aarav Sharma").
 */
export function validateLoginIdentifier(identifier: string): { valid: boolean; error?: string } {
  const trimmed = (identifier || '').trim();
  if (!trimmed) {
    return {
      valid: false,
      error: 'Please enter your registered email address or SSC Roll Number.'
    };
  }

  // If it contains '@' or looks like an email attempt, validate as email
  if (trimmed.includes('@')) {
    if (!validateEmailFormat(trimmed)) {
      return {
        valid: false,
        error: 'Please enter a valid email address (for example, student@example.com).'
      };
    }
    return { valid: true };
  }

  // Check if it's a valid SSC Roll Number or candidate identifier format (3 to 40 characters)
  if (/^[A-Za-z0-9\-_\s]{3,40}$/.test(trimmed)) {
    return { valid: true };
  }

  return {
    valid: false,
    error: 'Please enter a valid email address or SSC Roll Number.'
  };
}

export type AuthVoiceCommandIntent =
  | 'what_can_i_do'
  | 'explain_page'
  | 'read_instructions'
  | 'read_all_fields'
  | 'repeat'
  | 'stop_speaking'
  | 'pause'
  | 'resume'
  | 'use_keyboard'
  | 'use_voice'
  | 'go_to_login'
  | 'go_to_register'
  | 'read_captcha'
  | 'start_audio_captcha'
  | 'refresh_captcha'
  | 'switch_to_voice'
  | 'switch_to_keyboard'
  | 'switch_to_manual'
  | 'confirm'
  | 'cancel'
  | 'help';

/**
 * Parses shared and context-aware voice commands for Login and Registration pages.
 */
export function parseAuthVoiceCommand(
  rawTranscript: string,
  page: 'login' | 'register' = 'login'
): AuthVoiceCommandIntent | null {
  if (!rawTranscript) return null;
  const t = rawTranscript
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!t) return null;

  // 1. Stop / Pause / Resume
  if (
    t === 'stop' ||
    t === 'stop speaking' ||
    t === 'stop reading' ||
    t === 'stop audio' ||
    t === 'quiet' ||
    t === 'be quiet' ||
    t === 'silence'
  ) {
    return 'stop_speaking';
  }

  if (t === 'pause' || t === 'pause speaking' || t === 'pause reading' || t === 'pause audio') {
    return 'pause';
  }

  if (t === 'resume' || t === 'resume speaking' || t === 'resume reading' || t === 'continue reading') {
    return 'resume';
  }

  // 2. Repeat
  if (
    t === 'repeat' ||
    t === 'repeat question' ||
    t === 'repeat prompt' ||
    t === 'say again' ||
    t === 'say that again' ||
    t === 'read again'
  ) {
    return 'repeat';
  }

  // 3. Accessibility Mode Switching Commands
  if (
    t === 'switch to vision mode' ||
    t === 'switch to voice mode' ||
    t === 'activate vision mode' ||
    t === 'activate voice mode' ||
    t === 'vision assistance mode'
  ) {
    return 'switch_to_voice';
  }

  if (
    t === 'switch to keyboard mode' ||
    t === 'switch to shortcut mode' ||
    t === 'keyboard shortcut mode' ||
    t === 'shortcut mode'
  ) {
    return 'switch_to_keyboard';
  }

  if (
    t === 'switch to manual mode' ||
    t === 'manual mode' ||
    t === 'independent mode' ||
    t === 'independent manual mode' ||
    t === 'i will do it myself' ||
    t === 'ill do it myself' ||
    t === 'do it myself'
  ) {
    return 'switch_to_manual';
  }

  // 4. CAPTCHA specific commands
  if (
    t === 'start audio captcha' ||
    t === 'start captcha' ||
    t === 'begin audio captcha' ||
    t === 'start voice captcha' ||
    t === 'voice captcha'
  ) {
    return 'start_audio_captcha';
  }

  if (
    t === 'repeat captcha' ||
    t === 'read captcha' ||
    t === 'play captcha' ||
    t === 'listen captcha' ||
    t === 'hear captcha' ||
    t === 'audio captcha' ||
    t === 'read verification code' ||
    t === 'repeat verification code' ||
    t === 'read digits' ||
    t === 'repeat digits'
  ) {
    return 'read_captcha';
  }

  if (
    t === 'refresh captcha' ||
    t === 'new captcha' ||
    t === 'change captcha' ||
    t === 'regenerate captcha' ||
    t === 'refresh code' ||
    t === 'new code'
  ) {
    return 'refresh_captcha';
  }

  // 5. Switch between Voice and Keyboard
  if (
    t === 'use keyboard' ||
    t === 'switch to keyboard' ||
    t === 'keyboard mode' ||
    t === 'manual input' ||
    t === 'manual entry' ||
    t === 'type with keyboard'
  ) {
    return 'use_keyboard';
  }

  if (
    t === 'use voice' ||
    t === 'switch to voice' ||
    t === 'voice mode' ||
    (page === 'login' &&
      (t === 'start voice login' ||
        t === 'voice login' ||
        t === 'begin voice login' ||
        t === 'start login' ||
        t === 'guided login' ||
        t === 'sign in with voice')) ||
    (page === 'register' &&
      (t === 'start voice registration' ||
        t === 'voice registration' ||
        t === 'begin voice registration' ||
        t === 'guided registration' ||
        t === 'register with voice'))
  ) {
    return 'use_voice';
  }

  // 6. Cross-page navigation between Login and Registration
  if (
    t === 'go to login' ||
    t === 'open login' ||
    t === 'back to login' ||
    t === 'sign in page' ||
    t === 'login page' ||
    (page === 'register' && (t === 'login' || t === 'sign in'))
  ) {
    return 'go_to_login';
  }

  if (
    t === 'go to registration' ||
    t === 'go to register' ||
    t === 'open registration' ||
    t === 'open register' ||
    t === 'create account' ||
    t === 'registration page' ||
    t === 'register page' ||
    (page === 'login' && (t === 'register' || t === 'registration' || t === 'sign up'))
  ) {
    return 'go_to_register';
  }

  // 7. Page explanation & instructions
  if (
    t === 'explain this page' ||
    t === 'explain page' ||
    t === 'about this page' ||
    t === 'describe this page' ||
    t === 'where am i'
  ) {
    return 'explain_page';
  }

  if (
    t === 'what can i do here' ||
    t === 'what can i do' ||
    t === 'available actions' ||
    t === 'what are my options'
  ) {
    return 'what_can_i_do';
  }

  if (
    t === 'read instructions' ||
    t === 'instructions' ||
    t === 'read guide' ||
    (page === 'login' && (t === 'read login guide' || t === 'login instructions' || t === 'login guide')) ||
    (page === 'register' &&
      (t === 'read registration guide' || t === 'registration instructions' || t === 'registration guide'))
  ) {
    return 'read_instructions';
  }

  if (
    t === 'read all fields' ||
    t === 'read fields' ||
    t === 'list fields' ||
    t === 'what are the fields' ||
    t === 'form fields'
  ) {
    return 'read_all_fields';
  }

  if (t === 'help' || t === 'voice commands' || t === 'commands') {
    return 'help';
  }

  return null;
}
