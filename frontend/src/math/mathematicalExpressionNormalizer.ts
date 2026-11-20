/**
 * ACCESSPREP-X — Mathematical Expression Normalizer & Algebraic Infix Parser
 * Converts LaTeX, Unicode math, and algebraic notation into a structured MathASTNode,
 * and serializes ASTs into Display Notation, Normalized Precedence-Explicit Notation, and LaTeX.
 */

import {
  MathASTNode,
  MathOperator,
  MathFunctionName
} from './mathematicalTypes.ts';
import { OPERATOR_PRECEDENCE } from './mathematicalGrammar.ts';

/**
 * Pre-normalizes LaTeX commands and Unicode mathematical characters into standard ASCII math notation.
 */
export function normalizeLatexAndUnicodeToInfix(input: string): string {
  if (!input) return '';
  let s = input.trim();

  // Strip surrounding math mode delimiters $...$ or \(...\) or \[...\]
  s = s.replace(/^\$\$?([\s\S]*?)\$\$?$/, '$1');
  s = s.replace(/^\\\(([\s\S]*?)\\\)$/, '$1');
  s = s.replace(/^\\\[([\s\S]*?)\\\]$/, '$1');

  // Remove \left and \right
  s = s.replace(/\\left\s*/g, '');
  s = s.replace(/\\right\s*/g, '');
  s = s.replace(/\\text\{([^}]*)\}/g, '$1');

  // Convert nested \frac{num}{den} iteratively
  let prev = '';
  let guard = 0;
  while (s.includes('\\frac') && s !== prev && guard < 15) {
    prev = s;
    guard++;
    s = replaceLatexFrac(s);
  }

  // Convert \sqrt[3]{arg} -> cbrt(arg) and \sqrt{arg} -> sqrt(arg)
  guard = 0;
  prev = '';
  while (s.includes('\\sqrt') && s !== prev && guard < 15) {
    prev = s;
    guard++;
    s = replaceLatexSqrt(s);
  }

  // Exponents with braces: ^{...} -> ^(...)
  s = s.replace(/\^\{([^{}]+)\}/g, (_, inner) => {
    const trimmedInner = inner.trim();
    return /^[a-zA-Z0-9]+$/.test(trimmedInner) ? `^${trimmedInner}` : `^(${trimmedInner})`;
  });

  // Standard LaTeX operators & symbols
  s = s
    .replace(/\\times\b/g, ' * ')
    .replace(/\\cdot\b/g, ' * ')
    .replace(/\\div\b/g, ' / ')
    .replace(/\\neq\b|\\ne\b/g, ' != ')
    .replace(/\\geq\b|\\ge\b/g, ' >= ')
    .replace(/\\leq\b|\\le\b/g, ' <= ')
    .replace(/\\pi\b/g, 'pi')
    .replace(/\\infty\b/g, 'infinity')
    .replace(/\\sum\b/g, 'sum')
    .replace(/\\%/g, '%');

  // Unicode operators & superscripts
  s = s
    .replace(/×/g, ' * ')
    .replace(/÷/g, ' / ')
    .replace(/−|–|—/g, '-')
    .replace(/≠/g, ' != ')
    .replace(/≥/g, ' >= ')
    .replace(/≤/g, ' <= ')
    .replace(/π/g, 'pi')
    .replace(/∞/g, 'infinity')
    .replace(/√\s*\(([^)]+)\)/g, 'sqrt($1)')
    .replace(/√\s*([0-9]+(?:\.[0-9]+)?|[a-zA-Z]+)/g, 'sqrt($1)')
    .replace(/∛\s*\(([^)]+)\)/g, 'cbrt($1)')
    .replace(/∛\s*([0-9]+(?:\.[0-9]+)?|[a-zA-Z]+)/g, 'cbrt($1)')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3');

  // Normalize [ ] and { } brackets into ( ) for algebraic parsing
  s = s.replace(/\[|\{/g, '(').replace(/\]|\}/g, ')');

  // Normalize "of" when used between fractions/percentages/numbers:
  // e.g. "25% of 200" stays as `%_of` token in tokenizer, while "1/2 of (4/3 - 2/3)" -> "1/2 * (4/3 - 2/3)"
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function extractBracedGroup(str: string, startBraceIdx: number): { content: string; endIdx: number } | null {
  if (str[startBraceIdx] !== '{') return null;
  let depth = 0;
  for (let i = startBraceIdx; i < str.length; i++) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') {
      depth--;
      if (depth === 0) {
        return {
          content: str.slice(startBraceIdx + 1, i),
          endIdx: i
        };
      }
    }
  }
  return null;
}

function replaceLatexFrac(str: string): string {
  const idx = str.indexOf('\\frac');
  if (idx === -1) return str;
  let cursor = idx + 5;
  while (cursor < str.length && /\s/.test(str[cursor])) cursor++;
  const numGroup = extractBracedGroup(str, cursor);
  if (!numGroup) return str;
  cursor = numGroup.endIdx + 1;
  while (cursor < str.length && /\s/.test(str[cursor])) cursor++;
  const denGroup = extractBracedGroup(str, cursor);
  if (!denGroup) return str;

  const num = numGroup.content.trim();
  const den = denGroup.content.trim();
  const numWrapped = /^[a-zA-Z0-9.]+$/.test(num) ? num : `(${num})`;
  const denWrapped = /^[a-zA-Z0-9.]+$/.test(den) ? den : `(${den})`;

  return `${str.slice(0, idx)}(${numWrapped}/${denWrapped})${str.slice(denGroup.endIdx + 1)}`;
}

function replaceLatexSqrt(str: string): string {
  const idx = str.indexOf('\\sqrt');
  if (idx === -1) return str;
  let cursor = idx + 5;
  while (cursor < str.length && /\s/.test(str[cursor])) cursor++;
  let fnName = 'sqrt';
  if (str[cursor] === '[') {
    const closeBracket = str.indexOf(']', cursor);
    if (closeBracket !== -1) {
      const rootDeg = str.slice(cursor + 1, closeBracket).trim();
      if (rootDeg === '3') fnName = 'cbrt';
      cursor = closeBracket + 1;
    }
  }
  while (cursor < str.length && /\s/.test(str[cursor])) cursor++;
  const argGroup = extractBracedGroup(str, cursor);
  if (!argGroup) return str;
  return `${str.slice(0, idx)}${fnName}(${argGroup.content.trim()})${str.slice(argGroup.endIdx + 1)}`;
}

// ---------------------------------------------------------------------------
// Infix Mathematical Tokenizer & Precedence-Climbing Parser
// ---------------------------------------------------------------------------

interface InfixToken {
  type: 'NUM' | 'VAR' | 'CONST' | 'FUNC' | 'OP' | 'LPAREN' | 'RPAREN' | 'COMMA' | 'POSTFIX';
  value: string;
}

const KNOWN_FUNCTIONS = new Set<string>([
  'sqrt',
  'cbrt',
  'abs',
  'factorial',
  'sum',
  'lcm',
  'hcf',
  'gcd'
]);

export function tokenizeInfixExpression(raw: string): InfixToken[] {
  const s = normalizeLatexAndUnicodeToInfix(raw);
  const tokens: InfixToken[] = [];
  let i = 0;

  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Check "% of "
    const rem = s.slice(i);
    const pctOfMatch = rem.match(/^%\s+of\b/i);
    if (pctOfMatch) {
      tokens.push({ type: 'OP', value: '%_of' });
      i += pctOfMatch[0].length;
      continue;
    }

    // Check word "of" used as multiplication (e.g. "3/5 of 4/7")
    const ofWordMatch = rem.match(/^of\b/i);
    if (ofWordMatch && tokens.length > 0) {
      tokens.push({ type: 'OP', value: 'of' });
      i += ofWordMatch[0].length;
      continue;
    }

    // Multi-char operators: !=, >=, <=, **
    if (s.slice(i, i + 2) === '!=') {
      tokens.push({ type: 'OP', value: '!=' });
      i += 2;
      continue;
    }
    if (s.slice(i, i + 2) === '>=') {
      tokens.push({ type: 'OP', value: '>=' });
      i += 2;
      continue;
    }
    if (s.slice(i, i + 2) === '<=') {
      tokens.push({ type: 'OP', value: '<=' });
      i += 2;
      continue;
    }
    if (s.slice(i, i + 2) === '**') {
      tokens.push({ type: 'OP', value: '^' });
      i += 2;
      continue;
    }

    // Single-char operators
    if ('+-*/^=><:'.includes(ch)) {
      tokens.push({ type: 'OP', value: ch });
      i++;
      continue;
    }

    // Postfix % or !
    if (ch === '%' || ch === '!') {
      tokens.push({ type: 'POSTFIX', value: ch });
      i++;
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'COMMA', value: ',' });
      i++;
      continue;
    }

    // Number literal (including recurring decimal notation 0.333...)
    const numMatch = rem.match(/^\d+(?:\.\d+)?(?:\.{3})?/);
    if (numMatch) {
      let numStr = numMatch[0];
      if (numStr.endsWith('...')) {
        numStr = numStr.replace(/\.{3}$/, '');
      }
      tokens.push({ type: 'NUM', value: numStr });
      i += numMatch[0].length;
      continue;
    }

    // Identifier (function, constant, or variable)
    const idMatch = rem.match(/^[a-zA-Z]+/);
    if (idMatch) {
      const word = idMatch[0];
      const lower = word.toLowerCase();

      if (KNOWN_FUNCTIONS.has(lower)) {
        tokens.push({ type: 'FUNC', value: lower });
      } else if (lower === 'pi') {
        tokens.push({ type: 'CONST', value: 'pi' });
      } else if (lower === 'infinity' || lower === 'inf') {
        tokens.push({ type: 'CONST', value: 'infinity' });
      } else if (word.length === 1) {
        tokens.push({ type: 'VAR', value: word });
      } else {
        // Multi-letter implicit product of single-letter variables (e.g. "ab" -> a * b)
        for (let k = 0; k < word.length; k++) {
          if (k > 0) tokens.push({ type: 'OP', value: '*' });
          tokens.push({ type: 'VAR', value: word[k] });
        }
      }
      i += word.length;
      continue;
    }

    // Unrecognized character: fail tokenization by throwing
    throw new Error(`Unrecognized character "${ch}" at position ${i}`);
  }

  // Insert implicit multiplication tokens where appropriate:
  // e.g. 2x -> 2 * x, 2(x+1) -> 2 * (x+1), (a+b)(c+d) -> (a+b) * (c+d), 2 sqrt(3) -> 2 * sqrt(3)
  const withImplicitMult: InfixToken[] = [];
  for (let idx = 0; idx < tokens.length; idx++) {
    const curr = tokens[idx];
    if (idx > 0) {
      const prevTok = tokens[idx - 1];
      const prevEndsTerm =
        prevTok.type === 'NUM' ||
        prevTok.type === 'VAR' ||
        prevTok.type === 'CONST' ||
        prevTok.type === 'RPAREN' ||
        prevTok.type === 'POSTFIX';
      const currStartsTerm =
        curr.type === 'VAR' ||
        curr.type === 'CONST' ||
        curr.type === 'FUNC' ||
        curr.type === 'LPAREN';

      if (prevEndsTerm && currStartsTerm) {
        // Don't insert '*' between FUNC and LPAREN (handled by prevEndsTerm not including FUNC)
        withImplicitMult.push({ type: 'OP', value: '*' });
      }
    }
    withImplicitMult.push(curr);
  }

  return withImplicitMult;
}

/**
 * Parses an infix mathematical string into a structured MathASTNode.
 */
export function parseInfixToAST(input: string): MathASTNode | null {
  try {
    const tokens = tokenizeInfixExpression(input);
    if (tokens.length === 0) return null;

    let pos = 0;

    function peek(): InfixToken | undefined {
      return tokens[pos];
    }

    function consume(): InfixToken {
      return tokens[pos++];
    }

    function parsePrimary(): MathASTNode {
      const tok = peek();
      if (!tok) {
        throw new Error('Unexpected end of mathematical expression');
      }

      // Unary + or -
      if (tok.type === 'OP' && (tok.value === '-' || tok.value === '+')) {
        consume();
        const operand = parseExpression(5); // High precedence for unary sign
        return {
          type: 'unary',
          operator: tok.value as '-' | '+',
          operand
        };
      }

      if (tok.type === 'NUM') {
        consume();
        return {
          type: 'number',
          value: Number(tok.value),
          raw: tok.value
        };
      }

      if (tok.type === 'VAR') {
        consume();
        return {
          type: 'variable',
          name: tok.value
        };
      }

      if (tok.type === 'CONST') {
        consume();
        return {
          type: 'constant',
          name: tok.value as 'pi' | 'infinity',
          value: tok.value === 'pi' ? Math.PI : Infinity
        };
      }

      if (tok.type === 'FUNC') {
        const fnTok = consume();
        const next = peek();
        if (next && next.type === 'LPAREN') {
          consume(); // '('
          const args: MathASTNode[] = [];
          if (peek()?.type !== 'RPAREN') {
            args.push(parseExpression(0));
            while (peek()?.type === 'COMMA') {
              consume();
              args.push(parseExpression(0));
            }
          }
          if (peek()?.type !== 'RPAREN') {
            throw new Error(`Missing closing parenthesis for function ${fnTok.value}`);
          }
          consume(); // ')'
          return {
            type: 'function',
            name: fnTok.value as MathFunctionName,
            args
          };
        } else {
          // Function applied to next primary without parens: e.g. sqrt 49
          const arg = parseExpression(5);
          return {
            type: 'function',
            name: fnTok.value as MathFunctionName,
            args: [arg]
          };
        }
      }

      if (tok.type === 'LPAREN') {
        consume(); // '('
        const inner = parseExpression(0);
        if (peek()?.type !== 'RPAREN') {
          throw new Error('Missing closing parenthesis');
        }
        consume(); // ')'
        if (inner.type === 'binary') {
          inner.explicitBrackets = true;
        }
        return inner;
      }

      throw new Error(`Unexpected token "${tok.value}"`);
    }

    function parsePostfix(): MathASTNode {
      let node = parsePrimary();
      while (peek()?.type === 'POSTFIX') {
        const pf = consume();
        if (pf.value === '!') {
          node = {
            type: 'unary',
            operator: 'factorial',
            operand: node,
            postfix: true
          };
        } else if (pf.value === '%') {
          node = {
            type: 'unary',
            operator: 'percent',
            operand: node,
            postfix: true
          };
        }
      }
      return node;
    }

    function parseExpression(minPrec: number): MathASTNode {
      let left = parsePostfix();

      while (true) {
        const tok = peek();
        if (!tok || tok.type !== 'OP') break;

        const prec = OPERATOR_PRECEDENCE[tok.value] ?? 0;
        if (prec <= minPrec) break;

        consume();
        // Right-associative for '^', left-associative for others
        const nextMinPrec = tok.value === '^' ? prec - 1 : prec;
        const right = parseExpression(nextMinPrec);

        left = {
          type: 'binary',
          operator: tok.value as MathOperator,
          left,
          right,
          isFraction: tok.value === '/'
        };
      }

      return left;
    }

    const ast = parseExpression(0);
    if (pos < tokens.length) {
      throw new Error(`Unexpected trailing token "${tokens[pos].value}"`);
    }
    return ast;
  } catch {
    return null;
  }
}

/**
 * Formats an AST into clean human-readable mathematical display notation:
 * - "2x + 5 = 15"
 * - "3/4"
 * - "sqrt(49)"
 * - "x^2 + 5 = 14"
 * - "(x + 2) * 3"
 * - "25% of 200"
 */
export function formatDisplayExpression(node: MathASTNode | null): string {
  if (!node) return '';

  switch (node.type) {
    case 'number':
      return node.isPercentage ? `${node.raw}%` : node.raw;
    case 'variable':
      return node.name;
    case 'constant':
      return node.name === 'pi' ? 'pi' : 'infinity';
    case 'unary': {
      const inner = formatDisplayExpression(node.operand);
      const wrap = node.operand.type === 'binary' ? `(${inner})` : inner;
      if (node.operator === 'factorial') return `${wrap}!`;
      if (node.operator === 'percent') return `${wrap}%`;
      return `${node.operator}${wrap}`;
    }
    case 'function': {
      const argsStr = node.args.map(formatDisplayExpression).join(', ');
      return `${node.name}(${argsStr})`;
    }
    case 'binary': {
      if (node.operator === '%_of') {
        return `${formatDisplayExpression(node.left)}% of ${formatDisplayExpression(node.right)}`;
      }

      // Coefficient * Variable (e.g. 2 * x -> 2x, 2 * x^2 -> 2x^2) when not explicitly bracketed
      if (
        node.operator === '*' &&
        node.left.type === 'number' &&
        !node.right.explicitBrackets &&
        (node.right.type === 'variable' ||
          (node.right.type === 'binary' && node.right.operator === '^' && node.right.left.type === 'variable'))
      ) {
        return `${formatDisplayExpression(node.left)}${formatDisplayExpression(node.right)}`;
      }

      const parentPrec = OPERATOR_PRECEDENCE[node.operator] ?? 0;
      const leftStr = wrapChildForDisplay(node.left, parentPrec, false);
      const rightStr = wrapChildForDisplay(node.right, parentPrec, node.operator === '-' || node.operator === '/');

      if (node.operator === '^') {
        return `${leftStr}^${rightStr}`;
      }

      if (node.operator === '/') {
        const simpleLeft = node.left.type === 'number' || node.left.type === 'variable';
        const simpleRight = node.right.type === 'number' || node.right.type === 'variable';
        if (simpleLeft && simpleRight && !node.left.explicitBrackets && !node.right.explicitBrackets) {
          return `${leftStr}/${rightStr}`;
        }
        return `${leftStr} / ${rightStr}`;
      }

      return `${leftStr} ${node.operator} ${rightStr}`;
    }
  }
}

function wrapChildForDisplay(child: MathASTNode, parentPrec: number, isRightOfNonCommutative: boolean): string {
  const rendered = formatDisplayExpression(child);
  if (child.type !== 'binary') return rendered;
  if (child.explicitBrackets) return `(${rendered})`;
  const childPrec = OPERATOR_PRECEDENCE[child.operator] ?? 0;
  if (childPrec < parentPrec || (isRightOfNonCommutative && childPrec === parentPrec)) {
    return `(${rendered})`;
  }
  return rendered;
}

/**
 * Formats an AST into canonical operator-and-precedence-explicit notation (Phase 6):
 * - "Two plus three multiplied by four" -> "2 + (3 * 4)"
 * - "Two times x" -> "2*x"
 */
export function formatNormalizedExpression(node: MathASTNode | null, isRoot = true): string {
  if (!node) return '';

  switch (node.type) {
    case 'number':
      return node.isPercentage ? `(${node.raw} / 100)` : node.raw;
    case 'variable':
      return node.name;
    case 'constant':
      return node.name;
    case 'unary': {
      const inner = formatNormalizedExpression(node.operand, false);
      if (node.operator === 'factorial') return `factorial(${inner})`;
      if (node.operator === 'percent') return `(${inner} / 100)`;
      return `${node.operator}${node.operand.type === 'binary' ? `(${inner})` : inner}`;
    }
    case 'function': {
      const args = node.args.map((a) => formatNormalizedExpression(a, true)).join(', ');
      return `${node.name}(${args})`;
    }
    case 'binary': {
      if (node.operator === '%_of') {
        const l = formatNormalizedExpression(node.left, false);
        const r = formatNormalizedExpression(node.right, false);
        return `(${l}% of ${r})`;
      }

      const isRelation = ['=', '!=', '>', '<', '>=', '<='].includes(node.operator);
      const childIsRoot = isRelation;
      const l = formatNormalizedExpression(node.left, childIsRoot);
      const r = formatNormalizedExpression(node.right, childIsRoot);

      // Atom-like terms (coefficient*variable, variable^number) never need extra grouping
      const isAtomTerm =
        (node.operator === '*' && node.left.type === 'number' && node.right.type === 'variable') ||
        (node.operator === '^' && node.left.type === 'variable' && node.right.type === 'number');
      if (isAtomTerm) {
        return node.operator === '^' ? `${l}^${r}` : `${l}*${r}`;
      }

      const core = node.operator === '^' ? `${l}^${r}` : `${l} ${node.operator} ${r}`;

      if (!isRoot && !isRelation) {
        return `(${core})`;
      }
      return core;
    }
  }
}

/**
 * Formats a MathASTNode into clean LaTeX for visual display (Phase 8).
 */
export function formatLatexExpression(node: MathASTNode | null): string {
  if (!node) return '';

  switch (node.type) {
    case 'number':
      return node.isPercentage ? `${node.raw}\\%` : node.raw;
    case 'variable':
      return node.name;
    case 'constant':
      return node.name === 'pi' ? '\\pi' : '\\infty';
    case 'unary': {
      const inner = formatLatexExpression(node.operand);
      const wrapped = node.operand.type === 'binary' ? `\\left(${inner}\\right)` : inner;
      if (node.operator === 'factorial') return `${wrapped}!`;
      if (node.operator === 'percent') return `${wrapped}\\%`;
      return `${node.operator}${wrapped}`;
    }
    case 'function': {
      if (node.name === 'sqrt' && node.args.length === 1) {
        return `\\sqrt{${formatLatexExpression(node.args[0])}}`;
      }
      if (node.name === 'cbrt' && node.args.length === 1) {
        return `\\sqrt[3]{${formatLatexExpression(node.args[0])}}`;
      }
      if (node.name === 'abs' && node.args.length === 1) {
        return `\\left|${formatLatexExpression(node.args[0])}\\right|`;
      }
      return `\\operatorname{${node.name}}\\left(${node.args.map(formatLatexExpression).join(', ')}\\right)`;
    }
    case 'binary': {
      if (node.operator === '/') {
        return `\\frac{${formatLatexExpression(node.left)}}{${formatLatexExpression(node.right)}}`;
      }
      if (node.operator === '^') {
        const base =
          node.left.type === 'binary'
            ? `\\left(${formatLatexExpression(node.left)}\\right)`
            : formatLatexExpression(node.left);
        return `${base}^{${formatLatexExpression(node.right)}}`;
      }
      if (node.operator === '%_of') {
        return `${formatLatexExpression(node.left)}\\% \\text{ of } ${formatLatexExpression(node.right)}`;
      }

      const opMap: Record<string, string> = {
        '*': '\\times',
        '!=': '\\neq',
        '>=': '\\geq',
        '<=': '\\leq',
        '+': '+',
        '-': '-',
        '=': '=',
        '>': '>',
        '<': '<',
        ':': ':',
        of: '\\text{ of }'
      };

      const l =
        node.left.type === 'binary' && node.left.explicitBrackets
          ? `\\left(${formatLatexExpression(node.left)}\\right)`
          : formatLatexExpression(node.left);
      const r =
        node.right.type === 'binary' && node.right.explicitBrackets
          ? `\\left(${formatLatexExpression(node.right)}\\right)`
          : formatLatexExpression(node.right);

      if (node.operator === '*' && node.left.type === 'number' && node.right.type === 'variable') {
        return `${l}${r}`;
      }

      return `${l} ${opMap[node.operator] || node.operator} ${r}`;
    }
  }
}

