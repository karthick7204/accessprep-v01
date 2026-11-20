import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVisionWakeWord } from '../voice/commandParser.ts';

test('Wake Word: "Hey Vision" and activation phrases activate Vision Assistant', () => {
  const activationPhrases = [
    'hey vision',
    'Hey Vision',
    'HEY VISION',
    'hey vision assistant',
    'activate vision',
    'activate vision assistant',
    'turn on vision',
    'enable vision',
    'start vision',
    'vision assistant',
    'vision',
    'hey vision help me'
  ];

  for (const phrase of activationPhrases) {
    const result = parseVisionWakeWord(phrase);
    assert.equal(result, 'activate_vision', `Failed to activate for: "${phrase}"`);
  }
});

test('Wake Word: Deactivation phrases deactivate Vision Assistant', () => {
  const deactivationPhrases = [
    'deactivate vision',
    'deactivate vision assistant',
    'turn off vision',
    'disable vision',
    'stop vision',
    'exit vision'
  ];

  for (const phrase of deactivationPhrases) {
    const result = parseVisionWakeWord(phrase);
    assert.equal(result, 'deactivate_vision', `Failed to deactivate for: "${phrase}"`);
  }
});

test('Wake Word: Unrelated phrases do not trigger wake word or deactivation', () => {
  const unrelatedPhrases = [
    'option a',
    'next question',
    'go to dashboard',
    'repeat question',
    'what is the time',
    'numerical ability'
  ];

  for (const phrase of unrelatedPhrases) {
    const result = parseVisionWakeWord(phrase);
    assert.equal(result, null, `Should be null for: "${phrase}"`);
  }
});

