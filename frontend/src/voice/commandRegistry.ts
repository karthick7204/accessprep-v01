/**
 * ACCESSPREP-X Voice Command Registry
 * Mapping of all 16 approved screens to natural voice aliases, spoken responses, and actions.
 */

import { ScreenId, APPROVED_SCREENS, SCREEN_REGISTRY } from '../types/screens.ts';
import { NavigationTarget } from './commandTypes.ts';

export const SCREEN_TARGETS: Record<ScreenId, NavigationTarget> = {
  welcome: {
    screenId: 'welcome',
    screenNumber: 1,
    title: 'Welcome & Accessibility Onboarding',
    shortLabel: 'Welcome',
    spokenName: 'Welcome and Onboarding',
    aliases: [
      'welcome',
      'welcome screen',
      'onboarding',
      'start onboarding',
      'intro',
      'introduction',
      'getting started'
    ],
    requiresAuth: false,
    actionSummary: 'You can explore accessibility features, test voice recognition, adjust contrast, and sign in to your candidate account.'
  },
  login: {
    screenId: 'login',
    screenNumber: 2,
    title: 'Candidate Login',
    shortLabel: 'Login',
    spokenName: 'Candidate Login',
    aliases: [
      'login',
      'log in',
      'sign in',
      'candidate login',
      'open login',
      'authenticate',
      'auth'
    ],
    requiresAuth: false,
    actionSummary: 'You can enter your Roll Number or Registration ID to securely access your student dashboard and study progress.'
  },
  register: {
    screenId: 'register',
    screenNumber: 3,
    title: 'Candidate Registration',
    shortLabel: 'Register',
    spokenName: 'Candidate Registration',
    aliases: [
      'register',
      'registration',
      'candidate registration',
      'sign up',
      'new candidate',
      'create account'
    ],
    requiresAuth: false,
    actionSummary: 'You can register a new candidate account, specify PwD category details, request scribe support, and configure compensatory time.'
  },
  dashboard: {
    screenId: 'dashboard',
    screenNumber: 4,
    title: 'Candidate Assessment Dashboard',
    shortLabel: 'Dashboard',
    spokenName: 'Candidate Dashboard',
    aliases: [
      'dashboard',
      'home',
      'candidate dashboard',
      'student dashboard',
      'main screen',
      'portal',
      'home screen',
      'overview',
      'go home',
      'take me home',
      'go to dashboard',
      'read dashboard',
      'open dashboard'
    ],
    requiresAuth: true,
    actionSummary: 'You can review your overall exam readiness, check syllabus mastery, review flashcards, or jump directly into practice and mock tests.'
  },
  topics: {
    screenId: 'topics',
    screenNumber: 5,
    title: 'Subject & Topic Explorer',
    shortLabel: 'Subjects',
    spokenName: 'Subject and Topic Explorer',
    aliases: [
      'topics',
      'subjects',
      'syllabus',
      'explore topics',
      'review topics',
      'curriculum',
      'subject explorer',
      'explore subjects',
      'syllabus breakdown',
      'all subjects'
    ],
    requiresAuth: true,
    actionSummary: 'You can explore all four SSC MTS curriculum sections, view question distribution counts, and launch focused practice on specific topics.'
  },
  voice_practice: {
    screenId: 'voice_practice',
    screenNumber: 6,
    title: 'Voice-First Practice Session',
    shortLabel: 'Voice Practice',
    spokenName: 'Voice Practice',
    aliases: [
      'voice practice',
      'practice',
      'start practice',
      'start exam',
      'start test',
      'practice questions',
      'practice session',
      'voice test',
      'solve questions',
      'practice drill'
    ],
    requiresAuth: true,
    actionSummary: 'You can solve questions hands-free by speaking Option A, B, C, or D, hear immediate explanations, and update your skill profile.'
  },
  mock_exam: {
    screenId: 'mock_exam',
    screenNumber: 7,
    title: 'Accessible Mock Examination',
    shortLabel: 'Mock Exam',
    spokenName: 'Mock Examination',
    aliases: [
      'mock exam',
      'mock examination',
      'start mock test',
      'start mock exam',
      'open exam',
      'take test',
      'mock test',
      'give exam',
      'full test',
      'timed test',
      'ssc mts mock test',
      'accessible mock examination'
    ],
    requiresAuth: true,
    actionSummary: 'You can take a full 90-question SSC MTS simulated examination with Section I and Section II timing and compensatory time support.'
  },
  results: {
    screenId: 'results',
    screenNumber: 8,
    title: 'Results & Answer Explanations',
    shortLabel: 'Results',
    spokenName: 'Results and Explanations',
    aliases: [
      'results',
      'my results',
      'score',
      'explanations',
      'exam review',
      'last test results',
      'view results',
      'performance breakdown'
    ],
    requiresAuth: true,
    actionSummary: 'You can analyze question-by-question solutions, examine Session I and Session II scores, and study official academic explanations.'
  },
  ai_tutor: {
    screenId: 'ai_tutor',
    screenNumber: 9,
    title: 'AI Syllabus Tutor',
    shortLabel: 'AI Tutor',
    spokenName: 'AI Syllabus Tutor',
    aliases: [
      'ai tutor',
      'open ai tutor',
      'go to ai tutor',
      'ask my tutor',
      'learning assistant',
      'tutor',
      'ask tutor',
      'scribe',
      'ai scribe',
      'talk to tutor'
    ],
    requiresAuth: true,
    actionSummary: 'You can ask any doubt on SSC MTS math, reasoning, English, or general awareness, and hear step-by-step spoken explanations.'
  },
  revision_planner: {
    screenId: 'revision_planner',
    screenNumber: 10,
    title: 'Spaced Repetition Revision Planner',
    shortLabel: 'Revision',
    spokenName: 'Revision Planner',
    aliases: [
      'revision planner',
      'revision',
      'flashcards',
      'spaced repetition',
      'review queue',
      'daily revision',
      'open revision',
      'memory cards',
      'sm2 planner',
      'study cards',
      'tuition planner',
      'tuition',
      'revision cards'
    ],
    requiresAuth: true,
    actionSummary: 'You can review daily flashcards powered by the SM-2 algorithm, reveal answers by voice, and rate your recall difficulty.'
  },
  progress: {
    screenId: 'progress',
    screenNumber: 11,
    title: 'Progress & Performance Dashboard',
    shortLabel: 'Progress',
    spokenName: 'Progress Analytics',
    aliases: [
      'progress',
      'my progress',
      'analytics',
      'scorecard',
      'performance',
      'show my progress',
      'view analytics',
      'how am i doing',
      'report card',
      'progress dashboard',
      'learning progress',
      'my analytics',
      'view progress',
      'check progress'
    ],
    requiresAuth: true,
    actionSummary: 'You can inspect your longitudinal score graphs, accuracy trends across subjects, and Session I versus Session II progress.'
  },
  topic_mastery: {
    screenId: 'topic_mastery',
    screenNumber: 12,
    title: 'Knowledge Topic Mastery',
    shortLabel: 'Topic Mastery',
    spokenName: 'Topic Mastery',
    aliases: [
      'topic mastery',
      'mastery',
      'knowledge tracing',
      'bkt',
      'skill levels',
      'topic breakdown',
      'syllabus mastery',
      'knowledge mastery'
    ],
    requiresAuth: true,
    actionSummary: 'You can view Bayesian Knowledge Tracing skill proficiencies for every SSC MTS topic and launch diagnostic drills on weak areas.'
  },
  accessibility_settings: {
    screenId: 'accessibility_settings',
    screenNumber: 13,
    title: 'Accessibility Settings',
    shortLabel: 'Accessibility',
    spokenName: 'Accessibility Settings',
    aliases: [
      'accessibility settings',
      'open accessibility settings',
      'go to accessibility settings',
      'accessibility',
      'settings',
      'preferences',
      'contrast',
      'contrast settings',
      'display settings',
      'theme settings',
      'font size',
      'visual settings',
      'visual accessibility',
      'color theme',
      'color themes',
      'high contrast',
      'configure accessibility',
      'accessibility menu'
    ],
    requiresAuth: false,
    actionSummary: 'You can customize visual contrast palettes, high contrast borders, typography scaling, OpenDyslexic font, and compensatory examination timing.'
  },
  learning_history: {
    screenId: 'learning_history',
    screenNumber: 14,
    title: 'Candidate Learning History & Transcripts',
    shortLabel: 'Transcript Workspace',
    spokenName: 'Transcript Workspace',
    aliases: [
      'transcript',
      'transcripts',
      'transcript workspace',
      'open transcript',
      'open transcript workspace',
      'transcripts workspace',
      'open transcripts workspace',
      'go to transcript workspace',
      'candidate transcript workspace',
      'live dictation',
      'live dictation workspace',
      'dictation workspace',
      'voice dictation',
      'voice recording workspace',
      'voice transcript',
      'voice log',
      'learning history',
      'history',
      'past tests',
      'attempts',
      'my activity',
      'archive',
      'audit log',
      'test history'
    ],
    requiresAuth: true,
    actionSummary: 'You can dictate and record notes in real time, run automated grammar analysis, review recognized voice transcripts, export transcripts, and manage privacy settings.'
  },
  model_evaluation: {
    screenId: 'model_evaluation',
    screenNumber: 15,
    title: 'Dataset & Model Evaluation Dashboard',
    shortLabel: 'ML Evaluation',
    spokenName: 'Model Evaluation Dashboard',
    aliases: [
      'model evaluation',
      'dataset evaluation',
      'ml metrics',
      'confusion matrix',
      'evaluate model',
      'model test'
    ],
    requiresAuth: true,
    isAdminOnly: true,
    actionSummary: 'Administrator console for inspecting machine learning classifier accuracy, confusion matrix figures, and latency metrics.'
  },
  model_training: {
    screenId: 'model_training',
    screenNumber: 16,
    title: 'Dataset Management & Model Training',
    shortLabel: 'Dataset & Training',
    spokenName: 'Model Training Console',
    aliases: [
      'model training',
      'train model',
      'retrain model',
      'dataset management',
      'training pipeline'
    ],
    requiresAuth: true,
    isAdminOnly: true,
    actionSummary: 'Administrator console for managing dataset versions, schema validation, and executing reproducible model training pipelines.'
  },
  pilot_demo: {
    screenId: 'pilot_demo',
    screenNumber: 17,
    title: 'Pilot Demo Diagnostic',
    shortLabel: 'Pilot Demo',
    spokenName: 'Pilot Demo Diagnostic',
    aliases: [
      'pilot demo',
      'pilot demo diagnostic',
      'diagnostic',
      'diagnostic test',
      'diagnostic exam',
      'diagnostic examination',
      'start pilot demo',
      'open pilot demo',
      'pilot test',
      'pilot examination'
    ],
    requiresAuth: true,
    actionSummary: 'You can take a structured 20-question, 25-minute diagnostic examination across all four SSC MTS sections, review topic-wise accuracy, and view attempt history.'
  },
  screen_reader_settings: {
    screenId: 'screen_reader_settings',
    screenNumber: 18,
    title: 'Screen Reader Settings',
    shortLabel: 'Screen Reader',
    spokenName: 'Screen Reader Settings',
    aliases: [
      'screen reader settings',
      'open screen reader settings',
      'go to screen reader settings',
      'screen reader',
      'voice settings',
      'open voice settings',
      'speech settings',
      'open speech settings',
      'text to speech settings',
      'tts settings',
      'voice preferences',
      'speech rate',
      'voice options',
      'audio settings',
      'sound settings',
      'speech controls',
      'voice controls',
      'screen reader options',
      'voice speed'
    ],
    requiresAuth: false,
    actionSummary: 'You can customize text-to-speech rate, pitch, browser voice selection, language preferences, audio feedback, and question reading preferences.'
  }
};

/**
 * Subject filter voice triggers for targeted practice navigation
 */
export const PRACTICE_SUBJECT_TRIGGERS: { phrase: string; subject: string; label: string }[] = [
  {
    phrase: 'practice reasoning',
    subject: 'Reasoning Ability and Problem Solving',
    label: 'Reasoning Ability'
  },
  {
    phrase: 'practice math',
    subject: 'Numerical and Mathematical Ability',
    label: 'Numerical Ability'
  },
  {
    phrase: 'practice numerical',
    subject: 'Numerical and Mathematical Ability',
    label: 'Numerical Ability'
  },
  {
    phrase: 'practice english',
    subject: 'English Language and Comprehension',
    label: 'English Language'
  },
  {
    phrase: 'practice general awareness',
    subject: 'General Awareness',
    label: 'General Awareness'
  },
  {
    phrase: 'practice awareness',
    subject: 'General Awareness',
    label: 'General Awareness'
  },
  {
    phrase: 'practice gk',
    subject: 'General Awareness',
    label: 'General Awareness'
  }
];

