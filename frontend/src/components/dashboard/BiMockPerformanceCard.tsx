import React from 'react';
import { FileText, CheckCircle2, AlertCircle, ArrowUpRight, Clock, Award } from 'lucide-react';
import { MockExamAttempt } from '../../db/database.ts';

interface BiMockPerformanceCardProps {
  mocks: MockExamAttempt[];
  loading?: boolean;
  onNavigate: (screen: any) => void;
}

export function BiMockPerformanceCard({ mocks, loading, onNavigate }: BiMockPerformanceCardProps) {
  if (loading) {
    return (
      <div className="bg-white border border-[#E8EBF0] rounded-xl p-5 h-72 animate-pulse" aria-busy="true">
        <div className="h-4 w-44 bg-[#E8EBF0] rounded mb-4" />
        <div className="h-48 bg-[#F8F9FB] rounded-lg" />
      </div>
    );
  }

  const latestMock = mocks && mocks.length > 0 ? mocks[0] : null;

  return (
    <div className="bg-white border border-[#E8EBF0] rounded-xl p-5 shadow-xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-[#172033]">Mock Examination Performance</h3>
            <span className="text-[10px] font-bold bg-[#F1F3F7] text-[#64748B] px-1.5 py-0.5 rounded">
              90 Min · 270 Marks
            </span>
          </div>
          <p className="text-[11px] text-[#64748B]">
            {mocks.length > 0 ? `${mocks.length} full mock test${mocks.length > 1 ? 's' : ''} completed` : 'Simulated official exam environment'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('mock_exam')}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#1749E8] hover:text-[#1034A6] hover:underline focus:ring-2 focus:ring-[#1749E8] focus:outline-hidden"
          aria-label="Navigate to Mock Examination module"
        >
          <span>{mocks.length > 0 ? 'All Mocks' : 'Start Mock'}</span>
          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Content */}
      {!latestMock ? (
        /* Empty State */
        <div className="my-auto py-5 px-4 bg-[#F8F9FB] border border-dashed border-[#E8EBF0] rounded-xl text-center flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#1749E8] mb-2.5">
            <FileText className="w-5 h-5" aria-hidden="true" />
          </div>
          <h4 className="text-xs font-bold text-[#172033] mb-1">No Mock Exams Completed Yet</h4>
          <p className="text-[11px] text-[#64748B] max-w-sm mb-3">
            SSC MTS comprises Session I (Qualifying: Math & Reasoning) and Session II (Merit: English & General Awareness). Take a timed diagnostic mock exam to test your readiness.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('mock_exam')}
            className="px-3 py-1.5 bg-[#1749E8] hover:bg-[#1034A6] text-white text-xs font-bold rounded-lg shadow-xs transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-[#1749E8]"
          >
            Attempt Full Mock Exam
          </button>
        </div>
      ) : (
        /* Completed Mock Summary */
        <div className="space-y-3.5 my-auto">
          {/* Latest Mock Score Card */}
          <div className="p-3.5 bg-[#F8F9FB] border border-[#E8EBF0] rounded-xl">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h4 className="text-xs font-bold text-[#172033] line-clamp-1">{latestMock.examTitle}</h4>
                <div className="flex items-center gap-2 text-[11px] text-[#64748B] mt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#94A3B8]" />
                    {latestMock.completedAt ? new Date(latestMock.completedAt).toLocaleDateString() : 'Recent'}
                  </span>
                  <span>•</span>
                  <span>Time: {Math.round((latestMock.totalTimeSeconds || 0) / 60)}m</span>
                </div>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
                  latestMock.qualified
                    ? 'bg-emerald-50 text-[#15803D] border border-emerald-200'
                    : 'bg-amber-50 text-[#D97706] border border-amber-200'
                }`}
              >
                {latestMock.qualified ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Qualified</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    <span>In Review</span>
                  </>
                )}
              </span>
            </div>

            {/* Score Numbers */}
            <div className="grid grid-cols-3 gap-2 py-2 border-y border-[#E8EBF0] text-center my-2">
              <div>
                <div className="text-[10px] uppercase font-bold text-[#64748B]">Session I</div>
                <div className="text-sm font-bold text-[#172033]">{latestMock.session1Score}/120</div>
                <div className="text-[10px] text-[#15803D]">Qualifying</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-[#64748B]">Session II</div>
                <div className="text-sm font-bold text-[#1749E8]">{latestMock.session2Score}/150</div>
                <div className="text-[10px] text-[#64748B]">Merit Rank</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-[#64748B]">Total Score</div>
                <div className="text-sm font-bold text-[#172033]">
                  {latestMock.totalScore}/{latestMock.totalMax || 270}
                </div>
                <div className="text-[10px] text-[#64748B] font-semibold">{latestMock.percentage}%</div>
              </div>
            </div>

            {/* Score Bar */}
            <div className="space-y-1 mt-2">
              <div className="flex justify-between text-[11px] text-[#64748B]">
                <span>Overall Benchmark</span>
                <span className="font-semibold text-[#172033]">{latestMock.percentage}% (Cutoff 70%)</span>
              </div>
              <div className="w-full bg-[#E8EBF0] h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    latestMock.percentage >= 70 ? 'bg-[#15803D]' : 'bg-[#1749E8]'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, latestMock.percentage))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Past Attempts Quick List if more than 1 */}
          {mocks.length > 1 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                Previous Mock Results
              </div>
              <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
                {mocks.slice(1, 3).map((m, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded-md bg-[#F8F9FB] border border-[#E8EBF0]"
                  >
                    <span className="text-[#172033] truncate pr-2">{m.examTitle}</span>
                    <span className="font-semibold text-[#172033] shrink-0">
                      {m.totalScore}/{m.totalMax} ({m.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer Action */}
      <div className="pt-3 border-t border-[#E8EBF0] flex items-center justify-between">
        <span className="text-[11px] text-[#64748B]">Next full mock recommended every 7 days</span>
        <button
          type="button"
          onClick={() => onNavigate('mock_exam')}
          className="text-xs font-bold text-[#1749E8] hover:underline"
        >
          {latestMock ? 'Retake or Practice' : 'Launch Mock'}
        </button>
      </div>
    </div>
  );
}

