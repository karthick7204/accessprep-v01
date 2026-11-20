import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAccessibility } from '../context/AccessibilityContext.tsx';
import { WelcomeSection } from '../components/dashboard/WelcomeSection.tsx';
import { VoiceAssistantCard } from '../components/dashboard/VoiceAssistantCard.tsx';
import { PerformanceOverview } from '../components/dashboard/PerformanceOverview.tsx';
import { SubjectMastery } from '../components/dashboard/SubjectMastery.tsx';
import { RecommendedActivity } from '../components/dashboard/RecommendedActivity.tsx';
import { QuickActions } from '../components/dashboard/QuickActions.tsx';
import { RecentActivity, LearningHistoryItem } from '../components/dashboard/RecentActivity.tsx';
import { RevisionOverview, RevisionData } from '../components/dashboard/RevisionOverview.tsx';
import { PilotDemoCard } from '../components/dashboard/PilotDemoCard.tsx';
import { ScreenNavigationDisclaimer } from '../components/ScreenNavigationDisclaimer.tsx';
import { DiagnosticAttempt } from '../db/database.ts';
import { AlertCircle, RefreshCw, BarChart2, ArrowRight } from 'lucide-react';

interface Analytics {
  totalPracticeQuestions: number;
  practiceAccuracy: number;
  avgTimePerQuestionSeconds: number;
  totalMocksAttempted: number;
  overallReadinessScore: number;
}

interface TopicMasteryItem {
  topic: string;
  subject: string;
  totalQuestions: number;
  attemptsCount: number;
  correctCount: number;
  p_known: number;
  masteryPercentage: number;
  tier: 'Novice' | 'Developing' | 'Proficient' | 'Mastered';
  lastUpdated: string | null;
}

export function DashboardScreen() {
  const { navigateTo, user, speakText } = useAccessibility();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [revisionData, setRevisionData] = useState<RevisionData | null>(null);
  const [masteryData, setMasteryData] = useState<TopicMasteryItem[]>([]);
  const [activities, setActivities] = useState<LearningHistoryItem[]>([]);
  const [diagnosticAttempts, setDiagnosticAttempts] = useState<DiagnosticAttempt[]>([]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const uid = user?.id || 'usr_candidate_01';

    try {
      const [analyticsRes, revisionRes, masteryRes, historyRes, diagRes] = await Promise.all([
        fetch(`/api/progress/analytics?userId=${uid}`),
        fetch(`/api/revision/items?userId=${uid}`),
        fetch(`/api/mastery?userId=${uid}`),
        fetch(`/api/history?userId=${uid}`),
        fetch(`/api/diagnostic/attempts?userId=${uid}`)
      ]);

      if (!analyticsRes.ok || !revisionRes.ok || !masteryRes.ok || !historyRes.ok) {
        throw new Error('Could not retrieve candidate assessment data.');
      }

      const [analyticsJson, revisionJson, masteryJson, historyJson, diagJson] = await Promise.all([
        analyticsRes.json(),
        revisionRes.json(),
        masteryRes.json(),
        historyRes.json(),
        diagRes.ok ? diagRes.json() : Promise.resolve({ attempts: [] })
      ]);

      setAnalytics(analyticsJson);
      setRevisionData(revisionJson);
      setMasteryData(Array.isArray(masteryJson) ? masteryJson : []);
      setActivities(Array.isArray(historyJson) ? historyJson : []);
      setDiagnosticAttempts(Array.isArray(diagJson?.attempts) ? diagJson.attempts : []);
    } catch (err: any) {
      console.warn('Dashboard fetch error:', err);
      setError('Unable to refresh some assessment metrics. Showing cached data.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Construct structured, logical Read-Aloud summary for screen reader / audio button
  const dashboardReadAloudText = useMemo(() => {
    const studentName = user?.name || 'Candidate';
    const readiness = analytics?.overallReadinessScore ?? 0;
    const questionsCount = analytics?.totalPracticeQuestions ?? 0;
    const accuracy = analytics?.practiceAccuracy ?? 0;
    const mocks = analytics?.totalMocksAttempted ?? 0;
    const dueCount = revisionData?.dueTodayCount ?? 0;

    let weakestInfo = '';
    if (masteryData.length > 0) {
      const attempted = masteryData.filter((t) => t.attemptsCount > 0);
      if (attempted.length > 0) {
        const lowest = [...attempted].sort((a, b) => a.p_known - b.p_known)[0];
        weakestInfo = `Your weakest syllabus topic needing attention is ${lowest.topic} in ${lowest.subject}, currently at ${lowest.masteryPercentage} percent mastery.`;
      } else {
        weakestInfo = 'You have not attempted syllabus topics yet. A diagnostic practice test is recommended.';
      }
    }

    const recommendedAction =
      questionsCount === 0
        ? 'Recommended next step: Start a diagnostic practice session to establish your baseline.'
        : dueCount > 0
        ? `Recommended next step: Complete your ${dueCount} due spaced repetition items in the Revision Planner.`
        : 'Recommended next step: Practice your weaker syllabus topics or take a timed mock exam.';

    const revisionReminder =
      dueCount > 0
        ? `You have ${dueCount} questions due for revision today under the SuperMemo SM-2 schedule.`
        : 'No revision questions are due today.';

    return `Welcome to your candidate overview, ${studentName}. Your target examination is Staff Selection Commission MTS 2026. Your overall preparation readiness indicator is ${readiness} percent. In your performance overview: you have solved ${questionsCount} practice questions with ${accuracy} percent accuracy, and completed ${mocks} full mock examinations. ${weakestInfo} ${recommendedAction} ${revisionReminder}`;
  }, [user?.name, analytics, revisionData, masteryData]);

  const handleStartPractice = (subject?: string) => {
    if (subject) {
      sessionStorage.setItem('practice_filter_subject', subject);
    }
    navigateTo('voice_practice');
  };

  const handleStartPilotDemo = () => {
    try {
      sessionStorage.setItem('pilot_demo_initial_view', 'instructions');
      sessionStorage.removeItem('pilot_demo_view_attempt_id');
    } catch {}
    navigateTo('pilot_demo');
  };

  const handleViewDiagnosticResults = (attemptId?: string) => {
    try {
      sessionStorage.setItem('pilot_demo_initial_view', 'results');
      if (attemptId) {
        sessionStorage.setItem('pilot_demo_view_attempt_id', attemptId);
      }
    } catch {}
    navigateTo('pilot_demo');
  };

  const isNewUser = !analytics || analytics.totalPracticeQuestions === 0;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-6" id="main-content">
      {/* Hidden button for voice command trigger */}
      <button
        type="button"
        data-action="read-dashboard"
        className="sr-only"
        onClick={() => speakText(dashboardReadAloudText)}
        tabIndex={-1}
        aria-hidden="true"
      >
        Read Dashboard Voice Trigger
      </button>

      {/* Error notification banner if API has issues */}
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchDashboardData}
            className="inline-flex items-center gap-1 font-bold text-amber-900 hover:underline"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Screen Navigation Disclaimer */}
      <ScreenNavigationDisclaimer
        screenId="DASHBOARD"
        screenTitle="Candidate Dashboard"
        description="Your central portal for SSC MTS 2026 preparation. All cards, study modules, and tests can be opened via voice or keyboard."
        actions={[
          {
            label: 'Start Practice',
            opens: 'Opens Voice Practice subject selection screen with immediate feedback.',
            shortcut: 'Alt + P',
            voiceCommand: 'Say "Start Practice" or "Voice Practice"'
          },
          {
            label: 'Mock Examination',
            opens: 'Opens 90-minute timed full SSC MTS CBT mock test with official marking.',
            shortcut: 'Alt + E',
            voiceCommand: 'Say "Mock Exam" or "Mock Test"'
          },
          {
            label: 'Subject & Topic Explorer',
            opens: 'Opens all 4 SSC MTS sections and 18 syllabus topics.',
            shortcut: 'Alt + S',
            voiceCommand: 'Say "Explore Subjects" or "Topics"'
          },
          {
            label: 'Pilot Demo Diagnostic',
            opens: 'Opens 20-question accessible diagnostic examination.',
            shortcut: 'Alt + O',
            voiceCommand: 'Say "Pilot Demo" or "Diagnostic"'
          },
          {
            label: 'AI Tutor',
            opens: 'Opens conversational AI Tutor for syllabus questions, math shortcuts, and reasoning puzzles.',
            shortcut: 'Alt + T',
            voiceCommand: 'Say "AI Tutor"'
          },
          {
            label: 'Spaced Revision Planner',
            opens: 'Opens SuperMemo SM-2 spaced repetition flashcard review for weak topics.',
            shortcut: 'Alt + R',
            voiceCommand: 'Say "Revision Planner" or "Spaced Revision"'
          },
          {
            label: 'Progress Analytics',
            opens: 'Opens performance analytics, Bayesian mastery, and weak area breakdown.',
            shortcut: 'Alt + A',
            voiceCommand: 'Say "Progress Analytics" or "Weak Areas"'
          },
          {
            label: 'Accessibility Settings',
            opens: 'Customizes color contrast, text sizing, screen reader speed, and PwD time.',
            shortcut: 'Alt + C',
            voiceCommand: 'Say "Accessibility Settings"'
          },
          {
            label: 'Read Dashboard Overview',
            opens: 'Reads aloud your full preparation metrics, readiness score, and daily recommendations.',
            voiceCommand: 'Say "Read Dashboard"'
          },
          {
            label: 'Stop Reading Aloud',
            opens: 'Immediately silences speech synthesis across all screens.',
            shortcut: 'Escape',
            voiceCommand: 'Say "Stop"'
          }
        ]}
      />

      {/* 1. Personalized Candidate Welcome Banner */}
      <WelcomeSection
        readinessScore={analytics?.overallReadinessScore ?? 0}
        isNewUser={isNewUser}
        dashboardText={dashboardReadAloudText}
      />

      {/* 2. Accessible Voice Assistant Card */}
      <VoiceAssistantCard onNavigate={navigateTo} />

      {/* 3. Performance Overview (4 clean, compact metric cards) */}
      <PerformanceOverview
        analytics={analytics}
        revisionSummary={{
          dueTodayCount: revisionData?.dueTodayCount ?? 0,
          totalCount: revisionData?.totalCount ?? 0
        }}
        loading={loading}
      />

      {/* 4. Pilot Demo Diagnostic Card */}
      <PilotDemoCard
        attempts={diagnosticAttempts}
        loading={loading}
        onStartPilotDemo={handleStartPilotDemo}
        onViewDiagnosticResults={handleViewDiagnosticResults}
      />

      {/* 5. Personalized Learning Recommendation ("Recommended for you today") */}
      <RecommendedActivity
        masteryData={masteryData}
        analytics={analytics}
        loading={loading}
        onStartPractice={handleStartPractice}
      />

      {/* 5. Quick Actions Zone (1-click direct study launcher) */}
      <QuickActions onNavigate={navigateTo} />

      {/* 6. Compact Subject Syllabus Progress Summary */}
      <SubjectMastery
        masteryData={masteryData}
        loading={loading}
        onNavigate={navigateTo}
      />

      {/* Callout Link to Comprehensive BI Progress Analytics Screen */}
      <div className="bg-[#EEF4FF] border border-[#D0DEFF] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-[#D0DEFF] flex items-center justify-center text-[#1749E8] shrink-0">
            <BarChart2 className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#172033]">
              Looking for Detailed BI Analytics &amp; Accuracy Progression?
            </h3>
            <p className="text-[11px] text-[#64748B]">
              Explore interactive accuracy trend charts, speed vs accuracy matrices, subject distribution donuts, and mock progression in Progress Analytics.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigateTo('progress')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1749E8] hover:bg-[#1034A6] text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0 focus:ring-2 focus:ring-offset-2 focus:ring-[#1749E8]"
        >
          <span>Open Progress Analytics</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* 7. Grid for Revision Planner Overview & Recent Learning Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevisionOverview
          revisionData={revisionData}
          loading={loading}
          onNavigate={navigateTo}
        />
        <RecentActivity
          activities={activities}
          loading={loading}
          onNavigate={navigateTo}
        />
      </div>
    </div>
  );
}
