import React from 'react';
import { Calendar, AlertCircle, CheckCircle2, ArrowRight, Play, BookOpen } from 'lucide-react';
import { EmptyState } from '../EmptyState.tsx';

export interface RevisionQuestionItem {
  id: string;
  questionId: string;
  repetitions: number;
  intervalDays: number;
  easinessFactor: number;
  lastReviewedAt: string;
  nextReviewDue: string;
  masteryLevel: 'Novice' | 'Learning' | 'Reviewing' | 'Mastered';
  isDue: boolean;
  question?: {
    question_text: string;
    subject: string;
    topic: string;
    difficulty_label: string;
  } | null;
}

export interface RevisionData {
  totalCount: number;
  dueTodayCount: number;
  upcomingCount: number;
  dueItems: RevisionQuestionItem[];
  upcomingItems: RevisionQuestionItem[];
}

interface RevisionOverviewProps {
  revisionData: RevisionData | null;
  loading: boolean;
  onNavigate: (screen: string) => void;
}

export function RevisionOverview({ revisionData, loading, onNavigate }: RevisionOverviewProps) {
  if (loading) {
    return (
      <section aria-label="Revision planner loading" aria-busy="true">
        <div className="bg-white border border-[#E8EBF0] rounded-xl p-5 space-y-3">
          <div className="h-4 w-40 bg-[#E8EBF0] animate-pulse rounded" />
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-[#F8F9FB] border border-[#E8EBF0] rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const dueCount = revisionData?.dueTodayCount ?? 0;
  const upcomingCount = revisionData?.upcomingCount ?? 0;
  const totalCount = revisionData?.totalCount ?? 0;
  const dueItems = revisionData?.dueItems ?? [];

  return (
    <section aria-labelledby="revision-overview-heading">
      <div className="bg-white border border-[#E8EBF0] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E8EBF0]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#D97706]" aria-hidden="true" />
            <h2 id="revision-overview-heading" className="text-sm font-semibold text-[#172033]">
              Revision Planner (SM-2 Spaced Repetition)
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('revision_planner')}
            className="text-xs font-semibold text-[#1749E8] hover:text-[#123BB8] inline-flex items-center gap-1 focus:outline-none focus:underline"
            aria-label="Open full revision planner"
          >
            Open Planner
            <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>

        {totalCount === 0 ? (
          <EmptyState
            icon={<Calendar className="w-6 h-6" />}
            title="No items in revision queue"
            description="Questions you answer during voice practice or mock examinations will automatically be added to your SM-2 spaced repetition queue."
            action={{
              label: 'Start Practice to Build Queue',
              onClick: () => onNavigate('voice_practice')
            }}
          />
        ) : (
          <div className="space-y-4">
            {/* Summary counters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#F8F9FB] border border-[#E8EBF0] rounded-lg p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                  Due Today
                </span>
                <span className={`text-2xl font-black ${dueCount > 0 ? 'text-[#D97706]' : 'text-[#15803D]'}`}>
                  {dueCount}
                </span>
                <span className="text-[11px] text-[#64748B] block mt-0.5">
                  {dueCount > 0 ? 'Requires candidate recall' : 'All caught up today'}
                </span>
              </div>

              <div className="bg-[#F8F9FB] border border-[#E8EBF0] rounded-lg p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                  Upcoming
                </span>
                <span className="text-2xl font-black text-[#172033]">
                  {upcomingCount}
                </span>
                <span className="text-[11px] text-[#64748B] block mt-0.5">
                  Scheduled for future dates
                </span>
              </div>

              <div className="bg-[#F8F9FB] border border-[#E8EBF0] rounded-lg p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                  Total in Memory
                </span>
                <span className="text-2xl font-black text-[#1749E8]">
                  {totalCount}
                </span>
                <span className="text-[11px] text-[#64748B] block mt-0.5">
                  Questions being tracked
                </span>
              </div>
            </div>

            {/* If items are due, preview top 2-3 items */}
            {dueCount > 0 && dueItems.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-[#172033]">
                  Questions Ready for Review
                </p>
                <div className="space-y-2">
                  {dueItems.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-[#F8F9FB] border border-[#E8EBF0] rounded-lg flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono font-bold text-[#1749E8]">
                            {item.questionId}
                          </span>
                          <span className="text-[#E8EBF0]" aria-hidden="true">·</span>
                          <span className="text-[10px] text-[#64748B] truncate">
                            {item.question?.subject || 'SSC MTS Question'}
                          </span>
                        </div>
                        <p className="text-xs text-[#172033] line-clamp-1">
                          {item.question?.question_text || 'Click Start Revision to view and answer.'}
                        </p>
                      </div>

                      <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">
                        {item.masteryLevel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-[#64748B]">
                {dueCount > 0
                  ? `${dueCount} question${dueCount !== 1 ? 's' : ''} waiting in today's spaced review interval.`
                  : 'No questions due today. Review anytime or practice new questions.'}
              </span>

              <button
                type="button"
                onClick={() => onNavigate('revision_planner')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#D97706] hover:bg-[#B45309] text-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2"
                aria-label="Start today's spaced repetition revision session"
              >
                <Play className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{dueCount > 0 ? 'Start Revision' : 'Review Queue'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

