import React from 'react';
import { CheckCircle2, RotateCcw, ArrowRight, BookOpen, AlertTriangle, Sparkles, Calendar } from 'lucide-react';

export interface SessionStats {
  reviewedCount: number;
  easyCount: number;
  goodCount: number;
  hardCount: number;
  againCount: number;
  flaggedTopics: { topic: string; subject: string; count: number }[];
  nextScheduledDate: string | null;
}

interface SessionCompletionSummaryProps {
  stats: SessionStats;
  onReviewDifficult?: () => void;
  onReturnToOverview: () => void;
  onNavigateToSubjects?: () => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Tomorrow at 9:00 AM';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return 'Tomorrow';
  }
}

export function SessionCompletionSummary({
  stats,
  onReviewDifficult,
  onReturnToOverview,
  onNavigateToSubjects
}: SessionCompletionSummaryProps) {
  const hasDifficultQuestions = (stats.againCount + stats.hardCount) > 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8" role="region" aria-label="Revision session completion summary">
      <div className="bg-white border border-[#E8EBF0] rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* Celebration Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-[#15803D] border border-emerald-200 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold text-[#172033]">Revision Session Complete!</h2>
          <p className="text-xs sm:text-sm text-[#64748B] max-w-md mx-auto">
            SuperMemo SM-2 has updated your memory intervals and difficulty factors. Consistently
            spacing your reviews ensures high retention for the SSC MTS examination.
          </p>
        </div>

        {/* Breakdown Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-[#E8EBF0]">
          <div className="text-center p-3 bg-[#F8F9FB] rounded-lg border border-[#E8EBF0]">
            <span className="text-[10px] uppercase font-bold text-[#64748B] block">Reviewed</span>
            <span className="text-xl font-bold text-[#172033] mt-0.5 block">
              {stats.reviewedCount}
            </span>
          </div>

          <div className="text-center p-3 bg-emerald-50/50 rounded-lg border border-emerald-200">
            <span className="text-[10px] uppercase font-bold text-[#15803D] block">Easy (5)</span>
            <span className="text-xl font-bold text-[#15803D] mt-0.5 block">
              {stats.easyCount}
            </span>
          </div>

          <div className="text-center p-3 bg-blue-50/50 rounded-lg border border-blue-200">
            <span className="text-[10px] uppercase font-bold text-[#1749E8] block">Good (4)</span>
            <span className="text-xl font-bold text-[#1749E8] mt-0.5 block">
              {stats.goodCount}
            </span>
          </div>

          <div className="text-center p-3 bg-amber-50/50 rounded-lg border border-amber-200">
            <span className="text-[10px] uppercase font-bold text-[#D97706] block">Hard / Forgot</span>
            <span className="text-xl font-bold text-[#D97706] mt-0.5 block">
              {stats.hardCount + stats.againCount}
            </span>
          </div>
        </div>

        {/* Topics Needing Practice */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#D97706]" aria-hidden="true" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#172033]">
              Topics Needing Additional Practice
            </h3>
          </div>

          {stats.flaggedTopics.length > 0 ? (
            <div className="space-y-2">
              {stats.flaggedTopics.map((t, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#F8F9FB] border border-[#E8EBF0] text-xs"
                >
                  <div>
                    <span className="font-semibold text-[#172033] block">{t.topic}</span>
                    <span className="text-[11px] text-[#64748B]">{t.subject}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    {t.count} card{t.count === 1 ? '' : 's'} difficult
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 text-emerald-900 rounded-lg border border-emerald-200 text-xs">
              Excellent retention! You answered all questions with Good or Easy recall. No immediate remediation needed.
            </div>
          )}
        </div>

        {/* Next Scheduled Date */}
        <div className="flex items-center gap-3 p-3.5 bg-[#F8F9FB] border border-[#E8EBF0] rounded-lg">
          <Calendar className="w-5 h-5 text-[#1749E8] shrink-0" aria-hidden="true" />
          <div className="text-xs">
            <span className="font-semibold text-[#172033] block">Next scheduled review interval:</span>
            <span className="text-[#64748B]">{formatDate(stats.nextScheduledDate)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-[#E8EBF0]">
          {hasDifficultQuestions && onReviewDifficult && (
            <button
              type="button"
              onClick={onReviewDifficult}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-[#E8EBF0] bg-white text-[#172033] text-xs font-semibold hover:bg-[#F8F9FB] transition-colors inline-flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#1749E8]"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Review difficult questions</span>
            </button>
          )}

          <button
            type="button"
            onClick={onReturnToOverview}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#1749E8] text-white text-xs font-semibold hover:bg-[#123BB8] transition-colors inline-flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#1749E8]"
          >
            <span>Return to Revision Planner</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

