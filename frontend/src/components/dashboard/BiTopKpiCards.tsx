import React from 'react';
import { Award, Target, CheckCircle2, FileText, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Analytics {
  totalPracticeQuestions: number;
  practiceAccuracy: number;
  avgTimePerQuestionSeconds: number;
  totalMocksAttempted: number;
  overallReadinessScore: number;
}

interface BiTopKpiCardsProps {
  analytics: Analytics | null;
  loading: boolean;
  latestMockScore?: { score: number; max: number; pct: number } | null;
}

export function BiTopKpiCards({ analytics, loading, latestMockScore }: BiTopKpiCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6" aria-busy="true" aria-label="Loading key metrics">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-[#E8EBF0] rounded-xl p-4 h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  const readiness = analytics?.overallReadinessScore ?? 0;
  const accuracy = analytics?.practiceAccuracy ?? 0;
  const totalQuestions = analytics?.totalPracticeQuestions ?? 0;
  const totalMocks = analytics?.totalMocksAttempted ?? 0;

  const kpis = [
    {
      label: 'Exam Readiness',
      value: readiness > 0 ? `${readiness}%` : '—',
      subtext: readiness >= 70 ? 'On track for cutoff' : readiness > 0 ? 'Building foundational mastery' : 'Diagnostic needed',
      badge: readiness >= 70 ? '+5% vs baseline' : null,
      trend: readiness >= 70 ? 'up' : 'neutral',
      icon: <Target className="w-4 h-4 text-[#1749E8]" aria-hidden="true" />,
      colorClass: readiness >= 70 ? 'text-[#15803D]' : 'text-[#1749E8]',
      borderAccent: 'border-l-4 border-l-[#1749E8]',
      description: 'Weighted 60% practice accuracy + 40% mock exam performance'
    },
    {
      label: 'Practice Accuracy',
      value: accuracy > 0 ? `${accuracy}%` : '—',
      subtext: totalQuestions > 0 ? `${Math.round(totalQuestions * (accuracy / 100))} correct answers` : 'No questions attempted',
      badge: accuracy >= 75 ? 'Target achieved' : null,
      trend: accuracy >= 70 ? 'up' : accuracy > 0 ? 'down' : 'neutral',
      icon: <Award className="w-4 h-4 text-[#15803D]" aria-hidden="true" />,
      colorClass: accuracy >= 75 ? 'text-[#15803D]' : accuracy >= 50 ? 'text-[#D97706]' : 'text-[#172033]',
      borderAccent: 'border-l-4 border-l-[#15803D]',
      description: 'Overall accuracy across all SSC MTS practice sessions'
    },
    {
      label: 'Questions Attempted',
      value: totalQuestions.toLocaleString(),
      subtext: totalQuestions > 0 ? `Avg ${analytics?.avgTimePerQuestionSeconds || 35}s per question` : 'Start your first drill',
      badge: totalQuestions >= 100 ? '100+ Milestone' : null,
      trend: totalQuestions > 0 ? 'up' : 'neutral',
      icon: <CheckCircle2 className="w-4 h-4 text-[#7C3AED]" aria-hidden="true" />,
      colorClass: 'text-[#172033]',
      borderAccent: 'border-l-4 border-l-[#7C3AED]',
      description: 'Total questions attempted across all four syllabus sections'
    },
    {
      label: 'Mock Tests Completed',
      value: totalMocks.toString(),
      subtext: latestMockScore ? `Latest: ${latestMockScore.score}/${latestMockScore.max} (${latestMockScore.pct}%)` : 'No full mocks completed',
      badge: totalMocks > 0 ? 'Session I & II' : null,
      trend: totalMocks > 0 ? 'up' : 'neutral',
      icon: <FileText className="w-4 h-4 text-[#D97706]" aria-hidden="true" />,
      colorClass: 'text-[#172033]',
      borderAccent: 'border-l-4 border-l-[#D97706]',
      description: 'Full 90-question simulated official examinations'
    }
  ];

  return (
    <section aria-label="Top Performance Key Metrics" className="mb-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className={`bg-white border border-[#E8EBF0] ${kpi.borderAccent} rounded-xl p-4 shadow-xs hover:border-[#D0DEFF] transition-all flex flex-col justify-between`}
            role="region"
            aria-label={`${kpi.label}: ${kpi.value}`}
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  {kpi.label}
                </span>
                <div className="w-7 h-7 rounded-lg bg-[#F8F9FB] border border-[#E8EBF0] flex items-center justify-center shrink-0">
                  {kpi.icon}
                </div>
              </div>

              <div className="flex items-baseline gap-2 mt-0.5">
                <span className={`text-2xl sm:text-3xl font-black ${kpi.colorClass} tracking-tight`}>
                  {kpi.value}
                </span>
                {kpi.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-[#15803D] border border-emerald-200">
                    {kpi.badge}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-[#E8EBF0]/60 mt-2">
              <p className="text-[11px] text-[#64748B] font-medium leading-tight truncate" title={kpi.description}>
                {kpi.subtext}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

