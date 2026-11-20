import React, { useMemo } from 'react';
import { useAccessibility } from '../../context/AccessibilityContext.tsx';
import { AudioToolbar } from '../AudioToolbar.tsx';

interface WelcomeSectionProps {
  readinessScore: number;
  isNewUser: boolean;
  dashboardText: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getPreparationStatus(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Strong preparation', color: 'text-[#15803D]' };
  if (score >= 60) return { label: 'Good progress', color: 'text-[#1749E8]' };
  if (score >= 40) return { label: 'Building foundations', color: 'text-[#D97706]' };
  return { label: 'Just getting started', color: 'text-[#64748B]' };
}

export function WelcomeSection({ readinessScore, isNewUser, dashboardText }: WelcomeSectionProps) {
  const { user } = useAccessibility();

  const greeting = useMemo(() => getGreeting(), []);
  const firstName = user?.name?.split(' ')[0] || 'Candidate';
  const status = getPreparationStatus(readinessScore);

  return (
    <section
      aria-labelledby="welcome-heading"
      className="bg-white border border-[#E8EBF0] rounded-xl px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="space-y-1 min-w-0">
        <h1
          id="welcome-heading"
          className="text-xl font-bold text-[#172033] leading-snug"
        >
          {greeting}, {firstName}!
        </h1>
        <p className="text-sm text-[#64748B]">
          {isNewUser
            ? 'Welcome to ACCESSPREP-X. Start with a diagnostic practice session to personalise your learning plan.'
            : 'Welcome back! Here\'s an overview of your preparation journey.'}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1749E8] inline-block" aria-hidden="true" />
            SSC MTS 2026
          </span>
          <span className="text-[#E8EBF0]" aria-hidden="true">·</span>
          <span className={`text-xs font-semibold ${status.color}`} aria-label={`Preparation status: ${status.label}`}>
            {status.label}
          </span>
          {user?.examRegion && (
            <>
              <span className="text-[#E8EBF0]" aria-hidden="true">·</span>
              <span className="text-xs text-[#64748B]">{user.examRegion}</span>
            </>
          )}
        </div>
      </div>

      <div className="shrink-0">
        <AudioToolbar
          textToRead={dashboardText}
          label="Read dashboard summary aloud"
        />
      </div>
    </section>
  );
}

