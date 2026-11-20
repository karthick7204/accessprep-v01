import React, { useState } from 'react';
import { Gauge, Zap, AlertTriangle, CheckCircle2, Clock, Table as TableIcon, HelpCircle } from 'lucide-react';
import { SubjectAnalyticsBreakdown } from '../../db/repository.ts';

interface BiSpeedVsAccuracyProps {
  subjects: SubjectAnalyticsBreakdown[];
  overallAccuracy: number;
  avgTimeSeconds: number;
  loading?: boolean;
}

export function BiSpeedVsAccuracy({
  subjects,
  overallAccuracy,
  avgTimeSeconds,
  loading
}: BiSpeedVsAccuracyProps) {
  const [showTable, setShowTable] = useState(false);

  if (loading) {
    return (
      <div className="bg-white border border-[#E8EBF0] rounded-xl p-5 h-72 animate-pulse" aria-busy="true">
        <div className="h-4 w-44 bg-[#E8EBF0] rounded mb-4" />
        <div className="h-48 bg-[#F8F9FB] rounded-lg" />
      </div>
    );
  }

  // Target SSC MTS thresholds:
  // Speed: Target <= 45s per question
  // Accuracy: Target >= 70%
  const classifyQuadrant = (acc: number, speed: number, attempted: number) => {
    if (attempted === 0) {
      return {
        label: 'No Data',
        badgeClass: 'bg-slate-100 text-[#64748B] border-slate-200',
        advice: 'Attempt questions to assess solving pace.'
      };
    }
    const isAccurate = acc >= 70;
    const isFast = speed > 0 && speed <= 45;

    if (isAccurate && isFast) {
      return {
        label: 'Optimal Efficiency',
        badgeClass: 'bg-emerald-50 text-[#15803D] border-emerald-200',
        advice: 'Excellent pace and accuracy. Keep maintaining this exam tempo.'
      };
    }
    if (isAccurate && !isFast) {
      return {
        label: 'Cautious & Precise',
        badgeClass: 'bg-blue-50 text-[#1749E8] border-blue-200',
        advice: 'Accuracy is strong. Practice timed drills to reduce solving time.'
      };
    }
    if (!isAccurate && isFast) {
      return {
        label: 'Rushing / High Errors',
        badgeClass: 'bg-amber-50 text-[#D97706] border-amber-200',
        advice: 'Fast pace but higher error rate. Slow down and verify question premises.'
      };
    }
    return {
      label: 'Needs Conceptual Work',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      advice: 'Review foundational concepts with AI Tutor before attempting speed drills.'
    };
  };

  return (
    <div className="bg-white border border-[#E8EBF0] rounded-xl p-5 shadow-xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-[#172033]">Speed vs Accuracy Analysis</h3>
            <span
              className="text-[#94A3B8] hover:text-[#64748B] cursor-help"
              title="Correlates candidate response speed (seconds per question) against accuracy to detect rushing or hesitation"
            >
              <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          </div>
          <p className="text-[11px] text-[#64748B]">
            SSC MTS Exam target: &le; 45s per question with &ge; 70% accuracy
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#1749E8] bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded-lg transition-colors focus:ring-2 focus:ring-[#1749E8] focus:outline-hidden"
          aria-pressed={showTable}
          aria-label={showTable ? 'Switch to Quadrant view' : 'Switch to Table view'}
        >
          <TableIcon className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{showTable ? 'Visual Cards' : 'Data Table'}</span>
        </button>
      </div>

      {showTable ? (
        /* Accessible Data Table */
        <div className="overflow-x-auto my-auto" tabIndex={0} role="region" aria-label="Speed vs Accuracy Table">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E8EBF0] text-[#64748B]">
                <th scope="col" className="py-2 font-semibold">Subject</th>
                <th scope="col" className="py-2 text-center font-semibold">Speed</th>
                <th scope="col" className="py-2 text-center font-semibold">Accuracy</th>
                <th scope="col" className="py-2 text-right font-semibold">Efficiency Classification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F3F7]">
              {subjects.map((s, idx) => {
                const quad = classifyQuadrant(s.accuracy, s.avgTimeSeconds, s.attempted);
                return (
                  <tr key={idx} className="hover:bg-[#F8F9FB]">
                    <td className="py-2 font-medium text-[#172033]">{s.subject}</td>
                    <td className="py-2 text-center font-mono text-[#172033]">
                      {s.avgTimeSeconds > 0 ? `${s.avgTimeSeconds}s` : '—'}
                    </td>
                    <td className="py-2 text-center font-semibold text-[#172033]">
                      {s.attempted > 0 ? `${s.accuracy}%` : '—'}
                    </td>
                    <td className="py-2 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${quad.badgeClass}`}>
                        {quad.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Visual Subject Quadrant Cards */
        <div className="space-y-2.5 my-auto">
          {subjects.map((s, idx) => {
            const quad = classifyQuadrant(s.accuracy, s.avgTimeSeconds, s.attempted);
            const speedPct = Math.min(100, Math.max(10, ((60 - (s.avgTimeSeconds || 45)) / 60) * 100));

            return (
              <div
                key={idx}
                className="p-3 bg-[#F8F9FB] border border-[#E8EBF0] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-[#D0DEFF] transition-all"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#172033] truncate">{s.subject}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${quad.badgeClass}`}>
                      {quad.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-0.5">{quad.advice}</p>
                </div>

                <div className="flex items-center gap-4 text-right shrink-0">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#64748B]">Speed</div>
                    <div className="text-xs font-mono font-bold text-[#172033]">
                      {s.avgTimeSeconds > 0 ? `${s.avgTimeSeconds}s` : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#64748B]">Accuracy</div>
                    <div className={`text-xs font-bold ${s.accuracy >= 70 ? 'text-[#15803D]' : 'text-[#D97706]'}`}>
                      {s.attempted > 0 ? `${s.accuracy}%` : '—'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Benchmark Note */}
      <div className="pt-3 border-t border-[#E8EBF0] flex items-center justify-between text-[11px] text-[#64748B]">
        <span>Standard pace: 90 questions in 90 minutes = 60s per question max</span>
        <span className="font-semibold text-[#1749E8]">Target: &le; 45s</span>
      </div>
    </div>
  );
}

