import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSubjectSelectionIntent } from '../voice/commandParser.ts';

test('Voice Subject Selection: Prompting commands trigger available subjects announcement', () => {
  const promptPhrases = [
    'select subject',
    'Select subject',
    'choose subject',
    'change subject',
    'read available subjects',
    'read subjects',
    'what subjects are available',
    'list subjects',
    'show subjects',
    'available subjects',
    'all subjects',
    'please select subject'
  ];

  for (const phrase of promptPhrases) {
    const result = parseSubjectSelectionIntent(phrase);
    assert.ok(result, `Result should not be null for: "${phrase}"`);
    assert.equal(result.type, 'prompt_subjects', `Failed to parse prompt for: "${phrase}"`);
  }
});

test('Voice Subject Selection: Select Numerical and Mathematical Ability with full name and aliases', () => {
  const mathPhrases = [
    'numerical and mathematical ability',
    'Numerical and Mathematical Ability',
    'numerical ability and mathematical ability',
    'numerical ability',
    'mathematical ability',
    'math',
    'mathematics',
    'numerical',
    'select numerical and mathematical ability',
    'select numerical ability',
    'select math',
    'open numerical ability',
    'open math',
    'choose math',
    'practice math'
  ];

  for (const phrase of mathPhrases) {
    const result = parseSubjectSelectionIntent(phrase);
    assert.ok(result, `Should parse math for: "${phrase}"`);
    assert.equal(result.type, 'choose_subject');
    if (result.type === 'choose_subject') {
      assert.equal(result.subject, 'Numerical and Mathematical Ability');
    }
  }
});

test('Voice Subject Selection: Select Reasoning Ability and Problem Solving with full name and aliases', () => {
  const reasoningPhrases = [
    'reasoning ability and problem solving',
    'Reasoning Ability and Problem Solving',
    'reasoning ability',
    'problem solving',
    'reasoning',
    'select reasoning ability and problem solving',
    'select reasoning ability',
    'select reasoning',
    'open reasoning ability and problem solving',
    'open reasoning',
    'choose reasoning',
    'practice reasoning'
  ];

  for (const phrase of reasoningPhrases) {
    const result = parseSubjectSelectionIntent(phrase);
    assert.ok(result, `Should parse reasoning for: "${phrase}"`);
    assert.equal(result.type, 'choose_subject');
    if (result.type === 'choose_subject') {
      assert.equal(result.subject, 'Reasoning Ability and Problem Solving');
    }
  }
});

test('Voice Subject Selection: Select General Awareness with full name and aliases', () => {
  const gaPhrases = [
    'general awareness',
    'General Awareness',
    'general knowledge',
    'gk',
    'ga',
    'awareness',
    'select general awareness',
    'choose general awareness',
    'open general awareness',
    'practice general awareness',
    'practice gk',
    'select gk'
  ];

  for (const phrase of gaPhrases) {
    const result = parseSubjectSelectionIntent(phrase);
    assert.ok(result, `Should parse general awareness for: "${phrase}"`);
    assert.equal(result.type, 'choose_subject');
    if (result.type === 'choose_subject') {
      assert.equal(result.subject, 'General Awareness');
    }
  }
});

test('Voice Subject Selection: Select English Language and Comprehension with full name and aliases', () => {
  const englishPhrases = [
    'english language and comprehension',
    'English Language and Comprehension',
    'english language',
    'english comprehension',
    'english',
    'select english language and comprehension',
    'select english language',
    'select english',
    'open english',
    'choose english',
    'practice english'
  ];

  for (const phrase of englishPhrases) {
    const result = parseSubjectSelectionIntent(phrase);
    assert.ok(result, `Should parse english for: "${phrase}"`);
    assert.equal(result.type, 'choose_subject');
    if (result.type === 'choose_subject') {
      assert.equal(result.subject, 'English Language and Comprehension');
    }
  }
});

test('Voice Subject Selection: Unrelated phrases do not match subject selection intent', () => {
  const unrelatedPhrases = [
    'repeat question',
    'option b',
    'next question',
    'dashboard',
    'stop reading'
  ];

  for (const phrase of unrelatedPhrases) {
    const result = parseSubjectSelectionIntent(phrase);
    assert.equal(result, null, `Should be null for: "${phrase}"`);
  }
});

