import React from 'react';
import { Clock, BookOpen, CheckCircle2, Calendar } from 'lucide-react';

interface RevisionDailySummaryProps {
  dueTodayCount: number;
  totalTrackedCount: number;
  masteredCount: number;
  upcomingCount: number;
}

export function RevisionDailySummary({
  dueTodayCount,
  totalTrackedCount,
  masteredCount,
  upcomingCount
}: RevisionDailySummaryProps) {
  const cards = [
    {
      label: 'Questions due today',
      value: dueTodayCount,
      subtext: dueTodayCount > 0 ? 'Ready for memory consolidation' : 'All caught up for today',
      icon: <Clock className="w-4 h-4 text-[#D97706]" aria-hidden="true" />,
      colorClass: dueTodayCount > 0 ? 'text-[#D97706]' : 'text-[#15803D]',
      bgAccent: 'bg-amber-50/50'
    },
    {
      label: 'Total tracked questions',
      value: totalTrackedCount,
      subtext: 'Across all 4 SSC MTS sections',
      icon: <BookOpen className="w-4 h-4 text-[#1749E8]" aria-hidden="true" />,
      colorClass: 'text-[#172033]',
      bgAccent: 'bg-blue-50/50'
    },
    {
      label: 'Mastered questions',
      value: masteredCount,
      subtext: 'Interval > 6 days in memory',
      icon: <CheckCircle2 className="w-4 h-4 text-[#15803D]" aria-hidden="true" />,
      colorClass: 'text-[#15803D]',
      bgAccent: 'bg-emerald-50/50'
    },
    {
      label: 'Upcoming revision items',
      value: upcomingCount,
      subtext: 'Scheduled for future dates',
      icon: <Calendar className="w-4 h-4 text-[#64748B]" aria-hidden="true" />,
      colorClass: 'text-[#64748B]',
      bgAccent: 'bg-slate-50/50'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="bg-white border border-[#E8EBF0] rounded-xl p-4 shadow-sm hover:border-[#D0DEFF] transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#64748B]">{card.label}</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${card.bgAccent} border border-[#E8EBF0]`}>
              {card.icon}
            </div>
          </div>
          <div className={`text-2xl font-bold ${card.colorClass} tracking-tight`}>
            {card.value}
          </div>
          <p className="text-[11px] text-[#64748B] mt-1">{card.subtext}</p>
        </div>
      ))}
    </div>
  );
}

