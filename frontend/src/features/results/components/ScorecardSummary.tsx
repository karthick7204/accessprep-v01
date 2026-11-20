/**
 * ACCESSPREP-X — Accessible Scorecard Summary Component
 */

import React from 'react';
import type { MockExamAttempt } from '../../../types/global/domain.types.ts';

export interface ScorecardSummaryProps {
  attempt: MockExamAttempt;
}

export function ScorecardSummary({ attempt }: ScorecardSummaryProps) {
  return (
    <section
      aria-label="Examination Scorecard Summary"
      className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-4"
    >
      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase">Total Score</div>
        <div className="text-2xl font-extrabold text-[#1749E8]">
          {attempt.totalScore} / {attempt.totalMax}
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase">Percentage</div>
        <div className="text-2xl font-extrabold text-slate-900">{attempt.percentage}%</div>
      </div>
      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase">Session I</div>
        <div className="text-xl font-bold text-slate-800">{attempt.session1Score}</div>
      </div>
      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase">Session II</div>
        <div className="text-xl font-bold text-slate-800">{attempt.session2Score}</div>
      </div>
    </section>
  );
}
