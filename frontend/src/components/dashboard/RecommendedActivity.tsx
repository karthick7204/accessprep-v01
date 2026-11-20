import React from 'react';
import { Play, BookOpen, AlertCircle } from 'lucide-react';
import { AccessibleProgressBar } from '../AccessibleProgressBar.tsx';

interface TopicMasteryItem {
  topic: string;
  subject: string;
  p_known: number;
  masteryPercentage: number;
  tier: 'Novice' | 'Developing' | 'Proficient' | 'Mastered';
  attemptsCount: number;
  correctCount: number;
}

interface Analytics {
  totalPracticeQuestions: number;
  practiceAccuracy: number;
}

interface RecommendedActivityProps {
  masteryData: TopicMasteryItem[];
  analytics: Analytics | null;
  loading: boolean;
  onStartPractice: (subject?: string) => void;
}

interface Recommendation {
  subject: string;
  topic: string;
  reason: string;
  masteryPct: number;
  tier: string;
  suggestedMinutes: number;
  type: 'weak_topic' | 'diagnostic';
}

function getRecommendation(
  masteryData: TopicMasteryItem[],
  analytics: Analytics | null,
): Recommendation | null {
  const isNewUser = !analytics || analytics.totalPracticeQuestions === 0;

  if (isNewUser || masteryData.filter(t => t.attemptsCount > 0).length === 0) {
    return {
      subject: 'All Subjects',
      topic: 'Diagnostic Assessment',
      reason: "You haven't practised yet. A short diagnostic session will personalise your learning plan and identify where to focus first.",
      masteryPct: 0,
      tier: 'Not started',
      suggestedMinutes: 15,
      type: 'diagnostic',
    };
  }

  // Find weakest attempted topic
  const attempted = masteryData.filter(t => t.attemptsCount > 0);
  if (attempted.length === 0) return null;

  const weakest = [...attempted].sort((a, b) => a.p_known - b.p_known)[0];

  const reasons: Record<string, string> = {
    Novice: `You are in early stages for this topic. Focused practice will help build your foundation.`,
    Developing: `You have made mistakes here. A targeted session can strengthen your understanding.`,
    Proficient: `You are doing well, but occasional review will maintain this level.`,
    Mastered: `Great work on this topic! Keep it maintained with occasional revision.`,
  };

  const minutes = weakest.tier === 'Novice' ? 20 : weakest.tier === 'Developing' ? 15 : 10;

  return {
    subject: weakest.subject,
    topic: weakest.topic,
    reason: reasons[weakest.tier] || reasons.Novice,
    masteryPct: weakest.masteryPercentage,
    tier: weakest.tier,
    suggestedMinutes: minutes,
    type: 'weak_topic',
  };
}

function tierColor(tier: string): string {
  if (tier === 'Mastered') return 'text-[#15803D]';
  if (tier === 'Proficient') return 'text-[#1749E8]';
  if (tier === 'Developing') return 'text-[#D97706]';
  return 'text-[#DC2626]';
}

function progressColor(tier: string): string {
  if (tier === 'Mastered') return 'bg-[#15803D]';
  if (tier === 'Proficient') return 'bg-[#1749E8]';
  if (tier === 'Developing') return 'bg-[#D97706]';
  return 'bg-[#DC2626]';
}

export function RecommendedActivity({ masteryData, analytics, loading, onStartPractice }: RecommendedActivityProps) {
  if (loading) {
    return (
      <section aria-label="Recommended activity loading" aria-busy="true">
        <div className="bg-white border border-[#E8EBF0] rounded-xl p-5 space-y-3">
          <div className="h-4 w-48 bg-[#E8EBF0] animate-pulse rounded" />
          <div className="h-3 w-full bg-[#E8EBF0] animate-pulse rounded" />
          <div className="h-3 w-3/4 bg-[#E8EBF0] animate-pulse rounded" />
          <div className="h-9 w-40 bg-[#E8EBF0] animate-pulse rounded-lg" />
        </div>
      </section>
    );
  }

  const rec = getRecommendation(masteryData, analytics);
  if (!rec) return null;

  return (
    <section aria-labelledby="recommendation-heading">
      <div className="bg-white border border-[#E8EBF0] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-[#1749E8]" aria-hidden="true" />
          <h2 id="recommendation-heading" className="text-sm font-semibold text-[#172033]">
            Recommended for you
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* Details */}
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B] mb-0.5">
                {rec.subject}
              </p>
              <p className="text-base font-bold text-[#172033]">
                {rec.topic}
              </p>
            </div>

            {rec.type === 'weak_topic' && (
              <AccessibleProgressBar
                value={rec.masteryPct}
                label="Current mastery"
                colorClass={progressColor(rec.tier)}
                srDescription={`Current mastery: ${rec.masteryPct}% — ${rec.tier}`}
              />
            )}

            <div className="flex items-start gap-2 p-3 bg-[#F8F9FB] border border-[#E8EBF0] rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 text-[#1749E8] shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-[#64748B] leading-relaxed">{rec.reason}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              {rec.type === 'weak_topic' && (
                <span className={`font-semibold ${tierColor(rec.tier)}`} aria-label={`Mastery tier: ${rec.tier}`}>
                  {rec.tier}
                </span>
              )}
              <span className="text-[#64748B]">
                ~{rec.suggestedMinutes} min suggested
              </span>
            </div>
          </div>

          {/* CTA */}
          <div className="shrink-0 flex sm:flex-col justify-start gap-2">
            <button
              type="button"
              onClick={() => onStartPractice(rec.type === 'weak_topic' ? rec.subject : undefined)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#1749E8] text-white hover:bg-[#123BB8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1749E8] focus:ring-offset-2 whitespace-nowrap"
              aria-label={`Start practice session for ${rec.topic}`}
            >
              <Play className="w-3.5 h-3.5" aria-hidden="true" />
              {rec.type === 'diagnostic' ? 'Start Diagnostic' : 'Start Practice'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

