/**
 * ACCESSPREP-X — Voice Practice & Mock Exam Controllers
 */

import type { Request, Response } from 'express';
import { getRepository } from '../repositories/index.ts';
import type {
  PracticeAttempt,
  TopicMasteryRecord,
  RevisionItem,
  LearningHistoryEntry
} from '../models/domain.models.ts';
import {
  updateBKT,
  classifyMasteryTier,
  calculateSM2,
  getNextReviewDate,
  getMockExamRotationService
} from '../services/index.ts';

export async function postPracticeSubmit(req: Request, res: Response) {
  const { userId, questionId, selectedOption, timeSpentSeconds, mode } = req.body;
  const repo = await getRepository();
  const q = await repo.getQuestionById(questionId);

  if (!q) {
    return res.status(404).json({ error: 'Question not found' });
  }

  const isCorrect = String(selectedOption).toUpperCase() === q.correct_answer.toUpperCase();
  const uid = userId || 'usr_candidate_01';

  const attempt: PracticeAttempt = {
    id: `att_${Date.now()}`,
    userId: uid,
    questionId,
    selectedOption: String(selectedOption).toUpperCase(),
    isCorrect,
    timeSpentSeconds: Number(timeSpentSeconds) || 30,
    mode: mode === 'voice' ? 'voice' : 'standard',
    timestamp: new Date().toISOString()
  };

  const currentMasteryList = await repo.getTopicMastery(uid);
  const current = currentMasteryList.find((m) => m.topic === q.topic);
  const prevP = current ? current.p_known : 0.25;
  const attemptsCount = (current ? current.attemptsCount : 0) + 1;
  const correctCount = (current ? current.correctCount : 0) + (isCorrect ? 1 : 0);
  const newP = updateBKT(prevP, isCorrect);

  const bktRecord: TopicMasteryRecord = {
    id: current?.id || `mst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: uid,
    subject: q.subject,
    topic: q.topic,
    p_known: newP,
    masteryPercentage: Math.round(newP * 100),
    tier: classifyMasteryTier(newP),
    attemptsCount,
    correctCount,
    updatedAt: new Date().toISOString()
  };

  const revisionResult = await repo.getRevisionItems(uid);
  const existingRev = [...revisionResult.dueItems, ...revisionResult.upcomingItems].find(
    (r) => r.questionId === questionId
  );
  const quality = isCorrect ? (Number(timeSpentSeconds) < 40 ? 5 : 4) : 1;

  const currentSM2State = existingRev || {
    repetitions: 0,
    intervalDays: 1,
    easinessFactor: 2.5
  };

  const sm2Calc = calculateSM2(currentSM2State, quality);
  const sm2Record: RevisionItem = {
    id: existingRev?.id || `rev_${Date.now()}`,
    userId: uid,
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
    userId: uid,
    type: 'practice',
    title: `Practice: ${q.topic}`,
    summary: `${q.subject} - Q: ${q.question_text.substring(0, 40)}... (Result: ${isCorrect ? 'Correct' : 'Incorrect'})`,
    score: isCorrect ? 3 : 0,
    maxScore: 3,
    durationSeconds: Number(timeSpentSeconds) || 30,
    timestamp: new Date().toISOString()
  };

  await repo.recordPracticeAttempt(attempt, bktRecord, sm2Record, historyEntry);

  res.json({
    success: true,
    isCorrect,
    correctAnswer: q.correct_answer,
    explanation: q.explanation,
    mastery: bktRecord,
    nextReviewDue: sm2Record.nextReviewDue
  });
}

export async function getMockRotationStatus(req: Request, res: Response) {
  try {
    const uid = String(req.query.userId || 'usr_candidate_01');
    const service = getMockExamRotationService();
    const status = await service.getRotationStatus(uid);
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve rotation status', details: err.message });
  }
}

export async function postMockStart(req: Request, res: Response) {
  try {
    const uid = String(req.body.userId || 'usr_candidate_01');
    const isPwD = Boolean(req.body.isPwD);
    const service = getMockExamRotationService();
    const result = await service.startOrResumeAttempt(uid, isPwD);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to start or resume mock exam', details: err.message });
  }
}

export async function postMockProgress(req: Request, res: Response) {
  try {
    const uid = String(req.body.userId || 'usr_candidate_01');
    const { attemptId, answers, remainingTime, currentQuestionIndex } = req.body;
    if (!attemptId) {
      return res.status(400).json({ error: 'attemptId is required' });
    }
    const service = getMockExamRotationService();
    await service.saveAttemptProgress(
      uid,
      attemptId,
      answers || {},
      Number(remainingTime) || 0,
      Number(currentQuestionIndex) || 0
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save progress', details: err.message });
  }
}

export async function postMockDiscard(req: Request, res: Response) {
  try {
    const uid = String(req.body.userId || 'usr_candidate_01');
    const { attemptId } = req.body;
    if (!attemptId) {
      return res.status(400).json({ error: 'attemptId is required' });
    }
    const service = getMockExamRotationService();
    const result = await service.discardAttempt(uid, attemptId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to discard attempt', details: err.message });
  }
}

export async function postMockResetCycle(req: Request, res: Response) {
  try {
    const uid = String(req.body.userId || 'usr_candidate_01');
    const service = getMockExamRotationService();
    const result = await service.resetCycle(uid);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reset cycle', details: err.message });
  }
}

export async function postMockSubmit(req: Request, res: Response) {
  try {
    const { userId, attemptId, submissions, answers, totalTimeSeconds } = req.body;
    const uid = userId || 'usr_candidate_01';
    const service = getMockExamRotationService();
    const result = await service.submitAttempt(
      uid,
      attemptId,
      submissions || [],
      answers || {},
      totalTimeSeconds
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to submit mock exam', details: err.message });
  }
}

export async function getMockAttempts(req: Request, res: Response) {
  try {
    const repo = await getRepository();
    const uid = String(req.query.userId || 'usr_candidate_01');
    const attempts = await repo.getMockAttempts(uid);
    res.json(attempts);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get mock attempts', details: err.message });
  }
}

export async function getMockAttemptById(req: Request, res: Response) {
  try {
    const repo = await getRepository();
    const attempt = await repo.getMockAttemptById(String(req.params.id));
    if (!attempt) {
      return res.status(404).json({ error: 'Mock attempt not found' });
    }
    res.json(attempt);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get mock attempt', details: err.message });
  }
}
