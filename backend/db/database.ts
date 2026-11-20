import fs from 'fs';
import path from 'path';
import {
  DiagnosticQuestionResponse,
  DiagnosticSubjectSummary,
  DiagnosticTopicSummary
} from '../src/services/pilotDemoScoring.ts';

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
  fontFace?: 'system' | 'hyperlegible' | 'opendyslexic' | 'verdana' | 'serif' | 'mono';
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

const DB_FILE = [
  path.resolve(import.meta.dirname, '../data/app_database.json'),
  path.resolve(process.cwd(), 'backend/data/app_database.json'),
  path.resolve(process.cwd(), 'src/data/app_database.json')
].find((p) => fs.existsSync(p)) || path.resolve(import.meta.dirname, '../data/app_database.json');

const QUESTIONS_FILE = [
  path.resolve(import.meta.dirname, '../data/ssc_mts_questions.json'),
  path.resolve(process.cwd(), 'backend/data/ssc_mts_questions.json'),
  path.resolve(process.cwd(), 'src/data/ssc_mts_questions.json')
].find((p) => fs.existsSync(p)) || path.resolve(import.meta.dirname, '../data/ssc_mts_questions.json');

export interface DatabaseStore {
  users: User[];
  practiceAttempts: PracticeAttempt[];
  mockAttempts: MockExamAttempt[];
  diagnosticAttempts: DiagnosticAttempt[];
  revisionItems: RevisionItem[];
  topicMastery: TopicMasteryRecord[];
  accessibilitySettings: Record<string, AccessibilitySettings>;
  learningHistory: LearningHistoryEntry[];
  currentAffairsQuestions?: CurrentAffairsQuestion[];
  transcripts?: TranscriptLogEntry[];
  transcriptSettings?: Record<string, TranscriptPrivacySettings>;
  mockQuestionAssignments?: MockExamQuestionAssignment[];
  mockRotationStates?: Record<string, MockExamRotationState>;
}

let memoryDb: DatabaseStore | null = null;
let cachedQuestions: Question[] | null = null;

export function loadQuestions(): Question[] {
  if (cachedQuestions) return cachedQuestions;
  try {
    if (fs.existsSync(QUESTIONS_FILE)) {
      const raw = fs.readFileSync(QUESTIONS_FILE, 'utf-8');
      cachedQuestions = JSON.parse(raw);
      return cachedQuestions!;
    }
  } catch (err) {
    console.error('Error loading questions file:', err);
  }
  return [];
}

export function initDatabase(): DatabaseStore {
  if (memoryDb) return memoryDb;

  let initial: DatabaseStore = {
    users: [
      {
        id: 'usr_candidate_01',
        rollNumber: 'SSC-2026-MTS-01',
        name: 'Aarav Sharma (Candidate)',
        email: 'candidate@accessprep.nic.in',
        passwordHash: 'candidate123', // Demo PIN/password
        role: 'candidate',
        pwdCategory: 'Visually Impaired',
        needScribe: true,
        examRegion: 'Northern Region (NR)',
        examLanguage: 'English',
        createdAt: '2026-03-01T10:00:00Z'
      },
      {
        id: 'usr_admin_01',
        rollNumber: 'SSC-ADMIN-01',
        name: 'Dr. Meera Iyer (Academic Evaluator)',
        email: 'evaluator@ssc.gov.in',
        passwordHash: 'admin123',
        role: 'admin',
        pwdCategory: 'None',
        needScribe: false,
        examRegion: 'HQ New Delhi',
        examLanguage: 'English',
        createdAt: '2026-03-01T10:00:00Z'
      }
    ],
    practiceAttempts: [],
    mockAttempts: [],
    diagnosticAttempts: [],
    revisionItems: [],
    topicMastery: [],
    accessibilitySettings: {
      usr_candidate_01: {
        userId: 'usr_candidate_01',
        theme: 'sapphire',
        fontScale: 125,
        dyslexiaFont: false,
        speechRate: 1.0,
        speechPitch: 1.0,
        voiceURI: 'default',
        autoReadAloud: true,
        highContrastBorders: true,
        reduceMotion: false,
        compensatoryTimeEnabled: true,
        whisperModelSize: 'base'
      }
    },
    learningHistory: [],
    currentAffairsQuestions: [],
    transcripts: [],
    transcriptSettings: {},
    mockQuestionAssignments: [],
    mockRotationStates: {}
  };

  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      initial = { ...initial, ...JSON.parse(data) };
      if (!Array.isArray(initial.diagnosticAttempts)) {
        initial.diagnosticAttempts = [];
      }
      if (!Array.isArray(initial.currentAffairsQuestions)) {
        initial.currentAffairsQuestions = [];
      }
      if (!Array.isArray(initial.transcripts)) {
        initial.transcripts = [];
      }
      if (!initial.transcriptSettings || typeof initial.transcriptSettings !== 'object') {
        initial.transcriptSettings = {};
      }
      if (!Array.isArray(initial.mockQuestionAssignments)) {
        initial.mockQuestionAssignments = [];
      }
      if (!initial.mockRotationStates || typeof initial.mockRotationStates !== 'object') {
        initial.mockRotationStates = {};
      }
    } catch (e) {
      console.warn('Could not parse database file, initializing fresh store:', e);
    }
  } else {
    saveDatabase(initial);
  }

  memoryDb = initial;
  return memoryDb;
}

export function saveDatabase(store: DatabaseStore) {
  memoryDb = store;
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

export function getDb(): DatabaseStore {
  if (!memoryDb) {
    return initDatabase();
  }
  return memoryDb;
}

export function resetQuestionsCache(): void {
  cachedQuestions = null;
}
