/**
 * ACCESSPREP-X — Modular Express API Router
 * Mounts all /api/* routes onto the Express application.
 */

import { Router } from 'express';
import { audioUploadMiddleware } from '../middleware/upload.middleware.ts';
import {
  getHealthStatus,
  getDatabaseStatus,
  triggerDatabaseMigration,
  getAuthChallenge,
  postVerifyChallenge,
  postValidateCredentials,
  postLogin,
  postRegister,
  getCurrentCandidate,
  getQuestions,
  getQuestionById,
  getSubjects,
  postCreateQuestion,
  postPracticeSubmit,
  getMockRotationStatus,
  postMockStart,
  postMockProgress,
  postMockDiscard,
  postMockResetCycle,
  postMockSubmit,
  getMockAttempts,
  getMockAttemptById,
  postMathParse,
  postMathEvaluate,
  postMathEquivalent,
  postMathMatchOptions,
  postMathSpeech,
  getDiagnosticQuestions,
  postDiagnosticSubmit,
  getDiagnosticAttempts,
  getDiagnosticAttemptById,
  getRevisionItems,
  getRevisionQueue,
  postRevisionReview,
  getTopicMastery,
  getProgressAnalytics,
  getLearningHistory,
  getDetailedHistory,
  getAccessibilitySettings,
  postAccessibilitySettings,
  patchUserProfile,
  getCurrentAffairsQuestions,
  getCurrentAffairsStatus,
  postCurrentAffairsRefresh,
  getTranscripts,
  postTranscript,
  deleteTranscripts,
  getTranscriptSettings,
  postTranscriptSettings,
  getDatasetSummary,
  getModelEvaluation,
  postModelPredict,
  postModelTrain,
  getAudioStatus,
  postAudioTranscribe,
  getTutorConfig,
  postTutorConfig,
  postTutorChat
} from '../controllers/index.ts';

export const apiRouter = Router();

// 1. Health & Database Status
apiRouter.get('/health', getHealthStatus);
apiRouter.get('/db/status', getDatabaseStatus);
apiRouter.post('/db/migrate', triggerDatabaseMigration);

// 2. Authentication & Candidate Registration
apiRouter.get('/auth/challenge', getAuthChallenge);
apiRouter.post('/auth/verify-challenge', postVerifyChallenge);
apiRouter.post('/auth/validate-credentials', postValidateCredentials);
apiRouter.post('/auth/login', postLogin);
apiRouter.post('/auth/register', postRegister);
apiRouter.get('/auth/me', getCurrentCandidate);

// 3. Questions & Subjects
apiRouter.get('/questions', getQuestions);
apiRouter.get('/questions/:id', getQuestionById);
apiRouter.post('/questions', postCreateQuestion);
apiRouter.get('/subjects', getSubjects);

// 4. Voice Practice & BKT Mastery
apiRouter.post('/practice/submit', postPracticeSubmit);

// 5. Mock Examination Rotation & Submission
apiRouter.get('/mock/rotation-status', getMockRotationStatus);
apiRouter.post('/mock/start', postMockStart);
apiRouter.post('/mock/progress', postMockProgress);
apiRouter.post('/mock/discard', postMockDiscard);
apiRouter.post('/mock/reset-cycle', postMockResetCycle);
apiRouter.post('/mock/submit', postMockSubmit);
apiRouter.get('/mock/attempts', getMockAttempts);
apiRouter.get('/mock/history', getMockAttempts);
apiRouter.get('/mock/attempts/:id', getMockAttemptById);

// 5A. Mathematical Voice Intelligence
apiRouter.post('/math/parse', postMathParse);
apiRouter.post('/math/evaluate', postMathEvaluate);
apiRouter.post('/math/equivalent', postMathEquivalent);
apiRouter.post('/math/match-options', postMathMatchOptions);
apiRouter.post('/math/speech', postMathSpeech);

// 5B. Pilot Demo Diagnostic
apiRouter.get('/diagnostic/questions', getDiagnosticQuestions);
apiRouter.post('/diagnostic/submit', postDiagnosticSubmit);
apiRouter.get('/diagnostic/attempts', getDiagnosticAttempts);
apiRouter.get('/diagnostic/attempts/:id', getDiagnosticAttemptById);

// 6. Revision Planner & SM-2
apiRouter.get('/revision/items', getRevisionItems);
apiRouter.get('/revision/queue', getRevisionQueue);
apiRouter.post('/revision/review', postRevisionReview);

// 7. Topic Mastery & Progress Analytics
apiRouter.get('/mastery', getTopicMastery);
apiRouter.get('/progress/analytics', getProgressAnalytics);
apiRouter.get('/history', getLearningHistory);
apiRouter.get('/history/detailed', getDetailedHistory);

// 8. Accessibility Settings & Candidate Profile
apiRouter.get('/settings/accessibility', getAccessibilitySettings);
apiRouter.get('/settings', getAccessibilitySettings);
apiRouter.post('/settings/accessibility', postAccessibilitySettings);
apiRouter.post('/settings/update', postAccessibilitySettings);
apiRouter.patch('/user/profile', patchUserProfile);

// 9. Current Affairs & Transcript Workspace
apiRouter.get('/current-affairs/questions', getCurrentAffairsQuestions);
apiRouter.get('/current-affairs/status', getCurrentAffairsStatus);
apiRouter.post('/current-affairs/refresh', postCurrentAffairsRefresh);
apiRouter.get('/transcripts', getTranscripts);
apiRouter.post('/transcripts', postTranscript);
apiRouter.delete('/transcripts', deleteTranscripts);
apiRouter.get('/transcripts/settings', getTranscriptSettings);
apiRouter.get('/transcripts/privacy', getTranscriptSettings);
apiRouter.post('/transcripts/settings', postTranscriptSettings);
apiRouter.put('/transcripts/privacy', postTranscriptSettings);

// 10. Dataset Summary & ML Model Evaluation
apiRouter.get('/dataset/summary', getDatasetSummary);
apiRouter.get('/model/evaluation', getModelEvaluation);
apiRouter.post('/model/predict', postModelPredict);
apiRouter.post('/model/train', postModelTrain);
apiRouter.post('/model/retrain', postModelTrain);

// 11. Whisper Audio Transcription
apiRouter.get('/audio/status', getAudioStatus);
apiRouter.post('/audio/transcribe', audioUploadMiddleware.single('audio'), postAudioTranscribe);

// 12. AI Syllabus Tutor
apiRouter.get('/tutor/config', getTutorConfig);
apiRouter.post('/tutor/config', postTutorConfig);
apiRouter.post('/tutor/chat', postTutorChat);
