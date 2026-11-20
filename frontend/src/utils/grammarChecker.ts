/**
 * ACCESSPREP-X — Client-Side Grammar & Quality Checker
 * ====================================================
 * Accessible, rule-based grammar and usage analyzer designed for
 * visually impaired and blind candidate dictation in SSC MTS examination prep.
 *
 * Checks:
 *  1. Consecutive repeated words ("the the", "in in", "is is")
 *  2. Subject-verb agreement ("I is", "He are", "They has", "does not has")
 *  3. Past tense auxiliary errors ("did not went", "didn't saw")
 *  4. Redundant prepositions & Indian English usage ("discuss about", "revert back", "order for")
 *  5. Indefinite article errors ("a apple", "an university")
 *  6. Pluralization with partitive expressions ("one of the friend")
 */

export interface GrammarIssue {
  id: string;
  type: 'grammar' | 'style' | 'repetition' | 'article' | 'agreement';
  message: string;
  suggestion: string;
  matchedText: string;
  replacement: string;
  index: number;
  length: number;
}

interface GrammarRule {
  id: string;
  type: GrammarIssue['type'];
  pattern: RegExp;
  message: string;
  suggestion: (match: string, ...groups: string[]) => string;
  replacement: (match: string, ...groups: string[]) => string;
}

const GRAMMAR_RULES: GrammarRule[] = [
  // 1. Repeated words
  {
    id: 'repeated_word',
    type: 'repetition',
    pattern: /\b(the|is|in|at|to|of|and|for|that|with|on|as|it|a|an)\s+\1\b/gi,
    message: 'Repeated consecutive word detected',
    suggestion: (match, group1) => `Remove the duplicate "${group1}"`,
    replacement: (match, group1) => group1
  },

  // 2. Subject-verb agreement: I is / I has
  {
    id: 'sva_i_is',
    type: 'agreement',
    pattern: /\bI\s+is\b/g,
    message: 'Subject-verb agreement error: "I" takes "am"',
    suggestion: () => 'Change "I is" to "I am"',
    replacement: () => 'I am'
  },
  {
    id: 'sva_i_has',
    type: 'agreement',
    pattern: /\bI\s+has\b/g,
    message: 'Subject-verb agreement error: "I" takes "have"',
    suggestion: () => 'Change "I has" to "I have"',
    replacement: () => 'I have'
  },

  // 3. Subject-verb agreement: He/She/It are / have
  {
    id: 'sva_he_are',
    type: 'agreement',
    pattern: /\b(he|she|it)\s+are\b/gi,
    message: 'Singular third-person pronoun takes singular verb "is"',
    suggestion: (match, pron) => `Change "${match}" to "${pron} is"`,
    replacement: (match, pron) => `${pron} is`
  },
  {
    id: 'sva_he_have',
    type: 'agreement',
    pattern: /\b(he|she|it)\s+have\b/gi,
    message: 'Singular third-person pronoun takes singular verb "has"',
    suggestion: (match, pron) => `Change "${match}" to "${pron} has"`,
    replacement: (match, pron) => `${pron} has`
  },

  // 4. Subject-verb agreement: They/We/You is / has
  {
    id: 'sva_they_is',
    type: 'agreement',
    pattern: /\b(they|we|you)\s+is\b/gi,
    message: 'Plural/second-person pronoun takes plural verb "are"',
    suggestion: (match, pron) => `Change "${match}" to "${pron} are"`,
    replacement: (match, pron) => `${pron} are`
  },
  {
    id: 'sva_they_has',
    type: 'agreement',
    pattern: /\b(they|we|you)\s+has\b/gi,
    message: 'Plural/second-person pronoun takes plural verb "have"',
    suggestion: (match, pron) => `Change "${match}" to "${pron} have"`,
    replacement: (match, pron) => `${pron} have`
  },

  // 5. Does not has / Do not has
  {
    id: 'aux_does_not_has',
    type: 'grammar',
    pattern: /\b(does\s+not|doesn't|did\s+not|didn't|do\s+not|don't)\s+has\b/gi,
    message: 'Auxiliary "do/does/did" requires base verb "have"',
    suggestion: (match, aux) => `Change "${match}" to "${aux} have"`,
    replacement: (match, aux) => `${aux} have`
  },

  // 6. Double past tense with did/didn't
  {
    id: 'double_past_went',
    type: 'grammar',
    pattern: /\b(did\s+not|didn't|did)\s+went\b/gi,
    message: 'Auxiliary "did" requires base form verb "go"',
    suggestion: (match, aux) => `Change "${match}" to "${aux} go"`,
    replacement: (match, aux) => `${aux} go`
  },
  {
    id: 'double_past_saw',
    type: 'grammar',
    pattern: /\b(did\s+not|didn't|did)\s+saw\b/gi,
    message: 'Auxiliary "did" requires base form verb "see"',
    suggestion: (match, aux) => `Change "${match}" to "${aux} see"`,
    replacement: (match, aux) => `${aux} see`
  },
  {
    id: 'double_past_came',
    type: 'grammar',
    pattern: /\b(did\s+not|didn't|did)\s+came\b/gi,
    message: 'Auxiliary "did" requires base form verb "come"',
    suggestion: (match, aux) => `Change "${match}" to "${aux} come"`,
    replacement: (match, aux) => `${aux} come`
  },
  {
    id: 'double_past_knew',
    type: 'grammar',
    pattern: /\b(did\s+not|didn't|did)\s+knew\b/gi,
    message: 'Auxiliary "did" requires base form verb "know"',
    suggestion: (match, aux) => `Change "${match}" to "${aux} know"`,
    replacement: (match, aux) => `${aux} know`
  },
  {
    id: 'double_past_took',
    type: 'grammar',
    pattern: /\b(did\s+not|didn't|did)\s+took\b/gi,
    message: 'Auxiliary "did" requires base form verb "take"',
    suggestion: (match, aux) => `Change "${match}" to "${aux} take"`,
    replacement: (match, aux) => `${aux} take`
  },
  {
    id: 'double_past_wrote',
    type: 'grammar',
    pattern: /\b(did\s+not|didn't|did)\s+wrote\b/gi,
    message: 'Auxiliary "did" requires base form verb "write"',
    suggestion: (match, aux) => `Change "${match}" to "${aux} write"`,
    replacement: (match, aux) => `${aux} write`
  },

  // 7. Redundant prepositions / common English usage
  {
    id: 'redundant_discuss_about',
    type: 'style',
    pattern: /\b(discuss|discussed|discussing)\s+about\b/gi,
    message: 'The preposition "about" is redundant after "discuss"',
    suggestion: (match, verb) => `Change "${match}" to simply "${verb}"`,
    replacement: (match, verb) => verb
  },
  {
    id: 'redundant_revert_back',
    type: 'style',
    pattern: /\b(revert|reverted|reverting)\s+back\b/gi,
    message: '"Revert" already means reply/turn back; "back" is redundant',
    suggestion: (match, verb) => `Change "${match}" to simply "${verb}"`,
    replacement: (match, verb) => verb
  },
  {
    id: 'redundant_return_back',
    type: 'style',
    pattern: /\b(return|returned|returning)\s+back\b/gi,
    message: '"Return" already includes backward direction; "back" is redundant',
    suggestion: (match, verb) => `Change "${match}" to simply "${verb}"`,
    replacement: (match, verb) => verb
  },
  {
    id: 'redundant_reply_back',
    type: 'style',
    pattern: /\b(reply|replied|replying)\s+back\b/gi,
    message: '"Back" is redundant after "reply"',
    suggestion: (match, verb) => `Change "${match}" to simply "${verb}"`,
    replacement: (match, verb) => verb
  },
  {
    id: 'redundant_cope_up_with',
    type: 'style',
    pattern: /\bcope\s+up\s+with\b/gi,
    message: 'Standard idiom is "cope with" (without "up")',
    suggestion: () => 'Change "cope up with" to "cope with"',
    replacement: () => 'cope with'
  },

  // 8. One of the + singular noun error
  {
    id: 'one_of_the_singular',
    type: 'grammar',
    pattern: /\bone\s+of\s+the\s+(friend|student|boy|girl|question|issue|problem|book|teacher|candidate|reason|factor)\b/gi,
    message: 'The expression "one of the" requires a plural noun',
    suggestion: (match, noun) => `Change "${match}" to "one of the ${noun}s"`,
    replacement: (match, noun) => `one of the ${noun}s`
  },

  // 9. Indefinite article errors
  {
    id: 'article_a_before_vowel',
    type: 'article',
    pattern: /\ba\s+(apple|orange|egg|elephant|island|umbrella|hour|honest|easy|obvious|important|interesting|answer|explanation)\b/gi,
    message: 'Use "an" before vowel sounds',
    suggestion: (match, word) => `Change "${match}" to "an ${word}"`,
    replacement: (match, word) => `an ${word}`
  },
  {
    id: 'article_an_before_consonant_sound',
    type: 'article',
    pattern: /\ban\s+(university|uniform|unit|unique|user|european|useful|one)\b/gi,
    message: 'Use "a" before consonant "yu" or "w" sounds',
    suggestion: (match, word) => `Change "${match}" to "a ${word}"`,
    replacement: (match, word) => `a ${word}`
  }
];

/**
 * Analyzes input text for grammatical errors, stylistic redundancy, and usage issues.
 */
export function checkGrammar(text: string): GrammarIssue[] {
  if (!text || typeof text !== 'string') return [];
  const trimmed = text.trim();
  if (!trimmed) return [];

  const issues: GrammarIssue[] = [];

  for (const rule of GRAMMAR_RULES) {
    // Reset regex index for global regexes
    rule.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = rule.pattern.exec(text)) !== null) {
      const matchedText = match[0];
      const groups = match.slice(1);
      const index = match.index;

      issues.push({
        id: `${rule.id}_${index}`,
        type: rule.type,
        message: rule.message,
        suggestion: rule.suggestion(matchedText, ...groups),
        matchedText,
        replacement: rule.replacement(matchedText, ...groups),
        index,
        length: matchedText.length
      });
    }
  }

  // Sort issues in chronological order of appearance
  issues.sort((a, b) => a.index - b.index);

  return issues;
}

/**
 * Automatically applies all suggestions to fix detected grammar issues in text.
 */
export function applyGrammarSuggestions(text: string, issues: GrammarIssue[]): string {
  if (!text || !issues || issues.length === 0) return text;

  // Apply replacements from right to left so indices don't shift
  const sortedDesc = [...issues].sort((a, b) => b.index - a.index);
  let updated = text;

  for (const issue of sortedDesc) {
    const before = updated.slice(0, issue.index);
    const after = updated.slice(issue.index + issue.length);
    updated = before + issue.replacement + after;
  }

  return updated;
}

/**
 * Formats grammar issues into spoken natural language for blind candidates.
 */
export function formatGrammarIssuesForSpeech(issues: GrammarIssue[]): string {
  if (!issues || issues.length === 0) {
    return 'Grammar check complete. No grammatical errors were detected. Your dictation is clear and accurate!';
  }

  const countStr = issues.length === 1 ? '1 potential grammatical issue' : `${issues.length} potential grammatical issues`;
  const items = issues
    .slice(0, 4)
    .map((issue, idx) => `Issue ${idx + 1}: At "${issue.matchedText}", ${issue.message}. Suggestion: "${issue.replacement}".`)
    .join(' ');

  const moreText = issues.length > 4 ? ` Plus ${issues.length - 4} more issues.` : '';

  return `Grammar check found ${countStr}. ${items}${moreText} Say "Apply suggestions" to automatically correct your text, or say "Read issues" to listen again.`;
}
