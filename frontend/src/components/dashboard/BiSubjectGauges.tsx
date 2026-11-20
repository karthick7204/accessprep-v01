import React from 'react';
import { Play, TrendingUp, Compass, Calculator, BookOpen, Globe, CheckCircle2 } from 'lucide-react';
import { SubjectAnalyticsBreakdown } from '../../db/repository.ts';

interface BiSubjectGaugesProps {
  subjects: SubjectAnalyticsBreakdown[];
  loading: boolean;
  onStartPractice: (subject: string) => void;
}

function getSubjectTheme(name: string) {
  if (name.includes('Numerical') || name.includes('Math')) {
    return {
      strokeColor: '#1749E8',
      textColor: 'text-[#1749E8]',
      bgTint: 'bg-blue-50/50',
      icon: <Calculator className="w-3.5 h-3.5 text-[#1749E8]" aria-hidden="true" />,
      shortLabel: 'Numerical Ability'
    };
  }
  if (name.includes('Reasoning')) {
    return {
      strokeColor: '#7C3AED',
      textColor: 'text-[#7C3AED]',
      bgTint: 'bg-purple-50/50',
      icon: <Compass className="w-3.5 h-3.5 text-[#7C3AED]" aria-hidden="true" />,
      shortLabel: 'Reasoning Ability'
    };
  }
  if (name.includes('English')) {
    return {
      strokeColor: '#15803D',
      textColor: 'text-[#15803D]',
      bgTint: 'bg-emerald-50/50',
      icon: <BookOpen className="w-3.5 h-3.5 text-[#15803D]" aria-hidden="true" />,
      shortLabel: 'English Language'
    };
  }
  return {
    strokeColor: '#D97706',
    textColor: 'text-[#D97706]',
    bgTint: 'bg-amber-50/50',
    icon: <Globe className="w-3.5 h-3.5 text-[#D97706]" aria-hidden="true" />,
    shortLabel: 'General Awareness'
  };
}

function CircularProgressGauge({
  percentage,
  strokeColor,
  label
}: {
  percentage: number;
  strokeColor: string;
  label: string;
}) {
  const size = 68;
  const strokeWidth = 6.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" role="meter" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} aria-label={`${label}: ${percentage}%`}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E8EBF0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xs font-black text-[#172033] leading-none">
          {percentage > 0 ? `${percentage}%` : '0%'}
        </span>
        <span className="text-[9px] text-[#64748B] font-medium mt-0.5">Acc</span>
      </div>
    </div>
  );
}

export function BiSubjectGauges({ subjects, loading, onStartPractice }: BiSubjectGaugesProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-[#E8EBF0] rounded-xl p-4 h-36 animate-pulse" />
        ))}
      </div>
    );
  }

  const defaultSubjects: SubjectAnalyticsBreakdown[] = [
    { subject: 'Numerical and Mathematical Ability', session: 'Session I', attempted: 0, correct: 0, accuracy: 0, avgTimeSeconds: 35, speed: 'Normal', trend: 'Neutral', status: 'Novice' },
    { subject: 'Reasoning Ability and Problem Solving', session: 'Session I', attempted: 0, correct: 0, accuracy: 0, avgTimeSeconds: 30, speed: 'Normal', trend: 'Neutral', status: 'Novice' },
    { subject: 'English Language and Comprehension', session: 'Session II', attempted: 0, correct: 0, accuracy: 0, avgTimeSeconds: 25, speed: 'Normal', trend: 'Neutral', status: 'Novice' },
    { subject: 'General Awareness', session: 'Session II', attempted: 0, correct: 0, accuracy: 0, avgTimeSeconds: 20, speed: 'Normal', trend: 'Neutral', status: 'Novice' }
  ];

  const list = subjects.length === 4 ? subjects : defaultSubjects;

  return (
    <section aria-labelledby="bi-subject-performance-heading" className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 id="bi-subject-performance-heading" className="text-sm font-bold text-[#172033] uppercase tracking-wider">
            Subject Performance Indicators
          </h2>
          <p className="text-xs text-[#64748B]">
            Sectional accuracy rates, attempts, and diagnostic drill launch
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {list.map((item) => {
          const theme = getSubjectTheme(item.subject);
          return (
            <div
              key={item.subject}
              className="bg-white border border-[#E8EBF0] rounded-xl p-4 shadow-xs hover:border-[#D0DEFF] transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header with icon and session tag */}
                <div className="flex items-center justify-between gap-1 mb-2.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className={`w-6 h-6 rounded-md ${theme.bgTint} border border-[#E8EBF0] flex items-center justify-center shrink-0`}>
                      {theme.icon}
                    </div>
                    <span className="text-xs font-bold text-[#172033] truncate leading-tight">
                      {theme.shortLabel}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-[#64748B] bg-[#F8F9FB] px-1.5 py-0.5 rounded border border-[#E8EBF0] shrink-0">
                    {item.session}
                  </span>
                </div>

                {/* Progress Ring and Metrics side-by-side */}
                <div className="flex items-center gap-3.5 my-2">
                  <CircularProgressGauge
                    percentage={item.accuracy}
                    strokeColor={theme.strokeColor}
                    label={item.subject}
                  />

                  <div className="space-y-1 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#64748B] block">Attempts</span>
                      <span className="font-bold text-[#172033]">
                        {item.attempted} <span className="font-normal text-[11px] text-[#64748B]">({item.correct} correct)</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#64748B] block">Speed</span>
                      <span className="font-medium text-[#172033]">
                        {item.avgTimeSeconds > 0 ? `${item.avgTimeSeconds}s / q` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-[#E8EBF0] mt-1 flex items-center justify-between">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  item.accuracy >= 75 ? 'bg-emerald-50 text-[#15803D] border border-emerald-200' :
                  item.accuracy >= 50 ? 'bg-amber-50 text-[#D97706] border border-amber-200' :
                  'bg-slate-50 text-[#64748B] border border-slate-200'
                }`}>
                  {item.accuracy >= 75 ? 'Strong' : item.attempted > 0 ? 'Needs Practice' : 'Untested'}
                </span>

                <button
                  type="button"
                  onClick={() => onStartPractice(item.subject)}
                  className="text-xs font-semibold text-[#1749E8] hover:text-[#123BB8] inline-flex items-center gap-1 focus:outline-none focus:underline"
                  aria-label={`Practice ${theme.shortLabel}`}
                >
                  <Play className="w-3 h-3 fill-current" aria-hidden="true" />
                  <span>Practice</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

