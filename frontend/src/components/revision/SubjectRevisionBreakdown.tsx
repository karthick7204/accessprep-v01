import React from 'react';
import { Calculator, Compass, BookOpen, Globe, ArrowRight, Play, CheckCircle2 } from 'lucide-react';

export interface SubjectRevisionStats {
  subject: string;
  shortLabel: string;
  dueCount: number;
  completedCount: number;
  totalCount: number;
  nextDate: string | null;
}

interface SubjectRevisionBreakdownProps {
  stats: SubjectRevisionStats[];
  onStartSubjectSession: (subject: string) => void;
  onFilterSubjectView?: (subject: string) => void;
}

function getSubjectIcon(subject: string) {
  if (subject.includes('Numerical') || subject.includes('Math')) {
    return <Calculator className="w-4 h-4 text-[#1749E8]" aria-hidden="true" />;
  }
  if (subject.includes('Reasoning')) {
    return <Compass className="w-4 h-4 text-[#7C3AED]" aria-hidden="true" />;
  }
  if (subject.includes('English')) {
    return <BookOpen className="w-4 h-4 text-[#D97706]" aria-hidden="true" />;
  }
  return <Globe className="w-4 h-4 text-[#15803D]" aria-hidden="true" />;
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return 'None scheduled';
  const target = new Date(dateStr);
  const now = new Date();

  if (target <= now) return 'Due today';

  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) return 'Tomorrow';
  if (diffDays <= 7) return `In ${diffDays} days`;

  return target.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function SubjectRevisionBreakdown({
  stats,
  onStartSubjectSession,
  onFilterSubjectView
}: SubjectRevisionBreakdownProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-[#172033]">Subject-wise breakdown</h3>
          <p className="text-xs text-[#64748B]">
            Focus your revision by specific SSC MTS examination sections
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map((item) => {
          const hasDue = item.dueCount > 0;
          return (
            <div
              key={item.subject}
              className="bg-white border border-[#E8EBF0] rounded-xl p-5 shadow-sm hover:border-[#D0DEFF] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#F8F9FB] border border-[#E8EBF0] flex items-center justify-center shrink-0">
                      {getSubjectIcon(item.subject)}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[#172033] leading-snug">
                        {item.subject}
                      </h4>
                      <span className="text-[11px] text-[#64748B]">
                        {item.totalCount} total tracked questions
                      </span>
                    </div>
                  </div>

                  {hasDue ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-[#D97706] border border-amber-200 shrink-0">
                      {item.dueCount} Due
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#F8F9FB] text-[#15803D] border border-[#E8EBF0] shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-[#15803D]" aria-hidden="true" />
                      Up to date
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 py-3 px-3 bg-[#F8F9FB] border border-[#E8EBF0] rounded-lg text-xs mb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#64748B] block">Due</span>
                    <span className={`font-bold ${hasDue ? 'text-[#D97706]' : 'text-[#172033]'}`}>
                      {item.dueCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#64748B] block">Mastered</span>
                    <span className="font-bold text-[#15803D]">{item.completedCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#64748B] block">Next Review</span>
                    <span className="font-semibold text-[#172033] truncate block">
                      {formatRelativeDate(item.nextDate)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#E8EBF0]">
                {onFilterSubjectView && (
                  <button
                    type="button"
                    onClick={() => onFilterSubjectView(item.subject)}
                    className="text-xs font-semibold text-[#64748B] hover:text-[#172033] inline-flex items-center gap-1 focus:outline-none focus:underline"
                  >
                    <span>View items</span>
                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onStartSubjectSession(item.subject)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1749E8] ml-auto ${
                    hasDue
                      ? 'bg-[#1749E8] text-white hover:bg-[#123BB8]'
                      : 'bg-white border border-[#E8EBF0] text-[#172033] hover:bg-[#F8F9FB]'
                  }`}
                  aria-label={`Revise ${item.subject} (${item.dueCount > 0 ? `${item.dueCount} due` : 'practice all'})`}
                >
                  <Play className="w-3 h-3 fill-current" aria-hidden="true" />
                  <span>{hasDue ? `Revise (${item.dueCount})` : 'Practice'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

