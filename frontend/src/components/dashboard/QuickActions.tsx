import React from 'react';
import { Mic, Clock, Brain, Calendar, ArrowRight } from 'lucide-react';

interface QuickActionsProps {
  onNavigate: (screen: string) => void;
}

interface ActionCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  screenId: string;
  badge?: string;
}

export function QuickActions({ onNavigate }: QuickActionsProps) {
  const actions: ActionCard[] = [
    {
      id: 'voice_practice',
      title: 'Voice Practice',
      description: 'Hands-free question solving with real-time speech input and instant explanations.',
      icon: <Mic className="w-5 h-5 text-[#1749E8]" aria-hidden="true" />,
      screenId: 'voice_practice',
      badge: 'Interactive'
    },
    {
      id: 'mock_exam',
      title: 'Mock Examination',
      description: 'Full-length timed SSC MTS test simulation with Session-I and Session-II rules.',
      icon: <Clock className="w-5 h-5 text-[#6241C8]" aria-hidden="true" />,
      screenId: 'mock_exam',
      badge: 'Timed'
    },
    {
      id: 'ai_tutor',
      title: 'AI Tutor',
      description: 'Concept clarification and syllabus tutoring grounded in official SSC MTS content.',
      icon: <Brain className="w-5 h-5 text-[#15803D]" aria-hidden="true" />,
      screenId: 'ai_tutor',
      badge: 'Scribe'
    },
    {
      id: 'revision_planner',
      title: 'Revision Planner',
      description: 'Spaced repetition flashcards powered by the SuperMemo SM-2 memory algorithm.',
      icon: <Calendar className="w-5 h-5 text-[#D97706]" aria-hidden="true" />,
      screenId: 'revision_planner',
      badge: 'SM-2'
    }
  ];

  return (
    <section aria-labelledby="quick-actions-heading">
      <div className="flex items-center justify-between mb-3">
        <h2 id="quick-actions-heading" className="text-sm font-semibold text-[#172033]">
          Quick Actions
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((act) => (
          <div
            key={act.id}
            className="group bg-white border border-[#E8EBF0] hover:border-[#1749E8]/40 hover:shadow-xs rounded-xl p-5 flex flex-col justify-between transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-[#F8F9FB] border border-[#E8EBF0] flex items-center justify-center group-hover:bg-[#EEF4FF] transition-colors">
                  {act.icon}
                </div>
                {act.badge && (
                  <span className="text-[10px] font-semibold text-[#64748B] bg-[#F8F9FB] px-2 py-0.5 rounded border border-[#E8EBF0]">
                    {act.badge}
                  </span>
                )}
              </div>

              <h3 className="text-sm font-bold text-[#172033] mb-1 group-hover:text-[#1749E8] transition-colors">
                {act.title}
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed mb-4">
                {act.description}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate(act.screenId)}
              className="w-full inline-flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg bg-[#F8F9FB] hover:bg-[#1749E8] text-[#172033] hover:text-white border border-[#E8EBF0] hover:border-[#1749E8] transition-all focus:outline-none focus:ring-2 focus:ring-[#1749E8] focus:ring-offset-2"
              aria-label={`Open ${act.title}`}
            >
              <span>Launch</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

