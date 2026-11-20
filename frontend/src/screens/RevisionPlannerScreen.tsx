import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAccessibility } from '../context/AccessibilityContext';
import { calculateSM2, getNextReviewDate } from '../utils/sm2';
import { RevisionHeader } from '../components/revision/RevisionHeader';
import { RevisionDailySummary } from '../components/revision/RevisionDailySummary';
import { DailyRevisionBanner } from '../components/revision/DailyRevisionBanner';
import {
  SubjectRevisionBreakdown,
  SubjectRevisionStats
} from '../components/revision/SubjectRevisionBreakdown';
import {
  UpcomingRevisionTable,
  UpcomingItem
} from '../components/revision/UpcomingRevisionTable';
import {
  ActiveRevisionSession,
  ActiveSessionCard
} from '../components/revision/ActiveRevisionSession';
import {
  SessionCompletionSummary,
  SessionStats
} from '../components/revision/SessionCompletionSummary';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ScreenNavigationDisclaimer } from '../components/ScreenNavigationDisclaimer';
import { RotateCcw, X, Play, AlertCircle } from 'lucide-react';
import {
  formatFlashcardQuestionPrompt,
  formatFlashcardAnswerPrompt
} from '../utils/repeatQuestionHelper';
import { parseAnswer } from '../utils/answerParser';
import { parseSubjectSelectionIntent } from '../voice/commandParser';

export interface RevisionCard {
  id: string;
  questionId: string;
  subject: string;
  topic: string;
  questionText: string;
  correctAnswer: string;
  explanation: string;
  nextReviewDate: string;
  intervalDays: number;
  repetition: number;
  easeFactor: number;
  status: 'due' | 'scheduled' | 'mastered' | 'upcoming';
  isDue: boolean;
}

const SSC_MTS_SUBJECTS = [
  'Numerical and Mathematical Ability',
  'Reasoning Ability and Problem Solving',
  'English Language and Comprehension',
  'General Awareness'
] as const;

const SESSION_STORAGE_KEY = 'accessprep_revision_session_state';

export const RevisionPlannerScreen: React.FC = () => {
  const {
    speakText,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    slowDownSpeech,
    user,
    isBlindMode,
    isVisionAssistantActive,
    playBeacon,
    startVoiceListening,
    registerVoiceHandler,
    announce,
    navigateTo
  } = useAccessibility();

  // Screen View Mode: 'overview' | 'session' | 'summary'
  const [viewMode, setViewMode] = useState<'overview' | 'session' | 'summary'>('overview');

  // Master card queue from backend
  const [cards, setCards] = useState<RevisionCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Session State
  const [sessionCards, setSessionCards] = useState<RevisionCard[]>([]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');

  // Interrupted Session Recovery
  const [savedSessionPrompt, setSavedSessionPrompt] = useState<{
    index: number;
    total: number;
    subject?: string;
  } | null>(null);

  // Weak Topic Recommendation from actual database records
  const [weakestRecommendation, setWeakestRecommendation] = useState<{
    subject: string;
    topic: string;
    accuracy: number;
  } | null>(null);
  const pendingSubjectRef = useRef<string | null>(null);
  const hasPromptedRef = useRef<boolean>(false);

  // Session Statistics for Completion Summary
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    reviewedCount: 0,
    easyCount: 0,
    goodCount: 0,
    hardCount: 0,
    againCount: 0,
    flaggedTopics: [],
    nextScheduledDate: null
  });

  const [difficultCards, setDifficultCards] = useState<RevisionCard[]>([]);

  // Refs to avoid stale closures in voice / keyboard callbacks
  const showAnswerRef = useRef<boolean>(showAnswer);
  showAnswerRef.current = showAnswer;

  const activeCardIndexRef = useRef<number>(activeCardIndex);
  activeCardIndexRef.current = activeCardIndex;

  const sessionCardsRef = useRef<RevisionCard[]>(sessionCards);
  sessionCardsRef.current = sessionCards;

  const isPausedRef = useRef<boolean>(isPaused);
  isPausedRef.current = isPaused;

  const viewModeRef = useRef<'overview' | 'session' | 'summary'>(viewMode);
  viewModeRef.current = viewMode;

  const cardsRef = useRef<RevisionCard[]>(cards);
  cardsRef.current = cards;

  // ---------------------------------------------------------------------------
  // Data Fetching: Backend Integration
  // ---------------------------------------------------------------------------

  const fetchRevisionQueue = useCallback(async () => {
    setLoading(true);
    const uid = user?.id || 'usr_candidate_01';
    try {
      const res = await fetch(`/api/revision/queue?userId=${uid}`);
      const data = await res.json();
      const rawCards = data.cards || [];
      const now = new Date();

      const normalized: RevisionCard[] = rawCards.map((c: any) => {
        const nextDate = new Date(c.nextReviewDate);
        const isDue = nextDate <= now;
        return {
          id: c.id,
          questionId: c.questionId,
          subject: c.subject || 'General Awareness',
          topic: c.topic || 'General',
          questionText: c.questionText || '',
          correctAnswer: c.correctAnswer || '',
          explanation: c.explanation || '',
          nextReviewDate: c.nextReviewDate,
          intervalDays: Number(c.intervalDays) || 1,
          repetition: Number(c.repetition) || 0,
          easeFactor: Number(c.easeFactor) || 2.5,
          status: (c.intervalDays >= 21 ? 'mastered' : isDue ? 'due' : 'scheduled') as any,
          isDue
        };
      });

      setCards(normalized);
    } catch {
      // Offline fallback: verified sample SSC MTS questions
      const now = new Date();
      setCards([
        {
          id: 'sm2-1',
          questionId: 'MTS-NA-001',
          subject: 'Numerical and Mathematical Ability',
          topic: 'LCM and HCF',
          questionText:
            'Find the greatest number that divides 43, 91 and 183 so as to leave the same remainder in each case.',
          correctAnswer: '4',
          explanation:
            'Required number = HCF of |91-43|, |183-91|, |183-43| = HCF of (48, 92, 140) = 4.',
          nextReviewDate: now.toISOString(),
          intervalDays: 1,
          repetition: 0,
          easeFactor: 2.5,
          status: 'due',
          isDue: true
        },
        {
          id: 'sm2-2',
          questionId: 'MTS-RA-010',
          subject: 'Reasoning Ability and Problem Solving',
          topic: 'Syllogism',
          questionText:
            'Statements: All cups are books. All books are shirts.\nConclusions: I. Some shirts are cups. II. All cups are shirts.',
          correctAnswer: 'Both I and II follow',
          explanation:
            'Universal affirmative propositions chain: Cups ⊆ Books ⊆ Shirts. Hence both conclusions validly follow.',
          nextReviewDate: now.toISOString(),
          intervalDays: 1,
          repetition: 1,
          easeFactor: 2.36,
          status: 'due',
          isDue: true
        },
        {
          id: 'sm2-3',
          questionId: 'MTS-GA-005',
          subject: 'General Awareness',
          topic: 'Indian Polity & Constitution',
          questionText:
            'Which Article of the Indian Constitution provides for Right to Equality before Law?',
          correctAnswer: 'Article 14',
          explanation:
            'Article 14 guarantees equality before law and equal protection of the laws within the territory of India.',
          nextReviewDate: new Date(Date.now() + 86400000 * 3).toISOString(),
          intervalDays: 3,
          repetition: 2,
          easeFactor: 2.5,
          status: 'scheduled',
          isDue: false
        },
        {
          id: 'sm2-4',
          questionId: 'MTS-EN-020',
          subject: 'English Language and Comprehension',
          topic: 'Idioms and Phrases',
          questionText:
            'What is the meaning of the idiom "To turn over a new leaf"?',
          correctAnswer: "To change one's behavior for the better",
          explanation:
            'To turn over a new leaf means to begin again and start behaving in a better and more responsible way.',
          nextReviewDate: new Date(Date.now() + 86400000 * 6).toISOString(),
          intervalDays: 6,
          repetition: 3,
          easeFactor: 2.6,
          status: 'mastered',
          isDue: false
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchRevisionQueue();
  }, [fetchRevisionQueue]);

  // Fetch weak topic recommendations from actual database records
  useEffect(() => {
    const fetchWeakTopics = async () => {
      const uid = user?.id || 'usr_candidate_01';
      try {
        const [masteryRes, diagRes] = await Promise.all([
          fetch(`/api/mastery?userId=${uid}`).then((r) => r.json()).catch(() => []),
          fetch(`/api/diagnostic/attempts?userId=${uid}`).then((r) => r.json()).catch(() => ({ attempts: [] }))
        ]);

        let lowestSubject = 'Numerical and Mathematical Ability';
        let lowestTopic = 'LCM and HCF';
        let lowestScore = 100;

        if (Array.isArray(masteryRes) && masteryRes.length > 0) {
          const sorted = [...masteryRes].sort((a: any, b: any) => (a.masteryPercentage || 0) - (b.masteryPercentage || 0));
          if (sorted[0]) {
            lowestSubject = sorted[0].subject || lowestSubject;
            lowestTopic = sorted[0].topic || lowestTopic;
            lowestScore = sorted[0].masteryPercentage ?? 35;
          }
        } else if (diagRes?.attempts && diagRes.attempts.length > 0) {
          const latest = diagRes.attempts[0];
          if (latest?.topicBreakdown && latest.topicBreakdown.length > 0) {
            const sortedTopics = [...latest.topicBreakdown].sort((a: any, b: any) => (a.accuracyPercentage || 0) - (b.accuracyPercentage || 0));
            lowestTopic = sortedTopics[0].topic;
            lowestSubject = sortedTopics[0].subject;
            lowestScore = sortedTopics[0].accuracyPercentage;
          }
        }

        setWeakestRecommendation({
          subject: lowestSubject,
          topic: lowestTopic,
          accuracy: Math.round(lowestScore)
        });
      } catch {}
    };
    fetchWeakTopics();
  }, [user?.id]);

  // Spoken prompt on screen open when assistant is active or blind mode
  useEffect(() => {
    if (!loading && viewMode === 'overview' && !hasPromptedRef.current && (isVisionAssistantActive || isBlindMode)) {
      hasPromptedRef.current = true;
      speakText(
        'Which subject would you like to concentrate on for revision? You can say Numerical Ability, Reasoning, General Awareness, or English, or ask for a recommendation.'
      );
    }
  }, [loading, viewMode, isVisionAssistantActive, isBlindMode, speakText]);

  // Check for interrupted session on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.cards && parsed.cards.length > 0 && parsed.index < parsed.cards.length) {
          setSavedSessionPrompt({
            index: parsed.index,
            total: parsed.cards.length,
            subject: parsed.subjectFilter
          });
        }
      }
    } catch {}
  }, []);

  // ---------------------------------------------------------------------------
  // Derived Statistics (Pure Backend Values)
  // ---------------------------------------------------------------------------

  const now = new Date();

  const dueCards = useMemo(() => {
    return cards.filter((c) => c.isDue || new Date(c.nextReviewDate) <= now);
  }, [cards]);

  const upcomingCards = useMemo(() => {
    return cards.filter((c) => !c.isDue && new Date(c.nextReviewDate) > now);
  }, [cards]);

  const masteredCards = useMemo(() => {
    return cards.filter((c) => c.status === 'mastered' || c.intervalDays >= 21);
  }, [cards]);

  // Subject breakdown stats
  const subjectStats: SubjectRevisionStats[] = useMemo(() => {
    return SSC_MTS_SUBJECTS.map((subject) => {
      const subjectCards = cards.filter((c) => c.subject === subject);
      const subjectDue = subjectCards.filter(
        (c) => c.isDue || new Date(c.nextReviewDate) <= now
      );
      const subjectMastered = subjectCards.filter(
        (c) => c.status === 'mastered' || c.intervalDays >= 21
      );

      const futureDates = subjectCards
        .filter((c) => new Date(c.nextReviewDate) > now)
        .map((c) => new Date(c.nextReviewDate).getTime())
        .sort((a, b) => a - b);

      const nextDate = futureDates.length > 0 ? new Date(futureDates[0]).toISOString() : null;

      const shortLabel = subject
        .replace(' and Mathematical Ability', '')
        .replace(' and Problem Solving', '')
        .replace(' and Comprehension', '');

      return {
        subject,
        shortLabel,
        dueCount: subjectDue.length,
        completedCount: subjectMastered.length,
        totalCount: subjectCards.length,
        nextDate
      };
    });
  }, [cards]);

  // ---------------------------------------------------------------------------
  // Session Controls: Start, Pause, Resume, Exit, Recovery
  // ---------------------------------------------------------------------------

  const startSession = useCallback(
    (customCards?: RevisionCard[], filterSubject?: string) => {
      const targetQueue =
        customCards && customCards.length > 0
          ? customCards
          : dueCards.length > 0
          ? dueCards
          : cards.length > 0
          ? cards
          : [];

      if (targetQueue.length === 0) {
        announce('No revision cards available to practice.', 'polite');
        return;
      }

      setSessionCards(targetQueue);
      setActiveCardIndex(0);
      setShowAnswer(false);
      setIsPaused(false);
      setViewMode('session');
      setSavedSessionPrompt(null);
      setDifficultCards([]);

      setSessionStats({
        reviewedCount: 0,
        easyCount: 0,
        goodCount: 0,
        hardCount: 0,
        againCount: 0,
        flaggedTopics: [],
        nextScheduledDate: null
      });

      // Save initial session state to sessionStorage
      try {
        sessionStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({
            cards: targetQueue,
            index: 0,
            subjectFilter: filterSubject || 'all',
            stats: {
              reviewedCount: 0,
              easyCount: 0,
              goodCount: 0,
              hardCount: 0,
              againCount: 0,
              flaggedTopics: []
            }
          })
        );
      } catch {}

      const subjectNote = filterSubject ? ` for ${filterSubject}` : '';
      const startAnnouncement = `Starting revision session${subjectNote} with ${targetQueue.length} flashcards.`;
      announce(startAnnouncement, 'assertive');

      if (isBlindMode) {
        const firstCard = targetQueue[0];
        const spoken = `${startAnnouncement} Question 1: ${firstCard.questionText}. Say 'Reveal answer' when you are ready.`;
        speakText(spoken, () => {
          playBeacon('listening');
          startVoiceListening();
        });
      }
    },
    [dueCards, cards, announce, isBlindMode, speakText, playBeacon, startVoiceListening]
  );

  const resumeInterruptedSession = useCallback(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.cards && parsed.cards.length > 0) {
          setSessionCards(parsed.cards);
          setActiveCardIndex(parsed.index || 0);
          setShowAnswer(false);
          setIsPaused(false);
          setViewMode('session');
          setSavedSessionPrompt(null);
          if (parsed.stats) {
            setSessionStats((prev) => ({ ...prev, ...parsed.stats }));
          }
          announce(`Restored revision session at question ${parsed.index + 1}.`, 'polite');
          return;
        }
      }
    } catch {}
    // If restore fails, start fresh
    startSession();
  }, [startSession, announce]);

  const dismissInterruptedSession = useCallback(() => {
    setSavedSessionPrompt(null);
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {}
  }, []);

  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      if (next) {
        stopSpeaking();
        announce('Revision session paused.', 'polite');
      } else {
        announce('Revision session resumed.', 'polite');
        const card = sessionCardsRef.current[activeCardIndexRef.current];
        if (card && isBlindMode) {
          speakText(`Resuming. Question: ${card.questionText}. Say 'Reveal answer' to check.`);
        }
      }
      return next;
    });
  }, [stopSpeaking, announce, isBlindMode, speakText]);

  const handleExitSession = useCallback(() => {
    stopSpeaking();
    setViewMode('overview');
    announce('Returned to revision overview.', 'polite');
    // Session state remains in sessionStorage so candidate can resume later if needed
  }, [stopSpeaking, announce]);

  // ---------------------------------------------------------------------------
  // Flashcard Interaction: Reveal, Read, & Recall Rating
  // ---------------------------------------------------------------------------

  const activeCard = sessionCards[activeCardIndex] || null;

  const handleRevealAnswer = useCallback(() => {
    if (!activeCard || isPausedRef.current) return;
    setShowAnswer(true);
    announce(`Answer revealed: ${activeCard.correctAnswer}`, 'polite');

    if (isBlindMode) {
      const feedback = `The correct answer is: ${activeCard.correctAnswer}. ${activeCard.explanation}. How well did you recall this? Say 'Again', 'Hard', 'Good', or 'Easy'.`;
      speakText(feedback, () => {
        playBeacon('listening');
        startVoiceListening();
      });
    }
  }, [activeCard, announce, isBlindMode, speakText, playBeacon, startVoiceListening]);

  const handleReadQuestion = useCallback(() => {
    if (!activeCard) return;
    const prompt = formatFlashcardQuestionPrompt(activeCard, activeCardIndex, sessionCards.length);
    speakText(`${prompt} Say 'Reveal answer' when you are ready.`);
  }, [activeCard, activeCardIndex, sessionCards.length, speakText]);

  const handleReadExplanation = useCallback(() => {
    if (!activeCard) return;
    const prompt = formatFlashcardAnswerPrompt(activeCard);
    speakText(prompt);
  }, [activeCard, speakText]);

  const handleRateCard = useCallback(
    async (quality: number) => {
      const curIdx = activeCardIndexRef.current;
      const queue = sessionCardsRef.current;
      const current = queue[curIdx];
      if (!current || isPausedRef.current) return;

      // 1. Calculate updated SM-2 parameters
      const sm2 = calculateSM2(
        {
          repetitions: current.repetition,
          intervalDays: current.intervalDays,
          easinessFactor: current.easeFactor
        },
        quality
      );

      const nextDate = getNextReviewDate(sm2.intervalDays);

      // 2. Persist rating to backend asynchronously
      fetch('/api/revision/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || 'usr_candidate_01',
          questionId: current.questionId,
          quality
        })
      }).catch((err) => console.warn('SM-2 review sync error:', err));

      // 3. Update local cards state
      setCards((prev) =>
        prev.map((c) => {
          if (c.id === current.id) {
            return {
              ...c,
              repetition: sm2.repetitions,
              intervalDays: sm2.intervalDays,
              easeFactor: sm2.easinessFactor,
              nextReviewDate: nextDate,
              status: sm2.intervalDays >= 21 ? 'mastered' : 'scheduled',
              isDue: false
            };
          }
          return c;
        })
      );

      // 4. Update session statistics
      setSessionStats((prev) => {
        const isDifficult = quality <= 3;
        let flagged = [...prev.flaggedTopics];
        if (isDifficult) {
          const existing = flagged.find((t) => t.topic === current.topic);
          if (existing) {
            existing.count += 1;
          } else {
            flagged.push({ topic: current.topic, subject: current.subject, count: 1 });
          }
        }

        const earliestDate =
          !prev.nextScheduledDate || new Date(nextDate) < new Date(prev.nextScheduledDate)
            ? nextDate
            : prev.nextScheduledDate;

        return {
          reviewedCount: prev.reviewedCount + 1,
          easyCount: prev.easyCount + (quality === 5 ? 1 : 0),
          goodCount: prev.goodCount + (quality === 4 ? 1 : 0),
          hardCount: prev.hardCount + (quality === 3 ? 1 : 0),
          againCount: prev.againCount + (quality === 1 ? 1 : 0),
          flaggedTopics: flagged,
          nextScheduledDate: earliestDate
        };
      });

      if (quality <= 3) {
        setDifficultCards((prev) => [...prev, current]);
      }

      playBeacon('success');

      const nextIdx = curIdx + 1;

      // Update sessionStorage progress
      try {
        sessionStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({
            cards: queue,
            index: nextIdx,
            stats: {
              reviewedCount: curIdx + 1
            }
          })
        );
      } catch {}

      // 5. Advance or Complete
      if (nextIdx < queue.length) {
        setActiveCardIndex(nextIdx);
        setShowAnswer(false);

        const ratingLabels: Record<number, string> = {
          1: 'Again recorded',
          3: 'Hard recorded',
          4: 'Good recorded',
          5: 'Easy recorded'
        };
        announce(`${ratingLabels[quality] || 'Rating saved'}. Next card in ${sm2.intervalDays} day${sm2.intervalDays === 1 ? '' : 's'}.`, 'polite');

        if (isBlindMode) {
          const nextCard = queue[nextIdx];
          const spoken = `Recorded. Next review in ${sm2.intervalDays} day${sm2.intervalDays === 1 ? '' : 's'}. Question ${nextIdx + 1}: ${nextCard.questionText}. Say 'Reveal answer' when ready.`;
          speakText(spoken, () => {
            playBeacon('listening');
            startVoiceListening();
          });
        }
      } else {
        // Session Finished
        try {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        } catch {}

        setViewMode('summary');
        announce('Revision session complete. Reviewing your performance summary.', 'assertive');

        if (isBlindMode) {
          speakText(
            `Excellent work! You have completed all ${queue.length} revision flashcards in this session. Returning to summary.`
          );
        }
      }
    },
    [user?.id, playBeacon, announce, isBlindMode, speakText, startVoiceListening]
  );

  const handleNextCard = useCallback(() => {
    if (activeCardIndex < sessionCards.length - 1) {
      setActiveCardIndex((prev) => prev + 1);
      setShowAnswer(false);
    }
  }, [activeCardIndex, sessionCards.length]);

  const handlePrevCard = useCallback(() => {
    if (activeCardIndex > 0) {
      setActiveCardIndex((prev) => prev - 1);
      setShowAnswer(false);
    }
  }, [activeCardIndex]);

  // ---------------------------------------------------------------------------
  // Keyboard Navigation: WCAG 2.2 AA Single-Key and Standard Operation
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (viewModeRef.current === 'session') {
        if (e.code === 'Space') {
          e.preventDefault();
          if (!showAnswerRef.current) {
            handleRevealAnswer();
          }
        } else if (e.key === '1') {
          e.preventDefault();
          if (showAnswerRef.current) handleRateCard(1);
        } else if (e.key === '2') {
          e.preventDefault();
          if (showAnswerRef.current) handleRateCard(3);
        } else if (e.key === '3') {
          e.preventDefault();
          if (showAnswerRef.current) handleRateCard(4);
        } else if (e.key === '4') {
          e.preventDefault();
          if (showAnswerRef.current) handleRateCard(5);
        } else if (e.key.toLowerCase() === 'p') {
          e.preventDefault();
          handleTogglePause();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleExitSession();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRevealAnswer, handleRateCard, handleTogglePause, handleExitSession]);

  // ---------------------------------------------------------------------------
  // Context-Aware Voice Command Handler
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const unregister = registerVoiceHandler((transcript: string) => {
      const clean = transcript.toLowerCase().trim();

      // --- IN ACTIVE SESSION ---
      if (viewModeRef.current === 'session') {
        const parsedCmd = parseAnswer(clean);

        // 1. Reveal Answer
        if (
          clean === 'reveal answer' ||
          clean === 'show answer' ||
          clean === 'reveal' ||
          clean === 'flip' ||
          clean === 'flip card' ||
          clean === 'check answer'
        ) {
          handleRevealAnswer();
          return true;
        }

        // 2. Read / Repeat Question
        if (
          parsedCmd === 'repeat' ||
          clean.includes('read question') ||
          clean.includes('repeat question') ||
          clean.includes('repeat the question') ||
          clean.includes('read question again') ||
          clean.includes('read prompt') ||
          clean === 'repeat'
        ) {
          handleReadQuestion();
          return true;
        }

        // 3. Repeat Options (Inform that flashcard has no A-D options, repeat prompt instead)
        if (parsedCmd === 'repeat_options' || clean.includes('repeat options') || clean.includes('read options')) {
          handleReadQuestion();
          return true;
        }

        // 4. Read Explanation / Answer
        if (
          clean.includes('read explanation') ||
          clean.includes('repeat explanation') ||
          clean.includes('read answer') ||
          clean.includes('repeat answer') ||
          clean.includes('explain')
        ) {
          handleReadExplanation();
          return true;
        }

        // 5. Playback Controls (Pause / Resume / Slower / Stop)
        if (parsedCmd === 'read_slower' || clean.includes('read slower') || clean.includes('slower')) {
          slowDownSpeech();
          return true;
        }

        if (parsedCmd === 'pause_reading' || clean.includes('pause reading') || clean.includes('pause audio')) {
          pauseSpeaking();
          return true;
        }

        if (parsedCmd === 'resume_reading' || clean.includes('resume reading') || clean.includes('resume audio')) {
          resumeSpeaking();
          return true;
        }

        if (parsedCmd === 'stop_speaking' || clean.includes('stop reading') || clean.includes('stop speaking') || clean === 'be quiet') {
          stopSpeaking();
          return true;
        }

        // 4. Recall Ratings (Again, Hard, Good, Easy)
        if (showAnswerRef.current) {
          if (
            clean === 'again' ||
            clean === 'forgot' ||
            clean === 'i forgot' ||
            clean === 'one' ||
            clean === '1'
          ) {
            handleRateCard(1);
            return true;
          }
          if (
            clean === 'hard' ||
            clean === 'difficult' ||
            clean === 'two' ||
            clean === '2'
          ) {
            handleRateCard(3);
            return true;
          }
          if (
            clean === 'good' ||
            clean === 'fine' ||
            clean === 'effort' ||
            clean === 'three' ||
            clean === '3'
          ) {
            handleRateCard(4);
            return true;
          }
          if (
            clean === 'easy' ||
            clean === 'perfect' ||
            clean === 'confident' ||
            clean === 'four' ||
            clean === '4'
          ) {
            handleRateCard(5);
            return true;
          }
        }

        // 5. Session Flow Controls
        if (clean === 'pause' || clean.includes('pause revision') || clean.includes('pause session')) {
          handleTogglePause();
          return true;
        }
        if (clean === 'resume' || clean.includes('resume revision') || clean.includes('resume session')) {
          handleTogglePause();
          return true;
        }
        if (
          clean === 'exit session' ||
          clean === 'exit revision' ||
          clean === 'back to planner' ||
          clean === 'leave session'
        ) {
          handleExitSession();
          return true;
        }
        if (clean === 'next' || clean === 'next question' || clean === 'next card') {
          handleNextCard();
          return true;
        }
        if (clean === 'previous' || clean === 'previous question' || clean === 'previous card') {
          handlePrevCard();
          return true;
        }
        if (
          clean.includes('how many left') ||
          clean.includes('remaining questions') ||
          clean.includes('session status')
        ) {
          const total = sessionCardsRef.current.length;
          const cur = activeCardIndexRef.current + 1;
          const left = total - cur;
          speakText(`You are on question ${cur} of ${total}. There ${left === 1 ? 'is' : 'are'} ${left} remaining.`);
          return true;
        }
      }

      // --- IN OVERVIEW ---
      if (viewModeRef.current === 'overview') {
        // Confirmation handling if subject recommendation was presented
        if (pendingSubjectRef.current) {
          if (clean === 'yes' || clean === 'confirm' || clean === 'sure' || clean === 'ok' || clean === 'start') {
            const chosenSubject = pendingSubjectRef.current;
            pendingSubjectRef.current = null;
            setSelectedSubjectFilter(chosenSubject);
            const filtered = cardsRef.current.filter((c) => c.subject === chosenSubject);
            const target = filtered.length > 0 ? filtered : cardsRef.current;
            speakText(`Confirmed. Starting revision drill for ${chosenSubject} with ${target.length} cards.`);
            startSession(target, chosenSubject);
            return true;
          }
          if (clean === 'no' || clean === 'cancel' || clean === 'stop') {
            pendingSubjectRef.current = null;
            speakText('Understood. Which subject would you like to concentrate on? Numerical Ability, Reasoning, General Awareness, or English.');
            return true;
          }
        }

        // Voice Subject Selection & Recommendations Intent
        const subjectIntent = parseSubjectSelectionIntent(clean);
        if (subjectIntent) {
          if (subjectIntent.type === 'prompt_subjects') {
            speakText(
              'Which subject would you like to concentrate on for revision? You can say Numerical Ability, Reasoning, General Awareness, or English, or ask for a recommendation.'
            );
            return true;
          }
          if (subjectIntent.type === 'recommend_subject') {
            if (weakestRecommendation) {
              pendingSubjectRef.current = weakestRecommendation.subject;
              speakText(
                `Based on your diagnostic and practice records, your weakest area is ${weakestRecommendation.topic} in ${weakestRecommendation.subject} with ${weakestRecommendation.accuracy}% accuracy. Would you like to revise ${weakestRecommendation.subject}? Say Yes, or say another subject name.`
              );
            } else {
              pendingSubjectRef.current = 'Numerical and Mathematical Ability';
              speakText(
                'Based on your records, your revision is well balanced. Would you like to revise Numerical Ability? Say Yes, or say another subject name.'
              );
            }
            return true;
          }
          if (subjectIntent.type === 'choose_subject') {
            pendingSubjectRef.current = null;
            setSelectedSubjectFilter(subjectIntent.subject);
            const filtered = cardsRef.current.filter((c) => c.subject === subjectIntent.subject);
            const dueFiltered = filtered.filter((c) => c.isDue || new Date(c.nextReviewDate) <= new Date());
            const target = dueFiltered.length > 0 ? dueFiltered : filtered.length > 0 ? filtered : cardsRef.current;
            speakText(`Selected ${subjectIntent.subject}. Starting revision drill with ${target.length} cards.`);
            startSession(target, subjectIntent.subject);
            return true;
          }
        }

        if (
          clean === 'start revision' ||
          clean === 'start revision session' ||
          clean === 'start drill' ||
          clean === 'begin revision' ||
          clean === 'start session'
        ) {
          startSession();
          return true;
        }
        if (clean.includes('start math') || clean.includes('start numerical')) {
          const s = 'Numerical and Mathematical Ability';
          const filtered = cardsRef.current.filter((c) => c.subject === s);
          startSession(filtered, s);
          return true;
        }
        if (clean.includes('start reasoning')) {
          const s = 'Reasoning Ability and Problem Solving';
          const filtered = cardsRef.current.filter((c) => c.subject === s);
          startSession(filtered, s);
          return true;
        }
        if (clean.includes('start english')) {
          const s = 'English Language and Comprehension';
          const filtered = cardsRef.current.filter((c) => c.subject === s);
          startSession(filtered, s);
          return true;
        }
        if (clean.includes('start general awareness') || clean.includes('start gk')) {
          const s = 'General Awareness';
          const filtered = cardsRef.current.filter((c) => c.subject === s);
          startSession(filtered, s);
          return true;
        }
        if (clean.includes('how many due') || clean.includes('revision summary')) {
          const dueNow = cardsRef.current.filter((c) => c.isDue).length;
          speakText(
            `You have ${dueNow} revision questions due today out of ${cardsRef.current.length} total tracked items.`
          );
          return true;
        }
      }

      return false; // Hand off to global voice router
    });

    return () => unregister();
  }, [
    handleRevealAnswer,
    handleReadQuestion,
    handleReadExplanation,
    handleRateCard,
    handleTogglePause,
    handleExitSession,
    handleNextCard,
    handlePrevCard,
    startSession,
    registerVoiceHandler,
    speakText,
    slowDownSpeech,
    pauseSpeaking,
    resumeSpeaking,
    stopSpeaking
  ]);

  // ---------------------------------------------------------------------------
  // Render: Loading State
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6" aria-busy="true" aria-label="Loading revision planner">
        <div className="h-8 w-64 bg-[#E8EBF0] animate-pulse rounded-md" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white border border-[#E8EBF0] rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-32 bg-white border border-[#E8EBF0] rounded-xl animate-pulse" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: View Mode 2 — Active Revision Session
  // ---------------------------------------------------------------------------

  if (viewMode === 'session') {
    return (
      <ActiveRevisionSession
        cards={sessionCards}
        currentIndex={activeCardIndex}
        showAnswer={showAnswer}
        isPaused={isPaused}
        onRevealAnswer={handleRevealAnswer}
        onRateCard={handleRateCard}
        onTogglePause={handleTogglePause}
        onExitSession={handleExitSession}
        onNextCard={handleNextCard}
        onPrevCard={handlePrevCard}
        onReadQuestion={handleReadQuestion}
        onReadExplanation={handleReadExplanation}
        isBlindMode={isBlindMode}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Render: View Mode 3 — Session Completion Summary
  // ---------------------------------------------------------------------------

  if (viewMode === 'summary') {
    return (
      <SessionCompletionSummary
        stats={sessionStats}
        onReviewDifficult={
          difficultCards.length > 0
            ? () => {
                startSession(difficultCards, 'Difficult Questions Review');
              }
            : undefined
        }
        onReturnToOverview={() => {
          setViewMode('overview');
          fetchRevisionQueue();
        }}
        onNavigateToSubjects={() => navigateTo('topics')}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Render: View Mode 1 — Revision Overview (Default)
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
      {/* 1. Revision Header */}
      <RevisionHeader
        dueCount={dueCards.length}
        totalCount={cards.length}
        isBlindMode={isBlindMode}
      />

      {/* Screen Navigation Disclaimer */}
      <ScreenNavigationDisclaimer
        screenId="REVISION_PLANNER"
        screenTitle="Spaced Repetition Revision Planner"
        description="SuperMemo SM-2 spaced repetition queue. Drill flashcards for weak syllabus questions, grade your recall, and track due reviews."
        actions={[
          {
            label: 'Start Due Revision Session',
            opens: 'Launches active flashcard review for items currently due today.',
            shortcut: 'Enter',
            voiceCommand: 'Say "Start Revision" or "Start Drill"'
          },
          {
            label: 'Subject Breakdown Filter',
            opens: 'Drills questions filtered by Math, Reasoning, General Awareness, or English.',
            voiceCommand: 'Say "Start Math", "Start Reasoning", "Start GA", or "Start English"'
          },
          {
            label: 'Recall Grading (Again, Hard, Good, Easy)',
            opens: 'Updates SuperMemo SM-2 memory intervals (1 to 4 days) based on recall difficulty.',
            shortcut: 'Keys 1, 2, 3, 4',
            voiceCommand: 'Say "Again", "Hard", "Good", or "Easy"'
          },
          {
            label: 'Stop Audio / Speech',
            opens: 'Immediately silences active flashcard reading across all screens.',
            shortcut: 'Escape',
            voiceCommand: 'Say "Stop"'
          }
        ]}
      />

      {/* Interrupted Session Recovery Prompt */}
      {savedSessionPrompt && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-[#D97706] shrink-0" aria-hidden="true" />
            <div className="text-xs">
              <span className="font-bold text-[#172033]">
                Interrupted revision session found!
              </span>
              <p className="text-[#64748B] mt-0.5">
                You were at question {savedSessionPrompt.index + 1} of {savedSessionPrompt.total}. Would you like to resume?
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={dismissInterruptedSession}
              className="px-3 py-1.5 text-xs text-[#64748B] hover:text-[#172033] rounded-md font-medium"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={resumeInterruptedSession}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-[#1749E8] text-white hover:bg-[#123BB8] transition-colors"
            >
              Resume session
            </button>
          </div>
        </div>
      )}

      {/* 2. Daily Revision Summary (4 Metrics Cards) */}
      <RevisionDailySummary
        dueTodayCount={dueCards.length}
        totalTrackedCount={cards.length}
        masteredCount={masteredCards.length}
        upcomingCount={upcomingCards.length}
      />

      {/* 3. Main Section: "Your daily revision" Card */}
      <DailyRevisionBanner
        dueCount={dueCards.length}
        totalCount={cards.length}
        onStartSession={() => startSession()}
        onNavigateToPractice={() => navigateTo('voice_practice')}
      />

      {/* 4. Subject-Wise Revision Breakdown */}
      <SubjectRevisionBreakdown
        stats={subjectStats}
        onStartSubjectSession={(subject) => {
          const subjectDue = cards.filter(
            (c) => c.subject === subject && (c.isDue || new Date(c.nextReviewDate) <= now)
          );
          const queue = subjectDue.length > 0 ? subjectDue : cards.filter((c) => c.subject === subject);
          startSession(queue, subject);
        }}
        onFilterSubjectView={(subject) => {
          setSelectedSubjectFilter(subject);
          const el = document.getElementById('upcoming-revision-table');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* 5. Upcoming Revision Items Section */}
      <div id="upcoming-revision-table">
        <UpcomingRevisionTable
          items={cards}
          selectedSubjectFilter={selectedSubjectFilter}
          onSelectSubjectFilter={(s) => setSelectedSubjectFilter(s)}
        />
      </div>
    </div>
  );
};
