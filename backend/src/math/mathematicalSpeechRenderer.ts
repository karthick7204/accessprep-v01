/**
 * ACCESSPREP-X — Mathematical Notation-to-Speech Renderer (Phase 4)
 * Converts LaTeX, ASTs, and inline equations inside SSC MTS questions/options/explanations
 * into natural, grouping-accurate spoken English for blind and low-vision candidates.
 */

import { MathASTNode } from './mathematicalTypes.ts';
import { numberToWords, OPERATOR_PRECEDENCE } from './mathematicalGrammar.ts';
import {
  parseInfixToAST,
  normalizeLatexAndUnicodeToInfix
} from './mathematicalExpressionNormalizer.ts';
import { validateMathAST } from './mathematicalExpressionValidator.ts';

export interface SpeechRenderOptions {
  /** Capitalize the first word and append a period (default: true for standalone expressions) */
  asSentence?: boolean;
  /** Speak numbers as words ("forty-nine") vs digits ("49") (default: true) */
  numberWords?: boolean;
}

/**
 * Renders a MathASTNode into natural spoken English while preserving operator precedence and grouping.
 */
export function renderASTToSpeech(
  node: MathASTNode,
  options: SpeechRenderOptions = {}
): string {
  const useWords = options.numberWords !== false;

  function speakNum(n: number, raw: string): string {
    if (!useWords) return raw;
    if (Math.abs(n) <= 9999999) {
      return numberToWords(n);
    }
    return raw;
  }

  function walk(n: MathASTNode, isRoot: boolean): string {
    switch (n.type) {
      case 'number': {
        const base = speakNum(n.value, n.raw);
        return n.isPercentage ? `${base} percent` : base;
      }
      case 'variable':
        return n.name;
      case 'constant':
        return n.name === 'pi' ? 'pi' : 'infinity';
      case 'unary': {
        const inner = walk(n.operand, false);
        if (n.operator === '-') return `negative ${inner}`;
        if (n.operator === '+') return `positive ${inner}`;
        if (n.operator === 'factorial') return `${inner} factorial`;
        if (n.operator === 'percent') return `${inner} percent`;
        return inner;
      }
      case 'function': {
        const arg0 = n.args[0];
        if (n.name === 'sqrt' && arg0) {
          const innerSpeech = walk(arg0, false);
          if (arg0.type === 'binary') {
            return `square root of the quantity ${innerSpeech}`;
          }
          return `square root of ${innerSpeech}`;
        }
        if (n.name === 'cbrt' && arg0) {
          const innerSpeech = walk(arg0, false);
          return `cube root of ${innerSpeech}`;
        }
        if (n.name === 'abs' && arg0) {
          return `absolute value of ${walk(arg0, false)}`;
        }
        if (n.name === 'factorial' && arg0) {
          return `${walk(arg0, false)} factorial`;
        }
        if (n.name === 'sum') {
          return `summation of ${n.args.map((a) => walk(a, false)).join(' and ')}`;
        }
        if (n.name === 'lcm') {
          return `L C M of ${n.args.map((a) => walk(a, false)).join(' and ')}`;
        }
        if (n.name === 'hcf' || n.name === 'gcd') {
          return `H C F of ${n.args.map((a) => walk(a, false)).join(' and ')}`;
        }
        return `${n.name} of ${n.args.map((a) => walk(a, false)).join(', ')}`;
      }
      case 'binary': {
        // 1. Exponents: x^2 -> "x squared", x^3 -> "x cubed", x^n -> "x to the power of n"
        if (n.operator === '^') {
          const baseStr =
            n.left.type === 'binary'
              ? `open bracket ${walk(n.left, false)} close bracket`
              : walk(n.left, false);
          if (n.right.type === 'number' && n.right.value === 2) {
            return `${baseStr} squared`;
          }
          if (n.right.type === 'number' && n.right.value === 3) {
            return `${baseStr} cubed`;
          }
          const expStr =
            n.right.type === 'binary'
              ? `open bracket ${walk(n.right, false)} close bracket`
              : walk(n.right, false);
          return `${baseStr} to the power of ${expStr}`;
        }

        // 2. Division / Fractions: preserve grouping!
        // e.g. (a + b) / c -> "a plus b, all divided by c"
        // e.g. a / (b + c) -> "a divided by the quantity b plus c"
        // e.g. (a + b) / (c - d) -> "the quantity a plus b, all divided by the quantity c minus d"
        if (n.operator === '/') {
          const leftIsCompound =
            n.left.type === 'binary' &&
            (n.left.operator === '+' || n.left.operator === '-' || n.left.explicitBrackets);
          const rightIsCompound =
            n.right.type === 'binary' &&
            (n.right.operator === '+' || n.right.operator === '-' || n.right.explicitBrackets);

          const leftSpeech = walk({ ...n.left, explicitBrackets: false } as MathASTNode, false);
          const rightSpeech = walk({ ...n.right, explicitBrackets: false } as MathASTNode, false);

          if (leftIsCompound && rightIsCompound) {
            return `open bracket ${leftSpeech} close bracket, all divided by open bracket ${rightSpeech} close bracket`;
          }
          if (leftIsCompound) {
            return `${leftSpeech}, all divided by ${rightSpeech}`;
          }
          if (rightIsCompound) {
            return `${leftSpeech} divided by open bracket ${rightSpeech} close bracket`;
          }
          return `${leftSpeech} divided by ${rightSpeech}`;
        }

        // 3. Percentage of: 25% of 200 -> "twenty-five percent of two hundred"
        if (n.operator === '%_of') {
          return `${walk(n.left, false)} percent of ${walk(n.right, false)}`;
        }

        // 3b. "of" (e.g. 3/5 of 4/7): wrap compound operands so grouping is unambiguous when heard
        if (n.operator === 'of') {
          // "of" is associative: flatten chains so "3/5 of 4/7 of 5/9" reads as one list, not nested brackets
          const operands: MathASTNode[] = [];
          const collect = (c: MathASTNode) => {
            if (c.type === 'binary' && c.operator === 'of') {
              collect(c.left);
              collect(c.right);
            } else {
              operands.push(c);
            }
          };
          collect(n);
          const side = (c: MathASTNode) =>
            c.type === 'binary'
              ? `open bracket ${walk({ ...c, explicitBrackets: false } as MathASTNode, false)} close bracket`
              : walk(c, false);
          return operands.map(side).join(' of ');
        }

        // 4. Multiplication:
        // "2x" or "2 * x" -> "two times x"
        // "(x + 2) * 3" -> "open bracket x plus two close bracket multiplied by three"
        if (n.operator === '*') {
          const leftWrapped = wrapOperandForSpeech(n.left, OPERATOR_PRECEDENCE['*']);
          const rightWrapped = wrapOperandForSpeech(n.right, OPERATOR_PRECEDENCE['*']);

          if (
            n.left.type === 'binary' &&
            n.left.explicitBrackets
          ) {
            return `${leftWrapped} multiplied by ${rightWrapped}`;
          }
          if (
            n.right.type === 'binary' &&
            n.right.explicitBrackets
          ) {
            return `${leftWrapped} multiplied by ${rightWrapped}`;
          }
          return `${leftWrapped} times ${rightWrapped}`;
        }

        // 5. Addition, Subtraction, Equality, Inequality, Ratio
        const opSpokenMap: Record<string, string> = {
          '+': 'plus',
          '-': 'minus',
          '=': 'equals',
          '!=': 'is not equal to',
          '>': 'is greater than',
          '<': 'is less than',
          '>=': 'is greater than or equal to',
          '<=': 'is less than or equal to',
          ':': 'is to'
        };

        const parentPrec = OPERATOR_PRECEDENCE[n.operator] ?? 0;
        const leftSpeech = wrapOperandForSpeech(n.left, parentPrec);
        const rightSpeech = wrapOperandForSpeech(
          n.right,
          parentPrec,
          n.operator === '-'
        );

        const core = `${leftSpeech} ${opSpokenMap[n.operator] || n.operator} ${rightSpeech}`;
        if (!isRoot && n.explicitBrackets) {
          return `open bracket ${core} close bracket`;
        }
        return core;
      }
    }
  }

  function wrapOperandForSpeech(
    child: MathASTNode,
    parentPrec: number,
    isRightOfMinus = false
  ): string {
    if (child.type !== 'binary') {
      return walk(child, false);
    }
    const childPrec = OPERATOR_PRECEDENCE[child.operator] ?? 0;
    const needsBrackets =
      child.explicitBrackets ||
      childPrec < parentPrec ||
      (isRightOfMinus && (child.operator === '+' || child.operator === '-'));

    const inner = walk({ ...child, explicitBrackets: false }, false);
    if (needsBrackets) {
      return `open bracket ${inner} close bracket`;
    }
    return inner;
  }

  const rawSpeech = walk(node, true).replace(/\s+/g, ' ').trim();
  if (options.asSentence === false) {
    return rawSpeech;
  }

  if (!rawSpeech) return '';
  // Capitalize first letter ONLY if it is not a single-letter lowercase algebraic variable like "x" or "a"
  const firstWord = rawSpeech.split(/[\s,]+/)[0];
  const isSingleLowercaseVar = /^[a-z]$/.test(firstWord);
  const capitalized = isSingleLowercaseVar
    ? rawSpeech
    : rawSpeech.charAt(0).toUpperCase() + rawSpeech.slice(1);

  return capitalized.endsWith('.') ? capitalized : `${capitalized}.`;
}

/**
 * Converts a mathematical string (LaTeX or infix) into natural speech.
 * If the expression cannot be interpreted reliably, returns a safe clarification notice (Phase 4).
 */
export function renderMathExpressionToSpeech(
  expression: string,
  options: SpeechRenderOptions = { asSentence: true, numberWords: true }
): {
  spoken: string;
  isReliable: boolean;
  normalized: string;
} {
  const trimmed = (expression || '').trim();
  if (!trimmed) {
    return {
      spoken: 'Clarification is required: mathematical expression is empty.',
      isReliable: false,
      normalized: ''
    };
  }

  // Check for unbalanced raw LaTeX braces before normalization
  let braceDepth = 0;
  for (const ch of trimmed) {
    if (ch === '{') braceDepth++;
    else if (ch === '}') braceDepth--;
    if (braceDepth < 0) break;
  }
  if (braceDepth !== 0) {
    return {
      spoken: 'Clarification is required: this mathematical expression has incomplete brackets or braces.',
      isReliable: false,
      normalized: trimmed
    };
  }

  const infix = normalizeLatexAndUnicodeToInfix(trimmed);
  const ast = parseInfixToAST(infix);
  const validation = validateMathAST(ast, infix);

  if (!ast || (!validation.isValid && !validation.hasDivisionByZero)) {
    return {
      spoken: 'Clarification is required: this mathematical expression cannot be interpreted reliably.',
      isReliable: false,
      normalized: infix
    };
  }

  const spoken = renderASTToSpeech(ast, options);
  if (validation.hasDivisionByZero) {
    return {
      spoken: `${spoken.replace(/\.$/, '')}. Warning: this expression contains division by zero, which is undefined.`,
      isReliable: true,
      normalized: infix
    };
  }

  return {
    spoken,
    isReliable: true,
    normalized: infix
  };
}

/**
 * Extracts mathematical equations and expressions embedded inside a question stem or explanation.
 */
export function extractEquationsFromText(text: string): string[] {
  if (!text) return [];
  const extracted: string[] = [];

  // 1. Extract explicit LaTeX blocks ($...$, \(...\), \frac{...}{...}, \sqrt{...})
  const latexMatches = text.match(/\\frac\{[^{}]+\}\{[^{}]+\}|\\sqrt(?:\[\d+\])?\{[^{}]+\}|\$[^$]+\$/g);
  if (latexMatches) {
    for (const m of latexMatches) {
      extracted.push(m.trim());
    }
  }

  // 2. Extract algebraic/arithmetic expressions in SSC MTS question text
  // Examples: "(2467)^153 * (341)^72", "45 - [38 - {60 / 3 - (6 - 9 / 3)}]", "(x^2 - y^2) / (x - y)", "33(x + y) = 528"
  const inlineExprRegex =
    /(?:\([a-zA-Z0-9.\s+\-*/^]+\)|\[[^\]]+\]|\b[a-zA-Z0-9.]+\^[a-zA-Z0-9.]+\b|\b\d+(?:\.\d+)?\s*(?:[+\-*/^=:]|\bof\b)\s*[a-zA-Z0-9.([\]{}\s+\-*/^=:]+|\b[a-zA-Z]\s*:\s*[a-zA-Z]\s*=\s*\d+\s*:\s*\d+)/g;

  const matches = text.match(inlineExprRegex);
  if (matches) {
    for (const raw of matches) {
      const cleaned = raw.replace(/[.,;:?]+$/, '').trim();
      if (cleaned.length >= 3 && /[+\-*/^=:]/.test(cleaned) && !extracted.includes(cleaned)) {
        extracted.push(cleaned);
      }
    }
  }

  return extracted;
}

// ---------------------------------------------------------------------------
// Span-based inline mathematics → speech (replaces naive global string substitution)
//
// Strategy: locate maximal runs that LOOK like mathematics (operands joined by operators/brackets),
// parse each run into an AST and speak the AST. Everything outside those runs — ordinary English,
// units, "Rs.", option words such as "loss" — is left untouched. A run that fails to parse is never
// guessed at: it falls back to literal symbol names.
// ---------------------------------------------------------------------------

const FN_CALL = /^(?:LCM|HCF|GCD|Sqrt|sqrt|abs)\s*\([^()]*\)/;
const VAR_PRODUCT = /^\d*(?:abc|xyz|ab|ac|bc|xy|yz|xz|pq|qr|pr)\b/;
const COEF_VAR = /^\d+[a-fp-rx-z]\b/;
const PLAIN_NUM = /^\d+(?:\.\d+)?/;
const SINGLE_LETTER = /^[a-zA-Z]\b/;

function matchOperand(s: string, i: number): number {
  const rest = s.slice(i, i + 80);
  for (const re of [FN_CALL, VAR_PRODUCT, COEF_VAR, PLAIN_NUM, SINGLE_LETTER]) {
    const m = rest.match(re);
    if (m && m[0].length > 0) return m[0].length;
  }
  return 0;
}

function skipSpaces(s: string, i: number): number {
  while (i < s.length && (s[i] === ' ' || s[i] === '\t')) i++;
  return i;
}

interface MathSpan {
  start: number;
  end: number;
}

function matchOperatorAt(s: string, j: number): { op: string; len: number; strong: boolean } | null {
  const two = s.slice(j, j + 2);
  if (two === '>=' || two === '<=' || two === '!=') return { op: two, len: 2, strong: true };
  const ch = s[j];
  if (ch === ':') {
    const spaced = (j > 0 && s[j - 1] === ' ') && s[j + 1] === ' ';
    return spaced ? { op: ':', len: 1, strong: true } : null; // "9:30" is a time, not a ratio
  }
  if ('+*/^=<>'.includes(ch)) return { op: ch, len: 1, strong: true };
  if (ch === '-') {
    const spaced = j > 0 && s[j - 1] === ' ' && s[j + 1] === ' ';
    return { op: '-', len: 1, strong: !!spaced };
  }
  if (/^of\b/i.test(s.slice(j, j + 3)) && s[j + 2] === ' ') return { op: 'of', len: 2, strong: true };
  return null;
}

function scanMathSpan(s: string, start: number): MathSpan | null {
  let i = start;
  let depth = 0;
  let lastGood = -1;
  let strong = 0;
  let spacedMinus = 0;

  for (;;) {
    // optional sign + opening brackets
    for (;;) {
      if ('([{'.includes(s[i] ?? '')) {
        depth++;
        i = skipSpaces(s, i + 1);
      } else if (s[i] === '-' && i + 1 < s.length && /[\d\[\({a-zA-Z]/.test(s[i + 1]) && (i === start || /[-+*/^=<>:(\[{]\s*$/.test(s.slice(Math.max(start, i - 3), i)))) {
        i++;
      } else break;
    }
    const len = matchOperand(s, i);
    if (!len) break;
    i += len;
    if (depth === 0) lastGood = i;

    // postfix %, !, and closing brackets
    for (;;) {
      const j = skipSpaces(s, i);
      if (')]}'.includes(s[j] ?? '') && depth > 0 && s[j] !== undefined) {
        depth--;
        i = j + 1;
        if (depth === 0) lastGood = i;
        continue;
      }
      if (s[i] === '%' || s[i] === '!') {
        if (s[i] === '%') strong++;
        i++;
        if (depth === 0) lastGood = i;
        continue;
      }
      break;
    }

    // operator then another operand
    const j = skipSpaces(s, i);
    const op = matchOperatorAt(s, j);
    if (!op) {
      // implicit multiplication directly before a bracket: 33(x + y), (x + 15)(x - 13)
      if (s[i] === '(' && lastGood === i) continue;
      break;
    }
    let k = skipSpaces(s, j + op.len);
    const startsOperand =
      '([{'.includes(s[k] ?? '') ||
      matchOperand(s, k) > 0 ||
      (s[k] === '-' && /[\d(\[{a-zA-Z]/.test(s[k + 1] ?? ''));
    if (!startsOperand) break;
    if (op.strong) strong++;
    else if (op.op === '-') spacedMinus++;
    i = k;
  }

  if (lastGood <= start) return null;
  const text = s.slice(start, lastGood);
  if (strong === 0 && spacedMinus === 0) return null;
  // must contain a real operator/percent, not just a bracketed or lone operand
  if (!/[+\-*/^=<>:%!]|\bof\b/i.test(text)) return null;
  return { start, end: lastGood };
}

function findMathSpans(s: string): MathSpan[] {
  const spans: MathSpan[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    const prev = i > 0 ? s[i - 1] : ' ';
    const canStart =
      /[\d\[\({a-zA-Z]/.test(ch) &&
      !/[A-Za-z0-9._]/.test(prev) &&
      !(ch === '.' && /\d/.test(prev));
    if (canStart) {
      const span = scanMathSpan(s, i);
      if (span) {
        spans.push(span);
        i = span.end;
        continue;
      }
      // skip the whole word/number so we never start inside it
      let j = i + 1;
      while (j < s.length && /[A-Za-z0-9]/.test(s[j])) j++;
      i = j;
      continue;
    }
    i++;
  }
  return spans;
}

/** Literal, non-guessing fallback for a span the grammar could not parse. */
function literalSymbolFallback(span: string): string {
  return span
    .replace(/>=/g, ' is greater than or equal to ')
    .replace(/<=/g, ' is less than or equal to ')
    .replace(/!=/g, ' is not equal to ')
    .replace(/=/g, ' equals ')
    .replace(/\+/g, ' plus ')
    .replace(/ - /g, ' minus ')
    .replace(/\*/g, ' star ')
    .replace(/\//g, ' divided by ')
    .replace(/\^/g, ' to the power of ')
    .replace(/%/g, ' percent ')
    .replace(/[\[({]/g, ' open bracket ')
    .replace(/[\])}]/g, ' close bracket ')
    .replace(/\s+/g, ' ')
    .trim();
}

function speakSpan(spanText: string): string {
  const ast = parseInfixToAST(spanText);
  if (!ast || ast.type === 'variable' || ast.type === 'number') return literalSymbolFallback(spanText);
  return renderASTToSpeech(ast, { asSentence: false, numberWords: false });
}

/**
 * Converts a full question stem, option, or explanation containing inline mathematics
 * into natural screen-reader and TTS-friendly speech.
 */
export function renderTextWithMathToSpeech(text: string): string {
  if (!text) return '';
  let work = text;

  // Explicit LaTeX first (parsed structurally, not string-replaced)
  work = work.replace(/\\frac\{[^{}]*\}\{[^{}]*\}|\\sqrt(?:\[\d+\])?\{[^{}]*\}/g, (full) => {
    const r = renderMathExpressionToSpeech(full, { asSentence: false, numberWords: false });
    return r.isReliable ? r.spoken : 'a mathematical expression that needs clarification';
  });

  // Pre-normalize inline Unicode math symbols (√, ∛, ×, ÷, ², ³) and LaTeX (\times, \div)
  work = work
    .replace(/√\s*\(([^)]+)\)/g, 'sqrt($1)')
    .replace(/√\s*([0-9]+(?:\.[0-9]+)?|[a-zA-Z]+)/g, 'sqrt($1)')
    .replace(/∛\s*\(([^)]+)\)/g, 'cbrt($1)')
    .replace(/∛\s*([0-9]+(?:\.[0-9]+)?|[a-zA-Z]+)/g, 'cbrt($1)')
    .replace(/×|\\times\b/g, ' * ')
    .replace(/÷|\\div\b/g, ' / ')
    .replace(/(\w)²/g, '$1^2')
    .replace(/(\w)³/g, '$1^3')
    .replace(/\)\s*²/g, ')^2')
    .replace(/\)\s*³/g, ')^3');

  work = work.replace(/(\d+\.\d+)\.{3}/g, '$1 repeating');
  work = work.replace(/\.{3}/g, ' and so on ');

  // A "*" is a missing-digit placeholder (not multiplication) when it lacks an operand on either side
  // ("place of *", "+ *", "21 + *") or sits glued between digits in a digit-puzzle ("5432*7").
  // Placeholders become the letter Z while spans are parsed, and are spoken as "star" afterwards.
  let usedPlaceholder = false;
  if (!/\bZ\b/.test(work)) {
    const digitPuzzle = /\b(digit|place of|missing)\b/i.test(work);
    work = work.replace(/\*/g, (m, offset: number, whole: string) => {
      const left = whole.slice(0, offset);
      const right = whole.slice(offset + 1);
      const leftOperand = /(\d|[A-Za-z]\b|[)\]}])\s*$/.test(left) && !/\b(of|is|at|the|to)\s*$/i.test(left);
      const rightOperand = /^\s*(\d|[(\[{]|[A-Za-z]\b)/.test(right);
      const gluedDigits = /\d$/.test(left) && /^\d/.test(right);
      if (!(leftOperand && rightOperand) || (gluedDigits && digitPuzzle)) {
        usedPlaceholder = true;
        return 'Z';
      }
      return m;
    });
  }

  // Locate and speak mathematical spans right-to-left so indices stay valid.
  const spans = findMathSpans(work);
  for (let k = spans.length - 1; k >= 0; k--) {
    const { start, end } = spans[k];
    work = `${work.slice(0, start)}${speakSpan(work.slice(start, end))}${work.slice(end)}`;
  }

  if (usedPlaceholder) work = work.replace(/(\d)Z(?=\d)/g, '$1 star ').replace(/\bZ\b/g, 'star');

  work = work
    .replace(/=>|⇒/g, ', which implies ')
    .replace(/->|→/g, ' then ')
    .replace(/\s>=\s/g, ' is greater than or equal to ')
    .replace(/\s<=\s/g, ' is less than or equal to ')
    .replace(/≠/g, ' is not equal to ')
    .replace(/≥/g, ' is greater than or equal to ')
    .replace(/≤/g, ' is less than or equal to ')
    .replace(/(\w)\^(\w)/g, '$1 to the power of $2')
    .replace(/\)\^(\w)/g, ') to the power of $1')
    .replace(/\[|\{/g, ' open bracket ')
    .replace(/\]|\}/g, ' close bracket ')
    .replace(/=/g, ' equals ')
    .replace(/ = /g, ' equals ')
    .replace(/ \+ /g, ' plus ')
    .replace(/ - /g, ' minus ')
    .replace(/ \* /g, ' times ')
    .replace(/ \/ /g, ' divided by ')
    .replace(/\b(\d+(?:\.\d+)?)\s*%/g, '$1 percent')
    .replace(/\bsqrt\s*\(([^()]*)\)/gi, (_, arg) => `square root of ${arg.trim()}`)
    .replace(/\bcbrt\s*\(([^()]*)\)/gi, (_, arg) => `cube root of ${arg.trim()}`)
    .replace(/\b(\d+)\s*:\s*(\d+)\b(?!\s*(?:am|pm|a\.m\.|p\.m\.))/gi, '$1 is to $2')
    .replace(/(\w)_(\w)/g, '$1 $2')
    .replace(/\b(LCM|HCF|GCD)\s*\(([^)]*)\)/gi, (_, fn, args) => `${fn.toUpperCase().split('').join(' ')} of ${args}`);

  return work.replace(/\s+/g, ' ').replace(/\s+([.,;?!])/g, '$1').trim();
}
