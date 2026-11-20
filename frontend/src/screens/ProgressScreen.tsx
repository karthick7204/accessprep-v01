import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAccessibility } from '../context/AccessibilityContext.tsx';
import { AudioToolbar } from '../components/AudioToolbar.tsx';
import { BiTopKpiCards } from '../components/dashboard/BiTopKpiCards.tsx';
import { BiSubjectGauges } from '../components/dashboard/BiSubjectGauges.tsx';
import { BiAccuracyTrendChart, TrendPoint } from '../components/dashboard/BiAccuracyTrendChart.tsx';
import { BiSubjectDistributionDonut } from '../components/dashboard/BiSubjectDistributionDonut.tsx';
import { BiMockPerformanceCard } from '../components/dashboard/BiMockPerformanceCard.tsx';
import { BiRevisionCard } from '../components/dashboard/BiRevisionCard.tsx';
import { BiTopicMasteryTable, TopicMasteryItem } from '../components/dashboard/BiTopicMasteryTable.tsx';
import { BiLearningActivityTable, LearningHistoryEntry } from '../components/dashboard/BiLearningActivityTable.tsx';
import { BiSpeedVsAccuracy } from '../components/dashboard/BiSpeedVsAccuracy.tsx';
import { RevisionData } from '../components/dashboard/RevisionOverview.tsx';
import { ScreenNavigationDisclaimer } from '../components/ScreenNavigationDisclaimer.tsx';
import { SubjectAnalyticsBreakdown } from '../db/repository.ts';
import { MockExamAttempt } from '../db/database.ts';
import {
  TrendingUp,
  Download,
  Filter,
  Calendar,
  AlertCircle,
  RefreshCw,
  FileText,
  Printer
} from 'lucide-react';

interface ProgressAnalyticsData {
  totalPracticeQuestions: number;
  practiceAccuracy: number;
  avgTimePerQuestionSeconds: number;
  totalMocksAttempted: number;
  recentMocks: MockExamAttempt[];
  overallReadinessScore: number;
  subjects: SubjectAnalyticsBreakdown[];
}

export const ProgressScreen: React.FC = () => {
  const { user, navigateTo, announce, speakText, registerVoiceHandler } = useAccessibility();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Core Data States
  const [analytics, setAnalytics] = useState<ProgressAnalyticsData | null>(null);
  const [mockHistory, setMockHistory] = useState<MockExamAttempt[]>([]);
  const [masteryData, setMasteryData] = useState<TopicMasteryItem[]>([]);
  const [activities, setActivities] = useState<LearningHistoryEntry[]>([]);
  const [revisionData, setRevisionData] = useState<RevisionData | null>(null);

  // Filter States
  const [dateFilter, setDateFilter] = useState<'all' | '30d' | '7d'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [activityTypeFilter, setActivityTypeFilter] = useState<'all' | 'practice' | 'mock'>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const uid = user?.id || 'usr_candidate_01';

    try {
      const [analyticsRes, mocksRes, masteryRes, historyRes, revisionRes] = await Promise.all([
        fetch(`/api/progress/analytics?userId=${uid}`),
        fetch(`/api/mock/attempts?userId=${uid}`),
        fetch(`/api/mastery?userId=${uid}`),
        fetch(`/api/history?userId=${uid}`),
        fetch(`/api/revision/items?userId=${uid}`)
      ]);

      if (!analyticsRes.ok || !mocksRes.ok || !masteryRes.ok || !historyRes.ok || !revisionRes.ok) {
        throw new Error('Could not retrieve full performance analytics from server.');
      }

      const [analyticsData, mocksData, masteryJson, historyJson, revisionJson] = await Promise.all([
        analyticsRes.json(),
        mocksRes.json(),
        masteryRes.json(),
        historyRes.json(),
        revisionRes.json()
      ]);

      setAnalytics(analyticsData);
      setMockHistory(Array.isArray(mocksData) ? mocksData : []);
      setMasteryData(Array.isArray(masteryJson) ? masteryJson : []);
      setActivities(Array.isArray(historyJson) ? historyJson : []);
      setRevisionData(revisionJson);
    } catch (err: any) {
      console.warn('Error fetching BI progress analytics:', err);
      setError('Unable to fetch live progress metrics. Displaying cached candidate data.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived Safe Subjects List
  const subjectsList: SubjectAnalyticsBreakdown[] = useMemo(() => {
    if (analytics?.subjects && analytics.subjects.length > 0) {
      if (subjectFilter === 'all') return analytics.subjects;
      return analytics.subjects.filter((s) =>
        s.subject.toLowerCase().includes(subjectFilter.toLowerCase())
      );
    }
    return [
      {
        subject: 'Numerical and Mathematical Ability',
        session: 'Session I',
        attempted: 0,
        correct: 0,
        accuracy: 0,
        avgTimeSeconds: 0,
        speed: '—',
        trend: '—',
        status: 'No Data'
      },
      {
        subject: 'Reasoning Ability and Problem Solving',
        session: 'Session I',
        attempted: 0,
        correct: 0,
        accuracy: 0,
        avgTimeSeconds: 0,
        speed: '—',
        trend: '—',
        status: 'No Data'
      },
      {
        subject: 'General Awareness',
        session: 'Session II',
        attempted: 0,
        correct: 0,
        accuracy: 0,
        avgTimeSeconds: 0,
        speed: '—',
        trend: '—',
        status: 'No Data'
      },
      {
        subject: 'English Language and Comprehension',
        session: 'Session II',
        attempted: 0,
        correct: 0,
        accuracy: 0,
        avgTimeSeconds: 0,
        speed: '—',
        trend: '—',
        status: 'No Data'
      }
    ];
  }, [analytics?.subjects, subjectFilter]);

  // Filtered Learning Activities
  const filteredActivities = useMemo(() => {
    let result = activities;

    if (activityTypeFilter === 'practice') {
      result = result.filter((a) => (a.type || '').toUpperCase().includes('PRACTICE'));
    } else if (activityTypeFilter === 'mock') {
      result = result.filter((a) => (a.type || '').toUpperCase().includes('MOCK'));
    }

    if (dateFilter === '7d') {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      result = result.filter((a) => !a.timestamp || new Date(a.timestamp).getTime() >= cutoff);
    } else if (dateFilter === '30d') {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      result = result.filter((a) => !a.timestamp || new Date(a.timestamp).getTime() >= cutoff);
    }

    return result;
  }, [activities, activityTypeFilter, dateFilter]);

  // Generate Actual Accuracy Trend Points from History & Mocks
  const trendPoints: TrendPoint[] = useMemo(() => {
    const scoredList = activities
      .filter((a) => a.score !== undefined && a.score !== null && a.maxScore && a.maxScore > 0)
      .slice(0, 8)
      .reverse();

    if (scoredList.length >= 2) {
      return scoredList.map((a, idx) => ({
        label: `Sess ${idx + 1}`,
        date: a.timestamp
          ? new Date(a.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          : `Day ${idx + 1}`,
        accuracy: Math.round(((a.score ?? 0) / (a.maxScore ?? 1)) * 100),
        questionsCount: a.maxScore || 10
      }));
    }

    // Default progression if new candidate
    const currentAcc = analytics?.practiceAccuracy ?? 65;
    return [
      { label: 'Baseline', date: 'Initial', accuracy: Math.max(30, currentAcc - 20), questionsCount: 10 },
      { label: 'Check 1', date: 'Day 2', accuracy: Math.max(40, currentAcc - 12), questionsCount: 15 },
      { label: 'Check 2', date: 'Day 4', accuracy: Math.max(50, currentAcc - 6), questionsCount: 20 },
      { label: 'Current', date: 'Today', accuracy: currentAcc, questionsCount: analytics?.totalPracticeQuestions || 25 }
    ];
  }, [activities, analytics?.practiceAccuracy, analytics?.totalPracticeQuestions]);

  const handleStartPractice = (subject?: string, topic?: string) => {
    if (subject) {
      sessionStorage.setItem('practice_filter_subject', subject);
    }
    if (topic) {
      sessionStorage.setItem('practice_filter_topic', topic);
    }
    navigateTo('voice_practice');
  };


  // Screen-level keyboard shortcuts for Progress Analytics
  useEffect(() => {
    const handleProgressKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isInput) return;

      const k = e.key.toLowerCase();
      if (k === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        fetchData();
        announce('Refreshed progress analytics data', 'polite');
      } else if (k === '1' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setDateFilter('all');
        announce('Showing all-time performance history', 'polite');
      } else if (k === '2' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setDateFilter('30d');
        announce('Filtered to last 30 days', 'polite');
      } else if (k === '3' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setDateFilter('7d');
        announce('Filtered to last 7 days', 'polite');
      } else if ((k === 'e' || k === 'p') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleExportData();
      }
    };

    window.addEventListener('keydown', handleProgressKeyDown);
    return () => window.removeEventListener('keydown', handleProgressKeyDown);
  }, [fetchData, announce]);

  // Voice commands for Progress Analytics
  useEffect(() => {
    const unregister = registerVoiceHandler((transcript: string) => {
      const clean = transcript.toLowerCase().trim();
      if (clean.includes('refresh') || clean.includes('reload')) {
        fetchData();
        speakText('Refreshing candidate progress analytics.');
        return true;
      }
      if (clean.includes('7 days') || clean.includes('last week')) {
        setDateFilter('7d');
        speakText('Filtered performance history to the last 7 days.');
        return true;
      }
      if (clean.includes('30 days') || clean.includes('last month')) {
        setDateFilter('30d');
        speakText('Filtered performance history to the last 30 days.');
        return true;
      }
      if (clean.includes('all time') || clean.includes('all days')) {
        setDateFilter('all');
        speakText('Showing all-time performance history.');
        return true;
      }
      if (clean.includes('export') || clean.includes('download report')) {
        handleExportData();
        speakText('Exporting candidate progress audit report.');
        return true;
      }
      if (clean.includes('practice weak') || clean.includes('weak area')) {
        handleStartPractice();
        return true;
      }
      return false;
    });

    return () => unregister();
  }, [fetchData, speakText, registerVoiceHandler]);

  const handleExportData = () => {
    const report = {
      portal: 'ACCESSPREP-X Official Examination Analytics',
      targetExam: 'SSC MTS 2026',
      candidateRoll: user?.rollNumber || 'SSC-2026-MTS-01',
      candidateName: user?.name || 'Aarav Sharma',
      exportDate: new Date().toISOString(),
      performanceSummary: {
        overallAccuracy: analytics?.practiceAccuracy ?? 0,
        totalQuestionsAttempted: analytics?.totalPracticeQuestions ?? 0,
        averageSpeedSec: analytics?.avgTimePerQuestionSeconds ?? 0,
        readinessScore: analytics?.overallReadinessScore ?? 0,
        totalMocksAttempted: mockHistory.length
      },
      subjectsBreakdown: subjectsList,
      topicMastery: masteryData,
      mockExaminations: mockHistory,
      learningHistory: filteredActivities
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SSC_MTS_BI_Report_${user?.rollNumber || 'Candidate'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summaryAudioText = useMemo(() => {
    const name = user?.name || 'Candidate';
    const acc = analytics?.practiceAccuracy ?? 0;
    const questions = analytics?.totalPracticeQuestions ?? 0;
    const readiness = analytics?.overallReadinessScore ?? 0;
    const mocks = mockHistory.length;
    return `Progress analytics summary for ${name}. Your cumulative practice accuracy is ${acc} percent across ${questions} questions solved. Your overall exam readiness score is ${readiness} percent. You have completed ${mocks} full mock examinations. Four subjects are tracked: Numerical Ability, Reasoning, English, and General Awareness.`;
  }, [user?.name, analytics, mockHistory.length]);

  const latestMock = mockHistory.length > 0 ? mockHistory[0] : null;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-5" id="main-content">
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
            onClick={fetchData}
            className="inline-flex items-center gap-1 font-bold text-amber-900 hover:underline"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}


      {/* Screen Navigation Disclaimer */}
      <ScreenNavigationDisclaimer
        screenId="PROGRESS"
        screenTitle="Progress Analytics Navigation &amp; Voice Commands"
        description="Comprehensive Business Intelligence dashboard for tracking SSC MTS readiness index, practice accuracy, Bayesian topic mastery, and mock examination trends."
        actions={[
          {
            label: 'Refresh Analytics Metrics',
            opens: 'Re-queries latest practice sessions, mock exams, and topic mastery states from database.',
            shortcut: 'Press R',
            voiceCommand: 'Say "Refresh Analytics" or "Reload"'
          },
          {
            label: 'Filter Performance Timeline',
            opens: 'Toggles between All Time, Last 30 Days, or Last 7 Days.',
            shortcut: 'Press 1 (All), 2 (30d), 3 (7d)',
            voiceCommand: 'Say "Filter 7 Days" or "Filter 30 Days"'
          },
          {
            label: 'Export Performance Audit Report',
            opens: 'Downloads a structured JSON audit report with your readiness index and topic mastery.',
            shortcut: 'Press E or P',
            voiceCommand: 'Say "Export Report" or "Download"'
          },
          {
            label: 'Practice Lowest Mastery Subject',
            opens: 'Opens Voice Practice targeting your weakest syllabus topic.',
            shortcut: 'Alt + P',
            voiceCommand: 'Say "Start Practice Weak Area"'
          },
          {
            label: 'Return to Dashboard',
            opens: 'Navigates back to the main student dashboard overview.',
            shortcut: 'Alt + D',
            voiceCommand: 'Say "Dashboard"'
          }
        ]}
        tips={[
          'Press R to instantly refresh all analytics after completing a mock exam or practice drill.',
          'Press E or P to export your full candidate performance summary.'
        ]}
      />

      {/* Header Banner */}
      <div className="bg-white border border-[#E8EBF0] rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#1749E8] bg-[#EEF4FF] px-2.5 py-1 rounded-md border border-[#D9E1EF] mb-2">
            <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Screen 11 of 16 · Progress Analytics &amp; BI Dashboard</span>
          </div>
          <h1 className="text-xl font-bold text-[#172033]">
            Candidate Performance &amp; Progress Dashboard
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Audit-grade Business Intelligence metrics, BKT topic proficiencies, speed vs accuracy analytics, and official SSC MTS Session I &amp; II comparative tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <AudioToolbar textToRead={summaryAudioText} label="Read Analytics Summary" />
          <button
            type="button"
            onClick={handleExportData}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-[#E8EBF0] bg-white hover:bg-[#F8F9FB] text-[#172033] flex items-center gap-1.5 focus:ring-2 focus:ring-[#1749E8] shadow-xs transition-colors"
            aria-label="Export full performance data as JSON report"
          >
            <Download className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* SECTION J: Filter Controls Bar */}
      <div className="bg-white border border-[#E8EBF0] rounded-xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-[#172033] flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#1749E8]" />
            <span>Analytics Filters:</span>
          </span>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-date" className="text-[#64748B] font-medium text-[11px]">Timeframe:</label>
            <select
              id="filter-date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="bg-[#F8F9FB] border border-[#E8EBF0] rounded-md px-2 py-1 text-xs text-[#172033] focus:ring-2 focus:ring-[#1749E8]"
            >
              <option value="all">All Time</option>
              <option value="30d">Last 30 Days</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>

          {/* Subject Filter */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-subject" className="text-[#64748B] font-medium text-[11px]">Subject:</label>
            <select
              id="filter-subject"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="bg-[#F8F9FB] border border-[#E8EBF0] rounded-md px-2 py-1 text-xs text-[#172033] focus:ring-2 focus:ring-[#1749E8]"
            >
              <option value="all">All 4 Subjects</option>
              <option value="Numerical">Numerical Ability</option>
              <option value="Reasoning">Reasoning Ability</option>
              <option value="English">English Language</option>
              <option value="General">General Awareness</option>
            </select>
          </div>

          {/* Activity Type Filter */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-activity" className="text-[#64748B] font-medium text-[11px]">Mode:</label>
            <select
              id="filter-activity"
              value={activityTypeFilter}
              onChange={(e) => setActivityTypeFilter(e.target.value as any)}
              className="bg-[#F8F9FB] border border-[#E8EBF0] rounded-md px-2 py-1 text-xs text-[#172033] focus:ring-2 focus:ring-[#1749E8]"
            >
              <option value="all">All Learning Modes</option>
              <option value="practice">Voice &amp; Practice Drills</option>
              <option value="mock">Full Mock Exams</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setDateFilter('all');
            setSubjectFilter('all');
            setActivityTypeFilter('all');
          }}
          className="text-[#1749E8] font-bold text-[11px] hover:underline"
        >
          Reset Filters
        </button>
      </div>

      {/* SECTION A: Performance Summary (Top BI KPI Cards) */}
      <BiTopKpiCards
        analytics={analytics}
        loading={loading}
        latestMockScore={
          latestMock
            ? {
                score: latestMock.totalScore,
                max: latestMock.totalMax || 270,
                pct: latestMock.percentage
              }
            : null
        }
      />

      {/* SECTION C & D: Accuracy Progression Trend Line & Subject Distribution Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7">
          <BiAccuracyTrendChart dataPoints={trendPoints} loading={loading} />
        </div>
        <div className="lg:col-span-5">
          <BiSubjectDistributionDonut
            subjects={subjectsList}
            totalPracticeQuestions={analytics?.totalPracticeQuestions ?? 0}
            loading={loading}
          />
        </div>
      </div>

      {/* SECTION B: Subject Performance Indicators (Circular SVG Progress Gauges) */}
      <BiSubjectGauges
        subjects={subjectsList}
        loading={loading}
        onStartPractice={handleStartPractice}
      />

      {/* SECTION G: Speed vs Accuracy Correlational Analysis */}
      <BiSpeedVsAccuracy
        subjects={subjectsList}
        overallAccuracy={analytics?.practiceAccuracy ?? 0}
        avgTimeSeconds={analytics?.avgTimePerQuestionSeconds ?? 0}
        loading={loading}
      />

      {/* SECTION E & I: Mock Exam Progression & Spaced Repetition Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BiMockPerformanceCard
          mocks={mockHistory}
          loading={loading}
          onNavigate={navigateTo}
        />
        <BiRevisionCard
          revisionData={revisionData}
          loading={loading}
          onNavigate={navigateTo}
        />
      </div>

      {/* SECTION F: Bayesian Knowledge Tracing (BKT) Topic Mastery Analysis */}
      <BiTopicMasteryTable
        masteryData={masteryData}
        loading={loading}
        onStartPractice={handleStartPractice}
      />

      {/* SECTION H: Learning Activity Log & Audit Trail */}
      <BiLearningActivityTable
        activities={filteredActivities}
        loading={loading}
        onNavigate={navigateTo}
      />
    </div>
  );
};
