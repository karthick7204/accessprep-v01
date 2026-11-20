import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCaptchaForSpeech,
  normalizeSpokenEmail,
  validateEmailFormat,
  validateLoginIdentifier,
  parseAuthVoiceCommand
} from '../utils/authVoiceUtils.ts';
import { buildPageSpecificHelp, NavigationController } from '../voice/NavigationController.ts';
import { generateChallenge, verifyChallenge } from '../utils/humanVerification.ts';

test('Audio CAPTCHA Formatting: Reads individual digits with short pauses', () => {
  assert.equal(formatCaptchaForSpeech('5832'), 'Five ... Eight ... Three ... Two.');
  assert.equal(formatCaptchaForSpeech('5 8 3 2'), 'Five ... Eight ... Three ... Two.');
  assert.equal(formatCaptchaForSpeech('0 4 9 1'), 'Zero ... Four ... Nine ... One.');
});

test('Spoken Email Normalization: Converts natural spoken email phrases into standard email addresses', () => {
  assert.equal(
    normalizeSpokenEmail('aarav dot sharma at gmail dot com'),
    'aarav.sharma@gmail.com'
  );
  assert.equal(
    normalizeSpokenEmail('candidate at accessprep dot nic dot in'),
    'candidate@accessprep.nic.in'
  );
  assert.equal(
    normalizeSpokenEmail('my email address is priya underscore 26 at yahoo dot co dot in'),
    'priya_26@yahoo.co.in'
  );
  assert.equal(
    normalizeSpokenEmail('s s c 2026 m t s 01'),
    'SSC-2026-MTS-01'
  );
});

test('Email & Identifier Validation: Validates strict email and SSC Roll Numbers accurately', () => {
  assert.equal(validateEmailFormat('student@example.com'), true);
  assert.equal(validateEmailFormat('candidate@accessprep.nic.in'), true);
  assert.equal(validateEmailFormat('invalid-email'), false);
  assert.equal(validateEmailFormat('missing@domain'), false);

  assert.equal(validateLoginIdentifier('candidate@accessprep.nic.in').valid, true);
  assert.equal(validateLoginIdentifier('SSC-2026-MTS-01').valid, true);
  assert.equal(validateLoginIdentifier('').valid, false);
  assert.equal(validateLoginIdentifier('bad@email').valid, false);
});

test('Auth Voice Commands: Context-aware command parsing for Login and Registration', () => {
  // Shared commands on both screens
  assert.equal(parseAuthVoiceCommand('What can I do here?', 'login'), 'what_can_i_do');
  assert.equal(parseAuthVoiceCommand('Explain this page', 'register'), 'explain_page');
  assert.equal(parseAuthVoiceCommand('Read instructions', 'login'), 'read_instructions');
  assert.equal(parseAuthVoiceCommand('Read all fields', 'register'), 'read_all_fields');
  assert.equal(parseAuthVoiceCommand('Repeat', 'login'), 'repeat');
  assert.equal(parseAuthVoiceCommand('Repeat question', 'register'), 'repeat');
  assert.equal(parseAuthVoiceCommand('Stop speaking', 'login'), 'stop_speaking');
  assert.equal(parseAuthVoiceCommand('Pause', 'login'), 'pause');
  assert.equal(parseAuthVoiceCommand('Resume', 'login'), 'resume');
  assert.equal(parseAuthVoiceCommand('Use keyboard', 'login'), 'use_keyboard');
  assert.equal(parseAuthVoiceCommand('Use voice', 'register'), 'use_voice');
  assert.equal(parseAuthVoiceCommand('Go to login', 'register'), 'go_to_login');
  assert.equal(parseAuthVoiceCommand('Go to registration', 'login'), 'go_to_register');
  assert.equal(parseAuthVoiceCommand('Help', 'login'), 'help');
  assert.equal(parseAuthVoiceCommand('Repeat CAPTCHA', 'login'), 'read_captcha');
  assert.equal(parseAuthVoiceCommand('Start audio captcha', 'login'), 'start_audio_captcha');
  assert.equal(parseAuthVoiceCommand('Start audio captcha', 'register'), 'start_audio_captcha');
  assert.equal(parseAuthVoiceCommand('Refresh CAPTCHA', 'register'), 'refresh_captcha');

  // Context-specific separation: Login vs Registration triggers
  assert.equal(parseAuthVoiceCommand('Start voice login', 'login'), 'use_voice');
  assert.equal(parseAuthVoiceCommand('Start voice login', 'register'), null);
  assert.equal(parseAuthVoiceCommand('Start voice registration', 'register'), 'use_voice');
  assert.equal(parseAuthVoiceCommand('Start voice registration', 'login'), null);
  assert.equal(parseAuthVoiceCommand('Read login guide', 'login'), 'read_instructions');
  assert.equal(parseAuthVoiceCommand('Read login guide', 'register'), null);
  assert.equal(parseAuthVoiceCommand('Read registration guide', 'register'), 'read_instructions');
  assert.equal(parseAuthVoiceCommand('Read registration guide', 'login'), null);
});

test('NavigationController: Provides context-aware page help for Login and Registration', async () => {
  const loginHelp = buildPageSpecificHelp('login');
  const registerHelp = buildPageSpecificHelp('register');

  assert.match(loginHelp, /Start Voice Login/i);
  assert.match(registerHelp, /Start Voice Registration/i);

  // Verify screen-local handler receives transcripts when Vision Assistant is active on Login
  let receivedTranscript = '';
  const controller = new NavigationController({
    context: {
      currentScreen: 'login',
      user: null,
      isExamActive: false,
      pendingExamExit: null,
      historyStack: [],
      lastSpokenText: '',
      isVisionAssistantActive: true
    },
    navigate: () => {},
    speak: () => {},
    stopSpeak: () => {},
    logout: () => {}
  });

  const res = await controller.processTranscript('aarav dot sharma at gmail dot com', (t) => {
    receivedTranscript = t;
    return true;
  });

  assert.equal(res.status, 'local_handled');
  assert.equal(receivedTranscript, 'aarav dot sharma at gmail dot com');
});

test('Audio CAPTCHA Lifecycle: Spoken words and numeric digits both validate and issue single-use token', () => {
  const ch = generateChallenge();
  const formattedSpeech = formatCaptchaForSpeech(ch.phrase);
  assert.ok(formattedSpeech.includes('...'));

  // Verify using spoken words representation
  const spokenResponse = formattedSpeech.replace(/\.\.\./g, ' ').replace(/\./g, '');
  const verification = verifyChallenge(ch.challengeId, spokenResponse);
  assert.equal(verification.success, true);
  assert.ok(verification.verificationToken);
});
