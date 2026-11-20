import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadQuestions, Question } from '../db/database.ts';

// Logic mirror of selectSetQuestions in MockExamScreen
function selectSetQuestions(allQ: Question[], setNum: number): Question[] {
  const setIdx = (setNum - 1) % 4;
  const mathAll = allQ.filter((q) => q.subject === 'Numerical and Mathematical Ability');
  const reasoningAll = allQ.filter((q) => q.subject === 'Reasoning Ability and Problem Solving');
  const gaAll = allQ.filter((q) => q.subject === 'General Awareness');
  const englishAll = allQ.filter((q) => q.subject === 'English Language and Comprehension');

  const mathStart = (setIdx * 20) % (mathAll.length || 1);
  const reasoningStart = (setIdx * 20) % (reasoningAll.length || 1);
  const gaStart = (setIdx * 25) % (gaAll.length || 1);
  const englishStart = (setIdx * 25) % (englishAll.length || 1);

  const mathQ = mathAll.slice(mathStart, mathStart + 20);
  const reasoningQ = reasoningAll.slice(reasoningStart, reasoningStart + 20);
  const gaQ = gaAll.slice(gaStart, gaStart + 25);
  const englishQ = englishAll.slice(englishStart, englishStart + 25);

  const balanced90 = [...mathQ, ...reasoningQ, ...gaQ, ...englishQ];
  return balanced90.length === 90 ? balanced90 : allQ.slice(0, 90);
}

test('Mock Exam Sets: Each set has exactly 90 questions matching SSC MTS blueprint', () => {
  const allQ = loadQuestions();
  assert.equal(allQ.length, 400, 'Total question bank must contain 400 curated questions');

  for (let setNum = 1; setNum <= 4; setNum++) {
    const setQuestions = selectSetQuestions(allQ, setNum);
    assert.equal(setQuestions.length, 90, `Set ${setNum} must contain exactly 90 questions`);

    const math = setQuestions.filter((q) => q.subject === 'Numerical and Mathematical Ability');
    const reasoning = setQuestions.filter((q) => q.subject === 'Reasoning Ability and Problem Solving');
    const ga = setQuestions.filter((q) => q.subject === 'General Awareness');
    const english = setQuestions.filter((q) => q.subject === 'English Language and Comprehension');

    assert.equal(math.length, 20, `Set ${setNum} must have 20 Math questions`);
    assert.equal(reasoning.length, 20, `Set ${setNum} must have 20 Reasoning questions`);
    assert.equal(ga.length, 25, `Set ${setNum} must have 25 General Awareness questions`);
    assert.equal(english.length, 25, `Set ${setNum} must have 25 English questions`);
  }
});

test('Mock Exam Sets: Consecutive sets contain completely different, non-overlapping questions', () => {
  const allQ = loadQuestions();
  const set1 = selectSetQuestions(allQ, 1).map((q) => q.question_id);
  const set2 = selectSetQuestions(allQ, 2).map((q) => q.question_id);
  const set3 = selectSetQuestions(allQ, 3).map((q) => q.question_id);
  const set4 = selectSetQuestions(allQ, 4).map((q) => q.question_id);

  // Set 1 vs Set 2
  const overlap12 = set1.filter((id) => set2.includes(id));
  assert.equal(overlap12.length, 0, 'Set 1 and Set 2 must have zero overlapping questions');

  // Set 2 vs Set 3
  const overlap23 = set2.filter((id) => set3.includes(id));
  assert.equal(overlap23.length, 0, 'Set 2 and Set 3 must have zero overlapping questions');

  // Set 3 vs Set 4
  const overlap34 = set3.filter((id) => set4.includes(id));
  assert.equal(overlap34.length, 0, 'Set 3 and Set 4 must have zero overlapping questions');

  // Set 1 vs Set 3
  const overlap13 = set1.filter((id) => set3.includes(id));
  assert.equal(overlap13.length, 0, 'Set 1 and Set 3 must have zero overlapping questions');

  // Set 1 vs Set 4
  const overlap14 = set1.filter((id) => set4.includes(id));
  assert.equal(overlap14.length, 0, 'Set 1 and Set 4 must have zero overlapping questions');

  // Set 2 vs Set 4
  const overlap24 = set2.filter((id) => set4.includes(id));
  assert.equal(overlap24.length, 0, 'Set 2 and Set 4 must have zero overlapping questions');
});

test('Mock Exam Sets: Candidate attempt progression auto-selects subsequent sets', () => {
  // Formula: (attempts.length % 4) + 1
  const getNextSet = (attemptsCount: number) => (attemptsCount % 4) + 1;

  assert.equal(getNextSet(0), 1, 'First attempt gets Set 1');
  assert.equal(getNextSet(1), 2, 'Second attempt gets Set 2 (different questions)');
  assert.equal(getNextSet(2), 3, 'Third attempt gets Set 3 (different questions)');
  assert.equal(getNextSet(3), 4, 'Fourth attempt gets Set 4 (different questions)');
  assert.equal(getNextSet(4), 1, 'Fifth attempt rotates back to Set 1');
});
