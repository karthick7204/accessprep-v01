import test from 'node:test';
import assert from 'node:assert/strict';
import { NavigationController, buildPageSpecificHelp } from '../voice/NavigationController.ts';
import { matchScreenNavigation } from '../voice/commandParser.ts';
import { TRANSCRIPT_WORKSPACE_VOICE_GUIDE } from '../screens/LearningHistoryScreen.tsx';
import type { User } from '../context/AccessibilityContext.tsx';

function makeMockCandidate(): User {
  return {
    id: 'usr_candidate_01',
    name: 'Ashwin Sharma',
    role: 'candidate',
    email: 'ashwin@accessprep.nic.in',
    rollNumber: 'SSC-2026-MTS-01',
    passwordHash: 'dummy_hash',
    pwdCategory: 'Visually Impaired',
    needScribe: false,
    examRegion: 'Northern Region',
    examLanguage: 'English',
    createdAt: new Date().toISOString()
  };
}

test('Transcript Workspace Navigation: Navigating to Transcript Workspace gives proper description before opening', async () => {
  let navigatedScreen = '';
  const controller = new NavigationController({
    context: {
      currentScreen: 'dashboard',
      user: makeMockCandidate(),
      isExamActive: false,
      pendingExamExit: null,
      historyStack: ['dashboard'],
      lastSpokenText: '',
      isVisionAssistantActive: true
    },
    navigate: (screen) => {
      navigatedScreen = screen;
    },
    speak: () => {}
  });

  const res = await controller.processTranscript('Open Transcript Workspace');
  assert.equal(res.status, 'success');
  assert.equal(res.destination, 'learning_history');
  assert.equal(navigatedScreen, 'learning_history');

  // Proper description BEFORE opening (no grammar references)
  assert.match(res.spokenResponse, /Opening Transcript Workspace/i);
  assert.match(res.spokenResponse, /Start Recording/i);
  assert.match(res.spokenResponse, /Copy/i);
});

test('Transcript Workspace Navigation: Aliases match cleanly', () => {
  const aliases = [
    'transcript workspace',
    'open transcript workspace',
    'transcripts workspace',
    'open transcripts workspace',
    'candidate transcript workspace',
    'live dictation',
    'dictation workspace',
    'learning history',
    'past tests'
  ];

  for (const alias of aliases) {
    const match = matchScreenNavigation(alias, 'dashboard');
    assert.ok(match, `Alias "${alias}" should match a screen`);
    assert.equal(match.target.screenId, 'learning_history', `Alias "${alias}" should resolve to learning_history`);
  }
});

test('Transcript Workspace: Wake Word "Hey Vision" on Transcript Workspace gives context-aware instructions', async () => {
  const controller = new NavigationController({
    context: {
      currentScreen: 'learning_history',
      user: makeMockCandidate(),
      isExamActive: false,
      pendingExamExit: null,
      historyStack: ['dashboard', 'learning_history'],
      lastSpokenText: '',
      isVisionAssistantActive: true
    },
    navigate: () => {},
    speak: () => {}
  });

  const res = await controller.processTranscript('Hey Vision');
  assert.equal(res.status, 'system_handled');
  assert.match(res.spokenResponse, /Candidate Transcript Workspace/i);
  assert.match(res.spokenResponse, /Start Recording/i);
  assert.match(res.spokenResponse, /Stop Recording/i);
  assert.match(res.spokenResponse, /Copy/i);
  assert.match(res.spokenResponse, /Save transcript/i);
});

test('Transcript Workspace: buildPageSpecificHelp includes full command inventory', () => {
  const help = buildPageSpecificHelp('learning_history');
  assert.match(help, /Start Recording/i);
  assert.match(help, /Stop Recording/i);
  assert.match(help, /Copy/i);
  assert.match(help, /Save Transcript/i);
});

test('Transcript Workspace: TRANSCRIPT_WORKSPACE_VOICE_GUIDE is comprehensive and accessible', () => {
  assert.ok(TRANSCRIPT_WORKSPACE_VOICE_GUIDE.length > 50);
  assert.match(TRANSCRIPT_WORKSPACE_VOICE_GUIDE, /Welcome to Candidate Transcript Workspace/i);
  assert.match(TRANSCRIPT_WORKSPACE_VOICE_GUIDE, /Start Recording/i);
  assert.match(TRANSCRIPT_WORKSPACE_VOICE_GUIDE, /Stop Recording/i);
  assert.match(TRANSCRIPT_WORKSPACE_VOICE_GUIDE, /Copy/i);
});
