import React from 'react';
import {
  ClipboardCheck,
  Clock,
  Layers,
  Award,
  Calendar,
  ArrowRight,
  BarChart2,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { DiagnosticAttempt } from '../../db/database.ts';

interface PilotDemoCardProps {
  attempts: DiagnosticAttempt[];
  loading: boolean;
  onStartPilotDemo: () => void;
  onViewDiagnosticResults: (attemptId?: string) => void;
}

export const PilotDemoCard: React.FC<PilotDemoCardProps> = ({
  attempts,
  loading,
  onStartPilotDemo,
  onViewDiagnosticResults
}) => {
  const completedCount = attempts.length;
  const latestAttempt = attempts[0] || null;

  const formattedLastDate = latestAttempt?.completedAt
    ? new Date(latestAttempt.completedAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : null;

  return (
    <section
      aria-labelledby="pilot-demo-card-heading"
      className="bg-white border border-[#E8EBF0] rounded-xl p-5 sm:p-6 shadow-2xs"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left: Title, Description, Static Structure Badges */}
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#EEF4FF] text-[#1749E8] border border-[#D0DEFF]">
              <ClipboardCheck className="w-3.5 h-3.5" aria-hidden="true" />
              Structured Readiness Assessment
            </span>
            <span className="text-[11px] font-semibold text-[#64748B] bg-[#F8F9FB] px-2.5 py-0.5 rounded-md border border-[#E8EBF0]">
              Sections A, B, C &amp; D
            </span>
          </div>

          <div>
            <h2
              id="pilot-demo-card-heading"
              className="text-base sm:text-lg font-extrabold text-[#172033] tracking-tight"
            >
              Pilot Demo Diagnostic
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
              Evaluate your current SSC MTS preparation through a structured diagnostic examination.
            </p>
          </div>

          {/* Core Diagnostic Parameters + Candidate Live Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
            <div className="p-2.5 rounded-lg bg-[#F8F9FB] border border-[#E8EBF0]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                Total Questions
              </p>
              <p className="text-sm font-extrabold text-[#172033] mt-0.5">20 Questions</p>
              <p className="text-[10px] text-[#64748B]">5 per subject</p>
            </div>

            <div className="p-2.5 rounded-lg bg-[#F8F9FB] border border-[#E8EBF0]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                Duration
              </p>
              <p className="text-sm font-extrabold text-[#172033] mt-0.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#1749E8]" aria-hidden="true" />
                <span>25 Minutes</span>
              </p>
              <p className="text-[10px] text-[#64748B]">Timed diagnostic</p>
            </div>

            <div className="p-2.5 rounded-lg bg-[#F8F9FB] border border-[#E8EBF0]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                Subjects Covered
              </p>
              <p className="text-sm font-extrabold text-[#172033] mt-0.5 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-[#6241C8]" aria-hidden="true" />
                <span>4 Subjects</span>
              </p>
              <p className="text-[10px] text-[#64748B] truncate" title="Numerical, Reasoning, GA, English">
                Math, Reasoning, GA, Eng
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-[#F8F9FB] border border-[#E8EBF0]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                Latest Score
              </p>
              {loading ? (
                <p className="text-xs font-bold text-[#64748B] mt-1">Loading...</p>
              ) : latestAttempt ? (
                <>
                  <p className="text-sm font-extrabold text-[#1749E8] mt-0.5 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-[#1749E8]" aria-hidden="true" />
                    <span>
                      {latestAttempt.totalScore} / {latestAttempt.totalMax}
                    </span>
                  </p>
                  <p className="text-[10px] text-[#15803D] font-semibold">
                    {latestAttempt.accuracyPercentage}% Accuracy
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold text-[#64748B] mt-1">Not Attempted</p>
                  <p className="text-[10px] text-[#64748B]">No score recorded</p>
                </>
              )}
            </div>

            <div className="p-2.5 rounded-lg bg-[#F8F9FB] border border-[#E8EBF0]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                Completed Attempts
              </p>
              <p className="text-sm font-extrabold text-[#172033] mt-0.5 flex items-center gap-1">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    completedCount > 0 ? 'text-[#15803D]' : 'text-[#64748B]'
                  }`}
                  aria-hidden="true"
                />
                <span>{loading ? '—' : completedCount}</span>
              </p>
              <p className="text-[10px] text-[#64748B]">
                {completedCount === 1 ? '1 diagnostic logged' : `${completedCount} diagnostics logged`}
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-[#F8F9FB] border border-[#E8EBF0]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                Last Attempt Date
              </p>
              {loading ? (
                <p className="text-xs font-bold text-[#64748B] mt-1">Loading...</p>
              ) : formattedLastDate ? (
                <>
                  <p className="text-xs font-extrabold text-[#172033] mt-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#1749E8]" aria-hidden="true" />
                    <span>{formattedLastDate}</span>
                  </p>
                  <p className="text-[10px] text-[#64748B]">Verified submission</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold text-[#64748B] mt-1">No previous date</p>
                  <p className="text-[10px] text-[#64748B]">Take baseline test</p>
                </>
              )}
            </div>
          </div>

          {/* Empty state notice if candidate has never attempted the diagnostic */}
          {!loading && completedCount === 0 && (
            <div className="flex items-center gap-2 text-xs text-[#53627A] bg-[#F8F9FB] px-3 py-2 rounded-lg border border-[#E8EBF0]">
              <Sparkles className="w-4 h-4 text-[#1749E8] shrink-0" aria-hidden="true" />
              <span>
                You have not attempted the Pilot Demo Diagnostic yet. Complete this 20-question assessment to benchmark your subject-wise and topic-wise readiness.
              </span>
            </div>
          )}
        </div>

        {/* Right: Primary & Conditional Actions */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 lg:w-56">
          <button
            type="button"
            onClick={onStartPilotDemo}
            data-testid="dashboard-start-pilot-demo"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1749E8] hover:bg-[#123BB8] text-white text-xs font-bold rounded-lg shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-[#1749E8] focus:ring-offset-2"
          >
            <span>Start Pilot Demo</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>

          {completedCount > 0 && latestAttempt && (
            <button
              type="button"
              onClick={() => onViewDiagnosticResults(latestAttempt.id)}
              data-testid="dashboard-view-diagnostic-results"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-[#EEF4FF] text-[#1749E8] border border-[#D0DEFF] text-xs font-bold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#1749E8] focus:ring-offset-2"
            >
              <BarChart2 className="w-4 h-4" aria-hidden="true" />
              <span>View Diagnostic Results</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

