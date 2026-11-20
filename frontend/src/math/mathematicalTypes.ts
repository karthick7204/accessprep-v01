/**
 * ACCESSPREP-X — Mathematical Voice Intelligence Engine
 * Core Type Definitions for Speech-Based Mathematical Recognition,
 * AST Representation, Validation, Speech Rendering, and Equivalence Evaluation.
 */

export type MathOperator =
  | '+'
  | '-'
  | '*'
  | '/'
  | '^'
  | '='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | ':'
  | '%_of'
  | 'of';

export type MathFunctionName =
  | 'sqrt'
  | 'cbrt'
  | 'abs'
  | 'factorial'
  | 'sum'
  | 'lcm'
  | 'hcf'
  | 'gcd';

export type MathConstantName = 'pi' | 'infinity';

export type MathASTNode = MathASTNodeBase & { explicitBrackets?: boolean };

type MathASTNodeBase =
  | {
      type: 'number';
      value: number;
      raw: string;
      isPercentage?: boolean;
    }
  | {
      type: 'variable';
      name: string;
    }
  | {
      type: 'constant';
      name: MathConstantName;
      value: number;
    }
  | {
      type: 'unary';
      operator: '-' | '+' | 'factorial' | 'percent';
      operand: MathASTNode;
      postfix?: boolean;
    }
  | {
      type: 'binary';
      operator: MathOperator;
      left: MathASTNode;
      right: MathASTNode;
      explicitBrackets?: boolean;
      isFraction?: boolean;
    }
  | {
      type: 'function';
      name: MathFunctionName;
      args: MathASTNode[];
    };

export interface MathToken {
  type:
    | 'NUMBER'
    | 'VARIABLE'
    | 'CONSTANT'
    | 'OPERATOR'
    | 'FUNCTION'
    | 'LPAREN'
    | 'RPAREN'
    | 'COMMA'
    | 'PERCENT'
    | 'PERCENT_OF'
    | 'ALL_DIVIDED_BY';
  value: string;
  rawSpoken?: string;
}

export interface MathAmbiguityCandidate {
  expression: string;
  normalizedExpression: string;
  spokenReadback: string;
  description: string;
}

export interface MathParseResult {
  success: boolean;
  rawTranscript: string;
  /** Human-friendly mathematical notation (e.g. "2x + 5 = 15", "sqrt(49)", "(x + 2) * 3") */
  expression: string;
  /** Canonical operator-explicit notation (e.g. "2*x + 5 = 15", "2 + (3 * 4)") */
  normalizedExpression: string;
  /** Natural spoken read-back for blind/low-vision confirmation */
  spokenReadback: string;
  /** LaTeX representation for visual rendering */
  latex: string;
  /** Parsed AST root node when valid */
  ast: MathASTNode | null;
  /** Confidence score (0..1) */
  confidence: number;
  /** Whether structural grouping ambiguity was detected */
  isAmbiguous: boolean;
  /** Reason ambiguity was flagged, if any */
  ambiguityReason?: string;
  /** Alternative interpretations when ambiguous */
  alternatives: MathAmbiguityCandidate[];
  /** Validation details */
  validation: MathValidationResult;
}

export interface MathValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  hasDivisionByZero: boolean;
  exceedsComplexityLimit: boolean;
}

export interface MathEvaluationResult {
  success: boolean;
  inputExpression: string;
  normalizedExpression: string;
  spokenResult: string;
  numericValue: number | null;
  exactFraction: string | null;
  simplifiedExpression: string;
  solvedVariable?: {
    variable: string;
    solutions: string[];
  };
  steps: string[];
  error?: string;
  hasDivisionByZero?: boolean;
  engine: 'sympy' | 'deterministic_ast';
}

export interface MathEquivalenceResult {
  isEquivalent: boolean;
  reason: string;
  studentNormalized: string;
  targetNormalized: string;
  studentNumeric: number | null;
  targetNumeric: number | null;
  matchedKind: 'exact_normalized' | 'numeric_tolerance' | 'fraction_decimal' | 'symbolic_algebraic' | 'ratio' | 'equation_roots' | 'none';
}

