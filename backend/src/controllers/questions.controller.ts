/**
 * ACCESSPREP-X — Questions & Subjects Controller
 */

import fs from 'fs';
import path from 'path';
import type { Request, Response } from 'express';
import {
  getRepository,
  loadQuestions,
  resetQuestionsCache
} from '../repositories/index.ts';
import { validateNewQuestionInput } from '../validators/question.validator.ts';

export async function getQuestions(req: Request, res: Response) {
  const repo = await getRepository();
  const { total, questions } = await repo.getQuestions(req.query as any);
  const off = Number(req.query.offset) || 0;
  const lim = Number(req.query.limit) || 20;

  res.json({
    total,
    count: questions.length,
    offset: off,
    limit: lim,
    questions
  });
}

export async function getQuestionById(req: Request, res: Response) {
  const repo = await getRepository();
  const q = await repo.getQuestionById(String(req.params.id));
  if (!q) {
    return res.status(404).json({ error: 'Question not found' });
  }
  res.json(q);
}

export function getSubjects(_req: Request, res: Response) {
  const questions = loadQuestions();
  const subjectsMap: Record<string, { topics: Set<string>; count: number }> = {};
  questions.forEach((q) => {
    if (!subjectsMap[q.subject]) subjectsMap[q.subject] = { topics: new Set(), count: 0 };
    subjectsMap[q.subject].topics.add(q.topic);
    subjectsMap[q.subject].count++;
  });
  const subjects = Object.entries(subjectsMap).map(([name, data]) => ({
    name,
    topicCount: data.topics.size,
    questionCount: data.count,
    topics: [...data.topics].sort()
  }));
  res.json(subjects);
}

export function postCreateQuestion(req: Request, res: Response) {
  const body = req.body;
  const question_id = body.question_id || `SSC-MTS-USR-${Date.now()}`;

  const check = validateNewQuestionInput(body);
  if (!check.valid) {
    return res.status(400).json({ error: check.error });
  }

  const now = new Date().toISOString();
  const newQuestion = {
    question_id,
    subject: body.subject,
    topic: body.topic,
    subtopic: body.subtopic || '',
    question_text: body.question_text,
    question_type: body.question_type || 'multiple_choice',
    option_a: body.option_a,
    option_b: body.option_b,
    option_c: body.option_c,
    option_d: body.option_d,
    correct_answer: String(body.correct_answer).toUpperCase(),
    explanation: body.explanation,
    difficulty_label: body.difficulty_label,
    source_name: body.source_name,
    source_reference: body.source_reference,
    source_type: body.source_type,
    verification_status: body.verification_status || 'Pending',
    language: body.language || 'English',
    created_at: body.created_at || now,
    updated_at: body.updated_at || now,
    dataset_version: body.dataset_version || 'v1.0-mts-verified'
  };

  const questionsFilePath = [
    path.resolve(__dirname, '../../data/ssc_mts_questions.json'),
    path.resolve(process.cwd(), 'backend/data/ssc_mts_questions.json'),
    path.resolve(process.cwd(), 'src/data/ssc_mts_questions.json')
  ].find((p) => fs.existsSync(p)) || path.resolve(__dirname, '../../data/ssc_mts_questions.json');
  let questions: any[] = [];
  try {
    if (fs.existsSync(questionsFilePath)) {
      questions = JSON.parse(fs.readFileSync(questionsFilePath, 'utf-8'));
    }
  } catch {
    return res.status(500).json({ error: 'Failed to load questions dataset.' });
  }

  if (questions.find((q) => q.question_id === question_id)) {
    return res.status(409).json({ error: `Duplicate question_id: ${question_id}` });
  }

  questions.push(newQuestion);

  try {
    fs.writeFileSync(questionsFilePath, JSON.stringify(questions, null, 2), 'utf-8');
    resetQuestionsCache();
  } catch {
    return res.status(500).json({ error: 'Failed to save question to dataset.' });
  }

  res.status(201).json({
    success: true,
    questionId: question_id,
    message: 'Question added to dataset. Awaiting human verification before entering verified learning bank.'
  });
}
