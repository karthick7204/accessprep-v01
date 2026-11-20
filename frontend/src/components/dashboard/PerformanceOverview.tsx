import React from 'react';
import { TrendingUp, Award, Clock, CheckCircle2, TrendingDown, Minus } from 'lucide-react';
import { MetricCardSkeleton } from '../LoadingSkeleton.tsx';

interface Analytics {
  totalPracticeQuestions: number;
  practiceAccuracy: number;
  avgTimePerQuestionSeconds: number;
  totalMocksAttempted: number;
  overallReadinessScore: number;
}

interface RevisionSummary {
  dueTodayCount: number;
  totalCount: number;
}

interface PerformanceOverviewProps {
  analytics: Analytics | null;
  revisionSummary: RevisionSummary;
  loading: boolean;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral' | null;
  trendText?: string;
  valueColor?: string;
  isEmpty?: boolean;
  emptyText?: string;
}

function MetricCard({
  label,
  value,
  description,
  icon,
  trend,
  trendText,
  valueColor = 'text-[#172033]',
  isEmpty = false,
  emptyText,
}: MetricCardProps) {
  const TrendIcon =
    trend === 'up' ? TrendingUp :
    trend === 'down' ? TrendingDown :
    Minus;

  const trendColor =
    trend === 'up' ? 'text-[#15803D]' :
    trend === 'down' ? 'text-[#DC2626]' :
    'text-[#64748B]';

  return (
    <div
      className="bg-white border border-[#E8EBF0] rounded-xl p-5 space-y-2 shadow-xs hover:border-[#D0DEFF] transition-all"
      role="region"
      aria-label={`${label}: ${isEmpty ? emptyText : value}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide text-[#64748B]">{label}</span>
        <span className="text-[#64748B]" aria-hidden="true">{icon}</span>
      </div>

      <div>
        {isEmpty ? (
          <p className="text-sm font-medium text-[#64748B]">{emptyText || '—'}</p>
        ) : (
          <span className={`text-2xl font-black ${valueColor}`} aria-hidden="true">
            {value}
          </span>
        )}
      </div>

      <p className="text-[11px] text-[#64748B] leading-snug">{description}</p>

      {trend && trendText && !isEmpty && (
        <div className={`flex items-center gap-1 text-[11px] font-semibold ${trendColor}`} aria-label={trendText}>
          <TrendIcon className="w-3 h-3" aria-hidden="true" />
          <span>{trendText}</span>
        </div>
      )}
    </div>
  );
}

export function PerformanceOverview({ analytics, revisionSummary, loading }: PerformanceOverviewProps) {
  if (loading) {
    return (
      <section aria-label="Performance overview loading" aria-busy="true">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <MetricCardSkeleton key={i} />)}
        </div>
      </section>
    );
  }

  const isNewUser = !analytics || analytics.totalPracticeQuestions === 0;
  const readiness = analytics?.overallReadinessScore ?? 0;
  const accuracy = analytics?.practiceAccuracy ?? 0;
  const totalQuestions = analytics?.totalPracticeQuestions ?? 0;
  const mocks = analytics?.totalMocksAttempted ?? 0;

  return (
    <section aria-labelledby="performance-heading">
      <h2 id="performance-heading" className="text-sm font-semibold text-[#172033] mb-3">
        Performance Overview
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Exam Readiness */}
        <MetricCard
          label="Exam Readiness"
          value={`${readiness}%`}
          description="Preparation index based on practice & mock performance"
          icon={<TrendingUp className="w-4 h-4 text-[#1749E8]" />}
          valueColor="text-[#1749E8]"
          isEmpty={isNewUser}
          emptyText="No data yet"
          trend={readiness >= 60 ? 'up' : readiness > 0 ? 'neutral' : null}
          trendText={readiness >= 60 ? 'On track for cutoff' : readiness > 0 ? 'Building foundations' : undefined}
        />

        {/* Metric 2: Practice Accuracy */}
        <MetricCard
          label="Practice Accuracy"
          value={`${accuracy}%`}
          description={totalQuestions > 0 ? `${Math.round(totalQuestions * (accuracy / 100))} correct answers` : 'No attempts logged'}
          icon={<Award className="w-4 h-4 text-[#15803D]" />}
          valueColor={accuracy >= 70 ? 'text-[#15803D]' : accuracy >= 50 ? 'text-[#D97706]' : 'text-[#DC2626]'}
          isEmpty={isNewUser}
          emptyText="Start practising"
          trend={accuracy >= 70 ? 'up' : accuracy > 0 ? 'neutral' : null}
          trendText={accuracy >= 70 ? 'Above benchmark' : undefined}
        />

        {/* Metric 3: Questions Attempted */}
        <MetricCard
          label="Questions Attempted"
          value={totalQuestions.toLocaleString()}
          description={totalQuestions > 0 ? `Avg ${analytics?.avgTimePerQuestionSeconds || 35}s pace` : 'Begin your first drill'}
          icon={<CheckCircle2 className="w-4 h-4 text-[#7C3AED]" />}
          valueColor="text-[#172033]"
          isEmpty={totalQuestions === 0}
          emptyText="None yet"
          trend={totalQuestions > 0 ? 'up' : null}
          trendText={totalQuestions >= 50 ? 'Active learner' : undefined}
        />

        {/* Metric 4: Mock Exams Completed */}
        <MetricCard
          label="Mock Exams Completed"
          value={mocks}
          description="Full 90-min simulated SSC MTS tests"
          icon={<Clock className="w-4 h-4 text-[#D97706]" />}
          valueColor="text-[#172033]"
          isEmpty={mocks === 0}
          emptyText="None yet"
          trend={mocks > 0 ? 'neutral' : null}
          trendText={mocks > 0 ? `${mocks} test${mocks !== 1 ? 's' : ''} completed` : undefined}
        />
      </div>
    </section>
  );
}


