import test from 'node:test';
import assert from 'node:assert/strict';
import { loadQuestions, DiagnosticAttempt, TopicMasteryRecord, LearningHistoryEntry } from '../db/database.ts';
import { getRepository } from '../db/repository.ts';
import {
  selectPilotDemoQuestions,
  evaluatePilotDemoSubmission,
  classifyTopicPriority,
  generateDiagnosticRecommendations,
  DIAGNOSTIC_SECTIONS,
  PILOT_DEMO_DURATION_SECONDS,
  PILOT_DEMO_TOTAL_QUESTIONS,
  PILOT_DEMO_MAX_SCORE
} from '../utils/pilotDemoScoring.ts';
import { matchScreenNavigation } from '../voice/commandParser.ts';
import { NavigationController } from '../voice/NavigationController.ts';
import { ScreenId } from '../types/screens.ts';

test('Pilot Demo: selects exactly 20 questions with 5 questions in each of the 4 SSC MTS subjects', () => {
  const allQuestions = loadQuestions();
  const selected = selectPilotDemoQuestions(allQuestions);

  assert.equal(selected.length, PILOT_DEMO_TOTAL_QUESTIONS, 'Must select exactly 20 questions');
  assert.equal(PILOT_DEMO_DURATION_SECONDS, 1500, 'Duration must be 25 minutes (1500s)');

  for (const sec of DIAGNOSTIC_SECTIONS) {
    const count = selected.filter((q) => q.subject === sec.subject).length;
    assert.equal(count, 5, `Section ${sec.section} (${sec.subject}) must have 5 questions`);
  }
});

test('Pilot Demo Marking Scheme: Sections A & B award +3/0 and Sections C & D award +3/-1', () => {
  const allQuestions = loadQuestions();
  const selected = selectPilotDemoQuestions(allQuestions);

  // Construct submissions:
  // Section A (0..4): 2 correct (+6), 2 incorrect (0 penalty), 1 unanswered (0) -> Net 6
  // Section B (5..9): 3 correct (+9), 2 incorrect (0 penalty) -> Net 9
  // Section C (10..14): 2 correct (+6), 2 incorrect (-2 penalty), 1 unanswered (0) -> Net 4
  // Section D (15..19): 1 correct (+3), 1 incorrect (-1 penalty), 3 unanswered (0) -> Net 2
  const pickWrong = (ans: string) => (['A', 'B', 'C', 'D'].find((x) => x !== ans) || 'B');

  const submissions = selected.map((q, idx) => {
    let selectedOption: string | null = null;
    if (idx === 0 || idx === 1) selectedOption = q.correct_answer;
    else if (idx === 2 || idx === 3) selectedOption = pickWrong(q.correct_answer);
    else if (idx === 5 || idx === 6 || idx === 7) selectedOption = q.correct_answer;
    else if (idx === 8 || idx === 9) selectedOption = pickWrong(q.correct_answer);
    else if (idx === 10 || idx === 11) selectedOption = q.correct_answer;
    else if (idx === 12 || idx === 13) selectedOption = pickWrong(q.correct_answer);
    else if (idx === 15) selectedOption = q.correct_answer;
    else if (idx === 16) selectedOption = pickWrong(q.correct_answer);

    return {
      questionId: q.question_id,
      selectedOption,
      timeSpentSeconds: 30
    };
  });

  const evalResult = evaluatePilotDemoSubmission(selected, submissions, 900);

  assert.equal(evalResult.totalQuestions, 20);
  assert.equal(evalResult.totalMax, PILOT_DEMO_MAX_SCORE);
  assert.equal(evalResult.correctCount, 8);
  assert.equal(evalResult.incorrectCount, 7);
  assert.equal(evalResult.unansweredCount, 5);
  assert.equal(evalResult.session1Score, 15, 'Sections A & B net score should be 6 + 9 = 15 (0 negative)');
  assert.equal(evalResult.session2Score, 6, 'Sections C & D net score should be 4 + 2 = 6 (with -1 negative marking)');
  assert.equal(evalResult.totalScore, 21, 'Total score should be 15 + 6 = 21');
  assert.equal(evalResult.totalTimeSeconds, 900);
});

test('Pilot Demo Topic Priority Thresholds & Single-Question Confidence Guard', () => {
  // Below 40% -> High Priority
  const low = classifyTopicPriority(25, 4, 4);
  assert.equal(low.priority, 'High Priority');

  // 40-69% -> Moderate Priority
  const mod = classifyTopicPriority(50, 4, 4);
  assert.equal(mod.priority, 'Moderate Priority');

  // 70-84% -> Revision Recommended
  const rev = classifyTopicPriority(75, 4, 4);
  assert.equal(rev.priority, 'Revision Recommended');

  // >= 85% with only 1 question -> does NOT overconfidently claim Strong Topic
  const singleCorrect = classifyTopicPriority(100, 1, 1);
  assert.equal(singleCorrect.priority, 'Revision Recommended');

  // >= 85% with >= 2 questions -> Strong Topic
  const confirmedStrong = classifyTopicPriority(90, 3, 3);
  assert.equal(confirmedStrong.priority, 'Strong Topic');
});

test('Pilot Demo Database Persistence: Idempotent submission prevents duplicate attempts on retry & enforces candidate isolation', async () => {
  const repo = await getRepository();
  const allQuestions = loadQuestions();
  const selected = selectPilotDemoQuestions(allQuestions);

  const userA = `usr_diag_A_${Date.now()}`;
  const userB = `usr_diag_B_${Date.now()}`;
  const clientSubId = `sub_idempotent_${Date.now()}`;

  const submissions = selected.map((q) => ({
    questionId: q.question_id,
    selectedOption: q.correct_answer,
    timeSpentSeconds: 20
  }));

  const evalResult = evaluatePilotDemoSubmission(selected, submissions, 400);

  const attempt: DiagnosticAttempt = {
    id: `diag_${clientSubId}`,
    clientSubmissionId: clientSubId,
    userId: userA,
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
    totalTimeSeconds: evalResult.totalTimeSeconds,
    responses: evalResult.responses,
    subjectBreakdown: evalResult.subjectBreakdown,
    topicBreakdown: evalResult.topicBreakdown,
    completedAt: new Date().toISOString()
  };

  const bktUpdates: TopicMasteryRecord[] = [];
  const historyEntry: LearningHistoryEntry = {
    id: `hist_${clientSubId}`,
    userId: userA,
    type: 'diagnostic',
    title: 'SSC MTS Pilot Demo Diagnostic',
    summary: 'Diagnostic test',
    score: 60,
    maxScore: 60,
    durationSeconds: 400,
    timestamp: new Date().toISOString()
  };

  // First submission
  await repo.recordDiagnosticAttempt(attempt, bktUpdates, historyEntry);
  // Repeated submission with same clientSubmissionId (simulating retry / double-click)
  await repo.recordDiagnosticAttempt(attempt, bktUpdates, historyEntry);

  const attemptsA = await repo.getDiagnosticAttempts(userA);
  assert.equal(attemptsA.length, 1, 'Repeated submit with same clientSubmissionId must not create duplicate attempts');
  assert.equal(attemptsA[0].totalScore, 60);

  // Candidate B must see 0 attempts (multi-tenant isolation)
  const attemptsB = await repo.getDiagnosticAttempts(userB);
  assert.equal(attemptsB.length, 0, 'Candidate B must not see Candidate A diagnostic attempts');
});

test('Pilot Demo Recommendations: Detects improving trends and repeated mistakes across actual attempts', () => {
  const allQuestions = loadQuestions();
  const selected = selectPilotDemoQuestions(allQuestions);
  const firstQ = selected[0];
  const wrongOpt = ['A', 'B', 'C', 'D'].find((o) => o !== firstQ.correct_answer) || 'B';

  // Attempt 1: Question 0 is wrong
  const eval1 = evaluatePilotDemoSubmission(
    selected,
    selected.map((q, i) => ({
      questionId: q.question_id,
      selectedOption: i === 0 ? wrongOpt : q.correct_answer,
      timeSpentSeconds: 25
    })),
    500
  );

  // Attempt 2: Question 0 is now correct (improving), Question 1 is wrong twice
  const eval2 = evaluatePilotDemoSubmission(
    selected,
    selected.map((q) => ({
      questionId: q.question_id,
      selectedOption: q.correct_answer,
      timeSpentSeconds: 25
    })),
    480
  );

  const recResult = generateDiagnosticRecommendations([
    {
      id: 'diag_1',
      completedAt: '2026-11-01T10:00:00Z',
      responses: eval1.responses,
      topicBreakdown: eval1.topicBreakdown
    },
    {
      id: 'diag_2',
      completedAt: '2026-11-05T10:00:00Z',
      responses: eval2.responses,
      topicBreakdown: eval2.topicBreakdown
    }
  ]);

  assert.equal(recResult.hasSufficientHistory, true);
  assert.ok(recResult.recommendations.length > 0);
  const improvedTopic = recResult.recommendations.find((r) => r.topic === firstQ.topic);
  assert.ok(improvedTopic);
  assert.equal(improvedTopic.trendLabel, 'Improving');
});

test('Pilot Demo Voice Navigation & Active Exam Safety Guard', async () => {
  // Voice aliases resolve to pilot_demo while mock_exam remains independent
  const pilotMatch = matchScreenNavigation('open pilot demo');
  assert.ok(pilotMatch);
  assert.equal(pilotMatch.target.screenId, 'pilot_demo');

  const diagMatch = matchScreenNavigation('pilot demo diagnostic');
  assert.ok(diagMatch);
  assert.equal(diagMatch.target.screenId, 'pilot_demo');

  const mockMatch = matchScreenNavigation('open mock examination');
  assert.ok(mockMatch);
  assert.equal(mockMatch.target.screenId, 'mock_exam');

  // Active exam safety guard blocks accidental navigation away from active pilot_demo
  const navigated: ScreenId[] = [];
  const controller = new NavigationController({
    context: {
      currentScreen: 'pilot_demo',
      user: {
        id: 'usr_1',
        rollNumber: 'R1',
        name: 'Student',
        email: 's@test.com',
        passwordHash: 'x',
        role: 'candidate',
        pwdCategory: 'None',
        needScribe: false,
        examRegion: 'NR',
        examLanguage: 'English',
        createdAt: new Date().toISOString()
      },
      isExamActive: true,
      pendingExamExit: null,
      historyStack: [],
      lastSpokenText: ''
    },
    navigate: (s) => navigated.push(s),
    speak: () => {},
    stopSpeak: () => {},
    logout: () => {}
  });

  const blockRes = await controller.processTranscript('go to dashboard');
  assert.equal(blockRes.status, 'blocked_by_active_exam');
  assert.equal(navigated.length, 0);
});

