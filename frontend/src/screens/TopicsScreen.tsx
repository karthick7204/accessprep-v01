import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Mic,
  CheckCircle2,
  BookOpen,
  Filter
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext.tsx';
import { AudioToolbar } from '../components/AudioToolbar.tsx';
import { ScreenNavigationDisclaimer } from '../components/ScreenNavigationDisclaimer.tsx';
import { Question } from '../db/database.ts';

export function TopicsScreen() {
  const { navigateTo, announce, registerVoiceHandler, speakText } = useAccessibility();

  // Syllabus state
  const [selectedSubject, setSelectedSubject] = useState<string>('Numerical and Mathematical Ability');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const subjects = [
    { name: 'Numerical and Mathematical Ability', code: 'NUM', session: 'Session-I', shortcut: '1', color: 'blue' },
    { name: 'Reasoning Ability and Problem Solving', code: 'REA', session: 'Session-I', shortcut: '2', color: 'indigo' },
    { name: 'General Awareness', code: 'GA', session: 'Session-II', shortcut: '3', color: 'amber' },
    { name: 'English Language and Comprehension', code: 'ENG', session: 'Session-II', shortcut: '4', color: 'emerald' }
  ];

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      subject: selectedSubject,
      limit: '100'
    });
    if (selectedDifficulty !== 'all') {
      params.append('difficulty', selectedDifficulty);
    }
    if (searchQuery.trim()) {
      params.append('search', searchQuery.trim());
    }

    fetch(`/api/questions?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setQuestions(data.questions || []);
      })
      .catch((e) => console.warn('Questions fetch error:', e))
      .finally(() => setLoading(false));
  }, [selectedSubject, selectedDifficulty, searchQuery]);

  // Aggregate questions by topic
  const topicsMap: Record<string, { topic: string; subtopics: Set<string>; questions: Question[] }> = {};
  questions.forEach((q) => {
    if (!topicsMap[q.topic]) {
      topicsMap[q.topic] = { topic: q.topic, subtopics: new Set(), questions: [] };
    }
    topicsMap[q.topic].questions.push(q);
    if (q.subtopic) topicsMap[q.topic].subtopics.add(q.subtopic);
  });

  const topicsList = Object.values(topicsMap);

  const handleStartPractice = useCallback((topicName?: string) => {
    const targetTopic = topicName || (topicsList[0]?.topic || '');
    try {
      sessionStorage.setItem('practice_filter_subject', selectedSubject);
      if (targetTopic) {
        sessionStorage.setItem('practice_filter_topic', targetTopic);
      }
    } catch {}
    announce(`Starting practice session for ${selectedSubject} - ${targetTopic || 'All Topics'}`, 'polite');
    navigateTo('voice_practice');
  }, [selectedSubject, topicsList, announce, navigateTo]);

  // Keyboard shortcuts for Explore Subjects screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleStartPractice();
        return;
      }

      if (!isInput) {
        const k = e.key.toLowerCase();
        if (k === '1') {
          e.preventDefault();
          setSelectedSubject('Numerical and Mathematical Ability');
          announce('Selected Numerical and Mathematical Ability', 'polite');
        } else if (k === '2') {
          e.preventDefault();
          setSelectedSubject('Reasoning Ability and Problem Solving');
          announce('Selected Reasoning Ability and Problem Solving', 'polite');
        } else if (k === '3') {
          e.preventDefault();
          setSelectedSubject('General Awareness');
          announce('Selected General Awareness', 'polite');
        } else if (k === '4') {
          e.preventDefault();
          setSelectedSubject('English Language and Comprehension');
          announce('Selected English Language and Comprehension', 'polite');
        } else if (k === 'p' || e.key === 'Enter') {
          e.preventDefault();
          handleStartPractice();
        } else if (k === 's' || e.key === '/') {
          e.preventDefault();
          searchInputRef.current?.focus();
        } else if (k === 'c') {
          e.preventDefault();
          setSearchQuery('');
          announce('Search filter cleared', 'polite');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStartPractice, announce]);

  // Voice commands for Explore Subjects screen
  useEffect(() => {
    const unregister = registerVoiceHandler((transcript: string) => {
      const clean = transcript.toLowerCase().trim();

      if (clean.includes('numerical') || clean.includes('math') || clean === 'select one') {
        setSelectedSubject('Numerical and Mathematical Ability');
        speakText('Switched to Numerical and Mathematical Ability. Showing syllabus topics.');
        return true;
      }
      if (clean.includes('reasoning') || clean === 'select two') {
        setSelectedSubject('Reasoning Ability and Problem Solving');
        speakText('Switched to Reasoning Ability and Problem Solving. Showing syllabus topics.');
        return true;
      }
      if (clean.includes('general awareness') || clean.includes('gk') || clean === 'select three') {
        setSelectedSubject('General Awareness');
        speakText('Switched to General Awareness. Showing syllabus topics.');
        return true;
      }
      if (clean.includes('english') || clean === 'select four') {
        setSelectedSubject('English Language and Comprehension');
        speakText('Switched to English Language and Comprehension. Showing syllabus topics.');
        return true;
      }
      if (clean.includes('start practice') || clean.includes('practice topic') || clean === 'practice') {
        handleStartPractice();
        return true;
      }
      if (clean.startsWith('search ')) {
        const query = clean.replace('search ', '').trim();
        setSearchQuery(query);
        speakText(`Searching topics for ${query}`);
        return true;
      }
      if (clean === 'clear search') {
        setSearchQuery('');
        speakText('Search cleared.');
        return true;
      }
      return false;
    });

    return () => unregister();
  }, [handleStartPractice, speakText, registerVoiceHandler]);

  const overviewText = `Subject and Topic Explorer for ${selectedSubject}. Showing ${topicsList.length} syllabus topics with ${questions.length} verified questions. Available shortcut keys: 1 for Math, 2 for Reasoning, 3 for General Awareness, 4 for English, P to practice, S to search.`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6" id="main-content">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-300">
        <div>
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
            Screen 5 of 16 · Curriculum Exploration
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Subject &amp; Topic Explorer
          </h1>
          <p className="text-sm text-slate-600">
            Browse the official SSC MTS syllabus and explore topics across all four subjects.
          </p>
        </div>

        <div className="shrink-0">
          <AudioToolbar
            textToRead={overviewText}
            label="Listen to overview"
          />
        </div>
      </div>

      {/* Screen Navigation Disclaimer */}
      <ScreenNavigationDisclaimer
        screenId="TOPICS"
        screenTitle="Explore Subjects Navigation &amp; Voice Commands"
        description="Browse SSC MTS syllabus domains. Select subjects, filter topics by difficulty or keyword, and launch hands-free voice practice."
        actions={[
          {
            label: 'Numerical & Mathematical Ability',
            opens: 'Displays 100 verified SSC MTS Math syllabus questions across arithmetic, algebra, and geometry.',
            shortcut: 'Press 1',
            voiceCommand: 'Say "Select Math" or "Numerical Ability"'
          },
          {
            label: 'Reasoning Ability & Problem Solving',
            opens: 'Displays 100 Reasoning questions covering analogies, coding-decoding, series, and logic.',
            shortcut: 'Press 2',
            voiceCommand: 'Say "Select Reasoning"'
          },
          {
            label: 'General Awareness',
            opens: 'Displays 100 questions covering Indian polity, history, geography, science, and current affairs.',
            shortcut: 'Press 3',
            voiceCommand: 'Say "Select General Awareness" or "GK"'
          },
          {
            label: 'English Language & Comprehension',
            opens: 'Displays 100 English questions testing grammar, vocabulary, idioms, and reading comprehension.',
            shortcut: 'Press 4',
            voiceCommand: 'Say "Select English"'
          },
          {
            label: 'Practice Selected Topic',
            opens: 'Launches Voice Practice session filtered to the chosen syllabus topic.',
            shortcut: 'Press P or Enter',
            voiceCommand: 'Say "Start Practice" or "Practice Topic"'
          },
          {
            label: 'Search Syllabus Topics',
            opens: 'Focuses the topic search bar to filter by keyword or formula.',
            shortcut: 'Press S or /',
            voiceCommand: 'Say "Search [query]"'
          }
        ]}
        tips={[
          'Press 1, 2, 3, or 4 on your keyboard at any time to instantly switch between subjects.',
          'Press P or Enter to start voice practice immediately for the first topic in the list.'
        ]}
      />

      {/* 2. Subject Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {subjects.map((sub) => {
          const isSelected = selectedSubject === sub.name;
          return (
            <button
              key={sub.name}
              type="button"
              onClick={() => {
                setSelectedSubject(sub.name);
                announce(`Switched to ${sub.name}`, 'polite');
              }}
              aria-pressed={isSelected}
              className={`p-4 text-left rounded-xl border-2 transition-all flex flex-col justify-between relative ${
                isSelected
                  ? 'border-blue-700 bg-blue-50/70 shadow-sm ring-2 ring-blue-600'
                  : 'border-slate-300 bg-white hover:border-slate-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {sub.session}
                </span>
                <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono font-bold text-slate-700">
                  {sub.shortcut}
                </kbd>
              </div>
              <h2 className="text-sm font-bold text-slate-900 mt-2 leading-snug">{sub.name}</h2>
              <div className="mt-3 flex items-center justify-between text-xs font-semibold text-blue-700">
                <span>100 Questions</span>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-700" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Search & Difficulty Filters */}
      <div className="p-4 bg-white border border-slate-300 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topics, formulas (Press S or /)"
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-700"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg"
              title="Clear search filter (Press C)"
            >
              Clear Search (C)
            </button>
          )}

          <label htmlFor="diff-filter" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            Difficulty:
          </label>
          <select
            id="diff-filter"
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:border-blue-700 focus:outline-hidden"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* 4. Topics List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Topics in {selectedSubject}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs font-normal text-slate-500">
              {questions.length} Verified Questions Total
            </span>
            <button
              type="button"
              onClick={() => handleStartPractice()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-2xs"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Practice All (P)</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading curriculum topics...</div>
        ) : topicsList.length === 0 ? (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-600 text-sm">
            No questions matched your search criteria. Press C to clear search.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topicsList.map((t, idx) => {
              const subtopicsArray = Array.from(t.subtopics);
              return (
                <div
                  key={t.topic}
                  className="p-5 bg-white border border-slate-300 rounded-xl shadow-2xs hover:border-blue-400 transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold text-slate-900">{t.topic}</h3>
                      <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-900 rounded shrink-0">
                        {t.questions.length} Qs
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1">
                      Subtopics: {subtopicsArray.slice(0, 3).join(', ')}
                      {subtopicsArray.length > 3 ? ` +${subtopicsArray.length - 3} more` : ''}
                    </p>

                    {/* Sample Question Preview */}
                    {t.questions[0] && (
                      <div className="mt-3 p-2.5 bg-slate-50 rounded border border-slate-200 text-xs text-slate-700">
                        <span className="font-semibold text-slate-900">Sample: </span>
                        {t.questions[0].question_text.slice(0, 90)}...
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      Provenance: {t.questions[0]?.source_name || 'SSC MTS Official'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStartPractice(t.topic)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors"
                      aria-label={`Practice ${t.topic}`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>Practice Topic {idx === 0 ? '(P)' : ''}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
