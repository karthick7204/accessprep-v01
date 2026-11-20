import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { parseMathematicalSpeech } from '../math/mathematicalSpeechParser.ts';
import {
  renderMathExpressionToSpeech,
  renderTextWithMathToSpeech
} from '../math/mathematicalSpeechRenderer.ts';
import { parseInfixToAST, formatNormalizedExpression } from '../math/mathematicalExpressionNormalizer.ts';
import {
  checkMathEquivalence,
  evaluateMathExpression,
  matchSpokenMathToOptions
} from '../math/mathematicalAnswerEvaluator.ts';
import {
  startMathAnswerFlow,
  continueMathAnswerFlow,
  IDLE_MATH_STATE,
  isEnterMathAnswerCommand,
  isCorrectMyAnswerCommand
} from '../math/mathAnswerSession.ts';
import { formatFullQuestionPrompt, formatAllOptionsPrompt } from '../utils/repeatQuestionHelper.ts';

const dataset = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'src/data/math_speech_test_dataset.json'), 'utf-8')
);

function norm(expr: string): string {
  return formatNormalizedExpression(parseInfixToAST(expr), true);
}

const metrics: Record<string, { pass: number; total: number }> = {};
function record(name: string, ok: boolean) {
  metrics[name] ??= { pass: 0, total: 0 };
  metrics[name].total++;
  if (ok) metrics[name].pass++;
}

test('MATH-DATASET: spoken transcript → expression parsing accuracy (reported, per category)', () => {
  const failures: string[] = [];
  for (const c of dataset.speech_to_expression) {
    const r = parseMathematicalSpeech(c.spoken);
    let ok: boolean;
    if (c.expected === null) {
      ok = !r.success;
    } else {
      ok = r.success && norm(r.expression) === norm(c.expected);
      // Explicit "times" before a variable is kept as 2*x; also accept equivalent normalized form
      if (!ok && r.success) ok = r.normalizedExpression === norm(c.expected);
    }
    record(`parse:${c.category}`, ok);
    record('parse:ALL', ok);
    if (!ok) failures.push(`${c.id} "${c.spoken}" → "${r.expression}" (expected "${c.expected}")`);
  }
  console.log('PARSE FAILURES:', JSON.stringify(failures, null, 1));
  const m = metrics['parse:ALL'];
  assert.ok(m.pass / m.total >= 0.9, `parse accuracy ${m.pass}/${m.total} below 90%: ${failures.join(' | ')}`);
});

test('MATH-DATASET: ambiguity is detected and both interpretations offered', () => {
  for (const c of dataset.ambiguous) {
    const r = parseMathematicalSpeech(c.spoken);
    assert.equal(r.isAmbiguous, true, c.id);
    const alts = r.alternatives.map((a) => norm(a.expression));
    for (const want of c.alternatives) assert.ok(alts.includes(norm(want)), `${c.id} missing ${want}; got ${alts}`);
    record('ambiguity', true);
  }
});

test('MATH-DATASET: invalid syntax / division by zero are rejected', () => {
  for (const c of dataset.invalid) {
    const r = parseMathematicalSpeech(c.spoken);
    assert.equal(r.success, false, `${c.id} "${c.spoken}" should be rejected, got ${r.expression}`);
    if (c.reason === 'division_by_zero') assert.equal(r.validation.hasDivisionByZero, true);
    record('invalid', true);
  }
});

test('MATH-DATASET: equivalence accuracy', () => {
  const failures: string[] = [];
  for (const c of dataset.equivalence) {
    const r = checkMathEquivalence(c.student, c.target);
    const ok = r.isEquivalent === c.equivalent;
    record('equivalence', ok);
    if (!ok) failures.push(`${c.id} ${c.student} vs ${c.target}: got ${r.isEquivalent} (${r.reason})`);
  }
  assert.deepEqual(failures, []);
});

test('MATH-DATASET: notation → speech read-aloud correctness', () => {
  const failures: string[] = [];
  for (const c of dataset.read_aloud) {
    const r = renderMathExpressionToSpeech(c.input);
    const ok = r.isReliable && r.spoken === c.spoken;
    record('read_aloud', ok);
    if (!ok) failures.push(`${c.id} ${c.input}: "${r.spoken}" != "${c.spoken}"`);
  }
  assert.deepEqual(failures, []);
  for (const c of dataset.read_aloud_unreliable) {
    const r = renderMathExpressionToSpeech(c.input);
    assert.equal(r.isReliable, false, c.id);
    assert.match(r.spoken, /Clarification is required/);
    record('read_aloud_unreliable', true);
  }
  for (const c of dataset.question_text_read_aloud) {
    const spoken = renderTextWithMathToSpeech(c.text);
    for (const s of c.must_contain) assert.ok(spoken.includes(s), `${c.id}: "${spoken}" lacks "${s}"`);
    for (const s of c.must_not_contain) assert.ok(!spoken.includes(s), `${c.id}: "${spoken}" still has "${s}"`);
    record('question_text_read_aloud', true);
  }
});

test('MATH-DATASET: spoken answer → MCQ option matching (never guesses)', () => {
  for (const c of dataset.option_matching) {
    const r = parseMathematicalSpeech(c.spoken);
    const m = r.success ? matchSpokenMathToOptions(r.expression, c.options) : { unique: null };
    const ok = m.unique === c.expected;
    record('option_matching', ok);
    assert.equal(m.unique, c.expected, `${c.id} ${c.spoken} → ${r.expression}`);
  }
});

// ---------------------------------------------------------------------------
// The 20 required scenarios
// ---------------------------------------------------------------------------
test('S1-S4: read fraction, square root, exponent, algebraic equation', () => {
  assert.equal(renderMathExpressionToSpeech('\\frac{3}{4}').spoken, 'Three divided by four.');
  assert.equal(renderMathExpressionToSpeech('\\sqrt{49}').spoken, 'Square root of forty-nine.');
  assert.equal(renderMathExpressionToSpeech('x^2 + 5 = 14').spoken, 'x squared plus five equals fourteen.');
  assert.equal(renderMathExpressionToSpeech('2x + 5 = 15').spoken, 'Two times x plus five equals fifteen.');
});

test('S5-S8: recognize spoken fraction, equation, multiplication/division, inequality', () => {
  assert.equal(parseMathematicalSpeech('three divided by four').expression, '3/4');
  assert.equal(parseMathematicalSpeech('two x plus five equals fifteen').expression, '2x + 5 = 15');
  assert.equal(parseMathematicalSpeech('two times x').expression, '2*x');
  assert.equal(parseMathematicalSpeech('six times seven').normalizedExpression, '6 * 7');
  assert.equal(parseMathematicalSpeech('x is greater than or equal to five').expression, 'x >= 5');
});

test('S9: nested brackets keep grouping and precedence', () => {
  const r = parseMathematicalSpeech('open bracket open bracket two plus three close bracket times four close bracket minus five');
  assert.equal(evaluateMathExpression(r.expression).numericValue, 15);
  const p = parseMathematicalSpeech('two plus three multiplied by four');
  assert.equal(p.normalizedExpression, '2 + (3 * 4)');
  assert.equal(evaluateMathExpression(p.expression).numericValue, 14);
});

test('S10-S12: ambiguity → clarify → confirm; and correction of a wrong recognition', () => {
  let o = startMathAnswerFlow('square root of nine plus seven');
  assert.equal(o.state.phase, 'awaiting_disambiguation');
  assert.match(o.speak!, /Say one or two/);
  o = continueMathAnswerFlow(o.state, 'one');
  assert.equal(o.state.phase, 'awaiting_confirmation');
  assert.match(o.speak!, /Is that correct\?/);
  const opts = { A: '10', B: '4', C: '16', D: '7' };
  const confirmed = continueMathAnswerFlow(o.state, 'yes', opts);
  assert.equal(confirmed.submitOption, 'A'); // sqrt(9)+7 = 10

  // Direct example from the brief
  let q = startMathAnswerFlow('two plus three');
  assert.equal(q.state.phase, 'awaiting_confirmation');
  // Student says "no" → asked to repeat; nothing submitted
  const no = continueMathAnswerFlow(q.state, 'no', { A: '5', B: '6', C: '7', D: '8' });
  assert.equal(no.submitOption, undefined);
  assert.equal(no.state.phase, 'awaiting_correction');
  // Corrects to a different expression, confirms → submitted
  const fixed = continueMathAnswerFlow(no.state, 'two plus four');
  assert.equal(fixed.state.phase, 'awaiting_confirmation');
  const done = continueMathAnswerFlow(fixed.state, 'confirm answer', { A: '5', B: '6', C: '7', D: '8' });
  assert.equal(done.submitOption, 'B');
});

test('S11b: "sqrt(100)+20" example is read back and needs confirmation (never silently accepted)', () => {
  const o = startMathAnswerFlow('square root of one hundred plus twenty');
  assert.notEqual(o.state.phase, 'idle');
  assert.equal(o.submitOption, undefined);
  assert.equal(o.submitExpression, undefined);
});

test('S13: equivalent forms accepted; different forms rejected', () => {
  assert.equal(checkMathEquivalence('1/2', '0.5').isEquivalent, true);
  assert.equal(checkMathEquivalence('2(x + 3)', '2x + 6').isEquivalent, true);
  assert.equal(checkMathEquivalence('(x + 1)^2', 'x^2 + 1').isEquivalent, false);
});

test('S14-S15: invalid syntax rejected; division by zero handled', () => {
  assert.equal(parseMathematicalSpeech('plus plus times').success, false);
  const dz = evaluateMathExpression('5/0');
  assert.equal(dz.success, false);
  assert.equal(dz.hasDivisionByZero, true);
  assert.equal(evaluateMathExpression('0/0').success, false);
});

test('S16: repeating mathematical questions speaks interpreted math (not raw symbols)', () => {
  const q: any = {
    question_id: 'T',
    subject: 'Numerical and Mathematical Ability',
    question_text: 'If x = 16 and y = 4, find the value of (x^2 - y^2) / (x - y).',
    option_a: '24', option_b: '20', option_c: '18', option_d: '22'
  };
  const full = formatFullQuestionPrompt(q, 0, 10);
  assert.ok(!full.includes('^'), full);
  assert.ok(full.includes('squared'), full);
  assert.ok(formatAllOptionsPrompt(q).includes('Option A: 24'));
});

test('S17: Blind-mode style read of an equation question yields speech-safe text', () => {
  const q: any = {
    question_id: 'T2', subject: 'Numerical and Mathematical Ability',
    question_text: 'Solve 2x + 5 = 15.', option_a: '5', option_b: '4', option_c: '3', option_d: '6'
  };
  const full = formatFullQuestionPrompt(q);
  assert.ok(/equals/.test(full), full);
  assert.ok(!/=/.test(full), full);
});

test('S18-S20: flow never submits twice and exposes commands without touching exam state', () => {
  const opts = { A: '10', B: '20', C: '30', D: '40' };
  let o = startMathAnswerFlow('twenty');
  const first = continueMathAnswerFlow(o.state, 'yes', opts);
  assert.equal(first.submitOption, 'B');
  assert.equal(first.state.phase, 'idle');
  // A repeated "yes" after submission is ignored (flow is idle → not handled → caller does nothing)
  const second = continueMathAnswerFlow(first.state, 'yes', opts);
  assert.equal(second.handled, false);
  assert.equal(second.submitOption, undefined);
  // Cancel discards
  o = startMathAnswerFlow('thirty');
  assert.equal(continueMathAnswerFlow(o.state, 'cancel').state.phase, 'idle');
  // Voice commands recognised
  assert.ok(isEnterMathAnswerCommand('enter mathematical answer'));
  assert.ok(isCorrectMyAnswerCommand('correct my answer'));
  assert.equal(continueMathAnswerFlow(IDLE_MATH_STATE, 'yes').handled, false);
});

test('SAFETY: injection-style input is rejected, never executed', () => {
  for (const evil of ['__import__("os").system("ls")', 'process.exit(1)', 'x; rm -rf /', '`ls`', 'open("/etc/passwd")']) {
    const e = evaluateMathExpression(evil);
    assert.equal(e.success, false, evil);
  }
  const long = evaluateMathExpression('1+'.repeat(400) + '1');
  assert.equal(long.success, false);
});

test('MATH-METRICS: independent accuracy report', () => {
  const report = Object.fromEntries(
    Object.entries(metrics).map(([k, v]) => [k, `${v.pass}/${v.total} (${((100 * v.pass) / v.total).toFixed(1)}%)`])
  );
  console.log('MATH METRICS (parser/evaluator layers only; Whisper transcription is NOT measured here):');
  console.log(JSON.stringify(report, null, 2));
  assert.ok(true);
});

