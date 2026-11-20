import React from 'react';
import { Calendar, Brain, Clock, CheckCircle2, ArrowRight, AlertTriangle } from 'lucide-react';
import { RevisionData } from './RevisionOverview.tsx';

interface BiRevisionCardProps {
  revisionData: RevisionData | null;
  loading?: boolean;
  onNavigate: (screen: any) => void;
}

export function BiRevisionCard({ revisionData, loading, onNavigate }: BiRevisionCardProps) {
  if (loading) {
    return (
      <div className="bg-white border border-[#E8EBF0] rounded-xl p-5 h-72 animate-pulse" aria-busy="true">
        <div className="h-4 w-40 bg-[#E8EBF0] rounded mb-4" />
        <div className="h-48 bg-[#F8F9FB] rounded-lg" />
      </div>
    );
  }

  const dueToday = revisionData?.dueTodayCount ?? 0;
  const totalItems = revisionData?.totalCount ?? 0;
  const upcomingCount = revisionData?.upcomingCount ?? 0;

  return (
    <div className="bg-white border border-[#E8EBF0] rounded-xl p-5 shadow-xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-[#172033]">Spaced Repetition & Revision</h3>
            <span className="text-[10px] font-bold bg-[#EEF2FF] text-[#1749E8] px-1.5 py-0.5 rounded">
              SuperMemo SM-2
            </span>
          </div>
          <p className="text-[11px] text-[#64748B]">
            Automated active recall queue based on your memory retention
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('revision_planner')}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#1749E8] hover:text-[#1034A6] hover:underline focus:ring-2 focus:ring-[#1749E8] focus:outline-hidden"
          aria-label="Open Revision Planner"
        >
          <span>Planner</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Main Content */}
      <div className="my-auto space-y-4">
        {dueToday > 0 ? (
          /* Cards Due Alert Banner */
          <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-900">
                  {dueToday} Question{dueToday > 1 ? 's' : ''} Due Today
                </div>
                <div className="text-[11px] text-amber-700">
                  SM-2 retention window optimal for review today
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('revision_planner')}
              className="px-3 py-1.5 bg-[#1749E8] hover:bg-[#1034A6] text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0 focus:ring-2 focus:ring-offset-2 focus:ring-[#1749E8]"
            >
              Start Session
            </button>
          </div>
        ) : (
          /* All Caught Up Banner */
          <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-[#15803D] shrink-0">
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#15803D]">All Caught Up for Today!</div>
              <div className="text-[11px] text-emerald-700">
                No cards are pending immediate spaced repetition review.
              </div>
            </div>
          </div>
        )}

        {/* Breakdown Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="p-2.5 bg-[#F8F9FB] border border-[#E8EBF0] rounded-lg">
            <div className="text-[10px] uppercase font-bold text-[#64748B]">Due Today</div>
            <div className="text-base font-bold text-[#172033] mt-0.5">{dueToday}</div>
            <div className="text-[10px] text-[#64748B]">Immediate</div>
          </div>
          <div className="p-2.5 bg-[#F8F9FB] border border-[#E8EBF0] rounded-lg">
            <div className="text-[10px] uppercase font-bold text-[#64748B]">Upcoming</div>
            <div className="text-base font-bold text-[#1749E8] mt-0.5">{upcomingCount}</div>
            <div className="text-[10px] text-[#64748B]">Next 7 days</div>
          </div>
          <div className="p-2.5 bg-[#F8F9FB] border border-[#E8EBF0] rounded-lg">
            <div className="text-[10px] uppercase font-bold text-[#64748B]">Total Deck</div>
            <div className="text-base font-bold text-[#172033] mt-0.5">{totalItems}</div>
            <div className="text-[10px] text-[#64748B]">Tracked cards</div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-[#E8EBF0] flex items-center justify-between text-[11px] text-[#64748B]">
        <span>Spaced intervals dynamically expand: 1d → 3d → 7d → 14d</span>
        <button
          type="button"
          onClick={() => onNavigate('revision_planner')}
          className="font-bold text-[#1749E8] hover:underline"
        >
          View Full Deck
        </button>
      </div>
    </div>
  );
}

