/**
 * ACCESSPREP-X — Mathematical Voice Intelligence & Pilot Demo Diagnostic Controllers
 */

import type { Request, Response } from 'express';
import { parseMathematicalSpeech } from '../math/mathematicalSpeechParser.ts';
import {
  renderTextWithMathToSpeech,
  renderMathExpressionToSpeech
} from '../math/mathematicalSpeechRenderer.ts';
import { matchSpokenMathToOptions } from '../math/mathematicalAnswerEvaluator.ts';
import {
  evaluateWithEngine,
  equivalenceWithEngine,
  validateRequestString,
  selectPilotDemoQuestions,
  evaluatePilotDemoSubmission,
  generateDiagnosticRecommendations,
  DIAGNOSTIC_SECTIONS,
  PILOT_DEMO_DURATION_SECONDS,
  updateBKT,
  classifyMasteryTier
} from '../services/index.ts';
import { getRepository, loadQuestions } from '../repositories/index.ts';
import type {
  DiagnosticAttempt,
  TopicMasteryRecord,
  LearningHistoryEntry
} from '../models/domain.models.ts';

function mathError(res: Response, e: any) {
  res.status(400).json({ success: false, error: e?.message || 'Invalid request' });
}

export function postMathParse(req: Request, res: Response) {
  try {
    const transcript = validateRequestString(req.body?.transcript, 'transcript');
    const { ast, ...rest } = parseMathematicalSpeech(transcript);
    res.json({ ...rest, ast });
  } catch (e) {
    mathError(res, e);
  }
}

export async function postMathEvaluate(req: Request, res: Response) {
  try {
    const expression = validateRequestString(req.body?.expression, 'expression');
    const op = ['evaluate', 'simplify', 'solve'].includes(req.body?.op) ? req.body.op : 'evaluate';
    res.json(await evaluateWithEngine(expression, op));
  } catch (e) {
    mathError(res, e);
  }
}

export async function postMathEquivalent(req: Request, res: Response) {
  try {
    const student = validateRequestString(req.body?.student, 'student');
    const target = validateRequestString(req.body?.target, 'target');
    res.json(await equivalenceWithEngine(student, target));
  } catch (e) {
    mathError(res, e);
  }
}

export function postMathMatchOptions(req: Request, res: Response) {
  try {
    const expression = validateRequestString(req.body?.expression, 'expression');
    const o = req.body?.options || {};
    const options = {
      A: String(o.A ?? ''),
      B: String(o.B ?? ''),
      C: String(o.C ?? ''),
      D: String(o.D ?? '')
    };
    const { matches, unique } = matchSpokenMathToOptions(expression, options);
    res.json({ matches, unique });
  } catch (e) {
    mathError(res, e);
  }
}

export function postMathSpeech(req: Request, res: Response) {
  try {
    if (typeof req.body?.expression === 'string') {
      return res.json(
        renderMathExpressionToSpeech(validateRequestString(req.body.expression, 'expression'))
      );
    }
    res.json({
      spoken: renderTextWithMathToSpeech(validateRequestString(req.body?.text, 'text'))
    });
  } catch (e) {
    mathError(res, e);
  }
}

export async function getDiagnosticQuestions(req: Request, res: Response) {
  const allQuestions = loadQuestions();
  const selected20 = selectPilotDemoQuestions(allQuestions);
  const hideSolutions = req.query.examMode === 'true';

  const questionsPayload = hideSolutions
    ? selected20.map(({ correct_answer, explanation, ...rest }) => rest)
    : selected20;

  res.json({
    examName: 'SSC MTS Pilot Demo Diagnostic',
    totalQuestions: selected20.length,
    durationSeconds: PILOT_DEMO_DURATION_SECONDS,
    sections: DIAGNOSTIC_SECTIONS,
    questions: questionsPayload
  });
}

export async function postDiagnosticSubmit(req: Request, res: Response) {
  try {
    const {
      userId,
      clientSubmissionId,
      examTitle,
      submissions,
      totalTimeSeconds,
      acceptanceStatus,
      acceptanceMethod,
      acceptedAt,
      examStartedAt
    } = req.body;

    if (!userId || typeof userId !== 'string') {
      return res.status(401).json({ error: 'Authenticated candidate userId is required.' });
    }

    const repo = await getRepository();
    const user = await repo.getUserById(userId);
    if (!user) {
      return res.status(401).json({ error: 'Authenticated candidate not found.' });
    }

    if (!Array.isArray(submissions) || submissions.length === 0) {
      return res.status(400).json({ error: 'Diagnostic submissions payload is required.' });
    }

    const allQuestions = loadQuestions();
    const default20 = selectPilotDemoQuestions(allQuestions);

    const submissionQuestions = submissions
      .map((s: any) => allQuestions.find((q) => q.question_id === s.questionId))
      .filter((q): q is NonNullable<typeof q> => Boolean(q));

    const questionsToEvaluate =
      submissionQuestions.length === 20 ? submissionQuestions : default20;

    const evalResult = evaluatePilotDemoSubmission(
      questionsToEvaluate,
      submissions,
      Number(totalTimeSeconds) || 0
    );

    const nowIso = new Date().toISOString();
    const attemptId =
      clientSubmissionId && typeof clientSubmissionId === 'string'
        ? `diag_${clientSubmissionId.replace(/[^a-zA-Z0-9_-]/g, '')}`
        : `diag_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const validAcceptanceMethod =
      acceptanceMethod === 'VOICE' || acceptanceMethod === 'CHECKBOX' || acceptanceMethod === 'KEYBOARD'
        ? acceptanceMethod
        : 'CHECKBOX';
    const validAcceptanceStatus =
      acceptanceStatus === 'NOT_ACCEPTED' || acceptanceStatus === 'ACCEPTED'
        ? acceptanceStatus
        : 'ACCEPTED';

    const diagnosticAttempt: DiagnosticAttempt = {
      id: attemptId,
      clientSubmissionId: clientSubmissionId || attemptId,
      userId: user.id,
      examTitle: examTitle || 'SSC MTS Pilot Demo Diagnostic',
      status: 'completed',
      totalQuestions: evalResult.totalQuestions,
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
      acceptanceStatus: validAcceptanceStatus,
      acceptanceMethod: validAcceptanceMethod,
      acceptedAt: typeof acceptedAt === 'string' ? acceptedAt : nowIso,
      examStartedAt: typeof examStartedAt === 'string' ? examStartedAt : nowIso,
      completedAt: nowIso
    };

    const currentMasteryList = await repo.getTopicMastery(user.id);
    const masteryMap = new Map<string, TopicMasteryRecord>();
    for (const m of currentMasteryList) {
      masteryMap.set(m.topic, {
        id: m.id || `mst_${user.id}_${m.topic.replace(/\s+/g, '_')}`,
        userId: user.id,
        subject: m.subject,
        topic: m.topic,
        p_known: Number(m.p_known) || 0.25,
        masteryPercentage: Number(m.masteryPercentage) || 25,
        tier: m.tier || 'Novice',
        attemptsCount: Number(m.attemptsCount) || 0,
        correctCount: Number(m.correctCount) || 0,
        updatedAt: nowIso
      });
    }

    const bktUpdatesMap = new Map<string, TopicMasteryRecord>();
    for (const resp of evalResult.responses) {
      if (!resp.isAnswered) continue;
      const existing = bktUpdatesMap.get(resp.topic) || masteryMap.get(resp.topic);
      const prevP = existing ? existing.p_known : 0.25;
      const newP = updateBKT(prevP, resp.isCorrect);
      const attemptsCount = (existing ? existing.attemptsCount : 0) + 1;
      const correctCount = (existing ? existing.correctCount : 0) + (resp.isCorrect ? 1 : 0);

      bktUpdatesMap.set(resp.topic, {
        id: existing?.id || `mst_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId: user.id,
        subject: resp.subject,
        topic: resp.topic,
        p_known: newP,
        masteryPercentage: Math.round(newP * 100),
        tier: classifyMasteryTier(newP),
        attemptsCount,
        correctCount,
        updatedAt: nowIso
      });
    }

    const historyEntry: LearningHistoryEntry = {
      id: `hist_diag_${attemptId}`,
      userId: user.id,
      type: 'diagnostic',
      title: diagnosticAttempt.examTitle,
      summary: `Pilot Demo Diagnostic: Score ${evalResult.totalScore}/${evalResult.totalMax} (${evalResult.accuracyPercentage}% accuracy, ${evalResult.correctCount} correct, ${evalResult.incorrectCount} incorrect, ${evalResult.unansweredCount} unanswered).`,
      score: evalResult.totalScore,
      maxScore: evalResult.totalMax,
      durationSeconds: evalResult.totalTimeSeconds,
      timestamp: nowIso
    };

    const persistedAttempt = await repo.recordDiagnosticAttempt(
      diagnosticAttempt,
      Array.from(bktUpdatesMap.values()),
      historyEntry
    );

    const allCandidateAttempts = await repo.getDiagnosticAttempts(user.id);
    const recommendationData = generateDiagnosticRecommendations(allCandidateAttempts);

    const enrichedResponses = persistedAttempt.responses.map((r) => {
      const q = allQuestions.find((item) => item.question_id === r.questionId);
      return {
        ...r,
        questionText: q?.question_text || '',
        optionA: q?.option_a || '',
        optionB: q?.option_b || '',
        optionC: q?.option_c || '',
        optionD: q?.option_d || '',
        explanation: q?.explanation || ''
      };
    });

    res.json({
      success: true,
      attempt: {
        ...persistedAttempt,
        enrichedResponses
      },
      recommendations: recommendationData.recommendations,
      historicalSummaryNote: recommendationData.historicalSummaryNote,
      hasSufficientHistory: recommendationData.hasSufficientHistory
    });
  } catch (err: any) {
    console.error('Diagnostic submit error:', err);
    res.status(500).json({
      error: 'Failed to persist diagnostic attempt.',
      details: err.message
    });
  }
}

export async function getDiagnosticAttempts(req: Request, res: Response) {
  const userId = String(req.query.userId || '');
  if (!userId) {
    return res.status(401).json({ error: 'Authenticated candidate userId is required.' });
  }

  const repo = await getRepository();
  const attempts = await repo.getDiagnosticAttempts(userId);
  const allQuestions = loadQuestions();
  const recommendationData = generateDiagnosticRecommendations(attempts);

  const enrichedAttempts = attempts.map((att) => ({
    ...att,
    enrichedResponses: (att.responses || []).map((r) => {
      const q = allQuestions.find((item) => item.question_id === r.questionId);
      return {
        ...r,
        questionText: q?.question_text || '',
        optionA: q?.option_a || '',
        optionB: q?.option_b || '',
        optionC: q?.option_c || '',
        optionD: q?.option_d || '',
        explanation: q?.explanation || ''
      };
    })
  }));

  res.json({
    attempts: enrichedAttempts,
    totalAttempts: enrichedAttempts.length,
    latestAttempt: enrichedAttempts[0] || null,
    recommendations: recommendationData.recommendations,
    historicalSummaryNote: recommendationData.historicalSummaryNote,
    hasSufficientHistory: recommendationData.hasSufficientHistory
  });
}

export async function getDiagnosticAttemptById(req: Request, res: Response) {
  const userId = String(req.query.userId || '');
  if (!userId) {
    return res.status(401).json({ error: 'Authenticated candidate userId is required.' });
  }

  const repo = await getRepository();
  const attempt = await repo.getDiagnosticAttemptById(String(req.params.id));
  if (!attempt) {
    return res.status(404).json({ error: 'Diagnostic attempt not found.' });
  }

  if (attempt.userId !== userId) {
    return res.status(403).json({
      error: 'Forbidden: You do not have permission to access another candidate’s diagnostic record.'
    });
  }

  const allQuestions = loadQuestions();
  const allCandidateAttempts = await repo.getDiagnosticAttempts(userId);
  const recommendationData = generateDiagnosticRecommendations(allCandidateAttempts);

  const enrichedResponses = (attempt.responses || []).map((r) => {
    const q = allQuestions.find((item) => item.question_id === r.questionId);
    return {
      ...r,
      questionText: q?.question_text || '',
      optionA: q?.option_a || '',
      optionB: q?.option_b || '',
      optionC: q?.option_c || '',
      optionD: q?.option_d || '',
      explanation: q?.explanation || ''
    };
  });

  res.json({
    attempt: {
      ...attempt,
      enrichedResponses
    },
    recommendations: recommendationData.recommendations,
    historicalSummaryNote: recommendationData.historicalSummaryNote,
    hasSufficientHistory: recommendationData.hasSufficientHistory
  });
}
