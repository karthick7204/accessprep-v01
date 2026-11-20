import React, { useState, useEffect } from 'react';
import { useAccessibility } from '../context/AccessibilityContext';
import { AudioToolbar } from '../components/AudioToolbar';
import { ScreenNavigationDisclaimer } from '../components/ScreenNavigationDisclaimer';
import { Award, BookOpen, ArrowRight } from 'lucide-react';
import { updateBKT, getSkillLevel } from '../utils/bkt';

interface TopicMasteryItem {
  id: string;
  subject: string;
  topic: string;
  pMastery: number; // 0.0 to 1.0
  totalPracticed: number;
  lastPracticed: string;
  recommendedAction: string;
}

interface ApiMasteryRecord {
  topic: string;
  subject: string;
  totalQuestions: number;
  attemptsCount: number;
  correctCount: number;
  p_known: number;
  masteryPercentage: number;
  tier: string;
  lastUpdated: string | null;
}

function getRecommendedAction(tier: string): string {
  switch (tier) {
    case 'Novice':
      return 'Start with foundational practice questions for this topic.';
    case 'Developing':
      return 'Continue regular practice to build speed and accuracy.';
    case 'Proficient':
      return 'Maintain proficiency with weekly revision.';
    case 'Mastered':
      return 'Mastery maintained. Periodic revision recommended.';
    default:
      return 'Continue practicing to improve mastery.';
  }
}

function formatRelativeTime(lastUpdated: string | null): string {
  if (!lastUpdated) return 'Never practiced';
  const now = new Date();
  const updated = new Date(lastUpdated);
  const diffMs = now.getTime() - updated.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}

export const TopicMasteryScreen: React.FC = () => {
  const { navigateTo, user } = useAccessibility();
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [topics, setTopics] = useState<TopicMasteryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMastery = async () => {
      setLoading(true);
      const uid = user?.id || 'usr_candidate_01';
      try {
        const res = await fetch(`/api/mastery?userId=${uid}`);
        const data: ApiMasteryRecord[] = await res.json();
        const mapped: TopicMasteryItem[] = (Array.isArray(data) ? data : []).map((item, idx) => ({
          id: `top-${idx + 1}`,
          subject: item.subject,
          topic: item.topic,
          pMastery: item.p_known,
          totalPracticed: item.attemptsCount,
          lastPracticed: formatRelativeTime(item.lastUpdated),
          recommendedAction: getRecommendedAction(item.tier)
        }));
        setTopics(mapped);
      } catch {
        setTopics([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMastery();
  }, [user?.id]);

  const filteredTopics =
    selectedSubject === 'all' ? topics : topics.filter((t) => t.subject === selectedSubject);

  const simulateBKTDrill = async (id: string, isCorrect: boolean) => {
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const newProb = updateBKT(t.pMastery, isCorrect);
          return {
            ...t,
            pMastery: Number(newProb.toFixed(3)),
            totalPracticed: t.totalPracticed + 1,
            lastPracticed: 'Just now'
          };
        }
        return t;
      })
    );

    const topic = topics.find((t) => t.id === id);
    if (topic) {
      try {
        await fetch('/api/practice/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: topic.topic,
            subject: topic.subject,
            isCorrect
          })
        });
      } catch {
        // Ignore submit errors
      }
    }
  };

  const averageMastery =
    topics.length > 0 ? (topics.reduce((acc, t) => acc + t.pMastery, 0) / topics.length) * 100 : 0;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-[#1749E8] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#53627A]">Loading topic mastery data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#E8EBF0] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#1749E8] bg-[#EEF4FF] px-3 py-1 rounded-full border border-[#D0DEFF]">
            <Award className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Screen 12 of 17 · Knowledge &amp; Topic Mastery</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#172033]">
            Bayesian Knowledge Tracing (BKT) Syllabus Mastery
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B]">
            Latent skill mastery estimation <span className="font-mono font-semibold text-[#172033]">P(Lₜ)</span> accounting for student slip (<span className="font-mono">s = 0.10</span>), guess (<span className="font-mono">g = 0.25</span>), and transit (<span className="font-mono">T = 0.15</span>) parameters.
          </p>
        </div>

        <AudioToolbar
          textToRead={`Average syllabus topic mastery is ${averageMastery.toFixed(1)} percent across ${topics.length} tracked syllabus competencies.`}
          label="Mastery Status Audio"
        />
      </div>

      {/* Screen Navigation Disclaimer */}
      <ScreenNavigationDisclaimer
        screenId="TOPIC_MASTERY"
        screenTitle="Bayesian Topic Mastery & Weak Areas Analysis"
        description="Live estimation of latent knowledge state across 18 SSC MTS syllabus topics using Bayesian Knowledge Tracing."
        actions={[
          {
            label: 'Review Weakest Topic',
            opens: 'Identifies topics with lowest mastery probability and opens targeted practice.',
            voiceCommand: 'Say "Weak Areas" or "Topic Mastery"'
          },
          {
            label: 'Start Targeted Subject Practice',
            opens: 'Opens Voice Practice for the selected low-mastery subject.',
            shortcut: 'Alt + P',
            voiceCommand: 'Say "Start Practice"'
          },
          {
            label: 'Return to Dashboard',
            opens: 'Navigates back to candidate dashboard.',
            shortcut: 'Alt + D',
            voiceCommand: 'Say "Dashboard"'
          },
          {
            label: 'Stop Reading',
            opens: 'Immediately silences audio playback across all screens.',
            shortcut: 'Escape',
            voiceCommand: 'Say "Stop"'
          }
        ]}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E8EBF0] p-4 rounded-xl shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
            Mean Syllabus Mastery
          </div>
          <div className="text-3xl font-black text-[#1749E8] mt-1">{averageMastery.toFixed(1)}%</div>
          <div className="text-xs text-[#53627A] mt-1">Across {topics.length} core subtopics</div>
        </div>

        <div className="bg-white border border-[#E8EBF0] p-4 rounded-xl shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
            Mastered Topics
          </div>
          <div className="text-3xl font-black text-[#15803D] mt-1">
            {topics.filter((t) => t.pMastery >= 0.85).length} / {topics.length}
          </div>
          <div className="text-xs text-[#53627A] mt-1">
            <span className="font-mono font-semibold">P(Lₜ) ≥ 0.85</span> threshold
          </div>
        </div>

        <div className="bg-white border border-[#E8EBF0] p-4 rounded-xl shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
            Developing Topics
          </div>
          <div className="text-3xl font-black text-[#D97706] mt-1">
            {topics.filter((t) => t.pMastery < 0.7).length}
          </div>
          <div className="text-xs text-[#53627A] mt-1">Recommended for targeted drill</div>
        </div>

        <div className="bg-white border border-[#E8EBF0] p-4 rounded-xl shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
            Total Drill Questions
          </div>
          <div className="text-3xl font-black text-[#172033] mt-1">
            {topics.reduce((acc, t) => acc + t.totalPracticed, 0)}
          </div>
          <div className="text-xs text-[#53627A] mt-1">Recorded audit entries</div>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-white border border-[#E8EBF0] rounded-xl shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-[#E8EBF0] bg-[#F8F9FB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#172033] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#1749E8]" aria-hidden="true" />
            <span>Syllabus Topic Competency Registry</span>
          </h2>

          <div className="flex items-center gap-2">
            <label htmlFor="mastery-filter" className="text-xs font-bold text-[#53627A]">
              Subject:
            </label>
            <select
              id="mastery-filter"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-[#D9E1EF] text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#1749E8]"
            >
              <option value="all">All 4 Subjects</option>
              <option value="Numerical and Mathematical Ability">Numerical Ability</option>
              <option value="Reasoning Ability and Problem Solving">Reasoning Ability</option>
              <option value="General Awareness">General Awareness</option>
              <option value="English Language and Comprehension">English Language</option>
            </select>
          </div>
        </div>

        {topics.length === 0 ? (
          <div className="p-10 text-center text-[#64748B]">
            <Award className="w-10 h-10 mx-auto mb-3 opacity-40" aria-hidden="true" />
            <p className="text-sm font-semibold text-[#172033]">No mastery data yet.</p>
            <p className="text-xs mt-1">Start practicing questions to see your topic mastery.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <caption className="sr-only">Bayesian Knowledge Tracing Topic Mastery Registry</caption>
              <thead className="bg-[#F8F9FB] text-[#53627A] uppercase text-[11px] font-bold border-b border-[#E8EBF0]">
                <tr>
                  <th scope="col" className="p-3.5">Topic / Subject</th>
                  <th scope="col" className="p-3.5">Mastery Probability P(Lₜ)</th>
                  <th scope="col" className="p-3.5">Skill Level</th>
                  <th scope="col" className="p-3.5">Drills</th>
                  <th scope="col" className="p-3.5">Recommended Pedagogical Action</th>
                  <th scope="col" className="p-3.5 text-right">Interactive BKT Drill</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EBF0] font-medium">
                {filteredTopics.map((item) => {
                  const percent = Math.round(item.pMastery * 100);
                  const level = getSkillLevel(item.pMastery);
                  const isMaster = item.pMastery >= 0.85;
                  const isCompetent = item.pMastery >= 0.7 && item.pMastery < 0.85;

                  return (
                    <tr key={item.id} className="hover:bg-[#F8F9FB] transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-[#172033]">{item.topic}</div>
                        <div className="text-[11px] text-[#64748B]">{item.subject}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-bold text-[#172033] w-10">
                            {percent}%
                          </span>
                          <div className="w-24 bg-[#E8EBF0] h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isMaster
                                  ? 'bg-[#15803D]'
                                  : isCompetent
                                  ? 'bg-[#1749E8]'
                                  : 'bg-[#D97706]'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isMaster
                              ? 'bg-emerald-50 text-[#15803D] border-emerald-200'
                              : isCompetent
                              ? 'bg-[#EEF4FF] text-[#1749E8] border-[#D0DEFF]'
                              : 'bg-amber-50 text-[#B45309] border-amber-200'
                          }`}
                        >
                          {level}
                        </span>
                      </td>
                      <td className="p-3.5 text-[#53627A] font-mono">{item.totalPracticed}</td>
                      <td className="p-3.5 max-w-xs text-[#53627A]">{item.recommendedAction}</td>
                      <td className="p-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => simulateBKTDrill(item.id, true)}
                            title="Simulate correct attempt (+P)"
                            aria-label={`Drill correct response for ${item.topic}`}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-[#15803D] border border-emerald-200 hover:bg-emerald-100 focus:ring-2 focus:ring-emerald-600 transition-colors"
                          >
                            + Correct
                          </button>
                          <button
                            type="button"
                            onClick={() => simulateBKTDrill(item.id, false)}
                            title="Simulate incorrect attempt (-P)"
                            aria-label={`Drill incorrect response for ${item.topic}`}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-50 text-[#DC2626] border border-rose-200 hover:bg-rose-100 focus:ring-2 focus:ring-rose-600 transition-colors"
                          >
                            - Error
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                sessionStorage.setItem('practice_filter_subject', item.subject);
                                sessionStorage.setItem('practice_filter_topic', item.topic);
                              } catch {}
                              navigateTo('voice_practice');
                            }}
                            aria-label={`Launch voice practice for ${item.topic}`}
                            className="px-3 py-1 text-[11px] font-bold rounded-lg bg-[#1749E8] text-white hover:bg-[#123BB8] focus:ring-2 focus:ring-[#1749E8] inline-flex items-center gap-1 transition-colors"
                          >
                            <span>Practice</span>
                            <ArrowRight className="w-3 h-3" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
