import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AcceptanceStatus,
  AcceptanceMethod,
  MIN_ACCEPTANCE_CONFIDENCE,
  PILOT_DEMO_FULL_INSTRUCTIONS_SPEECH,
  VOICE_YES_CLARIFICATION_FEEDBACK,
  VOICE_AMBIGUOUS_FEEDBACK,
  VOICE_LOW_CONFIDENCE_FEEDBACK,
  VOICE_MIC_DENIED_FEEDBACK,
  VOICE_ACCEPTED_FEEDBACK,
  VOICE_STARTING_FEEDBACK,
  evaluateVoiceAcceptanceCommand,
  applyCheckboxAcceptanceToggle,
  isReadyToBeginTest
} from '../utils/pilotDemoAcceptance.ts';
import { getRepository } from '../db/repository.ts';
import { loadQuestions, DiagnosticAttempt } from '../db/database.ts';
import { selectPilotDemoQuestions, evaluatePilotDemoSubmission } from '../utils/pilotDemoScoring.ts';
import { formatFullQuestionPrompt } from '../utils/repeatQuestionHelper.ts';

/**
 * Lightweight controller mirror of PilotDemoScreen acceptance + start lifecycle
 * for deterministic verification of scenarios 1–15.
 */
function createAcceptanceHarness(opts: { micDenied?: boolean; isBlindMode?: boolean } = {}) {
  let status: AcceptanceStatus = 'NOT_ACCEPTED';
  let timerStartedCount = 0;
  let examStartCount = 0;
  let ttsPlaying = true;
  let micListening = false;
  let question1Read = false;
  let acceptanceMethod: AcceptanceMethod | null = null;
  let acceptedAt: string | null = null;
  let examStartedAt: string | null = null;
  const spokenLog: string[] = [];

  const questions = selectPilotDemoQuestions(loadQuestions());

  function enterInstructions() {
    status = 'READING_INSTRUCTIONS';
    ttsPlaying = true;
    spokenLog.push(PILOT_DEMO_FULL_INSTRUCTIONS_SPEECH);
  }

  function finishReadingInstructions() {
    if (opts.micDenied) {
      status = 'WAITING_FOR_ACCEPTANCE';
      spokenLog.push(VOICE_MIC_DENIED_FEEDBACK);
      micListening = false;
      return;
    }
    ttsPlaying = false;
    status = 'WAITING_FOR_ACCEPTANCE';
    micListening = true;
  }

  function startExam(method: AcceptanceMethod) {
    if (examStartCount > 0) return false;
    if (method !== 'VOICE' && status !== 'ACCEPTED') return false;

    ttsPlaying = false; // cancels any active TTS immediately
    micListening = false; // stops mic safely
    acceptedAt = acceptedAt || new Date().toISOString();
    examStartedAt = new Date().toISOString();
    acceptanceMethod = method;
    status = 'STARTING_EXAM';
    examStartCount++;
    timerStartedCount++;
    status = 'EXAM_IN_PROGRESS';

    const startMsg =
      method === 'VOICE'
        ? `${VOICE_ACCEPTED_FEEDBACK} ${VOICE_STARTING_FEEDBACK}`
        : VOICE_STARTING_FEEDBACK;
    spokenLog.push(startMsg);

    if (method === 'VOICE' || opts.isBlindMode) {
      spokenLog.push(formatFullQuestionPrompt(questions[0], 0, questions.length));
      question1Read = true;
    }
    return true;
  }

  function handleVoiceInput(transcript: string, confidence?: number) {
    const decision = evaluateVoiceAcceptanceCommand(status, transcript, confidence);
    if (decision.kind === 'accepted') {
      status = 'ACCEPTED';
      acceptedAt = new Date().toISOString();
      return startExam('VOICE');
    }
    if (decision.feedbackSpeech) {
      spokenLog.push(decision.feedbackSpeech);
    }
    return false;
  }

  function toggleCheckbox(checked: boolean) {
    status = applyCheckboxAcceptanceToggle(status, checked);
    if (checked) {
      acceptedAt = new Date().toISOString();
      acceptanceMethod = 'CHECKBOX';
    } else {
      acceptedAt = null;
      acceptanceMethod = null;
    }
  }

  return {
    get state() {
      return {
        status,
        timerStartedCount,
        examStartCount,
        ttsPlaying,
        micListening,
        question1Read,
        acceptanceMethod,
        acceptedAt,
        examStartedAt,
        spokenLog
      };
    },
    enterInstructions,
    finishReadingInstructions,
    handleVoiceInput,
    toggleCheckbox,
    clickBeginButton: () => startExam('CHECKBOX'),
    pressKeyboardBegin: () => startExam('KEYBOARD')
  };
}

test('Scenario 1-3: Explicit voice acceptance commands ("I agree and begin test", "I accept the instructions", "Begin test") start exam', () => {
  for (const phrase of [
    'I agree and begin test.',
    'I accept the instructions!',
    'Begin test',
    'I understand and want to start',
    'Accept and start examination',
    'Start my diagnostic examination'
  ]) {
    const h = createAcceptanceHarness();
    h.enterInstructions();
    h.finishReadingInstructions();

    const started = h.handleVoiceInput(phrase, 0.92);
    assert.equal(started, true, `Phrase "${phrase}" should accept & start exam`);
    assert.equal(h.state.status, 'EXAM_IN_PROGRESS');
    assert.equal(h.state.acceptanceMethod, 'VOICE');
    assert.equal(h.state.timerStartedCount, 1);
    assert.equal(h.state.question1Read, true);
  }
});

test('Scenario 4-5: Vague "Yes" and unrelated sentences do NOT start the exam', () => {
  const h = createAcceptanceHarness();
  h.enterInstructions();
  h.finishReadingInstructions();

  // Only "Yes"
  assert.equal(h.handleVoiceInput('Yes', 0.95), false);
  assert.equal(h.state.status, 'WAITING_FOR_ACCEPTANCE');
  assert.equal(h.state.timerStartedCount, 0);
  assert.equal(h.state.spokenLog.at(-1), VOICE_YES_CLARIFICATION_FEEDBACK);

  // Vague "Okay" and "Start"
  assert.equal(h.handleVoiceInput('Okay', 0.95), false);
  assert.equal(h.handleVoiceInput('Start', 0.95), false);
  assert.equal(h.handleVoiceInput('I understand', 0.95), false);
  assert.equal(h.state.timerStartedCount, 0);

  // Unrelated sentence
  assert.equal(h.handleVoiceInput('What is the weather outside today', 0.91), false);
  assert.equal(h.state.status, 'WAITING_FOR_ACCEPTANCE');
  assert.equal(h.state.timerStartedCount, 0);
  assert.equal(h.state.spokenLog.at(-1), VOICE_AMBIGUOUS_FEEDBACK);
});

test('Scenario 6: Low recognition confidence requests repetition and prevents exam start', () => {
  const h = createAcceptanceHarness();
  h.enterInstructions();
  h.finishReadingInstructions();

  const started = h.handleVoiceInput('I agree and begin test', MIN_ACCEPTANCE_CONFIDENCE - 0.2);
  assert.equal(started, false);
  assert.equal(h.state.status, 'WAITING_FOR_ACCEPTANCE');
  assert.equal(h.state.timerStartedCount, 0);
  assert.equal(h.state.spokenLog.at(-1), VOICE_LOW_CONFIDENCE_FEEDBACK);
});

test('Scenario 7-8: Checkbox & Keyboard flows update unified state and start exam with correct method', () => {
  // Checkbox mouse click
  const h1 = createAcceptanceHarness();
  h1.toggleCheckbox(true);
  assert.equal(h1.state.status, 'ACCEPTED');
  assert.equal(isReadyToBeginTest(h1.state.status), true);
  assert.equal(h1.clickBeginButton(), true);
  assert.equal(h1.state.acceptanceMethod, 'CHECKBOX');
  assert.equal(h1.state.timerStartedCount, 1);

  // Keyboard navigation / Enter activation (with Blind Mode reading Q1)
  const h2 = createAcceptanceHarness({ isBlindMode: true });
  h2.toggleCheckbox(true);
  assert.equal(h2.pressKeyboardBegin(), true);
  assert.equal(h2.state.acceptanceMethod, 'KEYBOARD');
  assert.equal(h2.state.timerStartedCount, 1);
  assert.equal(h2.state.question1Read, true);
});

test('Scenario 9 & 13: Duplicate acceptance commands cannot trigger duplicate starts or multiple timers', () => {
  const h = createAcceptanceHarness();
  h.enterInstructions();
  h.finishReadingInstructions();

  assert.equal(h.handleVoiceInput('I agree and begin test', 0.95), true);
  // Second attempt immediately after
  assert.equal(h.handleVoiceInput('I agree and begin test', 0.95), false);
  assert.equal(h.clickBeginButton(), false);
  assert.equal(h.state.examStartCount, 1);
  assert.equal(h.state.timerStartedCount, 1);
});

test('Scenario 10: Denied microphone permission informs candidate of checkbox/keyboard fallback', () => {
  const h = createAcceptanceHarness({ micDenied: true });
  h.enterInstructions();
  h.finishReadingInstructions();

  assert.equal(h.state.micListening, false);
  assert.equal(h.state.spokenLog.at(-1), VOICE_MIC_DENIED_FEEDBACK);
  assert.equal(h.state.timerStartedCount, 0);

  // Checkbox fallback still works seamlessly
  h.toggleCheckbox(true);
  assert.equal(h.clickBeginButton(), true);
  assert.equal(h.state.timerStartedCount, 1);
});

test('Scenario 11: Voice commands ignored while TTS still reading instructions; checkbox cancels TTS cleanly', () => {
  const h = createAcceptanceHarness();
  h.enterInstructions();
  assert.equal(h.state.status, 'READING_INSTRUCTIONS');
  assert.equal(h.state.ttsPlaying, true);

  // Background/accidental speech while still READING_INSTRUCTIONS is ignored
  assert.equal(h.handleVoiceInput('I agree and begin test', 0.98), false);
  assert.equal(h.state.timerStartedCount, 0);

  // Checkbox + Begin cancels playing TTS safely and starts once
  h.toggleCheckbox(true);
  assert.equal(h.clickBeginButton(), true);
  assert.equal(h.state.ttsPlaying, false);
  assert.equal(h.state.timerStartedCount, 1);
});

test('Scenario 12 & 14-15: Refreshing instruction page resets state without starting timer; Blind Mode reads Q1 automatically', () => {
  // Fresh page / refresh state: timer has NOT started
  const fresh = createAcceptanceHarness({ isBlindMode: true });
  fresh.enterInstructions();
  assert.equal(fresh.state.timerStartedCount, 0);
  assert.equal(fresh.state.status, 'READING_INSTRUCTIONS');
  assert.ok(fresh.state.spokenLog[0].includes('20 questions'));
  assert.ok(fresh.state.spokenLog[0].includes('25 minutes'));
  assert.ok(fresh.state.spokenLog[0].includes("I agree and begin test"));

  // After reading finishes -> WAITING_FOR_ACCEPTANCE -> voice command -> Question 1 read aloud
  fresh.finishReadingInstructions();
  assert.equal(fresh.state.status, 'WAITING_FOR_ACCEPTANCE');
  assert.equal(fresh.state.micListening, true);

  assert.equal(fresh.handleVoiceInput('I agree and begin test', 0.94), true);
  assert.equal(fresh.state.micListening, false);
  assert.equal(fresh.state.question1Read, true);
  assert.ok(fresh.state.spokenLog.at(-1)?.includes('Question 1 of 20'));
});

test('Database Audit Trail: DiagnosticAttempt persists acceptanceStatus, acceptanceMethod, acceptedAt, and examStartedAt', async () => {
  const repo = await getRepository();
  const questions = selectPilotDemoQuestions(loadQuestions());
  const evalResult = evaluatePilotDemoSubmission(
    questions,
    questions.map((q) => ({ questionId: q.question_id, selectedOption: q.correct_answer, timeSpentSeconds: 15 })),
    300
  );

  const uid = `usr_voice_audit_${Date.now()}`;
  const subId = `sub_voice_audit_${Date.now()}`;
  const acceptedAt = new Date(Date.now() - 1000).toISOString();
  const examStartedAt = new Date().toISOString();

  const attempt: DiagnosticAttempt = {
    id: `diag_${subId}`,
    clientSubmissionId: subId,
    userId: uid,
    examTitle: 'SSC MTS Pilot Demo Diagnostic',
    status: 'completed',
    totalQuestions: 20,
    attemptedCount: evalResult.attemptedCount,
    correctCount: evalResult.correctCount,
    incorrectCount: evalResult.incorrectCount,
    unansweredCount: evalResult.unansweredCount,
    session1Score: evalResult.session1Score,
    session2Score: evalResult.session2Score,
    totalScore: evalResult.totalScore,
    totalMax: evalResult.totalMax,
    percentage: evalResult.percentage,
    accuracyPercentage: evalResult.accuracyPercentage,
    totalTimeSeconds: 300,
    responses: evalResult.responses,
    subjectBreakdown: evalResult.subjectBreakdown,
    topicBreakdown: evalResult.topicBreakdown,
    acceptanceStatus: 'ACCEPTED',
    acceptanceMethod: 'VOICE',
    acceptedAt,
    examStartedAt,
    completedAt: new Date().toISOString()
  };

  await repo.recordDiagnosticAttempt(attempt, [], {
    id: `hist_${subId}`,
    userId: uid,
    type: 'diagnostic',
    title: attempt.examTitle,
    summary: 'Voice acceptance audit test',
    score: evalResult.totalScore,
    maxScore: evalResult.totalMax,
    durationSeconds: 300,
    timestamp: new Date().toISOString()
  });

  const saved = await repo.getDiagnosticAttemptById(attempt.id);
  assert.ok(saved);
  assert.equal(saved.acceptanceStatus, 'ACCEPTED');
  assert.equal(saved.acceptanceMethod, 'VOICE');
  assert.equal(saved.acceptedAt, acceptedAt);
  assert.equal(saved.examStartedAt, examStartedAt);
});

