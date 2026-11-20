/**
 * ACCESSPREP-X Screen Registry
 *
 * Architectural Registry Note:
 * Originally enforced 16 approved application screens.
 * Adjusted to 17 approved screens to integrate "Pilot Demo Diagnostic" (`pilot_demo`)
 * as an independent first-class sidebar destination and diagnostic examination module
 * while keeping Mock Examination (`mock_exam`) and all other 16 screens independent.
 */

export const APPROVED_SCREENS = [
  'welcome',                // 1. Welcome / accessibility onboarding
  'login',                  // 2. Login
  'register',               // 3. Registration
  'dashboard',              // 4. Student dashboard
  'topics',                 // 5. Subject / topic explorer
  'voice_practice',         // 6. Voice-first practice
  'mock_exam',              // 7. Mock examination
  'results',                // 8. Results / explanations
  'ai_tutor',               // 9. AI tutor
  'revision_planner',       // 10. Revision planner
  'progress',               // 11. Progress dashboard
  'topic_mastery',          // 12. Topic mastery
  'accessibility_settings', // 13. Accessibility settings
  'learning_history',       // 14. Learning history
  'model_evaluation',       // 15. Dataset / model evaluation dashboard
  'model_training',         // 16. Dataset management / model training
  'pilot_demo',             // 17. Pilot Demo Diagnostic (20-question structured diagnostic)
  'screen_reader_settings'  // 18. Screen Reader Settings (Dedicated speech rate, voice, pitch & audio controls)
] as const;

export type ScreenId = (typeof APPROVED_SCREENS)[number];

export interface ScreenMetadata {
  id: ScreenId;
  screenNumber: number;
  title: string;
  shortLabel: string;
  description: string;
  requiresAuth: boolean;
  isAdminOnly?: boolean;
}

export const SCREEN_REGISTRY: Record<ScreenId, ScreenMetadata> = {
  welcome: {
    id: 'welcome',
    screenNumber: 1,
    title: 'Welcome & Accessibility Onboarding',
    shortLabel: 'Welcome',
    description: 'Initial accessibility configuration, high contrast setup, voice assistance preview, and shortcut guide.',
    requiresAuth: false
  },
  login: {
    id: 'login',
    screenNumber: 2,
    title: 'Candidate Login',
    shortLabel: 'Login',
    description: 'Secure candidate authentication with Roll Number / Registration ID and accessibility assistance.',
    requiresAuth: false
  },
  register: {
    id: 'register',
    screenNumber: 3,
    title: 'Candidate Registration',
    shortLabel: 'Register',
    description: 'New candidate registration, PwD disability details, scribe requirements, and exam region setup.',
    requiresAuth: false
  },
  dashboard: {
    id: 'dashboard',
    screenNumber: 4,
    title: 'Candidate Assessment Dashboard',
    shortLabel: 'Dashboard',
    description: 'Central portal overview with readiness metrics, quick test launch, and syllabus mastery summary.',
    requiresAuth: true
  },
  topics: {
    id: 'topics',
    screenNumber: 5,
    title: 'Subject & Topic Explorer',
    shortLabel: 'Subjects',
    description: 'Detailed curriculum breakdown of all 4 SSC MTS sections with verified question distribution.',
    requiresAuth: true
  },
  voice_practice: {
    id: 'voice_practice',
    screenNumber: 6,
    title: 'Voice-First Practice Session',
    shortLabel: 'Voice Practice',
    description: 'Dedicated voice question solving with OpenAI Whisper transcription, review confirmation, and TTS playback.',
    requiresAuth: true
  },
  mock_exam: {
    id: 'mock_exam',
    screenNumber: 7,
    title: 'Accessible Mock Examination',
    shortLabel: 'Mock Exam',
    description: 'Timed full SSC MTS simulation adhering to Session-I and Session-II rules and compensatory time allowances.',
    requiresAuth: true
  },
  results: {
    id: 'results',
    screenNumber: 8,
    title: 'Results & Answer Explanations',
    shortLabel: 'Results',
    description: 'In-depth performance analysis, sectional scoring, accuracy, and question-by-question academic explanations.',
    requiresAuth: true
  },
  ai_tutor: {
    id: 'ai_tutor',
    screenNumber: 9,
    title: 'AI Syllabus Tutor',
    shortLabel: 'AI Tutor',
    description: 'Retrieval-grounded syllabus tutoring, voice queries, concept clarification, and citation tracking.',
    requiresAuth: true
  },
  revision_planner: {
    id: 'revision_planner',
    screenNumber: 10,
    title: 'Spaced Repetition Revision Planner',
    shortLabel: 'Revision',
    description: 'SM-2 algorithmic memory tracking, daily revision queue, and personalized study schedules.',
    requiresAuth: true
  },
  progress: {
    id: 'progress',
    screenNumber: 11,
    title: 'Progress & Performance Dashboard',
    shortLabel: 'Progress',
    description: 'Longitudinal score trends, speed vs accuracy analytics, and Session-I vs Session-II comparative charts.',
    requiresAuth: true
  },
  topic_mastery: {
    id: 'topic_mastery',
    screenNumber: 12,
    title: 'Knowledge Topic Mastery',
    shortLabel: 'Topic Mastery',
    description: 'Bayesian Knowledge Tracing (BKT) skill proficiencies per syllabus topic with diagnostic drills.',
    requiresAuth: true
  },
  accessibility_settings: {
    id: 'accessibility_settings',
    screenNumber: 13,
    title: 'Accessibility Settings',
    shortLabel: 'Accessibility',
    description: 'Visual contrast palettes, typography scaling, OpenDyslexic font, high contrast borders, and compensatory exam timing.',
    requiresAuth: false
  },
  learning_history: {
    id: 'learning_history',
    screenNumber: 14,
    title: 'Candidate Learning History & Transcripts',
    shortLabel: 'Transcript Workspace',
    description: 'Dedicated workspace for speech recognition logs, candidate-controlled transcript privacy, and learning activity history.',
    requiresAuth: true
  },
  model_evaluation: {
    id: 'model_evaluation',
    screenNumber: 15,
    title: 'Dataset & Model Evaluation Dashboard',
    shortLabel: 'ML Evaluation',
    description: 'Academic evaluator console displaying live dataset statistics, confusion matrix, metrics, and real inference sandbox.',
    requiresAuth: true,
    isAdminOnly: true
  },
  model_training: {
    id: 'model_training',
    screenNumber: 16,
    title: 'Dataset Management & Model Training',
    shortLabel: 'Dataset & Training',
    description: 'Dataset repository, schema validation pipeline, reproducible scikit-learn training triggers, and artifact management.',
    requiresAuth: true,
    isAdminOnly: true
  },
  pilot_demo: {
    id: 'pilot_demo',
    screenNumber: 17,
    title: 'Pilot Demo Diagnostic',
    shortLabel: 'Pilot Demo',
    description: 'Structured 20-question, 25-minute SSC MTS diagnostic examination with section-wise scoring, topic priority analysis, and attempt history.',
    requiresAuth: true
  },
  screen_reader_settings: {
    id: 'screen_reader_settings',
    screenNumber: 18,
    title: 'Screen Reader Settings',
    shortLabel: 'Screen Reader',
    description: 'Text-to-speech rate, pitch, browser voice selection, language preferences, audio feedback, and question reading preferences.',
    requiresAuth: false
  }
};

/**
 * Validates that the application contains all 18 approved screens (16 core + Pilot Demo Diagnostic + Screen Reader Settings).
 */
export function validateScreenRegistry(): {
  isValid: boolean;
  totalScreens: number;
  approvedCount: 18;
  screens: readonly ScreenId[];
  error?: string;
} {
  const registeredCount = Object.keys(SCREEN_REGISTRY).length;
  const approvedCount = APPROVED_SCREENS.length;

  if (approvedCount !== 18) {
    return {
      isValid: false,
      totalScreens: approvedCount,
      approvedCount: 18,
      screens: APPROVED_SCREENS,
      error: `Approved screens list has ${approvedCount} screens, expected 18.`
    };
  }

  if (registeredCount !== 18) {
    return {
      isValid: false,
      totalScreens: registeredCount,
      approvedCount: 18,
      screens: APPROVED_SCREENS,
      error: `Screen registry contains ${registeredCount} screens, expected 18.`
    };
  }

  for (const screenId of APPROVED_SCREENS) {
    if (!SCREEN_REGISTRY[screenId]) {
      return {
        isValid: false,
        totalScreens: registeredCount,
        approvedCount: 18,
        screens: APPROVED_SCREENS,
        error: `Screen "${screenId}" is declared in APPROVED_SCREENS but missing from SCREEN_REGISTRY.`
      };
    }
  }

  return {
    isValid: true,
    totalScreens: 18,
    approvedCount: 18,
    screens: APPROVED_SCREENS
  };
}
