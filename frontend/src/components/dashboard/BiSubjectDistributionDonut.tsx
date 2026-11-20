import React, { useState, useMemo } from 'react';
import { PieChart as PieChartIcon, Table as TableIcon, HelpCircle } from 'lucide-react';
import { SubjectAnalyticsBreakdown } from '../../db/repository.ts';

interface BiSubjectDistributionDonutProps {
  subjects: SubjectAnalyticsBreakdown[];
  totalPracticeQuestions: number;
  loading?: boolean;
}

interface Segment {
  name: string;
  shortName: string;
  count: number;
  percentage: number;
  color: string;
  dashLength: number;
  dashOffset: number;
}

const SUBJECT_COLORS: Record<string, { color: string; short: string }> = {
  'Numerical and Mathematical Ability': { color: '#1749E8', short: 'Numerical Ability' },
  'Reasoning Ability and Problem Solving': { color: '#7C3AED', short: 'Reasoning Ability' },
  'English Language and Comprehension': { color: '#15803D', short: 'English Language' },
  'General Awareness': { color: '#D97706', short: 'General Awareness' }
};

export function BiSubjectDistributionDonut({
  subjects,
  totalPracticeQuestions,
  loading
}: BiSubjectDistributionDonutProps) {
  const [showTable, setShowTable] = useState(false);

  // SVG Donut geometry
  const size = 180;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate distributions
  const { segments, totalCount } = useMemo(() => {
    const rawTotal = subjects.reduce((sum, s) => sum + (s.attempted || 0), 0);
    const countTotal = rawTotal > 0 ? rawTotal : totalPracticeQuestions;

    if (countTotal === 0) {
      return { segments: [], totalCount: 0 };
    }

    let accumulatedPct = 0;
    const segs: Segment[] = subjects.map((s) => {
      const conf = SUBJECT_COLORS[s.subject] || { color: '#64748B', short: s.subject };
      const count = s.attempted || 0;
      const pct = Math.round((count / countTotal) * 100);
      const dashLength = (pct / 100) * circumference;
      const dashOffset = -((accumulatedPct / 100) * circumference);
      accumulatedPct += pct;

      return {
        name: s.subject,
        shortName: conf.short,
        count,
        percentage: pct,
        color: conf.color,
        dashLength,
        dashOffset
      };
    });

    return { segments: segs, totalCount: countTotal };
  }, [subjects, totalPracticeQuestions, circumference]);

  if (loading) {
    return (
      <div className="bg-white border border-[#E8EBF0] rounded-xl p-5 h-72 animate-pulse" aria-busy="true">
        <div className="h-4 w-40 bg-[#E8EBF0] rounded mb-4" />
        <div className="h-48 bg-[#F8F9FB] rounded-lg" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E8EBF0] rounded-xl p-5 shadow-xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-[#172033]">Subject Question Distribution</h3>
            <span
              className="text-[#94A3B8] hover:text-[#64748B] cursor-help"
              title="Distribution of practice questions across the 4 syllabus sections"
            >
              <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          </div>
          <p className="text-[11px] text-[#64748B]">
            {totalCount > 0 ? `${totalCount} total questions attempted` : 'No practice data logged yet'}
          </p>
        </div>

        {/* View Toggle */}
        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#1749E8] bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded-lg transition-colors focus:ring-2 focus:ring-[#1749E8] focus:outline-hidden"
          aria-pressed={showTable}
          aria-label={showTable ? 'Switch to Donut Chart view' : 'Switch to Data Table view'}
        >
          {showTable ? (
            <>
              <PieChartIcon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Chart</span>
            </>
          ) : (
            <>
              <TableIcon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Data Table</span>
            </>
          )}
        </button>
      </div>

      {showTable ? (
        /* Accessible Data Table View */
        <div className="overflow-x-auto my-auto" tabIndex={0} role="region" aria-label="Subject Distribution Data Table">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E8EBF0] text-[#64748B]">
                <th scope="col" className="py-2 font-semibold">Subject</th>
                <th scope="col" className="py-2 text-right font-semibold">Questions</th>
                <th scope="col" className="py-2 text-right font-semibold">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F3F7]">
              {subjects.map((s, idx) => {
                const conf = SUBJECT_COLORS[s.subject] || { color: '#64748B', short: s.subject };
                const pct = totalCount > 0 ? Math.round(((s.attempted || 0) / totalCount) * 100) : 0;
                return (
                  <tr key={idx} className="hover:bg-[#F8F9FB]">
                    <td className="py-2 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: conf.color }} />
                      <span className="font-medium text-[#172033]">{conf.short}</span>
                    </td>
                    <td className="py-2 text-right text-[#172033] font-semibold">{s.attempted || 0}</td>
                    <td className="py-2 text-right text-[#64748B]">{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Visual Donut Chart & Legend */
        <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4 my-auto">
          {/* SVG Donut */}
          <div className="sm:col-span-5 flex justify-center relative">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="transform -rotate-90"
              role="img"
              aria-label={`Donut chart showing question distribution: ${segments.map((s) => `${s.shortName} ${s.percentage}%`).join(', ')}`}
            >
              {totalCount === 0 ? (
                /* Empty state circle */
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="#E8EBF0"
                  strokeWidth={strokeWidth}
                  fill="none"
                />
              ) : (
                /* Colored segments */
                segments.map((seg, idx) => (
                  <circle
                    key={idx}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={seg.color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={`${seg.dashLength} ${circumference}`}
                    strokeDashoffset={seg.dashOffset}
                    strokeLinecap="butt"
                    className="transition-all duration-500"
                  />
                ))
              )}
            </svg>

            {/* Donut Center Metrics */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-xl font-bold text-[#172033] leading-none">
                {totalCount}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748B] mt-0.5">
                Solved
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="sm:col-span-7 flex flex-col gap-2">
            {subjects.map((s, idx) => {
              const conf = SUBJECT_COLORS[s.subject] || { color: '#64748B', short: s.subject };
              const count = s.attempted || 0;
              const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;

              return (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: conf.color }}
                      aria-hidden="true"
                    />
                    <span className="text-[#172033] font-medium truncate" title={s.subject}>
                      {conf.short}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-right shrink-0">
                    <span className="font-semibold text-[#172033]">{count}</span>
                    <span className="text-[#64748B] text-[11px] w-8">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Screen Reader Summary */}
      <div className="sr-only">
        {totalCount > 0 ? (
          <p>
            Total {totalCount} practice questions solved. Breakdown:{' '}
            {segments.map((s) => `${s.shortName}: ${s.count} questions (${s.percentage}%).`).join(' ')}
          </p>
        ) : (
          <p>No questions have been attempted across any subject.</p>
        )}
      </div>
    </div>
  );
}

