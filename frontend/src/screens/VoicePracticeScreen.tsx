import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  Volume2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Calendar,
  Brain,
  Award,
  Sparkles,
  HelpCircle,
  Check,
  Pause,
  Play,
  Square,
  List,
  RefreshCw,
  Calculator,
  Compass
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext.tsx';
import { AudioToolbar } from '../components/AudioToolbar.tsx';
import { VoiceInputButton } from '../components/VoiceInputButton.tsx';
import { ScreenNavigationDisclaimer } from '../components/ScreenNavigationDisclaimer.tsx';
import { AccessibleExplanationCard } from '../components/common/AccessibleExplanationCard.tsx';
import { Question } from '../db/database.ts';
import { parseSpokenAnswer } from '../utils/answerParser.ts';
import { parseSubjectSelectionIntent } from '../voice/commandParser.ts';
import {
  formatFullQuestionPrompt,
  formatQuestionStemOnly,
  formatAllOptionsPrompt,
  formatSingleOptionPrompt,
  repeatQuestionTextOnly,
  repeatOptionsTextOnly,
  repeatCurrentQuestion,
  repeatCurrentOptions,
  repeatIndividualOption
} from '../utils/repeatQuestionHelper.ts';

export type PracticeSessionStep =
  | 'SUBJECT_SELECTION'
  | 'LOADING'
  | 'READING_QUESTION'
  | 'READING_OPTIONS'
  | 'LISTENING'
  | 'PROCESSING_ANSWER'
  | 'SPEAKING_FEEDBACK'
  | 'ADVANCING'
  | 'PAUSED'
  | 'COMPLETED';

export function VoicePracticeScreen() {
  const {
    navigateTo,
    user,
    settings,
    speakText,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    isPausedSpeaking,
    slowDownSpeech,
    isSpeaking,
    announce,
    isBlindMode,
    playBeacon,
    startVoiceListening,
    registerVoiceHandler
  } = useAccessibility();

  // ---------------------------------------------------------------------------
  // Session State
  // ---------------------------------------------------------------------------
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionStep, setSessionStep] = useState<PracticeSessionStep>('SUBJECT_SELECTION');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [evaluation, setEvaluation] = useState<{
    isCorrect: boolean;
    explanation: string;
    correctAnswer?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionScore, setSessionScore] = useState({ correct: 0, total: 0 });

  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>(() => {
    try {
      return sessionStorage.getItem('practice_filter_subject') || 'all';
    } catch {
      return 'all';
    }
  });

  // ---------------------------------------------------------------------------
  // Synchronous State Guard Refs (Prevents Stale Closures & Duplicate Submissions)
  // ---------------------------------------------------------------------------
  const sessionStepRef = useRef<PracticeSessionStep>('SUBJECT_SELECTION');
  sessionStepRef.current = sessionStep;

  const currentIndexRef = useRef<number>(0);
  currentIndexRef.current = currentIndex;

  const questionsRef = useRef<Question[]>([]);
  questionsRef.current = questions;

  const isSubmittingRef = useRef<boolean>(false);
  const hasAnsweredCurrentQuestionRef = useRef<boolean>(false);
  const questionStartTimeRef = useRef<number>(Date.now());
  const advanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef<boolean>(false);

  const subjects = [
    {
      id: 'math',
      num: '1',
      name: 'Numerical & Mathematical Ability',
      value: 'Numerical and Mathematical Ability',
      session: 'Session 1',
      questionsCount: '20 Questions · 60 Marks',
      marking: 'No Negative Marking (+3 for correct, 0 for wrong)',
      desc: 'Integers, Whole Numbers, LCM/HCF, Decimals, Percentages, Ratio, Work & Time, Profit & Loss',
      shortcut: 'Alt + 1',
      voice: 'Say "Option 1" or "Math"'
    },
    {
      id: 'reasoning',
      num: '2',
      name: 'Reasoning Ability & Problem Solving',
      value: 'Reasoning Ability and Problem Solving',
      session: 'Session 1',
      questionsCount: '20 Questions · 60 Marks',
      marking: 'No Negative Marking (+3 for correct, 0 for wrong)',
      desc: 'Alpha-numeric series, Coding-Decoding, Analogy, Directions, Similarities & Differences, Puzzles',
      shortcut: 'Alt + 2',
      voice: 'Say "Option 2" or "Reasoning"'
    },
    {
      id: 'ga',
      num: '3',
      name: 'General Awareness',
      value: 'General Awareness',
      session: 'Session 2',
      questionsCount: '25 Questions · 75 Marks',
      marking: '1 Mark Negative Marking (-1 for incorrect)',
      desc: 'Indian History, Geography, Art & Culture, Civics, Economics, General Science & Environmental Studies',
      shortcut: 'Alt + 3',
      voice: 'Say "Option 3" or "General Awareness"'
    },
    {
      id: 'english',
      num: '4',
      name: 'English Language & Comprehension',
      value: 'English Language and Comprehension',
      session: 'Session 2',
      questionsCount: '25 Questions · 75 Marks',
      marking: '1 Mark Negative Marking (-1 for incorrect)',
      desc: 'English vocabulary, Grammar, Sentence structure, Synonyms, Antonyms, Reading comprehension',
      shortcut: 'Alt + 4',
      voice: 'Say "Option 4" or "English"'
    },
    {
      id: 'all',
      num: '5',
      name: 'All Subjects (Full Syllabus Mixed)',
      value: 'all',
      session: 'Comprehensive',
      questionsCount: '90 Questions · 270 Marks',
      marking: 'Official SSC MTS Pattern',
      desc: 'Randomized practice across all 4 subjects to test overall candidate readiness',
      shortcut: 'Alt + 5',
      voice: 'Say "Option 5" or "All Subjects"'
    }
  ];

  // Current active question
  const currentQ = questions[currentIndex] || null;

  // ---------------------------------------------------------------------------
  // Question Reading Actions (Direct Transitions without passive Effect loops)
  // ---------------------------------------------------------------------------

  /**
   * Reads a given question aloud and transitions to LISTENING on end.
   */
  const readCurrentQuestion = useCallback(
    (q: Question, idx: number, total: number) => {
      if (!q) return;

      // Cancel any pending automatic advancement
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }

      setSessionStep('READING_QUESTION');
      sessionStepRef.current = 'READING_QUESTION';

      const prompt = formatFullQuestionPrompt(q, idx, total);
      announce(`Question ${idx + 1} of ${total}: ${q.subject}`, 'polite');

      speakText(prompt, () => {
        // Once reading completes, transition immediately to LISTENING
        setSessionStep('LISTENING');
        sessionStepRef.current = 'LISTENING';
        playBeacon('listening');
        startVoiceListening();
      });
    },
    [speakText, playBeacon, startVoiceListening, announce]
  );

  /**
   * Repeats the currently active question stem aloud.
   */
  const repeatQuestionAloud = useCallback(() => {
    const curQ = questionsRef.current[currentIndexRef.current];
    if (!curQ) return;

    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }

    setSessionStep('READING_QUESTION');
    sessionStepRef.current = 'READING_QUESTION';

    repeatCurrentQuestion(curQ, {
      stopSpeaking,
      speakText,
      announce,
      onPlaybackEnd: () => {
        setSessionStep('LISTENING');
        sessionStepRef.current = 'LISTENING';
        playBeacon('listening');
        startVoiceListening();
      }
    });
  }, [stopSpeaking, announce, speakText, playBeacon, startVoiceListening]);

  /**
   * Reads all four options for the current question aloud.
   */
  const repeatOptionsAloud = useCallback(() => {
    const curQ = questionsRef.current[currentIndexRef.current];
    if (!curQ) return;

    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }

    setSessionStep('READING_OPTIONS');
    sessionStepRef.current = 'READING_OPTIONS';

    repeatCurrentOptions(curQ, {
      stopSpeaking,
      speakText,
      announce,
      onPlaybackEnd: () => {
        setSessionStep('LISTENING');
        sessionStepRef.current = 'LISTENING';
        playBeacon('listening');
        startVoiceListening();
      }
    });
  }, [stopSpeaking, announce, speakText, playBeacon, startVoiceListening]);

  /**
   * Reads a single specific option (A, B, C, or D) aloud.
   */
  const repeatSingleOptionAloud = useCallback(
    (opt: 'A' | 'B' | 'C' | 'D') => {
      const curQ = questionsRef.current[currentIndexRef.current];
      if (!curQ) return;

      repeatIndividualOption(opt, curQ, {
        stopSpeaking,
        speakText,
        announce,
        onPlaybackEnd: () => {
          setSessionStep('LISTENING');
          sessionStepRef.current = 'LISTENING';
          playBeacon('listening');
          startVoiceListening();
        }
      });
    },
    [stopSpeaking, announce, speakText, playBeacon, startVoiceListening]
  );

  // ---------------------------------------------------------------------------
  // Question Advancement & Completion Engine
  // ---------------------------------------------------------------------------

  /**
   * Advances cleanly to the next question or completes the session.
   */
  const advanceToNextQuestion = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }

    const total = questionsRef.current.length;
    const curIdx = currentIndexRef.current;

    // Check if the current question is the final question
    if (curIdx >= total - 1) {
      setSessionStep('COMPLETED');
      sessionStepRef.current = 'COMPLETED';
      stopSpeaking();

      const finalMsg = `Practice session complete! You completed all ${total} questions. Outstanding effort!`;
      announce(finalMsg, 'assertive');
      speakText(finalMsg);
      return;
    }

    // Advance to next index
    const nextIdx = curIdx + 1;
    currentIndexRef.current = nextIdx;
    setCurrentIndex(nextIdx);

    // Reset per-question guards and state
    setSelectedOption(null);
    setHasSubmitted(false);
    setEvaluation(null);
    isSubmittingRef.current = false;
    hasAnsweredCurrentQuestionRef.current = false;
    questionStartTimeRef.current = Date.now();

    const nextQ = questionsRef.current[nextIdx];
    if (nextQ) {
      readCurrentQuestion(nextQ, nextIdx, total);
    }
  }, [stopSpeaking, announce, speakText, readCurrentQuestion]);

  /**
   * Returns to previous question if candidate explicitly clicks or requests.
   */
  const handlePreviousQuestion = useCallback(() => {
    if (currentIndexRef.current <= 0) return;

    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }

    const prevIdx = currentIndexRef.current - 1;
    currentIndexRef.current = prevIdx;
    setCurrentIndex(prevIdx);

    setSelectedOption(null);
    setHasSubmitted(false);
    setEvaluation(null);
    isSubmittingRef.current = false;
    hasAnsweredCurrentQuestionRef.current = false;
    questionStartTimeRef.current = Date.now();

    const prevQ = questionsRef.current[prevIdx];
    if (prevQ) {
      readCurrentQuestion(prevQ, prevIdx, questionsRef.current.length);
    }
  }, [readCurrentQuestion]);

  // ---------------------------------------------------------------------------
  // Answer Submission Engine (Atomic Guarded Flow)
  // ---------------------------------------------------------------------------

  /**
   * Submits an answer with synchronous deduplication and progressive feedback.
   */
  const submitAnswer = useCallback(
    async (optKey: string) => {
      // 1. Synchronous Guard: reject duplicate calls or calls while already processing
      if (
        isSubmittingRef.current ||
        hasAnsweredCurrentQuestionRef.current ||
        sessionStepRef.current === 'PROCESSING_ANSWER' ||
        sessionStepRef.current === 'SPEAKING_FEEDBACK' ||
        sessionStepRef.current === 'ADVANCING' ||
        sessionStepRef.current === 'COMPLETED'
      ) {
        return;
      }

      const curQ = questionsRef.current[currentIndexRef.current];
      if (!curQ) return;

      // 2. Atomic Synchronous Lock
      isSubmittingRef.current = true;
      hasAnsweredCurrentQuestionRef.current = true;
      setSessionStep('PROCESSING_ANSWER');
      sessionStepRef.current = 'PROCESSING_ANSWER';

      // 3. Update UI Selection and mute speech recognition
      setSelectedOption(optKey);
      stopSpeaking();

      const elapsedSeconds = Math.max(
        1,
        Math.round((Date.now() - questionStartTimeRef.current) / 1000)
      );

      try {
        const res = await fetch('/api/practice/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            questionId: curQ.question_id,
            selectedOption: optKey,
            timeSpentSeconds: elapsedSeconds,
            mode: 'voice'
          })
        });

        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}`);
        }

        const data = await res.json();
        const isCorrect = Boolean(data.isCorrect);
        const correctAnswer = data.correctAnswer || curQ.correct_answer;
        const explanation = data.explanation || curQ.explanation;

        setHasSubmitted(true);
        setEvaluation({
          isCorrect,
          explanation,
          correctAnswer
        });

        setSessionScore((prev) => ({
          correct: prev.correct + (isCorrect ? 1 : 0),
          total: prev.total + 1
        }));

        setSessionStep('SPEAKING_FEEDBACK');
        sessionStepRef.current = 'SPEAKING_FEEDBACK';

        const correctOptKey = `option_${correctAnswer.toLowerCase()}` as keyof Question;
        const correctOptText = (curQ as any)[correctOptKey] || '';

        // Build feedback — include explanation for wrong answers so candidate learns
        const feedback = isCorrect
          ? `Correct! Option ${optKey}. You earned three marks. Say next question to continue.`
          : `Incorrect. You chose Option ${optKey}. The correct answer is Option ${correctAnswer}: ${correctOptText}. ${explanation ? `Here is why: ${explanation}. ` : ''}Say next question when you are ready to continue.`;

        announce(isCorrect ? 'Correct! (+3 Marks)' : `Incorrect. Correct is Option ${correctAnswer}`, 'assertive');
        playBeacon(isCorrect ? 'success' : 'alert');

        // For correct answers auto-advance after TTS; for wrong answers wait for "next question" voice command
        if (isCorrect) {
          speakText(feedback, () => {
            advanceToNextQuestion();
          });
        } else {
          speakText(feedback, () => {
            // Stay in SPEAKING_FEEDBACK state — wait for user to say "next question"
            setSessionStep('SPEAKING_FEEDBACK');
            sessionStepRef.current = 'SPEAKING_FEEDBACK';
            playBeacon('listening');
            startVoiceListening();
          });
        }
      } catch (err) {
        console.error('[VoicePractice] Submit error:', err);
        // Release guard so candidate can retry
        isSubmittingRef.current = false;
        hasAnsweredCurrentQuestionRef.current = false;
        setSessionStep('LISTENING');
        sessionStepRef.current = 'LISTENING';

        announce('Submission error. Please speak your answer again.', 'assertive');
        speakText(
          'Submission could not be saved due to a network error. Please speak your answer again.',
          () => {
            playBeacon('listening');
            startVoiceListening();
          }
        );
      }
    },
    [user?.id, stopSpeaking, announce, playBeacon, speakText, startVoiceListening, advanceToNextQuestion]
  );

  // ---------------------------------------------------------------------------
  // Data Fetching & Initial Sequence Start
  // ---------------------------------------------------------------------------

  const fetchQuestions = useCallback(
    (subjectToFetch: string) => {
      setLoading(true);
      setSessionStep('LOADING');
      sessionStepRef.current = 'LOADING';

      const params = new URLSearchParams({ limit: '400' });
      if (subjectToFetch && subjectToFetch !== 'all') {
        params.append('subject', subjectToFetch);
      }
      const topicFilter = sessionStorage.getItem('practice_filter_topic');
      if (topicFilter && subjectToFetch !== 'all') {
        params.append('topic', topicFilter);
      }

      fetch(`/api/questions?${params.toString()}`)
        .then((r) => r.json())
        .then((data) => {
          const qList: Question[] = data.questions || [];
          setQuestions(qList);
          questionsRef.current = qList;

          setCurrentIndex(0);
          currentIndexRef.current = 0;
          setSelectedOption(null);
          setHasSubmitted(false);
          setEvaluation(null);
          isSubmittingRef.current = false;
          hasAnsweredCurrentQuestionRef.current = false;
          questionStartTimeRef.current = Date.now();

          if (qList.length > 0) {
            readCurrentQuestion(qList[0], 0, qList.length);
          }
        })
        .catch((e) => console.warn('Questions fetch error:', e))
        .finally(() => setLoading(false));
    },
    [readCurrentQuestion]
  );

  const handleSelectSubjectAndStart = useCallback(
    (subjectVal: string, subjectLabel: string) => {
      try {
        sessionStorage.setItem('practice_filter_subject', subjectVal);
        sessionStorage.removeItem('practice_filter_topic');
      } catch {}
      setSelectedSubjectFilter(subjectVal);
      setSessionStep('LOADING');
      sessionStepRef.current = 'LOADING';

      const msg = `Selected ${subjectLabel}. Loading practice questions.`;
      announce(msg, 'assertive');
      speakText(msg, () => {
        fetchQuestions(subjectVal);
      });
    },
    [announce, speakText, fetchQuestions]
  );

  // Initial welcome and subject prompt on entering Voice Practice
  useEffect(() => {
    if (sessionStepRef.current === 'SUBJECT_SELECTION') {
      const prompt =
        'Welcome to Voice Practice. Please choose a subject to begin: Option 1, Numerical and Mathematical Ability. Option 2, Reasoning Ability and Problem Solving. Option 3, General Awareness. Option 4, English Language and Comprehension. Or Option 5, All Subjects. Say the subject name, say Option 1 through 5, or click on the screen.';
      announce(prompt, 'assertive');
      speakText(prompt, () => {
        playBeacon('listening');
        startVoiceListening();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubjectChange = (newSubject: string) => {
    try {
      sessionStorage.setItem('practice_filter_subject', newSubject);
      sessionStorage.removeItem('practice_filter_topic');
    } catch {}
    setSelectedSubjectFilter(newSubject);
    announce(`Switched practice topic filter to ${newSubject}`, 'polite');
  };

  // ---------------------------------------------------------------------------
  // Context-Aware Voice Command Handler
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const unregister = registerVoiceHandler((transcript: string) => {
      const cleanLower = transcript.toLowerCase().trim();

      // --- Mode A: In SUBJECT_SELECTION Step ---
      if (sessionStepRef.current === 'SUBJECT_SELECTION') {
        const subjectIntent = parseSubjectSelectionIntent(transcript);
        if (subjectIntent && subjectIntent.type === 'choose_subject') {
          handleSelectSubjectAndStart(subjectIntent.subject, subjectIntent.label);
          return true;
        }

        // Direct matching for numbers, option labels, and subject nicknames
        if (
          cleanLower === '1' ||
          cleanLower === 'option 1' ||
          cleanLower === 'option one' ||
          cleanLower === 'subject 1' ||
          cleanLower.includes('numerical') ||
          cleanLower.includes('math')
        ) {
          handleSelectSubjectAndStart('Numerical and Mathematical Ability', 'Numerical and Mathematical Ability');
          return true;
        }
        if (
          cleanLower === '2' ||
          cleanLower === 'option 2' ||
          cleanLower === 'option two' ||
          cleanLower === 'subject 2' ||
          cleanLower.includes('reasoning') ||
          cleanLower.includes('problem solving')
        ) {
          handleSelectSubjectAndStart('Reasoning Ability and Problem Solving', 'Reasoning Ability and Problem Solving');
          return true;
        }
        if (
          cleanLower === '3' ||
          cleanLower === 'option 3' ||
          cleanLower === 'option three' ||
          cleanLower === 'subject 3' ||
          cleanLower.includes('general awareness') ||
          cleanLower.includes('gk') ||
          cleanLower.includes('awareness')
        ) {
          handleSelectSubjectAndStart('General Awareness', 'General Awareness');
          return true;
        }
        if (
          cleanLower === '4' ||
          cleanLower === 'option 4' ||
          cleanLower === 'option four' ||
          cleanLower === 'subject 4' ||
          cleanLower.includes('english') ||
          cleanLower.includes('comprehension')
        ) {
          handleSelectSubjectAndStart('English Language and Comprehension', 'English Language and Comprehension');
          return true;
        }
        if (
          cleanLower === '5' ||
          cleanLower === 'option 5' ||
          cleanLower === 'option five' ||
          cleanLower === 'subject 5' ||
          cleanLower.includes('all subjects') ||
          cleanLower === 'all'
        ) {
          handleSelectSubjectAndStart('all', 'All Subjects');
          return true;
        }

        if (
          cleanLower === 'repeat' ||
          cleanLower === 'repeat options' ||
          cleanLower === 'read options' ||
          cleanLower === 'help' ||
          cleanLower === 'what are the options'
        ) {
          const prompt =
            'Please choose a subject: Option 1, Numerical and Mathematical Ability. Option 2, Reasoning Ability and Problem Solving. Option 3, General Awareness. Option 4, English Language and Comprehension. Or Option 5, All Subjects. Say Option 1 through 5, or speak the subject name.';
          announce(prompt, 'polite');
          speakText(prompt, () => {
            playBeacon('listening');
            startVoiceListening();
          });
          return true;
        }

        if (cleanLower === 'stop' || cleanLower === 'stop speaking' || cleanLower === 'be quiet') {
          stopSpeaking();
          return true;
        }

        return false;
      }

      // --- Mode B: In Active Practice Questions ---
      // Allow switching back to subject selection anytime
      if (
        cleanLower === 'change subject' ||
        cleanLower === 'switch subject' ||
        cleanLower === 'select subject' ||
        cleanLower === 'choose subject' ||
        cleanLower === 'choose another subject' ||
        cleanLower === 'show subjects' ||
        cleanLower === 'subjects'
      ) {
        if (advanceTimerRef.current) {
          clearTimeout(advanceTimerRef.current);
          advanceTimerRef.current = null;
        }
        stopSpeaking();
        setSessionStep('SUBJECT_SELECTION');
        sessionStepRef.current = 'SUBJECT_SELECTION';
        const prompt =
          'Returning to subject selection. Please choose a subject: Option 1, Numerical Ability. Option 2, Reasoning Ability. Option 3, General Awareness. Option 4, English Language. Or Option 5, All Subjects.';
        announce(prompt, 'assertive');
        speakText(prompt, () => {
          playBeacon('listening');
          startVoiceListening();
        });
        return true;
      }

      // 0. Spoken Subject Selection while practicing
      const subjectIntent = parseSubjectSelectionIntent(transcript);
      if (subjectIntent) {
        if (subjectIntent.type === 'prompt_subjects') {
          setSessionStep('SUBJECT_SELECTION');
          sessionStepRef.current = 'SUBJECT_SELECTION';
          const promptMsg =
            'Please choose a subject to practice: Option 1, Numerical Ability. Option 2, Reasoning Ability. Option 3, General Awareness. Option 4, English Language. Or Option 5, All Subjects.';
          announce(promptMsg, 'assertive');
          speakText(promptMsg, () => {
            playBeacon('listening');
            startVoiceListening();
          });
          return true;
        }

        if (subjectIntent.type === 'choose_subject') {
          handleSelectSubjectAndStart(subjectIntent.subject, subjectIntent.label);
          return true;
        }
      }

      // --- 0B. Explanation Replay Intent ---
      if (
        cleanLower === 'repeat explanation' ||
        cleanLower === 'read explanation' ||
        cleanLower === 'explain' ||
        cleanLower === 'explanation'
      ) {
        if (evaluation?.explanation) {
          announce(`Explanation: ${evaluation.explanation}`, 'polite');
          speakText(evaluation.explanation, () => {
            playBeacon('listening');
            startVoiceListening();
          });
          return true;
        }
      }

      const curQ = questionsRef.current[currentIndexRef.current];
      if (!curQ) return false;

      const optionsMap = {
        A: curQ.option_a,
        B: curQ.option_b,
        C: curQ.option_c,
        D: curQ.option_d
      };

      const parsed = parseSpokenAnswer(transcript, optionsMap);
      if (!parsed) return false;

      // --- 1. Audio and Repeat Controls ---
      if (parsed.type === 'control') {
        if (parsed.command === 'repeat') {
          repeatQuestionAloud();
          return true;
        }

        if (parsed.command === 'repeat_options') {
          repeatOptionsAloud();
          return true;
        }

        if (parsed.command === 'repeat_option_a') {
          repeatSingleOptionAloud('A');
          return true;
        }
        if (parsed.command === 'repeat_option_b') {
          repeatSingleOptionAloud('B');
          return true;
        }
        if (parsed.command === 'repeat_option_c') {
          repeatSingleOptionAloud('C');
          return true;
        }
        if (parsed.command === 'repeat_option_d') {
          repeatSingleOptionAloud('D');
          return true;
        }

        if (parsed.command === 'read_slower') {
          slowDownSpeech();
          return true;
        }

        if (parsed.command === 'pause_reading') {
          pauseSpeaking();
          setSessionStep('PAUSED');
          sessionStepRef.current = 'PAUSED';
          announce('Audio paused', 'polite');
          return true;
        }

        if (parsed.command === 'resume_reading') {
          resumeSpeaking();
          setSessionStep('LISTENING');
          sessionStepRef.current = 'LISTENING';
          announce('Audio resumed', 'polite');
          return true;
        }

        if (parsed.command === 'stop_speaking') {
          if (advanceTimerRef.current) {
            clearTimeout(advanceTimerRef.current);
            advanceTimerRef.current = null;
          }
          stopSpeaking();
          setSessionStep('LISTENING');
          sessionStepRef.current = 'LISTENING';
          playBeacon('listening');
          startVoiceListening();
          announce('Audio reading stopped. Listening for your command or answer.', 'polite');
          return true;
        }

        if (parsed.command === 'skip') {
          advanceToNextQuestion();
          return true;
        }

        if (parsed.command === 'previous') {
          handlePreviousQuestion();
          return true;
        }

        if (parsed.command === 'timer') {
          speakText(
            `You are on question ${currentIndexRef.current + 1} of ${questionsRef.current.length}.`
          );
          return true;
        }
      }

      // --- 2. Answering Option (A, B, C, D) ---
      if (parsed.type === 'option') {
        // Guard: only accept if not already submitting or already answered
        if (!isSubmittingRef.current && !hasAnsweredCurrentQuestionRef.current) {
          submitAnswer(parsed.option);
          return true;
        }
      }

      return false; // Fallback to global navigation router
    });

    return () => unregister();
  }, [
    registerVoiceHandler,
    readCurrentQuestion,
    repeatOptionsAloud,
    repeatSingleOptionAloud,
    slowDownSpeech,
    pauseSpeaking,
    resumeSpeaking,
    stopSpeaking,
    advanceToNextQuestion,
    handlePreviousQuestion,
    speakText,
    announce,
    submitAnswer
  ]);

  // Fallback Voice Input Button Handler
  const handleVoiceTranscript = (transcript: string) => {
    const subjectIntent = parseSubjectSelectionIntent(transcript);
    if (subjectIntent) {
      if (subjectIntent.type === 'prompt_subjects') {
        const promptMsg =
          'Available subjects are: Numerical and Mathematical Ability, Reasoning Ability and Problem Solving, General Awareness, and English Language and Comprehension. Which subject would you like to practice?';
        announce(promptMsg, 'assertive');
        speakText(promptMsg);
        return;
      }
      if (subjectIntent.type === 'choose_subject') {
        handleSubjectChange(subjectIntent.subject);
        const confirmMsg = `Selected subject: ${subjectIntent.subject}. Loading questions.`;
        announce(confirmMsg, 'assertive');
        speakText(confirmMsg);
        return;
      }
    }

    const curQ = questionsRef.current[currentIndexRef.current];
    if (!curQ) return;

    const parsed = parseSpokenAnswer(transcript, {
      A: curQ.option_a,
      B: curQ.option_b,
      C: curQ.option_c,
      D: curQ.option_d
    });

    if (parsed && parsed.type === 'option') {
      if (!isSubmittingRef.current && !hasAnsweredCurrentQuestionRef.current) {
        submitAnswer(parsed.option);
      }
    } else if (parsed && parsed.type === 'control') {
      if (parsed.command === 'repeat') {
        readCurrentQuestion(curQ, currentIndexRef.current, questionsRef.current.length);
      } else if (parsed.command === 'skip') {
        advanceToNextQuestion();
      } else if (parsed.command === 'previous') {
        handlePreviousQuestion();
      }
    } else {
      announce(`Heard: "${transcript}". Please speak Option A, B, C, or D.`, 'polite');
    }
  };

  // Keyboard accessibility handler (1-4, A-D, Space to replay, Enter to submit/advance)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      // When choosing a subject (Keys 1-5 or Alt+1-5)
      if (sessionStepRef.current === 'SUBJECT_SELECTION') {
        if (['1', '2', '3', '4', '5'].includes(e.key)) {
          e.preventDefault();
          const target = subjects.find((s) => s.num === e.key);
          if (target) {
            handleSelectSubjectAndStart(target.value, target.name);
          }
          return;
        }
      }

      // J to jump to subject selection anytime (not during input)
      if (!e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        stopSpeaking();
        setSessionStep('SUBJECT_SELECTION');
        sessionStepRef.current = 'SUBJECT_SELECTION';
        const msg = 'Please choose a subject to practice.';
        announce(msg, 'polite');
        speakText(msg);
        return;
      }

      const key = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(key)) {
        e.preventDefault();
        if (!isSubmittingRef.current && !hasAnsweredCurrentQuestionRef.current) {
          submitAnswer(key);
        }
      } else if (['1', '2', '3', '4'].includes(key)) {
        e.preventDefault();
        const map: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
        if (!isSubmittingRef.current && !hasAnsweredCurrentQuestionRef.current) {
          submitAnswer(map[key]);
        }
      } else if (e.code === 'Space') {
        e.preventDefault();
        const curQ = questionsRef.current[currentIndexRef.current];
        if (curQ) {
          readCurrentQuestion(curQ, currentIndexRef.current, questionsRef.current.length);
        }
      } else if (e.key === 'r' || e.key === 'R') {
        // R — repeat ONLY the question text (no prefix, no options)
        if (!e.altKey) {
          e.preventDefault();
          const rQ = questionsRef.current[currentIndexRef.current];
          if (rQ && sessionStepRef.current !== 'SUBJECT_SELECTION' && sessionStepRef.current !== 'LOADING') {
            stopSpeaking();
            speakText(repeatQuestionTextOnly(rQ), () => {
              playBeacon('listening');
              startVoiceListening();
            });
          }
        }
      } else if (e.key === 'o' || e.key === 'O') {
        // O — repeat ONLY the options (no "The options are:" prefix)
        if (!e.altKey) {
          e.preventDefault();
          const oQ = questionsRef.current[currentIndexRef.current];
          if (oQ && sessionStepRef.current !== 'SUBJECT_SELECTION' && sessionStepRef.current !== 'LOADING') {
            stopSpeaking();
            speakText(repeatOptionsTextOnly(oQ), () => {
              playBeacon('listening');
              startVoiceListening();
            });
          }
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (sessionStepRef.current === 'SPEAKING_FEEDBACK' || hasSubmitted) {
          advanceToNextQuestion();
        } else if (selectedOption && !isSubmittingRef.current && !hasAnsweredCurrentQuestionRef.current) {
          submitAnswer(selectedOption);
        }
      } else if (!e.altKey && !e.ctrlKey && (key === 'P' || e.key === 'ArrowLeft') && sessionStepRef.current !== 'SUBJECT_SELECTION') {
        e.preventDefault();
        handlePreviousQuestion();
      } else if (!e.altKey && !e.ctrlKey && (key === 'N' || e.key === 'ArrowRight') && sessionStepRef.current !== 'SUBJECT_SELECTION') {
        e.preventDefault();
        if (sessionStepRef.current === 'SPEAKING_FEEDBACK' || hasSubmitted) {
          advanceToNextQuestion();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasSubmitted, selectedOption, readCurrentQuestion, advanceToNextQuestion, handlePreviousQuestion, submitAnswer, handleSelectSubjectAndStart, subjects, stopSpeaking, announce, speakText, startVoiceListening, playBeacon]);

  // Effect cleanup on unmount
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current);
      }
      stopSpeaking();
    };
  }, [stopSpeaking]);

  // ---------------------------------------------------------------------------
  // Render: Subject Selection View (Mandatory First Step)
  // ---------------------------------------------------------------------------
  if (sessionStep === 'SUBJECT_SELECTION') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6" id="main-content">
        {/* Header */}
        <div className="pb-4 border-b border-[#D9E1EF] space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#1749E8] uppercase tracking-wider">
              Screen 6 of 16 · Voice-First Practice
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-xs px-2 py-0.5 bg-blue-50 text-[#1749E8] font-bold rounded-md border border-blue-200">
              Subject Selection Required
            </span>
            {isBlindMode && (
              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-md flex items-center gap-1">
                <Mic className="w-3 h-3 text-red-600 animate-pulse" />
                Listening for Subject Choice
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172033]">
            Choose a Subject to Begin Practice
          </h1>
          <p className="text-sm text-[#475467]">
            Select one of the 4 official SSC MTS examination subjects or comprehensive mixed practice. Say the subject name, say Option 1 through 5, or click any card below.
          </p>
        </div>

        {/* Screen Navigation Disclaimer */}
        <ScreenNavigationDisclaimer
          screenId="VOICE_PRACTICE"
          screenTitle="Voice Practice Subject Selection"
          description="Select an examination subject to practice. Practice sessions include immediate feedback, progressive explanations, and repeat controls."
          actions={[
            {
              label: 'Option 1: Numerical & Mathematical Ability',
              opens: '20 Practice Questions on arithmetic, percentages, ratio, algebra, and geometry.',
              shortcut: 'Alt + 1 or 1',
              voiceCommand: 'Say "Option 1" or "Math"'
            },
            {
              label: 'Option 2: Reasoning Ability & Problem Solving',
              opens: '20 Practice Questions on series, coding-decoding, analogy, directions, and syllogisms.',
              shortcut: 'Alt + 2 or 2',
              voiceCommand: 'Say "Option 2" or "Reasoning"'
            },
            {
              label: 'Option 3: General Awareness',
              opens: '25 Practice Questions on Indian History, Polity, Geography, General Science, and Current Affairs.',
              shortcut: 'Alt + 3 or 3',
              voiceCommand: 'Say "Option 3" or "General Awareness"'
            },
            {
              label: 'Option 4: English Language & Comprehension',
              opens: '25 Practice Questions on grammar, vocabulary, synonyms, idioms, and reading comprehension.',
              shortcut: 'Alt + 4 or 4',
              voiceCommand: 'Say "Option 4" or "English"'
            },
            {
              label: 'Option 5: All Subjects (Full Syllabus)',
              opens: 'Comprehensive mixed session drawing questions across all 4 syllabus subjects.',
              shortcut: 'Alt + 5 or 5',
              voiceCommand: 'Say "Option 5" or "All Subjects"'
            }
          ]}
        />

        {/* 5 Subject Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subjects.map((subj) => (
            <button
              key={subj.id}
              type="button"
              onClick={() => handleSelectSubjectAndStart(subj.value, subj.name)}
              className="p-5 bg-white hover:bg-blue-50/50 focus:bg-blue-50/80 rounded-xl border-2 border-slate-200 hover:border-blue-600 focus:border-blue-700 text-left transition-all shadow-xs group focus:outline-none focus:ring-3 focus:ring-blue-400"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-sm border border-blue-200 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {subj.num}
                  </span>
                  <div>
                    <h2 className="font-extrabold text-base text-slate-900 group-hover:text-blue-700 transition-colors">
                      {subj.name}
                    </h2>
                    <span className="text-xs font-semibold text-blue-600">
                      {subj.session} • {subj.questionsCount}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>

              <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                {subj.desc}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-[11px]">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono font-bold rounded border border-slate-200">
                  Key {subj.num} or {subj.shortcut}
                </span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded border border-blue-100 flex items-center gap-1">
                  <Mic className="w-3 h-3 text-blue-600" />
                  {subj.voice}
                </span>
                <span className="text-slate-500 font-medium">
                  {subj.marking}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Loading State
  // ---------------------------------------------------------------------------
  if (loading || !currentQ) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-600" id="main-content">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded-md w-64 mx-auto" />
          <p className="text-sm font-semibold">Loading Voice-First Practice Session...</p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Completed Session View
  // ---------------------------------------------------------------------------
  if (sessionStep === 'COMPLETED') {
    const accuracy =
      sessionScore.total > 0
        ? Math.round((sessionScore.correct / sessionScore.total) * 100)
        : 0;

    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8" id="main-content">
        <div className="bg-white border-2 border-emerald-200 rounded-2xl p-8 sm:p-12 text-center shadow-sm space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border-2 border-emerald-300">
            <Award className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172033]">
              Practice Session Completed!
            </h1>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              You have answered all available questions in this practice set. Your progress has been
              recorded in your learning history.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto py-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs text-slate-500 font-bold uppercase">Questions</span>
              <p className="text-2xl font-black text-[#172033] mt-1">{sessionScore.total}</p>
            </div>
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-xs text-emerald-800 font-bold uppercase">Correct</span>
              <p className="text-2xl font-black text-emerald-700 mt-1">{sessionScore.correct}</p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <span className="text-xs text-blue-800 font-bold uppercase">Accuracy</span>
              <p className="text-2xl font-black text-[#1749E8] mt-1">{accuracy}%</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => fetchQuestions(selectedSubjectFilter)}
              className="px-6 py-3 rounded-xl bg-[#1749E8] text-white text-xs font-bold hover:bg-[#123BB8] transition-colors shadow-sm inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Practice Again</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('progress')}
              className="px-6 py-3 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200 border border-slate-300 transition-colors"
            >
              View Progress Analytics
            </button>

            <button
              type="button"
              onClick={() => navigateTo('dashboard')}
              className="px-6 py-3 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200 border border-slate-300 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Active Question Interface
  // ---------------------------------------------------------------------------
  const questionSpeech = `${currentQ.question_text}. Option A: ${currentQ.option_a}. Option B: ${currentQ.option_b}. Option C: ${currentQ.option_c}. Option D: ${currentQ.option_d}.`;

  const options = [
    { key: 'A', text: currentQ.option_a },
    { key: 'B', text: currentQ.option_b },
    { key: 'C', text: currentQ.option_c },
    { key: 'D', text: currentQ.option_d }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6" id="main-content">
      {/* 1. Header Toolbar & Topic Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D9E1EF]">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#1749E8] uppercase tracking-wider">
              Screen 6 of 16 · Voice-First Practice
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-xs px-2 py-0.5 bg-[#EEF4FF] text-[#1749E8] font-bold rounded-md border border-[#D9E1EF]">
              {currentQ.subject}
            </span>
            <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-800 font-semibold rounded">
              {currentQ.difficulty_label}
            </span>
            {isBlindMode && (
              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-md flex items-center gap-1">
                <Mic className="w-3 h-3 text-red-600 animate-pulse" />
                Autonomous Voice Mode
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#172033]">
            Topic: {currentQ.topic} {currentQ.subtopic ? `(${currentQ.subtopic})` : ''}
          </h1>
        </div>

        {/* Audio Toolbar & Voice Trigger */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              stopSpeaking();
              setSessionStep('SUBJECT_SELECTION');
              sessionStepRef.current = 'SUBJECT_SELECTION';
              const msg = 'Please choose a subject to practice.';
              announce(msg, 'polite');
              speakText(msg);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 focus:ring-2 focus:ring-blue-600"
            title="Switch practice subject (J)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Change Subject (J)</span>
          </button>
          <AudioToolbar textToRead={questionSpeech} label="Read question and options aloud" />
          <VoiceInputButton
            onTranscriptConfirmed={handleVoiceTranscript}
            label="Speak Answer Option"
            contextHint='Say "Option A", "Option B", "Option C", or "Option D"'
          />
        </div>
      </div>

      {/* Screen Navigation Disclaimer */}
      <ScreenNavigationDisclaimer
        screenId="VOICE_PRACTICE"
        screenTitle={`Voice Practice · ${currentQ.subject}`}
        description={`Active question ${currentIndex + 1} of ${questions.length}. Answer with voice or keys, request repeats, or move to next question.`}
        actions={[
          {
            label: 'Option A, B, C, or D',
            opens: 'Submits your answer and gives immediate auditory feedback and explanation.',
            shortcut: 'Keys A, B, C, D or 1, 2, 3, 4',
            voiceCommand: 'Say "Option A", "Option B", etc.'
          },
          {
            label: 'Next Question',
            opens: 'Advances to the next question in this subject set.',
            shortcut: 'Enter or Right Arrow',
            voiceCommand: 'Say "Next" or "Next Question"'
          },
          {
            label: 'Previous Question',
            opens: 'Returns to the previous question.',
            shortcut: 'Left Arrow',
            voiceCommand: 'Say "Previous"'
          },
          {
            label: 'Repeat Question',
            opens: 'Reads the complete question stem and all four options aloud.',
            shortcut: 'Spacebar',
            voiceCommand: 'Say "Repeat" or "Repeat Question"'
          },
          {
            label: 'Repeat Options',
            opens: 'Reads only the four answer options.',
            voiceCommand: 'Say "Repeat Options"'
          },
          {
            label: 'Change Subject',
            opens: 'Returns to the Subject Selection screen to choose another subject.',
            shortcut: 'Alt + S',
            voiceCommand: 'Say "Change Subject"'
          },
          {
            label: 'Stop Speaking',
            opens: 'Silences screen reader playback immediately across all screens.',
            shortcut: 'Escape',
            voiceCommand: 'Say "Stop"'
          }
        ]}
      />

      {/* 1B. Subject Filter Selector */}
      <div className="p-3 bg-white border border-[#D9E1EF] rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <label htmlFor="practice-subject-select" className="text-xs font-bold text-[#172033] whitespace-nowrap">
            Practice Subject:
          </label>
          <select
            id="practice-subject-select"
            value={selectedSubjectFilter}
            onChange={(e) => handleSubjectChange(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-[#D9E1EF] rounded-lg text-[#172033] focus:border-[#1749E8] focus:ring-2 focus:ring-[#1749E8] focus:outline-none"
          >
            {subjects.map((sub) => (
              <option key={sub.value} value={sub.value}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs font-medium text-[#53627A]">
          Showing <strong>{questions.length}</strong> questions in this section
        </div>
      </div>

      {/* 2. Question Progression Bar & Status Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[#53627A]">
        <div className="flex items-center gap-3">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span className="text-slate-400">·</span>
          <span>
            Score: <strong className="text-emerald-700">{sessionScore.correct}</strong> / {sessionScore.total}
          </span>
        </div>

        {/* Dynamic Voice Session Status Badge */}
        <div className="flex items-center gap-2">
          {sessionStep === 'READING_QUESTION' && (
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold flex items-center gap-1.5">
              <Volume2 className="w-3 h-3 animate-pulse" />
              Reading Question...
            </span>
          )}
          {sessionStep === 'READING_OPTIONS' && (
            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold flex items-center gap-1.5">
              <List className="w-3 h-3" />
              Reading Options...
            </span>
          )}
          {sessionStep === 'LISTENING' && (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-[11px] font-bold flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
              Listening for your answer...
            </span>
          )}
          {sessionStep === 'PROCESSING_ANSWER' && (
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
              Recording Answer...
            </span>
          )}
          {sessionStep === 'SPEAKING_FEEDBACK' && (
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300 text-[11px] font-bold flex items-center gap-1.5">
              <Volume2 className="w-3 h-3" />
              Explaining Solution...
            </span>
          )}
          {sessionStep === 'ADVANCING' && (
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold flex items-center gap-1.5">
              <ArrowRight className="w-3 h-3" />
              Loading Next Question...
            </span>
          )}
        </div>
      </div>

      {/* 3. Central Question Card or Evaluation View */}
      {hasSubmitted && evaluation ? (
        <div className="space-y-4">
          {/* Action Buttons Toolbar at Top (matches reference layout) */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePreviousQuestion}
                disabled={currentIndex === 0}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 disabled:opacity-40"
                aria-label="Previous practice question (P or Left Arrow)"
                title="Previous question (P or Left Arrow)"
              >
                Previous (P)
              </button>
              <button
                type="button"
                onClick={advanceToNextQuestion}
                disabled={currentIndex === questions.length - 1}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 disabled:opacity-40"
                aria-label="Next practice question (N or Enter)"
                title="Next question (N or Enter)"
              >
                Next (N / Enter)
              </button>
              <button
                type="button"
                onClick={() => readCurrentQuestion(currentQ, currentIndex, questions.length)}
                className="px-3.5 py-2 text-xs font-semibold text-[#1749E8] bg-[#EEF4FF] hover:bg-blue-100 rounded-lg border border-blue-200 inline-flex items-center gap-1.5"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Repeat Audio (Space)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={advanceToNextQuestion}
              disabled={currentIndex === questions.length - 1}
              className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm inline-flex items-center gap-2 transition-all active:scale-95 focus:ring-2 focus:ring-emerald-500"
            >
              <span>Next Question</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* High-Visibility Answer Verification Feedback & Academic Explanation Card */}
          <AccessibleExplanationCard
            questionText={currentQ.question_text}
            selectedOption={selectedOption}
            selectedOptionText={selectedOption ? (currentQ as any)['option_' + selectedOption.toLowerCase()] : undefined}
            correctOption={evaluation.correctAnswer || currentQ.correct_answer}
            correctOptionText={(currentQ as any)['option_' + (evaluation.correctAnswer || currentQ.correct_answer).toLowerCase()]}
            isCorrect={evaluation.isCorrect}
            explanation={evaluation.explanation}
            subject={currentQ.subject}
            topic={currentQ.topic}
            marksAwarded={evaluation.isCorrect ? 3 : 0}
            sourceReference={`${currentQ.source_name} (${currentQ.source_reference})`}
          />

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1 text-xs">
            <button
              type="button"
              onClick={() => navigateTo('ai_tutor')}
              className="font-bold text-[#1749E8] hover:bg-blue-50 inline-flex items-center gap-1.5 p-2 rounded-lg bg-white border border-blue-200 shadow-2xs"
            >
              <Brain className="w-4 h-4" />
              <span>Ask AI Tutor to elaborate on this concept (Alt+T)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 sm:p-8 bg-white border-2 border-[#D9E1EF] rounded-2xl shadow-sm space-y-6">
          {/* Repeat Question Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E8EBF0]">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
              Audio &amp; Voice Controls
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-action="repeat-question"
                onClick={() => {
                  stopSpeaking();
                  speakText(repeatQuestionTextOnly(currentQ));
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#1749E8] bg-[#EEF4FF] hover:bg-blue-100 border border-blue-200 rounded-lg shadow-2xs transition-colors focus:ring-2 focus:ring-[#1749E8]"
                aria-label="Repeat current question text only (Keyboard shortcut: R — question only, Space — full question)"
                title="Repeat question text only (R)"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Repeat Question (R)</span>
              </button>

              <button
                type="button"
                data-action="repeat-options"
                onClick={() => {
                  stopSpeaking();
                  speakText(repeatOptionsTextOnly(currentQ));
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#1749E8] bg-[#EEF4FF] hover:bg-blue-100 border border-blue-200 rounded-lg shadow-2xs transition-colors focus:ring-2 focus:ring-[#1749E8]"
                aria-label="Repeat answer options only (Keyboard shortcut: O — options only)"
                title="Repeat options only (O)"
              >
                <List className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Repeat Options (O)</span>
              </button>

              {isSpeaking && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (isPausedSpeaking) {
                        resumeSpeaking();
                        announce('Speech resumed', 'polite');
                      } else {
                        pauseSpeaking();
                        announce('Speech paused', 'polite');
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#D97706] bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                    aria-label={isPausedSpeaking ? 'Resume audio reading' : 'Pause audio reading'}
                  >
                    {isPausedSpeaking ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
                    <span>{isPausedSpeaking ? 'Resume' : 'Pause'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      stopSpeaking();
                      announce('Speech stopped', 'polite');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                    aria-label="Stop audio reading"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Question Text */}
          <div className="text-base sm:text-lg font-bold text-[#172033] leading-relaxed max-w-prose">
            {currentQ.question_text}
          </div>

          {/* Multiple Choice Options */}
          <div role="radiogroup" aria-label="Answer Options" className="space-y-3">
            {options.map((opt) => {
              const isSelected = selectedOption === opt.key;
              let borderStyle = 'border-[#D9E1EF] hover:border-[#1749E8] bg-white';
              if (isSelected) {
                borderStyle = 'border-[#1749E8] bg-[#EEF4FF] ring-2 ring-[#1749E8] shadow-xs';
              }

              return (
                <div
                  key={opt.key}
                  id={`voice-option-${opt.key}`}
                  data-testid={`voice-option-${opt.key}`}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onClick={() => {
                    if (!isSubmittingRef.current && !hasAnsweredCurrentQuestionRef.current) {
                      submitAnswer(opt.key);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (
                      !isSubmittingRef.current &&
                      !hasAnsweredCurrentQuestionRef.current &&
                      (e.key === 'Enter' || e.key === ' ')
                    ) {
                      e.preventDefault();
                      submitAnswer(opt.key);
                    }
                  }}
                  className={`w-full p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-4 text-left ${borderStyle} focus:outline-hidden focus:ring-2 focus:ring-[#1749E8]`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isSelected ? 'bg-[#1749E8] text-white' : 'bg-slate-200 text-slate-800'
                        }`}
                    >
                      {opt.key}
                    </span>
                    <span className="text-sm font-medium text-[#172033]">{opt.text}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      title={`Read Option ${opt.key} aloud`}
                      aria-label={`Read Option ${opt.key} aloud: ${opt.text}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        repeatSingleOptionAloud(opt.key as any);
                      }}
                      className="p-1.5 text-[#64748B] hover:text-[#1749E8] hover:bg-[#EEF2FF] rounded-lg transition-colors focus:ring-2 focus:ring-[#1749E8]"
                    >
                      <Volume2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#D9E1EF] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePreviousQuestion}
                disabled={currentIndex === 0}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 disabled:opacity-40"
                aria-label="Previous practice question (P or Left Arrow)"
                title="Previous question (P or Left Arrow)"
              >
                Previous (P)
              </button>
              <button
                type="button"
                onClick={advanceToNextQuestion}
                disabled={currentIndex === questions.length - 1}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 disabled:opacity-40"
                aria-label="Next practice question (N or Enter)"
                title="Next question (N or Enter)"
              >
                Next (N / Enter)
              </button>
              <button
                type="button"
                onClick={() => readCurrentQuestion(currentQ, currentIndex, questions.length)}
                className="px-3.5 py-2 text-xs font-semibold text-[#1749E8] bg-[#EEF4FF] hover:bg-blue-100 rounded-lg border border-blue-200 inline-flex items-center gap-1.5"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Repeat Audio (Space)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => selectedOption && submitAnswer(selectedOption)}
              disabled={!selectedOption || isSubmittingRef.current}
              className="px-6 py-2.5 text-sm font-bold text-white bg-[#1749E8] hover:bg-[#123BB8] rounded-lg shadow-sm disabled:opacity-40 transition-all active:scale-95 focus:ring-2 focus:ring-[#1749E8]"
            >
              Submit Answer (Enter)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
