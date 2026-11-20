import React, { useState, useMemo } from 'react';
import { Search, Filter, Play, CheckCircle2, AlertCircle, TrendingUp, BookOpen } from 'lucide-react';

export interface TopicMasteryItem {
  topic: string;
  subject: string;
  totalQuestions: number;
  attemptsCount: number;
  correctCount: number;
  p_known: number;
  masteryPercentage: number;
  tier: 'Novice' | 'Developing' | 'Proficient' | 'Mastered';
  lastUpdated: string | null;
}

interface BiTopicMasteryTableProps {
  masteryData: TopicMasteryItem[];
  loading?: boolean;
  onStartPractice: (subject: string, topic?: string) => void;
}

const SUBJECT_OPTIONS = [
  'All Subjects',
  'Numerical and Mathematical Ability',
  'Reasoning Ability and Problem Solving',
  'English Language and Comprehension',
  'General Awareness'
];

export function BiTopicMasteryTable({
  masteryData,
  loading,
  onStartPractice
}: BiTopicMasteryTableProps) {
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Weak' | 'Mastered'>('All');

  const filteredTopics = useMemo(() => {
    return masteryData.filter((item) => {
      // Subject filter
      if (selectedSubject !== 'All Subjects' && item.subject !== selectedSubject) {
        return false;
      }

      // Status filter
      if (statusFilter === 'Weak' && item.masteryPercentage >= 65) {
        return false;
      }
      if (statusFilter === 'Mastered' && item.masteryPercentage < 80) {
        return false;
      }

      // Search term
      if (search.trim()) {
        const query = search.toLowerCase();
        return (
          item.topic.toLowerCase().includes(query) ||
          item.subject.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [masteryData, selectedSubject, statusFilter, search]);

  if (loading) {
    return (
      <div className="bg-white border border-[#E8EBF0] rounded-xl p-5 h-80 animate-pulse" aria-busy="true">
        <div className="h-4 w-48 bg-[#E8EBF0] rounded mb-4" />
        <div className="h-60 bg-[#F8F9FB] rounded-lg" />
      </div>
    );
  }

  const getTierBadge = (tier: string, pct: number) => {
    if (pct >= 80 || tier === 'Mastered') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#15803D] border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          <span>Mastered</span>
        </span>
      );
    }
    if (pct >= 65 || tier === 'Proficient') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#1749E8] border border-blue-200">
          <span>Proficient</span>
        </span>
      );
    }
    if (pct >= 45 || tier === 'Developing') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-[#D97706] border border-amber-200">
          <span>Developing</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
        <AlertCircle className="w-3 h-3" />
        <span>Needs Work</span>
      </span>
    );
  };

  const getSubjectShort = (subject: string) => {
    if (subject.includes('Numerical')) return 'Numerical';
    if (subject.includes('Reasoning')) return 'Reasoning';
    if (subject.includes('English')) return 'English';
    return 'Gen Awareness';
  };

  return (
    <section className="bg-white border border-[#E8EBF0] rounded-xl p-5 shadow-xs mb-6" aria-label="Topic Mastery Analysis">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#172033]">Topic Mastery Breakdown (BKT)</h3>
            <span className="text-[10px] font-bold bg-[#EEF2FF] text-[#1749E8] px-1.5 py-0.5 rounded">
              Bayesian Knowledge Tracing
            </span>
          </div>
          <p className="text-[11px] text-[#64748B]">
            Real-time probability of latent skill mastery across the SSC MTS syllabus
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-[#94A3B8]" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search topic..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search syllabus topics"
              className="pl-8 pr-3 py-1.5 text-xs bg-[#F8F9FB] border border-[#E8EBF0] rounded-lg text-[#172033] placeholder-[#94A3B8] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1749E8] focus:border-transparent w-36 sm:w-44"
            />
          </div>

          {/* Subject dropdown */}
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            aria-label="Filter by syllabus subject"
            className="text-xs bg-[#F8F9FB] border border-[#E8EBF0] rounded-lg px-2.5 py-1.5 text-[#172033] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1749E8]"
          >
            {SUBJECT_OPTIONS.map((subj) => (
              <option key={subj} value={subj}>
                {subj === 'All Subjects' ? 'All Subjects' : getSubjectShort(subj)}
              </option>
            ))}
          </select>

          {/* Status Tabs */}
          <div className="inline-flex rounded-lg border border-[#E8EBF0] p-0.5 bg-[#F8F9FB] text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('All')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                statusFilter === 'All' ? 'bg-white text-[#1749E8] shadow-xs' : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Weak')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                statusFilter === 'Weak' ? 'bg-white text-rose-700 shadow-xs' : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              Weak (&lt;65%)
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Mastered')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                statusFilter === 'Mastered' ? 'bg-white text-[#15803D] shadow-xs' : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              Mastered
            </button>
          </div>
        </div>
      </div>

      {/* Topics Table */}
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Topic Mastery Table">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E8EBF0] bg-[#F8F9FB] text-[#64748B]">
              <th scope="col" className="py-2.5 px-3 font-semibold">Topic</th>
              <th scope="col" className="py-2.5 px-3 font-semibold">Subject</th>
              <th scope="col" className="py-2.5 px-3 font-semibold">Mastery & Probability</th>
              <th scope="col" className="py-2.5 px-3 text-center font-semibold">Solved</th>
              <th scope="col" className="py-2.5 px-3 text-center font-semibold">Status</th>
              <th scope="col" className="py-2.5 px-3 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F3F7]">
            {filteredTopics.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#64748B]">
                  No syllabus topics matched the current filters.
                </td>
              </tr>
            ) : (
              filteredTopics.map((item, idx) => (
                <tr key={idx} className="hover:bg-[#F8F9FB] transition-colors">
                  {/* Topic Name */}
                  <td className="py-2.5 px-3 font-medium text-[#172033]">
                    {item.topic}
                  </td>

                  {/* Subject Badge */}
                  <td className="py-2.5 px-3">
                    <span className="text-[11px] font-semibold text-[#64748B] bg-[#F1F3F7] px-2 py-0.5 rounded">
                      {getSubjectShort(item.subject)}
                    </span>
                  </td>

                  {/* Progress Bar & Percentage */}
                  <td className="py-2.5 px-3 w-48 sm:w-56">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[#E8EBF0] h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            item.masteryPercentage >= 80
                              ? 'bg-[#15803D]'
                              : item.masteryPercentage >= 65
                              ? 'bg-[#1749E8]'
                              : item.masteryPercentage >= 45
                              ? 'bg-[#D97706]'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, item.masteryPercentage))}%` }}
                        />
                      </div>
                      <span className="font-bold text-[#172033] text-[11px] w-12 text-right">
                        {item.masteryPercentage}%
                      </span>
                    </div>
                  </td>

                  {/* Attempts Count */}
                  <td className="py-2.5 px-3 text-center font-semibold text-[#172033]">
                    {item.attemptsCount} / {item.totalQuestions || '—'}
                  </td>

                  {/* Status Tier */}
                  <td className="py-2.5 px-3 text-center">
                    {getTierBadge(item.tier, item.masteryPercentage)}
                  </td>

                  {/* Practice Action */}
                  <td className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => onStartPractice(item.subject, item.topic)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#1749E8] bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded-md transition-colors focus:ring-2 focus:ring-[#1749E8]"
                      aria-label={`Practice topic ${item.topic} in ${item.subject}`}
                    >
                      <Play className="w-3 h-3 fill-current" aria-hidden="true" />
                      <span>Practice</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Summary */}
      <div className="mt-3 pt-3 border-t border-[#E8EBF0] flex flex-wrap items-center justify-between text-[11px] text-[#64748B]">
        <span>Showing {filteredTopics.length} of {masteryData.length} syllabus topics</span>
        <span>BKT updates with P(L0)=0.25, P(T)=0.10, P(G)=0.25, P(S)=0.10</span>
      </div>
    </section>
  );
}

