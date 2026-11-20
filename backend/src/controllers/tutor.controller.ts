/**
 * ACCESSPREP-X — AI Syllabus Tutor Controller
 */

import { GoogleGenAI } from '@google/genai';
import type { Request, Response } from 'express';
import { getRepository } from '../repositories/index.ts';
import {
  getGeminiClient,
  setGeminiApiKey,
  selectGroundedContextQuestions
} from '../services/tutor.service.ts';

const PRIMARY_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
const FALLBACK_GEMINI_MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash'];

export function getTutorConfig(_req: Request, res: Response) {
  const hasKey = Boolean(
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
  );
  res.json({
    hasServerKey: hasKey,
    model: PRIMARY_GEMINI_MODEL,
    provider: 'Google Gemini 3 Flash / Official SSC MTS Syllabus Engine'
  });
}

export function postTutorConfig(req: Request, res: Response) {
  const { apiKey } = req.body;
  if (typeof apiKey === 'string' && apiKey.trim()) {
    try {
      setGeminiApiKey(apiKey.trim());
      return res.json({ success: true, message: 'Gemini API key configured successfully.' });
    } catch {
      return res.status(400).json({ error: 'Invalid API key format.' });
    }
  }
  return res.status(400).json({ error: 'API key is required.' });
}

export async function postTutorChat(req: Request, res: Response) {
  const { message, query: queryTextParam, subject, topic } = req.body;
  const queryText = (message || queryTextParam || '').trim();

  if (!queryText) {
    return res.status(400).json({ error: 'Query message cannot be empty.' });
  }

  const relevant = selectGroundedContextQuestions(subject, topic);
  const repo = await getRepository();
  const uid = req.body.userId || 'usr_candidate_01';
  const requestApiKey = (
    req.body.apiKey ||
    (typeof req.headers['x-gemini-api-key'] === 'string' ? req.headers['x-gemini-api-key'] : '')
  ).trim();
  const activeKey =
    requestApiKey ||
    (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
      ? process.env.GEMINI_API_KEY
      : '');
  let activeClient = getGeminiClient();

  if (activeKey) {
    try {
      activeClient = new GoogleGenAI({ apiKey: activeKey });
    } catch (e) {
      console.warn('Could not instantiate GoogleGenAI with provided key:', e);
    }
  }

  if (activeClient) {
    const contextExcerpts = relevant
      .map(
        (q, idx) =>
          `Reference Item ${idx + 1} (${q.subject} - ${q.topic} - ${q.subtopic}):\n` +
          `Question: ${q.question_text}\nCorrect Answer: ${q.correct_answer}\nExplanation: ${q.explanation}\nSource: ${q.source_reference}`
      )
      .join('\n\n');

    const systemInstruction = `You are the official ACCESSPREP-X AI Syllabus Scribe and Pedagogical Tutor for candidates preparing for the Staff Selection Commission (SSC) Multi-Tasking Staff (MTS) Examination.
Your explanations MUST be:
1. Grounded strictly in the provided syllabus context and verified exam patterns.
2. Formatted for screen-reader accessibility: concise paragraphs, plain text formulas (e.g. Speed = Distance / Time), and step-by-step logic.
3. Supportive and encouraging for candidates with disabilities (PwD) under the RPwD Act 2016.
4. Conclude with a clear one-line "Takeaway Rule" for the exam.`;

    const prompt = `Candidate Syllabus Question:\n"${queryText}"\n\nVerified Curriculum Grounding Context:\n${contextExcerpts}\n\nPlease explain the concept, solve step-by-step, and state the relevant examination rule clearly.`;

    const modelsToTry = Array.from(new Set([PRIMARY_GEMINI_MODEL, ...FALLBACK_GEMINI_MODELS]));

    for (const modelName of modelsToTry) {
      try {
        const response = await activeClient.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\n${prompt}` }]
            }
          ]
        });

        const reply = response.text || 'Explanation unavailable.';
        try {
          await repo.recordLearningHistory({
            id: `hist_tutor_${Date.now()}`,
            userId: uid,
            type: 'ai_tutor',
            title: `${subject || 'SSC MTS'} - ${topic || 'Query'}`,
            summary: queryText.slice(0, 150),
            durationSeconds: 45,
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          console.warn('Could not record AI tutor history:', e);
        }

        return res.json({
          success: true,
          model: modelName,
          source: 'gemini',
          reply,
          retrievedEvidence: relevant.map((r) => ({
            subject: r.subject,
            topic: r.topic,
            reference: r.source_reference
          }))
        });
      } catch (aiErr: any) {
        console.warn(`Gemini model ${modelName} call failed:`, aiErr.message);
      }
    }
  }

  let deterministicReply = `Here is the step-by-step explanation for your query on ${subject || 'SSC MTS'}:\n\n`;
  if (relevant.length > 0) {
    deterministicReply += `Key Principle (${relevant[0].topic} - ${relevant[0].subtopic}):\n${relevant[0].explanation}\n\n`;
    deterministicReply += `Example problem from official SSC MTS paper:\n"${relevant[0].question_text}"\nCorrect Answer: Option ${relevant[0].correct_answer}`;
  } else {
    deterministicReply += `In SSC MTS examinations, always solve by breaking the problem into foundational steps: identify the given quantities, apply the verified syllabus theorem or grammar rule, and double-check units and options.`;
  }

  try {
    await repo.recordLearningHistory({
      id: `hist_tutor_${Date.now()}`,
      userId: uid,
      type: 'ai_tutor',
      title: `${subject || 'SSC MTS'} - ${topic || 'Query'}`,
      summary: queryText.slice(0, 150),
      durationSeconds: 45,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.warn('Could not record AI tutor history:', e);
  }

  res.json({
    success: true,
    source: 'syllabus-fallback',
    reply: deterministicReply,
    retrievedEvidence: relevant.map((r) => ({
      subject: r.subject,
      topic: r.topic,
      reference: r.source_reference
    }))
  });
}
