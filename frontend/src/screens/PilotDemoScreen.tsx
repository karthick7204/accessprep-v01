import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Flag,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Volume2,
  Pause,
  Play,
  Square,
  List,
  Award,
  BarChart2,
  Target,
  History,
  BookOpen,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  HelpCircle,
  Headphones,
  Check,
  LogOut
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext.tsx';
import { VoiceInputButton } from '../components/VoiceInputButton.tsx';
import { AudioToolbar } from '../components/AudioToolbar.tsx';
import { AccessibleExplanationCard } from '../components/common/AccessibleExplanationCard.tsx';
import { Question, DiagnosticAttempt } from '../db/database.ts';
import {
  DIAGNOSTIC_SECTIONS,
  PILOT_DEMO_DURATION_SECONDS,
  PILOT_DEMO_TOTAL_QUESTIONS,
  PILOT_DEMO_MAX_SCORE,
  DiagnosticSectionId,
  DiagnosticRecommendation,
  DiagnosticQuestionResponse,
  getSectionForSubject
} from '../utils/pilotDemoScoring.ts';
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
  AcceptanceStatus,
  AcceptanceMethod,
  PILOT_DEMO_FULL_INSTRUCTIONS_SPEECH,
  VOICE_LISTENING_FEEDBACK,
  VOICE_ACCEPTED_FEEDBACK,
  VOICE_STARTING_FEEDBACK,
  VOICE_AMBIGUOUS_FEEDBACK,
  VOICE_MIC_DENIED_FEEDBACK,
  evaluateVoiceAcceptanceCommand,
  applyCheckboxAcceptanceToggle,
  isReadyToBeginTest
} from '../utils/pilotDemoAcceptance.ts';
import {
  matchScreenNavigation,
  parseSystemControl,
  parseAssistanceIntent
} from '../voice/commandParser.ts';
import {
  ExamInteractionState,
  PILOT_DEMO_START_CONFIRM_PROMPT,
  PILOT_DEMO_STARTED_SPEECH,
  PILOT_DEMO_START_CANCELLED_SPEECH,
  PILOT_DEMO_START_UNCLEAR_PROMPT,
  PILOT_DEMO_SUBMIT_CONFIRM_PROMPT,
  PILOT_DEMO_SUBMITTED_SPEECH,
  PILOT_DEMO_SUBMIT_CANCELLED_SPEECH,
  PILOT_DEMO_SUBMIT_UNCLEAR_PROMPT,
  PILOT_DEMO_ALREADY_COMPLETED_SPEECH,
  normalizeExamCommand,
  isStartExamRequestPhrase,
  isStartConfirmPhrase,
  isStartCancelPhrase,
  isSubmitExamRequestPhrase,
  isSubmitConfirmPhrase,
  isSubmitCancelPhrase
} from '../voice/examContextResolver.ts';
import { Mic } from 'lucide-react';

type PilotDemoView = 'instructions' | 'exam' | 'results' | 'history';

interface EnrichedDiagnosticAttempt extends DiagnosticAttempt {
  enrichedResponses?: (DiagnosticQuestionResponse & {
    questionText?: string;
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;
    explanation?: string;
  })[];
}

interface AnswerEntry {
  selectedOption: string | null;
  timeSpentSeconds: number;
  markedForReview: boolean;
}

export function PilotDemoScreen() {
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
    stopVoiceListening,
    isVoiceListening,
    micPermissionStatus,
    registerVoiceHandler,
    setIsExamActive,
    pendingExamExit
  } = useAccessibility();

  const uid = user?.id || 'usr_candidate_01';
  const sessionKey = `pilot_demo_active_session_${uid}`;

  // Determine initial view based on URL hash, sessionStorage, or active exam recovery
  const getInitialView = (): PilotDemoView => {
    try {
      const hash = window.location.hash.replace('#', '');
      const params = new URLSearchParams(hash);
      const viewParam = params.get('view') as PilotDemoView | null;
      if (viewParam && ['instructions', 'exam', 'results', 'history'].includes(viewParam)) {
        return viewParam;
      }
      const savedSession = sessionStorage.getItem(sessionKey);
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.phase === 'exam') {
          return 'exam';
        }
      }
    } catch {}
    return 'instructions';
  };

  const [view, setView] = useState<PilotDemoView>(getInitialView);

  const switchView = useCallback((newView: PilotDemoView, attemptId?: string) => {
    setView(newView);
    try {
      sessionStorage.setItem('pilot_demo_initial_view', newView);
      if (attemptId) {
        sessionStorage.setItem('pilot_demo_view_attempt_id', attemptId);
        window.location.hash = `screen=pilot_demo&view=${newView}&attemptId=${attemptId}`;
      } else {
        window.location.hash = `screen=pilot_demo&view=${newView}`;
      }
    } catch {}
  }, []);
  const [acceptanceStatus, setAcceptanceStatus] = useState<AcceptanceStatus>('NOT_ACCEPTED');
  const [acceptanceMethod, setAcceptanceMethod] = useState<AcceptanceMethod | null>(null);
  const [acceptanceFeedback, setAcceptanceFeedback] = useState<string>('');
  const instructionsAccepted = isReadyToBeginTest(acceptanceStatus) || acceptanceStatus === 'STARTING_EXAM' || acceptanceStatus === 'EXAM_IN_PROGRESS';

  // Questions & Exam State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerEntry>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(PILOT_DEMO_DURATION_SECONDS);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [clientSubmissionId, setClientSubmissionId] = useState<string>(() => `sub_${Date.now()}`);
  const [interactionState, setInteractionState] = useState<ExamInteractionState>('PILOT_INTRODUCTION');
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Inline exit confirmation (triggered by Alt+Shift+X or voice "exit exam")
  const [showExitConfirmPD, setShowExitConfirmPD] = useState(false);
  const [pendingExitDestPD, setPendingExitDestPD] = useState<string | null>(null);
  const showExitConfirmPDRef = useRef(false);

  // Results & History State
  const [attempts, setAttempts] = useState<EnrichedDiagnosticAttempt[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<EnrichedDiagnosticAttempt | null>(null);
  const [recommendations, setRecommendations] = useState<DiagnosticRecommendation[]>([]);
  const [historicalSummaryNote, setHistoricalSummaryNote] = useState<string>('');
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [questionReviewFilter, setQuestionReviewFilter] = useState<'all' | 'correct' | 'incorrect' | 'unanswered'>('all');

  // Interactive Sequential Wrong-Answer Explanation Dialogue (Section 6)
  const [explanationActive, setExplanationActive] = useState<boolean>(false);
  const [wrongQuestionIdx, setWrongQuestionIdx] = useState<number>(0);
  const [simplifiedMode, setSimplifiedMode] = useState<boolean>(false);
  const [dialogueDone, setDialogueDone] = useState<boolean>(false);
  const explanationActiveRef = useRef<boolean>(false);
  explanationActiveRef.current = explanationActive;
  const wrongQuestionIdxRef = useRef<number>(0);
  wrongQuestionIdxRef.current = wrongQuestionIdx;
  const dialogueDoneRef = useRef<boolean>(false);
  dialogueDoneRef.current = dialogueDone;

  const wrongQuestions = useMemo(() => {
    if (!selectedAttempt?.enrichedResponses) return [];
    return selectedAttempt.enrichedResponses.filter((r) => !r.isCorrect);
  }, [selectedAttempt]);
  const wrongQuestionsRef = useRef(wrongQuestions);
  wrongQuestionsRef.current = wrongQuestions;

  // Refs for voice and timer callbacks
  const viewRef = useRef<PilotDemoView>(view);
  viewRef.current = view;
  const currentIdxRef = useRef<number>(currentIdx);
  currentIdxRef.current = currentIdx;
  const questionsRef = useRef<Question[]>(questions);
  questionsRef.current = questions;
  const secondsRemainingRef = useRef<number>(secondsRemaining);
  secondsRemainingRef.current = secondsRemaining;
  const questionEnterTimeRef = useRef<number>(Date.now());
  const isSubmittingRef = useRef<boolean>(false);
  const acceptanceStatusRef = useRef<AcceptanceStatus>(acceptanceStatus);
  acceptanceStatusRef.current = acceptanceStatus;
  const acceptanceMethodRef = useRef<AcceptanceMethod | null>(acceptanceMethod);
  acceptanceMethodRef.current = acceptanceMethod;
  const acceptedAtRef = useRef<string | null>(null);
  const examStartedAtRef = useRef<string | null>(null);
  const examStartedLockRef = useRef<boolean>(false);
  const suppressInitialAutoReadRef = useRef<boolean>(false);
  const hasAutoReadInstructionsRef = useRef<boolean>(false);
  const beginInputMethodRef = useRef<AcceptanceMethod>('CHECKBOX');
  const interactionStateRef = useRef<ExamInteractionState>(interactionState);
  interactionStateRef.current = interactionState;
  const showStartConfirmRef = useRef<boolean>(showStartConfirm);
  showStartConfirmRef.current = showStartConfirm;
  const showSubmitConfirmRef = useRef<boolean>(showSubmitConfirm);
  showSubmitConfirmRef.current = showSubmitConfirm;

  // Load 20 diagnostic questions and candidate's past diagnostic attempts
  const fetchDiagnosticData = useCallback(async () => {
    setLoadingQuestions(true);
    setLoadingHistory(true);
    try {
      const [qRes, attRes] = await Promise.all([
        fetch('/api/diagnostic/questions'),
        fetch(`/api/diagnostic/attempts?userId=${uid}`)
      ]);

      if (qRes.ok) {
        const qData = await qRes.json();
        const loadedQuestions: Question[] = qData.questions || [];
        setQuestions(loadedQuestions);

        // Check if we have an active exam in sessionStorage to restore
        let restored = false;
        try {
          const rawSaved = sessionStorage.getItem(sessionKey);
          if (rawSaved) {
            const parsed = JSON.parse(rawSaved);
            if (parsed && parsed.phase === 'exam' && parsed.answers) {
              setAnswers(parsed.answers);
              setCurrentIdx(Number(parsed.currentIdx) || 0);
              setSecondsRemaining(
                typeof parsed.secondsRemaining === 'number'
                  ? parsed.secondsRemaining
                  : PILOT_DEMO_DURATION_SECONDS
              );
              if (parsed.clientSubmissionId) {
                setClientSubmissionId(parsed.clientSubmissionId);
              }
              if (parsed.acceptanceMethod) {
                setAcceptanceMethod(parsed.acceptanceMethod);
                acceptanceMethodRef.current = parsed.acceptanceMethod;
              }
              if (parsed.acceptedAt) acceptedAtRef.current = parsed.acceptedAt;
              if (parsed.examStartedAt) examStartedAtRef.current = parsed.examStartedAt;
              examStartedLockRef.current = true;
              setAcceptanceStatus('EXAM_IN_PROGRESS');
              acceptanceStatusRef.current = 'EXAM_IN_PROGRESS';
              setView('exam');
              setTimerRunning(true);
              restored = true;
              announce('Pilot Demo Diagnostic session restored. Your answers and remaining time were recovered.', 'polite');
            }
          }
        } catch {}

        if (!restored) {
          const initialMap: Record<string, AnswerEntry> = {};
          loadedQuestions.forEach((q) => {
            initialMap[q.question_id] = {
              selectedOption: null,
              timeSpentSeconds: 0,
              markedForReview: false
            };
          });
          setAnswers(initialMap);
        }
      }

      if (attRes.ok) {
        const attData = await attRes.json();
        const list: EnrichedDiagnosticAttempt[] = attData.attempts || [];
        setAttempts(list);
        setRecommendations(attData.recommendations || []);
        setHistoricalSummaryNote(attData.historicalSummaryNote || '');

        const hash = window.location.hash.replace('#', '');
        const params = new URLSearchParams(hash);
        const urlAttemptId = params.get('attemptId');
        const requestedAttemptId = urlAttemptId || sessionStorage.getItem('pilot_demo_view_attempt_id');
        if (requestedAttemptId) {
          const found = list.find((a) => a.id === requestedAttemptId);
          setSelectedAttempt(found || list[0] || null);
        } else if (list.length > 0) {
          setSelectedAttempt((prev) => prev || list[0]);
        }
      }
    } catch (err) {
      console.warn('Error loading Pilot Demo Diagnostic data:', err);
    } finally {
      setLoadingQuestions(false);
      setLoadingHistory(false);
    }
  }, [uid, sessionKey, announce]);

  useEffect(() => {
    fetchDiagnosticData();
  }, [fetchDiagnosticData]);

  // Register active exam guard with AccessibilityContext during active 'exam' phase
  // and ensure VoiceEngine is actively listening on Pilot Demo screens
  useEffect(() => {
    const active = view === 'exam';
    setIsExamActive(active);
    startVoiceListening();
    return () => {
      setIsExamActive(false);
    };
  }, [view, setIsExamActive, startVoiceListening]);

  // Synchronize global pendingExamExit requests (e.g. from sidebar or navigation shortcuts)
  useEffect(() => {
    if (pendingExamExit && view === 'exam') {
      setShowExitConfirmPD(true);
      showExitConfirmPDRef.current = true;
      setPendingExitDestPD(pendingExamExit.destination);
    }
  }, [pendingExamExit, view]);

  // Persist active exam state to sessionStorage on change
  useEffect(() => {
    if (view === 'exam' && questions.length > 0) {
      try {
        sessionStorage.setItem(
          sessionKey,
          JSON.stringify({
            phase: 'exam',
            answers,
            currentIdx,
            secondsRemaining,
            clientSubmissionId,
            acceptanceMethod: acceptanceMethodRef.current,
            acceptedAt: acceptedAtRef.current,
            examStartedAt: examStartedAtRef.current
          })
        );
      } catch {}
    }
  }, [view, questions.length, answers, currentIdx, secondsRemaining, clientSubmissionId, sessionKey]);

  // Track time spent on current question when switching questions
  const recordElapsedOnCurrentQuestion = useCallback(() => {
    const q = questionsRef.current[currentIdxRef.current];
    if (!q) return;
    const elapsedSec = Math.max(1, Math.round((Date.now() - questionEnterTimeRef.current) / 1000));
    questionEnterTimeRef.current = Date.now();
    setAnswers((prev) => {
      const existing = prev[q.question_id] || {
        selectedOption: null,
        timeSpentSeconds: 0,
        markedForReview: false
      };
      return {
        ...prev,
        [q.question_id]: {
          ...existing,
          timeSpentSeconds: existing.timeSpentSeconds + elapsedSec
        }
      };
    });
  }, []);

  const answersRef = useRef<Record<string, AnswerEntry>>(answers);
  answersRef.current = answers;

  // Audio helpers for active question (declared before exam start so Question 1 can auto-read)
  const readQuestionAloud = useCallback(
    (q: Question, idx: number, total: number) => {
      if (!q) return;
      const prompt = formatFullQuestionPrompt(q, idx, total);
      announce(`Reading Question ${idx + 1} of ${total}: ${q.subject}`, 'polite');
      speakText(prompt, () => {
        playBeacon('listening');
        startVoiceListening();
      });
    },
    [announce, speakText, playBeacon, startVoiceListening]
  );

  // Begin Diagnostic Examination (Timer starts ONLY when called; guarded against duplicates)
  const handleBeginDiagnostic = useCallback(
    (method: AcceptanceMethod = 'CHECKBOX') => {
      if (examStartedLockRef.current || questionsRef.current.length === 0) {
        return;
      }
      if (
        method !== 'VOICE' &&
        acceptanceStatusRef.current !== 'ACCEPTED'
      ) {
        return;
      }

      // 1-2. Immediately cancel instruction playback & ensure mic listening stays active
      examStartedLockRef.current = true;
      stopSpeaking();
      startVoiceListening();

      // 3-6. Record acceptance & transition state machine through STARTING_EXAM -> EXAM_IN_PROGRESS
      const nowIso = new Date().toISOString();
      if (!acceptedAtRef.current) {
        acceptedAtRef.current = nowIso;
      }
      examStartedAtRef.current = nowIso;
      setAcceptanceMethod(method);
      acceptanceMethodRef.current = method;
      setAcceptanceStatus('STARTING_EXAM');
      acceptanceStatusRef.current = 'STARTING_EXAM';

      const freshSubId = `sub_${uid}_${Date.now()}`;
      setClientSubmissionId(freshSubId);

      const resetMap: Record<string, AnswerEntry> = {};
      questionsRef.current.forEach((q) => {
        resetMap[q.question_id] = {
          selectedOption: null,
          timeSpentSeconds: 0,
          markedForReview: false
        };
      });

      setAnswers(resetMap);
      answersRef.current = resetMap;
      setCurrentIdx(0);
      setSecondsRemaining(PILOT_DEMO_DURATION_SECONDS);
      setSubmitError(null);
      setShowSubmitConfirm(false);
      questionEnterTimeRef.current = Date.now();
      suppressInitialAutoReadRef.current = true;

      setAcceptanceStatus('EXAM_IN_PROGRESS');
      acceptanceStatusRef.current = 'EXAM_IN_PROGRESS';
      setInteractionState('PILOT_RUNNING');
      interactionStateRef.current = 'PILOT_RUNNING';
      setShowStartConfirm(false);
      showStartConfirmRef.current = false;
      setAcceptanceFeedback(`${PILOT_DEMO_STARTED_SPEECH} ${VOICE_STARTING_FEEDBACK}`);
      setTimerRunning(true);
      setView('exam');

      const startAnnouncement = `${PILOT_DEMO_STARTED_SPEECH} ${VOICE_STARTING_FEEDBACK}`;
      announce(startAnnouncement, 'assertive');
      playBeacon('success');

      // 10-11. Speak examination start and automatically chain into Question 1
      const firstQuestion = questionsRef.current[0];
      const total = questionsRef.current.length;
      if (firstQuestion && (method === 'VOICE' || isBlindMode || settings.autoReadAloud)) {
        speakText(startAnnouncement, () => {
          if (viewRef.current === 'exam') {
            readQuestionAloud(firstQuestion, 0, total);
          }
        });
      }
    },
    [
      uid,
      stopSpeaking,
      stopVoiceListening,
      announce,
      playBeacon,
      speakText,
      readQuestionAloud,
      isBlindMode,
      settings.autoReadAloud
    ]
  );

  // Request explicit user confirmation before starting Pilot Demo
  const requestPilotDemoStart = useCallback(
    (method: AcceptanceMethod = 'VOICE') => {
      if (examStartedLockRef.current || viewRef.current !== 'instructions') return;
      stopSpeaking();
      startVoiceListening();
      beginInputMethodRef.current = method;
      setShowStartConfirm(true);
      showStartConfirmRef.current = true;
      setInteractionState('CONFIRMING_START');
      interactionStateRef.current = 'CONFIRMING_START';
      setAcceptanceStatus('CONFIRMING_START');
      acceptanceStatusRef.current = 'CONFIRMING_START';
      setAcceptanceFeedback(PILOT_DEMO_START_CONFIRM_PROMPT);
      announce(PILOT_DEMO_START_CONFIRM_PROMPT, 'assertive');
      speakText(PILOT_DEMO_START_CONFIRM_PROMPT, () => {
        if (viewRef.current === 'instructions' && showStartConfirmRef.current) {
          playBeacon('listening');
          startVoiceListening();
        }
      });
    },
    [stopSpeaking, announce, speakText, playBeacon, startVoiceListening]
  );

  const confirmPilotDemoStart = useCallback(() => {
    if (examStartedLockRef.current) return;
    acceptedAtRef.current = new Date().toISOString();
    setShowStartConfirm(false);
    showStartConfirmRef.current = false;
    setAcceptanceStatus('ACCEPTED');
    acceptanceStatusRef.current = 'ACCEPTED';
    setInteractionState('PILOT_RUNNING');
    interactionStateRef.current = 'PILOT_RUNNING';
    handleBeginDiagnostic(beginInputMethodRef.current || 'VOICE');
  }, [handleBeginDiagnostic]);

  const cancelPilotDemoStart = useCallback(() => {
    stopSpeaking();
    setShowStartConfirm(false);
    showStartConfirmRef.current = false;
    setInteractionState('PILOT_INTRODUCTION');
    interactionStateRef.current = 'PILOT_INTRODUCTION';
    setAcceptanceStatus('WAITING_FOR_ACCEPTANCE');
    acceptanceStatusRef.current = 'WAITING_FOR_ACCEPTANCE';
    setAcceptanceFeedback(PILOT_DEMO_START_CANCELLED_SPEECH);
    announce(PILOT_DEMO_START_CANCELLED_SPEECH, 'polite');
    speakText(PILOT_DEMO_START_CANCELLED_SPEECH, () => {
      if (viewRef.current === 'instructions') {
        playBeacon('listening');
        startVoiceListening();
      }
    });
  }, [stopSpeaking, announce, speakText, playBeacon, startVoiceListening]);

  // Start reading full diagnostic instructions & enter WAITING_FOR_ACCEPTANCE on completion
  const startInstructionsVoiceFlow = useCallback(() => {
    if (viewRef.current !== 'instructions' || examStartedLockRef.current) return;
    if (
      acceptanceStatusRef.current === 'ACCEPTED' ||
      acceptanceStatusRef.current === 'STARTING_EXAM' ||
      acceptanceStatusRef.current === 'EXAM_IN_PROGRESS'
    ) {
      return;
    }

    setAcceptanceStatus('READING_INSTRUCTIONS');
    acceptanceStatusRef.current = 'READING_INSTRUCTIONS';
    setAcceptanceFeedback('Reading examination instructions aloud...');
    announce('Reading Pilot Demo Diagnostic instructions aloud.', 'polite');

    speakText(PILOT_DEMO_FULL_INSTRUCTIONS_SPEECH, () => {
      if (
        viewRef.current !== 'instructions' ||
        examStartedLockRef.current ||
        acceptanceStatusRef.current !== 'READING_INSTRUCTIONS'
      ) {
        return;
      }

      if (micPermissionStatus === 'denied' || micPermissionStatus === 'unsupported') {
        setAcceptanceStatus('WAITING_FOR_ACCEPTANCE');
        acceptanceStatusRef.current = 'WAITING_FOR_ACCEPTANCE';
        setAcceptanceFeedback(VOICE_MIC_DENIED_FEEDBACK);
        announce(VOICE_MIC_DENIED_FEEDBACK, 'assertive');
        return;
      }

      setAcceptanceStatus('WAITING_FOR_ACCEPTANCE');
      acceptanceStatusRef.current = 'WAITING_FOR_ACCEPTANCE';
      setAcceptanceFeedback(VOICE_LISTENING_FEEDBACK);
      announce(VOICE_LISTENING_FEEDBACK, 'polite');
      playBeacon('listening');
      startVoiceListening();
    });
  }, [announce, speakText, micPermissionStatus, playBeacon, startVoiceListening]);

  // Automatically read instructions in Blind Mode or when autoReadAloud is enabled
  useEffect(() => {
    if (
      view === 'instructions' &&
      !loadingQuestions &&
      questions.length > 0 &&
      (isBlindMode || settings.autoReadAloud) &&
      !hasAutoReadInstructionsRef.current &&
      !examStartedLockRef.current
    ) {
      hasAutoReadInstructionsRef.current = true;
      startInstructionsVoiceFlow();
    }
  }, [
    view,
    loadingQuestions,
    questions.length,
    isBlindMode,
    settings.autoReadAloud,
    startInstructionsVoiceFlow
  ]);

  // React to denied microphone permission on instructions view
  useEffect(() => {
    if (
      view === 'instructions' &&
      micPermissionStatus === 'denied' &&
      acceptanceStatusRef.current === 'WAITING_FOR_ACCEPTANCE'
    ) {
      setAcceptanceFeedback(VOICE_MIC_DENIED_FEEDBACK);
      announce(VOICE_MIC_DENIED_FEEDBACK, 'assertive');
    }
  }, [view, micPermissionStatus, announce]);

  const resetAcceptanceForNewAttempt = useCallback(() => {
    examStartedLockRef.current = false;
    hasAutoReadInstructionsRef.current = false;
    setShowStartConfirm(false);
    showStartConfirmRef.current = false;
    setInteractionState('PILOT_INTRODUCTION');
    interactionStateRef.current = 'PILOT_INTRODUCTION';
    setAcceptanceStatus('NOT_ACCEPTED');
    acceptanceStatusRef.current = 'NOT_ACCEPTED';
    setAcceptanceMethod(null);
    acceptanceMethodRef.current = null;
    acceptedAtRef.current = null;
    examStartedAtRef.current = null;
    setAcceptanceFeedback('');
  }, []);

  // Request explicit user confirmation before submitting Pilot Demo
  const requestPilotDemoSubmit = useCallback(() => {
    if (isSubmittingRef.current || viewRef.current !== 'exam') return;
    stopSpeaking();
    startVoiceListening();
    setTimerRunning(false);
    setShowSubmitConfirm(true);
    showSubmitConfirmRef.current = true;
    setInteractionState('CONFIRMING_SUBMISSION');
    interactionStateRef.current = 'CONFIRMING_SUBMISSION';
    announce(PILOT_DEMO_SUBMIT_CONFIRM_PROMPT, 'assertive');
    speakText(PILOT_DEMO_SUBMIT_CONFIRM_PROMPT, () => {
      if (viewRef.current === 'exam' && showSubmitConfirmRef.current) {
        playBeacon('listening');
        startVoiceListening();
      }
    });
  }, [stopSpeaking, announce, speakText, playBeacon, startVoiceListening]);

  const cancelPilotDemoSubmit = useCallback(() => {
    stopSpeaking();
    setShowSubmitConfirm(false);
    showSubmitConfirmRef.current = false;
    setInteractionState('PILOT_RUNNING');
    interactionStateRef.current = 'PILOT_RUNNING';
    setTimerRunning(true);
    announce(PILOT_DEMO_SUBMIT_CANCELLED_SPEECH, 'polite');
    speakText(PILOT_DEMO_SUBMIT_CANCELLED_SPEECH, () => {
      if (viewRef.current === 'exam') {
        playBeacon('listening');
        startVoiceListening();
      }
    });
  }, [stopSpeaking, announce, speakText, playBeacon, startVoiceListening]);

  // Submit Diagnostic Examination to backend API
  const handleSubmitDiagnostic = useCallback(async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setInteractionState('SUBMITTING');
    interactionStateRef.current = 'SUBMITTING';
    setSubmitError(null);

    try {
      // Snapshot latest question time
      const currentQ = questionsRef.current[currentIdxRef.current];
      const finalElapsed = Math.max(1, Math.round((Date.now() - questionEnterTimeRef.current) / 1000));

      const submissionsPayload = questionsRef.current.map((q) => {
        const entry = answersRef.current[q.question_id];
        const extra = currentQ && q.question_id === currentQ.question_id ? finalElapsed : 0;
        return {
          questionId: q.question_id,
          selectedOption: entry?.selectedOption || null,
          timeSpentSeconds: (entry?.timeSpentSeconds || 0) + extra,
          markedForReview: Boolean(entry?.markedForReview)
        };
      });

      const totalTimeElapsed = Math.max(
        1,
        PILOT_DEMO_DURATION_SECONDS - secondsRemainingRef.current
      );

      const res = await fetch('/api/diagnostic/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: uid,
          clientSubmissionId,
          examTitle: 'SSC MTS Pilot Demo Diagnostic',
          submissions: submissionsPayload,
          totalTimeSeconds: totalTimeElapsed,
          acceptanceStatus: 'ACCEPTED',
          acceptanceMethod: acceptanceMethodRef.current || 'CHECKBOX',
          acceptedAt: acceptedAtRef.current || new Date().toISOString(),
          examStartedAt: examStartedAtRef.current || new Date().toISOString()
        })
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Submission failed with status ${res.status}`);
      }

      const data = await res.json();
      const savedAttempt: EnrichedDiagnosticAttempt = data.attempt;
      const exitDest = pendingExitDestPD;
      setPendingExitDestPD(null);

      // Clear active exam session storage and persist results view
      try {
        sessionStorage.removeItem(sessionKey);
        sessionStorage.setItem('pilot_demo_view_attempt_id', savedAttempt.id);
        if (exitDest) {
          sessionStorage.removeItem('pilot_demo_initial_view');
        } else {
          sessionStorage.setItem('pilot_demo_initial_view', 'results');
        }
      } catch {}

      setTimerRunning(false);
      setIsExamActive(false);
      setShowSubmitConfirm(false);
      showSubmitConfirmRef.current = false;
      setShowExitConfirmPD(false);
      showExitConfirmPDRef.current = false;
      resetAcceptanceForNewAttempt();
      setInteractionState('COMPLETED');
      interactionStateRef.current = 'COMPLETED';

      setSelectedAttempt(savedAttempt);
      setRecommendations(data.recommendations || []);
      setHistoricalSummaryNote(data.historicalSummaryNote || '');

      // Refresh attempt list so Attempt History includes the new attempt immediately
      setAttempts((prev) => {
        const filtered = prev.filter((a) => a.id !== savedAttempt.id);
        return [savedAttempt, ...filtered];
      });

      if (exitDest) {
        const summarySpeech = `${PILOT_DEMO_SUBMITTED_SPEECH} Your examination has been submitted. Exiting to destination.`;
        announce(summarySpeech, 'assertive');
        speakText(summarySpeech, () => {
          navigateTo(exitDest);
        });
      } else {
        switchView('results', savedAttempt.id);

        const summarySpeech = `${PILOT_DEMO_SUBMITTED_SPEECH} Your total score is ${savedAttempt.totalScore} out of ${savedAttempt.totalMax}, with ${savedAttempt.accuracyPercentage} percent accuracy. Displaying your diagnostic results and personalized recommendations.`;
        announce(summarySpeech, 'assertive');
        speakText(summarySpeech);
      }
    } catch (err: any) {
      console.error('Pilot Demo submission error:', err);
      const msg =
        err.message ||
        'Network or server error occurred while saving your diagnostic attempt. Your answers are preserved—please retry.';
      setSubmitError(msg);
      announce(`Submission failed: ${msg}`, 'assertive');
      speakText(`Submission failed. Your answers are safe. Say Submit Examination or click Retry Submission.`);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [uid, clientSubmissionId, sessionKey, setIsExamActive, announce, speakText, pendingExitDestPD, navigateTo, switchView]);

  const handleSubmitRef = useRef(handleSubmitDiagnostic);
  handleSubmitRef.current = handleSubmitDiagnostic;

  // Request inline exit confirmation for Pilot Demo exam
  const requestPilotExamExit = useCallback((destination?: string) => {
    if (view !== 'exam') return;
    setShowExitConfirmPD(true);
    showExitConfirmPDRef.current = true;
    if (destination) setPendingExitDestPD(destination);
    const msg = 'You are currently taking the Pilot Demo Diagnostic. Do you want to submit your answers and exit? Press Y to confirm submission and exit, or N to continue the examination.';
    stopSpeaking();
    announce(msg, 'assertive');
    speakText(msg);
  }, [view, stopSpeaking, announce, speakText]);

  // Listen for accessprep:request-exam-exit event (from Alt+Shift+X or voice assistant)
  useEffect(() => {
    const handleExitEvt = (e: Event) => {
      if (view === 'exam') {
        const custom = e as CustomEvent;
        requestPilotExamExit(custom.detail?.destination);
      }
    };
    window.addEventListener('accessprep:request-exam-exit', handleExitEvt);
    return () => window.removeEventListener('accessprep:request-exam-exit', handleExitEvt);
  }, [view, requestPilotExamExit]);

  // Countdown timer effect — starts EXACTLY ONCE when view === 'exam' and timerRunning === true
  useEffect(() => {
    if (view !== 'exam' || !timerRunning) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitRef.current();
          return 0;
        }
        if (prev === 600) {
          playBeacon('alert');
          announce('10 minutes remaining in Pilot Demo Diagnostic.', 'assertive');
          speakText('Attention candidate: 10 minutes remaining in the diagnostic examination.');
        } else if (prev === 300) {
          playBeacon('alert');
          announce('5 minutes remaining in Pilot Demo Diagnostic.', 'assertive');
          speakText('Attention candidate: 5 minutes remaining. Please review your answers.');
        } else if (prev === 60) {
          playBeacon('alert');
          announce('1 minute remaining. Diagnostic will auto-submit soon.', 'assertive');
          speakText('Attention candidate: 1 minute remaining.');
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [view, timerRunning, playBeacon, announce, speakText]);

  const currentQ = questions[currentIdx];

  const repeatQuestionAloud = useCallback(
    (q: Question) => {
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
    },
    [stopSpeaking, speakText, announce, playBeacon, startVoiceListening]
  );

  const repeatOptionsAloud = useCallback(
    (q: Question) => {
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
    },
    [stopSpeaking, announce, speakText, playBeacon, startVoiceListening]
  );

  const repeatSingleOptionAloud = useCallback(
    (q: Question, opt: 'A' | 'B' | 'C' | 'D') => {
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
    },
    [stopSpeaking, announce, speakText, playBeacon, startVoiceListening]
  );

  // Automatically read question aloud in Blind Mode or when autoReadAloud is enabled
  useEffect(() => {
    if (view === 'exam' && currentQ && (isBlindMode || settings.autoReadAloud)) {
      if (suppressInitialAutoReadRef.current && currentIdx === 0) {
        suppressInitialAutoReadRef.current = false;
        return;
      }
      readQuestionAloud(currentQ, currentIdx, questions.length);
    }
  }, [view, currentIdx, currentQ?.question_id, isBlindMode, settings.autoReadAloud, readQuestionAloud, questions.length]);

  // Select or change option for current question
  const handleSelectOption = useCallback(
    (optKey: 'A' | 'B' | 'C' | 'D', viaVoice = false) => {
      const q = questionsRef.current[currentIdxRef.current];
      if (!q) return;
      const elapsedSec = Math.max(1, Math.round((Date.now() - questionEnterTimeRef.current) / 1000));
      questionEnterTimeRef.current = Date.now();

      setAnswers((prev) => {
        const cur = prev[q.question_id] || {
          selectedOption: null,
          timeSpentSeconds: 0,
          markedForReview: false
        };
        return {
          ...prev,
          [q.question_id]: {
            ...cur,
            selectedOption: optKey,
            timeSpentSeconds: cur.timeSpentSeconds + elapsedSec
          }
        };
      });

      playBeacon('success');
      announce(`Option ${optKey} selected for Question ${currentIdxRef.current + 1}`, 'polite');

      if (viaVoice) {
        speakText(`Option ${optKey} selected.`);
      }
    },
    [playBeacon, announce, speakText]
  );

  const handleClearOption = useCallback(() => {
    const q = questionsRef.current[currentIdxRef.current];
    if (!q) return;
    setAnswers((prev) => ({
      ...prev,
      [q.question_id]: {
        ...(prev[q.question_id] || { timeSpentSeconds: 0, markedForReview: false }),
        selectedOption: null
      }
    }));
    announce(`Cleared answer for Question ${currentIdxRef.current + 1}`, 'polite');
    speakText('Answer cleared.');
  }, [announce, speakText]);

  const handleToggleMarkReview = useCallback(() => {
    const q = questionsRef.current[currentIdxRef.current];
    if (!q) return;
    const currentlyMarked = Boolean(answers[q.question_id]?.markedForReview);
    setAnswers((prev) => ({
      ...prev,
      [q.question_id]: {
        ...(prev[q.question_id] || { selectedOption: null, timeSpentSeconds: 0 }),
        markedForReview: !currentlyMarked
      }
    }));
    const msg = !currentlyMarked
      ? `Question ${currentIdxRef.current + 1} marked for review.`
      : `Question ${currentIdxRef.current + 1} unmarked from review.`;
    announce(msg, 'polite');
    speakText(msg);
  }, [answers, announce, speakText]);

  const handleGoToQuestion = useCallback(
    (targetIdx: number) => {
      if (targetIdx < 0 || targetIdx >= questionsRef.current.length) return;
      recordElapsedOnCurrentQuestion();
      setCurrentIdx(targetIdx);
      announce(`Question ${targetIdx + 1} of ${questionsRef.current.length}`, 'polite');
    },
    [recordElapsedOnCurrentQuestion, announce]
  );

  // Interactive Sequential Wrong-Answer Explanation Dialogue (Section 6)
  const playCurrentWrongExplanation = useCallback((idx: number, isSimple: boolean) => {
    const list = wrongQuestionsRef.current;
    if (!list[idx]) return;
    const qItem = list[idx];
    const total = list.length;
    const speech = isSimple
      ? `Simpler conceptual explanation for Question ${idx + 1} on topic ${qItem.topic}. Core rule: ${qItem.explanation}. Did you understand this explanation? Say Yes or No.`
      : `Incorrect Question ${idx + 1} of ${total}. Question: ${qItem.questionText}. Your answer was ${qItem.selectedOption ? `Option ${qItem.selectedOption}` : 'unanswered'}. Correct answer is Option ${qItem.correctAnswer}. Explanation: ${qItem.explanation}. Did you understand this explanation? Say Yes or No.`;

    announce(speech, 'assertive');
    speakText(speech);
  }, [announce, speakText]);

  const handleStartExplanations = useCallback(() => {
    const list = wrongQuestionsRef.current;
    if (list.length === 0) {
      const msg = 'Congratulations! You answered all questions correctly in this diagnostic. No mistakes to review!';
      announce(msg, 'polite');
      speakText(msg);
      return;
    }
    setExplanationActive(true);
    explanationActiveRef.current = true;
    setWrongQuestionIdx(0);
    wrongQuestionIdxRef.current = 0;
    setSimplifiedMode(false);
    setDialogueDone(false);
    dialogueDoneRef.current = false;
    playCurrentWrongExplanation(0, false);
  }, [announce, speakText, playCurrentWrongExplanation]);

  const handleExplanationResponse = useCallback((action: 'yes' | 'no' | 'repeat' | 'skip') => {
    const list = wrongQuestionsRef.current;
    const idx = wrongQuestionIdxRef.current;
    if (!list[idx]) return;

    if (action === 'repeat') {
      playCurrentWrongExplanation(idx, simplifiedMode);
      return;
    }

    if (action === 'no') {
      setSimplifiedMode(true);
      playCurrentWrongExplanation(idx, true);
      return;
    }

    if (action === 'yes' || action === 'skip') {
      const nextIdx = idx + 1;
      if (nextIdx >= list.length) {
        setDialogueDone(true);
        dialogueDoneRef.current = true;
        setExplanationActive(false);
        explanationActiveRef.current = false;
        const weakTopics = Array.from(new Set(list.map((w) => w.topic))).slice(0, 4).join(', ');
        const finalMsg = `All ${list.length} incorrect questions reviewed. Priority weak topics: ${weakTopics}. I recommend targeted practice in Voice Practice or daily review in Revision Planner.`;
        announce(finalMsg, 'assertive');
        speakText(finalMsg);
      } else {
        setWrongQuestionIdx(nextIdx);
        wrongQuestionIdxRef.current = nextIdx;
        setSimplifiedMode(false);
        playCurrentWrongExplanation(nextIdx, false);
      }
    }
  }, [simplifiedMode, announce, speakText, playCurrentWrongExplanation]);

  // Voice interaction handler for Pilot Demo Diagnostic (Instructions, Active Exam & Results Dialogue)
  useEffect(() => {
    const unregister = registerVoiceHandler((transcript: string, meta?: { confidence?: number }) => {
      const clean = normalizeExamCommand(transcript);
      if (!clean) return false;

      // Block cross-module Mock Examination activation while Pilot Demo is active
      if (
        clean === 'start mock examination' ||
        clean === 'start mock exam' ||
        clean === 'start mock test' ||
        clean === 'open mock examination' ||
        clean === 'open mock exam' ||
        clean === 'mock examination' ||
        clean === 'mock exam' ||
        clean === 'submit mock examination' ||
        clean === 'submit mock exam'
      ) {
        const blockMsg =
          'You are currently in the Pilot Demo examination. Please complete or exit the Pilot Demo before starting a Mock Examination.';
        announce(blockMsg, 'assertive');
        speakText(blockMsg);
        return true;
      }

      // 1. Instructions view: Start Request -> CONFIRMING_START -> YES/NO
      if (viewRef.current === 'instructions') {
        // 1a. Handle pending start confirmation state (CONFIRMING_START)
        if (
          showStartConfirmRef.current ||
          interactionStateRef.current === 'CONFIRMING_START' ||
          acceptanceStatusRef.current === 'CONFIRMING_START'
        ) {
          if (typeof meta?.confidence === 'number' && meta.confidence < 0.6) {
            announce(PILOT_DEMO_START_UNCLEAR_PROMPT, 'assertive');
            speakText(PILOT_DEMO_START_UNCLEAR_PROMPT, () => {
              if (viewRef.current === 'instructions' && showStartConfirmRef.current) {
                playBeacon('listening');
                startVoiceListening();
              }
            });
            return true;
          }

          if (isStartConfirmPhrase(clean)) {
            confirmPilotDemoStart();
            return true;
          }

          if (isStartCancelPhrase(clean)) {
            cancelPilotDemoStart();
            return true;
          }

          // Repeated start request or unclear response while confirming -> ask again
          const retryMsg = isStartExamRequestPhrase(clean)
            ? PILOT_DEMO_START_CONFIRM_PROMPT
            : PILOT_DEMO_START_UNCLEAR_PROMPT;
          setAcceptanceFeedback(retryMsg);
          announce(retryMsg, 'assertive');
          playBeacon('alert');
          speakText(retryMsg, () => {
            if (viewRef.current === 'instructions' && showStartConfirmRef.current) {
              playBeacon('listening');
              startVoiceListening();
            }
          });
          return true;
        }

        // 1b. Handle start request phrases on instructions screen -> transition to CONFIRMING_START
        if (isStartExamRequestPhrase(clean)) {
          requestPilotDemoStart('VOICE');
          return true;
        }

        // 1c. Cannot submit before starting
        if (isSubmitExamRequestPhrase(clean) || clean === 'confirm submission') {
          const notStartedMsg =
            'The Pilot Demo examination has not started yet. Say Start Examination to begin.';
          setAcceptanceFeedback(notStartedMsg);
          announce(notStartedMsg, 'assertive');
          speakText(notStartedMsg);
          return true;
        }

        const decision = evaluateVoiceAcceptanceCommand(
          acceptanceStatusRef.current,
          transcript,
          meta?.confidence
        );

        if (decision.kind === 'repeat_instructions') {
          startInstructionsVoiceFlow();
          return true;
        }

        if (decision.kind === 'accepted') {
          requestPilotDemoStart('VOICE');
          return true;
        }

        if (
          decision.kind === 'ambiguous_yes' ||
          decision.kind === 'ambiguous_vague' ||
          decision.kind === 'low_confidence'
        ) {
          const msg = decision.feedbackSpeech || VOICE_AMBIGUOUS_FEEDBACK;
          setAcceptanceFeedback(msg);
          announce(msg, 'assertive');
          playBeacon('alert');
          speakText(msg, () => {
            if (viewRef.current === 'instructions' && acceptanceStatusRef.current === 'WAITING_FOR_ACCEPTANCE') {
              playBeacon('listening');
              startVoiceListening();
            }
          });
          return true;
        }

        // Preserve global navigation/assistance/system voice commands if explicitly spoken
        if (
          matchScreenNavigation(transcript, 'pilot_demo') ||
          parseSystemControl(decision.normalizedTranscript) ||
          parseAssistanceIntent(decision.normalizedTranscript)
        ) {
          return false;
        }

        // Unrelated speech while specifically waiting for acceptance
        if (acceptanceStatusRef.current === 'WAITING_FOR_ACCEPTANCE') {
          setAcceptanceFeedback(VOICE_AMBIGUOUS_FEEDBACK);
          announce(VOICE_AMBIGUOUS_FEEDBACK, 'polite');
          playBeacon('alert');
          speakText(VOICE_AMBIGUOUS_FEEDBACK, () => {
            if (viewRef.current === 'instructions' && acceptanceStatusRef.current === 'WAITING_FOR_ACCEPTANCE') {
              playBeacon('listening');
              startVoiceListening();
            }
          });
          return true;
        }

        return false;
      }

      // 2. Active exam voice commands
      if (viewRef.current === 'exam') {
        // Handle inline exit confirmation (Alt+Shift+X flow or voice "exit exam")
        if (showExitConfirmPDRef.current) {
          if (isSubmitConfirmPhrase(clean) || clean === 'yes' || clean === 'yes submit' || clean === 'yes exit') {
            handleSubmitDiagnostic();
            return true;
          }
          if (isSubmitCancelPhrase(clean) || clean === 'no' || clean === 'no continue' || clean === 'cancel exit') {
            setShowExitConfirmPD(false);
            showExitConfirmPDRef.current = false;
            setPendingExitDestPD(null);
            const cancelMsg = 'Exit cancelled. Continuing your Pilot Demo Diagnostic.';
            announce(cancelMsg, 'polite');
            speakText(cancelMsg);
            return true;
          }
          return true; // absorb other speech while exit confirmation is open
        }

        // Voice commands to request exam exit
        if (
          clean === 'exit exam' ||
          clean === 'leave examination' ||
          clean === 'leave exam' ||
          clean === 'exit examination' ||
          clean === 'submit and exit'
        ) {
          requestPilotExamExit();
          return true;
        }

        // 2a. Handle pending submission confirmation state (CONFIRMING_SUBMISSION)
        if (
          showSubmitConfirmRef.current ||
          interactionStateRef.current === 'CONFIRMING_SUBMISSION'
        ) {
          if (typeof meta?.confidence === 'number' && meta.confidence < 0.6) {
            announce(PILOT_DEMO_SUBMIT_UNCLEAR_PROMPT, 'assertive');
            speakText(PILOT_DEMO_SUBMIT_UNCLEAR_PROMPT, () => {
              if (viewRef.current === 'exam' && showSubmitConfirmRef.current) {
                playBeacon('listening');
                startVoiceListening();
              }
            });
            return true;
          }

          if (isSubmitConfirmPhrase(clean)) {
            handleSubmitDiagnostic();
            return true;
          }

          if (isSubmitCancelPhrase(clean)) {
            cancelPilotDemoSubmit();
            return true;
          }

          // Repeated submit command or unclear response while confirming -> re-prompt
          const retrySubmitMsg = isSubmitExamRequestPhrase(clean)
            ? PILOT_DEMO_SUBMIT_CONFIRM_PROMPT
            : PILOT_DEMO_SUBMIT_UNCLEAR_PROMPT;
          announce(retrySubmitMsg, 'assertive');
          playBeacon('alert');
          speakText(retrySubmitMsg, () => {
            if (viewRef.current === 'exam' && showSubmitConfirmRef.current) {
              playBeacon('listening');
              startVoiceListening();
            }
          });
          return true;
        }

        const q = questionsRef.current[currentIdxRef.current];
        if (!q) return false;

        // Ignore duplicate start requests while already in exam
        if (isStartExamRequestPhrase(clean)) {
          const alreadyRunningMsg = 'Your Pilot Demo examination is already in progress.';
          announce(alreadyRunningMsg, 'polite');
          speakText(alreadyRunningMsg);
          return true;
        }

        // Direct voice commands requested in specification
        if (
          clean === 'read question' ||
          clean === 'repeat question' ||
          clean === 'repeat the question' ||
          clean === 'read question again' ||
          clean === 'read the question again'
        ) {
          repeatQuestionAloud(q);
          return true;
        }
        if (
          clean === 'repeat option' ||
          clean === 'repeat options' ||
          clean === 'read option' ||
          clean === 'read options' ||
          clean === 'read options again' ||
          clean === 'read the options again' ||
          clean === 'repeat answer choices' ||
          clean === 'read answer choices'
        ) {
          repeatOptionsAloud(q);
          return true;
        }
        if (clean === 'explain this question' || clean === 'explain question') {
          const secMeta = getSectionForSubject(q.subject);
          const explainMsg = `Question ${currentIdxRef.current + 1} belongs to Section ${secMeta.section}, ${q.subject}, topic ${q.topic}. Correct answers award ${secMeta.correctMarks} marks${secMeta.incorrectMarks < 0 ? ' with 1 mark negative penalty' : ' with no negative marking'}. Full step-by-step explanations are unlocked immediately after you submit the Pilot Demo.`;
          announce(explainMsg, 'polite');
          speakText(explainMsg);
          return true;
        }
        if (
          clean.includes('remaining time') ||
          clean.includes('time left') ||
          clean.includes('read remaining time') ||
          clean === 'time'
        ) {
          const mins = Math.floor(secondsRemainingRef.current / 60);
          const secs = secondsRemainingRef.current % 60;
          const timeMsg = `You have ${mins} minutes and ${secs} seconds remaining in the Pilot Demo Diagnostic.`;
          announce(timeMsg, 'polite');
          speakText(timeMsg);
          return true;
        }
        if (
          clean === 'next question' ||
          clean === 'next' ||
          clean === 'go to next question'
        ) {
          if (currentIdxRef.current < questionsRef.current.length - 1) {
            handleGoToQuestion(currentIdxRef.current + 1);
          } else {
            speakText('You are on the last question, Question 20. Say Submit Examination to finish.');
          }
          return true;
        }
        if (
          clean === 'previous question' ||
          clean === 'previous' ||
          clean === 'go back one question'
        ) {
          if (currentIdxRef.current > 0) {
            handleGoToQuestion(currentIdxRef.current - 1);
          } else {
            speakText('You are already on Question 1.');
          }
          return true;
        }
        if (clean.includes('mark for review') || clean === 'mark question') {
          handleToggleMarkReview();
          return true;
        }
        if (isSubmitExamRequestPhrase(clean) || clean === 'confirm submission') {
          requestPilotDemoSubmit();
          return true;
        }
        if (clean === 'cancel submission') {
          cancelPilotDemoSubmit();
          return true;
        }

        // Parse option selections & playback controls via shared answerParser
        const parsed = parseSpokenAnswer(transcript, {
          A: q.option_a,
          B: q.option_b,
          C: q.option_c,
          D: q.option_d
        });

        if (parsed) {
          if (parsed.type === 'option') {
            handleSelectOption(parsed.option, true);
            return true;
          }
          if (parsed.type === 'control') {
            switch (parsed.command) {
              case 'repeat':
                repeatQuestionAloud(q);
                return true;
              case 'repeat_options':
                repeatOptionsAloud(q);
                return true;
              case 'repeat_option_a':
                repeatSingleOptionAloud(q, 'A');
                return true;
              case 'repeat_option_b':
                repeatSingleOptionAloud(q, 'B');
                return true;
              case 'repeat_option_c':
                repeatSingleOptionAloud(q, 'C');
                return true;
              case 'repeat_option_d':
                repeatSingleOptionAloud(q, 'D');
                return true;
              case 'pause_reading':
                pauseSpeaking();
                announce('Audio paused', 'polite');
                return true;
              case 'resume_reading':
                resumeSpeaking();
                announce('Audio resumed', 'polite');
                return true;
              case 'stop_speaking':
                stopSpeaking();
                startVoiceListening();
                announce('Audio stopped. Listening for your command or answer.', 'polite');
                return true;
              case 'read_slower':
                slowDownSpeech();
                return true;
              case 'skip':
                if (currentIdxRef.current < questionsRef.current.length - 1) {
                  handleGoToQuestion(currentIdxRef.current + 1);
                }
                return true;
              case 'previous':
                if (currentIdxRef.current > 0) {
                  handleGoToQuestion(currentIdxRef.current - 1);
                }
                return true;
              case 'mark_review':
                handleToggleMarkReview();
                return true;
              case 'timer': {
                const mins = Math.ceil(secondsRemainingRef.current / 60);
                speakText(`You have ${mins} minutes remaining.`);
                return true;
              }
              case 'submit':
                requestPilotDemoSubmit();
                return true;
            }
          }
        }
      }

      // 3. Results view interactive wrong-answer explanations (Section 6) & completed submission guard
      if (viewRef.current === 'results') {
        if (isSubmitExamRequestPhrase(clean) || clean === 'confirm submission') {
          announce(PILOT_DEMO_ALREADY_COMPLETED_SPEECH, 'assertive');
          speakText(PILOT_DEMO_ALREADY_COMPLETED_SPEECH);
          return true;
        }

        if (
          clean === 'explain mistakes' ||
          clean === 'start explanation' ||
          clean === 'start explanations' ||
          clean === 'review mistakes' ||
          clean === 'explain wrong answers'
        ) {
          handleStartExplanations();
          return true;
        }

        if (explanationActiveRef.current && !dialogueDoneRef.current) {
          if (clean === 'yes' || clean === 'i understand' || clean === 'understood' || clean === 'yes i did') {
            handleExplanationResponse('yes');
            return true;
          }
          if (clean === 'no' || clean === 'dont understand' || clean === 'explain simpler' || clean === 'no i did not') {
            handleExplanationResponse('no');
            return true;
          }
          if (clean === 'repeat explanation' || clean === 'repeat' || clean === 'read again') {
            handleExplanationResponse('repeat');
            return true;
          }
          if (clean === 'skip explanation' || clean === 'skip' || clean === 'next question' || clean === 'next') {
            handleExplanationResponse('skip');
            return true;
          }
        }
      }

      return false;
    });

    return () => {
      unregister();
    };
  }, [
    registerVoiceHandler,
    handleBeginDiagnostic,
    requestPilotDemoStart,
    confirmPilotDemoStart,
    cancelPilotDemoStart,
    requestPilotDemoSubmit,
    cancelPilotDemoSubmit,
    handleStartExplanations,
    handleExplanationResponse,
    readQuestionAloud,
    repeatOptionsAloud,
    repeatSingleOptionAloud,
    handleGoToQuestion,
    handleToggleMarkReview,
    handleSubmitDiagnostic,
    handleSelectOption,
    pauseSpeaking,
    resumeSpeaking,
    stopSpeaking,
    slowDownSpeech,
    announce,
    speakText,
    playBeacon,
    startVoiceListening,
    startInstructionsVoiceFlow,
    requestPilotExamExit
  ]);

  // Keyboard shortcuts during instructions confirmation & active exam
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Alt+Shift+X — Request inline exam exit confirmation (global during exam)
      if (e.altKey && e.shiftKey && e.key.toUpperCase() === 'X') {
        e.preventDefault();
        requestPilotExamExit();
        return;
      }

      if (e.altKey || e.ctrlKey || e.metaKey) return;

      const key = e.key.toUpperCase();

      // Handle inline exit confirm (Alt+Shift+X triggered) with Y/N/Escape
      if (showExitConfirmPDRef.current && view === 'exam') {
        if (key === 'Y') {
          e.preventDefault();
          handleSubmitDiagnostic();
        } else if (key === 'N' || e.key === 'Escape') {
          e.preventDefault();
          setShowExitConfirmPD(false);
          showExitConfirmPDRef.current = false;
          setPendingExitDestPD(null);
          const msg = 'Exit cancelled. Continuing your Pilot Demo Diagnostic.';
          announce(msg, 'polite');
          speakText(msg);
        }
        return;
      }

      // 1. Start Confirmation Dialog keyboard shortcuts (Y / N / Escape)
      if (view === 'instructions' && showStartConfirmRef.current) {
        if (key === 'Y') {
          e.preventDefault();
          confirmPilotDemoStart();
        } else if (key === 'N' || e.key === 'Escape') {
          e.preventDefault();
          cancelPilotDemoStart();
        }
        return;
      }

      // Enter on instructions view (not in confirm dialog) — request start
      if (view === 'instructions' && e.key === 'Enter' && !showStartConfirmRef.current) {
        e.preventDefault();
        requestPilotDemoStart('KEYBOARD');
        return;
      }

      if (view !== 'exam') return;

      // 2. Submit Confirmation Dialog keyboard shortcuts (Y / N / Escape)
      if (showSubmitConfirmRef.current) {
        if (key === 'Y') {
          e.preventDefault();
          handleSubmitDiagnostic();
        } else if (key === 'N' || e.key === 'Escape') {
          e.preventDefault();
          cancelPilotDemoSubmit();
        }
        return;
      }

      // Allow native Enter/Space activation when a button is explicitly focused
      const isButtonFocused = target.tagName === 'BUTTON';

      if (key === 'A' || key === '1') {
        e.preventDefault();
        handleSelectOption('A');
      } else if (key === 'B' || key === '2') {
        e.preventDefault();
        handleSelectOption('B');
      } else if (key === 'C' || key === '3') {
        e.preventDefault();
        handleSelectOption('C');
      } else if (key === 'D' || key === '4') {
        e.preventDefault();
        handleSelectOption('D');
      } else if (e.code === 'Space' && !isButtonFocused) {
        e.preventDefault();
        const curQ = questionsRef.current[currentIdxRef.current];
        if (curQ) {
          readQuestionAloud(curQ, currentIdxRef.current, questionsRef.current.length);
        }
      } else if (key === 'R' && !e.altKey && !isButtonFocused) {
        // R — repeat ONLY the question text (no prefix, no question number, no options)
        e.preventDefault();
        const curQ = questionsRef.current[currentIdxRef.current];
        if (curQ) { stopSpeaking(); speakText(repeatQuestionTextOnly(curQ)); }
      } else if (key === 'O' && !e.altKey && !isButtonFocused) {
        // O — repeat ONLY the options (no "The options are:" prefix)
        e.preventDefault();
        const curQ = questionsRef.current[currentIdxRef.current];
        if (curQ) { stopSpeaking(); speakText(repeatOptionsTextOnly(curQ)); }
      } else if (key === 'M' && !e.altKey && !isButtonFocused) {
        // M — Mark or unmark question for review
        e.preventDefault();
        handleToggleMarkReview();
      } else if (e.key === 'Enter' && !isButtonFocused) {
        e.preventDefault();
        if (currentIdxRef.current < questionsRef.current.length - 1) {
          handleGoToQuestion(currentIdxRef.current + 1);
        }
      } else if (e.key === 'ArrowRight' && currentIdxRef.current < questionsRef.current.length - 1) {
        e.preventDefault();
        handleGoToQuestion(currentIdxRef.current + 1);
      } else if (e.key === 'ArrowLeft' && currentIdxRef.current > 0) {
        e.preventDefault();
        handleGoToQuestion(currentIdxRef.current - 1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    view,
    handleSelectOption,
    handleGoToQuestion,
    readQuestionAloud,
    confirmPilotDemoStart,
    cancelPilotDemoStart,
    handleSubmitDiagnostic,
    cancelPilotDemoSubmit,
    requestPilotDemoStart,
    handleToggleMarkReview,
    stopSpeaking,
    speakText,
    requestPilotExamExit,
    announce
  ]);

  // Palette summary counts
  const paletteStats = useMemo(() => {
    let answered = 0;
    let unanswered = 0;
    let marked = 0;
    questions.forEach((q) => {
      const entry = answers[q.question_id];
      if (entry?.selectedOption) answered++;
      else unanswered++;
      if (entry?.markedForReview) marked++;
    });
    return { answered, unanswered, marked };
  }, [questions, answers]);

  const formatTimer = (sec: number) => {
    const safe = Math.max(0, sec);
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatDurationHuman = (sec: number) => {
    const safe = Math.max(0, Math.round(sec));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  const handlePracticeTopic = (subject: string, topic?: string) => {
    try {
      sessionStorage.setItem('practice_filter_subject', subject);
      if (topic) {
        sessionStorage.setItem('practice_filter_topic', topic);
      }
    } catch {}
    navigateTo('voice_practice');
  };

  const currentSectionMeta = currentQ ? getSectionForSubject(currentQ.subject) : DIAGNOSTIC_SECTIONS[0];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-6" id="main-content">
      {/* Top Module Header & Internal Section Navigation */}
      <div className="bg-white border border-[#E8EBF0] rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EEF4FF] border border-[#D0DEFF] flex items-center justify-center text-[#1749E8] shrink-0">
            <ClipboardCheck className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1749E8]">
                Diagnostic Assessment Module
              </span>
              <span className="text-[11px] font-semibold text-[#64748B] bg-[#F8F9FB] px-2 py-0.5 rounded border border-[#E8EBF0]">
                20 Questions · 25 Minutes · 60 Marks
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-[#172033] mt-0.5">
              Pilot Demo Diagnostic
            </h1>
            <p className="text-xs text-[#64748B]">
              Evaluate your current SSC MTS preparation across Numerical, Reasoning, General Awareness, and English.
            </p>
          </div>
        </div>

        {/* Internal View Switcher (Hidden during active timed test to prevent accidental clicks) */}
        {view !== 'exam' && (
          <div
            role="tablist"
            aria-label="Pilot Demo Diagnostic Sections"
            className="flex flex-wrap items-center gap-1.5 bg-[#F8F9FB] p-1 rounded-lg border border-[#E8EBF0]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={view === 'instructions'}
              onClick={() => switchView('instructions')}
              data-testid="pilot-tab-instructions"
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 ${
                view === 'instructions'
                  ? 'bg-[#1749E8] text-white shadow-2xs'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Overview &amp; Instructions</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={view === 'results'}
              onClick={() => switchView('results')}
              data-testid="pilot-tab-results"
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 ${
                view === 'results'
                  ? 'bg-[#1749E8] text-white shadow-2xs'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Diagnostic Results</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={view === 'history'}
              onClick={() => switchView('history')}
              data-testid="pilot-tab-history"
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 ${
                view === 'history'
                  ? 'bg-[#1749E8] text-white shadow-2xs'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              <History className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Attempt History ({attempts.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* ===================================================================
          VIEW 1: EXAMINATION OVERVIEW & INSTRUCTIONS
         =================================================================== */}
      {view === 'instructions' && (
        <div className="space-y-6" data-testid="pilot-instructions-view">
          {/* Candidate Historical Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E8EBF0] rounded-xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                Total Questions
              </p>
              <p className="text-2xl font-extrabold text-[#172033] mt-1">20 Questions</p>
              <p className="text-xs text-[#64748B] mt-0.5">5 per SSC MTS section</p>
            </div>

            <div className="bg-white border border-[#E8EBF0] rounded-xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                Total Duration
              </p>
              <p className="text-2xl font-extrabold text-[#172033] mt-1">25 Minutes</p>
              <p className="text-xs text-[#64748B] mt-0.5">Timer starts after Begin Test</p>
            </div>

            <div className="bg-white border border-[#E8EBF0] rounded-xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                Completed Attempts
              </p>
              <p className="text-2xl font-extrabold text-[#172033] mt-1">
                {loadingHistory ? '—' : attempts.length}
              </p>
              <p className="text-xs text-[#64748B] mt-0.5">
                {attempts.length > 0
                  ? `Last: ${new Date(attempts[0].completedAt).toLocaleDateString()}`
                  : 'No previous attempts'}
              </p>
            </div>

            <div className="bg-white border border-[#E8EBF0] rounded-xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                Latest Diagnostic Score
              </p>
              <p className="text-2xl font-extrabold text-[#1749E8] mt-1">
                {loadingHistory
                  ? '—'
                  : attempts[0]
                  ? `${attempts[0].totalScore} / ${attempts[0].totalMax}`
                  : 'Not Attempted'}
              </p>
              <p className="text-xs text-[#64748B] mt-0.5">
                {attempts[0] ? `${attempts[0].accuracyPercentage}% Accuracy` : 'Max 60 Marks'}
              </p>
            </div>
          </div>

          {/* Section Structure & Marking Scheme Table */}
          <div className="bg-white border border-[#E8EBF0] rounded-xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#172033]">
                  1. Diagnostic Examination Structure &amp; Marking Scheme
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Questions are retrieved directly from the verified 400-question SSC MTS bank.
                </p>
              </div>
              <AudioToolbar
                textToRead={PILOT_DEMO_FULL_INSTRUCTIONS_SPEECH}
                label="Read Instructions Aloud"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <caption className="sr-only">
                  Pilot Demo Diagnostic Section Structure and Marking Scheme
                </caption>
                <thead>
                  <tr className="bg-[#F8F9FB] border-y border-[#E8EBF0] text-[#172033] font-bold">
                    <th scope="col" className="py-2.5 px-3">Section</th>
                    <th scope="col" className="py-2.5 px-3">Subject</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Questions</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Correct Marks</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Incorrect Penalty</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Max Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EBF0] text-[#172033]">
                  {DIAGNOSTIC_SECTIONS.map((sec) => (
                    <tr key={sec.section} className="hover:bg-[#F8F9FB]">
                      <td className="py-2.5 px-3 font-bold text-[#1749E8]">Section {sec.section}</td>
                      <td className="py-2.5 px-3 font-semibold">{sec.subject}</td>
                      <td className="py-2.5 px-3 text-right font-bold">{sec.questionCount}</td>
                      <td className="py-2.5 px-3 text-right text-[#15803D] font-bold">+{sec.correctMarks}</td>
                      <td className="py-2.5 px-3 text-right font-semibold">
                        {sec.incorrectMarks === 0 ? (
                          <span className="text-[#64748B]">0 (No Negative)</span>
                        ) : (
                          <span className="text-[#DC2626]">{sec.incorrectMarks} mark</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">{sec.maxMarks}</td>
                    </tr>
                  ))}
                  <tr className="bg-[#EEF4FF]/60 font-extrabold text-[#172033]">
                    <td className="py-2.5 px-3" colSpan={2}>Total Diagnostic Assessment</td>
                    <td className="py-2.5 px-3 text-right">{PILOT_DEMO_TOTAL_QUESTIONS}</td>
                    <td className="py-2.5 px-3 text-right">+3 per Q</td>
                    <td className="py-2.5 px-3 text-right">Sec A/B: 0 · Sec C/D: -1</td>
                    <td className="py-2.5 px-3 text-right">{PILOT_DEMO_MAX_SCORE}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Instructions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-[#F8F9FB] border border-[#E8EBF0] space-y-1.5">
                <h3 className="text-xs font-bold text-[#172033] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#1749E8]" aria-hidden="true" />
                  <span>Navigation &amp; Timer Rules</span>
                </h3>
                <ul className="text-xs text-[#53627A] space-y-1 list-disc list-inside">
                  <li>The 25-minute timer begins only after you select <strong>Begin Test</strong>.</li>
                  <li>Navigate freely across all 20 questions and 4 sections.</li>
                  <li>Change or clear any selected option before final submission.</li>
                  <li>Mark questions for review to revisit them from the palette.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-[#F8F9FB] border border-[#E8EBF0] space-y-1.5">
                <h3 className="text-xs font-bold text-[#172033] flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-[#6241C8]" aria-hidden="true" />
                  <span>Voice &amp; Keyboard Accessibility</span>
                </h3>
                <ul className="text-xs text-[#53627A] space-y-1 list-disc list-inside">
                  <li>Say <strong>"Repeat question"</strong> or <strong>"Repeat options"</strong> anytime.</li>
                  <li>Say <strong>"Select option A/B/C/D"</strong>, <strong>"Next question"</strong>, or <strong>"Previous question"</strong>.</li>
                  <li>Say <strong>"Mark for review"</strong>, <strong>"Read remaining time"</strong>, or <strong>"Submit examination"</strong>.</li>
                  <li>Keyboard users can press <strong>A–D</strong> (or <strong>1–4</strong>) and Arrow keys.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-[#F8F9FB] border border-[#E8EBF0] space-y-1.5">
                <h3 className="text-xs font-bold text-[#172033] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#15803D]" aria-hidden="true" />
                  <span>Submission &amp; Persistence</span>
                </h3>
                <ul className="text-xs text-[#53627A] space-y-1 list-disc list-inside">
                  <li>Correct answers and explanations are hidden during formal test mode.</li>
                  <li>Your progress is preserved across accidental page refreshes.</li>
                  <li>Upon submission, full subject &amp; topic analytics are saved to your record.</li>
                </ul>
              </div>
            </div>

            {/* Voice Acceptance Status & Hands-Free Initiation Panel */}
            <div
              className="p-4 rounded-xl bg-[#F8F9FB] border border-[#E8EBF0] space-y-3"
              role="region"
              aria-label="Voice Examination Acceptance"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#172033]">
                      Voice-Based Instruction Acceptance
                    </span>
                    <span
                      data-testid="pilot-acceptance-status-badge"
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        acceptanceStatus === 'WAITING_FOR_ACCEPTANCE'
                          ? 'bg-emerald-50 text-[#15803D] border-emerald-200'
                          : acceptanceStatus === 'READING_INSTRUCTIONS'
                          ? 'bg-[#EEF4FF] text-[#1749E8] border-[#D0DEFF]'
                          : acceptanceStatus === 'ACCEPTED' || acceptanceStatus === 'STARTING_EXAM' || acceptanceStatus === 'EXAM_IN_PROGRESS'
                          ? 'bg-emerald-100 text-[#15803D] border-emerald-300'
                          : 'bg-white text-[#64748B] border-[#E8EBF0]'
                      }`}
                    >
                      {acceptanceStatus}
                    </span>
                    {isVoiceListening && acceptanceStatus === 'WAITING_FOR_ACCEPTANCE' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#15803D]">
                        <Mic className="w-3 h-3 animate-pulse" aria-hidden="true" />
                        Listening
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#53627A]" aria-live="polite" data-testid="pilot-acceptance-feedback">
                    {acceptanceFeedback ||
                      'Listen to instructions and say "I agree and begin test", "I accept the instructions", or "Begin test" — or use the checkbox below.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={startInstructionsVoiceFlow}
                    disabled={loadingQuestions || acceptanceStatus === 'STARTING_EXAM' || acceptanceStatus === 'EXAM_IN_PROGRESS'}
                    data-testid="pilot-voice-read-listen-btn"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#1749E8] bg-white hover:bg-[#EEF4FF] border border-[#D0DEFF] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#1749E8]"
                  >
                    <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Read &amp; Listen for Acceptance</span>
                  </button>

                  <VoiceInputButton
                    label="Accept by Voice (Whisper)"
                    contextHint='Say "I agree and begin test" or "I accept the instructions"'
                    onMicError={() => {
                      setAcceptanceFeedback(VOICE_MIC_DENIED_FEEDBACK);
                      announce(VOICE_MIC_DENIED_FEEDBACK, 'assertive');
                      speakText(VOICE_MIC_DENIED_FEEDBACK);
                    }}
                    onTranscriptConfirmed={(text) => {
                      stopSpeaking();
                      // Ensure Whisper push-to-talk enters WAITING_FOR_ACCEPTANCE directly
                      if (
                        acceptanceStatusRef.current === 'NOT_ACCEPTED' ||
                        acceptanceStatusRef.current === 'READING_INSTRUCTIONS'
                      ) {
                        acceptanceStatusRef.current = 'WAITING_FOR_ACCEPTANCE';
                        setAcceptanceStatus('WAITING_FOR_ACCEPTANCE');
                      }
                      const cleanText = normalizeExamCommand(text);
                      if (showStartConfirmRef.current) {
                        if (isStartConfirmPhrase(cleanText)) {
                          confirmPilotDemoStart();
                          return;
                        }
                        if (isStartCancelPhrase(cleanText)) {
                          cancelPilotDemoStart();
                          return;
                        }
                      }
                      if (isStartExamRequestPhrase(cleanText)) {
                        requestPilotDemoStart('VOICE');
                        return;
                      }
                      const decision = evaluateVoiceAcceptanceCommand('WAITING_FOR_ACCEPTANCE', text);
                      if (decision.kind === 'accepted') {
                        requestPilotDemoStart('VOICE');
                      } else {
                        const msg = decision.feedbackSpeech || VOICE_AMBIGUOUS_FEEDBACK;
                        setAcceptanceFeedback(msg);
                        announce(msg, 'assertive');
                        speakText(msg);
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Candidate Consent & Begin Test Action */}
            <div className="pt-3 border-t border-[#E8EBF0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <label
                htmlFor="accept-pilot-instructions"
                className="flex items-start gap-2.5 text-xs font-semibold text-[#172033] cursor-pointer select-none"
              >
                <input
                  id="accept-pilot-instructions"
                  type="checkbox"
                  checked={instructionsAccepted}
                  onChange={(e) => {
                    const nextStatus = applyCheckboxAcceptanceToggle(
                      acceptanceStatusRef.current,
                      e.target.checked
                    );
                    setAcceptanceStatus(nextStatus);
                    acceptanceStatusRef.current = nextStatus;
                    if (e.target.checked) {
                      acceptedAtRef.current = new Date().toISOString();
                      setAcceptanceMethod('CHECKBOX');
                      acceptanceMethodRef.current = 'CHECKBOX';
                      setAcceptanceFeedback(VOICE_ACCEPTED_FEEDBACK);
                      announce('Instructions accepted. You may now select Begin Test.', 'polite');
                    } else {
                      acceptedAtRef.current = null;
                      setAcceptanceMethod(null);
                      acceptanceMethodRef.current = null;
                      setAcceptanceFeedback('');
                    }
                  }}
                  data-testid="accept-pilot-instructions-checkbox"
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#1749E8] focus:ring-[#1749E8]"
                />
                <span>
                  I have read and understood the examination structure, marking scheme (+3/0 for Sections A &amp; B, +3/-1 for Sections C &amp; D), and 25-minute duration rules.
                </span>
              </label>

              <div className="flex items-center gap-3 shrink-0">
                {attempts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAttempt(attempts[0]);
                      setView('results');
                    }}
                    className="px-4 py-2.5 text-xs font-bold text-[#1749E8] bg-[#EEF4FF] hover:bg-[#D0DEFF] rounded-lg transition-colors"
                  >
                    View Latest Results
                  </button>
                )}

                <button
                  type="button"
                  disabled={!instructionsAccepted || loadingQuestions}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      beginInputMethodRef.current = 'KEYBOARD';
                    }
                  }}
                  onMouseDown={() => {
                    beginInputMethodRef.current = 'CHECKBOX';
                  }}
                  onClick={(e) => {
                    // Keyboard activation via Enter/Space on focused button produces detail === 0
                    const method: AcceptanceMethod =
                      e.detail === 0 || beginInputMethodRef.current === 'KEYBOARD'
                        ? 'KEYBOARD'
                        : 'CHECKBOX';
                    requestPilotDemoStart(method);
                  }}
                  data-testid="begin-pilot-demo-btn"
                  className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-lg shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-[#1749E8] focus:ring-offset-2 ${
                    instructionsAccepted && !loadingQuestions
                      ? 'bg-[#1749E8] hover:bg-[#123BB8] text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <span>{loadingQuestions ? 'Loading 20 Questions...' : 'Begin Test'}</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {/* Start Pilot Demo Confirmation Dialog */}
          {showStartConfirm && (
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="pilot-start-dialog-title"
              aria-describedby="pilot-start-dialog-desc"
              data-testid="pilot-start-confirm-dialog"
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
            >
              <div className="bg-white border-2 border-[#1749E8] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
                <h3 id="pilot-start-dialog-title" className="text-base font-extrabold text-[#172033]">
                  Start Pilot Demo Examination?
                </h3>
                <p id="pilot-start-dialog-desc" className="text-xs text-[#53627A] leading-relaxed">
                  Are you sure you want to start the Pilot Demo examination? You will have{' '}
                  <strong>25 minutes</strong> to answer <strong>20 questions</strong> across all 4 SSC MTS sections.
                  Say <strong>"YES"</strong> to begin or <strong>"NO"</strong> to cancel.
                </p>
                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={cancelPilotDemoStart}
                    data-testid="pilot-cancel-start-btn"
                    className="px-4 py-2 text-xs font-bold text-[#53627A] bg-[#F8F9FB] hover:bg-[#E8EBF0] rounded-lg border border-[#E8EBF0]"
                  >
                    NO, Cancel
                  </button>
                  <button
                    type="button"
                    autoFocus
                    onClick={confirmPilotDemoStart}
                    data-testid="pilot-confirm-start-btn"
                    className="px-4 py-2 text-xs font-bold text-white bg-[#1749E8] hover:bg-[#123BB8] rounded-lg"
                  >
                    YES, Start Examination
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================
          VIEW 2: ACTIVE DIAGNOSTIC EXAMINATION (20 QUESTIONS, 25 MIN)
         =================================================================== */}
      {view === 'exam' && currentQ && (
        <div className="space-y-4" data-testid="pilot-active-exam-view">
          {/* ── Inline Exam Exit Confirmation Banner (Alt+Shift+X or voice "exit exam") ── */}
          {showExitConfirmPD && (
            <div
              role="alertdialog"
              aria-modal="false"
              aria-labelledby="pilot-exam-exit-confirm-title"
              aria-describedby="pilot-exam-exit-confirm-desc"
              className="p-4 bg-amber-50 border-2 border-amber-500 rounded-2xl shadow-lg"
            >
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <h3 id="pilot-exam-exit-confirm-title" className="text-sm font-bold text-amber-800 mb-1">
                    Exit Pilot Demo Diagnostic?
                  </h3>
                  <p id="pilot-exam-exit-confirm-desc" className="text-xs text-amber-700 leading-relaxed mb-3">
                    You are currently taking an examination. Do you want to <strong>submit your answers and exit</strong>?
                    Your answers so far will be saved and evaluated.
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleSubmitDiagnostic()}
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
                        setShowExitConfirmPD(false);
                        showExitConfirmPDRef.current = false;
                        setPendingExitDestPD(null);
                        const msg = 'Exit cancelled. Continuing your Pilot Demo Diagnostic.';
                        announce(msg, 'polite');
                        speakText(msg);
                      }}
                      className="px-4 py-2 text-xs font-semibold text-amber-800 bg-white hover:bg-amber-100 rounded-lg border border-amber-300 transition-all"
                      aria-label="No, cancel exit and continue examination"
                    >
                      No, Continue Exam (N)
                    </button>
                    <span className="text-xs text-amber-600 ml-auto">
                      Press <kbd className="font-mono font-bold">Y</kbd> to submit · <kbd className="font-mono font-bold">N</kbd> or <kbd className="font-mono font-bold">Esc</kbd> to cancel
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submission Error Banner with Safe Retry */}
          {submitError && (
            <div
              role="alert"
              className="p-4 bg-red-50 border border-red-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-red-900"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-700 shrink-0" aria-hidden="true" />
                <span>{submitError}</span>
              </div>
              <button
                type="button"
                onClick={handleSubmitDiagnostic}
                disabled={isSubmitting}
                data-testid="pilot-retry-submit-btn"
                className="px-3.5 py-1.5 bg-red-700 hover:bg-red-800 text-white font-bold rounded-lg inline-flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Retry Submission</span>
              </button>
            </div>
          )}

          {/* Top Exam Status Bar: Section Tabs + Countdown Timer + Submit Trigger */}
          <div className="bg-white border border-[#E8EBF0] rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
            {/* Section Tabs (A, B, C, D) */}
            <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Diagnostic Sections">
              {DIAGNOSTIC_SECTIONS.map((sec, sIdx) => {
                const startQIdx = sIdx * 5;
                const isCurrentSection = currentSectionMeta.section === sec.section;
                return (
                  <button
                    key={sec.section}
                    type="button"
                    role="tab"
                    aria-selected={isCurrentSection}
                    onClick={() => handleGoToQuestion(startQIdx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      isCurrentSection
                        ? 'bg-[#1749E8] text-white border-[#1749E8]'
                        : 'bg-[#F8F9FB] text-[#53627A] border-[#E8EBF0] hover:text-[#172033]'
                    }`}
                  >
                    Sec {sec.section}: {sec.shortName}
                  </button>
                );
              })}
            </div>

            {/* Timer & Submit Action */}
            <div className="flex items-center gap-3">
              <div
                role="timer"
                aria-label="Remaining diagnostic time"
                data-testid="pilot-exam-timer"
                className={`px-3.5 py-1.5 rounded-lg border font-mono text-sm font-extrabold flex items-center gap-2 ${
                  secondsRemaining <= 300
                    ? 'bg-red-50 text-red-700 border-red-300'
                    : 'bg-[#EEF4FF] text-[#1749E8] border-[#D0DEFF]'
                }`}
              >
                <Clock className="w-4 h-4" aria-hidden="true" />
                <span>{formatTimer(secondsRemaining)}</span>
              </div>

              <button
                type="button"
                onClick={requestPilotDemoSubmit}
                disabled={isSubmitting}
                data-testid="pilot-submit-exam-btn"
                className="px-4 py-2 bg-[#15803D] hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Examination'}
              </button>

              <button
                type="button"
                onClick={() => requestPilotExamExit()}
                disabled={isSubmitting}
                data-testid="pilot-exit-exam-btn"
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 focus:ring-2 focus:ring-red-400"
                aria-label="Exit examination. Keyboard shortcut: Alt+Shift+X. Voice command: Say 'Exit Exam'"
                title="Exit examination and submit answers (Alt+Shift+X)"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Exit Exam</span>
                <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 bg-red-800 text-red-100 rounded text-[10px] font-mono">Alt+Shift+X</kbd>
              </button>
            </div>
          </div>

          {/* Main Exam Grid: Question Area (Left 8 cols) + Question Palette (Right 4 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Question & Controls Column */}
            <div className="lg:col-span-8 bg-white border border-[#E8EBF0] rounded-xl p-5 sm:p-6 space-y-5">
              {/* Question Metadata & Visible Accessibility Audio Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E8EBF0]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-[#EEF4FF] text-[#1749E8] text-xs font-extrabold border border-[#D0DEFF]">
                      Question {currentIdx + 1} of {questions.length}
                    </span>
                    <span className="text-xs font-bold text-[#6241C8]">
                      Section {currentSectionMeta.section} · {currentQ.subject}
                    </span>
                    <span className="text-[11px] font-semibold text-[#64748B] bg-[#F8F9FB] px-2 py-0.5 rounded border border-[#E8EBF0]">
                      Topic: {currentQ.topic}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    Marking: <strong className="text-[#15803D]">+{currentSectionMeta.correctMarks} Correct</strong> ·{' '}
                    <strong className={currentSectionMeta.incorrectMarks < 0 ? 'text-[#DC2626]' : 'text-[#64748B]'}>
                      {currentSectionMeta.incorrectMarks === 0 ? '0 Negative' : `${currentSectionMeta.incorrectMarks} Incorrect`}
                    </strong>
                  </p>
                </div>

                {/* Visible Audio & Repeat Controls (Requirement 7) */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    data-action="repeat-question"
                    data-testid="pilot-repeat-question"
                    onClick={() => {
                      stopSpeaking();
                      speakText(repeatQuestionTextOnly(currentQ));
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-[#EEF4FF] hover:bg-[#D0DEFF] text-[#1749E8] rounded-lg border border-[#D0DEFF] transition-colors"
                    aria-label="Repeat current question text only (Keyboard shortcut: R)"
                    title="Repeat question text only (R)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Repeat Question (R)</span>
                  </button>

                  <button
                    type="button"
                    data-action="repeat-options"
                    data-testid="pilot-repeat-options"
                    onClick={() => {
                      stopSpeaking();
                      speakText(repeatOptionsTextOnly(currentQ));
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-[#F8F9FB] hover:bg-[#EEF4FF] text-[#172033] hover:text-[#1749E8] rounded-lg border border-[#E8EBF0] transition-colors"
                    aria-label="Repeat answer options only (Keyboard shortcut: O)"
                    title="Repeat options only (O)"
                  >
                    <List className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Repeat Options (O)</span>
                  </button>

                  {isPausedSpeaking ? (
                    <button
                      type="button"
                      data-testid="pilot-resume-audio"
                      onClick={resumeSpeaking}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-amber-50 text-amber-900 rounded-lg border border-amber-300"
                    >
                      <Play className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Resume Audio</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      data-testid="pilot-pause-audio"
                      onClick={pauseSpeaking}
                      disabled={!isSpeaking}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-[#F8F9FB] text-[#53627A] disabled:opacity-50 rounded-lg border border-[#E8EBF0]"
                    >
                      <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Pause Audio</span>
                    </button>
                  )}

                  <button
                    type="button"
                    data-testid="pilot-stop-audio"
                    onClick={stopSpeaking}
                    disabled={!isSpeaking && !isPausedSpeaking}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-[#F8F9FB] text-[#DC2626] disabled:opacity-50 rounded-lg border border-[#E8EBF0]"
                  >
                    <Square className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Stop Audio</span>
                  </button>
                </div>
              </div>

              {/* Question Stem */}
              <div className="py-2">
                <h2
                  id="pilot-current-question-stem"
                  className="text-base sm:text-lg font-bold text-[#172033] leading-relaxed"
                >
                  {currentQ.question_text}
                </h2>
              </div>

              {/* 4 Options (A, B, C, D) — Formal Exam Mode (never shows correct answer) */}
              <div
                role="radiogroup"
                aria-labelledby="pilot-current-question-stem"
                className="space-y-2.5"
              >
                {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                  const optText = (currentQ as any)[`option_${optKey.toLowerCase()}`];
                  const isSelected = answers[currentQ.question_id]?.selectedOption === optKey;

                  return (
                    <button
                      key={optKey}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      data-testid={`pilot-option-${optKey}`}
                      onClick={() => handleSelectOption(optKey)}
                      className={`w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-center justify-between gap-3 focus:outline-none focus:ring-2 focus:ring-[#1749E8] ${
                        isSelected
                          ? 'bg-[#EEF4FF] border-[#1749E8] text-[#172033] font-bold shadow-2xs'
                          : 'bg-white hover:bg-[#F8F9FB] border-[#E8EBF0] text-[#172033]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold border shrink-0 ${
                            isSelected
                              ? 'bg-[#1749E8] text-white border-[#1749E8]'
                              : 'bg-[#F8F9FB] text-[#172033] border-[#D9E1EF]'
                          }`}
                        >
                          {optKey}
                        </span>
                        <span className="text-sm">{optText}</span>
                      </div>
                      {isSelected && (
                        <span className="text-xs font-bold text-[#1749E8] shrink-0">
                          Selected
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Voice Input Assistant Bar */}
              <div className="p-3 bg-[#F8F9FB] border border-[#E8EBF0] rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-[#53627A]">
                  <span className="font-bold text-[#172033]">Voice Commands:</span> Say{' '}
                  <em>"Select option A"</em>, <em>"Repeat question"</em>, <em>"Next question"</em>,{' '}
                  <em>"Mark for review"</em>, or <em>"Submit examination"</em>.
                </div>
                <VoiceInputButton
                  onTranscriptConfirmed={(text: string) => {
                    const cleanText = normalizeExamCommand(text);
                    if (showSubmitConfirmRef.current) {
                      if (isSubmitConfirmPhrase(cleanText)) {
                        handleSubmitDiagnostic();
                        return;
                      }
                      if (isSubmitCancelPhrase(cleanText)) {
                        cancelPilotDemoSubmit();
                        return;
                      }
                    }
                    if (isSubmitExamRequestPhrase(cleanText) || cleanText === 'confirm submission') {
                      requestPilotDemoSubmit();
                      return;
                    }
                    const parsed = parseSpokenAnswer(text, {
                      A: currentQ.option_a,
                      B: currentQ.option_b,
                      C: currentQ.option_c,
                      D: currentQ.option_d
                    });
                    if (parsed?.type === 'option') {
                      handleSelectOption(parsed.option, true);
                    } else if (parsed?.type === 'control') {
                      if (parsed.command === 'submit') {
                        requestPilotDemoSubmit();
                      } else if (parsed.command === 'skip' && currentIdxRef.current < questionsRef.current.length - 1) {
                        handleGoToQuestion(currentIdxRef.current + 1);
                      } else if (parsed.command === 'previous' && currentIdxRef.current > 0) {
                        handleGoToQuestion(currentIdxRef.current - 1);
                      } else if (parsed.command === 'repeat') {
                        // Repeat ONLY the question text — no prefix, no question number, no options
                        stopSpeaking();
                        speakText(repeatQuestionTextOnly(currentQ));
                      } else if (parsed.command === 'repeat_options') {
                        // Repeat ONLY the options — no "The options are:" prefix
                        stopSpeaking();
                        speakText(repeatOptionsTextOnly(currentQ));
                      } else if (parsed.command === 'mark_review') {
                        handleToggleMarkReview();
                      }
                    }
                  }}
                  label="Answer by Voice"
                />
              </div>

              {/* Bottom Question Action Controls */}
              <div className="pt-3 border-t border-[#E8EBF0] flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleMarkReview}
                    data-testid="pilot-mark-review-btn"
                    title="Mark question for review (M)"
                    aria-label="Mark question for review (Keyboard shortcut: M)"
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border transition-colors ${
                      answers[currentQ.question_id]?.markedForReview
                        ? 'bg-amber-100 text-amber-950 border-amber-400'
                        : 'bg-[#F8F9FB] text-[#53627A] border-[#E8EBF0] hover:text-[#172033]'
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>
                      {answers[currentQ.question_id]?.markedForReview
                        ? 'Marked for Review'
                        : 'Mark for Review (M)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearOption}
                    disabled={!answers[currentQ.question_id]?.selectedOption}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#F8F9FB] text-[#53627A] hover:text-[#172033] disabled:opacity-50 border border-[#E8EBF0]"
                  >
                    Clear Response
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGoToQuestion(currentIdx - 1)}
                    disabled={currentIdx === 0}
                    data-testid="pilot-prev-btn"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#F8F9FB] hover:bg-[#E8EBF0] text-[#172033] disabled:opacity-40 border border-[#E8EBF0]"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Previous</span>
                  </button>

                  {currentIdx < questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => handleGoToQuestion(currentIdx + 1)}
                      data-testid="pilot-next-btn"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#1749E8] hover:bg-[#123BB8] text-white"
                    >
                      <span>Next Question</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={requestPilotDemoSubmit}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#15803D] hover:bg-emerald-800 text-white"
                    >
                      <span>Review &amp; Submit</span>
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Question Palette & Status Summary */}
            <div className="lg:col-span-4 bg-white border border-[#E8EBF0] rounded-xl p-5 space-y-4 h-fit">
              <h3 className="text-sm font-bold text-[#172033]">
                Diagnostic Question Palette
              </h3>

              {/* Answered / Unanswered / Marked Summary */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                  <p className="text-base font-extrabold text-[#15803D]">{paletteStats.answered}</p>
                  <p className="text-[10px] font-bold text-emerald-900 uppercase">Answered</p>
                </div>
                <div className="p-2 rounded-lg bg-[#F8F9FB] border border-[#E8EBF0]">
                  <p className="text-base font-extrabold text-[#53627A]">{paletteStats.unanswered}</p>
                  <p className="text-[10px] font-bold text-[#64748B] uppercase">Unanswered</p>
                </div>
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-base font-extrabold text-[#D97706]">{paletteStats.marked}</p>
                  <p className="text-[10px] font-bold text-amber-900 uppercase">Review</p>
                </div>
              </div>

              {/* Section-Grouped Question Number Buttons */}
              <div className="space-y-3">
                {DIAGNOSTIC_SECTIONS.map((sec, sIdx) => {
                  const secQuestions = questions.slice(sIdx * 5, sIdx * 5 + 5);
                  return (
                    <div key={sec.section} className="space-y-1.5">
                      <p className="text-[11px] font-bold text-[#53627A]">
                        Section {sec.section}: {sec.shortName}
                      </p>
                      <div className="grid grid-cols-5 gap-2">
                        {secQuestions.map((q, localIdx) => {
                          const globalIdx = sIdx * 5 + localIdx;
                          const ans = answers[q.question_id];
                          const isCurrent = globalIdx === currentIdx;
                          const isAnswered = Boolean(ans?.selectedOption);
                          const isMarked = Boolean(ans?.markedForReview);

                          let btnStyle = 'bg-[#F8F9FB] text-[#53627A] border-[#E8EBF0]';
                          if (isMarked) {
                            btnStyle = 'bg-amber-100 text-amber-950 border-amber-400 font-bold';
                          } else if (isAnswered) {
                            btnStyle = 'bg-emerald-600 text-white border-emerald-700 font-bold';
                          }

                          return (
                            <button
                              key={q.question_id}
                              type="button"
                              onClick={() => handleGoToQuestion(globalIdx)}
                              aria-label={`Question ${globalIdx + 1}, ${
                                isAnswered ? `Answered option ${ans.selectedOption}` : 'Unanswered'
                              }${isMarked ? ', Marked for review' : ''}`}
                              aria-current={isCurrent ? 'step' : undefined}
                              className={`h-9 rounded-lg text-xs border transition-all flex items-center justify-center ${btnStyle} ${
                                isCurrent ? 'ring-2 ring-[#1749E8] ring-offset-1 font-extrabold' : ''
                              }`}
                            >
                              {globalIdx + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-[#E8EBF0]">
                <button
                  type="button"
                  onClick={requestPilotDemoSubmit}
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-[#1749E8] hover:bg-[#123BB8] text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                >
                  Submit Diagnostic ({paletteStats.answered}/20 Answered)
                </button>

                <button
                  type="button"
                  onClick={() => requestPilotExamExit()}
                  disabled={isSubmitting}
                  className="w-full mt-2 py-2 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 text-xs font-bold rounded-lg border border-slate-300 hover:border-red-300 transition-colors flex items-center justify-center gap-1.5"
                  aria-label="Exit examination. Shortcut: Alt+Shift+X. Voice: Say Exit Exam"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Exit Examination</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded text-[10px] font-mono">Alt+Shift+X</kbd>
                </button>
              </div>
            </div>
          </div>

          {/* Submit Confirmation Dialog */}
          {showSubmitConfirm && (
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="pilot-submit-dialog-title"
              aria-describedby="pilot-submit-dialog-desc"
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
            >
              <div className="bg-white border border-[#E8EBF0] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
                <h3 id="pilot-submit-dialog-title" className="text-base font-extrabold text-[#172033]">
                  Submit Pilot Demo Diagnostic?
                </h3>
                <p id="pilot-submit-dialog-desc" className="text-xs text-[#53627A] leading-relaxed">
                  Are you sure you want to submit your Pilot Demo examination? You have answered{' '}
                  <strong>{paletteStats.answered}</strong> out of{' '}
                  <strong>{questions.length}</strong> questions ({paletteStats.unanswered} unanswered,{' '}
                  {paletteStats.marked} marked for review). Once submitted, you may not be able to change your answers.
                  Say <strong>"YES"</strong> to submit or <strong>"NO"</strong> to continue the examination.
                </p>
                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={cancelPilotDemoSubmit}
                    disabled={isSubmitting}
                    data-testid="pilot-cancel-submit-btn"
                    className="px-4 py-2 text-xs font-bold text-[#53627A] bg-[#F8F9FB] hover:bg-[#E8EBF0] rounded-lg border border-[#E8EBF0]"
                  >
                    NO, Continue Exam
                  </button>
                  <button
                    type="button"
                    autoFocus
                    onClick={handleSubmitDiagnostic}
                    disabled={isSubmitting}
                    data-testid="pilot-confirm-submit-btn"
                    className="px-4 py-2 text-xs font-bold text-white bg-[#15803D] hover:bg-emerald-800 rounded-lg"
                  >
                    {isSubmitting ? 'Saving Attempt...' : 'YES, Confirm & Submit'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fallback View if Results requested while attempt is loading or not selected */}
      {view === 'results' && !selectedAttempt && (
        <div className="bg-white border border-[#E8EBF0] rounded-xl p-8 text-center space-y-4" data-testid="pilot-results-loading">
          {loadingHistory ? (
            <div className="space-y-3 py-6">
              <div className="animate-spin w-8 h-8 border-4 border-[#1749E8] border-t-transparent rounded-full mx-auto" />
              <p className="text-sm font-bold text-slate-700">Loading your diagnostic results...</p>
            </div>
          ) : (
            <div className="space-y-3 py-6">
              <p className="text-sm font-bold text-slate-700">No diagnostic attempt selected.</p>
              <p className="text-xs text-slate-500">Please complete the diagnostic examination to generate your performance report.</p>
              <button
                type="button"
                onClick={() => switchView('instructions')}
                className="px-4 py-2 bg-[#1749E8] text-white text-xs font-bold rounded-lg hover:bg-[#123BB8]"
              >
                Start Pilot Demo Diagnostic
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================
          VIEW 3: DIAGNOSTIC RESULTS, VISUALIZATIONS, SUBJECT & TOPIC ANALYSIS
         =================================================================== */}
      {view === 'results' && selectedAttempt && (
        <div className="space-y-6" data-testid="pilot-results-view">
          {/* Top Results Banner with Audio Readout & Retake */}
          <div className="bg-white border border-[#E8EBF0] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-emerald-50 text-[#15803D] border border-emerald-200 text-xs font-bold">
                  Completed Diagnostic Report
                </span>
                <span className="text-xs text-[#64748B]">
                  Submitted on {new Date(selectedAttempt.completedAt).toLocaleString()}
                </span>
              </div>
              <h2 className="text-lg font-extrabold text-[#172033] mt-1">
                {selectedAttempt.examTitle} — Performance Analysis
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <AudioToolbar
                textToRead={`Diagnostic Results Summary. Total score: ${selectedAttempt.totalScore} out of ${selectedAttempt.totalMax}. Overall accuracy: ${selectedAttempt.accuracyPercentage} percent. Correct answers: ${selectedAttempt.correctCount}. Incorrect answers: ${selectedAttempt.incorrectCount}. Unanswered questions: ${selectedAttempt.unansweredCount}. Time taken: ${formatDurationHuman(selectedAttempt.totalTimeSeconds)}.`}
                label="Listen to Results"
              />
              <button
                type="button"
                onClick={() => {
                  resetAcceptanceForNewAttempt();
                  setView('instructions');
                }}
                className="px-3.5 py-2 bg-[#1749E8] hover:bg-[#123BB8] text-white text-xs font-bold rounded-lg transition-colors"
              >
                Take Another Diagnostic
              </button>
            </div>
          </div>

          {/* 1. OVERALL PERFORMANCE METRICS (7 Compact Cards per Section 9) */}
          <section aria-labelledby="overall-perf-heading" className="space-y-3">
            <h3 id="overall-perf-heading" className="text-sm font-bold text-[#172033]">
              Overall Performance Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="bg-white border border-[#E8EBF0] rounded-xl p-3.5">
                <p className="text-[10px] font-bold uppercase text-[#64748B]">Total Score</p>
                <p className="text-xl font-extrabold text-[#1749E8] mt-1" data-testid="result-total-score">
                  {selectedAttempt.totalScore}
                </p>
                <p className="text-[10px] text-[#64748B]">Net marks earned</p>
              </div>

              <div className="bg-white border border-[#E8EBF0] rounded-xl p-3.5">
                <p className="text-[10px] font-bold uppercase text-[#64748B]">Max Possible</p>
                <p className="text-xl font-extrabold text-[#172033] mt-1">
                  {selectedAttempt.totalMax}
                </p>
                <p className="text-[10px] text-[#64748B]">20 Qs × 3 marks</p>
              </div>

              <div className="bg-white border border-[#E8EBF0] rounded-xl p-3.5">
                <p className="text-[10px] font-bold uppercase text-[#64748B]">Correct Answers</p>
                <p className="text-xl font-extrabold text-[#15803D] mt-1" data-testid="result-correct-count">
                  {selectedAttempt.correctCount}
                </p>
                <p className="text-[10px] text-[#64748B]">+3 marks each</p>
              </div>

              <div className="bg-white border border-[#E8EBF0] rounded-xl p-3.5">
                <p className="text-[10px] font-bold uppercase text-[#64748B]">Incorrect Answers</p>
                <p className="text-xl font-extrabold text-[#DC2626] mt-1" data-testid="result-incorrect-count">
                  {selectedAttempt.incorrectCount}
                </p>
                <p className="text-[10px] text-[#64748B]">Sec C/D: -1 penalty</p>
              </div>

              <div className="bg-white border border-[#E8EBF0] rounded-xl p-3.5">
                <p className="text-[10px] font-bold uppercase text-[#64748B]">Unanswered</p>
                <p className="text-xl font-extrabold text-[#53627A] mt-1" data-testid="result-unanswered-count">
                  {selectedAttempt.unansweredCount}
                </p>
                <p className="text-[10px] text-[#64748B]">0 marks</p>
              </div>

              <div className="bg-white border border-[#E8EBF0] rounded-xl p-3.5">
                <p className="text-[10px] font-bold uppercase text-[#64748B]">Overall Accuracy</p>
                <p className="text-xl font-extrabold text-[#172033] mt-1" data-testid="result-accuracy">
                  {selectedAttempt.accuracyPercentage}%
                </p>
                <p className="text-[10px] text-[#64748B]">
                  {selectedAttempt.attemptedCount} attempted
                </p>
              </div>

              <div className="bg-white border border-[#E8EBF0] rounded-xl p-3.5">
                <p className="text-[10px] font-bold uppercase text-[#64748B]">Time Taken</p>
                <p className="text-xl font-extrabold text-[#172033] mt-1">
                  {formatDurationHuman(selectedAttempt.totalTimeSeconds)}
                </p>
                <p className="text-[10px] text-[#64748B]">of 25m 0s limit</p>
              </div>
            </div>
          </section>

          {/* 2. VISUALIZATIONS: Subject Bar Chart + Correct/Incorrect Donut Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Subject Performance Bar Chart (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-[#E8EBF0] rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#172033]">
                  Subject-wise Performance Bar Chart
                </h3>
                <p className="text-xs text-[#64748B]">
                  Net score out of 15 and accuracy percentage across the four SSC MTS sections.
                </p>
              </div>

              <div className="space-y-3.5" role="img" aria-label="Subject-wise score and accuracy bar chart">
                {(selectedAttempt.subjectBreakdown || []).map((subj) => {
                  const scorePct = Math.max(0, Math.min(100, Math.round((subj.netScore / subj.maxScore) * 100)));
                  return (
                    <div key={subj.section} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#172033]">
                          Sec {subj.section}: {subj.subject}
                        </span>
                        <span className="font-extrabold text-[#1749E8]">
                          {subj.netScore} / {subj.maxScore} pts ({subj.accuracyPercentage}% Accuracy)
                        </span>
                      </div>
                      <div className="w-full h-3 bg-[#F8F9FB] rounded-full overflow-hidden border border-[#E8EBF0]">
                        <div
                          className="h-full bg-[#1749E8] rounded-full transition-all"
                          style={{ width: `${scorePct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                        <span>
                          Attempted: {subj.attempted}/{subj.totalQuestions} · Correct: {subj.correct} · Incorrect: {subj.incorrect}
                        </span>
                        <span>
                          {subj.negativeMarks > 0 ? `-${subj.negativeMarks} penalty` : 'No negative marks'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Correct vs Incorrect vs Unanswered Donut Chart (5 cols) */}
            <div className="lg:col-span-5 bg-white border border-[#E8EBF0] rounded-xl p-5 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#172033]">
                  Response Distribution Donut Chart
                </h3>
                <p className="text-xs text-[#64748B]">
                  Breakdown of Correct, Incorrect, and Unanswered questions (Total: 20).
                </p>
              </div>

              {(() => {
                const total = Math.max(1, selectedAttempt.totalQuestions || 20);
                const radius = 52;
                const circumference = 2 * Math.PI * radius;
                const correctDash = (selectedAttempt.correctCount / total) * circumference;
                const incorrectDash = (selectedAttempt.incorrectCount / total) * circumference;
                const unansweredDash = (selectedAttempt.unansweredCount / total) * circumference;

                return (
                  <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2">
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <svg className="w-36 h-36 -rotate-90" viewBox="0 0 128 128" role="img" aria-label="Correct versus incorrect responses donut chart">
                        <title>
                          {selectedAttempt.correctCount} Correct, {selectedAttempt.incorrectCount} Incorrect, {selectedAttempt.unansweredCount} Unanswered
                        </title>
                        <circle
                          cx="64"
                          cy="64"
                          r={radius}
                          fill="transparent"
                          stroke="#E8EBF0"
                          strokeWidth="14"
                        />
                        {/* Correct Segment (Green) */}
                        <circle
                          cx="64"
                          cy="64"
                          r={radius}
                          fill="transparent"
                          stroke="#15803D"
                          strokeWidth="14"
                          strokeDasharray={`${correctDash} ${circumference}`}
                          strokeDashoffset={0}
                        />
                        {/* Incorrect Segment (Red) */}
                        <circle
                          cx="64"
                          cy="64"
                          r={radius}
                          fill="transparent"
                          stroke="#DC2626"
                          strokeWidth="14"
                          strokeDasharray={`${incorrectDash} ${circumference}`}
                          strokeDashoffset={-correctDash}
                        />
                        {/* Unanswered Segment (Slate) */}
                        <circle
                          cx="64"
                          cy="64"
                          r={radius}
                          fill="transparent"
                          stroke="#94A3B8"
                          strokeWidth="14"
                          strokeDasharray={`${unansweredDash} ${circumference}`}
                          strokeDashoffset={-(correctDash + incorrectDash)}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-lg font-extrabold text-[#172033]">
                          {selectedAttempt.accuracyPercentage}%
                        </span>
                        <span className="text-[10px] font-bold uppercase text-[#64748B]">
                          Accuracy
                        </span>
                      </div>
                    </div>

                    <ul className="space-y-2 text-xs" role="list">
                      <li className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-2 text-[#172033] font-semibold">
                          <span className="w-3 h-3 rounded-xs bg-[#15803D]" aria-hidden="true" />
                          Correct Answers
                        </span>
                        <span className="font-bold text-[#15803D]">
                          {selectedAttempt.correctCount} ({Math.round((selectedAttempt.correctCount / total) * 100)}%)
                        </span>
                      </li>
                      <li className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-2 text-[#172033] font-semibold">
                          <span className="w-3 h-3 rounded-xs bg-[#DC2626]" aria-hidden="true" />
                          Incorrect Answers
                        </span>
                        <span className="font-bold text-[#DC2626]">
                          {selectedAttempt.incorrectCount} ({Math.round((selectedAttempt.incorrectCount / total) * 100)}%)
                        </span>
                      </li>
                      <li className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-2 text-[#172033] font-semibold">
                          <span className="w-3 h-3 rounded-xs bg-[#94A3B8]" aria-hidden="true" />
                          Unanswered
                        </span>
                        <span className="font-bold text-[#53627A]">
                          {selectedAttempt.unansweredCount} ({Math.round((selectedAttempt.unansweredCount / total) * 100)}%)
                        </span>
                      </li>
                    </ul>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* 3. ACCESSIBLE SUBJECT-WISE SUMMARY TABLE */}
          <div className="bg-white border border-[#E8EBF0] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#172033]">
              Accessible Subject-wise Summary Table
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <caption className="sr-only">
                  Subject-wise Diagnostic Scores, Accuracy, and Attempt Counts
                </caption>
                <thead>
                  <tr className="bg-[#F8F9FB] border-y border-[#E8EBF0] text-[#172033] font-bold">
                    <th scope="col" className="py-2.5 px-3">Section &amp; Subject</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Attempted</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Correct</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Incorrect</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Unanswered</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Accuracy</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Net Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EBF0] text-[#172033]">
                  {(selectedAttempt.subjectBreakdown || []).map((s) => (
                    <tr key={s.section} className="hover:bg-[#F8F9FB]">
                      <td className="py-2.5 px-3 font-bold">
                        Section {s.section}: {s.subject}
                      </td>
                      <td className="py-2.5 px-3 text-right">{s.attempted} / {s.totalQuestions}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#15803D]">{s.correct}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#DC2626]">{s.incorrect}</td>
                      <td className="py-2.5 px-3 text-right text-[#64748B]">{s.unanswered}</td>
                      <td className="py-2.5 px-3 text-right font-bold">{s.accuracyPercentage}%</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-[#1749E8]">
                        {s.netScore} / {s.maxScore}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. TOPIC-WISE ANALYSIS & ACCURACY CHART */}
          <div className="bg-white border border-[#E8EBF0] rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#172033]">
                  Topic-wise Accuracy Chart &amp; Priority Classification
                </h3>
                <p className="text-xs text-[#64748B]">
                  Thresholds: Below 40% High Priority · 40–69% Moderate Priority · 70–84% Revision Recommended · 85%+ Strong Topic (with multi-question confidence check).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(selectedAttempt.topicBreakdown || []).map((t) => {
                const badgeStyle =
                  t.priority === 'High Priority'
                    ? 'bg-red-50 text-[#DC2626] border-red-200'
                    : t.priority === 'Moderate Priority'
                    ? 'bg-amber-50 text-[#D97706] border-amber-200'
                    : t.priority === 'Revision Recommended'
                    ? 'bg-[#EEF4FF] text-[#1749E8] border-[#D0DEFF]'
                    : 'bg-emerald-50 text-[#15803D] border-emerald-200';

                const barColor =
                  t.priority === 'High Priority'
                    ? 'bg-[#DC2626]'
                    : t.priority === 'Moderate Priority'
                    ? 'bg-[#D97706]'
                    : t.priority === 'Revision Recommended'
                    ? 'bg-[#1749E8]'
                    : 'bg-[#15803D]';

                return (
                  <div
                    key={`${t.subject}_${t.topic}`}
                    className="p-3.5 rounded-xl bg-[#F8F9FB] border border-[#E8EBF0] space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-extrabold text-[#172033]">{t.topic}</p>
                        <p className="text-[11px] text-[#64748B]">
                          Sec {t.section} · {t.subject}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeStyle}`}>
                        {t.priority}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-[#E8EBF0]">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${Math.max(4, t.accuracyPercentage)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[#172033]">
                        Accuracy: {t.accuracyPercentage}% ({t.correct}/{t.totalQuestions} correct)
                      </span>
                      <span className="text-[#64748B]">{t.confidenceNote}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. PERSONALIZED RECOMMENDATIONS (Section 10) */}
          <div className="bg-white border border-[#E8EBF0] rounded-xl p-5 space-y-4" data-testid="pilot-recommendations-section">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#172033] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#1749E8]" aria-hidden="true" />
                  <span>Personalized Study &amp; Practice Recommendations</span>
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">{historicalSummaryNote}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {recommendations.slice(0, 8).map((rec) => {
                const isHigh = rec.priority === 'High Priority';
                const isMod = rec.priority === 'Moderate Priority';
                return (
                  <div
                    key={rec.id}
                    className="p-4 rounded-xl border border-[#E8EBF0] bg-[#F8F9FB] flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            isHigh
                              ? 'bg-red-50 text-[#DC2626] border-red-200'
                              : isMod
                              ? 'bg-amber-50 text-[#D97706] border-amber-200'
                              : 'bg-[#EEF4FF] text-[#1749E8] border-[#D0DEFF]'
                          }`}
                        >
                          {rec.priority}
                        </span>
                        <span className="text-[10px] font-bold text-[#53627A] bg-white px-2 py-0.5 rounded border border-[#E8EBF0]">
                          {rec.trendLabel}
                          {rec.trendDeltaPercent !== null && rec.trendDeltaPercent !== 0
                            ? ` (${rec.trendDeltaPercent > 0 ? '+' : ''}${rec.trendDeltaPercent}%)`
                            : ''}
                        </span>
                      </div>

                      <h4 className="text-xs font-extrabold text-[#172033]">{rec.headline}</h4>
                      <p className="text-xs text-[#53627A] leading-relaxed">{rec.reason}</p>
                      <p className="text-[11px] font-semibold text-[#1749E8]">{rec.recommendedAction}</p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handlePracticeTopic(rec.subject, rec.topic)}
                        className="px-3 py-1.5 bg-[#1749E8] hover:bg-[#123BB8] text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 transition-colors"
                      >
                        <span>Practice {rec.topic}</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateTo('revision_planner')}
                        className="px-3 py-1.5 bg-white hover:bg-[#EEF4FF] text-[#172033] text-xs font-semibold rounded-lg border border-[#E8EBF0]"
                      >
                        SM-2 Revision
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5b. INTERACTIVE WRONG-ANSWER EXPLANATION DIALOGUE (Section 6) */}
          <div className="bg-white border-2 border-blue-200 rounded-xl p-5 sm:p-6 space-y-4 shadow-sm" data-testid="pilot-interactive-explanations">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8EBF0] pb-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200 mb-1">
                  <span>Interactive Learning Dialogue</span>
                  <span>·</span>
                  <span>{wrongQuestions.length} Incorrect Questions</span>
                </div>
                <h3 className="text-base font-bold text-[#172033]">
                  Sequential Wrong-Answer Concept Breakdown
                </h3>
                <p className="text-xs text-[#53627A]">
                  Step-by-step academic review: Hear your answer, why it is incorrect, the verified correct solution, and confirm understanding before proceeding.
                </p>
              </div>

              {!explanationActive && !dialogueDone && (
                <button
                  type="button"
                  onClick={handleStartExplanations}
                  className="px-4 py-2.5 bg-[#1749E8] hover:bg-[#123BB8] text-white text-xs font-bold rounded-lg shadow-sm inline-flex items-center gap-2 transition-all"
                >
                  <Headphones className="w-4 h-4" />
                  <span>Start Interactive Explanations</span>
                </button>
              )}
            </div>

            {explanationActive && wrongQuestions[wrongQuestionIdx] && (
              <div className="p-4 bg-[#F8FAFC] border border-[#D9E1EF] rounded-xl space-y-3.5 animate-fade-in">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#1749E8]">
                    Reviewing {wrongQuestionIdx + 1} of {wrongQuestions.length}
                  </span>
                  <span className="text-[11px] font-semibold text-[#53627A]">
                    {wrongQuestions[wrongQuestionIdx].subject} · {wrongQuestions[wrongQuestionIdx].topic}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-lg border border-[#D9E1EF]">
                  <p className="text-xs sm:text-sm font-bold text-[#172033]">
                    {wrongQuestions[wrongQuestionIdx].questionText}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-[10px] font-bold text-red-700 uppercase">Your Answer (Incorrect)</p>
                    <p className="text-xs font-bold text-red-900 mt-0.5">
                      {wrongQuestions[wrongQuestionIdx].selectedOption
                        ? `Option ${wrongQuestions[wrongQuestionIdx].selectedOption}`
                        : 'Unanswered'}
                    </p>
                  </div>

                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase">Correct Answer</p>
                    <p className="text-xs font-bold text-emerald-900 mt-0.5">
                      Option {wrongQuestions[wrongQuestionIdx].correctAnswer}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-[#172033] space-y-1">
                  <p className="font-bold text-[#1749E8]">
                    {simplifiedMode ? 'Simplified Concept Rule:' : 'Academic Explanation:'}
                  </p>
                  <p className="leading-relaxed">
                    {wrongQuestions[wrongQuestionIdx].explanation}
                  </p>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2">
                  <p className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-700" />
                    <span>Did you understand this explanation? (Say &ldquo;Yes&rdquo; or &ldquo;No&rdquo;)</span>
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleExplanationResponse('yes')}
                      className="px-3.5 py-1.5 bg-[#15803D] hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs inline-flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Yes, I Understand</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExplanationResponse('no')}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-2xs inline-flex items-center gap-1.5"
                    >
                      <span>No, Explain Simpler</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExplanationResponse('repeat')}
                      className="px-3 py-1.5 bg-[#EEF4FF] hover:bg-blue-100 text-[#1749E8] border border-blue-200 text-xs font-bold rounded-lg inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Repeat Explanation</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExplanationResponse('skip')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#53627A] text-xs font-semibold rounded-lg ml-auto"
                    >
                      <span>Skip to Next</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {dialogueDone && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Sequential Learning Dialogue Completed!</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  All incorrect answers from this diagnostic attempt have been reviewed. Topic weaknesses have been catalogued and saved against your candidate account.
                </p>
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => navigateTo('voice_practice')}
                    className="px-3 py-1.5 bg-[#1749E8] hover:bg-[#123BB8] text-white text-xs font-bold rounded-lg"
                  >
                    Open Voice Practice
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('revision_planner')}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-[#172033] border border-[#D9E1EF] text-xs font-bold rounded-lg"
                  >
                    Open SM-2 Revision Planner
                  </button>
                  <button
                    type="button"
                    onClick={handleStartExplanations}
                    className="px-3 py-1.5 text-xs text-[#1749E8] hover:underline"
                  >
                    Restart Review
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 6. QUESTION-BY-QUESTION DIAGNOSTIC SOLUTION REVIEW */}
          {selectedAttempt.enrichedResponses && selectedAttempt.enrichedResponses.length > 0 && (
            <div className="bg-white border border-[#E8EBF0] rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-[#172033]">
                  Question-by-Question Diagnostic Solutions ({selectedAttempt.enrichedResponses.length} Questions)
                </h3>
                <div className="flex items-center gap-1.5 bg-[#F8F9FB] p-1 rounded-lg border border-[#E8EBF0]">
                  {(['all', 'correct', 'incorrect', 'unanswered'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setQuestionReviewFilter(f)}
                      className={`px-2.5 py-1 text-xs font-bold rounded capitalize ${
                        questionReviewFilter === f
                          ? 'bg-[#1749E8] text-white'
                          : 'text-[#64748B] hover:text-[#172033]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {selectedAttempt.enrichedResponses
                  .filter((r) => {
                    if (questionReviewFilter === 'correct') return r.isCorrect;
                    if (questionReviewFilter === 'incorrect') return r.isAnswered && !r.isCorrect;
                    if (questionReviewFilter === 'unanswered') return !r.isAnswered;
                    return true;
                  })
                  .map((r, idx) => (
                    <div key={r.questionId} className="pt-2">
                      <AccessibleExplanationCard
                        questionText={`Diagnostic Question ${idx + 1}: ${r.questionText}`}
                        selectedOption={r.selectedOption}
                        selectedOptionText={r.selectedOption ? (r as any)[`option${r.selectedOption}`] : undefined}
                        correctOption={r.correctAnswer}
                        correctOptionText={(r as any)[`option${r.correctAnswer}`]}
                        isCorrect={r.isCorrect}
                        explanation={r.explanation || 'Step-by-step academic explanation: Identify the key rule for this topic and eliminate contradictory options.'}
                        subject={r.subject}
                        topic={r.topic}
                        section={r.section}
                        marksAwarded={r.marksAwarded}
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================
          VIEW 4: DIAGNOSTIC ATTEMPT HISTORY (Section 11)
         =================================================================== */}
      {view === 'history' && (
        <div className="bg-white border border-[#E8EBF0] rounded-xl p-5 sm:p-6 space-y-5" data-testid="pilot-history-view">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#172033]">
                Pilot Demo Diagnostic Attempt History
              </h2>
              <p className="text-xs text-[#64748B]">
                Authenticated candidate records for {user?.name || 'Candidate'} ({user?.rollNumber || uid}).
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetAcceptanceForNewAttempt();
                setView('instructions');
              }}
              className="px-4 py-2 bg-[#1749E8] hover:bg-[#123BB8] text-white text-xs font-bold rounded-lg shrink-0"
            >
              Start New Pilot Demo
            </button>
          </div>

          {loadingHistory ? (
            <p className="text-xs text-[#64748B] py-8 text-center">Loading diagnostic attempt history...</p>
          ) : attempts.length === 0 ? (
            <div className="p-8 text-center bg-[#F8F9FB] rounded-xl border border-[#E8EBF0] space-y-3">
              <p className="text-sm font-bold text-[#172033]">
                No Pilot Demo Diagnostic Attempts Recorded Yet
              </p>
              <p className="text-xs text-[#64748B] max-w-md mx-auto">
                Complete your first 20-question diagnostic examination to track your baseline score, accuracy progression, and topic mastery over time.
              </p>
              <button
                type="button"
                onClick={() => setView('instructions')}
                className="px-4 py-2 bg-[#1749E8] text-white text-xs font-bold rounded-lg"
              >
                Go to Diagnostic Instructions
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <caption className="sr-only">
                  Candidate Pilot Demo Diagnostic Attempt History
                </caption>
                <thead>
                  <tr className="bg-[#F8F9FB] border-y border-[#E8EBF0] text-[#172033] font-bold">
                    <th scope="col" className="py-2.5 px-3">Attempt #</th>
                    <th scope="col" className="py-2.5 px-3">Date &amp; Time</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Total Score</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Accuracy</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Time Taken</th>
                    <th scope="col" className="py-2.5 px-3 text-center">Acceptance</th>
                    <th scope="col" className="py-2.5 px-3 text-center">Status</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EBF0] text-[#172033]">
                  {attempts.map((att, idx) => {
                    const attemptNum = attempts.length - idx;
                    return (
                      <tr key={att.id} className="hover:bg-[#F8F9FB]">
                        <td className="py-3 px-3 font-extrabold text-[#1749E8]">
                          Attempt #{attemptNum}
                        </td>
                        <td className="py-3 px-3">
                          {new Date(att.completedAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold">
                          {att.totalScore} / {att.totalMax}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-[#15803D]">
                          {att.accuracyPercentage}%
                        </td>
                        <td className="py-3 px-3 text-right">
                          {formatDurationHuman(att.totalTimeSeconds)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-[#EEF4FF] text-[#1749E8] border border-[#D0DEFF] font-bold text-[10px] uppercase">
                            {att.acceptanceMethod || 'CHECKBOX'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-[#15803D] border border-emerald-200 font-bold text-[10px] uppercase">
                            {att.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAttempt(att);
                              try {
                                sessionStorage.setItem('pilot_demo_view_attempt_id', att.id);
                              } catch {}
                              setView('results');
                            }}
                            data-testid={`view-attempt-results-${att.id}`}
                            className="px-3 py-1.5 bg-[#EEF4FF] hover:bg-[#1749E8] text-[#1749E8] hover:text-white font-bold rounded-lg transition-colors"
                          >
                            View Results
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
