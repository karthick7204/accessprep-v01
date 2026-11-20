/**
 * ACCESSPREP-X — Reasoning Speech Formatter
 * =====================================================================
 * Converts coded letter sequences, letter clusters, and alphanumeric
 * patterns in reasoning/coding-decoding MCQ questions into character-
 * by-character speech for screen readers and Web Speech API.
 *
 * Rules:
 *  1. Quoted words/clusters in context (e.g. 'WATER', 'YCVGT') → W-A-T-E-R
 *  2. Unquoted standalone letter clusters in coding/reasoning context
 *     (e.g. BCD : GHI, FTHCO) → B-C-D, F-T-H-C-O
 *  3. Common English stop-words (IN, THE, IF, IS, etc.) → NEVER spelled
 *  4. Ordinary English words in prose → pass through unchanged
 *  5. Already-hyphenated sequences (W-A-T-E-R) → no double hyphenation
 *  6. Numbers → read as numbers (not spelled letter by letter)
 *  7. Single characters → kept as-is (already unambiguous)
 *
 * Display text is NEVER modified — only the speech output changes.
 */

// ---------------------------------------------------------------------------
// Stop-words: uppercase common English words that must NEVER be spelled out
// ---------------------------------------------------------------------------
const ENGLISH_STOP_WORDS = new Set([
  'A', 'AN', 'THE', 'IN', 'ON', 'AT', 'TO', 'BY', 'OF', 'IS', 'AS',
  'IF', 'OR', 'AND', 'NOT', 'BUT', 'FOR', 'NOR', 'SO', 'YET',
  'ARE', 'WAS', 'BE', 'HAS', 'HAD', 'DO', 'DID', 'DOES',
  'IT', 'ITS', 'HE', 'SHE', 'WE', 'THEY', 'HIM', 'HER', 'US', 'THEM',
  'MY', 'YOUR', 'HIS', 'OUR', 'THEIR',
  'ALL', 'ANY', 'CAN', 'MAY', 'WILL', 'SHALL', 'WOULD', 'COULD', 'SHOULD',
  'HOW', 'WHAT', 'WHEN', 'WHERE', 'WHO', 'WHICH', 'WHY', 'THAT', 'THIS',
  'THESE', 'THOSE',
  'YES', 'NO',
  'UP', 'DOWN', 'OUT', 'OFF', 'INTO', 'ONTO', 'FROM', 'WITH', 'ABOUT',
  'CODE', 'LANGUAGE', 'WRITTEN', 'CODED', 'GIVEN', 'FIND', 'NEXT',
  'LETTER', 'LETTERS', 'WORD', 'WORDS', 'NUMBER', 'NUMBERS',
  'SERIES', 'PATTERN', 'SEQUENCE', 'MISSING', 'SELECT', 'RELATED',
  'CERTAIN', 'FOLLOWING', 'SIMILAR', 'SAME', 'BOTH', 'EACH',
]);

// ---------------------------------------------------------------------------
// Topic/subject patterns that signal coding-decoding or letter-series context
// ---------------------------------------------------------------------------
const CODING_TOPIC_PATTERN = /coding|decoding|letter.*series|series.*letter|analogy|word.*analogy|analogy.*word|alphanumeric|arrangement|cipher|pattern/i;
const CODING_SUBJECT_PATTERN = /reasoning|logical|intelligence|mental/i;

function isCodingContext(subject?: string, topic?: string): boolean {
  if (!subject && !topic) return false;
  const combined = `${subject || ''} ${topic || ''}`;
  return CODING_SUBJECT_PATTERN.test(combined) || CODING_TOPIC_PATTERN.test(combined);
}

// ---------------------------------------------------------------------------
// Core: convert a single token to spoken form
// ---------------------------------------------------------------------------

/** Spell a string character by character: "WATER" → "W-A-T-E-R" */
function spellOut(token: string): string {
  return token.split('').join('-');
}

/** Check if a token is already in hyphenated letter form: "W-A-T-E-R" */
function isAlreadyHyphenated(token: string): boolean {
  return /^[A-Z](-[A-Z])+$/.test(token);
}

/**
 * Decide if an uppercase token should be spelled out in a coding context.
 * Returns true when:
 *  - The token is ALL uppercase letters (no vowel pattern matching common English words)
 *  - The token is NOT a known English stop-word
 *  - Length is between 2 and 12 characters
 */
function shouldSpellInCodingContext(token: string): boolean {
  if (!/^[A-Z]{2,12}$/.test(token)) return false;
  if (ENGLISH_STOP_WORDS.has(token)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Question text formatter
// ---------------------------------------------------------------------------

/**
 * Formats a reasoning question text for speech by converting coded letter
 * sequences to character-by-character spoken form.
 *
 * @param text     - The raw question_text string
 * @param subject  - The question's subject field (e.g. "Reasoning Ability and Problem Solving")
 * @param topic    - The question's topic field (e.g. "Coding-Decoding")
 */
export function formatReasoningQuestionSpeech(
  text: string,
  subject?: string,
  topic?: string
): string {
  if (!text) return '';

  const coding = isCodingContext(subject, topic);
  if (!coding) return text;

  // Step 1: Convert quoted words like 'WATER' or "YCVGT" to spelled form
  // Matches single-quoted uppercase clusters, e.g. 'WATER', 'YCVGT', 'DREAM'
  let result = text.replace(/'([A-Z]{1,15})'/g, (_match, word: string) => {
    if (isAlreadyHyphenated(word)) return word;
    if (ENGLISH_STOP_WORDS.has(word)) return word;
    if (word.length === 1) return word;
    return spellOut(word);
  });

  // Step 2: Convert unquoted standalone uppercase clusters in coding context
  // These appear as words like: BCD, GHI, JKL, OPQ (letter series analogies)
  // We tokenize on word boundaries and convert eligible tokens
  result = result.replace(/\b([A-Z]{2,12})\b/g, (match) => {
    if (isAlreadyHyphenated(match)) return match;
    if (!shouldSpellInCodingContext(match)) return match;
    return spellOut(match);
  });

  return result;
}

// ---------------------------------------------------------------------------
// Option text formatter
// ---------------------------------------------------------------------------

/**
 * Formats a single answer option text for speech.
 * When the option is a pure uppercase letter cluster (e.g. FTHCO, OPQ, HJM),
 * it is spelled out character by character.
 *
 * @param optionText    - The raw option text (e.g. "FTHCO" or "New Delhi")
 * @param subject       - The question's subject
 * @param topic         - The question's topic
 * @param questionText  - The original question text (used to determine coding context)
 */
export function formatReasoningOptionSpeech(
  optionText: string,
  subject?: string,
  topic?: string,
  questionText?: string
): string {
  if (!optionText) return '';

  const coding = isCodingContext(subject, topic);

  // Pure uppercase letter cluster (no spaces, 2-12 chars) in coding context → spell out
  if (coding && /^[A-Z]{2,12}$/.test(optionText.trim())) {
    const token = optionText.trim();
    if (!ENGLISH_STOP_WORDS.has(token) && !isAlreadyHyphenated(token)) {
      return spellOut(token);
    }
  }

  // Alphanumeric mixture like "FTHCO1" in coding context → spell non-numeric chars
  if (coding && /^[A-Z0-9]{2,12}$/.test(optionText.trim()) && /[A-Z]/.test(optionText) && /[0-9]/.test(optionText)) {
    return optionText.split('').join('-');
  }

  // Also check if question text implies coding context even if topic is not set
  if (!coding && questionText) {
    const hasCodePattern = /'[A-Z]{2,}'/g.test(questionText) ||
      /written as|coded as|code language/i.test(questionText);
    if (hasCodePattern && /^[A-Z]{2,12}$/.test(optionText.trim())) {
      const token = optionText.trim();
      if (!ENGLISH_STOP_WORDS.has(token)) {
        return spellOut(token);
      }
    }
  }

  return optionText;
}
