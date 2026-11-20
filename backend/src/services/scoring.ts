/**
 * ACCESSPREP-X Official SSC MTS Scoring & Assessment Logic
 * Implements official Staff Selection Commission (MTS) exam rules:
 * - Session I: Numerical & Mathematical Ability (20 Qs) + Reasoning Ability (20 Qs)
 *   Each question: +3 marks. Wrong question: 0 marks (No negative marking in Session I).
 *   Max marks: 120. Qualifying session.
 * - Session II: General Awareness (25 Qs) + English Language (25 Qs)
 *   Each question: +3 marks. Wrong question: -1 mark penalty.
 *   Max marks: 150. Merit ranking session.
 * - Compensatory Time for PwD candidates: 15 min extra per 45 min session (Total 60 min).
 */

export interface QuestionSubmission {
  questionId: string;
  subject: string;
  selectedOption: string | null;
  correctAnswer: string;
  timeSpentSeconds: number;
}

export interface SectionalScore {
  subject: string;
  session: 'Session-I' | 'Session-II';
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  grossMarks: number;
  negativeMarks: number;
  netScore: number;
  maxScore: number;
  accuracyPercentage: number;
}

export interface ExamEvaluationResult {
  session1Score: number;
  session1Max: number;
  session1Percentage: number;
  session1Qualified: boolean;
  
  session2Score: number;
  session2Max: number;
  session2Percentage: number;
  
  totalScore: number;
  totalMax: number;
  totalPercentage: number;
  
  totalAttempted: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalUnattempted: number;
  accuracyPercentage: number;
  totalTimeSeconds: number;
  
  sectionalBreakdown: Record<string, SectionalScore>;
}

export function isSession1Subject(subject: string): boolean {
  return (
    subject === 'Numerical and Mathematical Ability' ||
    subject === 'Reasoning Ability and Problem Solving' ||
    subject.toLowerCase().includes('numerical') ||
    subject.toLowerCase().includes('reasoning')
  );
}

export function evaluateSubmission(submissions: QuestionSubmission[]): ExamEvaluationResult {
  const sections: Record<string, SectionalScore> = {};

  submissions.forEach((sub) => {
    const isS1 = isSession1Subject(sub.subject);
    const session = isS1 ? 'Session-I' : 'Session-II';
    
    if (!sections[sub.subject]) {
      sections[sub.subject] = {
        subject: sub.subject,
        session,
        totalQuestions: 0,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        unattempted: 0,
        grossMarks: 0,
        negativeMarks: 0,
        netScore: 0,
        maxScore: 0,
        accuracyPercentage: 0
      };
    }

    const sec = sections[sub.subject];
    sec.totalQuestions += 1;
    sec.maxScore += 3;

    if (!sub.selectedOption) {
      sec.unattempted += 1;
    } else {
      sec.attempted += 1;
      if (sub.selectedOption.toUpperCase() === sub.correctAnswer.toUpperCase()) {
        sec.correct += 1;
        sec.grossMarks += 3;
      } else {
        sec.incorrect += 1;
        if (session === 'Session-II') {
          sec.negativeMarks += 1; // 1 mark negative marking in Session II
        }
      }
    }

    sec.netScore = Math.max(0, sec.grossMarks - sec.negativeMarks);
    sec.accuracyPercentage = sec.attempted > 0 ? (sec.correct / sec.attempted) * 100 : 0;
  });

  let s1Gross = 0;
  let s1Negative = 0;
  let s2Gross = 0;
  let s2Negative = 0;
  let s1Max = 0;
  let s2Max = 0;
  let totalAttempted = 0;
  let totalCorrect = 0;
  let totalIncorrect = 0;
  let totalUnattempted = 0;
  let totalTime = submissions.reduce((acc, curr) => acc + (curr.timeSpentSeconds || 0), 0);

  Object.values(sections).forEach((sec) => {
    totalAttempted += sec.attempted;
    totalCorrect += sec.correct;
    totalIncorrect += sec.incorrect;
    totalUnattempted += sec.unattempted;

    if (sec.session === 'Session-I') {
      s1Gross += sec.grossMarks;
      s1Negative += sec.negativeMarks;
      s1Max += sec.maxScore;
    } else {
      s2Gross += sec.grossMarks;
      s2Negative += sec.negativeMarks;
      s2Max += sec.maxScore;
    }
  });

  const s1Score = Math.max(0, s1Gross - s1Negative);
  const s2Score = Math.max(0, s2Gross - s2Negative);


  const s1Pct = s1Max > 0 ? (s1Score / s1Max) * 100 : 0;
  const s2Pct = s2Max > 0 ? (s2Score / s2Max) * 100 : 0;
  const totalScore = s1Score + s2Score;
  const totalMax = s1Max + s2Max;
  const totalPct = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
  const accuracy = totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;

  // Session I qualifying benchmark for UR/OBC is typically ~30% minimum
  const s1Qualified = s1Pct >= 30;

  return {
    session1Score: s1Score,
    session1Max: s1Max,
    session1Percentage: Math.round(s1Pct * 100) / 100,
    session1Qualified: s1Qualified,

    session2Score: s2Score,
    session2Max: s2Max,
    session2Percentage: Math.round(s2Pct * 100) / 100,

    totalScore,
    totalMax,
    totalPercentage: Math.round(totalPct * 100) / 100,

    totalAttempted,
    totalCorrect,
    totalIncorrect,
    totalUnattempted,
    accuracyPercentage: Math.round(accuracy * 100) / 100,
    totalTimeSeconds: totalTime,

    sectionalBreakdown: sections
  };
}

export function calculateExamDuration(isPwD: boolean, sessionCount = 2): number {
  // Standard duration: 45 minutes per session = 90 min total
  // PwD compensatory time: +15 min per session = 60 min per session = 120 min total
  const perSessionMinutes = isPwD ? 60 : 45;
  return perSessionMinutes * sessionCount * 60; // in seconds
}
