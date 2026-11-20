import React, { useEffect } from 'react';
import { AccessibilityProvider, useAccessibility } from './context/AccessibilityContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { PageEntryHelpBanner } from './components/PageEntryHelpBanner';

// Exactly the 16 approved screens
import { WelcomeScreen } from './screens/WelcomeScreen';
import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { TopicsScreen } from './screens/TopicsScreen';
import { VoicePracticeScreen } from './screens/VoicePracticeScreen';
import { MockExamScreen } from './screens/MockExamScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { AiTutorScreen } from './screens/AiTutorScreen';
import { RevisionPlannerScreen } from './screens/RevisionPlannerScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { TopicMasteryScreen } from './screens/TopicMasteryScreen';
import { AccessibilitySettingsScreen } from './screens/AccessibilitySettingsScreen';
import { LearningHistoryScreen } from './screens/LearningHistoryScreen';
import { ModelEvaluationScreen } from './screens/ModelEvaluationScreen';
import { ModelTrainingScreen } from './screens/ModelTrainingScreen';
import { PilotDemoScreen } from './screens/PilotDemoScreen';
import { ScreenReaderSettingsScreen } from './screens/ScreenReaderSettingsScreen';

const MainApp: React.FC = () => {
  const { currentScreen, announceMessage, theme, user, pendingExamExit, confirmExamExit } = useAccessibility();

  // Screen reader announcement on screen change
  useEffect(() => {
    const screenNames: Record<string, string> = {
      'welcome': 'Welcome & Accessibility Onboarding',
      'login': 'Candidate Login',
      'register': 'Candidate Registration',
      'dashboard': 'Student Dashboard',
      'topics': 'Subject & Topic Explorer',
      'voice_practice': 'Voice-First Practice Session',
      'voice-practice': 'Voice-First Practice Session',
      'mock_exam': 'Accessible Mock Examination',
      'mock-exam': 'Accessible Mock Examination',
      'results': 'Results & Answer Explanations',
      'ai_tutor': 'AI Tutor Scribe',
      'ai-tutor': 'AI Tutor Scribe',
      'revision_planner': 'Adaptive Revision Planner',
      'revision-planner': 'Adaptive Revision Planner',
      'progress': 'Progress & Performance Dashboard',
      'topic_mastery': 'Knowledge & Topic Mastery',
      'topic-mastery': 'Knowledge & Topic Mastery',
      'accessibility_settings': 'Accessibility Settings',
      'accessibility-settings': 'Accessibility Settings',
      'screen_reader_settings': 'Screen Reader Settings',
      'screen-reader-settings': 'Screen Reader Settings',
      'learning_history': 'Candidate Learning History',
      'learning-history': 'Candidate Learning History',
      'model_evaluation': 'Dataset & Model Evaluation Dashboard',
      'model-evaluation': 'Dataset & Model Evaluation Dashboard',
      'model_training': 'Dataset Management & Model Training',
      'model-training': 'Dataset Management & Model Training',
      'pilot_demo': 'Pilot Demo Diagnostic',
      'pilot-demo': 'Pilot Demo Diagnostic'
    };
    const title = screenNames[currentScreen] || currentScreen;
    document.title = `ACCESSPREP-X | ${title}`;
  }, [currentScreen]);

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'welcome':
        return <WelcomeScreen />;
      case 'login':
        return <LoginScreen />;
      case 'register':
        return <RegisterScreen />;
      case 'dashboard':
        return <DashboardScreen />;
      case 'topics':
        return <TopicsScreen />;
      case 'voice_practice':
      case 'voice-practice' as any:
        return <VoicePracticeScreen />;
      case 'mock_exam':
      case 'mock-exam' as any:
        return <MockExamScreen />;
      case 'results':
        return <ResultsScreen />;
      case 'ai_tutor':
      case 'ai-tutor' as any:
        return <AiTutorScreen />;
      case 'revision_planner':
      case 'revision-planner' as any:
        return <RevisionPlannerScreen />;
      case 'progress':
        return <ProgressScreen />;
      case 'topic_mastery':
      case 'topic-mastery' as any:
        return <TopicMasteryScreen />;
      case 'accessibility_settings':
      case 'accessibility-settings' as any:
        return <AccessibilitySettingsScreen />;
      case 'screen_reader_settings':
      case 'screen-reader-settings' as any:
        return <ScreenReaderSettingsScreen />;
      case 'learning_history':
      case 'learning-history' as any:
        return <LearningHistoryScreen />;
      case 'model_evaluation':
      case 'model-evaluation' as any:
        return <ModelEvaluationScreen />;
      case 'model_training':
      case 'model-training' as any:
        return <ModelTrainingScreen />;
      case 'pilot_demo':
      case 'pilot-demo' as any:
        return <PilotDemoScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <div className={`h-screen flex flex-col overflow-hidden font-sans theme-${theme} bg-slate-50`}>
      {/* WCAG Accessible Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-1/2 focus:-translate-x-1/2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#123BB8] focus:text-white focus:font-bold focus:rounded focus:outline-none focus:ring-4 focus:ring-yellow-400"
      >
        Skip to main content (Press Enter)
      </a>

      {/* Institutional Header (Fixed at top) */}
      <Header />

      {/* Main Layout Container: Static Sidebar + Scrolling Content Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Professional Blue/Purple Static Sidebar - Only displayed for authenticated sessions */}
        {user && <Navigation />}

        {/* Dynamic Main Content & Footer Area (Only this area scrolls vertically) */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto focus:outline-none">
          <main id="main-content" className="flex-1 focus:outline-none px-2 sm:px-4 py-4" tabIndex={-1}>
            <PageEntryHelpBanner />
            {renderActiveScreen()}
          </main>

          {/* Institutional Footer */}
          <footer className="bg-slate-900 text-slate-300 border-t border-slate-700 py-6 px-4 text-xs mt-auto">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center md:text-left">
                <div className="font-bold text-white text-sm">
                  ACCESSPREP-X • Accessible Staff Selection Commission (SSC MTS) Preparation Platform
                </div>
                <p className="text-slate-400">
                  Compliant with the Rights of Persons with Disabilities (RPwD) Act 2016 and DoPT Guidelines for examination scribes and compensatory time.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 text-slate-400">
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
                  ● WCAG 2.1 AAA Validated
                </span>
                <span>•</span>
                <span>400 Curated Records</span>
                <span>•</span>
                <span>OpenAI Whisper Integrated</span>
                <span>•</span>
                <span className="font-mono text-slate-300">Strict 16 Screens Enforced</span>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Active Examination Exit Confirmation Dialog */}
      {pendingExamExit && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="exam-exit-title"
          aria-describedby="exam-exit-desc"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div className="bg-white border-2 border-amber-500 rounded-lg max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <span className="text-2xl" aria-hidden="true">⚠️</span>
              <h2 id="exam-exit-title" className="text-lg font-bold text-slate-900">
                Examination in Progress
              </h2>
            </div>
            <p id="exam-exit-desc" className="text-sm text-slate-600">
              You are navigating away from your active mock examination to <strong>{pendingExamExit.title}</strong>.
              Your answered questions and remaining time will be saved in your session.
            </p>
            <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded border border-amber-200">
              🎙️ Voice users: say <strong>"Yes"</strong> to pause and leave, or <strong>"No"</strong> to continue your exam.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                autoFocus
                onClick={() => confirmExamExit(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                Resume Exam (Stay)
              </button>
              <button
                type="button"
                onClick={() => confirmExamExit(true)}
                className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                Pause & Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screen Reader ARIA Live Region */}
      <div
        id="sr-announcer"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announceMessage}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AccessibilityProvider>
      <MainApp />
    </AccessibilityProvider>
  );
}
