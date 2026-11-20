/**
 * ACCESSPREP-X — Deterministic Mathematical Evaluator & Answer-Equivalence Engine (Phase 7 fallback, Phase 10)
 * Pure AST evaluation: never uses eval()/Function. Used client- and server-side, and as the fallback when
 * the Python SymPy engine is unavailable.
 */

import { MathASTNode, MathEquivalenceResult, MathEvaluationResult } from './mathematicalTypes.ts';
import {
  parseInfixToAST,
  normalizeLatexAndUnicodeToInfix,
  formatDisplayExpression,
  formatNormalizedExpression
} from './mathematicalExpressionNormalizer.ts';
import { validateMathAST } from './mathematicalExpressionValidator.ts';
import { numberToWords } from './mathematicalGrammar.ts';
import { renderASTToSpeech } from './mathematicalSpeechRenderer.ts';

export const NUMERIC_TOLERANCE = 1e-6;

type VarEnv = Record<string, number>;

function gcdInt(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    [x, y] = [y, x % y];
  }
  return x;
}

/** Evaluate an AST with variable bindings. Returns NaN for undefined, Infinity for division by zero. */
export function evaluateAST(node: MathASTNode, env: VarEnv = {}): number {
  switch (node.type) {
    case 'number':
      return node.isPercentage ? node.value / 100 : node.value;
    case 'constant':
      return node.value;
    case 'variable': {
      const v = env[node.name];
      return v === undefined ? NaN : v;
    }
    case 'unary': {
      const v = evaluateAST(node.operand, env);
      if (node.operator === '-') return -v;
      if (node.operator === '+') return v;
      if (node.operator === 'percent') return v / 100;
      if (node.operator === 'factorial') {
        if (!Number.isInteger(v) || v < 0 || v > 170) return NaN;
        let f = 1;
        for (let i = 2; i <= v; i++) f *= i;
        return f;
      }
      return NaN;
    }
    case 'binary': {
      const l = evaluateAST(node.left, env);
      const r = evaluateAST(node.right, env);
      switch (node.operator) {
        case '+':
          return l + r;
        case '-':
          return l - r;
        case '*':
          return l * r;
        case '/':
        case ':':
          return Math.abs(r) < 1e-12 ? (Math.abs(l) < 1e-12 ? NaN : Infinity) : l / r;
        case '%_of':
          return (l / 100) * r;
        case 'of':
          return l * r;
        case '^':
          return Math.pow(l, r);
        case '=':
          return l - r; // residual
        default:
          return NaN;
      }
    }
    case 'function': {
      const a = node.args.map((x) => evaluateAST(x, env));
      switch (node.name) {
        case 'sqrt':
          return a[0] < 0 ? NaN : Math.sqrt(a[0]);
        case 'cbrt':
          return Math.cbrt(a[0]);
        case 'abs':
          return Math.abs(a[0]);
        case 'factorial': {
          const n = a[0];
          if (!Number.isInteger(n) || n < 0 || n > 170) return NaN;
          let f = 1;
          for (let i = 2; i <= n; i++) f *= i;
          return f;
        }
        case 'sum':
          return a.reduce((x, y) => x + y, 0);
        case 'gcd':
        case 'hcf':
          return a.reduce((x, y) => gcdInt(x, y));
        case 'lcm':
          return a.reduce((x, y) => (x === 0 || y === 0 ? 0 : Math.abs(Math.round(x * y)) / gcdInt(x, y)));
        default:
          return NaN;
      }
    }
  }
}

export function collectVariables(node: MathASTNode, acc = new Set<string>()): Set<string> {
  switch (node.type) {
    case 'variable':
      acc.add(node.name);
      break;
    case 'unary':
      collectVariables(node.operand, acc);
      break;
    case 'binary':
      collectVariables(node.left, acc);
      collectVariables(node.right, acc);
      break;
    case 'function':
      node.args.forEach((x) => collectVariables(x, acc));
      break;
  }
  return acc;
}

function isRelation(node: MathASTNode): boolean {
  return node.type === 'binary' && ['=', '!=', '>', '<', '>=', '<='].includes(node.operator);
}

/** Convert a decimal to an exact small fraction string if possible (denominator <= 10000). */
export function toFractionString(value: number): string | null {
  if (!Number.isFinite(value)) return null;
  if (Number.isInteger(value)) return String(value);
  const sign = value < 0 ? -1 : 1;
  const v = Math.abs(value);
  for (let d = 2; d <= 10000; d++) {
    const n = Math.round(v * d);
    if (Math.abs(n / d - v) < 1e-9) {
      const g = gcdInt(n, d);
      return `${sign * (n / g)}/${d / g}`;
    }
  }
  return null;
}

function numbersClose(a: number, b: number, tol = NUMERIC_TOLERANCE): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
}

const SAMPLE_POINTS: number[] = [-3.5, -1, 0.5, 2, 3.25, 7, 11.5];

/** Solve f(var)=0 for polynomials up to degree 2 using exact-ish sampling with verification. */
export function solveUnivariate(
  lhsMinusRhs: (x: number) => number
): { roots: number[]; degree: number } | null {
  const f0 = lhsMinusRhs(0);
  const f1 = lhsMinusRhs(1);
  const f2 = lhsMinusRhs(2);
  if (![f0, f1, f2].every(Number.isFinite)) return null;
  const c = f0;
  const a = (f2 - 2 * f1 + f0) / 2;
  const b = f1 - f0 - a;
  // verify quadratic model at extra points
  for (const x of [3, -2, 5.5]) {
    if (!numbersClose(a * x * x + b * x + c, lhsMinusRhs(x), 1e-7)) return null;
  }
  if (Math.abs(a) < 1e-9) {
    if (Math.abs(b) < 1e-9) return { roots: [], degree: 0 };
    return { roots: [-c / b], degree: 1 };
  }
  const disc = b * b - 4 * a * c;
  if (disc < -1e-9) return { roots: [], degree: 2 };
  if (Math.abs(disc) <= 1e-9) return { roots: [-b / (2 * a)], degree: 2 };
  const s = Math.sqrt(disc);
  return { roots: [(-b - s) / (2 * a), (-b + s) / (2 * a)].sort((p, q) => p - q), degree: 2 };
}

export function parseToValidatedAST(input: string): { ast: MathASTNode | null; errors: string[]; infix: string } {
  const infix = normalizeLatexAndUnicodeToInfix(input);
  const ast = parseInfixToAST(infix);
  const v = validateMathAST(ast, infix);
  return { ast: v.isValid ? ast : null, errors: v.errors, infix };
}

/** Evaluate / simplify / solve an expression deterministically (TypeScript engine). */
export function evaluateMathExpression(input: string): MathEvaluationResult {
  const { ast, errors, infix } = parseToValidatedAST(input);
  const base = {
    inputExpression: input,
    normalizedExpression: ast ? formatNormalizedExpression(ast, true) : infix,
    engine: 'deterministic_ast' as const
  };
  if (!ast) {
    const dz = errors.some((e) => /division by zero/i.test(e));
    return {
      ...base,
      success: false,
      spokenResult: dz
        ? 'This expression divides by zero, which is undefined.'
        : 'This expression is not valid mathematics.',
      numericValue: null,
      exactFraction: null,
      simplifiedExpression: '',
      steps: [],
      error: errors[0] || 'Invalid expression',
      hasDivisionByZero: dz
    };
  }

  const vars = [...collectVariables(ast)];

  // Equation solving (single variable, degree <= 2)
  if (ast.type === 'binary' && ast.operator === '=' && vars.length === 1) {
    const v = vars[0];
    const sol = solveUnivariate((x) => evaluateAST(ast.left, { [v]: x }) - evaluateAST(ast.right, { [v]: x }));
    if (sol) {
      const sols = sol.roots.map((r) => toFractionString(r) ?? String(Number(r.toFixed(6))));
      return {
        ...base,
        success: true,
        spokenResult:
          sols.length === 0
            ? 'There is no real solution.'
            : sols.length === 1
            ? `${v} equals ${speakValue(sol.roots[0])}.`
            : `${v} equals ${sols.map((_, i) => speakValue(sol.roots[i])).join(' or ')}.`,
        numericValue: sol.roots.length ? sol.roots[0] : null,
        exactFraction: sols[0] ?? null,
        simplifiedExpression: sols.length ? sols.map((s) => `${v} = ${s}`).join(' or ') : 'no real solution',
        solvedVariable: { variable: v, solutions: sols },
        steps: [`Move all terms to one side and solve for ${v}.`]
      };
    }
  }

  if (isRelation(ast) && vars.length === 0) {
    const l = evaluateAST((ast as any).left);
    const r = evaluateAST((ast as any).right);
    const op = (ast as any).operator as string;
    const truth =
      op === '=' ? numbersClose(l, r) : op === '!=' ? !numbersClose(l, r) : op === '>' ? l > r : op === '<' ? l < r : op === '>=' ? l >= r || numbersClose(l, r) : l <= r || numbersClose(l, r);
    return {
      ...base,
      success: true,
      spokenResult: truth ? 'That statement is true.' : 'That statement is false.',
      numericValue: truth ? 1 : 0,
      exactFraction: null,
      simplifiedExpression: truth ? 'true' : 'false',
      steps: []
    };
  }

  if (vars.length === 0) {
    const val = evaluateAST(ast);
    if (!Number.isFinite(val)) {
      return {
        ...base,
        success: false,
        spokenResult: 'The result is undefined.',
        numericValue: null,
        exactFraction: null,
        simplifiedExpression: '',
        steps: [],
        error: 'Undefined result',
        hasDivisionByZero: val === Infinity
      };
    }
    const frac = toFractionString(val);
    return {
      ...base,
      success: true,
      spokenResult: `${speakValue(val)}.`,
      numericValue: val,
      exactFraction: frac,
      simplifiedExpression: frac ?? String(Number(val.toFixed(8))),
      steps: []
    };
  }

  // Symbolic with variables: report as parsed (full symbolic simplification is delegated to SymPy engine)
  return {
    ...base,
    success: true,
    spokenResult: renderASTToSpeech(ast),
    numericValue: null,
    exactFraction: null,
    simplifiedExpression: formatDisplayExpression(ast),
    steps: []
  };
}

function speakValue(v: number): string {
  const frac = toFractionString(v);
  if (frac && frac.includes('/')) {
    const [n, d] = frac.split('/').map(Number);
    return `${numberToWords(n)} divided by ${numberToWords(d)}`;
  }
  return numberToWords(Number(v.toFixed(8)));
}

/**
 * Decide whether two mathematical expressions are equivalent.
 * Strategy: exact normalized match → numeric (no variables) → equation root-set → symbolic sampling.
 */
export function checkMathEquivalence(studentInput: string, targetInput: string): MathEquivalenceResult {
  const s = parseToValidatedAST(studentInput);
  const t = parseToValidatedAST(targetInput);
  const none = (reason: string): MathEquivalenceResult => ({
    isEquivalent: false,
    reason,
    studentNormalized: s.ast ? formatNormalizedExpression(s.ast, true) : s.infix,
    targetNormalized: t.ast ? formatNormalizedExpression(t.ast, true) : t.infix,
    studentNumeric: null,
    targetNumeric: null,
    matchedKind: 'none'
  });
  if (!s.ast) return none(`Student expression invalid: ${s.errors[0] ?? 'unparseable'}`);
  if (!t.ast) return none(`Target expression invalid: ${t.errors[0] ?? 'unparseable'}`);

  const sNorm = formatNormalizedExpression(s.ast, true);
  const tNorm = formatNormalizedExpression(t.ast, true);
  const sVars = [...collectVariables(s.ast)].sort();
  const tVars = [...collectVariables(t.ast)].sort();
  const sIsEq = isRelation(s.ast);
  const tIsEq = isRelation(t.ast);

  const ok = (kind: MathEquivalenceResult['matchedKind'], reason: string, sn: number | null = null, tn: number | null = null): MathEquivalenceResult => ({
    isEquivalent: true,
    reason,
    studentNormalized: sNorm,
    targetNormalized: tNorm,
    studentNumeric: sn,
    targetNumeric: tn,
    matchedKind: kind
  });

  if (sNorm === tNorm) return ok('exact_normalized', 'Identical after normalization');

  // Ratio vs ratio / ratio vs fraction: a:b equivalent to c:d when a/b == c/d
  // (':' evaluates as division so purely numeric comparison below covers it)

  // Equation vs equation (or equation vs "x = value" / plain value for the variable)
  if (sIsEq !== tIsEq) {
    // allow "x = 3" vs "3" when single variable
    const eq = sIsEq ? s.ast : t.ast;
    const other = sIsEq ? t.ast : s.ast;
    const ev = [...collectVariables(eq)];
    if (
      eq.type === 'binary' &&
      eq.operator === '=' &&
      ev.length === 1 &&
      collectVariables(other).size === 0
    ) {
      const sol = solveUnivariate((x) => evaluateAST(eq.left, { [ev[0]]: x }) - evaluateAST(eq.right, { [ev[0]]: x }));
      const ov = evaluateAST(other);
      if (sol && sol.roots.length === 1 && numbersClose(sol.roots[0], ov)) {
        return ok('equation_roots', `Solution ${ev[0]} = ${ov} matches`, sol.roots[0], ov);
      }
    }
    return none('One side is an equation/inequality and the other is not');
  }

  if (sIsEq && tIsEq) {
    const sb = s.ast as any;
    const tb = t.ast as any;
    if (sb.operator !== tb.operator) return none('Different relation operators');
    if (sVars.length === 1 && tVars.length === 1 && sVars[0] === tVars[0] && sb.operator === '=') {
      const v = sVars[0];
      const ss = solveUnivariate((x) => evaluateAST(sb.left, { [v]: x }) - evaluateAST(sb.right, { [v]: x }));
      const ts = solveUnivariate((x) => evaluateAST(tb.left, { [v]: x }) - evaluateAST(tb.right, { [v]: x }));
      if (ss && ts && ss.roots.length === ts.roots.length && ss.roots.every((r, i) => numbersClose(r, ts.roots[i]))) {
        return ok('equation_roots', 'Equations have identical solution sets');
      }
      return none('Equations have different solution sets');
    }
    return none('Relations not provably equivalent');
  }

  // Pure numeric
  if (sVars.length === 0 && tVars.length === 0) {
    const sv = evaluateAST(s.ast);
    const tv = evaluateAST(t.ast);
    if (!Number.isFinite(sv) || !Number.isFinite(tv)) return none('Undefined numeric value');
    if (numbersClose(sv, tv)) {
      const kind = Number.isInteger(sv) && Number.isInteger(tv) ? 'numeric_tolerance' : 'fraction_decimal';
      return { ...ok(kind, 'Numerically equal within tolerance', sv, tv) };
    }
    return { ...none(`Values differ: ${sv} vs ${tv}`), studentNumeric: sv, targetNumeric: tv };
  }

  // Symbolic: same variable set, compare at many sample points
  if (sVars.join(',') !== tVars.join(',')) return none('Different variables');
  const grid: VarEnv[] = [];
  for (let i = 0; i < SAMPLE_POINTS.length; i++) {
    const env: VarEnv = {};
    sVars.forEach((v, k) => {
      env[v] = SAMPLE_POINTS[(i + k * 3) % SAMPLE_POINTS.length];
    });
    grid.push(env);
  }
  let compared = 0;
  for (const env of grid) {
    const a = evaluateAST(s.ast, env);
    const b = evaluateAST(t.ast, env);
    if (!Number.isFinite(a) && !Number.isFinite(b)) continue;
    compared++;
    if (!numbersClose(a, b, 1e-8)) return none('Expressions differ for some variable values');
  }
  if (compared < 4) return none('Not enough valid sample points to establish equivalence');
  return ok('symbolic_algebraic', 'Symbolically equivalent (verified at multiple sample points)');
}

// ---------------------------------------------------------------------------
// MCQ option matching for dictated mathematical answers
// ---------------------------------------------------------------------------

export interface OptionMatchResult {
  matches: Array<'A' | 'B' | 'C' | 'D'>;
  /** exactly one option matches */
  unique: 'A' | 'B' | 'C' | 'D' | null;
  detail: Record<string, string>;
}

/** Strip currency/unit words so "Rs. 252", "40 kg", "20%" compare on the number. Keeps trailing words for disambiguation. */
export function optionTextToComparable(text: string): { expr: string; qualifier: string } {
  let t = (text || '').trim();
  t = t.replace(/^rs\.?\s*/i, '').replace(/^₹\s*/, '');
  const m = t.match(/^(-?[\d.,]+(?:\s*[:/]\s*[\d.]+)?\s*%?)\s*(.*)$/);
  if (!m) return { expr: t, qualifier: '' };
  return { expr: m[1].replace(/,/g, '').replace(/%$/, '').trim(), qualifier: m[2].trim().toLowerCase() };
}

export function matchSpokenMathToOptions(
  studentExpression: string,
  options: { A: string; B: string; C: string; D: string }
): OptionMatchResult {
  const matches: Array<'A' | 'B' | 'C' | 'D'> = [];
  const detail: Record<string, string> = {};
  for (const key of ['A', 'B', 'C', 'D'] as const) {
    const cmp = optionTextToComparable(options[key]);
    const candidates = [cmp.expr];
    if (/%/.test(options[key])) candidates.push(`${cmp.expr}%`);
    let matched = false;
    let reason = '';
    for (const cand of candidates) {
      const r = checkMathEquivalence(studentExpression, cand);
      reason = r.reason;
      if (r.isEquivalent) {
        matched = true;
        break;
      }
    }
    detail[key] = reason;
    if (matched) matches.push(key);
  }
  return { matches, unique: matches.length === 1 ? matches[0] : null, detail };
}
