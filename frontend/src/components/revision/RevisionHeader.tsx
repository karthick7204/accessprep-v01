import React from 'react';
import { Calendar, Brain, Sparkles, Mic } from 'lucide-react';
import { AudioToolbar } from '../AudioToolbar.tsx';

interface RevisionHeaderProps {
  dueCount: number;
  totalCount: number;
  isBlindMode?: boolean;
}

export function RevisionHeader({ dueCount, totalCount, isBlindMode }: RevisionHeaderProps) {
  const readText =
    dueCount > 0
      ? `Revision Planner. Build stronger memory, one revision at a time. You have ${dueCount} questions due today out of ${totalCount} total tracked questions.`
      : `Revision Planner. Build stronger memory, one revision at a time. All questions are up to date. You have ${totalCount} total tracked questions in your spaced repetition queue.`;

  return (
    <div className="border-b border-[#E8EBF0] pb-5 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F0F4FF] text-[#1749E8] border border-[#D0DEFF]">
              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
              Screen 10 of 16
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F8F9FB] text-[#64748B] border border-[#E8EBF0]">
              <Brain className="w-3.5 h-3.5 text-[#1749E8]" aria-hidden="true" />
              SuperMemo SM-2 Active
            </span>
            {isBlindMode && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <Mic className="w-3 h-3 text-red-500 animate-pulse" aria-hidden="true" />
                Hands-Free Voice Active
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#172033] tracking-tight">
            Revision Planner
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Build stronger memory, one revision at a time.
          </p>
        </div>

        <div className="shrink-0">
          <AudioToolbar textToRead={readText} label="Revision Readout" />
        </div>
      </div>
    </div>
  );
}

