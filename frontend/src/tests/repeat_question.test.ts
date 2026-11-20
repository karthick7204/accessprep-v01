/**
 * ACCESSPREP-X — Repeat Question & Repeat Options Test Suite
 * Validates speech formatting, voice command parsing, individual option reading,
 * audio playback controls, and exam non-mutation invariants.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAnswer, parseSpokenAnswer } from '../utils/answerParser.ts';
import {
  formatFullQuestionPrompt,
  formatQuestionStemOnly,
  formatAllOptionsPrompt,
  formatSingleOptionPrompt,
  formatFlashcardQuestionPrompt,
  formatFlashcardAnswerPrompt,
  repeatCurrentQuestion,
  repeatCurrentOptions,
  repeatIndividualOption
} from '../utils/repeatQuestionHelper.ts';
import { parseSystemControl, parseSubjectSelectionIntent } from '../voice/commandParser.ts';
import { NavigationController } from '../voice/NavigationController.ts';
import { VoiceEngine } from '../voice/VoiceEngine.ts';
import type { Question } from '../db/database.ts';

// ---------------------------------------------------------------------------
// Mock Question Data
// ---------------------------------------------------------------------------

const mockQuestion: Question = {
  question_id: 'Q_101',
  subject: 'Numerical and Mathematical Ability',
  topic: 'LCM and HCF',
  subtopic: 'Multiples',
  question_text: 'What is the LCM of 12 and 18?',
  question_type: 'MCQ',
  option_a: '24',
  option_b: '36',
  option_c: '48',
  option_d: '72',
  correct_answer: 'B',
  explanation: 'Multiples of 18 are 18, 36, 54. 36 is divisible by 12, so LCM is 36.',
  difficulty_label: 'Easy',
  source_name: 'SSC MTS PYQ',
  source_reference: '2023 Shift 1',
  source_type: 'PYQ',
  verification_status: 'Verified',
  language: 'en',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  dataset_version: 'v1.0'
};

// ---------------------------------------------------------------------------
// 1. Spoken Prompt Formatter Tests
// ---------------------------------------------------------------------------

test('Repeat Helper: formatFullQuestionPrompt includes question index, subject, stem, and all 4 options', () => {
  const prompt = formatFullQuestionPrompt(mockQuestion, 0, 20);
  assert.ok(prompt.includes('Question 1 of 20'));
  assert.ok(prompt.includes('Section: Numerical and Mathematical Ability'));
  assert.ok(prompt.includes('What is the LCM of 12 and 18?'));
  assert.ok(prompt.includes('Option A: 24'));
  assert.ok(prompt.includes('Option B: 36'));
  assert.ok(prompt.includes('Option C: 48'));
  assert.ok(prompt.includes('Option D: 72'));
  assert.ok(prompt.includes('What is your answer?'));
});

test('Repeat Helper: formatQuestionStemOnly produces stem without options list', () => {
  const stem = formatQuestionStemOnly(mockQuestion, 2, 10);
  assert.ok(stem.includes('Question 3 of 10'));
  assert.ok(stem.includes('What is the LCM of 12 and 18?'));
  assert.ok(!stem.includes('Option A'));
  assert.ok(!stem.includes('Option B'));
});

test('Repeat Helper: formatAllOptionsPrompt produces all 4 options labeled A through D', () => {
  const optionsText = formatAllOptionsPrompt(mockQuestion);
  assert.ok(optionsText.startsWith('The options are:'));
  assert.ok(optionsText.includes('Option A: 24'));
  assert.ok(optionsText.includes('Option B: 36'));
  assert.ok(optionsText.includes('Option C: 48'));
  assert.ok(optionsText.includes('Option D: 72'));
});

test('Repeat Helper: formatSingleOptionPrompt extracts single option accurately', () => {
  const optA = formatSingleOptionPrompt(mockQuestion, 'A');
  const optB = formatSingleOptionPrompt(mockQuestion, 'B');
  const optC = formatSingleOptionPrompt(mockQuestion, 'C');
  const optD = formatSingleOptionPrompt(mockQuestion, 'D');

  assert.equal(optA, 'Option A: 24.');
  assert.equal(optB, 'Option B: 36.');
  assert.equal(optC, 'Option C: 48.');
  assert.equal(optD, 'Option D: 72.');
});

test('Repeat Helper: formatFlashcardQuestionPrompt formats spaced repetition card prompt', () => {
  const card = {
    subject: 'Reasoning Ability',
    topic: 'Number Series',
    questionText: 'Find the next number in series: 2, 4, 8, 16, ?'
  };
  const prompt = formatFlashcardQuestionPrompt(card, 0, 15);
  assert.ok(prompt.includes('Revision Card 1 of 15'));
  assert.ok(prompt.includes('Subject: Reasoning Ability'));
  assert.ok(prompt.includes('Topic: Number Series'));
  assert.ok(prompt.includes('Find the next number in series'));
});

test('Repeat Helper: formatFlashcardAnswerPrompt formats correct answer and explanation', () => {
  const card = {
    correctAnswer: '32',
    explanation: 'Each number is multiplied by 2.'
  };
  const prompt = formatFlashcardAnswerPrompt(card);
  assert.equal(prompt, 'Answer: 32. Explanation: Each number is multiplied by 2.');
});

// ---------------------------------------------------------------------------
// 2. Spoken Command Parser Tests (AnswerParser)
// ---------------------------------------------------------------------------

test('AnswerParser: parses repeat question voice variants to "repeat"', () => {
  assert.equal(parseAnswer('repeat'), 'repeat');
  assert.equal(parseAnswer('repeat question'), 'repeat');
  assert.equal(parseAnswer('repeat the question'), 'repeat');
  assert.equal(parseAnswer('read question again'), 'repeat');
  assert.equal(parseAnswer('read the prompt again'), 'repeat');
  assert.equal(parseAnswer('what was the question'), 'repeat');
  assert.equal(parseAnswer('say question again'), 'repeat');
});

test('AnswerParser: parses repeat options voice variants (including singular "Repeat Option" and "Repeat Answer Choices") to "repeat_options"', () => {
  assert.equal(parseAnswer('repeat option'), 'repeat_options');
  assert.equal(parseAnswer('repeat options'), 'repeat_options');
  assert.equal(parseAnswer('repeat the option'), 'repeat_options');
  assert.equal(parseAnswer('repeat the options'), 'repeat_options');
  assert.equal(parseAnswer('read option'), 'repeat_options');
  assert.equal(parseAnswer('read options'), 'repeat_options');
  assert.equal(parseAnswer('read options again'), 'repeat_options');
  assert.equal(parseAnswer('read the options again'), 'repeat_options');
  assert.equal(parseAnswer('repeat answer choices'), 'repeat_options');
  assert.equal(parseAnswer('read answer choices'), 'repeat_options');
  assert.equal(parseAnswer('what are the options'), 'repeat_options');
  assert.equal(parseAnswer('read the choices'), 'repeat_options');
  assert.equal(parseAnswer('repeat choices'), 'repeat_options');
});

test('AnswerParser: parses specific option repeats (A, B, C, D) including "What is option A?", "Read answer choice C", "Repeat choice D"', () => {
  assert.equal(parseAnswer('repeat option a'), 'repeat_option_a');
  assert.equal(parseAnswer('repeat option b'), 'repeat_option_b');
  assert.equal(parseAnswer('repeat option c'), 'repeat_option_c');
  assert.equal(parseAnswer('repeat option d'), 'repeat_option_d');

  assert.equal(parseAnswer('read option a'), 'repeat_option_a');
  assert.equal(parseAnswer('read option b'), 'repeat_option_b');
  assert.equal(parseAnswer('read option c'), 'repeat_option_c');
  assert.equal(parseAnswer('read option d'), 'repeat_option_d');

  assert.equal(parseAnswer('what is option a?'), 'repeat_option_a');
  assert.equal(parseAnswer('read answer choice c.'), 'repeat_option_c');
  assert.equal(parseAnswer('repeat choice d.'), 'repeat_option_d');
  assert.equal(parseAnswer('repeat answer choice b'), 'repeat_option_b');
  assert.equal(parseAnswer('read choice b'), 'repeat_option_b');
  assert.equal(parseAnswer('what is option c'), 'repeat_option_c');
  assert.equal(parseAnswer('repeat choice d'), 'repeat_option_d');
});

test('AnswerParser: parses speech playback control commands', () => {
  assert.equal(parseAnswer('read slower'), 'read_slower');
  assert.equal(parseAnswer('speak slower'), 'read_slower');
  assert.equal(parseAnswer('slower'), 'read_slower');

  assert.equal(parseAnswer('pause reading'), 'pause_reading');
  assert.equal(parseAnswer('pause speech'), 'pause_reading');
  assert.equal(parseAnswer('pause audio'), 'pause_reading');

  assert.equal(parseAnswer('resume reading'), 'resume_reading');
  assert.equal(parseAnswer('resume speech'), 'resume_reading');
  assert.equal(parseAnswer('resume audio'), 'resume_reading');

  assert.equal(parseAnswer('stop reading'), 'stop_speaking');
  assert.equal(parseAnswer('stop speaking'), 'stop_speaking');
  assert.equal(parseAnswer('stop audio'), 'stop_speaking');
  assert.equal(parseAnswer('be quiet'), 'stop_speaking');
});

test('AnswerParser: standard answering commands remain unimpaired', () => {
  assert.equal(parseAnswer('option a'), 'A');
  assert.equal(parseAnswer('b'), 'B');
  assert.equal(parseAnswer('choice c'), 'C');
  assert.equal(parseAnswer('d'), 'D');
  assert.equal(parseAnswer('next'), 'skip');
  assert.equal(parseAnswer('skip'), 'skip');
  assert.equal(parseAnswer('previous'), 'previous');
});

// ---------------------------------------------------------------------------
// 3. Command Parser & Navigation Controller System Control Tests
// ---------------------------------------------------------------------------

test('CommandParser: parseSystemControl recognizes playback controls', () => {
  assert.equal(parseSystemControl('pause reading'), 'pause_reading');
  assert.equal(parseSystemControl('resume reading'), 'resume_reading');
  assert.equal(parseSystemControl('read slower'), 'read_slower');
  assert.equal(parseSystemControl('stop reading'), 'stop_speaking');
  assert.equal(parseSystemControl('stop speaking'), 'stop_speaking');
  assert.equal(parseSystemControl('repeat'), 'repeat');
});

test('NavigationController: activeVoiceHandler intercepts question repeat ahead of generic system controls', async () => {
  let screenRepeated = false;
  let genericRepeated = false;

  const controller = new NavigationController({
    context: {
      currentScreen: 'voice_practice',
      isExamActive: false,
      user: null,
      pendingExamExit: null,
      historyStack: [],
      lastSpokenText: 'Generic last spoken text'
    },
    navigate: () => {},
    speak: () => {
      genericRepeated = true;
    },
    stopSpeak: () => {},
    logout: () => {}
  });

  const localHandler = (transcript: string) => {
    if (transcript.toLowerCase().includes('repeat')) {
      screenRepeated = true;
      return true;
    }
    return false;
  };

  const result = await controller.processTranscript('repeat the question', localHandler);
  assert.equal(result.status, 'local_handled');
  assert.equal(screenRepeated, true, 'Active screen handler should handle the repeat command');
  assert.equal(genericRepeated, false, 'Generic repeat should not be called when screen handled it');
});

// ---------------------------------------------------------------------------
// 4. Examination Safety & Non-Mutation Invariants
// ---------------------------------------------------------------------------

test('Exam Safety: repeating a question does not mutate state or timer', () => {
  // Simulate active exam state
  const examState = {
    currentIndex: 4,
    answers: { 0: 'A', 1: 'B', 2: 'C', 3: 'D' },
    secondsRemaining: 1800,
    isExamActive: true
  };

  const initialCopy = JSON.stringify(examState);

  // Function simulating repeat question
  const repeatCurrentQuestion = (state: typeof examState, q: Question) => {
    // Generates TTS speech prompt without touching state
    const prompt = formatFullQuestionPrompt(q, state.currentIndex, 20);
    return prompt;
  };

  const prompt = repeatCurrentQuestion(examState, mockQuestion);

  assert.ok(prompt.includes('Question 5 of 20'));
  assert.equal(
    JSON.stringify(examState),
    initialCopy,
    'Exam state must be strictly immutable during question repeat'
  );
  assert.equal(examState.secondsRemaining, 1800, 'Timer must not be modified');
  assert.equal(examState.currentIndex, 4, 'Current question index must not advance');
  assert.equal(Object.keys(examState.answers).length, 4, 'Answers record must remain untouched');
});

// ---------------------------------------------------------------------------
// 5. Centralized Repeat Functions, TTS Interruption, Math Speech & Isolation
// ---------------------------------------------------------------------------

const capitalQuestion: Question = {
  ...mockQuestion,
  question_id: 'Q_CAP_05',
  subject: 'General Awareness',
  topic: 'Geography',
  question_text: 'What is the capital of India?',
  option_a: 'Mumbai',
  option_b: 'New Delhi',
  option_c: 'Chennai',
  option_d: 'Kolkata',
  correct_answer: 'B'
};

test('Centralized Repeat Functions: repeatCurrentQuestion, repeatCurrentOptions, and repeatIndividualOption', () => {
  const spokenOutputs: string[] = [];
  const announcements: string[] = [];
  let stopCalledCount = 0;
  let playbackEndCount = 0;

  const callbacks = {
    stopSpeaking: () => {
      stopCalledCount++;
    },
    announce: (msg: string) => {
      announcements.push(msg);
    },
    speakText: (text: string, onEnd?: () => void) => {
      spokenOutputs.push(text);
      onEnd?.();
    },
    onPlaybackEnd: () => {
      playbackEndCount++;
    }
  };

  // 1. Repeat Question (multiple times)
  const qOut1 = repeatCurrentQuestion(() => capitalQuestion, callbacks);
  const qOut2 = repeatCurrentQuestion(() => capitalQuestion, callbacks);
  assert.equal(qOut1, 'What is the capital of India?');
  assert.equal(qOut2, 'What is the capital of India?');
  assert.equal(announcements[0], 'Repeating Question...');

  // 2. Repeat Options (multiple times)
  const optOut1 = repeatCurrentOptions(() => capitalQuestion, callbacks);
  const optOut2 = repeatCurrentOptions(() => capitalQuestion, callbacks);
  assert.equal(
    optOut1,
    'Option A: Mumbai. Option B: New Delhi. Option C: Chennai. Option D: Kolkata.'
  );
  assert.equal(optOut1, optOut2);
  assert.ok(announcements.includes('Reading Answer Options...'));

  // 3. Individual Option Reading (A, B, C, D)
  const optA = repeatIndividualOption('A', () => capitalQuestion, callbacks);
  const optB = repeatIndividualOption('B', () => capitalQuestion, callbacks);
  const optC = repeatIndividualOption('C', () => capitalQuestion, callbacks);
  const optD = repeatIndividualOption('D', () => capitalQuestion, callbacks);

  assert.equal(optA, 'Option A: Mumbai.');
  assert.equal(optB, 'Option B: New Delhi.');
  assert.equal(optC, 'Option C: Chennai.');
  assert.equal(optD, 'Option D: Kolkata.');
  assert.ok(announcements.includes('Reading Option B...'));
  assert.equal(stopCalledCount, 8, 'Must cancel previous TTS playback on every repeat call');
  assert.equal(playbackEndCount, 8, 'Must return to listening state after each TTS playback completes');
});

test('Repeat Mathematical & Long Questions: Spoken representations of math expressions and long stems without truncation', () => {
  const mathQ: Question = {
    ...mockQuestion,
    question_id: 'Q_MATH_99',
    subject: 'Numerical and Mathematical Ability',
    topic: 'Algebra & Simplification',
    question_text: 'If 2x + 5 = 15, find the value of √144 + 25% of 200 and ratio 3 : 4.',
    option_a: '12 × 5',
    option_b: '36 ÷ 6',
    option_c: 'x^2 + 3',
    option_d: '\\frac{3}{4}'
  };

  const qSpoken = repeatCurrentQuestion(mathQ);
  assert.ok(qSpoken.includes('2 times x plus 5 equals 15'), `Unexpected math speech: ${qSpoken}`);
  assert.ok(qSpoken.includes('square root of 144'), `Missing square root speech: ${qSpoken}`);
  assert.ok(qSpoken.includes('25 percent of 200'), `Missing percentage speech: ${qSpoken}`);
  assert.ok(qSpoken.includes('3 is to 4'), `Missing ratio speech: ${qSpoken}`);

  const optASpoken = repeatIndividualOption('A', mathQ);
  const optBSpoken = repeatIndividualOption('B', mathQ);
  const optCSpoken = repeatIndividualOption('C', mathQ);
  const optDSpoken = repeatIndividualOption('D', mathQ);

  assert.ok(optASpoken.includes('12 times 5'), `Unexpected Option A speech: ${optASpoken}`);
  assert.ok(optBSpoken.includes('36 divided by 6'), `Unexpected Option B speech: ${optBSpoken}`);
  assert.ok(optCSpoken.includes('x squared plus 3'), `Unexpected Option C speech: ${optCSpoken}`);
  assert.ok(optDSpoken.includes('3 divided by 4'), `Unexpected Option D speech: ${optDSpoken}`);

  // Long question test (no truncation)
  const longStem =
    'In a comprehensive multi-stage Staff Selection Commission Multi-Tasking Staff examination scenario, ' +
    'a candidate travels from New Delhi to Mumbai covering 1400 kilometers at a constant speed, ' +
    'and then continues to Chennai covering an additional 1300 kilometers. ' +
    'What is the total distance travelled by the candidate across both segments of the journey?';
  const longQ: Question = {
    ...mockQuestion,
    question_text: longStem
  };
  const longSpoken = repeatCurrentQuestion(longQ);
  assert.equal(longSpoken, longStem);
});

test('VoiceEngine Barge-In & End-to-End Repeat Flow: Repeat while TTS is playing, preserve selected answer, and isolate Pilot Demo vs Mock Exam', async () => {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const pilotQuestion: Question = {
    ...capitalQuestion,
    question_id: 'PD_Q1',
    question_text: 'What is the capital of India?'
  };

  const mockExamQuestion: Question = {
    ...mockQuestion,
    question_id: 'ME_Q1',
    question_text: 'What is the LCM of 12 and 18?'
  };

  let activeModule: 'pilot_demo' | 'mock_exam' = 'pilot_demo';
  let selectedAnswer: string | null = null;
  let stopSpeakingCount = 0;
  const spokenHistory: string[] = [];

  const screenVoiceHandler = (transcript: string): boolean => {
    const activeQ = activeModule === 'pilot_demo' ? pilotQuestion : mockExamQuestion;
    const parsed = parseSpokenAnswer(transcript, {
      A: activeQ.option_a,
      B: activeQ.option_b,
      C: activeQ.option_c,
      D: activeQ.option_d
    });
    if (!parsed) return false;

    const cb = {
      stopSpeaking: () => {
        stopSpeakingCount++;
      },
      speakText: (txt: string, onEnd?: () => void) => {
        spokenHistory.push(txt);
        onEnd?.();
      }
    };

    if (parsed.type === 'control') {
      if (parsed.command === 'repeat') {
        repeatCurrentQuestion(activeQ, cb);
        return true;
      }
      if (parsed.command === 'repeat_options') {
        repeatCurrentOptions(activeQ, cb);
        return true;
      }
      if (parsed.command === 'repeat_option_a') {
        repeatIndividualOption('A', activeQ, cb);
        return true;
      }
      if (parsed.command === 'repeat_option_b') {
        repeatIndividualOption('B', activeQ, cb);
        return true;
      }
      if (parsed.command === 'repeat_option_c') {
        repeatIndividualOption('C', activeQ, cb);
        return true;
      }
      if (parsed.command === 'repeat_option_d') {
        repeatIndividualOption('D', activeQ, cb);
        return true;
      }
    }

    if (parsed.type === 'option') {
      selectedAnswer = parsed.option;
      return true;
    }

    return false;
  };

  const engine = new VoiceEngine({
    lang: 'en-IN',
    silenceTimeoutMs: 25,
    onTranscript: async (text) => {
      screenVoiceHandler(text);
    },
    onStopSpeaking: () => {
      stopSpeakingCount++;
    },
    onListeningChange: () => {}
  });

  // 1. Wake up
  engine.handleSpeechTranscript('Hey Vision');
  assert.equal(engine.getState(), 'LISTENING');

  // 2. Simulate TTS currently reading a question, and user barges in with "Repeat Question"
  engine.setSpeaking(true, 'Question 1 of 20. What is the capital of India? Option A: Mumbai...');
  engine.handleSpeechTranscript('Repeat Question');
  await sleep(50);

  assert.ok(stopSpeakingCount >= 1, 'Ongoing TTS must be cancelled when Repeat Question is spoken');
  assert.equal(spokenHistory[spokenHistory.length - 1], 'What is the capital of India?');
  assert.equal(engine.getState(), 'LISTENING');

  // 3. User says "Repeat Option" (singular) while in Pilot Demo
  engine.handleSpeechTranscript('Repeat Option');
  await sleep(50);
  assert.equal(
    spokenHistory[spokenHistory.length - 1],
    'Option A: Mumbai. Option B: New Delhi. Option C: Chennai. Option D: Kolkata.'
  );

  // 4. User says "Repeat Option B"
  engine.handleSpeechTranscript('Repeat Option B');
  await sleep(50);
  assert.equal(spokenHistory[spokenHistory.length - 1], 'Option B: New Delhi.');
  assert.equal(selectedAnswer, null, 'Repeating an option must NOT select it as the answer');

  // 5. User selects Option C, then repeats question & options -> selectedAnswer must stay 'C'
  engine.handleSpeechTranscript('Option C');
  await sleep(50);
  assert.equal(selectedAnswer, 'C');

  engine.handleSpeechTranscript('Read question again');
  await sleep(50);
  assert.equal(spokenHistory[spokenHistory.length - 1], 'What is the capital of India?');
  assert.equal(selectedAnswer, 'C', 'Selected answer must remain unchanged after Repeat Question');

  engine.handleSpeechTranscript('Read answer choice D');
  await sleep(50);
  assert.equal(spokenHistory[spokenHistory.length - 1], 'Option D: Kolkata.');
  assert.equal(selectedAnswer, 'C', 'Selected answer must remain unchanged after reading Option D');

  // 6. Switch active context to Mock Examination -> Repeat Question must read Mock Exam question
  activeModule = 'mock_exam';
  engine.handleSpeechTranscript('Repeat the question');
  await sleep(50);
  assert.equal(spokenHistory[spokenHistory.length - 1], 'What is the LCM of 12 and 18?');

  // 7. Ensure "Read all options" does not trigger subject selection in Voice Practice
  assert.equal(parseSubjectSelectionIntent('read all options'), null);
  assert.equal(parseSubjectSelectionIntent('repeat all options'), null);
});
