import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Brain,
  Calendar,
  RotateCcw,
  Check,
  AlertTriangle,
  HelpCircle,
  FileText
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext.tsx';
import { AudioToolbar } from '../components/AudioToolbar.tsx';
import { ScreenNavigationDisclaimer } from '../components/ScreenNavigationDisclaimer.tsx';
import { AccessibleExplanationCard } from '../components/common/AccessibleExplanationCard.tsx';
import { MockExamAttempt, Question } from '../db/database.ts';

export function ResultsScreen() {
  const { navigateTo, user, speakText, announce } = useAccessibility();

  const [attempt, setAttempt] = useState<MockExamAttempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'correct' | 'incorrect' | 'unattempted' | 'review'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = user?.id || 'usr_candidate_01';
    fetch(`/api/mock/attempts?userId=${uid}`)
      .then((r) => r.json())
      .then((attempts: MockExamAttempt[]) => {
        if (attempts && attempts.length > 0) {
          setAttempt(attempts[0]); // most recent attempt
        }
      })
      .catch((e) => console.warn('Fetch mock attempt error:', e));

    fetch('/api/questions?limit=400')
      .then((r) => r.json())
      .then((data) => setQuestions(data.questions || []))
      .catch((e) => console.warn('Fetch questions error:', e))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const resultsSpeech = attempt
    ? `Examination Results Summary: Total score is ${attempt.totalScore} out of ${attempt.totalMax}, which is ${attempt.percentage} percent. In Session I, you scored ${attempt.session1Score} marks and are ${attempt.qualified ? 'Qualified' : 'Not Qualified'}. In Session II, you scored ${attempt.session2Score} marks.`
    : 'No examination attempt found.';

  const handleAddToRevision = async (questionId: string) => {
    try {
      await fetch('/api/revision/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, questionId, quality: 2 })
      });
      announce('Question added to Spaced Repetition Revision Planner.', 'polite');
    } catch (e) {
      console.error('Add to revision error:', e);
    }
  };

  if (loading || !attempt) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-600" id="main-content">
        <p className="text-base font-bold">No completed examination attempt on record.</p>
        <button
          type="button"
          onClick={() => navigateTo('mock_exam')}
          className="mt-4 px-6 py-2.5 bg-blue-700 text-white font-bold text-xs rounded-lg"
        >
          Attempt Full Mock Exam
        </button>
      </div>
    );
  }

  // Filter question reviews
  const questionsReview = Object.entries(attempt.answers).map(([qid, ans]) => {
    const q = questions.find((item) => item.question_id === qid);
    const isAnswered = ans.selectedOption !== null;
    const isCorrect = isAnswered && q && ans.selectedOption?.toUpperCase() === q.correct_answer.toUpperCase();
    return {
      questionId: qid,
      selectedOption: ans.selectedOption,
      isAnswered,
      isCorrect,
      markedForReview: Boolean(ans.markedForReview),
      question: q
    };
  });

  const filteredItems = questionsReview.filter((item) => {
    if (filterType === 'correct') return item.isCorrect;
    if (filterType === 'incorrect') return item.isAnswered && !item.isCorrect;
    if (filterType === 'unattempted') return !item.isAnswered;
    if (filterType === 'review') return item.markedForReview;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8" id="main-content">
      {/* 1. Header & Audio Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-300">
        <div>
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
            Screen 8 of 16 · Academic Evaluation
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Examination Results &amp; Step-by-Step Explanations
          </h1>
          <p className="text-sm text-slate-600">
            {attempt.examTitle} · Completed on {new Date(attempt.completedAt).toLocaleDateString()}
          </p>
        </div>

        <div className="shrink-0">
          <AudioToolbar textToRead={resultsSpeech} label="Listen to results summary" />
        </div>
      </div>

      {/* Screen Navigation Disclaimer */}
      <ScreenNavigationDisclaimer
        screenId="RESULTS"
        screenTitle="SSC MTS Mock Results & Scorecard"
        description="Comprehensive evaluation across Session I and Session II. Filter questions by status, read step-by-step solutions, or start new practice."
        actions={[
          {
            label: 'Filter: Incorrect Questions',
            opens: 'Isolates questions answered incorrectly to review wrong answers and correct solutions.',
            voiceCommand: 'Say "Show incorrect"'
          },
          {
            label: 'Filter: Correct / Unattempted / Marked',
            opens: 'Filters questions by candidate attempt status.',
            voiceCommand: 'Say "Show correct" or "Show unattempted"'
          },
          {
            label: 'Practice Weak Subject',
            opens: 'Opens Voice Practice for the subject with the lowest sectional marks.',
            shortcut: 'Alt + P',
            voiceCommand: 'Say "Start Practice"'
          },
          {
            label: 'Add Weak Questions to Revision Planner',
            opens: 'Schedules incorrect questions into SuperMemo SM-2 spaced repetition queue.',
            shortcut: 'Alt + R',
            voiceCommand: 'Say "Revision Planner"'
          },
          {
            label: 'Return to Dashboard',
            opens: 'Exits results view back to candidate overview.',
            shortcut: 'Alt + D',
            voiceCommand: 'Say "Dashboard"'
          },
          {
            label: 'Stop Reading',
            opens: 'Immediately silences speech synthesis across all screens.',
            shortcut: 'Escape',
            voiceCommand: 'Say "Stop"'
          }
        ]}
      />

      {/* 2. Official Sectional Scoreboards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Score */}
        <div className="p-6 bg-white border-2 border-slate-300 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Overall Aggregate</span>
            <Award className="w-5 h-5 text-blue-700" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-blue-900">{attempt.totalScore}</span>
            <span className="text-sm font-semibold text-slate-500">/ {attempt.totalMax}</span>
          </div>
          <div className="pt-2 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Percentage: {attempt.percentage}%</span>
            <span>Duration: {Math.round(attempt.totalTimeSeconds / 60)} min</span>
          </div>
        </div>

        {/* Session I (Qualifying) */}
        <div className="p-6 bg-blue-50/70 border-2 border-blue-400 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-blue-900">
            <span className="text-xs font-bold uppercase tracking-wider">Session-I (Math + Reasoning)</span>
            <span
              className={`text-xs px-2 py-0.5 rounded font-bold ${
                attempt.qualified ? 'bg-emerald-200 text-emerald-950' : 'bg-red-200 text-red-950'
              }`}
            >
              {attempt.qualified ? 'QUALIFIED' : 'NOT QUALIFIED'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-blue-950">{attempt.session1Score}</span>
            <span className="text-sm font-semibold text-slate-500">/ 120</span>
          </div>
          <p className="text-xs text-slate-600">
            Official Rule: Qualifying session only. No negative marking applied.
          </p>
        </div>

        {/* Session II (Merit) */}
        <div className="p-6 bg-purple-50/70 border-2 border-purple-400 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-purple-900">
            <span className="text-xs font-bold uppercase tracking-wider">Session-II (GK + English)</span>
            <span className="text-xs font-bold px-2 py-0.5 bg-purple-200 text-purple-950 rounded">
              MERIT RANKING
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-purple-950">{attempt.session2Score}</span>
            <span className="text-sm font-semibold text-slate-500">/ 150</span>
          </div>
          <p className="text-xs text-slate-600">
            Official Rule: Determines final selection. -1 negative marking deducted per wrong answer.
          </p>
        </div>
      </div>

      {/* 3. Review Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <h2 className="text-lg font-bold text-slate-900">Detailed Question-by-Question Review</h2>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-300">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md ${
              filterType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({questionsReview.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('correct')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md ${
              filterType === 'correct' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Correct ({questionsReview.filter((q) => q.isCorrect).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('incorrect')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md ${
              filterType === 'incorrect' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Incorrect ({questionsReview.filter((q) => q.isAnswered && !q.isCorrect).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('unattempted')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md ${
              filterType === 'unattempted' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Unattempted ({questionsReview.filter((q) => !q.isAnswered).length})
          </button>
        </div>
      </div>

      {/* 4. Filtered Question Cards with Explanations */}
      <div className="space-y-4">
        {filteredItems.map((item, idx) => {
          const q = item.question;
          if (!q) return null;

          return (
            <div key={item.questionId} className="space-y-3">
              <AccessibleExplanationCard
                questionText={`Question ${idx + 1}: ${q.question_text}`}
                selectedOption={item.selectedOption}
                selectedOptionText={item.selectedOption ? (q as any)[`option_${item.selectedOption.toLowerCase()}`] : undefined}
                correctOption={q.correct_answer}
                correctOptionText={(q as any)[`option_${q.correct_answer.toLowerCase()}`]}
                isCorrect={Boolean(item.isCorrect)}
                explanation={q.explanation}
                subject={q.subject}
                topic={q.topic}
                marksAwarded={item.isCorrect ? 3 : 0}
                sourceReference={`${q.source_name} (${q.source_reference})`}
              />

              {/* Action Buttons: Add to Revision / Ask AI */}
              <div className="flex flex-wrap items-center justify-end gap-3 pb-2">
                <button
                  type="button"
                  onClick={() => handleAddToRevision(q.question_id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-300 rounded-md transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Add to Spaced Revision Planner</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('ai_tutor')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-md transition-colors"
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>Ask AI Tutor to Clarify (Alt+T)</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
