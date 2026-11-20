import React from 'react';
import { Play, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

interface DailyRevisionBannerProps {
  dueCount: number;
  totalCount: number;
  onStartSession: () => void;
  onNavigateToPractice?: () => void;
}

export function DailyRevisionBanner({
  dueCount,
  totalCount,
  onStartSession,
  onNavigateToPractice
}: DailyRevisionBannerProps) {
  const hasDueQuestions = dueCount > 0;

  return (
    <div className="bg-white border border-[#E8EBF0] rounded-xl p-6 mb-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1749E8] bg-[#F0F4FF] px-2.5 py-0.5 rounded-full border border-[#D0DEFF]">
              Daily Queue
            </span>
            {hasDueQuestions && (
              <span className="text-xs font-medium text-[#D97706] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Action required
              </span>
            )}
          </div>

          <h2 className="text-xl font-bold text-[#172033]">Your daily revision</h2>

          <p className="text-sm text-[#64748B] leading-relaxed">
            {hasDueQuestions ? (
              <>
                <strong className="text-[#172033] font-semibold">
                  {dueCount} question{dueCount === 1 ? '' : 's'}
                </strong>{' '}
                {dueCount === 1 ? 'is' : 'are'} waiting for revision. Reviewing at spaced intervals
                prevents forgetting and moves knowledge into long-term memory.
              </>
            ) : totalCount > 0 ? (
              <>
                All caught up for today! No questions are currently due for review. You can review
                upcoming items early or practice new topics to add to your queue.
              </>
            ) : (
              <>
                Your revision queue is currently empty. Solve questions in Voice Practice or take a
                Mock Exam to automatically schedule SM-2 memory reviews.
              </>
            )}
          </p>
        </div>

        <div className="shrink-0">
          {hasDueQuestions ? (
            <button
              type="button"
              onClick={onStartSession}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-lg bg-[#1749E8] text-white text-sm font-semibold hover:bg-[#123BB8] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1749E8] focus:ring-offset-2"
              aria-label={`Start revision session with ${dueCount} questions`}
            >
              <Play className="w-4 h-4 fill-current" aria-hidden="true" />
              <span>Start revision session</span>
              <span className="px-1.5 py-0.5 rounded text-xs bg-white/20 font-bold">
                {dueCount}
              </span>
            </button>
          ) : totalCount > 0 ? (
            <button
              type="button"
              onClick={onStartSession}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-[#E8EBF0] text-[#172033] text-sm font-semibold hover:bg-[#F8F9FB] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1749E8]"
            >
              <Sparkles className="w-4 h-4 text-[#1749E8]" aria-hidden="true" />
              <span>Review upcoming items anyway</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onNavigateToPractice}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#1749E8] text-white text-sm font-semibold hover:bg-[#123BB8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1749E8]"
            >
              <span>Explore Voice Practice</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

