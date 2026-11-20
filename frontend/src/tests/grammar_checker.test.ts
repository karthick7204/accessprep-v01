import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkGrammar,
  applyGrammarSuggestions,
  formatGrammarIssuesForSpeech
} from '../utils/grammarChecker.ts';

test('Grammar Checker: Detects repeated consecutive words', () => {
  const issues = checkGrammar('I am studying in the the library for the exam.');
  assert.equal(issues.length, 1);
  assert.equal(issues[0].matchedText, 'the the');
  assert.equal(issues[0].replacement, 'the');
});

test('Grammar Checker: Detects subject-verb agreement errors', () => {
  const issues1 = checkGrammar('I is preparing for SSC MTS.');
  assert.ok(issues1.some((i) => i.matchedText === 'I is' && i.replacement === 'I am'));

  const issues2 = checkGrammar('He are working hard today.');
  assert.ok(issues2.some((i) => i.matchedText.toLowerCase() === 'he are' && i.replacement.toLowerCase() === 'he is'));

  const issues3 = checkGrammar('They has completed the test.');
  assert.ok(issues3.some((i) => i.matchedText.toLowerCase() === 'they has' && i.replacement.toLowerCase() === 'they have'));

  const issues4 = checkGrammar('Candidate does not has any doubt.');
  assert.ok(issues4.some((i) => i.matchedText.toLowerCase() === 'does not has' && i.replacement.toLowerCase() === 'does not have'));
});

test('Grammar Checker: Detects double past tense auxiliary errors', () => {
  const issues1 = checkGrammar('The student did not went to the center.');
  assert.ok(issues1.some((i) => i.matchedText.toLowerCase() === 'did not went' && i.replacement.toLowerCase() === 'did not go'));

  const issues2 = checkGrammar('I didn\'t saw the notification.');
  assert.ok(issues2.some((i) => i.matchedText.toLowerCase() === "didn't saw" && i.replacement.toLowerCase() === "didn't see"));
});

test('Grammar Checker: Detects redundant prepositions & common Indian English usage errors', () => {
  const issues1 = checkGrammar('We will discuss about Indian history.');
  assert.ok(issues1.some((i) => i.matchedText.toLowerCase() === 'discuss about' && i.replacement.toLowerCase() === 'discuss'));

  const issues2 = checkGrammar('Please revert back with your response.');
  assert.ok(issues2.some((i) => i.matchedText.toLowerCase() === 'revert back' && i.replacement.toLowerCase() === 'revert'));

  const issues3 = checkGrammar('He cannot cope up with the exam pressure.');
  assert.ok(issues3.some((i) => i.matchedText.toLowerCase() === 'cope up with' && i.replacement.toLowerCase() === 'cope with'));

  const issues4 = checkGrammar('He is one of the student who passed.');
  assert.ok(issues4.some((i) => i.matchedText.toLowerCase() === 'one of the student' && i.replacement.toLowerCase() === 'one of the students'));
});

test('Grammar Checker: Detects article errors', () => {
  const issues1 = checkGrammar('This is a easy question.');
  assert.ok(issues1.some((i) => i.matchedText.toLowerCase() === 'a easy' && i.replacement.toLowerCase() === 'an easy'));

  const issues2 = checkGrammar('He studies at an university in Delhi.');
  assert.ok(issues2.some((i) => i.matchedText.toLowerCase() === 'an university' && i.replacement.toLowerCase() === 'a university'));
});

test('Grammar Checker: applyGrammarSuggestions auto-corrects detected mistakes', () => {
  const rawText = 'I is preparing because he are one of the student who did not went.';
  const issues = checkGrammar(rawText);
  assert.ok(issues.length >= 3);

  const corrected = applyGrammarSuggestions(rawText, issues);
  assert.ok(corrected.includes('I am'));
  assert.ok(corrected.includes('he is'));
  assert.ok(corrected.includes('one of the students'));
  assert.ok(corrected.includes('did not go'));
});

test('Grammar Checker: Spoken feedback formatting produces clear announcements', () => {
  const cleanIssues = checkGrammar('Everything looks perfect and clean.');
  const cleanSpeech = formatGrammarIssuesForSpeech(cleanIssues);
  assert.match(cleanSpeech, /No grammatical errors were detected/i);

  const errorIssues = checkGrammar('I is going to discuss about it.');
  const errorSpeech = formatGrammarIssuesForSpeech(errorIssues);
  assert.match(errorSpeech, /Grammar check found/i);
  assert.match(errorSpeech, /Apply suggestions/i);
});
