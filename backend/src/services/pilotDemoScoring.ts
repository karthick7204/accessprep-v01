/**
 * ACCESSPREP-X — Pilot Demo Diagnostic Engine
 *
 * Implements:
 * 1. Structured 20-question selection (5 per official SSC MTS subject across Sections A, B, C, D).
 * 2. Official SSC MTS Diagnostic Marking Scheme:
 *    - Section A (Numerical and Mathematical Ability): +3 correct, 0 incorrect, 0 unanswered
 *    - Section B (Reasoning Ability and Problem Solving): +3 correct, 0 incorrect, 0 unanswered
 *    - Section C (General Awareness): +3 correct, -1 incorrect, 0 unanswered
 *    - Section D (English Language and Comprehension): +3 correct, -1 incorrect, 0 unanswered
 * 3. Subject-wise and Topic-wise diagnostic breakdown with configurable priority thresholds.
 * 4. Historical attempt comparison and personalized practice recommendations grounded strictly
 *    in the authenticated candidate's actual attempt records.
 */

import { Question } from '../../db/database.ts';

export type DiagnosticSectionId = 'A' | 'B' | 'C' | 'D';

export interface DiagnosticSectionMeta {
  section: DiagnosticSectionId;
  subject: string;
  shortName: string;
  questionCount: 5;
  correctMarks: 3;
  incorrectMarks: 0 | -1;
  maxMarks: 15;
}

export const DIAGNOSTIC_SECTIONS: readonly DiagnosticSectionMeta[] = [
  {
    section: 'A',
    subject: 'Numerical and Mathematical Ability',
    shortName: 'Numerical Ability',
    questionCount: 5,
    correctMarks: 3,
    incorrectMarks: 0,
    maxMarks: 15
  },
  {
    section: 'B',
    subject: 'Reasoning Ability and Problem Solving',
    shortName: 'Reasoning Ability',
    questionCount: 5,
    correctMarks: 3,
    incorrectMarks: 0,
    maxMarks: 15
  },
  {
    section: 'C',
    subject: 'General Awareness',
    shortName: 'General Awareness',
    questionCount: 5,
    correctMarks: 3,
    incorrectMarks: -1,
    maxMarks: 15
  },
  {
    section: 'D',
    subject: 'English Language and Comprehension',
    shortName: 'English Language',
    questionCount: 5,
    correctMarks: 3,
    incorrectMarks: -1,
    maxMarks: 15
  }
] as const;

export const PILOT_DEMO_DURATION_SECONDS = 25 * 60; // 25 minutes = 1500 seconds
export const PILOT_DEMO_TOTAL_QUESTIONS = 20;
export const PILOT_DEMO_MAX_SCORE = 60;

export type TopicPriorityLevel =
  | 'High Priority'
  | 'Moderate Priority'
  | 'Revision Recommended'
  | 'Strong Topic';

export interface TopicPriorityThresholds {
  highPriorityMax: number;       // Default: 39 (< 40% is High Priority)
  moderatePriorityMax: number;   // Default: 69 (40–69% is Moderate Priority)
  revisionRecommendedMax: number;// Default: 84 (70–84% is Revision Recommended; >= 85% is Strong Topic)
  minAttemptsForConfidentStrong: number; // Default: 2
}

export const DEFAULT_TOPIC_PRIORITY_THRESHOLDS: TopicPriorityThresholds = {
  highPriorityMax: 39,
  moderatePriorityMax: 69,
  revisionRecommendedMax: 84,
  minAttemptsForConfidentStrong: 2
};

export interface DiagnosticQuestionSubmission {
  questionId: string;
  selectedOption: string | null;
  timeSpentSeconds?: number;
  markedForReview?: boolean;
}

export interface DiagnosticQuestionResponse {
  questionId: string;
  section: DiagnosticSectionId;
  subject: string;
  topic: string;
  selectedOption: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  isAnswered: boolean;
  marksAwarded: number;
  timeSpentSeconds: number;
  markedForReview: boolean;
}

export interface DiagnosticSubjectSummary {
  section: DiagnosticSectionId;
  subject: string;
  shortName: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  grossMarks: number;
  negativeMarks: number;
  netScore: number;
  maxScore: number;
  accuracyPercentage: number;
  scorePercentage: number;
  timeSpentSeconds: number;
}

export interface DiagnosticTopicSummary {
  topic: string;
  subject: string;
  section: DiagnosticSectionId;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  marksAwarded: number;
  maxMarks: number;
  accuracyPercentage: number;
  priority: TopicPriorityLevel;
  confidenceNote: string;
}

export interface DiagnosticEvaluationResult {
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  session1Score: number;
  session1Max: number;
  session2Score: number;
  session2Max: number;
  totalScore: number;
  totalMax: number;
  percentage: number;
  accuracyPercentage: number;
  totalTimeSeconds: number;
  responses: DiagnosticQuestionResponse[];
  subjectBreakdown: DiagnosticSubjectSummary[];
  topicBreakdown: DiagnosticTopicSummary[];
}

export interface DiagnosticRecommendation {
  id: string;
  topic: string;
  subject: string;
  priority: TopicPriorityLevel;
  accuracyPercentage: number;
  cumulativeAttempts: number;
  cumulativeCorrect: number;
  trendLabel: 'Improving' | 'Repeated Mistakes' | 'Needs Baseline Practice' | 'Stable Mastery';
  trendDeltaPercent: number | null;
  headline: string;
  reason: string;
  recommendedAction: string;
}

export function getSectionForSubject(subject: string): DiagnosticSectionMeta {
  const found = DIAGNOSTIC_SECTIONS.find(
    (s) => s.subject.toLowerCase() === subject.toLowerCase()
  );
  if (found) return found;
  const lower = subject.toLowerCase();
  if (lower.includes('numerical') || lower.includes('math')) return DIAGNOSTIC_SECTIONS[0];
  if (lower.includes('reasoning')) return DIAGNOSTIC_SECTIONS[1];
  if (lower.includes('general') || lower.includes('awareness')) return DIAGNOSTIC_SECTIONS[2];
  return DIAGNOSTIC_SECTIONS[3];
}

/**
 * Selects 20 diagnostic questions from the verified question bank:
 * 5 per subject in order of Sections A, B, C, D.
 * Ensures topic diversity within each subject so the diagnostic covers multiple topics.
 */
export function selectPilotDemoQuestions(allQuestions: Question[]): Question[] {
  const selected: Question[] = [];

  for (const secMeta of DIAGNOSTIC_SECTIONS) {
    const pool = allQuestions.filter((q) => q.subject === secMeta.subject);
    if (pool.length <= secMeta.questionCount) {
      selected.push(...pool.slice(0, secMeta.questionCount));
      continue;
    }

    // Group by topic to pick diverse topics across the 5 slots
    const byTopic = new Map<string, Question[]>();
    for (const q of pool) {
      const list = byTopic.get(q.topic) || [];
      list.push(q);
      byTopic.set(q.topic, list);
    }

    const topicKeys = Array.from(byTopic.keys());
    const sectionPicks: Question[] = [];
    let pass = 0;

    while (sectionPicks.length < secMeta.questionCount && pass < 10) {
      for (const topic of topicKeys) {
        if (sectionPicks.length >= secMeta.questionCount) break;
        const candidates = byTopic.get(topic) || [];
        if (candidates[pass]) {
          sectionPicks.push(candidates[pass]);
        }
      }
      pass++;
    }

    selected.push(...sectionPicks.slice(0, secMeta.questionCount));
  }

  return selected;
}

/**
 * Classifies topic priority using configurable accuracy thresholds and attempt counts
 * so a single question does not produce an overconfident mastery conclusion.
 */
export function classifyTopicPriority(
  accuracyPercentage: number,
  attemptedCount: number,
  totalQuestionsInTopic: number = attemptedCount,
  thresholds: TopicPriorityThresholds = DEFAULT_TOPIC_PRIORITY_THRESHOLDS
): { priority: TopicPriorityLevel; confidenceNote: string } {
  if (attemptedCount === 0) {
    return {
      priority: 'High Priority',
      confidenceNote: `Unattempted (${totalQuestionsInTopic} question${totalQuestionsInTopic === 1 ? '' : 's'} skipped) — practice needed`
    };
  }

  const isSingleSample = totalQuestionsInTopic < thresholds.minAttemptsForConfidentStrong;

  if (accuracyPercentage <= thresholds.highPriorityMax) {
    return {
      priority: 'High Priority',
      confidenceNote: isSingleSample
        ? 'Low accuracy on sampled item — immediate practice recommended'
        : `Low accuracy across ${totalQuestionsInTopic} questions — high priority drill required`
    };
  }

  if (accuracyPercentage <= thresholds.moderatePriorityMax) {
    return {
      priority: 'Moderate Priority',
      confidenceNote: `Moderate accuracy (${accuracyPercentage}%) across ${totalQuestionsInTopic} questions`
    };
  }

  if (accuracyPercentage <= thresholds.revisionRecommendedMax) {
    return {
      priority: 'Revision Recommended',
      confidenceNote: `Good accuracy (${accuracyPercentage}%) — schedule spaced repetition to reach 85%+`
    };
  }

  // >= 85% accuracy: check if sample size is too small for confident mastery
  if (isSingleSample) {
    return {
      priority: 'Revision Recommended',
      confidenceNote: '1/1 correct in this diagnostic — solve more questions to confirm strong mastery'
    };
  }

  return {
    priority: 'Strong Topic',
    confidenceNote: `Strong accuracy (${accuracyPercentage}%) confirmed across ${totalQuestionsInTopic} questions`
  };
}

/**
 * Evaluates a 20-question Pilot Demo Diagnostic submission.
 */
export function evaluatePilotDemoSubmission(
  questions: Question[],
  submissions: DiagnosticQuestionSubmission[],
  totalTimeOverrideSeconds?: number,
  thresholds: TopicPriorityThresholds = DEFAULT_TOPIC_PRIORITY_THRESHOLDS
): DiagnosticEvaluationResult {
  const subMap = new Map<string, DiagnosticQuestionSubmission>();
  for (const s of submissions) {
    subMap.set(s.questionId, s);
  }

  const responses: DiagnosticQuestionResponse[] = [];
  const subjectMap = new Map<DiagnosticSectionId, DiagnosticSubjectSummary>();

  for (const secMeta of DIAGNOSTIC_SECTIONS) {
    subjectMap.set(secMeta.section, {
      section: secMeta.section,
      subject: secMeta.subject,
      shortName: secMeta.shortName,
      totalQuestions: 0,
      attempted: 0,
      correct: 0,
      incorrect: 0,
      unanswered: 0,
      grossMarks: 0,
      negativeMarks: 0,
      netScore: 0,
      maxScore: 0,
      accuracyPercentage: 0,
      scorePercentage: 0,
      timeSpentSeconds: 0
    });
  }

  const topicAggMap = new Map<
    string,
    {
      topic: string;
      subject: string;
      section: DiagnosticSectionId;
      totalQuestions: number;
      attempted: number;
      correct: number;
      incorrect: number;
      unanswered: number;
      marksAwarded: number;
      maxMarks: number;
    }
  >();

  for (const q of questions) {
    const secMeta = getSectionForSubject(q.subject);
    const sub = subMap.get(q.question_id);
    const rawSelected = sub?.selectedOption ? String(sub.selectedOption).toUpperCase().trim() : null;
    const selectedOption =
      rawSelected && ['A', 'B', 'C', 'D'].includes(rawSelected) ? rawSelected : null;
    const isAnswered = selectedOption !== null;
    const isCorrect = isAnswered && selectedOption === q.correct_answer.toUpperCase();

    let marksAwarded = 0;
    if (isAnswered) {
      marksAwarded = isCorrect ? secMeta.correctMarks : secMeta.incorrectMarks;
    }

    const timeSpent = Math.max(0, Number(sub?.timeSpentSeconds) || 0);

    responses.push({
      questionId: q.question_id,
      section: secMeta.section,
      subject: q.subject,
      topic: q.topic,
      selectedOption,
      correctAnswer: q.correct_answer,
      isCorrect,
      isAnswered,
      marksAwarded,
      timeSpentSeconds: timeSpent,
      markedForReview: Boolean(sub?.markedForReview)
    });

    // Update Subject Summary
    const subjSummary = subjectMap.get(secMeta.section)!;
    subjSummary.totalQuestions += 1;
    subjSummary.maxScore += secMeta.correctMarks;
    subjSummary.timeSpentSeconds += timeSpent;

    if (!isAnswered) {
      subjSummary.unanswered += 1;
    } else {
      subjSummary.attempted += 1;
      if (isCorrect) {
        subjSummary.correct += 1;
        subjSummary.grossMarks += secMeta.correctMarks;
      } else {
        subjSummary.incorrect += 1;
        if (secMeta.incorrectMarks < 0) {
          subjSummary.negativeMarks += Math.abs(secMeta.incorrectMarks);
        }
      }
    }

    // Update Topic Summary
    const topicKey = `${q.subject}::${q.topic}`;
    const existingTopic = topicAggMap.get(topicKey) || {
      topic: q.topic,
      subject: q.subject,
      section: secMeta.section,
      totalQuestions: 0,
      attempted: 0,
      correct: 0,
      incorrect: 0,
      unanswered: 0,
      marksAwarded: 0,
      maxMarks: 0
    };

    existingTopic.totalQuestions += 1;
    existingTopic.maxMarks += secMeta.correctMarks;
    existingTopic.marksAwarded += marksAwarded;
    if (!isAnswered) {
      existingTopic.unanswered += 1;
    } else {
      existingTopic.attempted += 1;
      if (isCorrect) {
        existingTopic.correct += 1;
      } else {
        existingTopic.incorrect += 1;
      }
    }
    topicAggMap.set(topicKey, existingTopic);
  }

  // Finalize subject breakdowns
  const subjectBreakdown: DiagnosticSubjectSummary[] = [];
  let session1Raw = 0;
  let session1Max = 0;
  let session2Raw = 0;
  let session2Max = 0;
  let attemptedCount = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  let summedQuestionTime = 0;

  for (const secMeta of DIAGNOSTIC_SECTIONS) {
    const s = subjectMap.get(secMeta.section)!;
    s.netScore = s.grossMarks - s.negativeMarks;
    // Accuracy is computed out of total questions in the section when attempted > 0 (or attempted basis)
    // Using correct / totalQuestions for overall diagnostic subject mastery clarity, and correct / attempted when attempted > 0
    s.accuracyPercentage =
      s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0;
    s.scorePercentage =
      s.maxScore > 0 ? Math.max(0, Math.round((s.netScore / s.maxScore) * 100)) : 0;

    subjectBreakdown.push(s);

    attemptedCount += s.attempted;
    correctCount += s.correct;
    incorrectCount += s.incorrect;
    unansweredCount += s.unanswered;
    summedQuestionTime += s.timeSpentSeconds;

    if (s.section === 'A' || s.section === 'B') {
      session1Raw += s.netScore;
      session1Max += s.maxScore;
    } else {
      session2Raw += s.netScore;
      session2Max += s.maxScore;
    }
  }

  const session1Score = Math.max(0, session1Raw);
  const session2Score = Math.max(0, session2Raw);
  const rawTotalScore = session1Raw + session2Raw;
  const totalScore = Math.max(0, rawTotalScore);
  const totalMax = session1Max + session2Max;
  const percentage =
    totalMax > 0 ? Math.round((totalScore / totalMax) * 10000) / 100 : 0;
  const accuracyPercentage =
    attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 10000) / 100 : 0;

  const totalTimeSeconds =
    typeof totalTimeOverrideSeconds === 'number' && totalTimeOverrideSeconds > 0
      ? Math.round(totalTimeOverrideSeconds)
      : summedQuestionTime;

  // Finalize topic breakdowns
  const topicBreakdown: DiagnosticTopicSummary[] = Array.from(topicAggMap.values()).map((t) => {
    // Topic accuracy based on correct out of total questions in that topic (so skipped questions don't inflate mastery)
    const topicAccuracy =
      t.totalQuestions > 0 ? Math.round((t.correct / t.totalQuestions) * 100) : 0;
    const { priority, confidenceNote } = classifyTopicPriority(
      topicAccuracy,
      t.attempted,
      t.totalQuestions,
      thresholds
    );

    return {
      ...t,
      accuracyPercentage: topicAccuracy,
      priority,
      confidenceNote
    };
  });

  // Sort topics by priority urgency first (High -> Moderate -> Revision -> Strong), then lowest accuracy
  const priorityOrder: Record<TopicPriorityLevel, number> = {
    'High Priority': 0,
    'Moderate Priority': 1,
    'Revision Recommended': 2,
    'Strong Topic': 3
  };
  topicBreakdown.sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return a.accuracyPercentage - b.accuracyPercentage;
  });

  return {
    totalQuestions: questions.length,
    attemptedCount,
    correctCount,
    incorrectCount,
    unansweredCount,
    session1Score,
    session1Max,
    session2Score,
    session2Max,
    totalScore,
    totalMax,
    percentage,
    accuracyPercentage,
    totalTimeSeconds,
    responses,
    subjectBreakdown,
    topicBreakdown
  };
}

/**
 * Generates personalized study recommendations from the candidate's actual completed
 * diagnostic attempts and historical practice responses. Never fabricates data.
 */
export function generateDiagnosticRecommendations(
  diagnosticAttempts: {
    id: string;
    completedAt: string;
    responses: DiagnosticQuestionResponse[];
    topicBreakdown: DiagnosticTopicSummary[];
  }[],
  thresholds: TopicPriorityThresholds = DEFAULT_TOPIC_PRIORITY_THRESHOLDS
): {
  hasSufficientHistory: boolean;
  historicalSummaryNote: string;
  recommendations: DiagnosticRecommendation[];
} {
  if (!diagnosticAttempts || diagnosticAttempts.length === 0) {
    return {
      hasSufficientHistory: false,
      historicalSummaryNote:
        'You have not completed a Pilot Demo Diagnostic yet. Complete your first 20-question diagnostic to receive personalized topic recommendations.',
      recommendations: []
    };
  }

  // Sort chronologically (oldest -> newest) to compute genuine longitudinal trends
  const sortedAsc = [...diagnosticAttempts].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  );
  const latestAttempt = sortedAsc[sortedAsc.length - 1];
  const previousAttempts = sortedAsc.slice(0, -1);

  // Aggregate topic stats across ALL completed diagnostic attempts for this candidate
  const cumulativeByTopic = new Map<
    string,
    {
      topic: string;
      subject: string;
      totalQuestions: number;
      attempted: number;
      correct: number;
      incorrect: number;
      historyAccuracies: number[];
    }
  >();

  for (const att of sortedAsc) {
    const perAttemptTopic = new Map<string, { total: number; correct: number }>();
    for (const r of att.responses || []) {
      const key = `${r.subject}::${r.topic}`;
      const cur = cumulativeByTopic.get(key) || {
        topic: r.topic,
        subject: r.subject,
        totalQuestions: 0,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        historyAccuracies: []
      };
      cur.totalQuestions += 1;
      if (r.isAnswered) {
        cur.attempted += 1;
        if (r.isCorrect) cur.correct += 1;
        else cur.incorrect += 1;
      }
      cumulativeByTopic.set(key, cur);

      const p = perAttemptTopic.get(key) || { total: 0, correct: 0 };
      p.total += 1;
      if (r.isCorrect) p.correct += 1;
      perAttemptTopic.set(key, p);
    }

    for (const [key, stat] of perAttemptTopic.entries()) {
      const agg = cumulativeByTopic.get(key);
      if (agg && stat.total > 0) {
        agg.historyAccuracies.push(Math.round((stat.correct / stat.total) * 100));
      }
    }
  }

  const recommendations: DiagnosticRecommendation[] = [];

  for (const [key, stat] of cumulativeByTopic.entries()) {
    const cumulativeAcc =
      stat.totalQuestions > 0 ? Math.round((stat.correct / stat.totalQuestions) * 100) : 0;
    const { priority } = classifyTopicPriority(
      cumulativeAcc,
      stat.attempted,
      stat.totalQuestions,
      thresholds
    );

    let trendLabel: DiagnosticRecommendation['trendLabel'] = 'Needs Baseline Practice';
    let trendDeltaPercent: number | null = null;

    if (stat.historyAccuracies.length >= 2) {
      const firstAcc = stat.historyAccuracies[0];
      const latestAcc = stat.historyAccuracies[stat.historyAccuracies.length - 1];
      trendDeltaPercent = latestAcc - firstAcc;

      if (trendDeltaPercent > 0) {
        trendLabel = 'Improving';
      } else if (stat.incorrect >= 2 && latestAcc < 70) {
        trendLabel = 'Repeated Mistakes';
      } else if (latestAcc >= 85) {
        trendLabel = 'Stable Mastery';
      }
    } else if (stat.incorrect >= 2) {
      trendLabel = 'Repeated Mistakes';
    } else if (cumulativeAcc >= 85 && stat.totalQuestions >= thresholds.minAttemptsForConfidentStrong) {
      trendLabel = 'Stable Mastery';
    }

    let headline = `${stat.topic} (${stat.subject})`;
    let reason = '';
    let recommendedAction = '';

    if (priority === 'High Priority') {
      headline = `High Priority: Strengthen ${stat.topic}`;
      reason =
        trendLabel === 'Repeated Mistakes'
          ? `Recorded ${stat.incorrect} incorrect responses out of ${stat.totalQuestions} questions (${cumulativeAcc}% accuracy) across your diagnostic history.`
          : `Current diagnostic accuracy is ${cumulativeAcc}% (${stat.correct}/${stat.totalQuestions} correct).`;
      recommendedAction = `Practice ${stat.topic} in Voice Practice and review core concepts with the AI Tutor.`;
    } else if (priority === 'Moderate Priority') {
      headline = `Moderate Priority: Practice ${stat.topic}`;
      reason = `Accuracy is ${cumulativeAcc}% (${stat.correct}/${stat.totalQuestions} correct). Consistent drills will push this topic above the 70% proficiency benchmark.`;
      recommendedAction = `Complete a targeted ${stat.topic} practice set to eliminate errors.`;
    } else if (priority === 'Revision Recommended') {
      headline =
        stat.totalQuestions < thresholds.minAttemptsForConfidentStrong && cumulativeAcc >= 85
          ? `Verify Mastery: Additional ${stat.topic} Practice`
          : `Revision Recommended: ${stat.topic}`;
      reason =
        stat.totalQuestions < thresholds.minAttemptsForConfidentStrong && cumulativeAcc >= 85
          ? `You answered ${stat.correct}/${stat.totalQuestions} correctly (${cumulativeAcc}%), but more attempts are needed to confirm long-term mastery.`
          : `Good accuracy at ${cumulativeAcc}% (${stat.correct}/${stat.totalQuestions} correct). Schedule spaced repetition to lock in retention.`;
      recommendedAction = `Review ${stat.topic} flashcards in the SM-2 Revision Planner.`;
    } else {
      headline = `Strong Topic: ${stat.topic}`;
      reason = `Confirmed ${cumulativeAcc}% accuracy across ${stat.totalQuestions} diagnostic questions.`;
      recommendedAction = `Maintain proficiency with periodic spaced repetition reviews.`;
    }

    if (trendLabel === 'Improving' && trendDeltaPercent !== null) {
      reason += ` Performance improved by +${trendDeltaPercent}% compared to your first diagnostic attempt.`;
    }

    recommendations.push({
      id: `rec_${key.replace(/[^a-zA-Z0-9]/g, '_')}`,
      topic: stat.topic,
      subject: stat.subject,
      priority,
      accuracyPercentage: cumulativeAcc,
      cumulativeAttempts: stat.totalQuestions,
      cumulativeCorrect: stat.correct,
      trendLabel,
      trendDeltaPercent,
      headline,
      reason,
      recommendedAction
    });
  }

  const priorityRank: Record<TopicPriorityLevel, number> = {
    'High Priority': 0,
    'Moderate Priority': 1,
    'Revision Recommended': 2,
    'Strong Topic': 3
  };

  recommendations.sort((a, b) => {
    const p = priorityRank[a.priority] - priorityRank[b.priority];
    if (p !== 0) return p;
    return a.accuracyPercentage - b.accuracyPercentage;
  });

  const hasMultipleAttempts = previousAttempts.length > 0;
  const historicalSummaryNote = hasMultipleAttempts
    ? `Recommendations generated from ${sortedAsc.length} completed diagnostic attempts (${
        latestAttempt.responses.length * sortedAsc.length
      } total evaluated responses).`
    : `Based on 1 completed diagnostic attempt (20 questions). Complete additional diagnostic or practice sessions to unlock multi-attempt trend comparisons and high-confidence topic mastery.`;

  return {
    hasSufficientHistory: hasMultipleAttempts,
    historicalSummaryNote,
    recommendations
  };
}

