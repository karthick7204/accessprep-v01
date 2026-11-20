import React from 'react';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { AccessibleProgressBar } from '../AccessibleProgressBar.tsx';
import { EmptyState } from '../EmptyState.tsx';
import { SubjectCardSkeleton } from '../LoadingSkeleton.tsx';

interface TopicMasteryItem {
  topic: string;
  subject: string;
  totalQuestions: number;
  attemptsCount: number;
  correctCount: number;
  p_known: number;
  masteryPercentage: number;
  tier: 'Novice' | 'Developing' | 'Proficient' | 'Mastered';
}

interface SubjectSummary {
  name: string;
  shortName: string;
  session: 'Session I' | 'Session II';
  subjectKey: string; // matches server data
  progressColor: string;
  topics: TopicMasteryItem[];
  avgMastery: number;
  accuracy: number;
  attempted: number;
  weakTopics: string[];
}

interface SubjectMasteryProps {
  masteryData: TopicMasteryItem[];
  loading: boolean;
  onNavigate: (screen: string) => void;
}

const SUBJECTS = [
  {
    name: 'Numerical and Mathematical Ability',
    shortName: 'Numerical Ability',
    session: 'Session I' as const,
    subjectKey: 'Numerical and Mathematical Ability',
    progressColor: 'bg-[#1749E8]',
  },
  {
    name: 'Reasoning Ability and Problem Solving',
    shortName: 'Reasoning',
    session: 'Session I' as const,
    subjectKey: 'Reasoning Ability and Problem Solving',
    progressColor: 'bg-[#6241C8]',
  },
  {
    name: 'English Language and Comprehension',
    shortName: 'English',
    session: 'Session II' as const,
    subjectKey: 'English Language and Comprehension',
    progressColor: 'bg-[#15803D]',
  },
  {
    name: 'General Awareness',
    shortName: 'General Awareness',
    session: 'Session II' as const,
    subjectKey: 'General Awareness',
    progressColor: 'bg-[#D97706]',
  },
];

function buildSubjectSummaries(masteryData: TopicMasteryItem[]): SubjectSummary[] {
  return SUBJECTS.map(subj => {
    const topics = masteryData.filter(t => t.subject === subj.subjectKey);
    const attempted = topics.reduce((sum, t) => sum + t.attemptsCount, 0);
    const correct = topics.reduce((sum, t) => sum + t.correctCount, 0);
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    const avgMastery = topics.length > 0
      ? Math.round(topics.reduce((sum, t) => sum + t.masteryPercentage, 0) / topics.length)
      : 25;
    const weakTopics = topics
      .filter(t => t.tier === 'Novice' || t.tier === 'Developing')
      .sort((a, b) => a.p_known - b.p_known)
      .slice(0, 2)
      .map(t => t.topic);

    return {
      ...subj,
      topics,
      avgMastery,
      accuracy,
      attempted,
      weakTopics,
    };
  });
}

function tierBadgeClass(mastery: number): string {
  if (mastery >= 85) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (mastery >= 65) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (mastery >= 40) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-700 border-red-200';
}

function tierLabel(mastery: number): string {
  if (mastery >= 85) return 'Mastered';
  if (mastery >= 65) return 'Proficient';
  if (mastery >= 40) return 'Developing';
  return 'Novice';
}

interface SubjectCardProps {
  subject: SubjectSummary;
  onExplore: () => void;
}

function SubjectCard({ subject, onExplore }: SubjectCardProps) {
  const badge = tierBadgeClass(subject.avgMastery);
  const tier = tierLabel(subject.avgMastery);
  const hasData = subject.attempted > 0;

  return (
    <article
      className="bg-white border border-[#E8EBF0] rounded-xl p-5 space-y-3 hover:border-[#1749E8]/30 transition-colors"
      aria-label={`${subject.shortName}: ${subject.avgMastery}% mastery, ${tier}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide">
              {subject.session}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-[#172033] leading-snug">
            {subject.shortName}
          </h3>
        </div>
        <span
          className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border ${badge}`}
          aria-label={`Mastery tier: ${tier}`}
        >
          {tier}
        </span>
      </div>

      {/* Progress bar */}
      <AccessibleProgressBar
        value={subject.avgMastery}
        label="Mastery"
        colorClass={subject.progressColor}
        srDescription={`${subject.shortName} mastery: ${subject.avgMastery}%`}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-[#F8F9FB] rounded-lg p-2 border border-[#E8EBF0]">
          <p className="text-[#64748B] mb-0.5">Accuracy</p>
          <p className="font-bold text-[#172033]">
            {hasData ? `${subject.accuracy}%` : '—'}
          </p>
        </div>
        <div className="bg-[#F8F9FB] rounded-lg p-2 border border-[#E8EBF0]">
          <p className="text-[#64748B] mb-0.5">Attempted</p>
          <p className="font-bold text-[#172033]">
            {hasData ? subject.attempted : '—'}
          </p>
        </div>
      </div>

      {/* Weak topics */}
      {subject.weakTopics.length > 0 && (
        <div className="pt-1">
          <div className="flex items-center gap-1 mb-1">
            <AlertTriangle className="w-3 h-3 text-[#D97706]" aria-hidden="true" />
            <span className="text-[10px] font-semibold text-[#D97706]">Needs attention</span>
          </div>
          <ul className="space-y-0.5">
            {subject.weakTopics.map(t => (
              <li key={t} className="text-[10px] text-[#64748B] truncate pl-4">
                • {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action */}
      <button
        type="button"
        onClick={onExplore}
        className="w-full text-left flex items-center justify-between text-xs font-semibold text-[#1749E8] hover:text-[#123BB8] transition-colors pt-1 focus:outline-none focus:underline"
        aria-label={`Open ${subject.shortName} subject explorer`}
      >
        <span>Explore topics</span>
        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </article>
  );
}

export function SubjectMastery({ masteryData, loading, onNavigate }: SubjectMasteryProps) {
  if (loading) {
    return (
      <section aria-label="Subject mastery loading" aria-busy="true">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-40 bg-[#E8EBF0] animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SubjectCardSkeleton key={i} />)}
        </div>
      </section>
    );
  }

  const summaries = buildSubjectSummaries(masteryData);
  const hasAnyData = masteryData.some(t => t.attemptsCount > 0);

  return (
    <section aria-labelledby="subject-mastery-heading">
      <div className="flex items-center justify-between mb-3">
        <h2 id="subject-mastery-heading" className="text-sm font-semibold text-[#172033]">
          Subject Mastery
        </h2>
        <button
          type="button"
          onClick={() => onNavigate('topic_mastery')}
          className="text-xs font-semibold text-[#1749E8] hover:text-[#123BB8] inline-flex items-center gap-1 focus:outline-none focus:underline"
          aria-label="View detailed topic mastery"
        >
          View all topics
          <ArrowRight className="w-3 h-3" aria-hidden="true" />
        </button>
      </div>

      {!hasAnyData && (
        <div className="mb-3 px-3 py-2 bg-[#F8F9FB] border border-[#E8EBF0] rounded-lg">
          <p className="text-xs text-[#64748B]">
            Mastery percentages below reflect your starting knowledge baseline (25%). 
            Complete practice sessions to update your actual mastery scores.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaries.map(subject => (
          <SubjectCard
            key={subject.subjectKey}
            subject={subject}
            onExplore={() => onNavigate('topics')}
          />
        ))}
      </div>
    </section>
  );
}

