/**
 * ACCESSPREP-X — Shared API Request & Response Types
 */

import type {
  User,
  Question,
  MockExamAttempt,
  DiagnosticAttempt,
  TopicMasteryRecord,
  RevisionItem,
  LearningHistoryEntry,
  AccessibilitySettings
} from '../global/domain.types.ts';

export interface ApiHealthResponse {
  status: 'ok' | 'error';
  database: 'postgresql' | 'json-fallback';
  questionCount: number;
  timestamp: string;
}

export interface AuthChallengeResponse {
  challengeId: string;
  phrase: string;
  expiresAt: number;
}

export interface AuthVerifyChallengeResponse {
  success: boolean;
  verificationToken?: string;
  attemptsRemaining?: number;
  error?: string;
}

export interface AuthSuccessResponse {
  user: Omit<User, 'passwordHash'>;
  settings?: AccessibilitySettings;
}

export interface PracticeSubmitPayload {
  userId: string;
  questionId: string;
  selectedOption: string;
  timeSpentSeconds: number;
  mode: 'voice' | 'standard';
}

export interface PracticeSubmitResponse {
  attempt: {
    id: string;
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string;
  };
  mastery: TopicMasteryRecord;
  revision: RevisionItem;
}

export interface MockExamStartResponse {
  isExhausted?: boolean;
  attempt: MockExamAttempt;
  questions: Question[];
  rotationStatus: {
    currentCycle: number;
    completedQuestionCount: number;
    remainingQuestionsInCycle: number;
    totalPoolSize: number;
  };
}

export interface ProgressAnalyticsSummary {
  totalPracticeAttempts: number;
  correctPracticeAttempts: number;
  overallAccuracy: number;
  totalMockExams: number;
  averageMockScore: number;
  bestMockScore: number;
  dueRevisionsCount: number;
  masteredTopicsCount: number;
  totalTopicsTracked: number;
  recentHistory: LearningHistoryEntry[];
  diagnosticHistory?: DiagnosticAttempt[];
}
