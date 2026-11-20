import test from 'node:test';
import assert from 'node:assert/strict';
import { getRepository, JsonRepository, PostgresRepository } from '../db/repository.ts';
import { runDatabaseMigration } from '../db/migration.ts';
import { checkPostgresConnection } from '../db/db_pool.ts';
import { User, PracticeAttempt, MockExamAttempt, TopicMasteryRecord, RevisionItem, LearningHistoryEntry } from '../db/database.ts';
import { updateBKT, classifyMasteryTier } from '../utils/bkt.ts';
import { calculateSM2, getNextReviewDate } from '../utils/sm2.ts';

test('DB-1: Database Migration and Connectivity Probe', async () => {
  const report = await runDatabaseMigration();
  assert.equal(report.success, true);
  assert.ok(['PostgreSQL', 'File JSON Fallback'].includes(report.databaseEngine));
  assert.equal(report.tablesVerified.length, 8);
  assert.ok(report.counts.questions >= 400);
});

test('DB-2: Candidate Registration and Authentication Flow', async () => {
  const repo = await getRepository();
  const testEmail = `test_candidate_${Date.now()}@test.ssc.in`;
  const testUser: User = {
    id: `usr_test_${Date.now()}`,
    rollNumber: `SSC-TEST-${Date.now().toString().slice(-4)}`,
    name: 'Pooja Verma',
    email: testEmail,
    passwordHash: 'c4ca4238a0b923820dcc509a6f75849b',
    role: 'candidate',
    pwdCategory: 'Low Vision',
    needScribe: false,
    examRegion: 'Western Region (WR)',
    examLanguage: 'Hindi',
    createdAt: new Date().toISOString()
  };

  const created = await repo.createUser(testUser);
  assert.equal(created.id, testUser.id);

  // Authenticate by email
  const foundByEmail = await repo.getUserByIdentifier(testEmail);
  assert.ok(foundByEmail);
  assert.equal(foundByEmail.name, 'Pooja Verma');
  assert.equal(foundByEmail.pwdCategory, 'Low Vision');

  // Authenticate by roll number
  const foundByRoll = await repo.getUserByIdentifier(testUser.rollNumber);
  assert.ok(foundByRoll);
  assert.equal(foundByRoll.id, testUser.id);
});

test('DB-3: Transactional Practice Submission with BKT and SM-2 Updates', async () => {
  const repo = await getRepository();
  const userId = `usr_bkt_test_${Date.now()}`;
  const questionId = 'SSC-MTS-NUM-001';

  // Prior BKT state: novice
  const priorP = 0.25;
  const newP = updateBKT(priorP, true);
  const tier = classifyMasteryTier(newP);

  const attempt: PracticeAttempt = {
    id: `att_${Date.now()}`,
    userId,
    questionId,
    selectedOption: 'B',
    isCorrect: true,
    timeSpentSeconds: 28,
    mode: 'voice',
    timestamp: new Date().toISOString()
  };

  const bktRecord: TopicMasteryRecord = {
    id: `mst_${Date.now()}`,
    userId,
    subject: 'Numerical and Mathematical Ability',
    topic: 'Number Systems',
    p_known: newP,
    masteryPercentage: Math.round(newP * 100),
    tier,
    attemptsCount: 1,
    correctCount: 1,
    updatedAt: new Date().toISOString()
  };

  const sm2Calc = calculateSM2({ repetitions: 0, intervalDays: 1, easinessFactor: 2.5 }, 5);
  const sm2Record: RevisionItem = {
    id: `rev_${Date.now()}`,
    userId,
    questionId,
    repetitions: sm2Calc.repetitions,
    intervalDays: sm2Calc.intervalDays,
    easinessFactor: sm2Calc.easinessFactor,
    lastReviewedAt: new Date().toISOString(),
    nextReviewDue: getNextReviewDate(sm2Calc.intervalDays),
    masteryLevel: sm2Calc.masteryLevel
  };

  const historyEntry: LearningHistoryEntry = {
    id: `hist_${Date.now()}`,
    userId,
    type: 'practice',
    title: 'Practice: Number Systems',
    summary: 'Q: What is the remainder when... Result: Correct',
    score: 3,
    maxScore: 3,
    durationSeconds: 28,
    timestamp: new Date().toISOString()
  };

  await repo.recordPracticeAttempt(attempt, bktRecord, sm2Record, historyEntry);

  // Verify BKT update persisted
  const mastery = await repo.getTopicMastery(userId);
  const updatedTopic = mastery.find((m) => m.topic === 'Number Systems');
  assert.ok(updatedTopic);
  assert.equal(updatedTopic.attemptsCount, 1);
  assert.equal(updatedTopic.correctCount, 1);
  assert.ok(updatedTopic.p_known > 0.25);

  // Verify SM-2 item persisted
  const revItems = await repo.getRevisionItems(userId);
  assert.equal(revItems.totalCount, 1);
  assert.equal(revItems.upcomingCount + revItems.dueTodayCount, 1);
});

test('DB-4: Mock Examination Submission and Score Recording', async () => {
  const repo = await getRepository();
  const userId = `usr_mock_test_${Date.now()}`;

  const mockAttempt: MockExamAttempt = {
    id: `mock_test_${Date.now()}`,
    userId,
    examTitle: 'SSC MTS Full Mock Test #1',
    session1Score: 90,
    session2Score: 115,
    totalScore: 205,
    totalMax: 270,
    percentage: 75.92,
    qualified: true,
    totalTimeSeconds: 5200,
    answers: { 'SSC-MTS-NUM-001': { selectedOption: 'A', timeSpent: 25 } },
    completedAt: new Date().toISOString()
  };

  const historyEntry: LearningHistoryEntry = {
    id: `hist_${Date.now()}`,
    userId,
    type: 'mock_exam',
    title: mockAttempt.examTitle,
    summary: 'Score: 205/270 (75.92%). Session-I: Qualified.',
    score: 205,
    maxScore: 270,
    durationSeconds: 5200,
    timestamp: new Date().toISOString()
  };

  await repo.recordMockAttempt(mockAttempt, historyEntry);

  const mocks = await repo.getMockAttempts(userId);
  assert.equal(mocks.length, 1);
  assert.equal(mocks[0].totalScore, 205);
  assert.equal(mocks[0].qualified, true);

  const found = await repo.getMockAttemptById(mockAttempt.id);
  assert.ok(found);
  assert.equal(found.totalScore, 205);
});

test('DB-5: Progress Analytics & Derived Metrics Formulas', async () => {
  const repo = await getRepository();
  const userId = `usr_analytics_test_${Date.now()}`;

  // Initially empty
  const initialAnalytics = await repo.getProgressAnalytics(userId);
  assert.equal(initialAnalytics.totalPracticeQuestions, 0);
  assert.equal(initialAnalytics.practiceAccuracy, 0);
  assert.equal(initialAnalytics.totalMocksAttempted, 0);
  assert.equal(initialAnalytics.subjects.length, 4);

  // Each subject must be present with Session I / Session II classification
  const numSubject = initialAnalytics.subjects.find((s) => s.subject === 'Numerical and Mathematical Ability');
  assert.ok(numSubject);
  assert.equal(numSubject.session, 'Session I');

  const genAwareness = initialAnalytics.subjects.find((s) => s.subject === 'General Awareness');
  assert.ok(genAwareness);
  assert.equal(genAwareness.session, 'Session II');
});

test('DB-6: Student Data Isolation (Multi-tenant Privacy)', async () => {
  const repo = await getRepository();
  const userA = `usr_student_A_${Date.now()}`;
  const userB = `usr_student_B_${Date.now()}`;

  // Log mock for User A
  await repo.recordMockAttempt(
    {
      id: `mock_A_${Date.now()}`,
      userId: userA,
      examTitle: 'Student A Mock',
      session1Score: 100,
      session2Score: 120,
      totalScore: 220,
      totalMax: 270,
      percentage: 81.48,
      qualified: true,
      totalTimeSeconds: 4000,
      answers: {},
      completedAt: new Date().toISOString()
    },
    {
      id: `hist_A_${Date.now()}`,
      userId: userA,
      type: 'mock_exam',
      title: 'Student A Mock',
      summary: 'Private score',
      score: 220,
      maxScore: 270,
      durationSeconds: 4000,
      timestamp: new Date().toISOString()
    }
  );

  // Verify Student B cannot see Student A's mock
  const mocksB = await repo.getMockAttempts(userB);
  assert.equal(mocksB.length, 0);

  const historyB = await repo.getLearningHistory(userB);
  assert.equal(historyB.length, 0);

  const mocksA = await repo.getMockAttempts(userA);
  assert.equal(mocksA.length, 1);
});
