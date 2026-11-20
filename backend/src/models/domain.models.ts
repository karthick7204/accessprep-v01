/**
 * ACCESSPREP-X — Global Domain Type Definitions
 * Shared across frontend features, services, and backend repositories.
 */

import type {
  DiagnosticQuestionResponse,
  DiagnosticSubjectSummary,
  DiagnosticTopicSummary
} from '../services/pilotDemoScoring.ts';

export interface User {
  id: string;
  rollNumber: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'candidate' | 'admin';
  pwdCategory: 'None' | 'Visually Impaired' | 'Low Vision' | 'Locomotor';
  needScribe: boolean;
  examRegion: string;
  examLanguage: string;
  createdAt: string;
}

export interface Question {
  question_id: string;
  subject: string;
  topic: string;
  subtopic: string;
  question_text: string;
  question_type: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
  difficulty_label: string;
  source_name: string;
  source_reference: string;
  source_type: string;
  verification_status: string;
  language: string;
  created_at: string;
  updated_at: string;
  dataset_version: string;
}

export interface PracticeAttempt {
  id: string;
  userId: string;
  questionId: string;
  selectedOption: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  mode: 'voice' | 'standard';
  timestamp: string;
}

export interface MockExamAttempt {
  id: string;
  userId: string;
  examTitle: string;
  session1Score: number;
  session2Score: number;
  totalScore: number;
  totalMax: number;
  percentage: number;
  qualified: boolean;
  totalTimeSeconds: number;
  answers: Record<string, { selectedOption: string | null; timeSpent: number; markedForReview?: boolean }>;
  completedAt: string;
  // Rotation tracking fields (backward-compatible)
  cycleNumber?: number;
  attemptSequence?: number;
  status?: 'in_progress' | 'completed' | 'discarded' | 'expired';
  totalQuestions?: number;
  answeredQuestions?: number;
  startedAt?: string;
  score?: number;
  accuracy?: number;
  remainingTime?: number;
  currentQuestionIndex?: number;
  questionIds?: string[];
}

export interface MockExamQuestionAssignment {
  id: string;
  userId: string;
  attemptId: string;
  questionId: string;
  cycleNumber: number;
  assignedAt: string;
  isSubmitted: boolean;
}

export interface MockExamRotationState {
  userId: string;
  currentCycle: number;
  completedQuestionCount: number;
  lastAttemptSequence: number;
  updatedAt: string;
}

export interface RevisionItem {
  id: string;
  userId: string;
  questionId: string;
  repetitions: number;
  intervalDays: number;
  easinessFactor: number;
  lastReviewedAt: string;
  nextReviewDue: string;
  masteryLevel: 'Novice' | 'Learning' | 'Reviewing' | 'Mastered';
}

export interface TopicMasteryRecord {
  id: string;
  userId: string;
  subject: string;
  topic: string;
  p_known: number;
  masteryPercentage: number;
  tier: 'Novice' | 'Developing' | 'Proficient' | 'Mastered';
  attemptsCount: number;
  correctCount: number;
  updatedAt: string;
}

export interface AccessibilitySettings {
  userId: string;
  theme: 'sapphire' | 'high_contrast_yellow' | 'monochrome_dark' | 'soft_dark';
  fontScale: number; // 100, 125, 150, 175, 200
  dyslexiaFont: boolean;
  speechRate: number; // 0.75, 1.0, 1.25, 1.5
  speechPitch: number;
  voiceURI: string;
  autoReadAloud: boolean;
  highContrastBorders: boolean;
  reduceMotion: boolean;
  compensatoryTimeEnabled: boolean;
  whisperModelSize: 'tiny' | 'base' | 'small';
  isBlindMode?: boolean;
  speechVolume?: number; // 0.0 to 1.0
  recognitionLang?: string; // 'en-IN', 'en-US', etc.
  readQuestionAutomatically?: boolean;
  readOptionsAutomatically?: boolean;
  autoAnnouncements?: boolean;
}

export interface LearningHistoryEntry {
  id: string;
  userId: string;
  type: 'practice' | 'mock_exam' | 'diagnostic' | 'ai_tutor' | 'revision';
  title: string;
  summary: string;
  score?: number;
  maxScore?: number;
  durationSeconds: number;
  timestamp: string;
}

export interface DiagnosticAttempt {
  id: string;
  clientSubmissionId?: string;
  userId: string;
  examTitle: string;
  status: 'completed' | 'in_progress';
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  session1Score: number;
  session2Score: number;
  totalScore: number;
  totalMax: number;
  percentage: number;
  accuracyPercentage: number;
  totalTimeSeconds: number;
  responses: DiagnosticQuestionResponse[];
  subjectBreakdown: DiagnosticSubjectSummary[];
  topicBreakdown: DiagnosticTopicSummary[];
  acceptanceStatus?: 'NOT_ACCEPTED' | 'ACCEPTED';
  acceptanceMethod?: 'VOICE' | 'CHECKBOX' | 'KEYBOARD';
  acceptedAt?: string;
  examStartedAt?: string;
  completedAt: string;
}

export interface SpokenVerificationChallenge {
  id: string;
  phrase: string;
  expiresAt: number;
  attempts: number;
  verified: boolean;
  verificationToken?: string;
}

export interface CurrentAffairsQuestion {
  id: string;
  category:
    | 'National Affairs'
    | 'International Affairs'
    | 'Science and Technology'
    | 'Government Schemes'
    | 'Economy'
    | 'Sports'
    | 'Awards and Honours'
    | 'Important Appointments'
    | 'Environment'
    | 'Important Days';
  topic: string;
  question_text: string;
  questionText?: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  correctAnswer?: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  source_name: string;
  sourceAttribution?: string;
  source_reference?: string;
  sourceUrl?: string;
  publication_date: string;
  publishedDate?: string;
  retrieval_date: string;
  verification_status: 'Verified';
}

export interface TranscriptLogEntry {
  id: string;
  userId: string;
  timestamp: string;
  screenId: string;
  transcript: string;
  rawTranscript?: string;
  confidence?: number;
  status: 'recognized' | 'unrecognized' | 'command_executed' | 'fallback';
  intent?: string;
  recognizedIntent?: string;
  sessionType?: string;
  wasConsumed?: boolean;
}

export interface TranscriptPrivacySettings {
  userId: string;
  storageEnabled?: boolean;
  storeTranscripts?: boolean;
  retentionDays?: number;
  autoDeleteDays?: number;
  allowAnonymousAnalysis?: boolean;
  lastClearedAt?: string;
}

export interface DatabaseStore {
  users: User[];
  practiceAttempts: PracticeAttempt[];
  mockAttempts: MockExamAttempt[];
  diagnosticAttempts: DiagnosticAttempt[];
  revisionItems: RevisionItem[];
  topicMastery: TopicMasteryRecord[];
  accessibilitySettings: AccessibilitySettings[];
  learningHistory: LearningHistoryEntry[];
  mockExamAssignments?: MockExamQuestionAssignment[];
  mockExamRotationStates?: MockExamRotationState[];
  transcriptLogs?: TranscriptLogEntry[];
  transcriptPrivacySettings?: TranscriptPrivacySettings[];
}
