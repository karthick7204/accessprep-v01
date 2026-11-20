/**
 * ACCESSPREP-X — Mathematical Speech Recognition & Parsing Engine (Phases 2, 3, 5, 6)
 * Converts spoken mathematical language (including Indian English mathematical phrasing)
 * into structured ASTs, human-readable notation, canonical normalized expressions,
 * spoken read-backs, and explicit ambiguity alternatives.
 */

import {
  MathAmbiguityCandidate,
  MathParseResult
} from './mathematicalTypes.ts';
import {
  ALLOWED_VARIABLES,
  ORDINAL_DENOMINATORS,
  isNumberWord,
  parseNumberWordSequence
} from './mathematicalGrammar.ts';
import {
  parseInfixToAST,
  formatDisplayExpression,
  formatNormalizedExpression,
  formatLatexExpression
} from './mathematicalExpressionNormalizer.ts';
import { validateMathAST } from './mathematicalExpressionValidator.ts';
import { renderASTToSpeech } from './mathematicalSpeechRenderer.ts';

/**
 * Normalizes common speech-to-text homophones in mathematical dictation
 * without corrupting variable names or multiplication operators.
 */
function normalizeSpokenMathHomophones(raw: string): string {
  let s = raw
    .toLowerCase()
    .replace(/[""'']/g, '')
    // Keep hyphens inside number words like "twenty-five" or "forty-nine" as spaces for uniform word splitting,
    // while keeping negative signs attached to digits or handled as "minus"/"negative"
    .replace(/([a-z])-([a-z])/g, '$1 $2')
    .replace(/[.,;?!]+$/g, '')
    .trim();

  // Strip conversational prefixes like "the answer is", "my answer is", "calculate", "evaluate", "solve"
  s = s.replace(
    /^(?:the\s+answer\s+is|my\s+answer\s+is|answer\s+is|it\s+is|equals\s+to|calculate|evaluate|simplify|solve)\s+/i,
    ''
  );

  // Common phonetic transcriptions of variables & constants
  s = s
    .replace(/\beks\b|\bex\b/g, 'x')
    .replace(/\bwai\b|\bwhy\b/g, 'y')
    .replace(/\bzed\b|\bzee\b/g, 'z')
    .replace(/\bpie\b/g, 'pi')
    .replace(/\bsquare\s+rut\b/g, 'square root')
    .replace(/\bunder\s+root\s+of\b|\bunder\s+root\b|\broot\s+over\b/g, 'square root of')
    .replace(/\bwhole\s+square\b|\bthe\s+whole\s+squared\b/g, 'close bracket squared')
    .replace(/\bwhole\s+cube\b|\bthe\s+whole\s+cubed\b/g, 'close bracket cubed');

  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Translates spoken mathematical phrases into an intermediate algebraic infix string,
 * tracking whether explicit multiplication words ("times", "multiplied by", "into")
 * were spoken and whether structural grouping ambiguity exists.
 */
export function convertSpokenWordsToInfix(rawTranscript: string): {
  infix: string;
  preserveExplicitMultForVars: boolean;
  isAmbiguous: boolean;
  ambiguityReason?: string;
  alternativeInfixList: Array<{ infix: string; description: string }>;
} {
  const cleaned = normalizeSpokenMathHomophones(rawTranscript);
  if (!cleaned) {
    return {
      infix: '',
      preserveExplicitMultForVars: false,
      isAmbiguous: false,
      alternativeInfixList: []
    };
  }

  // If the input already looks like a symbolic math expression (e.g. "2x + 5 = 15" or "\frac{3}{4}"),
  // still check if it contains spoken operator words.
  const hasSpokenMathWords =
    /\b(plus|minus|times|multiplied|divided|over|upon|equals|equal|greater|less|square|cube|root|squared|cubed|power|bracket|parenthesis|percent|percentage|factorial|lcm|hcf|gcd|abs|absolute|modulus|infinity|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fourty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|lakh|crore|half|third|fourth|quarter|fifth|into|is\s+to)\b/i.test(
      cleaned
    );

  if (!hasSpokenMathWords) {
    return {
      infix: rawTranscript.trim(),
      preserveExplicitMultForVars: /\d+\s*\*\s*[a-zA-Z]/.test(rawTranscript),
      isAmbiguous: false,
      alternativeInfixList: []
    };
  }

  let s = cleaned;
  let preserveExplicitMultForVars = false;
  let isAmbiguous = false;
  let ambiguityReason: string | undefined;
  const alternativeInfixList: Array<{ infix: string; description: string }> = [];

  // Detect whether student explicitly said "times" / "multiplied by" / "into" before a variable
  if (/\b(times|multiplied\s+by|into)\s+[a-z]\b/i.test(s)) {
    preserveExplicitMultForVars = true;
  }

  // 1. Multi-word brackets & grouping phrases
  const hadExplicitBracket =
    /\b(open|left|start|close|right|end)\s+(bracket|parenthesis|parens|brace)\b|\bthe\s+quantity\b|\bwhole\s+divided\s+by\b|\ball\s+divided\s+by\b/i.test(
      s
    );

  // Handle "all divided by" / "whole divided by" / "all over" (wraps preceding expression in brackets)
  const allDivMatch = s.match(/^(.*?)\s*,?\s*\b(?:all|the\s+whole|whole)\s+(?:divided\s+by|over|upon)\s+(.+)$/i);
  if (allDivMatch) {
    const leftPart = convertSpokenWordsToInfix(allDivMatch[1]).infix;
    const rightPart = convertSpokenWordsToInfix(allDivMatch[2]).infix;
    return {
      infix: `(${leftPart}) / ${rightPart}`,
      preserveExplicitMultForVars,
      isAmbiguous: false,
      alternativeInfixList: []
    };
  }

  s = s
    .replace(/\b(open|left|start)\s+(bracket|parenthesis|brackets|parentheses)\b/g, ' ( ')
    .replace(/\b(close|right|end)\s+(bracket|parenthesis|brackets|parentheses)\b/g, ' ) ')
    .replace(/\bof\s+the\s+quantity\b|\bthe\s+quantity\b/g, ' ( ');

  // 2. Multi-word comparison & equality phrases (longest match first)
  s = s
    .replace(/\bis\s+greater\s+than\s+or\s+equal\s+to\b|\bgreater\s+than\s+or\s+equal\s+to\b|\bat\s+least\b/g, ' >= ')
    .replace(/\bis\s+less\s+than\s+or\s+equal\s+to\b|\bless\s+than\s+or\s+equal\s+to\b|\bat\s+most\b/g, ' <= ')
    .replace(/\bis\s+not\s+equal\s+to\b|\bnot\s+equal\s+to\b|\bdoes\s+not\s+equal\b|\bnot\s+equals\b/g, ' != ')
    .replace(/\bis\s+greater\s+than\b|\bgreater\s+than\b/g, ' > ')
    .replace(/\bis\s+less\s+than\b|\bless\s+than\b/g, ' < ')
    .replace(/\bis\s+equal\s+to\b|\bequals\s+to\b|\bequal\s+to\b|\bequals\b|\bequal\b/g, ' = ');

  // 3. Spoken common fractions ("one half", "three fourths", "two thirds", "three quarters")
  s = s.replace(
    /\b(a|one|two|three|four|five|six|seven|eight|nine|ten|eleven)\s+(half|halves|third|thirds|fourth|fourths|quarter|quarters|fifth|fifths|sixth|sixths|seventh|sevenths|eighth|eighths|ninth|ninths|tenth|tenths|eleventh|elevenths|twelfth|twelfths)\b/g,
    (_, numWord, denWord) => {
      const n = numWord === 'a' ? 1 : parseNumberWordSequence([numWord]) ?? 1;
      const d = ORDINAL_DENOMINATORS[denWord] ?? 2;
      return `${n}/${d}`;
    }
  );

  // 4. Functions: LCM, HCF, GCD, Summation, Absolute Value, Cube Root, Square Root
  s = s
    .replace(
      /\b(?:least\s+common\s+multiple|l\s*c\s*m)\s+of\s+([a-z0-9\s,]+?)(?=\s+(?:plus|minus|times|multiplied|divided|equals|=|$))/g,
      (_, argsPart) => {
        const items = argsPart
          .split(/\s+and\s+|\s*,\s*/)
          .map((item: string) => convertSpokenNumberTokens(item.trim()))
          .filter(Boolean);
        return `lcm(${items.join(', ')})`;
      }
    )
    .replace(
      /\b(?:highest\s+common\s+factor|greatest\s+common\s+divisor|h\s*c\s*f|g\s*c\s*d)\s+of\s+([a-z0-9\s,]+?)(?=\s+(?:plus|minus|times|multiplied|divided|equals|=|$))/g,
      (_, argsPart) => {
        const items = argsPart
          .split(/\s+and\s+|\s*,\s*/)
          .map((item: string) => convertSpokenNumberTokens(item.trim()))
          .filter(Boolean);
        return `hcf(${items.join(', ')})`;
      }
    )
    .replace(
      /\b(?:summation|sum)\s+of\s+([a-z0-9\s,]+?)(?=\s+(?:plus|minus|times|multiplied|divided|equals|=|$))/g,
      (_, argsPart) => {
        if (argsPart.includes(' and ') || argsPart.includes(',')) {
          const items = argsPart
            .split(/\s+and\s+|\s*,\s*/)
            .map((item: string) => convertSpokenNumberTokens(item.trim()))
            .filter(Boolean);
          return `sum(${items.join(', ')})`;
        }
        return `sum(${convertSpokenNumberTokens(argsPart)})`;
      }
    );

  // 5. Convert number word sequences into digits before operator replacement
  s = convertSpokenNumberTokens(s);

  // 6. Check for Square Root / Cube Root / Absolute Value & detect grouping ambiguity (Phase 5 & 6)
  // e.g. "square root of 9 plus 7" or "square root of 100 plus 20"
  const rootAmbiguousMatch = s.match(
    /\b(square\s+root\s+of|cube\s+root\s+of|root\s+of)\s+(\d+(?:\.\d+)?|[a-z])\s+(plus|\+|minus|-)\s+(\d+(?:\.\d+)?|[a-z])\b/i
  );
  if (rootAmbiguousMatch && !hadExplicitBracket) {
    const fn = rootAmbiguousMatch[1].toLowerCase().startsWith('cube') ? 'cbrt' : 'sqrt';
    const firstArg = rootAmbiguousMatch[2];
    const op = rootAmbiguousMatch[3] === 'minus' || rootAmbiguousMatch[3] === '-' ? '-' : '+';
    const secondArg = rootAmbiguousMatch[4];

    isAmbiguous = true;
    ambiguityReason = `Spoken root grouping "${rawTranscript}" can mean ${fn}(${firstArg}) ${op} ${secondArg} or ${fn}(${firstArg} ${op} ${secondArg}).`;
    alternativeInfixList.push(
      {
        infix: `${fn}(${firstArg}) ${op} ${secondArg}`,
        description: `${fn === 'sqrt' ? 'Square' : 'Cube'} root of ${firstArg}, then ${op === '+' ? 'plus' : 'minus'} ${secondArg}`
      },
      {
        infix: `${fn}(${firstArg} ${op} ${secondArg})`,
        description: `${fn === 'sqrt' ? 'Square' : 'Cube'} root of the entire quantity (${firstArg} ${op} ${secondArg})`
      }
    );
  }

  // Replace "square root of ( ... )" or "square root of <atom>"
  s = s
    .replace(/\bsquare\s+root\s+of\s*\(\s*([^()]+)\s*\)/gi, 'sqrt($1)')
    .replace(/\bcube\s+root\s+of\s*\(\s*([^()]+)\s*\)/gi, 'cbrt($1)')
    .replace(/\b(?:absolute\s+value\s+of|modulus\s+of|mod\s+of)\s*\(\s*([^()]+)\s*\)/gi, 'abs($1)')
    .replace(/\bcube\s+root\s+of\s+(-?\d+(?:\.\d+)?|[a-z])\b/gi, 'cbrt($1)')
    .replace(/\b(?:square\s+root\s+of|root\s+of)\s+(-?\d+(?:\.\d+)?|[a-z])\b/gi, 'sqrt($1)')
    .replace(/\b(?:absolute\s+value\s+of|modulus\s+of|mod\s+of)\s+(-?\d+(?:\.\d+)?|[a-z])\b/gi, 'abs($1)');

  // 7. Powers & Exponents
  s = s
    .replace(/\bsquared\b|\bsquare\b/g, '^2')
    .replace(/\bcubed\b|\bcube\b/g, '^3')
    .replace(/\b(?:raised\s+to\s+the\s+power\s+of|to\s+the\s+power\s+of|raised\s+to\s+the\s+power|to\s+the\s+power|raised\s+to)\s+/g, '^');

  // 8. Percentages: "25 percent of 200" -> "25% of 200", "25 percent" -> "25%"
  s = s
    .replace(/(\d+(?:\.\d+)?)\s*(?:percent|percentage|per\s+cent)\s+of\b/gi, '$1% of')
    .replace(/(\d+(?:\.\d+)?)\s*(?:percent|percentage|per\s+cent)\b/gi, '$1%');

  // 9. Factorial
  s = s.replace(/(\d+|[a-z]|\))\s+factorial\b/gi, '$1!');

  // 10. Arithmetic Operators & Ratios
  // Important: distinguish multiplication words ("times", "multiplied by", "into") from variable "x"!
  s = s
    .replace(/\bmultiplied\s+by\b|\btimes\b|\binto\b/g, ' * ')
    .replace(/\bdivided\s+by\b|\bover\b|\bupon\b/g, ' / ')
    // Indian English "three by four" -> "3 / 4" when "by" sits between two numbers or single-letter variables
    .replace(/\b(\d+(?:\.\d+)?|[a-z])\s+by\s+(\d+(?:\.\d+)?|[a-z])\b/g, '$1 / $2')
    .replace(/\bplus\b|\badded\s+to\b|\bincreased\s+by\b/g, ' + ')
    .replace(/\bminus\b|\bsubtracted\s+by\b|\bdecreased\s+by\b|\bless\b/g, ' - ')
    .replace(/\bnegative\s+(\d+(?:\.\d+)?|[a-z])\b/g, '-$1')
    .replace(/\bis\s+to\b/g, ' : ');

  // 11. Detect division grouping ambiguity when unbracketed addition/subtraction precedes "/"
  // e.g. "a plus b divided by c" without "all divided by"
  if (!isAmbiguous && !hadExplicitBracket) {
    const divAmbMatch = s.match(/^([a-z0-9.]+)\s*([+\-])\s*([a-z0-9.]+)\s*\/\s*([a-z0-9.]+)$/i);
    if (divAmbMatch) {
      const [, a, op, b, c] = divAmbMatch;
      isAmbiguous = true;
      ambiguityReason = `Spoken division "${rawTranscript}" follows standard precedence as ${a} ${op} (${b}/${c}), or could mean (${a} ${op} ${b}) / ${c}.`;
      alternativeInfixList.push(
        {
          infix: `${a} ${op} (${b} / ${c})`,
          description: `${a} ${op === '+' ? 'plus' : 'minus'} the fraction ${b} divided by ${c}`
        },
        {
          infix: `(${a} ${op} ${b}) / ${c}`,
          description: `The quantity (${a} ${op} ${b}), all divided by ${c}`
        }
      );
    }
  }

  // Balance unclosed "(" ONLY when they came from "the quantity". If the student used explicit
  // "open/close bracket" words and they don't pair up, leave it unbalanced so validation rejects it.
  const explicitOpens = (cleaned.match(/\b(open|left|start)\s+(bracket|parenthesis|brackets|parentheses)\b/g) || []).length;
  const explicitCloses = (cleaned.match(/\b(close|right|end)\s+(bracket|parenthesis|brackets|parentheses)\b/g) || []).length;
  if (explicitOpens === explicitCloses) {
    let openCount = 0;
    for (const ch of s) {
      if (ch === '(') openCount++;
      else if (ch === ')') openCount--;
    }
    while (openCount > 0) {
      s += ' )';
      openCount--;
    }
  }

  s = s.replace(/\s+/g, ' ').trim();

  return {
    infix: s,
    preserveExplicitMultForVars,
    isAmbiguous,
    ambiguityReason,
    alternativeInfixList
  };
}

/**
 * Scans a space-separated token stream and replaces contiguous number-word sequences
 * with their numeric digits while leaving operators, variables, and other words intact.
 */
function convertSpokenNumberTokens(text: string): string {
  const rawWords = text.split(/\s+/);
  const out: string[] = [];
  let i = 0;

  while (i < rawWords.length) {
    const w = rawWords[i];
    if (isNumberWord(w)) {
      const seq: string[] = [w];
      let j = i + 1;
      while (j < rawWords.length) {
        const nextW = rawWords[j];
        if (isNumberWord(nextW)) {
          seq.push(nextW);
          j++;
        } else if (
          nextW === 'and' &&
          j + 1 < rawWords.length &&
          isNumberWord(rawWords[j + 1]) &&
          seq.some((sw) => sw === 'hundred' || sw === 'thousand' || sw === 'lakh' || sw === 'crore')
        ) {
          seq.push(nextW);
          j++;
        } else {
          break;
        }
      }
      const parsedNum = parseNumberWordSequence(seq);
      if (parsedNum !== null) {
        out.push(String(parsedNum));
        i = j;
        continue;
      }
    }
    out.push(w);
    i++;
  }

  return out.join(' ');
}

/**
 * Main entry point: Parses a spoken mathematical transcript into a structured MathParseResult.
 */
export function parseMathematicalSpeech(transcript: string): MathParseResult {
  const rawTranscript = (transcript || '').trim();
  if (!rawTranscript) {
    return {
      success: false,
      rawTranscript: '',
      expression: '',
      normalizedExpression: '',
      spokenReadback: 'No mathematical expression was heard.',
      latex: '',
      ast: null,
      confidence: 0,
      isAmbiguous: false,
      alternatives: [],
      validation: {
        isValid: false,
        errors: ['Empty transcript'],
        warnings: [],
        hasDivisionByZero: false,
        exceedsComplexityLimit: false
      }
    };
  }

  const converted = convertSpokenWordsToInfix(rawTranscript);

  // Reject unrecognised spoken words instead of silently turning them into products of letters
  // (e.g. "principal times rate" must NOT become p*r*i*n*c*i*p*a*l*...).
  const RECOGNISED_WORDS = new Set(['sqrt', 'cbrt', 'abs', 'sum', 'lcm', 'hcf', 'gcd', 'factorial', 'pi', 'infinity', 'of']);
  const unknownWord = (converted.infix.match(/[a-zA-Z]{2,}/g) || []).find(
    (w) => !RECOGNISED_WORDS.has(w.toLowerCase())
  );
  if (unknownWord) {
    return {
      success: false,
      rawTranscript,
      expression: converted.infix,
      normalizedExpression: converted.infix,
      spokenReadback: `I did not recognise the word ${unknownWord} as mathematics. Please say your answer using numbers and symbols.`,
      latex: '',
      ast: null,
      confidence: 0.1,
      isAmbiguous: false,
      alternatives: [],
      validation: {
        isValid: false,
        errors: [`Unrecognised word: ${unknownWord}`],
        warnings: [],
        hasDivisionByZero: false,
        exceedsComplexityLimit: false
      }
    };
  }

  const ast = parseInfixToAST(converted.infix);
  const validation = validateMathAST(ast, converted.infix);

  if (!ast || (!validation.isValid && !validation.hasDivisionByZero)) {
    return {
      success: false,
      rawTranscript,
      expression: converted.infix,
      normalizedExpression: converted.infix,
      spokenReadback:
        validation.errors[0] ||
        'Could not interpret the spoken mathematical expression. Please repeat clearly.',
      latex: '',
      ast: null,
      confidence: 0.2,
      isAmbiguous: false,
      alternatives: [],
      validation
    };
  }

  let displayExpr = formatDisplayExpression(ast);
  // If student explicitly spoke "Two times x" (with "times"), preserve "2*x" per Phase 3 specification
  if (
    converted.preserveExplicitMultForVars &&
    ast.type === 'binary' &&
    ast.operator === '*' &&
    ast.left.type === 'number' &&
    ast.right.type === 'variable'
  ) {
    displayExpr = `${ast.left.raw}*${ast.right.name}`;
  }

  const normalizedExpr = formatNormalizedExpression(ast, true);
  const latexExpr = formatLatexExpression(ast);
  const spokenReadback = renderASTToSpeech(ast, { asSentence: true, numberWords: true });

  const alternatives: MathAmbiguityCandidate[] = [];
  if (converted.isAmbiguous) {
    for (const alt of converted.alternativeInfixList) {
      const altAst = parseInfixToAST(alt.infix);
      if (altAst) {
        alternatives.push({
          expression: formatDisplayExpression(altAst),
          normalizedExpression: formatNormalizedExpression(altAst, true),
          spokenReadback: renderASTToSpeech(altAst, { asSentence: true, numberWords: true }),
          description: alt.description
        });
      }
    }
  }

  return {
    success: validation.isValid,
    rawTranscript,
    expression: displayExpr,
    normalizedExpression: normalizedExpr,
    spokenReadback,
    latex: latexExpr,
    ast,
    confidence: converted.isAmbiguous ? 0.72 : 0.95,
    isAmbiguous: converted.isAmbiguous,
    ambiguityReason: converted.ambiguityReason,
    alternatives,
    validation
  };
}

/**
 * Checks whether a spoken transcript is likely a mathematical expression or numeric answer
 * rather than a navigation command or generic option letter.
 */
export function isLikelyMathematicalSpeech(transcript: string): boolean {
  if (!transcript) return false;
  const clean = transcript.toLowerCase().trim();

  // Do not intercept explicit option commands like "option a", "select b", "repeat question"
  if (
    /^(option|choice|select|answer)\s+[a-d]$/i.test(clean) ||
    /^(a|b|c|d|be|bee|see|sea)$/i.test(clean) ||
    /\b(repeat|pause|resume|stop|skip|next|previous|submit|mark\s+for\s+review|help|where\s+am\s+i)\b/i.test(clean)
  ) {
    return false;
  }

  // Contains math operators, functions, numbers, or algebraic patterns
  return (
    /\b(plus|minus|times|multiplied|divided|over|upon|equals|equal|greater|less|square\s+root|cube\s+root|under\s+root|squared|cubed|power|bracket|parenthesis|percent|factorial|lcm|hcf|point|negative|half|third|fourth|quarter)\b/i.test(
      clean
    ) ||
    /[0-9+\-*/^=<>√π%]/.test(clean) ||
    isNumberWord(clean.split(/\s+/)[0])
  );
}

export { ALLOWED_VARIABLES };

