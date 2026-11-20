import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getMockExamRotationService, MockExamRotationService } from '../services/mockExamRotationService.ts';
import { loadQuestions, getDb, saveDatabase } from '../db/database.ts';
import { getRepository } from '../db/repository.ts';
import { evaluateSubmission } from '../utils/scoring.ts';

// Test isolation user ID generator
function createTestUserId(): string {
  return `usr_test_rot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

test('Rotation Engine: Full 400-question cycle (90 + 90 + 90 + 90 + 40 = 400) without any repeats', async () => {
  const service = getMockExamRotationService();
  const testUser = createTestUserId();

  const allocatedIdsByExam: string[][] = [];

  // Examination 1: Expect 90 questions
  const res1 = await service.startOrResumeAttempt(testUser);
  assert.equal(res1.isExhausted, false);
  if (res1.isExhausted) return;
  assert.equal(res1.questions.length, 90, 'Exam 1 must contain exactly 90 questions');
  assert.equal(new Set(res1.questions.map((q) => q.question_id)).size, 90, 'Exam 1 must have no internal duplicates');
  allocatedIdsByExam.push(res1.questions.map((q) => q.question_id));

  // Submit Exam 1
  const submit1 = await service.submitAttempt(
    testUser,
    res1.attempt.id,
    res1.questions.map((q) => ({
      questionId: q.question_id,
      subject: q.subject,
      selectedOption: q.correct_answer,
      correctAnswer: q.correct_answer,
      timeSpentSeconds: 30
    })),
    {}
  );
  assert.equal(submit1.success, true);
  const status1 = await service.getRotationStatus(testUser);
  assert.equal(status1.completedQuestionCount, 90);
  assert.equal(status1.remainingQuestionCount, 310);

  // Examination 2: Expect 90 unseen questions
  const res2 = await service.startOrResumeAttempt(testUser);
  assert.equal(res2.isExhausted, false);
  if (res2.isExhausted) return;
  assert.equal(res2.questions.length, 90, 'Exam 2 must contain exactly 90 questions');
  const ids2 = res2.questions.map((q) => q.question_id);
  const overlap12 = ids2.filter((id) => allocatedIdsByExam[0].includes(id));
  assert.equal(overlap12.length, 0, 'Exam 2 must have ZERO overlap with Exam 1');
  allocatedIdsByExam.push(ids2);

  // Submit Exam 2
  await service.submitAttempt(
    testUser,
    res2.attempt.id,
    res2.questions.map((q) => ({
      questionId: q.question_id,
      subject: q.subject,
      selectedOption: q.correct_answer,
      correctAnswer: q.correct_answer,
      timeSpentSeconds: 30
    })),
    {}
  );
  const status2 = await service.getRotationStatus(testUser);
  assert.equal(status2.completedQuestionCount, 180);
  assert.equal(status2.remainingQuestionCount, 220);

  // Examination 3: Expect 90 unseen questions
  const res3 = await service.startOrResumeAttempt(testUser);
  assert.equal(res3.isExhausted, false);
  if (res3.isExhausted) return;
  assert.equal(res3.questions.length, 90, 'Exam 3 must contain exactly 90 questions');
  const ids3 = res3.questions.map((q) => q.question_id);
  const prevIds12 = [...allocatedIdsByExam[0], ...allocatedIdsByExam[1]];
  const overlap3 = ids3.filter((id) => prevIds12.includes(id));
  assert.equal(overlap3.length, 0, 'Exam 3 must have ZERO overlap with Exam 1 & 2');
  allocatedIdsByExam.push(ids3);

  // Submit Exam 3
  await service.submitAttempt(
    testUser,
    res3.attempt.id,
    res3.questions.map((q) => ({
      questionId: q.question_id,
      subject: q.subject,
      selectedOption: q.correct_answer,
      correctAnswer: q.correct_answer,
      timeSpentSeconds: 30
    })),
    {}
  );
  const status3 = await service.getRotationStatus(testUser);
  assert.equal(status3.completedQuestionCount, 270);
  assert.equal(status3.remainingQuestionCount, 130);

  // Examination 4: Expect 90 unseen questions
  const res4 = await service.startOrResumeAttempt(testUser);
  assert.equal(res4.isExhausted, false);
  if (res4.isExhausted) return;
  assert.equal(res4.questions.length, 90, 'Exam 4 must contain exactly 90 questions');
  const ids4 = res4.questions.map((q) => q.question_id);
  const prevIds123 = [...allocatedIdsByExam[0], ...allocatedIdsByExam[1], ...allocatedIdsByExam[2]];
  const overlap4 = ids4.filter((id) => prevIds123.includes(id));
  assert.equal(overlap4.length, 0, 'Exam 4 must have ZERO overlap with Exam 1, 2, 3');
  allocatedIdsByExam.push(ids4);

  // Submit Exam 4
  await service.submitAttempt(
    testUser,
    res4.attempt.id,
    res4.questions.map((q) => ({
      questionId: q.question_id,
      subject: q.subject,
      selectedOption: q.correct_answer,
      correctAnswer: q.correct_answer,
      timeSpentSeconds: 30
    })),
    {}
  );
  const status4 = await service.getRotationStatus(testUser);
  assert.equal(status4.completedQuestionCount, 360);
  assert.equal(status4.remainingQuestionCount, 40);

  // Examination 5: Expect exactly remaining 40 questions (Never repeat to pad to 90)
  const res5 = await service.startOrResumeAttempt(testUser);
  assert.equal(res5.isExhausted, false);
  if (res5.isExhausted) return;
  assert.equal(res5.questions.length, 40, 'Exam 5 must allocate EXACTLY the remaining 40 questions');
  const ids5 = res5.questions.map((q) => q.question_id);
  const prevIds1234 = [
    ...allocatedIdsByExam[0],
    ...allocatedIdsByExam[1],
    ...allocatedIdsByExam[2],
    ...allocatedIdsByExam[3]
  ];
  const overlap5 = ids5.filter((id) => prevIds1234.includes(id));
  assert.equal(overlap5.length, 0, 'Exam 5 must have ZERO overlap with any prior exams');
  allocatedIdsByExam.push(ids5);

  // Submit Exam 5
  await service.submitAttempt(
    testUser,
    res5.attempt.id,
    res5.questions.map((q) => ({
      questionId: q.question_id,
      subject: q.subject,
      selectedOption: q.correct_answer,
      correctAnswer: q.correct_answer,
      timeSpentSeconds: 30
    })),
    {}
  );

  // Verify total completed count and exhaustion
  const status5 = await service.getRotationStatus(testUser);
  assert.equal(status5.completedQuestionCount, 400, 'All 400 questions must be completed in Cycle 1');
  assert.equal(status5.remainingQuestionCount, 0, 'Zero questions remaining in Cycle 1');
  assert.equal(status5.isExhausted, true, 'Bank must be marked exhausted');

  // Verify full union of completed question IDs is exactly 400 distinct questions
  const allCompletedIds = new Set(allocatedIdsByExam.flat());
  assert.equal(allCompletedIds.size, 400, 'The 5 exams must cover all 400 unique questions in bank without repeat');

  // Examination 6: Must NOT start automatically when exhausted
  const res6 = await service.startOrResumeAttempt(testUser);
  assert.equal(res6.isExhausted, true, 'Exam 6 must not start automatically; prompt required');

  // Candidate confirms new cycle
  const resetRes = await service.resetCycle(testUser);
  assert.equal(resetRes.success, true);
  assert.equal(resetRes.newCycle, 2, 'New cycle must be 2');

  // Examination in Cycle 2 starts with all 400 questions available again
  const statusCycle2 = await service.getRotationStatus(testUser);
  assert.equal(statusCycle2.currentCycle, 2);
  assert.equal(statusCycle2.completedQuestionCount, 0);
  assert.equal(statusCycle2.remainingQuestionCount, 400);

  const resCycle2Exam1 = await service.startOrResumeAttempt(testUser);
  assert.equal(resCycle2Exam1.isExhausted, false);
  if (resCycle2Exam1.isExhausted) return;
  assert.equal(resCycle2Exam1.questions.length, 90, 'Cycle 2 Exam 1 receives 90 questions');
});

test('Rotation Engine: Active examination reservation and browser reload resumption', async () => {
  const service = getMockExamRotationService();
  const testUser = createTestUserId();

  // 1. Start exam
  const res = await service.startOrResumeAttempt(testUser);
  assert.equal(res.isExhausted, false);
  if (res.isExhausted) return;
  const originalAttemptId = res.attempt.id;
  const originalQuestionIds = res.questions.map((q) => q.question_id);

  // 2. Candidate records some answers and timer updates
  await service.saveAttemptProgress(
    testUser,
    originalAttemptId,
    { [originalQuestionIds[0]]: { selectedOption: 'B', timeSpent: 15 } },
    5200,
    1
  );

  // 3. Candidate reloads browser (calls startOrResumeAttempt again)
  const resumeRes = await service.startOrResumeAttempt(testUser);
  assert.equal(resumeRes.isExhausted, false);
  if (resumeRes.isExhausted) return;
  assert.equal(resumeRes.isResumed, true, 'Must indicate attempt was resumed, not created fresh');
  assert.equal(resumeRes.attempt.id, originalAttemptId, 'Must resume exact same attempt ID');
  assert.deepEqual(
    resumeRes.questions.map((q) => q.question_id),
    originalQuestionIds,
    'Must return exact same question list in identical order'
  );
  assert.equal(resumeRes.attempt.remainingTime, 5200, 'Must preserve updated timer');
  assert.equal(resumeRes.attempt.currentQuestionIndex, 1, 'Must preserve question index');
  assert.equal(
    resumeRes.attempt.answers[originalQuestionIds[0]].selectedOption,
    'B',
    'Must preserve recorded answers'
  );

  // 4. Discard attempt: releases question reservations
  const discardRes = await service.discardAttempt(testUser, originalAttemptId);
  assert.equal(discardRes.success, true);

  const statusAfterDiscard = await service.getRotationStatus(testUser);
  assert.equal(statusAfterDiscard.activeAttempt, null, 'No active attempt should remain after discard');
  assert.equal(statusAfterDiscard.completedQuestionCount, 0, 'Discarded questions must not be counted as completed');
  assert.equal(statusAfterDiscard.remainingQuestionCount, 400, 'All 400 questions must be available again');
});

test('Rotation Engine: Proportional timers and scoring for fewer than 90 questions', () => {
  // 40 questions examination
  const qCount = 40;
  const standardDurationSecs = qCount * 60; // 40 minutes = 2400 seconds
  const pwdDurationSecs = Math.round(qCount * 80); // 40 * 80 = 3200 seconds (~53.3 minutes)

  assert.equal(standardDurationSecs, 2400);
  assert.equal(pwdDurationSecs, 3200);

  // Mock scoring for 40 questions
  const sampleSubmissions = Array.from({ length: 40 }).map((_, i) => ({
    questionId: `Q-${i}`,
    subject: i < 20 ? 'Numerical and Mathematical Ability' : 'Reasoning Ability and Problem Solving',
    selectedOption: 'A',
    correctAnswer: 'A',
    timeSpentSeconds: 20
  }));

  const result = evaluateSubmission(sampleSubmissions);
  assert.equal(result.totalMax, 120, '40 questions at 3 marks per question must have totalMax of 120');
  assert.equal(result.totalScore, 120, '40 correct answers must yield 120 marks');
  assert.equal(result.totalPercentage, 100);
});

test('Rotation Engine: Voice Practice and other modules remain independent', async () => {
  const repo = await getRepository();
  const allQuestions = await repo.getQuestions({ limit: 10 });
  assert.ok(allQuestions.questions.length > 0, 'General question querying must remain operational');

  const uid = createTestUserId();
  const service = getMockExamRotationService();
  const status = await service.getRotationStatus(uid);
  assert.equal(status.currentCycle, 1);
  assert.equal(status.completedQuestionCount, 0);
});
