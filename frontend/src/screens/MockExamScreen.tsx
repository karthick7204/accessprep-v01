import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock,
  AlertCircle,
  HelpCircle,
  Flag,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Volume2,
  ShieldAlert,
  X,
  Mic,
  Pause,
  Play,
  Square,
  List,
  BookOpen,
  Check,
  Layers,
  Trash2,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext.tsx';
import { AudioToolbar } from '../components/AudioToolbar.tsx';
import { VoiceInputButton } from '../components/VoiceInputButton.tsx';
import { ScreenNavigationDisclaimer } from '../components/ScreenNavigationDisclaimer.tsx';
import { Question, MockExamAttempt } from '../db/database.ts';
import bundledQuestionsData from '../data/ssc_mts_questions.json';
import { RotationStatus } from '../services/mockExamRotationService.ts';
import { parseSpokenAnswer } from '../utils/answerParser.ts';
import {
  formatFullQuestionPrompt,
  formatAllOptionsPrompt,
  formatSingleOptionPrompt,
  repeatQuestionTextOnly,
  repeatOptionsTextOnly,
  repeatCurrentQuestion,
  repeatCurrentOptions,
  repeatIndividualOption
} from '../utils/repeatQuestionHelper.ts';
import {
  MOCK_EXAM_SUBMIT_CONFIRM_PROMPT,
  normalizeExamCommand,
  isSubmitConfirmPhrase,
  isSubmitCancelPhrase
} from '../voice/examContextResolver.ts';

export function MockExamScreen() {
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
    registerVoiceHandler,
    setIsExamActive,
    pendingExamExit
  } = useAccessibility();

  const [rotationStatus, setRotationStatus] = useState<RotationStatus | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<MockExamAttempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Exam answers map: questionId -> { selectedOption, timeSpent, markedForReview }
  const [answers, setAnswers] = useState<
    Record<string, { selectedOption: string | null; timeSpent: number; markedForReview?: boolean }>
  >({});

  const isPwD = user?.pwdCategory !== 'None' || settings.compensatoryTimeEnabled;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(5400);
  const [isExamStarted, setIsExamStarted] = useState<boolean>(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingCycle, setIsResettingCycle] = useState(false);
  const [isStartingExam, setIsStartingExam] = useState(false);
  // Inline exit confirmation (triggered by Alt+Shift+X or voice "exit exam")
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pendingExitDestination, setPendingExitDestination] = useState<string | null>(null);
  const showExitConfirmRef = useRef(false);

  const currentIdxRef = useRef<number>(currentIdx);
  currentIdxRef.current = currentIdx;

  const questionsRef = useRef<Question[]>(questions);
  questionsRef.current = questions;

  const secondsRemainingRef = useRef<number>(secondsRemaining);
  secondsRemainingRef.current = secondsRemaining;

  const showSubmitModalRef = useRef<boolean>(showSubmitModal);
  showSubmitModalRef.current = showSubmitModal;

  const currentAttemptRef = useRef<MockExamAttempt | null>(currentAttempt);
  currentAttemptRef.current = currentAttempt;

  // Fetch rotation status and resume any active attempt
  const loadRotationStatus = useCallback(async () => {
    setLoading(true);
    const uid = user?.id || 'usr_candidate_01';
    try {
      const res = await fetch(`/api/mock/rotation-status?userId=${uid}`);
      const data: RotationStatus = await res.json();
      setRotationStatus(data);

      if (data.activeAttempt && sessionStorage.getItem('mockExamStarted') === 'true') {
        // Resume active attempt only on in-session browser refresh
        const startRes = await fetch('/api/mock/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: uid, isPwD })
        });
        const startData = await startRes.json();
        if (!startData.isExhausted && startData.attempt) {
          setCurrentAttempt(startData.attempt);
          setQuestions(startData.questions || []);
          setAnswers(startData.attempt.answers || {});
          setSecondsRemaining(startData.attempt.remainingTime || (isPwD ? startData.questions.length * 80 : startData.questions.length * 60));
          setCurrentIdx(startData.attempt.currentQuestionIndex || 0);
          setIsExamStarted(true);
          setIsExamActive(true);
          announce(`Resumed active Mock Examination ${startData.attempt.attemptSequence || 1}. Progress restored.`, 'polite');
        }
      }
    } catch (e) {
      console.warn('Failed to fetch rotation status:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isPwD, announce, setIsExamActive]);

  useEffect(() => {
    loadRotationStatus();
  }, [loadRotationStatus]);

  // Register active exam status with global NavigationController so it can intercept navigation
  useEffect(() => {
    if (isExamStarted && questions.length > 0) {
      setIsExamActive(true);
    }
    return () => {
      setIsExamActive(false);
    };
  }, [isExamStarted, questions.length, setIsExamActive]);

  // Synchronize global pendingExamExit requests (e.g. from sidebar or navigation shortcuts)
  useEffect(() => {
    if (pendingExamExit && isExamStarted) {
      setShowExitConfirm(true);
      showExitConfirmRef.current = true;
      setPendingExitDestination(pendingExamExit.destination);
    }
  }, [pendingExamExit, isExamStarted]);

  // Session storage synchronization as local safeguard
  useEffect(() => {
    if (isExamStarted && Object.keys(answers).length > 0 && currentAttempt) {
      sessionStorage.setItem('mockExamAnswers', JSON.stringify(answers));
      sessionStorage.setItem('mockExamTimer', String(secondsRemaining));
      sessionStorage.setItem('mockExamIndex', String(currentIdx));
      sessionStorage.setItem('mockExamStarted', 'true');
      sessionStorage.setItem('mockExamAttemptId', currentAttempt.id);
    }
  }, [answers, secondsRemaining, currentIdx, isExamStarted, currentAttempt]);


  // Read question and options aloud automatically
  const readQuestionAloud = useCallback((q: Question, idx: number, total: number) => {
    if (!q) return;
    const prompt = formatFullQuestionPrompt(q, idx, total);
    announce(`Reading Question ${idx + 1} of ${total}`, 'polite');
    speakText(prompt, () => {
      playBeacon('listening');
      startVoiceListening();
    });
  }, [speakText, playBeacon, startVoiceListening, announce]);

  const repeatQuestionAloud = useCallback((q: Question) => {
    if (!q) return;
    repeatCurrentQuestion(q, {
      stopSpeaking,
      speakText,
      announce,
      onPlaybackEnd: () => {
        playBeacon('listening');
        startVoiceListening();
      }
    });
  }, [stopSpeaking, speakText, playBeacon, startVoiceListening, announce]);

  const repeatOptionsAloud = useCallback((q: Question) => {
    if (!q) return;
    repeatCurrentOptions(q, {
      stopSpeaking,
      speakText,
      announce,
      onPlaybackEnd: () => {
        playBeacon('listening');
        startVoiceListening();
      }
    });
  }, [stopSpeaking, speakText, playBeacon, startVoiceListening, announce]);

  const repeatSingleOptionAloud = useCallback((q: Question, opt: 'A' | 'B' | 'C' | 'D') => {
    if (!q) return;
    repeatIndividualOption(opt, q, {
      stopSpeaking,
      speakText,
      announce,
      onPlaybackEnd: () => {
        playBeacon('listening');
        startVoiceListening();
      }
    });
  }, [stopSpeaking, speakText, playBeacon, startVoiceListening, announce]);

  // Start new examination attempt via backend rotation service (with resilient client fallback)
  const handleStartExam = useCallback(async () => {
    setIsStartingExam(true);
    const uid = user?.id || 'usr_candidate_01';
    try {
      let allocatedQuestions: Question[] = [];
      let attempt: MockExamAttempt | null = null;
      let completedCount = 0;

      try {
        const res = await fetch('/api/mock/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: uid, isPwD })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.isExhausted) {
            announce('All questions have been completed in the current cycle. Please confirm to start a new cycle.', 'assertive');
            loadRotationStatus();
            return;
          }
          if (data.attempt && Array.isArray(data.questions) && data.questions.length > 0) {
            allocatedQuestions = data.questions;
            attempt = data.attempt;
            completedCount = data.rotationStatus?.completedQuestionCount || 0;
          }
        }
      } catch (networkErr) {
        console.warn('Backend /api/mock/start network error, engaging resilient fallback:', networkErr);
      }

      // Resilient fallback: If backend rotation was unreachable, fetch curriculum questions directly
      if (!attempt || allocatedQuestions.length === 0) {
        try {
          const qRes = await fetch('/api/questions?limit=400');
          if (qRes.ok) {
            const contentType = qRes.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const qData = await qRes.json();
              const all: Question[] = qData.questions || [];
              if (all.length > 0) {
                // Balance or shuffle 90 questions for the mock exam
                allocatedQuestions = [...all].sort(() => 0.5 - Math.random()).slice(0, 90);
              }
            }
          }
        } catch (qErr) {
          console.warn('Questions fetch error during fallback:', qErr);
        }

        // Offline / bundled fallback safeguard
        if (allocatedQuestions.length === 0) {
          const pool = (bundledQuestionsData as unknown as Question[]) || [];
          if (pool.length > 0) {
            allocatedQuestions = [...pool].sort(() => 0.5 - Math.random()).slice(0, 90);
          }
        }

        if (allocatedQuestions.length === 0) {
          throw new Error('Unable to allocate examination questions. Please check connection.');
        }

        const qCount = allocatedQuestions.length;
        const initialAnswers: Record<string, { selectedOption: string | null; timeSpent: number; markedForReview: boolean }> = {};
        allocatedQuestions.forEach((q) => {
          initialAnswers[q.question_id] = { selectedOption: null, timeSpent: 0, markedForReview: false };
        });

        attempt = {
          id: `mock_${Date.now()}`,
          userId: uid,
          examTitle: 'SSC MTS 2026 Official Pattern Mock Examination #1',
          session1Score: 0,
          session2Score: 0,
          totalScore: 0,
          totalMax: qCount * 3,
          percentage: 0,
          qualified: false,
          totalTimeSeconds: 0,
          answers: initialAnswers,
          completedAt: '',
          cycleNumber: 1,
          attemptSequence: 1,
          status: 'in_progress',
          totalQuestions: qCount,
          answeredQuestions: 0,
          startedAt: new Date().toISOString(),
          remainingTime: isPwD ? Math.round(qCount * 80) : qCount * 60,
          currentQuestionIndex: 0,
          questionIds: allocatedQuestions.map((q) => q.question_id)
        };
      }

      setCurrentAttempt(attempt);
      setQuestions(allocatedQuestions);
      setAnswers(attempt.answers || {});
      setCurrentIdx(attempt.currentQuestionIndex || 0);

      const qCount = allocatedQuestions.length;
      const initialSecs = attempt.remainingTime || (isPwD ? Math.round(qCount * 80) : qCount * 60);
      setSecondsRemaining(initialSecs);

      try {
        sessionStorage.setItem('mockExamStarted', 'true');
        sessionStorage.setItem('mockExamAttemptId', attempt.id);
      } catch {}

      setIsExamStarted(true);
      setIsExamActive(true);

      const seq = attempt.attemptSequence || 1;
      const spokenMsg = `You are starting Mock Examination ${seq}. There are ${qCount} new questions in this examination. You have ${completedCount} previously completed questions in your current cycle. Good luck!`;

      announce(spokenMsg, 'assertive');
      speakText(spokenMsg, () => {
        if (allocatedQuestions.length > 0) {
          readQuestionAloud(allocatedQuestions[0], 0, allocatedQuestions.length);
        }
      });
    } catch (e: any) {
      console.error('Failed to start mock exam:', e);
      announce(e.message || 'Failed to initialize mock examination. Please try again.', 'assertive');
    } finally {
      setIsStartingExam(false);
    }
  }, [user?.id, isPwD, setIsExamActive, announce, speakText, loadRotationStatus, readQuestionAloud]);

  // Request inline exit confirmation (triggered by Alt+Shift+X or voice "exit exam")
  const requestExamExit = useCallback((destination?: string) => {
    if (!isExamStarted) return;
    setShowExitConfirm(true);
    showExitConfirmRef.current = true;
    if (destination) setPendingExitDestination(destination);
    const msg = 'You are currently taking an examination. Do you want to submit your answers and exit? Press Y to confirm submission and exit, or N to continue the examination.';
    stopSpeaking();
    announce(msg, 'assertive');
    speakText(msg);
  }, [isExamStarted, stopSpeaking, announce, speakText]);

  // Listen for accessprep:request-exam-exit event (from Alt+Shift+X or voice assistant)
  useEffect(() => {
    const handleExitEvt = (e: Event) => {
      if (isExamStarted) {
        const custom = e as CustomEvent;
        requestExamExit(custom.detail?.destination);
      }
    };
    window.addEventListener('accessprep:request-exam-exit', handleExitEvt);
    return () => window.removeEventListener('accessprep:request-exam-exit', handleExitEvt);
  }, [isExamStarted, requestExamExit]);

  // Final submission of examination
  const handleFinalSubmit = useCallback(async () => {
    if (!currentAttemptRef.current) return;
    setIsSubmitting(true);
    const uid = user?.id || 'usr_candidate_01';
    try {
      const qList = questionsRef.current;
      const currentAns = answers;
      const submissions = qList.map((q) => ({
        questionId: q.question_id,
        subject: q.subject,
        selectedOption: currentAns[q.question_id]?.selectedOption || null,
        timeSpentSeconds: 40
      }));

      const totalAllocatedSecs = isPwD ? Math.round(qList.length * 80) : qList.length * 60;
      const elapsedSecs = Math.max(1, totalAllocatedSecs - secondsRemainingRef.current);

      const res = await fetch('/api/mock/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: uid,
          attemptId: currentAttemptRef.current.id,
          submissions,
          answers: currentAns,
          totalTimeSeconds: elapsedSecs
        })
      });

      await res.json();
      sessionStorage.removeItem('mockExamAnswers');
      sessionStorage.removeItem('mockExamTimer');
      sessionStorage.removeItem('mockExamIndex');
      sessionStorage.removeItem('mockExamStarted');
      sessionStorage.removeItem('mockExamAttemptId');

      setIsExamStarted(false);
      setIsExamActive(false);
      // Clear exit confirmation state
      setShowExitConfirm(false);
      showExitConfirmRef.current = false;
      const exitDest = pendingExitDestination;
      setPendingExitDestination(null);
      announce('Examination submitted successfully. Loading scorecard and results review.', 'assertive');
      speakText('Examination submitted successfully. Loading scorecard and results analysis.', () => {
        navigateTo(exitDest || 'results');
      });
    } catch (e) {
      console.error('Submit exam error:', e);
      announce('Submission error. Please retry.', 'assertive');
    } finally {
      setIsSubmitting(false);
      setShowSubmitModal(false);
    }
  }, [answers, user?.id, isPwD, announce, speakText, navigateTo, setIsExamActive, pendingExitDestination]);

  // Discard in-progress examination and release question reservations
  const handleDiscardExam = useCallback(async () => {
    if (!currentAttemptRef.current) return;
    const uid = user?.id || 'usr_candidate_01';
    try {
      await fetch('/api/mock/discard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: uid,
          attemptId: currentAttemptRef.current.id
        })
      });

      sessionStorage.removeItem('mockExamAnswers');
      sessionStorage.removeItem('mockExamTimer');
      sessionStorage.removeItem('mockExamIndex');
      sessionStorage.removeItem('mockExamStarted');
      sessionStorage.removeItem('mockExamAttemptId');

      setIsExamStarted(false);
      setIsExamActive(false);
      setCurrentAttempt(null);
      setQuestions([]);
      setAnswers({});
      announce('Mock examination discarded. Reserved questions have been released back to your unseen question pool.', 'polite');
      speakText('Examination discarded. All questions returned to your question pool.');
      loadRotationStatus();
    } catch (e) {
      console.error('Failed to discard attempt:', e);
    } finally {
      setShowDiscardModal(false);
    }
  }, [user?.id, setIsExamActive, announce, speakText, loadRotationStatus]);

  // Reset rotation cycle
  const handleConfirmResetCycle = useCallback(async () => {
    setIsResettingCycle(true);
    const uid = user?.id || 'usr_candidate_01';
    try {
      const res = await fetch('/api/mock/reset-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid })
      });
      const data = await res.json();
      announce(`Rotation Cycle ${data.newCycle} initiated. All eligible questions are now ready.`, 'assertive');
      speakText(`Rotation Cycle ${data.newCycle} started. All questions are ready for practice.`);
      await loadRotationStatus();
    } catch (e) {
      console.error('Failed to reset cycle:', e);
    } finally {
      setIsResettingCycle(false);
    }
  }, [user?.id, announce, speakText, loadRotationStatus]);

  // Timer interval with high-priority audio announcements
  useEffect(() => {
    if (!isExamStarted) return;
    if (secondsRemaining <= 0) {
      handleFinalSubmit();
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === 900) {
          playBeacon('alert');
          announce('15 minutes remaining in examination.', 'assertive');
          speakText('Attention candidate: 15 minutes remaining in examination.');
        } else if (prev === 300) {
          playBeacon('alert');
          announce('5 minutes remaining. Please review your answers.', 'assertive');
          speakText('Attention candidate: 5 minutes remaining. Please review your answers.');
        } else if (prev === 60) {
          playBeacon('alert');
          announce('1 minute remaining. Exam will automatically submit.', 'assertive');
          speakText('Attention candidate: 1 minute remaining. The exam will automatically submit.');
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isExamStarted, secondsRemaining, announce, speakText, playBeacon, handleFinalSubmit]);

  const currentQ = questions[currentIdx];


  // Read aloud on mount or question index change
  useEffect(() => {
    if (isExamStarted && currentQ && (isBlindMode || settings.autoReadAloud)) {
      readQuestionAloud(currentQ, currentIdx, questions.length);
    }
  }, [isExamStarted, currentIdx, currentQ?.question_id, isBlindMode, settings.autoReadAloud, readQuestionAloud, questions.length]);

  // Record an answer without auto-advancing, waiting for user confirmation (click/voice "go to next")
  const handleRecordOption = useCallback((optKey: string) => {
    if (!currentQ || !currentAttemptRef.current) return;
    const newAnswers = {
      ...answers,
      [currentQ.question_id]: {
        ...answers[currentQ.question_id],
        selectedOption: optKey
      }
    };
    setAnswers(newAnswers);

    // Persist progress to backend asynchronously
    fetch('/api/mock/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user?.id,
        attemptId: currentAttemptRef.current.id,
        answers: newAnswers,
        remainingTime: secondsRemainingRef.current,
        currentQuestionIndex: currentIdxRef.current
      })
    }).catch((e) => console.warn('Failed to save progress to backend:', e));

    playBeacon('success');
    announce(`Selected Option ${optKey}. Click Next or say go to next to continue.`, 'polite');

    speakText(`You have selected option ${optKey}.`, () => {
      playBeacon('listening');
      startVoiceListening();
    });
  }, [currentQ, answers, playBeacon, announce, speakText, startVoiceListening, user?.id]);

  const handleClearResponse = () => {
    if (!currentQ || !currentAttemptRef.current) return;
    const newAnswers = {
      ...answers,
      [currentQ.question_id]: {
        ...answers[currentQ.question_id],
        selectedOption: null
      }
    };
    setAnswers(newAnswers);

    fetch('/api/mock/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user?.id,
        attemptId: currentAttemptRef.current.id,
        answers: newAnswers,
        remainingTime: secondsRemainingRef.current,
        currentQuestionIndex: currentIdxRef.current
      })
    }).catch(() => {});

    announce('Cleared response for current question.', 'polite');
    speakText('Response cleared for this question.');
  };

  const handleToggleMarkForReview = useCallback(() => {
    if (!currentQ || !currentAttemptRef.current) return;
    const curState = answers[currentQ.question_id]?.markedForReview;
    const newAnswers = {
      ...answers,
      [currentQ.question_id]: {
        ...answers[currentQ.question_id],
        markedForReview: !curState
      }
    };
    setAnswers(newAnswers);

    fetch('/api/mock/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user?.id,
        attemptId: currentAttemptRef.current.id,
        answers: newAnswers,
        remainingTime: secondsRemainingRef.current,
        currentQuestionIndex: currentIdxRef.current
      })
    }).catch(() => {});

    if (!curState) {
      announce('Marked question for review', 'polite');
      speakText('Marked question for review. Moving to next question.', () => {
        if (currentIdxRef.current < questionsRef.current.length - 1) {
          setCurrentIdx((prev) => prev + 1);
        }
      });
    } else {
      announce('Unmarked question from review', 'polite');
      speakText('Unmarked question from review.');
    }
  }, [currentQ, answers, announce, speakText, user?.id]);

  const mockExamInstructions =
    `SSC MTS Tier-I Mock Examination Instructions. Current Cycle: ${rotationStatus?.currentCycle || 1}. You have completed ${rotationStatus?.completedQuestionCount || 0} of ${rotationStatus?.totalEligibleQuestions || 400} questions. This examination allocates ${rotationStatus?.nextExamQuestionCount || 90} completely unseen questions. Session I comprises Numerical and Reasoning Ability with 3 marks per correct answer and NO negative marking. Session II comprises General Awareness and English with 3 marks per correct answer and minus 1 mark negative marking. Duration is ` +
    (isPwD ? 'adjusted with compensatory time applied' : 'allocated proportionally') +
    '. The timer will start only after your confirmation. Say Start Examination or click Confirm and Start to begin.';

  // Voice Navigation Handler
  useEffect(() => {
    if (!currentQ && isExamStarted) return;

    const unregister = registerVoiceHandler((transcript: string) => {
      const clean = normalizeExamCommand(transcript);
      if (!clean) return false;

      // Block Pilot Demo specific commands from triggering Mock Exam submission or switching
      if (
        clean === 'submit pilot demo' ||
        clean === 'submit pilot examination' ||
        clean === 'submit diagnostic' ||
        clean === 'submit diagnostic examination' ||
        clean === 'start pilot demo' ||
        clean === 'begin pilot examination'
      ) {
        const blockMsg =
          'You are currently in the Mock Examination. Pilot Demo commands are disabled while Mock Examination is active.';
        announce(blockMsg, 'assertive');
        speakText(blockMsg);
        return true;
      }

      if (!isExamStarted) {
        if (
          clean === 'start' ||
          clean === 'start exam' ||
          clean === 'start examination' ||
          clean === 'begin' ||
          clean === 'begin exam' ||
          clean === 'begin examination' ||
          clean === 'confirm' ||
          clean === 'i confirm'
        ) {
          handleStartExam();
          return true;
        }
        if (clean === 'read instructions' || clean === 'instructions' || clean === 'read instruction') {
          speakText(mockExamInstructions);
          return true;
        }
        if (clean === 'reset cycle' || clean === 'start new cycle' || clean === 'new cycle') {
          handleConfirmResetCycle();
          return true;
        }
        return false;
      }

      // Handle pending Mock Exam submission confirmation modal
      if (showSubmitModalRef.current) {
        if (isSubmitConfirmPhrase(clean)) {
          handleFinalSubmit();
          return true;
        }
        if (isSubmitCancelPhrase(clean)) {
          setShowSubmitModal(false);
          showSubmitModalRef.current = false;
          const cancelMsg = 'Submission cancelled. Continuing your Mock Examination.';
          announce(cancelMsg, 'polite');
          speakText(cancelMsg);
          return true;
        }
        announce(MOCK_EXAM_SUBMIT_CONFIRM_PROMPT, 'assertive');
        speakText(MOCK_EXAM_SUBMIT_CONFIRM_PROMPT);
        return true;
      }

      if (clean === 'confirm submission') {
        setShowSubmitModal(true);
        showSubmitModalRef.current = true;
        announce(MOCK_EXAM_SUBMIT_CONFIRM_PROMPT, 'assertive');
        speakText(MOCK_EXAM_SUBMIT_CONFIRM_PROMPT);
        return true;
      }

      // Handle inline exit confirmation (Alt+Shift+X flow or voice "exit exam")
      if (showExitConfirmRef.current) {
        if (isSubmitConfirmPhrase(clean) || clean === 'yes' || clean === 'yes submit' || clean === 'yes exit') {
          handleFinalSubmit();
          return true;
        }
        if (isSubmitCancelPhrase(clean) || clean === 'no' || clean === 'no continue' || clean === 'cancel exit') {
          setShowExitConfirm(false);
          showExitConfirmRef.current = false;
          setPendingExitDestination(null);
          const cancelMsg = 'Exit cancelled. Continuing your Mock Examination.';
          announce(cancelMsg, 'polite');
          speakText(cancelMsg);
          return true;
        }
        return true; // absorb all input while exit confirm is shown
      }

      // Voice commands to request exam exit
      if (
        clean === 'exit exam' ||
        clean === 'leave examination' ||
        clean === 'leave exam' ||
        clean === 'exit examination' ||
        clean === 'submit and exit'
      ) {
        requestExamExit();
        return true;
      }

      const activeQ = questionsRef.current[currentIdxRef.current] || currentQ;
      if (!activeQ) return false;

      const optionsMap = {
        A: activeQ.option_a,
        B: activeQ.option_b,
        C: activeQ.option_c,
        D: activeQ.option_d
      };

      const parsed = parseSpokenAnswer(transcript, optionsMap);

      if (parsed) {
        if (parsed.type === 'control') {
          if (parsed.command === 'repeat') {
            repeatQuestionAloud(activeQ);
            return true;
          }
          if (parsed.command === 'repeat_options') {
            repeatOptionsAloud(activeQ);
            return true;
          }
          if (parsed.command === 'repeat_option_a') {
            repeatSingleOptionAloud(activeQ, 'A');
            return true;
          }
          if (parsed.command === 'repeat_option_b') {
            repeatSingleOptionAloud(activeQ, 'B');
            return true;
          }
          if (parsed.command === 'repeat_option_c') {
            repeatSingleOptionAloud(activeQ, 'C');
            return true;
          }
          if (parsed.command === 'repeat_option_d') {
            repeatSingleOptionAloud(activeQ, 'D');
            return true;
          }
          if (parsed.command === 'read_slower') {
            slowDownSpeech();
            return true;
          }
          if (parsed.command === 'pause_reading') {
            pauseSpeaking();
            announce('Audio paused', 'polite');
            return true;
          }
          if (parsed.command === 'resume_reading') {
            resumeSpeaking();
            announce('Audio resumed', 'polite');
            return true;
          }
          if (parsed.command === 'stop_speaking') {
            stopSpeaking();
            startVoiceListening();
            announce('Audio stopped. Listening for your command or answer.', 'polite');
            return true;
          }
          if (parsed.command === 'skip') {
            if (currentIdxRef.current < questionsRef.current.length - 1) {
              speakText('Skipping to next question.', () => {
                setCurrentIdx((prev) => prev + 1);
              });
            } else {
              speakText("You are at the final question. Say 'Submit' to submit your exam, or 'Review' to go back.");
            }
            return true;
          }
          if (parsed.command === 'previous') {
            if (currentIdxRef.current > 0) {
              setCurrentIdx((prev) => prev - 1);
            }
            return true;
          }
          if (parsed.command === 'mark_review') {
            handleToggleMarkForReview();
            return true;
          }
          if (parsed.command === 'timer') {
            const mins = Math.ceil(secondsRemainingRef.current / 60);
            speakText(`You have ${mins} minutes remaining in the examination.`);
            return true;
          }
          if (parsed.command === 'submit') {
            setShowSubmitModal(true);
            showSubmitModalRef.current = true;
            announce(MOCK_EXAM_SUBMIT_CONFIRM_PROMPT, 'assertive');
            speakText(MOCK_EXAM_SUBMIT_CONFIRM_PROMPT);
            return true;
          }
          if (parsed.command === 'review') {
            speakText('Returning to first question for review.', () => {
              setCurrentIdx(0);
            });
            return true;
          }
        }

        if (parsed.type === 'option') {
          handleRecordOption(parsed.option);
          return true;
        }
      }

      return false;
    });

    return () => unregister();
  }, [isExamStarted, currentQ, registerVoiceHandler, readQuestionAloud, handleToggleMarkForReview, handleRecordOption, handleFinalSubmit, speakText, handleStartExam, mockExamInstructions, handleConfirmResetCycle, requestExamExit, announce]);

  // Single-key WCAG keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      // Alt+Shift+X — Request inline exam exit confirmation (global during exam)
      if (e.altKey && e.shiftKey && e.key.toUpperCase() === 'X') {
        e.preventDefault();
        if (isExamStarted) requestExamExit();
        return;
      }

      if (!isExamStarted) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleStartExam();
        }
        return;
      }

      // If exit confirm banner is showing: only Y/N/Escape handled
      if (showExitConfirmRef.current) {
        const key = e.key.toUpperCase();
        if (key === 'Y') {
          e.preventDefault();
          handleFinalSubmit();
        } else if (key === 'N' || e.key === 'Escape') {
          e.preventDefault();
          setShowExitConfirm(false);
          showExitConfirmRef.current = false;
          setPendingExitDestination(null);
          const msg = 'Exit cancelled. Continuing your Mock Examination.';
          announce(msg, 'polite');
          speakText(msg);
        }
        return;
      }

      const key = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(key)) {
        e.preventDefault();
        handleRecordOption(key);
      } else if (['1', '2', '3', '4'].includes(key)) {
        e.preventDefault();
        const map: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
        handleRecordOption(map[key]);
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (currentQ) readQuestionAloud(currentQ, currentIdx, questions.length);
      } else if (key === 'R' && !e.altKey) {
        // R — repeat ONLY the question text (no prefix, no question number, no options)
        e.preventDefault();
        if (currentQ) { stopSpeaking(); speakText(repeatQuestionTextOnly(currentQ)); }
      } else if (key === 'O' && !e.altKey) {
        // O — repeat ONLY the options (no "The options are:" prefix)
        e.preventDefault();
        if (currentQ) { stopSpeaking(); speakText(repeatOptionsTextOnly(currentQ)); }
      } else if (key === 'M' && !e.altKey) {
        // M — Mark or unmark question for review
        e.preventDefault();
        handleToggleMarkForReview();
      } else if (e.altKey && key === 'H') {
        e.preventDefault();
        handleToggleMarkForReview();
      } else if ((key === 'P' || e.key === 'ArrowLeft') && !e.altKey) {
        // P or Left Arrow — Navigate to previous question
        e.preventDefault();
        if (currentIdxRef.current > 0) {
          setCurrentIdx(currentIdxRef.current - 1);
        }
      } else if ((key === 'N' || e.key === 'ArrowRight' || e.key === 'Enter') && !e.altKey) {
        // N, Right Arrow, or Enter — Advance to next question
        e.preventDefault();
        if (currentIdxRef.current < questionsRef.current.length - 1) {
          setCurrentIdx(currentIdxRef.current + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExamStarted, currentQ, currentIdx, questions.length, handleRecordOption, readQuestionAloud, handleToggleMarkForReview, handleStartExam, stopSpeaking, speakText, requestExamExit, handleFinalSubmit, announce]);

  // Format Timer
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-600" id="main-content">
        <div className="w-8 h-8 border-4 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="font-bold">Initializing Official SSC MTS Mock Examination Rotation System...</p>
      </div>
    );
  }

  // Exhaustion Screen: All available questions in the current cycle have been completed
  if (rotationStatus?.isExhausted && !isExamStarted) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-6" id="main-content">
        <div className="p-8 bg-white border-2 border-blue-700 rounded-3xl shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              Cycle {rotationStatus.currentCycle} Complete
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              All Available Mock Examination Questions Completed
            </h1>
            <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              You have completed all {rotationStatus.totalEligibleQuestions} available questions in your current question cycle. Would you like to start a new question cycle?
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 max-w-md mx-auto text-xs text-slate-600 text-left space-y-2.5">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-600">Completed in Cycle {rotationStatus.currentCycle}:</span>
              <strong className="text-slate-900 font-mono font-bold">{rotationStatus.completedQuestionCount} questions</strong>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-600">Total Eligible Bank Size:</span>
              <strong className="text-slate-900 font-mono font-bold">{rotationStatus.totalEligibleQuestions} questions</strong>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-600">Past Exam Scorecards &amp; History:</span>
              <strong className="text-emerald-700 font-semibold">100% Preserved</strong>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleConfirmResetCycle}
              disabled={isResettingCycle}
              className="w-full sm:w-auto px-6 py-3 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow-md transition-all inline-flex items-center justify-center gap-2"
            >
              <RotateCcw className={`w-4 h-4 ${isResettingCycle ? 'animate-spin' : ''}`} />
              <span>{isResettingCycle ? 'Starting New Cycle...' : 'Start a New Cycle'}</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('dashboard')}
              className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl border border-slate-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pre-Examination Instructions View (Requires Candidate Confirmation before starting countdown timer)
  if (!isExamStarted) {
    const nextQCount = rotationStatus?.nextExamQuestionCount || 90;
    const completedCount = rotationStatus?.completedQuestionCount || 0;
    const totalEligible = rotationStatus?.totalEligibleQuestions || 400;
    const remainingUnseen = rotationStatus?.remainingQuestionCount || 0;
    const examSeq = rotationStatus?.nextExamNumber || 1;
    const currentCycle = rotationStatus?.currentCycle || 1;

    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6" id="main-content">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#D9E1EF]">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#EEF4FF] text-[#1749E8] text-xs font-bold border border-[#D9E1EF] mb-2">
              <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Official SSC MTS Pattern</span>
              <span>·</span>
              <span>Mock Examination #{examSeq}</span>
              <span>·</span>
              <span>Cycle {currentCycle}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172033] tracking-tight">
              SSC MTS Tier-I Mock Examination #{examSeq}
            </h1>
            <p className="text-xs sm:text-sm text-[#53627A] mt-1">
              Read the examination instructions below carefully. The timer will start only after your confirmation.
            </p>
          </div>

          <div className="shrink-0">
            <AudioToolbar textToRead={mockExamInstructions} label="Listen to examination instructions" />
          </div>
        </div>

        {/* Screen Navigation Disclaimer */}
        <ScreenNavigationDisclaimer
          screenId="MOCK_EXAM"
          screenTitle="SSC MTS Mock Examination Instructions"
          description="Official SSC MTS computer-based test instructions. You can start the exam, review rotation status, or exit to dashboard."
          actions={[
            {
              label: 'Start Official Mock Exam',
              opens: 'Begins the timed full SSC MTS CBT examination and starts question 1.',
              shortcut: 'Enter',
              voiceCommand: 'Say "Start Exam" or "Begin Test"'
            },
            {
              label: 'Listen to Instructions',
              opens: 'Reads aloud the complete exam structure, session timings, and marking criteria.',
              voiceCommand: 'Say "Read Instructions"'
            },
            {
              label: 'Return to Candidate Dashboard',
              opens: 'Exits the mock exam screen back to candidate overview.',
              shortcut: 'Alt + D',
              voiceCommand: 'Say "Dashboard"'
            },
            {
              label: 'Stop Reading',
              opens: 'Immediately halts audio output.',
              shortcut: 'Escape',
              voiceCommand: 'Say "Stop"'
            }
          ]}
        />

        {/* Persistent Question Rotation Information Panel */}
        <div className="p-5 rounded-2xl bg-white border-2 border-[#D9E1EF] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                  Question Rotation Engine
                </span>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                  Current Cycle: {currentCycle}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#172033] mt-1.5">
                Mock Examination {examSeq}
              </h2>
              <p className="text-xs text-[#53627A]">
                Persistent non-repeating allocation. Questions you complete are locked for this cycle so you always practice fresh problems.
              </p>
            </div>

            <div className="shrink-0 text-left sm:text-right">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Allocation Size</span>
              <span className="text-xl sm:text-2xl font-black text-blue-700 font-mono">
                {nextQCount} Questions
              </span>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block font-semibold">Completed in Cycle</span>
              <strong className="text-base text-slate-900 font-mono font-extrabold">
                {completedCount} / {totalEligible}
              </strong>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-emerald-700 block font-semibold">Unseen Remaining</span>
              <strong className="text-base text-emerald-900 font-mono font-extrabold">
                {remainingUnseen}
              </strong>
            </div>

            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
              <span className="text-purple-700 block font-semibold">Examination Progress</span>
              <strong className="text-base text-purple-900 font-mono font-extrabold">
                Exam #{examSeq}
              </strong>
            </div>

            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
              <span className="text-blue-700 block font-semibold">Timer Allocation</span>
              <strong className="text-base text-blue-900 font-mono font-extrabold">
                {Math.round((nextQCount * (isPwD ? 80 : 60)) / 60)} Minutes
              </strong>
            </div>
          </div>

          {/* Remaining-Question Warning when fewer than 90 questions remain */}
          {nextQCount < 90 && nextQCount > 0 && (
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-300 text-amber-900 text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Remaining-Question Accommodation:</strong> Only {nextQCount} new questions remain in your current question cycle. This examination will contain exactly {nextQCount} questions with proportional timer ({Math.round((nextQCount * (isPwD ? 80 : 60)) / 60)} minutes) and scoring ({nextQCount * 3} max marks).
              </div>
            </div>
          )}
        </div>

        {/* Instructions Cards: Session I & Session II */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Session I Card */}
          <div className="p-5 rounded-2xl bg-white border-2 border-[#D9E1EF] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-md bg-blue-50 text-[#1749E8] text-xs font-bold border border-blue-200">
                Session I (Qualifying)
              </span>
              <span className="text-xs font-bold text-slate-500">45 Minutes (or Proportional)</span>
            </div>
            <h2 className="text-base font-extrabold text-[#172033]">
              Math &amp; Reasoning Ability
            </h2>
            <ul className="text-xs text-[#53627A] space-y-2">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Numerical &amp; Mathematical Ability</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Reasoning Ability &amp; Problem Solving</span>
              </li>
              <li className="flex items-start gap-2 text-emerald-700 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                <span>✓ Marking: +3 Marks per correct answer. NO Negative Marking in Session I.</span>
              </li>
            </ul>
          </div>

          {/* Session II Card */}
          <div className="p-5 rounded-2xl bg-white border-2 border-[#D9E1EF] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-md bg-purple-50 text-[#6241C8] text-xs font-bold border border-purple-200">
                Session II (Merit Scoring)
              </span>
              <span className="text-xs font-bold text-slate-500">45 Minutes (or Proportional)</span>
            </div>
            <h2 className="text-base font-extrabold text-[#172033]">
              General Awareness &amp; English
            </h2>
            <ul className="text-xs text-[#53627A] space-y-2">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>General Awareness</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>English Language &amp; Comprehension</span>
              </li>
              <li className="flex items-start gap-2 text-red-700 font-bold bg-red-50 p-2 rounded-lg border border-red-200">
                <span>⚠️ Marking: +3 Marks per correct answer. -1 Negative Mark for incorrect answer.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* PwD Notice */}
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-300 text-amber-900 text-xs space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <span>♿ PwD / Compensatory Time Allocation:</span>
          </div>
          <p>
            {isPwD
              ? 'Candidate is eligible for compensatory time under RPwD Act 2016 (+20 minutes per hour applied proportionally).'
              : 'Standard examination duration allocated proportionally (60 seconds per question). Compensatory time can be enabled in Accessibility Settings.'}
          </p>
        </div>

        {/* Start Confirmation Bar */}
        <div className="p-6 bg-white rounded-2xl border-2 border-[#1749E8] shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-extrabold text-[#172033]">
              Ready to begin Mock Examination #{examSeq}?
            </p>
            <p className="text-xs text-[#53627A] mt-0.5">
              Click below or say <strong className="text-[#1749E8] font-mono">&ldquo;Start Examination&rdquo;</strong> to activate the timer.
            </p>
          </div>

          <button
            type="button"
            onClick={handleStartExam}
            disabled={isStartingExam}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#1749E8] hover:bg-[#123BB8] disabled:opacity-50 text-white font-extrabold text-sm shadow-md transition-all active:scale-98 focus:ring-4 focus:ring-[#1749E8]/30 inline-flex items-center justify-center gap-2"
          >
            <Play className={`w-4 h-4 ${isStartingExam ? 'animate-spin' : ''}`} />
            <span>{isStartingExam ? 'Allocating Questions...' : `Confirm & Start Exam #${examSeq}`}</span>
          </button>
        </div>
      </div>
    );
  }

  // Active Examination View
  if (!currentQ) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-600" id="main-content">
        Initializing questions...
      </div>
    );
  }

  let answeredCount = 0;
  let markedCount = 0;
  Object.values(answers).forEach((a) => {
    if (a.selectedOption) answeredCount++;
    if (a.markedForReview) markedCount++;
  });

  const questionSpeech = `Question ${currentIdx + 1}: ${currentQ.question_text}. Option A: ${currentQ.option_a}. Option B: ${currentQ.option_b}. Option C: ${currentQ.option_c}. Option D: ${currentQ.option_d}.`;

  const options = [
    { key: 'A', text: currentQ.option_a },
    { key: 'B', text: currentQ.option_b },
    { key: 'C', text: currentQ.option_c },
    { key: 'D', text: currentQ.option_d }
  ];

  const currentSelection = answers[currentQ.question_id]?.selectedOption;
  const isMarked = answers[currentQ.question_id]?.markedForReview;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6" id="main-content">
      {/* 1. Examination Countdown & PwD Timer Header */}
      <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-400 uppercase">
              Official Simulation · Screen 7 of 16
            </span>
            <span className="text-xs font-bold bg-blue-600/80 text-white px-2 py-0.5 rounded">
              Mock Exam #{currentAttempt?.attemptSequence || 1}
            </span>
            <span className="text-xs font-bold bg-slate-700 text-slate-200 px-2 py-0.5 rounded">
              Cycle {currentAttempt?.cycleNumber || 1}
            </span>
            {isBlindMode && (
              <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-400 text-slate-900 rounded-md flex items-center gap-1">
                <Mic className="w-3 h-3 text-red-700 animate-pulse" />
                Hands-Free Voice Active
              </span>
            )}
          </div>
          <h1 className="text-lg font-bold">
            SSC MTS Tier-I Mock Examination #{currentAttempt?.attemptSequence || 1} ({questions.length} Questions)
          </h1>
          <p className="text-xs text-slate-300">
            Session I (Math/Reasoning: No Negative) &amp; Session II (GK/English: -1 Mark Penalty)
          </p>
        </div>

        {/* Pinned Accessible Timer */}
        <div className="flex items-center gap-3">
          <div
            role="timer"
            aria-live="polite"
            aria-label={`Time Remaining: ${formatTime(secondsRemaining)}`}
            className="flex items-center gap-3 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700"
          >
            <Clock className={`w-5 h-5 ${secondsRemaining < 600 ? 'text-red-400 animate-pulse' : 'text-amber-400'}`} />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Time Remaining</span>
              <span className="text-xl font-mono font-black tracking-widest text-white">
                {formatTime(secondsRemaining)}
              </span>
            </div>
            {isPwD && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-400 text-slate-900 rounded ml-2">
                PwD Compensatory Time
              </span>
            )}
          </div>

          {/* Dedicated Keyboard Exit Button */}
          <button
            type="button"
            onClick={() => requestExamExit()}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold border border-red-500 shadow-sm transition-colors focus:ring-2 focus:ring-red-400"
            title="Exit Examination (Alt+Shift+X)"
            aria-label="Exit examination. Keyboard shortcut: Alt+Shift+X. Voice command: Say 'Exit Exam'"
          >
            <LogOut className="w-4 h-4" />
            <span>Exit Exam</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 bg-red-800 text-red-100 rounded text-[10px] font-mono">Alt+Shift+X</kbd>
          </button>

          <button
            type="button"
            onClick={() => setShowDiscardModal(true)}
            className="p-2.5 bg-slate-800 hover:bg-rose-900 text-slate-400 hover:text-white rounded-lg border border-slate-700 transition-colors"
            title="Discard examination and release questions"
            aria-label="Discard examination and release questions"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Screen Navigation Disclaimer */}
      <ScreenNavigationDisclaimer
        screenId="MOCK_EXAM"
        screenTitle="Active Mock Examination Navigation"
        description="Official computer-based test interface. Navigate questions, record responses, flag for review, and submit via speech or keyboard."
        actions={[
          {
            label: 'Exit Examination',
            opens: 'Asks confirmation to submit current answers, score the test, and exit the examination.',
            shortcut: 'Alt + Shift + X',
            voiceCommand: 'Say "Exit Exam" or "Exit Examination"'
          },
          {
            label: 'Option A, B, C, or D',
            opens: 'Selects your chosen answer option for this question.',
            shortcut: 'Keys A, B, C, D or 1, 2, 3, 4',
            voiceCommand: 'Say "Option A", "Option B", "Option C", or "Option D"'
          },
          {
            label: 'Next Question / Previous Question',
            opens: `Navigates forward or backward through the ${questions.length} questions.`,
            shortcut: 'Enter or Right/Left Arrow',
            voiceCommand: 'Say "Next" or "Previous"'
          },
          {
            label: 'Mark for Review',
            opens: 'Toggles review flag for the current question in the palette.',
            shortcut: 'Alt + H',
            voiceCommand: 'Say "Mark for Review"'
          },
          {
            label: 'Repeat Question & Options',
            opens: 'Reads the question prompt, subject, and all 4 options aloud.',
            shortcut: 'Spacebar or Alt + R',
            voiceCommand: 'Say "Repeat Question" or "Repeat"'
          },
          {
            label: 'Repeat Options Only',
            opens: 'Reads only the 4 answer choices aloud.',
            shortcut: 'Alt + O',
            voiceCommand: 'Say "Repeat Options"'
          },
          {
            label: 'Check Time Remaining',
            opens: 'Speaks remaining exam time and current question number.',
            voiceCommand: 'Say "Time Remaining" or "Timer"'
          },
          {
            label: 'Submit Final Examination',
            opens: 'Submits answers, completes exam, and generates comprehensive scorecard.',
            voiceCommand: 'Say "Submit Exam"'
          },
          {
            label: 'Stop Reading',
            opens: 'Immediately silences speech playback across all screens.',
            shortcut: 'Escape',
            voiceCommand: 'Say "Stop"'
          }
        ]}
      />

      {/* 2. Main Exam Grid Layout: Left Question Area (8 cols) + Right Palette (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Question Box */}
        <div className="lg:col-span-8 bg-white border-2 border-slate-300 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Question Header & Speech Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                Question {currentIdx + 1} of {questions.length}
              </span>
              <span className="mx-2 text-slate-400">·</span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-900 rounded">
                {currentQ.subject}
              </span>
            </div>

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
                    aria-label={isPausedSpeaking ? 'Resume audio' : 'Pause audio'}
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
                    aria-label="Stop audio"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop</span>
                  </button>
                </>
              )}

              <AudioToolbar textToRead={questionSpeech} label="Read exam question aloud" />
              <VoiceInputButton
                onTranscriptConfirmed={(txt) => {
                  const parsed = parseSpokenAnswer(txt, {
                    A: currentQ.option_a,
                    B: currentQ.option_b,
                    C: currentQ.option_c,
                    D: currentQ.option_d
                  });
                  if (parsed && parsed.type === 'option') {
                    handleRecordOption(parsed.option);
                  }
                }}
                label="Voice Answer"
              />
            </div>
          </div>

          {/* Question Text */}
          <div className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed max-w-prose">
            {currentQ.question_text}
          </div>

          {/* Answer Options Radio Group */}
          <div role="radiogroup" aria-label="Multiple choice options" className="space-y-3">
            {options.map((opt) => {
              const isSelected = currentSelection === opt.key;
              return (
                <div
                  key={opt.key}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onClick={() => handleRecordOption(opt.key)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleRecordOption(opt.key)}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-blue-700 bg-blue-50/70 ring-2 ring-blue-600 shadow-xs'
                      : 'border-slate-300 hover:border-slate-400 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {opt.key}
                    </span>
                    <span className="text-sm font-medium text-slate-900">{opt.text}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      title={`Read Option ${opt.key} aloud`}
                      aria-label={`Read Option ${opt.key} aloud: ${opt.text}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        repeatSingleOptionAloud(currentQ, opt.key as any);
                      }}
                      className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors focus:ring-2 focus:ring-blue-600"
                    >
                      <Volume2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-700" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Row */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearResponse}
                disabled={!currentSelection}
                className="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 disabled:opacity-30"
              >
                Clear Response
              </button>
              <button
                type="button"
                onClick={handleToggleMarkForReview}
                className={`px-3 py-2 text-xs font-bold rounded-lg border flex items-center gap-1.5 ${
                  isMarked
                    ? 'bg-purple-100 text-purple-900 border-purple-400'
                    : 'bg-white text-purple-700 hover:bg-purple-50 border-purple-300'
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{isMarked ? 'Marked for Review' : 'Mark for Review & Next (M)'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => currentIdx > 0 && setCurrentIdx(currentIdx - 1)}
                disabled={currentIdx === 0}
                className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 disabled:opacity-30"
                aria-label="Previous question (P or Left Arrow)"
                title="Previous question (P or Left Arrow)"
              >
                Previous (P)
              </button>
              <button
                type="button"
                onClick={() => currentIdx < questions.length - 1 && setCurrentIdx(currentIdx + 1)}
                disabled={currentIdx === questions.length - 1}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs disabled:opacity-30"
                aria-label="Save and proceed to next question (N or Enter)"
                title="Save & Next (N or Enter)"
              >
                Save &amp; Next (N / Enter)
              </button>
            </div>
          </div>
        </div>

        {/* Right: Question Navigation Palette */}
        <div className="lg:col-span-4 bg-white border-2 border-slate-300 rounded-2xl p-5 space-y-4 shadow-sm h-fit">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900">Question Palette</h2>
            <span className="text-xs font-bold text-blue-700">
              {answeredCount}/{questions.length} Attempted
            </span>
          </div>

          {/* Palette Legend */}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-700">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-emerald-600"></span>
              <span>Answered ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-purple-600"></span>
              <span>Marked for Review ({markedCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-slate-200 border border-slate-300"></span>
              <span>Not Answered ({questions.length - answeredCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded border-2 border-blue-700"></span>
              <span>Current</span>
            </div>
          </div>

          {/* Question Grid Buttons */}
          <div
            role="region"
            aria-label="Question Navigator Grid"
            className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 max-h-80 overflow-y-auto p-1 border border-slate-200 rounded-lg"
          >
            {questions.map((q, idx) => {
              const a = answers[q.question_id];
              const isCurrent = idx === currentIdx;
              let bg = 'bg-slate-100 text-slate-800 border-slate-300';
              if (a?.selectedOption && a?.markedForReview) {
                bg = 'bg-purple-600 text-white border-purple-700';
              } else if (a?.selectedOption) {
                bg = 'bg-emerald-600 text-white border-emerald-700';
              } else if (a?.markedForReview) {
                bg = 'bg-purple-200 text-purple-900 border-purple-400';
              }

              return (
                <button
                  key={q.question_id}
                  type="button"
                  onClick={() => setCurrentIdx(idx)}
                  aria-label={`Jump to Question ${idx + 1}. ${a?.selectedOption ? 'Answered' : 'Not answered'}`}
                  className={`h-9 text-xs font-bold rounded flex items-center justify-center border transition-all ${bg} ${
                    isCurrent ? 'ring-2 ring-blue-700 ring-offset-1 font-black scale-105' : 'hover:opacity-80'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Big Final Submit Button */}
          <button
            type="button"
            onClick={() => setShowSubmitModal(true)}
            className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Submit Full Examination</span>
          </button>

          {/* Dedicated Keyboard Exit Examination Button */}
          <button
            type="button"
            onClick={() => requestExamExit()}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 font-bold text-xs rounded-xl border border-slate-300 hover:border-red-300 transition-colors flex items-center justify-center gap-2"
            aria-label="Exit examination. Shortcut: Alt+Shift+X. Voice: Say Exit Exam"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Examination</span>
            <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded text-[10px] font-mono">Alt+Shift+X</kbd>
          </button>
        </div>
      </div>

      {/* ── Inline Exam Exit Confirmation Banner (Alt+Shift+X or voice "exit exam") ── */}
      {showExitConfirm && (
        <div
          role="alertdialog"
          aria-modal="false"
          aria-labelledby="exam-exit-confirm-title"
          aria-describedby="exam-exit-confirm-desc"
          className="mx-4 mb-4 p-4 bg-amber-50 border-2 border-amber-500 rounded-2xl shadow-lg"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <h3 id="exam-exit-confirm-title" className="text-sm font-bold text-amber-800 mb-1">
                Exit Examination?
              </h3>
              <p id="exam-exit-confirm-desc" className="text-xs text-amber-700 leading-relaxed mb-3">
                You are currently taking an examination. Do you want to <strong>submit your answers and exit</strong>?
                Your answers so far will be saved and scored.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleFinalSubmit()}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                  aria-label="Yes, submit answers and exit examination"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  {isSubmitting ? 'Submitting...' : 'Yes, Submit & Exit (Y)'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExitConfirm(false);
                    showExitConfirmRef.current = false;
                    setPendingExitDestination(null);
                    const msg = 'Exit cancelled. Continuing your Mock Examination.';
                    announce(msg, 'polite');
                    speakText(msg);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-amber-800 bg-white hover:bg-amber-100 rounded-lg border border-amber-300 transition-all"
                  aria-label="No, cancel exit and continue examination"
                >
                  No, Continue Exam (N)
                </button>
                <span className="text-xs text-amber-600 ml-auto">Press <kbd className="font-mono font-bold">Y</kbd> to submit · <kbd className="font-mono font-bold">N</kbd> or <kbd className="font-mono font-bold">Esc</kbd> to cancel</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discard Attempt Dialog */}
      {showDiscardModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-discard-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl border-2 border-rose-600 max-w-md w-full p-6 shadow-2xl text-slate-900 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 id="confirm-discard-title" className="text-lg font-bold flex items-center gap-2 text-rose-700">
                <Trash2 className="w-5 h-5" />
                Discard Mock Examination?
              </h3>
              <button
                type="button"
                onClick={() => setShowDiscardModal(false)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Are you sure you want to discard this examination? All your current answers and timer progress will be cancelled, and these {questions.length} questions will be released back to your unseen question pool.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDiscardModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300"
              >
                Resume Exam
              </button>
              <button
                type="button"
                onClick={handleDiscardExam}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-xs"
              >
                Yes, Discard Attempt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Submission Confirmation Dialog */}
      {showSubmitModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-submit-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl border-2 border-emerald-600 max-w-md w-full p-6 shadow-2xl text-slate-900 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 id="confirm-submit-title" className="text-lg font-bold flex items-center gap-2 text-slate-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Confirm Final Submission
              </h3>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Examination:</span>
                <strong className="text-blue-700 font-bold">Mock Exam #{currentAttempt?.attemptSequence || 1}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Total Questions:</span>
                <strong className="text-slate-900">{questions.length}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Answered Questions:</span>
                <strong className="text-emerald-700">{answeredCount}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Marked for Review:</span>
                <strong className="text-purple-700">{markedCount}</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Unanswered Questions:</span>
                <strong className="text-red-600">{questions.length - answeredCount}</strong>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Are you sure you want to finish Mock Examination #{currentAttempt?.attemptSequence || 1}? Once submitted, your scores for Session I (Qualifying) and Session II (Merit) will be calculated and answers locked.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300"
              >
                Return to Exam
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs"
              >
                {isSubmitting ? 'Evaluating...' : 'Yes, Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
