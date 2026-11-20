import React, { useState, useMemo } from 'react';
import { Calendar, Search, Filter, ArrowUpDown, Clock, CheckCircle2 } from 'lucide-react';
import { EmptyState } from '../EmptyState.tsx';

export interface UpcomingItem {
  id: string;
  questionId: string;
  subject: string;
  topic: string;
  questionText: string;
  nextReviewDate: string;
  intervalDays: number;
  repetition: number;
  easeFactor: number;
  status: 'due' | 'scheduled' | 'mastered' | 'upcoming';
  isDue: boolean;
}

interface UpcomingRevisionTableProps {
  items: UpcomingItem[];
  selectedSubjectFilter?: string;
  onSelectSubjectFilter?: (subject: string) => void;
  onStartItemRevision?: (item: UpcomingItem) => void;
}

function formatDateFull(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function getRelativeDays(dateStr: string): string {
  try {
    const target = new Date(dateStr);
    const now = new Date();
    if (target <= now) return 'Due today';
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 1) return 'Tomorrow';
    return `In ${diff} days`;
  } catch {
    return 'Scheduled';
  }
}

export function UpcomingRevisionTable({
  items,
  selectedSubjectFilter = 'all',
  onSelectSubjectFilter
}: UpcomingRevisionTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'due' | 'upcoming' | 'mastered'>('all');

  const subjects = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.subject) set.add(item.subject);
    });
    return Array.from(set);
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Tab filter
      const now = new Date();
      const isDue = new Date(item.nextReviewDate) <= now;
      if (activeTab === 'due' && !isDue) return false;
      if (activeTab === 'upcoming' && (isDue || item.status === 'mastered')) return false;
      if (activeTab === 'mastered' && item.status !== 'mastered') return false;

      // Subject filter
      if (selectedSubjectFilter !== 'all' && item.subject !== selectedSubjectFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          item.topic.toLowerCase().includes(q) ||
          item.subject.toLowerCase().includes(q) ||
          item.questionText.toLowerCase().includes(q) ||
          item.questionId.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [items, activeTab, selectedSubjectFilter, searchTerm]);

  return (
    <div className="bg-white border border-[#E8EBF0] rounded-xl overflow-hidden shadow-sm">
      {/* Table Header Controls */}
      <div className="p-5 border-b border-[#E8EBF0]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-[#172033]">Upcoming &amp; scheduled revision</h3>
            <p className="text-xs text-[#64748B]">
              Algorithmic memory schedule tracking individual SSC MTS syllabus items
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search topic or question..."
                className="text-xs pl-8 pr-3 py-1.5 border border-[#E8EBF0] rounded-lg bg-white text-[#172033] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#1749E8] w-48 sm:w-56"
              />
            </div>

            {/* Subject Dropdown */}
            {onSelectSubjectFilter && (
              <select
                value={selectedSubjectFilter}
                onChange={(e) => onSelectSubjectFilter(e.target.value)}
                className="text-xs px-3 py-1.5 border border-[#E8EBF0] rounded-lg bg-white text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#1749E8]"
                aria-label="Filter by subject"
              >
                <option value="all">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'all', label: `All (${items.length})` },
            { id: 'due', label: `Due Today (${items.filter((i) => new Date(i.nextReviewDate) <= new Date()).length})` },
            { id: 'upcoming', label: `Upcoming (${items.filter((i) => new Date(i.nextReviewDate) > new Date() && i.status !== 'mastered').length})` },
            { id: 'mastered', label: `Mastered (${items.filter((i) => i.status === 'mastered').length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`text-xs px-3 py-1 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#1749E8] ${
                activeTab === tab.id
                  ? 'bg-[#1749E8] text-white'
                  : 'bg-[#F8F9FB] text-[#64748B] hover:text-[#172033] border border-[#E8EBF0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table / Empty State */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-6 h-6" />}
          title="No revision items found"
          description={
            searchTerm
              ? `No questions matching "${searchTerm}". Try adjusting your search or filters.`
              : 'No questions currently match the selected status or subject filter.'
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" aria-label="Scheduled revision items table">
            <thead className="bg-[#F8F9FB] text-[#64748B] font-semibold border-b border-[#E8EBF0]">
              <tr>
                <th scope="col" className="px-4 py-3">Topic &amp; Question</th>
                <th scope="col" className="px-4 py-3">Subject</th>
                <th scope="col" className="px-4 py-3">Scheduled Date</th>
                <th scope="col" className="px-4 py-3">Interval &amp; Ease</th>
                <th scope="col" className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EBF0]">
              {filteredItems.slice(0, 20).map((item) => {
                const isDue = new Date(item.nextReviewDate) <= new Date();
                return (
                  <tr key={item.id} className="hover:bg-[#F8F9FB] transition-colors">
                    <td className="px-4 py-3 max-w-xs sm:max-w-md">
                      <div className="font-semibold text-[#172033] leading-snug">{item.topic}</div>
                      <div className="text-[11px] text-[#64748B] line-clamp-1 mt-0.5">
                        {item.questionText}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">
                      {item.subject}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-[#172033]">{getRelativeDays(item.nextReviewDate)}</div>
                      <div className="text-[11px] text-[#64748B]">{formatDateFull(item.nextReviewDate)}</div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-[#172033]">{item.intervalDays} day{item.intervalDays === 1 ? '' : 's'}</div>
                      <div className="text-[11px] text-[#64748B]">EF: {item.easeFactor.toFixed(2)} • Rep: {item.repetition}</div>
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {isDue ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-[#D97706] border border-amber-200">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          Due Today
                        </span>
                      ) : item.status === 'mastered' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-[#15803D] border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                          Mastered
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F8F9FB] text-[#64748B] border border-[#E8EBF0]">
                          Scheduled
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredItems.length > 20 && (
            <div className="p-3 text-center text-xs text-[#64748B] border-t border-[#E8EBF0] bg-[#F8F9FB]">
              Showing first 20 of {filteredItems.length} items
            </div>
          )}
        </div>
      )}
    </div>
  );
}

