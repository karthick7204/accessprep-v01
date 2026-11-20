import React, { useState, useMemo } from 'react';
import { History, Filter, CheckCircle2, Clock, BookOpen, Bot, FileText, ArrowRight } from 'lucide-react';

export interface LearningHistoryEntry {
  id: string;
  userId?: string;
  type: string; // 'PRACTICE' | 'MOCK' | 'TUTOR' | 'REVISION' | string
  title: string;
  summary: string;
  score?: number | null;
  maxScore?: number | null;
  durationSeconds?: number;
  timestamp: string;
}

interface BiLearningActivityTableProps {
  activities: LearningHistoryEntry[];
  loading?: boolean;
  onNavigate: (screen: any) => void;
}

export function BiLearningActivityTable({
  activities,
  loading,
  onNavigate
}: BiLearningActivityTableProps) {
  const [filterType, setFilterType] = useState<'ALL' | 'PRACTICE' | 'MOCK' | 'TUTOR'>('ALL');

  const filtered = useMemo(() => {
    if (filterType === 'ALL') return activities;
    return activities.filter((a) => {
      const t = (a.type || '').toUpperCase();
      if (filterType === 'MOCK') return t.includes('MOCK');
      if (filterType === 'PRACTICE') return t.includes('PRACTICE');
      if (filterType === 'TUTOR') return t.includes('TUTOR') || t.includes('AI');
      return true;
    });
  }, [activities, filterType]);

  if (loading) {
    return (
      <div className="bg-white border border-[#E8EBF0] rounded-xl p-5 h-72 animate-pulse" aria-busy="true">
        <div className="h-4 w-44 bg-[#E8EBF0] rounded mb-4" />
        <div className="h-48 bg-[#F8F9FB] rounded-lg" />
      </div>
    );
  }

  const getTypeBadge = (type: string) => {
    const t = (type || '').toUpperCase();
    if (t.includes('MOCK')) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-[#7C3AED] border border-purple-200">
          <FileText className="w-3 h-3" />
          <span>Mock Exam</span>
        </span>
      );
    }
    if (t.includes('TUTOR') || t.includes('AI')) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#1749E8] border border-blue-200">
          <Bot className="w-3 h-3" />
          <span>AI Tutor</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#15803D] border border-emerald-200">
        <BookOpen className="w-3 h-3" />
        <span>Practice Drill</span>
      </span>
    );
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '—';
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  };

  return (
    <section className="bg-white border border-[#E8EBF0] rounded-xl p-5 shadow-xs mb-6" aria-label="Learning Activity Audit Log">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#172033]">Learning Activity Log</h3>
            <span className="text-[10px] font-bold bg-[#F1F3F7] text-[#64748B] px-1.5 py-0.5 rounded">
              Audit Trail
            </span>
          </div>
          <p className="text-[11px] text-[#64748B]">
            Chronological audit of candidate practice sessions, mock exams, and tutor dialogues
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-[#E8EBF0] p-0.5 bg-[#F8F9FB] text-xs">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                filterType === 'ALL' ? 'bg-white text-[#1749E8] shadow-xs' : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              All ({activities.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('PRACTICE')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                filterType === 'PRACTICE' ? 'bg-white text-[#1749E8] shadow-xs' : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              Practice
            </button>
            <button
              type="button"
              onClick={() => setFilterType('MOCK')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                filterType === 'MOCK' ? 'bg-white text-[#1749E8] shadow-xs' : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              Mocks
            </button>
            <button
              type="button"
              onClick={() => setFilterType('TUTOR')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                filterType === 'TUTOR' ? 'bg-white text-[#1749E8] shadow-xs' : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              AI Tutor
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Activity History Table">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E8EBF0] bg-[#F8F9FB] text-[#64748B]">
              <th scope="col" className="py-2.5 px-3 font-semibold">Activity</th>
              <th scope="col" className="py-2.5 px-3 font-semibold">Details & Summary</th>
              <th scope="col" className="py-2.5 px-3 text-center font-semibold">Score / Accuracy</th>
              <th scope="col" className="py-2.5 px-3 text-center font-semibold">Duration</th>
              <th scope="col" className="py-2.5 px-3 text-right font-semibold">Date & Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F3F7]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#64748B]">
                  No activities recorded under this category yet.
                </td>
              </tr>
            ) : (
              filtered.slice(0, 10).map((act, idx) => {
                const dateStr = act.timestamp
                  ? new Date(act.timestamp).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : '—';

                const hasScore = act.score !== undefined && act.score !== null;
                const pct = hasScore && act.maxScore && act.maxScore > 0
                  ? Math.round((act.score! / act.maxScore) * 100)
                  : null;

                return (
                  <tr key={idx} className="hover:bg-[#F8F9FB] transition-colors">
                    <td className="py-2.5 px-3 font-medium text-[#172033]">
                      {getTypeBadge(act.type)}
                    </td>
                    <td className="py-2.5 px-3 text-[#172033]">
                      <div className="font-semibold line-clamp-1">{act.title}</div>
                      <div className="text-[11px] text-[#64748B] line-clamp-1">{act.summary}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {hasScore ? (
                        <span className="font-bold text-[#172033]">
                          {act.score}{act.maxScore ? `/${act.maxScore}` : ''}
                          {pct !== null && <span className="text-[#64748B] font-normal text-[11px] ml-1">({pct}%)</span>}
                        </span>
                      ) : (
                        <span className="text-[#94A3B8]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center text-[#64748B] font-mono text-[11px]">
                      {formatDuration(act.durationSeconds)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#64748B] text-[11px] whitespace-nowrap">
                      {dateStr}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-[#E8EBF0] flex items-center justify-between text-[11px] text-[#64748B]">
        <span>Showing {Math.min(10, filtered.length)} of {filtered.length} entries</span>
        <button
          type="button"
          onClick={() => onNavigate('progress_analytics')}
          className="font-bold text-[#1749E8] hover:underline inline-flex items-center gap-1"
        >
          <span>Full Analytics Log</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </section>
  );
}

