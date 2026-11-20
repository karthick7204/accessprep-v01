import React from 'react';
import { History, CheckCircle2, XCircle, Clock, ArrowRight, Brain, Calendar } from 'lucide-react';
import { EmptyState } from '../EmptyState.tsx';
import { ActivityRowSkeleton } from '../LoadingSkeleton.tsx';

export interface LearningHistoryItem {
  id: string;
  userId: string;
  type: 'practice' | 'mock_exam' | 'ai_tutor' | 'revision';
  title: string;
  summary: string;
  score?: number;
  maxScore?: number;
  durationSeconds: number;
  timestamp: string;
}

interface RecentActivityProps {
  activities: LearningHistoryItem[];
  loading: boolean;
  onNavigate: (screen: string) => void;
}

function formatTimeAgo(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 2) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

function getActivityBadge(type: string) {
  switch (type) {
    case 'mock_exam':
      return {
        label: 'Mock Exam',
        icon: <Clock className="w-3.5 h-3.5 text-[#6241C8]" aria-hidden="true" />,
        badgeClass: 'bg-purple-50 text-[#6241C8] border-purple-200'
      };
    case 'revision':
      return {
        label: 'SM-2 Revision',
        icon: <Calendar className="w-3.5 h-3.5 text-[#D97706]" aria-hidden="true" />,
        badgeClass: 'bg-amber-50 text-[#D97706] border-amber-200'
      };
    case 'ai_tutor':
      return {
        label: 'AI Tutor',
        icon: <Brain className="w-3.5 h-3.5 text-[#15803D]" aria-hidden="true" />,
        badgeClass: 'bg-emerald-50 text-[#15803D] border-emerald-200'
      };
    case 'practice':
    default:
      return {
        label: 'Practice',
        icon: <History className="w-3.5 h-3.5 text-[#1749E8]" aria-hidden="true" />,
        badgeClass: 'bg-blue-50 text-[#1749E8] border-blue-200'
      };
  }
}

export function RecentActivity({ activities, loading, onNavigate }: RecentActivityProps) {
  if (loading) {
    return (
      <section aria-label="Recent activity loading" aria-busy="true">
        <div className="bg-white border border-[#E8EBF0] rounded-xl p-5 space-y-2">
          <div className="h-4 w-32 bg-[#E8EBF0] animate-pulse rounded mb-4" />
          {[...Array(4)].map((_, i) => (
            <ActivityRowSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  const recentList = activities.slice(0, 5);

  return (
    <section aria-labelledby="recent-activity-heading">
      <div className="bg-white border border-[#E8EBF0] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E8EBF0]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#1749E8]" aria-hidden="true" />
            <h2 id="recent-activity-heading" className="text-sm font-semibold text-[#172033]">
              Recent Activity
            </h2>
          </div>
          {activities.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('learning_history')}
              className="text-xs font-semibold text-[#1749E8] hover:text-[#123BB8] inline-flex items-center gap-1 focus:outline-none focus:underline"
              aria-label="View complete candidate learning history"
            >
              View all
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </button>
          )}
        </div>

        {recentList.length === 0 ? (
          <EmptyState
            icon={<History className="w-6 h-6" />}
            title="No activity recorded yet"
            description="Your completed practice drills, voice answers, and mock examination attempts will appear here."
            action={{
              label: 'Start First Practice',
              onClick: () => onNavigate('voice_practice')
            }}
          />
        ) : (
          <div className="divide-y divide-[#E8EBF0]">
            {recentList.map((item) => {
              const meta = getActivityBadge(item.type);
              const isCorrect = item.summary.toLowerCase().includes('result: correct') || (item.score !== undefined && item.score > 0);
              const isIncorrect = item.summary.toLowerCase().includes('result: incorrect');

              return (
                <article
                  key={item.id}
                  className="py-3 first:pt-0 last:pb-0 flex items-start gap-3 justify-between"
                  aria-label={`${item.title}, ${formatTimeAgo(item.timestamp)}`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-[#F8F9FB] border border-[#E8EBF0] flex items-center justify-center shrink-0 mt-0.5">
                      {meta.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${meta.badgeClass}`}>
                          {meta.label}
                        </span>
                        <h3 className="text-xs font-bold text-[#172033] truncate">
                          {item.title}
                        </h3>
                      </div>
                      <p className="text-[11px] text-[#64748B] line-clamp-1 mb-1">
                        {item.summary}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-[#64748B]">
                        <span>{formatTimeAgo(item.timestamp)}</span>
                        {item.durationSeconds > 0 && (
                          <>
                            <span aria-hidden="true">•</span>
                            <span>{item.durationSeconds}s spent</span>
                          </>
                        )}
                        {item.score !== undefined && item.maxScore !== undefined && (
                          <>
                            <span aria-hidden="true">•</span>
                            <span className="font-semibold text-[#172033]">
                              Score: {item.score}/{item.maxScore}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Result indicator if applicable */}
                  <div className="shrink-0 pt-1">
                    {isCorrect && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#15803D]" aria-label="Result: Correct">
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span className="hidden sm:inline">Correct</span>
                      </span>
                    )}
                    {isIncorrect && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#DC2626]" aria-label="Result: Incorrect">
                        <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        <span className="hidden sm:inline">Incorrect</span>
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

