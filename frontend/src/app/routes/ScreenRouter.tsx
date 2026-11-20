/**
 * ACCESSPREP-X — Screen Router (18 Approved Screens)
 */

import React, { useEffect } from 'react';
import { useAccessibility } from '../../context/AccessibilityContext.tsx';
import { WelcomeScreen } from '../../screens/WelcomeScreen.tsx';
import { LoginScreen } from '../../screens/LoginScreen.tsx';
import { RegisterScreen } from '../../screens/RegisterScreen.tsx';
import { DashboardScreen } from '../../screens/DashboardScreen.tsx';
import { TopicsScreen } from '../../screens/TopicsScreen.tsx';
import { VoicePracticeScreen } from '../../screens/VoicePracticeScreen.tsx';
import { MockExamScreen } from '../../screens/MockExamScreen.tsx';
import { ResultsScreen } from '../../screens/ResultsScreen.tsx';
import { AiTutorScreen } from '../../screens/AiTutorScreen.tsx';
import { RevisionPlannerScreen } from '../../screens/RevisionPlannerScreen.tsx';
import { ProgressScreen } from '../../screens/ProgressScreen.tsx';
import { TopicMasteryScreen } from '../../screens/TopicMasteryScreen.tsx';
import { AccessibilitySettingsScreen } from '../../screens/AccessibilitySettingsScreen.tsx';
import { LearningHistoryScreen } from '../../screens/LearningHistoryScreen.tsx';
import { ModelEvaluationScreen } from '../../screens/ModelEvaluationScreen.tsx';
import { ModelTrainingScreen } from '../../screens/ModelTrainingScreen.tsx';
import { PilotDemoScreen } from '../../screens/PilotDemoScreen.tsx';
import { ScreenReaderSettingsScreen } from '../../screens/ScreenReaderSettingsScreen.tsx';

export const SCREEN_TITLES: Record<string, string> = {
  welcome: 'Welcome & Accessibility Onboarding',
  login: 'Candidate Login',
  register: 'Candidate Registration',
  dashboard: 'Student Dashboard',
  topics: 'Subject & Topic Explorer',
  voice_practice: 'Voice-First Practice Session',
  'voice-practice': 'Voice-First Practice Session',
  mock_exam: 'Accessible Mock Examination',
  'mock-exam': 'Accessible Mock Examination',
  results: 'Results & Answer Explanations',
  ai_tutor: 'AI Tutor Scribe',
  'ai-tutor': 'AI Tutor Scribe',
  revision_planner: 'Adaptive Revision Planner',
  'revision-planner': 'Adaptive Revision Planner',
  progress: 'Progress & Performance Dashboard',
  topic_mastery: 'Knowledge & Topic Mastery',
  'topic-mastery': 'Knowledge & Topic Mastery',
  accessibility_settings: 'Accessibility Settings',
  'accessibility-settings': 'Accessibility Settings',
  screen_reader_settings: 'Screen Reader Settings',
  'screen-reader-settings': 'Screen Reader Settings',
  learning_history: 'Candidate Learning History',
  'learning-history': 'Candidate Learning History',
  model_evaluation: 'Dataset & Model Evaluation Dashboard',
  'model-evaluation': 'Dataset & Model Evaluation Dashboard',
  model_training: 'Dataset Management & Model Training',
  'model-training': 'Dataset Management & Model Training',
  pilot_demo: 'Pilot Demo Diagnostic',
  'pilot-demo': 'Pilot Demo Diagnostic'
};

export function ScreenRouter() {
  const { currentScreen } = useAccessibility();

  useEffect(() => {
    const title = SCREEN_TITLES[currentScreen] || currentScreen;
    document.title = `ACCESSPREP-X | ${title}`;
  }, [currentScreen]);

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
}
