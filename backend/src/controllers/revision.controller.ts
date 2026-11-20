/**
 * ACCESSPREP-X — Revision Planner, Topic Mastery, Progress Analytics & Settings Controllers
 */

import type { Request, Response } from 'express';
import { getRepository } from '../repositories/index.ts';

export async function getRevisionItems(req: Request, res: Response) {
  const repo = await getRepository();
  const uid = String(req.query.userId || 'usr_candidate_01');
  const result = await repo.getRevisionItems(uid);
  res.json(result);
}

export async function getRevisionQueue(req: Request, res: Response) {
  const repo = await getRepository();
  const uid = String(req.query.userId || 'usr_candidate_01');
  const result = await repo.getRevisionItems(uid);

  const cards = [...result.dueItems, ...result.upcomingItems].map((item) => ({
    id: item.id,
    questionId: item.questionId,
    subject: item.question?.subject || 'Unknown',
    topic: item.question?.topic || 'Unknown',
    questionText: item.question?.question_text || '',
    correctAnswer: item.question?.correct_answer || '',
    explanation: item.question?.explanation || '',
    nextReviewDate: item.nextReviewDue,
    intervalDays: item.intervalDays,
    repetition: item.repetitions,
    easeFactor: item.easinessFactor,
    status: item.isDue ? 'due' : 'upcoming',
    isDue: item.isDue
  }));

  res.json({
    cards,
    totalCount: cards.length,
    dueTodayCount: result.dueTodayCount,
    upcomingCount: result.upcomingCount,
    dueItems: result.dueItems,
    upcomingItems: result.upcomingItems
  });
}

export async function postRevisionReview(req: Request, res: Response) {
  const { userId, questionId, quality } = req.body;
  const repo = await getRepository();
  const uid = String(userId || 'usr_candidate_01');

  const item = await repo.reviewRevisionItem(uid, questionId, Number(quality) || 3);
  res.json({ success: true, item });
}

export async function getTopicMastery(req: Request, res: Response) {
  const repo = await getRepository();
  const uid = String(req.query.userId || 'usr_candidate_01');
  const mastery = await repo.getTopicMastery(uid);
  res.json(mastery);
}

export async function getProgressAnalytics(req: Request, res: Response) {
  const repo = await getRepository();
  const uid = String(req.query.userId || 'usr_candidate_01');
  const analytics = await repo.getProgressAnalytics(uid);
  res.json(analytics);
}

export async function getLearningHistory(req: Request, res: Response) {
  const repo = await getRepository();
  const uid = String(req.query.userId || 'usr_candidate_01');
  const history = await repo.getLearningHistory(uid);
  res.json(history);
}

export async function getDetailedHistory(req: Request, res: Response) {
  const repo = await getRepository();
  const uid = String(req.query.userId || 'usr_candidate_01');
  const history = await repo.getLearningHistory(uid);
  res.json(history);
}

export async function getAccessibilitySettings(req: Request, res: Response) {
  const repo = await getRepository();
  const uid = String(req.query.userId || 'usr_candidate_01');
  const settings = await repo.getAccessibilitySettings(uid);
  res.json(settings);
}

export async function postAccessibilitySettings(req: Request, res: Response) {
  const { userId, ...updates } = req.body;
  const repo = await getRepository();
  const uid = String(userId || 'usr_candidate_01');

  const current = await repo.getAccessibilitySettings(uid);
  const updated = await repo.saveAccessibilitySettings({ ...current, ...updates, userId: uid });
  res.json({ success: true, settings: updated });
}

export async function patchUserProfile(req: Request, res: Response) {
  const { userId, name, examRegion, examLanguage, pwdCategory, needScribe } = req.body;
  const repo = await getRepository();
  const uid = String(userId || 'usr_candidate_01');

  try {
    const updated = await repo.updateUserProfile(uid, {
      name,
      examRegion,
      examLanguage,
      pwdCategory,
      needScribe: needScribe !== undefined ? Boolean(needScribe) : undefined
    });
    res.json({ success: true, user: updated });
  } catch (e: any) {
    res.status(404).json({ error: e.message });
  }
}
