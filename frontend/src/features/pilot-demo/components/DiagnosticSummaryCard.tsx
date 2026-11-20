/**
 * ACCESSPREP-X — Diagnostic Summary Card Component
 */

import React from 'react';
import type { DiagnosticAttempt } from '../types/pilotDemo.types.ts';

export interface DiagnosticSummaryCardProps {
  attempt: DiagnosticAttempt;
}

export function DiagnosticSummaryCard({ attempt }: DiagnosticSummaryCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="font-bold text-slate-900">{attempt.examTitle}</div>
        <div className="text-xs text-slate-500">
          Completed {new Date(attempt.completedAt).toLocaleString()}
        </div>
      </div>
      <div className="text-right">
        <div className="text-lg font-extrabold text-[#1749E8]">
          {attempt.totalScore} / {attempt.totalMax} ({attempt.percentage}%)
        </div>
        <div className="text-xs text-slate-600">
          Accuracy: {attempt.accuracyPercentage}% • Correct: {attempt.correctCount}/{attempt.totalQuestions}
        </div>
      </div>
    </div>
  );
}
