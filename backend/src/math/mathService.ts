/**
 * Server-side math service: validates input in TypeScript, then (when available) delegates
 * symbolic work to scripts/math_engine.py (SymPy) through a stdin JSON AST — never via eval.
 * Falls back to the deterministic TypeScript evaluator when Python/SymPy is unavailable.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import {
  evaluateMathExpression,
  checkMathEquivalence,
  parseToValidatedAST
} from './mathematicalAnswerEvaluator.ts';
import { MathEvaluationResult, MathEquivalenceResult } from './mathematicalTypes.ts';
import { MAX_EXPRESSION_LENGTH } from './mathematicalExpressionValidator.ts';

function pythonExe(): string {
  const venv = path.resolve(process.cwd(), '.venv/bin/python3');
  return fs.existsSync(venv) ? venv : 'python3';
}

function runPython(payload: object, timeoutMs = 6000): Promise<any | null> {
  return new Promise((resolve) => {
    const scriptPath = path.resolve(process.cwd(), 'scripts/math_engine.py');
    if (!fs.existsSync(scriptPath)) return resolve(null);
    let out = '';
    let done = false;
    const child = spawn(pythonExe(), [scriptPath], { stdio: ['pipe', 'pipe', 'ignore'] });
    const finish = (v: any) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(v);
    };
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(null);
    }, timeoutMs);
    child.stdout.on('data', (d) => (out += d.toString()));
    child.on('error', () => finish(null));
    child.on('close', () => {
      try {
        const parsed = JSON.parse(out);
        finish(parsed && parsed.error === 'sympy_unavailable' ? null : parsed);
      } catch {
        finish(null);
      }
    });
    child.stdin.on('error', () => finish(null));
    child.stdin.end(JSON.stringify(payload));
  });
}

export function validateRequestString(v: unknown, field: string): string {
  if (typeof v !== 'string') throw new Error(`${field} must be a string`);
  const s = v.trim();
  if (!s) throw new Error(`${field} must not be empty`);
  if (s.length > MAX_EXPRESSION_LENGTH * 4) throw new Error(`${field} is too long`);
  return s;
}

export async function evaluateWithEngine(
  expression: string,
  op: 'evaluate' | 'simplify' | 'solve' = 'evaluate'
): Promise<MathEvaluationResult> {
  const base = evaluateMathExpression(expression); // validates + deterministic fallback
  if (!base.success) return base;
  const { ast } = parseToValidatedAST(expression);
  if (!ast) return base;
  const py = await runPython({ op, ast });
  if (!py || !py.success) return base; // deterministic result remains authoritative on failure
  if (op === 'solve' && py.solutions) {
    return {
      ...base,
      engine: 'sympy',
      solvedVariable: { variable: py.variable, solutions: py.solutions },
      simplifiedExpression: py.solutions.map((s: string) => `${py.variable} = ${s}`).join(' or ')
    };
  }
  return {
    ...base,
    engine: 'sympy',
    simplifiedExpression: py.text ?? base.simplifiedExpression,
    exactFraction: py.fraction ?? base.exactFraction,
    numericValue: py.numeric ?? base.numericValue
  };
}

export async function equivalenceWithEngine(student: string, target: string): Promise<MathEquivalenceResult> {
  const det = checkMathEquivalence(student, target);
  if (det.isEquivalent || det.matchedKind !== 'none') return det;
  // Deterministic engine said "no" — ask SymPy for a symbolic second opinion only for algebraic cases.
  const s = parseToValidatedAST(student).ast;
  const t = parseToValidatedAST(target).ast;
  if (!s || !t) return det;
  const py = await runPython({ op: 'equivalent', ast: s, ast2: t });
  if (py && py.success && py.equivalent === true) {
    return { ...det, isEquivalent: true, matchedKind: 'symbolic_algebraic', reason: 'SymPy confirmed equivalence' };
  }
  return det;
}

