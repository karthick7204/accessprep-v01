/**
 * ACCESSPREP-X — Mathematical Expression Validator
 * Enforces strict syntactic, security, complexity, and mathematical domain rules.
 * Never uses eval(). Rejects malformed syntax and flags division by zero.
 */

import { MathASTNode, MathValidationResult } from './mathematicalTypes.ts';

export const MAX_EXPRESSION_LENGTH = 300;
export const MAX_AST_NODES = 120;
export const MAX_AST_DEPTH = 24;

const FORBIDDEN_PATTERNS = [
  /\b(eval|exec|import|__import__|os|sys|subprocess|open|compile|globals|locals|getattr|setattr|delattr)\b/i,
  /[;`$\\]/ // Note: LaTeX commands are normalized before raw expression validation
];

/**
 * Checks whether brackets/parentheses/braces are balanced in an expression string.
 */
export function areBracketsBalanced(expr: string): boolean {
  const stack: string[] = [];
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

  for (const ch of expr) {
    if (ch === '(' || ch === '[' || ch === '{') {
      stack.push(ch);
    } else if (ch === ')' || ch === ']' || ch === '}') {
      if (stack.length === 0 || stack.pop() !== pairs[ch]) {
        return false;
      }
    }
  }
  return stack.length === 0;
}

/**
 * Evaluates a purely numeric AST subtree if possible (returns null if variables exist).
 */
export function evaluateNumericSubtree(node: MathASTNode): number | null {
  switch (node.type) {
    case 'number':
      return node.isPercentage ? node.value / 100 : node.value;
    case 'constant':
      return node.value;
    case 'variable':
      return null;
    case 'unary': {
      const val = evaluateNumericSubtree(node.operand);
      if (val === null) return null;
      if (node.operator === '-') return -val;
      if (node.operator === '+') return val;
      if (node.operator === 'percent') return val / 100;
      if (node.operator === 'factorial') {
        if (val < 0 || !Number.isInteger(val) || val > 170) return NaN;
        let res = 1;
        for (let i = 2; i <= val; i++) res *= i;
        return res;
      }
      return null;
    }
    case 'binary': {
      const l = evaluateNumericSubtree(node.left);
      const r = evaluateNumericSubtree(node.right);
      if (l === null || r === null) return null;
      switch (node.operator) {
        case '+':
          return l + r;
        case '-':
          return l - r;
        case '*':
          return l * r;
        case '/':
        case ':':
          if (Math.abs(r) < 1e-12) return Infinity;
          return l / r;
        case '%_of':
          return (l / 100) * r;
        case 'of':
          return l * r;
        case '^':
          return Math.pow(l, r);
        default:
          return null;
      }
    }
    case 'function': {
      const vals = node.args.map(evaluateNumericSubtree);
      if (vals.some((v) => v === null)) return null;
      const nums = vals as number[];
      switch (node.name) {
        case 'sqrt':
          return nums[0] < 0 ? NaN : Math.sqrt(nums[0]);
        case 'cbrt':
          return Math.cbrt(nums[0]);
        case 'abs':
          return Math.abs(nums[0]);
        case 'factorial': {
          const n = nums[0];
          if (n < 0 || !Number.isInteger(n) || n > 170) return NaN;
          let f = 1;
          for (let i = 2; i <= n; i++) f *= i;
          return f;
        }
        case 'sum':
          return nums.reduce((a, b) => a + b, 0);
        case 'gcd':
        case 'hcf': {
          const gcd2 = (a: number, b: number): number => {
            let x = Math.abs(Math.round(a));
            let y = Math.abs(Math.round(b));
            while (y !== 0) {
              const t = y;
              y = x % y;
              x = t;
            }
            return x;
          };
          return nums.reduce((acc, cur) => gcd2(acc, cur), nums[0] || 0);
        }
        case 'lcm': {
          const gcd2 = (a: number, b: number): number => {
            let x = Math.abs(Math.round(a));
            let y = Math.abs(Math.round(b));
            while (y !== 0) {
              const t = y;
              y = x % y;
              x = t;
            }
            return x;
          };
          const lcm2 = (a: number, b: number): number => {
            if (a === 0 || b === 0) return 0;
            return Math.abs(Math.round(a * b)) / gcd2(a, b);
          };
          return nums.reduce((acc, cur) => lcm2(acc, cur), nums[0] || 1);
        }
        default:
          return null;
      }
    }
  }
}

/**
 * Inspects an AST for division by zero, complexity limits, and domain errors.
 */
export function validateMathAST(
  ast: MathASTNode | null,
  rawExpression: string
): MathValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let hasDivisionByZero = false;
  let exceedsComplexityLimit = false;

  const trimmed = (rawExpression || '').trim();
  if (!trimmed) {
    return {
      isValid: false,
      errors: ['Mathematical expression is empty.'],
      warnings: [],
      hasDivisionByZero: false,
      exceedsComplexityLimit: false
    };
  }

  if (trimmed.length > MAX_EXPRESSION_LENGTH) {
    exceedsComplexityLimit = true;
    errors.push(`Expression length (${trimmed.length}) exceeds maximum limit of ${MAX_EXPRESSION_LENGTH} characters.`);
  }

  for (const pat of FORBIDDEN_PATTERNS) {
    if (pat.test(trimmed)) {
      errors.push('Expression contains restricted or unsafe characters/keywords.');
      break;
    }
  }

  if (!areBracketsBalanced(trimmed)) {
    errors.push('Unbalanced brackets or parentheses in mathematical expression.');
  }

  // Check for obvious dangling operators in raw string
  if (/[+\-*/^=<>:]\s*$/.test(trimmed.replace(/!\s*$/, '').replace(/%\s*$/, ''))) {
    errors.push('Expression ends with an incomplete mathematical operator.');
  }
  if (/^\s*[*^/:]/.test(trimmed)) {
    errors.push('Expression starts with a binary operator missing its left operand.');
  }
  if (/[*\/^]{2,}/.test(trimmed.replace(/\*\*/g, '^'))) {
    errors.push('Consecutive invalid binary operators detected.');
  }

  if (!ast) {
    if (errors.length === 0) {
      errors.push('Could not parse input into a valid mathematical expression.');
    }
    return {
      isValid: false,
      errors,
      warnings,
      hasDivisionByZero,
      exceedsComplexityLimit
    };
  }

  let nodeCount = 0;
  let maxDepthSeen = 0;

  function walk(node: MathASTNode, depth: number) {
    nodeCount++;
    if (depth > maxDepthSeen) maxDepthSeen = depth;
    if (nodeCount > MAX_AST_NODES || depth > MAX_AST_DEPTH) {
      exceedsComplexityLimit = true;
      return;
    }

    if (node.type === 'unary') {
      if (node.operator === 'factorial') {
        const v = evaluateNumericSubtree(node.operand);
        if (v !== null && (v < 0 || !Number.isInteger(v))) {
          errors.push('Factorial is only defined for non-negative integers.');
        }
      }
      walk(node.operand, depth + 1);
    } else if (node.type === 'binary') {
      if (node.operator === '/' || node.operator === ':') {
        const denomVal = evaluateNumericSubtree(node.right);
        if (denomVal !== null && Math.abs(denomVal) < 1e-12) {
          hasDivisionByZero = true;
          errors.push('Division by zero is undefined.');
        }
      }
      walk(node.left, depth + 1);
      walk(node.right, depth + 1);
    } else if (node.type === 'function') {
      if (node.name === 'sqrt' && node.args.length === 1) {
        const argVal = evaluateNumericSubtree(node.args[0]);
        if (argVal !== null && argVal < 0) {
          errors.push('Square root of a negative number is not a real number.');
        }
      }
      for (const arg of node.args) {
        walk(arg, depth + 1);
      }
    }
  }

  walk(ast, 1);

  if (exceedsComplexityLimit) {
    errors.push('Expression exceeds complexity or nesting limits.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    hasDivisionByZero,
    exceedsComplexityLimit
  };
}

