import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  LogIn,
  Key,
  Mail,
  Headphones,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  Keyboard
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext.tsx';
import { AuthenticationLayout } from '../components/auth/AuthenticationLayout.tsx';
import { AuthenticationCard } from '../components/auth/AuthenticationCard.tsx';
import { AccessibleFormField } from '../components/auth/AccessibleFormField.tsx';
import { VoiceGuidanceControls } from '../components/auth/VoiceGuidanceControls.tsx';
import { AudioCaptchaControls, CaptchaChallengeData } from '../components/auth/AudioCaptchaControls.tsx';
import { AuthenticationErrorMessage } from '../components/auth/AuthenticationErrorMessage.tsx';
import {
  formatCaptchaForSpeech,
  normalizeSpokenEmail,
  analyzeSpokenEmail,
  spellOutIdentifier,
  validateLoginIdentifier,
  parseAuthVoiceCommand,
  reconstructSpelledEmail
} from '../utils/authVoiceUtils.ts';
import { extractDigits } from '../utils/humanVerification.ts';
import { parseConfirmationIntent } from '../voice/commandParser.ts';

export type LoginVoiceStep =
  | 'idle'
  | 'ask_email'
  | 'ambiguous_email'
  | 'confirm_email'
  | 'enter_password'
  | 'ask_captcha'
  | 'confirm_captcha'
  | 'confirm_submit';

const LOGIN_INTRO_MESSAGE =
  'Welcome to ACCESSPREP-X. Let us sign you in. Please say your registered email address or roll number, or use your keyboard.';

const LOGIN_GUIDE_MESSAGE =
  'Login Instructions: Step 1, enter your registered email address or SSC Roll Number. Step 2, enter your password securely using your keyboard. Step 3, listen to the four-digit audio verification code by pressing Play Audio CAPTCHA or Alt plus R, and enter or speak the digits. Step 4, activate Sign In to open your dashboard. You can also say Start Voice Login for step-by-step spoken guidance.';

const LOGIN_FIELDS_SUMMARY =
  'The Login form has three required fields: Field 1, Registered Email Address or Roll Number. Field 2, Password with Show or Hide control. Field 3, Four-digit Audio CAPTCHA verification code, followed by the Sign In button and Create Account link.';

export function LoginScreen() {
  const {
    navigateTo,
    loginUser,
    announce,
    speakText,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    isSpeaking,
    isVoiceListening,
    micPermissionStatus,
    startVoiceListening,
    stopVoiceListening,
    registerVoiceHandler,
    interactionMode
  } = useAccessibility();

  // Form Values: default strictly empty (no prefilled demo password in production)
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Field-level & form-level validation errors
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Audio CAPTCHA State
  const [challenge, setChallenge] = useState<CaptchaChallengeData | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [verifiedForInput, setVerifiedForInput] = useState<string>('');
  const [isCapturingCaptchaVoice, setIsCapturingCaptchaVoice] = useState(false);
  const [recognizedCaptchaDigits, setRecognizedCaptchaDigits] = useState('');

  // Voice-Guided Login Workflow State Machine
  const [voiceStep, setVoiceStep] = useState<LoginVoiceStep>('idle');
  const [ambiguousOptions, setAmbiguousOptions] = useState<string[]>([]);
  const lastPromptRef = useRef<string>(LOGIN_INTRO_MESSAGE);
  const hasAnnouncedIntroRef = useRef<boolean>(false);

  // Input Refs for Focus Management
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const captchaInputRef = useRef<HTMLInputElement | null>(null);

  // Tracks which field is currently active (for F2 re-read)
  const activeFieldRef = useRef<'email' | 'password' | 'captcha' | null>(null);

  // Tracks whether email has been confirmed by user after read-back
  const emailConfirmedRef = useRef<boolean>(false);

  // Live state refs for asynchronous voice handlers
  const voiceStepRef = useRef<LoginVoiceStep>(voiceStep);
  voiceStepRef.current = voiceStep;
  const identifierRef = useRef<string>(identifier);
  identifierRef.current = identifier;
  const passwordRef = useRef<string>(password);
  passwordRef.current = password;
  const captchaInputRefVal = useRef<string>(captchaInput);
  captchaInputRefVal.current = captchaInput;
  const challengeRef = useRef<CaptchaChallengeData | null>(challenge);
  challengeRef.current = challenge;
  const isCapturingCaptchaVoiceRef = useRef<boolean>(isCapturingCaptchaVoice);
  isCapturingCaptchaVoiceRef.current = isCapturingCaptchaVoice;
  const recognizedCaptchaDigitsRef = useRef<string>(recognizedCaptchaDigits);
  recognizedCaptchaDigitsRef.current = recognizedCaptchaDigits;

  // ─── Field Focus Announcements ───────────────────────────────────────────────
  // When the cursor enters a field, speak what the field is + instructions.
  const handleEmailFocus = useCallback(() => {
    activeFieldRef.current = 'email';
    const msg =
      'You are now in the Email ID field. Type your registered email address or SSC Roll Number. ' +
      'Press Tab or Enter when done and I will read it back to you for confirmation.';
    announce(msg, 'assertive');
    speakText(msg);
  }, [announce, speakText]);

  const handlePasswordFocus = useCallback(() => {
    activeFieldRef.current = 'password';
    const msg =
      'You are now in the Password field. Type your confidential password using the keyboard. ' +
      'Your password will never be read aloud. Press Tab or Enter when done.';
    announce(msg, 'assertive');
    speakText(msg);
  }, [announce, speakText]);

  const handleCaptchaFocus = useCallback(() => {
    activeFieldRef.current = 'captcha';
    // Read the CAPTCHA digits when the field is focused
    const curChallenge = challengeRef.current;
    let msg =
      'You are now in the Audio Verification Code field. ';
    if (curChallenge) {
      const spoken = formatCaptchaForSpeech(curChallenge.phrase);
      msg += `The verification code is: ${spoken}. Type these four digits now. ` +
             'Press R at any time to hear the code again.';
    } else {
      msg += 'Press R to play the audio verification code, then type the four digits.';
    }
    announce(msg, 'assertive');
    speakText(msg);
  }, [announce, speakText, challengeRef]);

  // ─── Email Read-Back on Blur ─────────────────────────────────────────────────
  // When user leaves the email field, spell out what was entered, then confirm.
  const handleEmailBlur = useCallback(() => {
    activeFieldRef.current = null;
    const val = identifierRef.current.trim();
    if (!val) return;

    // Spell the email out letter-by-letter
    const spelled = val.split('').map(ch => {
      if (ch === '@') return 'at';
      if (ch === '.') return 'dot';
      if (ch === '_') return 'underscore';
      if (ch === '-') return 'hyphen';
      if (ch === '+') return 'plus';
      return ch.toUpperCase();
    }).join(', ');

    const msg =
      `You entered the email: ${spelled}. ` +
      'Is this correct? Press Y to confirm or N to clear and re-enter. ' +
      'Press F 2 at any time to re-read the email.';
    announce(msg, 'assertive');
    speakText(msg);
    emailConfirmedRef.current = false;
  }, [announce, speakText, identifierRef]);

  // ─── Password Read-Back on Blur ──────────────────────────────────────────────
  const handlePasswordBlur = useCallback(() => {
    activeFieldRef.current = null;
    const val = passwordRef.current.trim();
    if (!val) return;
    const msg =
      'Password entered. Your password is hidden for security. ' +
      'Press Y to confirm and move to the verification code, or N to clear and re-enter.';
    announce(msg, 'assertive');
    speakText(msg);
  }, [announce, speakText, passwordRef]);

  // ─── CAPTCHA Read-Back on Blur ───────────────────────────────────────────────
  const handleCaptchaBlur = useCallback(() => {
    activeFieldRef.current = null;
    const val = captchaInputRefVal.current.trim();
    if (!val) return;
    const digits = val.split('').join(', ');
    const msg =
      `You entered verification digits: ${digits}. ` +
      'Is this correct? Press Y to confirm, N to clear, or R to replay the audio code.';
    announce(msg, 'assertive');
    speakText(msg);
  }, [announce, speakText, captchaInputRefVal]);

  // ─── F2: Re-Read Current Field Value ─────────────────────────────────────────
  const handleReReadCurrentField = useCallback(() => {
    const field = activeFieldRef.current;
    if (field === 'email') {
      const val = identifierRef.current.trim();
      if (!val) {
        const msg = 'The Email ID field is currently empty. Type your registered email address.';
        announce(msg, 'assertive'); speakText(msg); return;
      }
      const spelled = val.split('').map(ch => {
        if (ch === '@') return 'at';
        if (ch === '.') return 'dot';
        if (ch === '_') return 'underscore';
        if (ch === '-') return 'hyphen';
        if (ch === '+') return 'plus';
        return ch.toUpperCase();
      }).join(', ');
      const msg = `Your email address is: ${spelled}.`;
      announce(msg, 'assertive'); speakText(msg);
    } else if (field === 'password') {
      const val = passwordRef.current.trim();
      const msg = val
        ? 'Password field has an entry. Your password is private and will not be read aloud.'
        : 'The Password field is currently empty. Type your password.';
      announce(msg, 'assertive'); speakText(msg);
    } else if (field === 'captcha') {
      const val = captchaInputRefVal.current.trim();
      if (!val) {
        const curChallenge = challengeRef.current;
        const spoken = curChallenge ? formatCaptchaForSpeech(curChallenge.phrase) : 'not loaded';
        const msg = `The Verification Code field is empty. The code is: ${spoken}.`;
        announce(msg, 'assertive'); speakText(msg);
      } else {
        const digits = val.split('').join(', ');
        const msg = `You have entered verification digits: ${digits}.`;
        announce(msg, 'assertive'); speakText(msg);
      }
    } else {
      // No field focused — summarise all fields
      const emailVal = identifierRef.current.trim();
      const pwdVal = passwordRef.current.trim();
      const capVal = captchaInputRefVal.current.trim();
      const emailStatus = emailVal
        ? `Email: ${emailVal.split('').map(ch => ch === '@' ? 'at' : ch === '.' ? 'dot' : ch.toUpperCase()).join(', ')}.`
        : 'Email: empty.';
      const pwdStatus = pwdVal ? 'Password: entered (hidden).' : 'Password: empty.';
      const capStatus = capVal ? `Verification Code: ${capVal.split('').join(', ')}.` : 'Verification Code: empty.';
      const msg = `Form status — ${emailStatus} ${pwdStatus} ${capStatus} Press S to submit.`;
      announce(msg, 'assertive'); speakText(msg);
    }
  }, [announce, speakText, identifierRef, passwordRef, captchaInputRefVal, challengeRef]);

  // ─── Pre-Submit Voice Confirmation ───────────────────────────────────────────
  // Reads out all fields before submitting. User must press Y/Enter or N.
  const [awaitingSubmitConfirmation, setAwaitingSubmitConfirmation] = useState(false);
  const awaitingSubmitRef = useRef(false);

  const handlePreSubmitConfirmation = useCallback(() => {
    const emailVal = identifierRef.current.trim();
    const pwdVal = passwordRef.current.trim();
    const capVal = captchaInputRefVal.current.trim();

    if (!emailVal) {
      const msg = 'Email ID is missing. Press L to focus the email field and type your address.';
      announce(msg, 'assertive'); speakText(msg);
      emailInputRef.current?.focus(); return;
    }
    if (!pwdVal) {
      const msg = 'Password is missing. Press P to focus the password field and type your password.';
      announce(msg, 'assertive'); speakText(msg);
      passwordInputRef.current?.focus(); return;
    }
    if (!capVal) {
      const msg = 'Verification code is missing. Press C to auto-fill or R to hear the code.';
      announce(msg, 'assertive'); speakText(msg);
      captchaInputRef.current?.focus(); return;
    }

    // Build confirmation summary
    const spelled = emailVal.split('').map(ch => {
      if (ch === '@') return 'at';
      if (ch === '.') return 'dot';
      if (ch === '_') return 'underscore';
      if (ch === '-') return 'hyphen';
      if (ch === '+') return 'plus';
      return ch.toUpperCase();
    }).join(', ');
    const capDigits = capVal.split('').join(', ');

    const confirmMsg =
      `Please confirm before signing in. ` +
      `Email: ${spelled}. ` +
      `Password: entered and hidden. ` +
      `Verification Code: ${capDigits}. ` +
      `Is everything correct? Press Y or Enter to sign in, or N to go back and correct.`;

    setAwaitingSubmitConfirmation(true);
    awaitingSubmitRef.current = true;
    announce(confirmMsg, 'assertive');
    speakText(confirmMsg);
  }, [announce, speakText, identifierRef, passwordRef, captchaInputRefVal, emailInputRef, passwordInputRef, captchaInputRef]);

  const speakAndRecord = useCallback(
    (text: string, onEnd?: () => void) => {
      lastPromptRef.current = text;
      announce(text, 'polite');
      if (interactionMode !== 'manual') {
        speakText(text, onEnd);
      } else if (onEnd) {
        onEnd();
      }
    },
    [announce, speakText, interactionMode]
  );

  // Fetch initial or refreshed Audio CAPTCHA challenge
  const fetchNewChallenge = useCallback(
    async (announceNew = false, readDigitsOnLoad = false): Promise<CaptchaChallengeData | null> => {
      setChallengeLoading(true);
      setCaptchaError(null);
      setVerificationToken(null);
      setVerifiedForInput('');
      setCaptchaInput('');
      setRecognizedCaptchaDigits('');
      try {
        const res = await fetch('/api/auth/challenge');
        if (res.ok) {
          const data = await res.json();
          const newChallenge: CaptchaChallengeData = {
            challengeId: data.challengeId,
            phrase: data.phrase,
            expiresAt: data.expiresAt
          };
          setChallenge(newChallenge);
          challengeRef.current = newChallenge;

          if (readDigitsOnLoad) {
            const spokenDigits = formatCaptchaForSpeech(newChallenge.phrase);
            const msg = `Your verification code is: ${spokenDigits} Please repeat these four digits now.`;
            speakAndRecord(msg, () => startVoiceListening());
          } else if (announceNew) {
            const spokenDigits = formatCaptchaForSpeech(newChallenge.phrase);
            speakAndRecord(`Audio CAPTCHA refreshed. The new digits are: ${spokenDigits}`);
          }
          return newChallenge;
        } else {
          setCaptchaError('Unable to load audio verification code. Please press Refresh CAPTCHA.');
        }
      } catch {
        setCaptchaError('Network error while loading audio verification code.');
      } finally {
        setChallengeLoading(false);
      }
      return null;
    },
    [speakAndRecord, startVoiceListening]
  );

  // Load CAPTCHA challenge on mount
  useEffect(() => {
    fetchNewChallenge();
  }, [fetchNewChallenge]);

  // Initial welcome announcement on mount (only in voice mode, avoiding unwanted interruptions in manual mode)
  useEffect(() => {
    if (!hasAnnouncedIntroRef.current) {
      hasAnnouncedIntroRef.current = true;
      if (interactionMode === 'voice') {
        speakAndRecord(LOGIN_INTRO_MESSAGE);
      } else {
        announce(LOGIN_INTRO_MESSAGE, 'polite');
      }
    }
  }, [speakAndRecord, announce, interactionMode]);

  // Play audio digits aloud
  const handlePlayCaptchaAudio = useCallback(() => {
    if (!challenge) {
      fetchNewChallenge(false, true);
      return;
    }
    const spoken = formatCaptchaForSpeech(challenge.phrase);
    const audioMsg = `Your verification code is: ${spoken}. Enter or repeat these four digits.`;
    announce(audioMsg, 'assertive');
    speakText(audioMsg);
  }, [challenge, fetchNewChallenge, announce, speakText]);

  // Verify CAPTCHA digits against the backend
  const verifyCaptchaCode = useCallback(
    async (spokenOrTyped: string, inGuidedFlow = false): Promise<string | null> => {
      const curChallenge = challengeRef.current;
      if (!curChallenge) {
        setCaptchaError('Verification challenge expired. Loading a new challenge.');
        await fetchNewChallenge(false, false);
        return null;
      }

      const cleanDigits = extractDigits(spokenOrTyped);
      if (!cleanDigits || cleanDigits.length !== 4) {
        const errorMsg = 'Audio verification code must be exactly four digits.';
        setCaptchaError(errorMsg);
        announce(errorMsg, 'assertive');
        speakAndRecord(
          inGuidedFlow
            ? `${errorMsg} Please repeat the four verification digits clearly.`
            : errorMsg,
          inGuidedFlow ? () => startVoiceListening() : undefined
        );
        return null;
      }

      // Check if already verified for this exact challenge and input
      const verificationKey = `${curChallenge.challengeId}:${cleanDigits}`;
      if (verificationToken && verifiedForInput === verificationKey) {
        return verificationToken;
      }

      setCaptchaInput(cleanDigits);
      captchaInputRefVal.current = cleanDigits;

      try {
        const res = await fetch('/api/auth/verify-challenge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            challengeId: curChallenge.challengeId,
            candidatePhrase: cleanDigits
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setVerificationToken(null);
          setVerifiedForInput('');
          const errMsg = 'Audio verification code did not match. Generating a fresh code for you.';
          setCaptchaError(errMsg);
          announce(errMsg, 'assertive');

          const refreshed = await fetchNewChallenge(false, false);
          if (refreshed) {
            const newSpoken = formatCaptchaForSpeech(refreshed.phrase);
            const retryPrompt = inGuidedFlow
              ? `${errMsg} Your new verification digits are: ${newSpoken} Please repeat the new digits now.`
              : `${errMsg} Press Play Audio CAPTCHA to hear the new code: ${newSpoken}`;
            speakAndRecord(retryPrompt, inGuidedFlow ? () => startVoiceListening() : undefined);
          }
          return null;
        }

        setCaptchaError(null);
        setVerificationToken(data.verificationToken);
        setVerifiedForInput(`${curChallenge.challengeId}:${cleanDigits}`);
        return data.verificationToken;
      } catch {
        const netErr = 'Network failure while verifying audio code. Please check your connection and try again.';
        setCaptchaError(netErr);
        announce(netErr, 'assertive');
        speakText(netErr);
        return null;
      }
    },
    [
      verificationToken,
      verifiedForInput,
      fetchNewChallenge,
      announce,
      speakText,
      speakAndRecord,
      startVoiceListening
    ]
  );

  // Core authentication submission
  const executeSignIn = useCallback(
    async (preVerifiedToken?: string | null) => {
      if (loading) return;
      setFormError(null);
      setIdentifierError(null);
      setPasswordError(null);
      setCaptchaError(null);

      const curId = identifierRef.current.trim();
      const curPwd = passwordRef.current.trim();
      const curCaptcha = captchaInputRefVal.current.trim();

      // 1. Validate Email / Identifier
      const idCheck = validateLoginIdentifier(curId);
      if (!idCheck.valid) {
        const msg = idCheck.error || 'Please enter a valid registered email address.';
        setIdentifierError(msg);
        announce(msg, 'assertive');
        speakText(msg);
        emailInputRef.current?.focus();
        return;
      }

      // 2. Validate Password presence
      if (!curPwd) {
        const msg = 'Please enter your password.';
        setPasswordError(msg);
        announce(msg, 'assertive');
        speakText(msg);
        passwordInputRef.current?.focus();
        return;
      }

      // 3. Validate CAPTCHA presence
      if (!preVerifiedToken && !curCaptcha) {
        const msg = 'Please enter or speak the 4-digit audio verification code.';
        setCaptchaError(msg);
        announce(msg, 'assertive');
        speakText(msg);
        captchaInputRef.current?.focus();
        return;
      }

      setLoading(true);
      announce('Authentication in progress. Verifying your credentials...', 'polite');

      try {
        // Step A: Validate credentials first
        const credRes = await fetch('/api/auth/validate-credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: curId,
            password: curPwd
          })
        });

        const credData = await credRes.json();
        if (!credRes.ok || !credData.success) {
          const errMsg = credData.error || 'Incorrect email or password. Please verify your credentials and try again.';
          setFormError(errMsg);
          announce(errMsg, 'assertive');
          speakText(errMsg);
          setLoading(false);
          return;
        }

        // Step B: Verify Audio CAPTCHA
        let tokenToUse = preVerifiedToken || verificationToken;
        if (!tokenToUse) {
          tokenToUse = await verifyCaptchaCode(curCaptcha, voiceStepRef.current !== 'idle');
          if (!tokenToUse) {
            setLoading(false);
            return;
          }
        }

        // Step C: Establish session via `/api/auth/login`
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: curId,
            password: curPwd,
            verificationToken: tokenToUse
          })
        });

        const loginData = await loginRes.json();
        if (!loginRes.ok || !loginData.success) {
          await fetchNewChallenge(false, false);
          throw new Error(loginData.error || 'Unable to sign in. Please verify your details and try again.');
        }

        // Step D: Announce success and navigate to Dashboard
        const welcomeMsg = 'Your login was successful. Opening your dashboard.';
        setSuccessMessage(welcomeMsg);
        setVoiceStep('idle');
        announce(welcomeMsg, 'assertive');

        loginUser(loginData.user, loginData.settings);
        speakText(welcomeMsg);
        navigateTo('dashboard');
      } catch (err: any) {
        const msg =
          err.message === 'Failed to fetch'
            ? 'Network error: Unable to reach the authentication server. Please check your connection.'
            : err.message || 'Authentication failed. Please try again.';
        setFormError(msg);
        announce(msg, 'assertive');
        speakText(msg);
      } finally {
        setLoading(false);
      }
    },
    [
      loading,
      verificationToken,
      verifyCaptchaCode,
      fetchNewChallenge,
      announce,
      speakText,
      loginUser,
      navigateTo
    ]
  );

  // Manual Form Submission Handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeSignIn();
  };

  // Optional Developer / Tester Demo Credentials Helper
  const handleFillDemoCredentials = () => {
    setIdentifier('candidate@accessprep.nic.in');
    identifierRef.current = 'candidate@accessprep.nic.in';
    setPassword('candidate123');
    passwordRef.current = 'candidate123';
    setIdentifierError(null);
    setPasswordError(null);
    announce('Demo credentials loaded for Aarav Sharma (candidate@accessprep.nic.in). Please complete Audio CAPTCHA to sign in.', 'polite');
    setTimeout(() => {
      captchaInputRef.current?.focus();
    }, 50);
  };

  // Voice-Guided Login Workflow Controls
  const handleStartVoiceLogin = useCallback(() => {
    setFormError(null);
    setIdentifierError(null);
    setPasswordError(null);
    setCaptchaError(null);
    setIsCapturingCaptchaVoice(false);
    setVoiceStep('ask_email');
    voiceStepRef.current = 'ask_email';

    const prompt =
      'Welcome to ACCESSPREP-X. Let us sign you in. Please say your registered email address or roll number clearly.';
    speakAndRecord(prompt, () => {
      startVoiceListening();
    });
  }, [speakAndRecord, startVoiceListening]);

  const handleReadLoginGuide = useCallback(() => {
    speakAndRecord(LOGIN_GUIDE_MESSAGE);
  }, [speakAndRecord]);

  const handleSwitchToKeyboard = useCallback(() => {
    stopSpeaking();
    stopVoiceListening();
    setVoiceStep('idle');
    voiceStepRef.current = 'idle';
    setIsCapturingCaptchaVoice(false);
    const msg = 'Switched to keyboard input mode. Registered email address field is now focused.';
    announce(msg, 'polite');
    speakText(msg);
    setTimeout(() => {
      emailInputRef.current?.focus();
    }, 50);
  }, [stopSpeaking, stopVoiceListening, announce, speakText]);

  // Blind-Friendly Auto-Fill CAPTCHA (Triggered by pressing 'C')
  const handleAutoFillCaptcha = useCallback(async () => {
    let curChallenge = challengeRef.current;
    if (!curChallenge) {
      curChallenge = await fetchNewChallenge(false, false);
    }
    if (!curChallenge) {
      const msg = 'Verification code is still loading. Please press C again in a moment.';
      announce(msg, 'assertive');
      speakText(msg);
      return;
    }

    const cleanDigits = curChallenge.phrase.replace(/\D/g, '');
    setCaptchaInput(cleanDigits);
    captchaInputRefVal.current = cleanDigits;
    setCaptchaError(null);

    const token = await verifyCaptchaCode(cleanDigits, false);
    const spokenDigits = formatCaptchaForSpeech(curChallenge.phrase);
    const msg = `Audio verification code auto-entered: ${spokenDigits}. CAPTCHA verified. Press S or activate Sign In when ready.`;
    announce(msg, 'assertive');
    speakText(msg);
  }, [fetchNewChallenge, verifyCaptchaCode, announce, speakText]);

  // Blind-Friendly Single-Key Shortcut Handlers
  const handleFocusEmail = useCallback(() => {
    emailInputRef.current?.focus();
    const msg = 'Email field focused. You can now type your registered email address or roll number.';
    announce(msg, 'assertive');
    speakText(msg);
  }, [announce, speakText]);

  const handleFocusPassword = useCallback(() => {
    passwordInputRef.current?.focus();
    const msg = 'Password field focused. Please enter your confidential password using your keyboard.';
    announce(msg, 'assertive');
    speakText(msg);
  }, [announce, speakText]);

  const handleQuickSubmit = useCallback(async () => {
    // Always run pre-submit confirmation when triggered by shortcut
    handlePreSubmitConfirmation();
  }, [handlePreSubmitConfirmation]);

  const handleReadKeyboardShortcuts = useCallback(() => {
    const constantDescription =
      'ACCESSPREP-X Login Keyboard Shortcuts: ' +
      'Press L to focus the Email ID field. ' +
      'Press P to focus the Password field. ' +
      'Press C to auto-fill the audio verification code. ' +
      'Press S to review and confirm all fields before signing in. ' +
      'Press R to play the audio verification code aloud. ' +
      'Press F 2 to re-read the value of the currently focused field. ' +
      'Press Y to confirm a field read-back or to approve the final submission. ' +
      'Press N to clear and re-enter a field, or to cancel submission. ' +
      'Press K to hear all these shortcuts again. ' +
      'Press H for full login help. ' +
      'Press Escape to stop speech and exit a field. ' +
      'The microphone is always listening for your voice commands.';
    announce(constantDescription, 'assertive');
    speakText(constantDescription);
  }, [announce, speakText]);

  // Register single-key shortcuts & auto-fill listener for LoginScreen
  useEffect(() => {
    const onAutoFill = () => {
      handleAutoFillCaptcha();
    };
    window.addEventListener('accessprep:auto-fill-captcha', onAutoFill);

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // F2: Re-read current field value (works even while typing)
      if (e.key === 'F2') {
        e.preventDefault();
        handleReReadCurrentField();
        return;
      }

      if (isTyping) {
        // Y/N confirmations work even while focus is in a field
        if (e.key.toLowerCase() === 'y' && e.altKey) {
          e.preventDefault();
          if (awaitingSubmitRef.current) {
            setAwaitingSubmitConfirmation(false);
            awaitingSubmitRef.current = false;
            const msg = 'Confirmed. Signing in now...';
            announce(msg, 'assertive'); speakText(msg);
            executeSignIn();
          }
          return;
        }
        if (e.key === 'Escape') {
          target.blur();
          stopSpeaking();
          announce('Exited text field. Shortcuts active: L for Email, P for Password, C for CAPTCHA, S to review and sign in, F 2 to re-read field, K for all shortcuts.', 'polite');
        }
        return;
      }

      const key = e.key.toLowerCase();

      // Y: Confirm current field or confirm submission
      if (key === 'y') {
        e.preventDefault();
        if (awaitingSubmitRef.current) {
          setAwaitingSubmitConfirmation(false);
          awaitingSubmitRef.current = false;
          const msg = 'Confirmed. Signing in now...';
          announce(msg, 'assertive'); speakText(msg);
          executeSignIn();
        } else {
          // Confirm current email read-back
          if (!identifierRef.current.trim()) {
            const msg = 'Nothing to confirm. Email field is empty.';
            announce(msg, 'assertive'); speakText(msg);
          } else {
            emailConfirmedRef.current = true;
            const msg = 'Email confirmed. Press P to move to the Password field.';
            announce(msg, 'assertive'); speakText(msg);
            setTimeout(() => passwordInputRef.current?.focus(), 100);
          }
        }
        return;
      }

      // N: Clear current field or cancel submission
      if (key === 'n') {
        e.preventDefault();
        if (awaitingSubmitRef.current) {
          setAwaitingSubmitConfirmation(false);
          awaitingSubmitRef.current = false;
          const msg = 'Submission cancelled. Review your fields and press S when ready to sign in again.';
          announce(msg, 'assertive'); speakText(msg);
        } else {
          // Clear and re-focus email if that was last active
          setIdentifier(''); identifierRef.current = '';
          emailConfirmedRef.current = false;
          setIdentifierError(null);
          const msg = 'Email cleared. Press L to focus the email field and type again.';
          announce(msg, 'assertive'); speakText(msg);
        }
        return;
      }

      if (key === 'l' || (e.altKey && key === 'e')) {
        e.preventDefault();
        handleFocusEmail();
        return;
      }

      if (key === 'p') {
        e.preventDefault();
        handleFocusPassword();
        return;
      }

      if (key === 'c') {
        e.preventDefault();
        handleAutoFillCaptcha();
        return;
      }

      if (key === 's') {
        e.preventDefault();
        handleQuickSubmit();
        return;
      }

      if (key === 'r') {
        e.preventDefault();
        handlePlayCaptchaAudio();
        return;
      }

      if (key === 'k') {
        e.preventDefault();
        handleReadKeyboardShortcuts();
        return;
      }

      if (key === 'h') {
        e.preventDefault();
        handleReadLoginGuide();
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('accessprep:auto-fill-captcha', onAutoFill);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [
    handleAutoFillCaptcha,
    handleFocusEmail,
    handleFocusPassword,
    handleQuickSubmit,
    handlePlayCaptchaAudio,
    handleReadKeyboardShortcuts,
    handleReadLoginGuide,
    handleReReadCurrentField,
    executeSignIn,
    stopSpeaking,
    announce
  ]);

  // Advance from Password Step to Audio CAPTCHA Step
  const advanceFromPasswordToCaptcha = useCallback(async () => {
    if (!passwordRef.current.trim()) {
      const msg = 'Password field is empty. Please enter your password using your keyboard and say Continue or press Enter.';
      setPasswordError(msg);
      speakAndRecord(msg);
      passwordInputRef.current?.focus();
      return;
    }

    setPasswordError(null);
    let curChallenge = challengeRef.current;
    if (!curChallenge) {
      curChallenge = await fetchNewChallenge(false, false);
    }

    setVoiceStep('ask_captcha');
    voiceStepRef.current = 'ask_captcha';

    const spokenDigits = curChallenge ? formatCaptchaForSpeech(curChallenge.phrase) : '';
    const prompt = `Password entered securely. Audio verification code: Listen carefully to the four digits: ${spokenDigits} Please repeat these four digits now, or enter them using your keyboard.`;
    speakAndRecord(prompt, () => {
      startVoiceListening();
    });
  }, [fetchNewChallenge, speakAndRecord, startVoiceListening]);

  // Register context-aware voice handler with AccessibilityContext
  useEffect(() => {
    const unregister = registerVoiceHandler(async (rawTranscript: string) => {
      const cmd = parseAuthVoiceCommand(rawTranscript, 'login');

      // 1. Universal & Shared Page Commands
      if (cmd === 'stop_speaking') {
        stopSpeaking();
        return true;
      }
      if (cmd === 'pause') {
        pauseSpeaking();
        return true;
      }
      if (cmd === 'resume') {
        resumeSpeaking();
        return true;
      }
      if (cmd === 'repeat') {
        speakText(lastPromptRef.current || LOGIN_INTRO_MESSAGE);
        return true;
      }
      if (cmd === 'explain_page' || cmd === 'what_can_i_do' || cmd === 'help') {
        const helpMsg =
          'You are on the ACCESSPREP-X Login page. You can sign in with your registered email address, password, and four-digit audio verification code. Available voice commands: Start Voice Login, Read Instructions, Read All Fields, Repeat CAPTCHA, Refresh CAPTCHA, Use Keyboard, or Go to Registration.';
        speakAndRecord(helpMsg, voiceStepRef.current !== 'idle' ? () => startVoiceListening() : undefined);
        return true;
      }
      if (cmd === 'read_instructions') {
        speakAndRecord(LOGIN_GUIDE_MESSAGE, voiceStepRef.current !== 'idle' ? () => startVoiceListening() : undefined);
        return true;
      }
      if (cmd === 'read_all_fields') {
        speakAndRecord(LOGIN_FIELDS_SUMMARY, voiceStepRef.current !== 'idle' ? () => startVoiceListening() : undefined);
        return true;
      }
      if (cmd === 'start_audio_captcha') {
        let curChallenge = challengeRef.current || (await fetchNewChallenge(false, false));
        if (curChallenge) {
          const spoken = formatCaptchaForSpeech(curChallenge.phrase);
          speakAndRecord(`Audio verification code: ${spoken}. Please say these four digits now.`, () => startVoiceListening());
        }
        return true;
      }
      if (cmd === 'read_captcha') {
        handlePlayCaptchaAudio();
        return true;
      }
      if (cmd === 'refresh_captcha') {
        await fetchNewChallenge(true, voiceStepRef.current === 'ask_captcha');
        return true;
      }
      if (cmd === 'use_keyboard') {
        handleSwitchToKeyboard();
        return true;
      }
      if (cmd === 'use_voice') {
        handleStartVoiceLogin();
        return true;
      }
      if (cmd === 'go_to_register') {
        stopSpeaking();
        navigateTo('register');
        return true;
      }
      if (cmd === 'go_to_login') {
        speakAndRecord('You are already on the Login page.');
        return true;
      }

      // 2. Guided Multi-Step Voice Login State Machine
      const step = voiceStepRef.current;
      if (step === 'idle') {
        return false;
      }

      // STEP 1: Email / Identifier Capture
      if (step === 'ask_email') {
        const analysis = analyzeSpokenEmail(rawTranscript);

        if (analysis.isAmbiguous && analysis.suggestedOptions && analysis.suggestedOptions.length > 0) {
          setAmbiguousOptions(analysis.suggestedOptions);
          setVoiceStep('ambiguous_email');
          voiceStepRef.current = 'ambiguous_email';

          const prompt =
            `I heard your email, but no separator like dot or underscore was detected between your names. ` +
            `Is your email ${analysis.suggestedOptions[0]}, ${analysis.suggestedOptions[1]}, or all one word? ` +
            `Please say DOT, UNDERSCORE, or ONE WORD, or spell out your email.`;
          speakAndRecord(prompt, () => startVoiceListening());
          return true;
        }

        const normalized = analysis.normalized || normalizeSpokenEmail(rawTranscript);
        if (!normalized) {
          speakAndRecord(
            'I could not catch your email address. Please say your registered email address or candidate roll number again.',
            () => startVoiceListening()
          );
          return true;
        }

        setIdentifier(normalized);
        identifierRef.current = normalized;
        setIdentifierError(null);
        setVoiceStep('confirm_email');
        voiceStepRef.current = 'confirm_email';

        const spelledOut = spellOutIdentifier(normalized);
        speakAndRecord(
          `I heard your email address. I will spell it out for confirmation: ${spelledOut}. Is this your correct email address? Say YES to confirm or NO to enter it again.`,
          () => startVoiceListening()
        );
        return true;
      }

      // STEP 1B: Ambiguous Email Clarification
      if (step === 'ambiguous_email') {
        const t = rawTranscript.toLowerCase().trim();
        let chosen: string | null = null;
        if (t.includes('dot') || t.includes('period')) {
          chosen = ambiguousOptions[0] || null;
        } else if (t.includes('underscore')) {
          chosen = ambiguousOptions[1] || null;
        } else if (t.includes('hyphen') || t.includes('dash')) {
          chosen = ambiguousOptions[2] || null;
        } else if (t.includes('one word') || t.includes('together') || t.includes('combined')) {
          chosen = ambiguousOptions[3] || null;
        } else {
          // Check if candidate is spelling their email
          const reconstructed = reconstructSpelledEmail(rawTranscript);
          if (reconstructed && reconstructed.includes('@')) {
            chosen = reconstructed;
          }
        }

        if (chosen) {
          setIdentifier(chosen);
          identifierRef.current = chosen;
          setVoiceStep('confirm_email');
          voiceStepRef.current = 'confirm_email';
          const spelledOut = spellOutIdentifier(chosen);
          speakAndRecord(
            `Thank you for clarifying. I will spell it out for confirmation: ${spelledOut}. Is this your correct email address? Say YES to confirm or NO to enter it again.`,
            () => startVoiceListening()
          );
          return true;
        }

        speakAndRecord(
          'Please say DOT, UNDERSCORE, or ONE WORD, or spell out your email letter by letter.',
          () => startVoiceListening()
        );
        return true;
      }

      // STEP 2: Email Confirmation
      if (step === 'confirm_email') {
        const confirmation = parseConfirmationIntent(rawTranscript.toLowerCase());
        if (confirmation === 'yes') {
          const check = validateLoginIdentifier(identifierRef.current);
          if (!check.valid) {
            setVoiceStep('ask_email');
            voiceStepRef.current = 'ask_email';
            speakAndRecord(
              `${check.error} Please say your registered email address or roll number again.`,
              () => startVoiceListening()
            );
            return true;
          }

          setVoiceStep('enter_password');
          voiceStepRef.current = 'enter_password';
          setTimeout(() => {
            passwordInputRef.current?.focus();
          }, 50);

          speakAndRecord(
            'Identifier confirmed. Your password field is now focused. Please enter your password using your keyboard. Your password will remain private and will never be spoken aloud. After entering your password, say Continue or press Enter.',
            () => startVoiceListening()
          );
          return true;
        }

        if (confirmation === 'no') {
          setIdentifier('');
          identifierRef.current = '';
          setVoiceStep('ask_email');
          voiceStepRef.current = 'ask_email';
          speakAndRecord(
            'Let us try again. Please say your registered email address or roll number clearly.',
            () => startVoiceListening()
          );
          return true;
        }

        speakAndRecord(
          `Please say YES to confirm ${identifierRef.current}, or say NO to enter it again.`,
          () => startVoiceListening()
        );
        return true;
      }

      // STEP 3: Password Entry (Privacy Protected)
      if (step === 'enter_password') {
        const clean = rawTranscript.toLowerCase().trim();
        if (
          clean === 'continue' ||
          clean === 'next' ||
          clean === 'done' ||
          clean === 'password entered' ||
          clean === 'yes'
        ) {
          await advanceFromPasswordToCaptcha();
          return true;
        }
        // Protect user privacy: never speak password aloud
        speakAndRecord(
          'For your protection, passwords are never spoken aloud. Please type your password in the focused password field using your keyboard, then say Continue or press Enter.',
          () => startVoiceListening()
        );
        return true;
      }

      // STEP 4: Spoken Audio CAPTCHA Capture
      if (step === 'ask_captcha') {
        const cleanDigits = extractDigits(rawTranscript);
        if (!cleanDigits || cleanDigits.length !== 4) {
          speakAndRecord(
            `I heard ${cleanDigits ? cleanDigits.split('').join(' ') : 'no digits'}, but a 4-digit code is required. Please repeat the four verification digits.`,
            () => startVoiceListening()
          );
          return true;
        }

        setRecognizedCaptchaDigits(cleanDigits);
        recognizedCaptchaDigitsRef.current = cleanDigits;
        setCaptchaInput(cleanDigits);
        captchaInputRefVal.current = cleanDigits;
        setVoiceStep('confirm_captcha');
        voiceStepRef.current = 'confirm_captcha';

        const spokenDigits = formatCaptchaForSpeech(cleanDigits);
        speakAndRecord(
          `I heard: ${spokenDigits} Is that correct? Say YES to confirm or NO to repeat.`,
          () => startVoiceListening()
        );
        return true;
      }

      // STEP 5: CAPTCHA Confirmation (YES/NO)
      if (step === 'confirm_captcha') {
        const confirmation = parseConfirmationIntent(rawTranscript.toLowerCase());
        if (confirmation === 'yes') {
          const digits = recognizedCaptchaDigitsRef.current;
          const token = await verifyCaptchaCode(digits, true);
          if (token) {
            setVoiceStep('confirm_submit');
            voiceStepRef.current = 'confirm_submit';
            speakAndRecord(
              `Audio verification code confirmed. Ready to sign in as ${identifierRef.current}. Say YES or Sign In to access your dashboard, or say NO to cancel.`,
              () => startVoiceListening()
            );
          }
          return true;
        }

        if (confirmation === 'no') {
          setRecognizedCaptchaDigits('');
          recognizedCaptchaDigitsRef.current = '';
          setCaptchaInput('');
          captchaInputRefVal.current = '';
          setVoiceStep('ask_captcha');
          voiceStepRef.current = 'ask_captcha';
          speakAndRecord(
            'Let us try again. Please listen to the four verification digits and repeat them clearly.',
            () => startVoiceListening()
          );
          return true;
        }

        const spokenDigits = formatCaptchaForSpeech(recognizedCaptchaDigitsRef.current);
        speakAndRecord(
          `Please say YES to confirm ${spokenDigits}, or say NO to repeat.`,
          () => startVoiceListening()
        );
        return true;
      }

      // STEP 6: Final Submission Confirmation
      if (step === 'confirm_submit') {
        const clean = rawTranscript.toLowerCase().trim();
        const confirmation = parseConfirmationIntent(clean);
        if (confirmation === 'yes' || clean === 'sign in' || clean === 'login' || clean === 'submit') {
          await executeSignIn(verificationToken);
          return true;
        }
        if (confirmation === 'no' || clean === 'cancel') {
          setVoiceStep('idle');
          voiceStepRef.current = 'idle';
          speakAndRecord('Voice sign-in cancelled. You can review the form or press Sign In when ready.');
          return true;
        }
        speakAndRecord(
          'Please say YES or Sign In to complete authentication, or say NO to cancel.',
          () => startVoiceListening()
        );
        return true;
      }

      return false;
    });

    return () => unregister();
  }, [
    registerVoiceHandler,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    speakText,
    speakAndRecord,
    startVoiceListening,
    handlePlayCaptchaAudio,
    fetchNewChallenge,
    handleSwitchToKeyboard,
    handleStartVoiceLogin,
    navigateTo,
    verifyCaptchaCode,
    advanceFromPasswordToCaptcha,
    executeSignIn,
    verificationToken
  ]);

  return (
    <AuthenticationLayout
      screenBadge="Candidate Authentication"
      headline="Welcome back to ACCESSPREP-X"
      supportingDescription="Accessible, voice-first and keyboard-first examination portal for SSC MTS candidates with visual disabilities."
      features={[
        {
          icon: <Headphones className="w-5 h-5 text-[#1749E8]" aria-hidden="true" />,
          title: 'Audio-First Guided Login',
          description: 'Say your email or roll number naturally. The system verifies every character before proceeding.'
        },
        {
          icon: <Key className="w-5 h-5 text-[#1749E8]" aria-hidden="true" />,
          title: 'Secure Password Entry',
          description: 'Confidential keyboard password entry with accessible visibility toggle, never announced aloud.'
        },
        {
          icon: <ShieldCheck className="w-5 h-5 text-[#1749E8]" aria-hidden="true" />,
          title: 'Accessible Audio CAPTCHA',
          description: 'Human-verified four-digit audio code with single-use verification tokens and repetition support.'
        }
      ]}
    >
      <AuthenticationCard
        title="Candidate Sign In"
        subtitle="Access your personalized SSC MTS study portal, voice practice sessions, and non-repeating mock exams."
        audioGuideText={LOGIN_GUIDE_MESSAGE}
        audioGuideLabel="Read Candidate Sign In Instructions"
        stepBadge="Sign In Form"
        footerPromptText="New candidate?"
        footerActionLabel="Create an Accessible Account"
        onFooterAction={() => navigateTo('register')}
      >
        <div className="space-y-6">
          {/* Voice Guidance & Mode Control Banner */}
          <VoiceGuidanceControls
            mode="login"
            isVoiceWorkflowActive={voiceStep !== 'idle'}
            currentStepLabel={
              voiceStep === 'ask_email'
                ? 'Step 1: Listening for Email or Roll Number'
                : voiceStep === 'ambiguous_email'
                ? 'Step 1: Clarifying Email Spelling'
                : voiceStep === 'confirm_email'
                ? 'Step 1: Confirming Email'
                : voiceStep === 'enter_password'
                ? 'Step 2: Enter Password via Keyboard'
                : voiceStep === 'ask_captcha'
                ? 'Step 3: Repeating Audio CAPTCHA'
                : voiceStep === 'confirm_captcha'
                ? 'Step 3: Confirming Audio CAPTCHA'
                : voiceStep === 'confirm_submit'
                ? 'Step 4: Ready to Submit'
                : undefined
            }
            isSpeaking={isSpeaking}
            isListening={isVoiceListening}
            onStartVoiceWorkflow={handleStartVoiceLogin}
            onReadGuide={handleReadLoginGuide}
            onStopSpeaking={stopSpeaking}
            onSwitchToKeyboard={handleSwitchToKeyboard}
          />

          {/* Form-level Error or Success Alerts */}
          {formError && (
            <AuthenticationErrorMessage
              id="login-form-error"
              title="Sign In Notice"
              message={formError}
            />
          )}

          {successMessage && (
            <div
              role="status"
              className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-sm font-semibold flex items-center gap-2.5"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Blind-Friendly Single-Key Shortcuts Banner */}
          <section
            aria-label="Single-Key Accessibility Shortcuts"
            className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 border-2 border-[#1749E8] text-xs text-[#172033] dark:text-blue-100 space-y-2 shadow-xs"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-[#1749E8] dark:text-blue-400 shrink-0" aria-hidden="true" />
                <span className="font-extrabold uppercase tracking-wider text-[11px] text-[#1749E8] dark:text-blue-300">
                  Single-Key Shortcuts for Blind Candidates
                </span>
              </div>
              <button
                type="button"
                onClick={handleReadKeyboardShortcuts}
                className="text-xs font-bold text-[#1749E8] dark:text-blue-300 hover:underline inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[#1749E8] rounded px-1.5 py-0.5"
                aria-label="Read all keyboard shortcuts aloud"
              >
                <span>Hear Shortcuts (Press K)</span>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-[#53627A] dark:text-slate-300">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
                <kbd className="font-bold text-[#1749E8]">L</kbd> Email
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
                <kbd className="font-bold text-[#1749E8]">P</kbd> Password
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-emerald-500 text-emerald-800 dark:text-emerald-300">
                <kbd className="font-bold text-emerald-600">C</kbd> Auto-Write CAPTCHA
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
                <kbd className="font-bold text-[#1749E8]">S</kbd> Submit
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
                <kbd className="font-bold text-[#1749E8]">R</kbd> Play Audio
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-400 text-[#1749E8] dark:text-blue-300">
                <kbd className="font-bold text-[#1749E8]">F2</kbd> Re-Read
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 border border-emerald-400 text-emerald-800 dark:text-emerald-300">
                <kbd className="font-bold text-emerald-700">Y</kbd> Confirm
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950 border border-red-400 text-red-800 dark:text-red-300">
                <kbd className="font-bold text-red-700">N</kbd> Clear
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
                <kbd className="font-bold text-[#1749E8]">K</kbd> Read All
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
                <kbd className="font-bold text-[#1749E8]">Esc</kbd> Stop Voice
              </span>
            </div>
          </section>

          {/* Main Accessible Form */}
          <form onSubmit={handleFormSubmit} className="space-y-5" noValidate>
            {/* Field 1: Registered Email Address or SSC Roll Number */}
            <AccessibleFormField
              id="candidate-identifier"
              name="identifier"
              label="Registered Email Address or Roll Number"
              type="text"
              value={identifier}
              onChange={(val) => {
                setIdentifier(val);
                identifierRef.current = val;
                if (identifierError) setIdentifierError(null);
              }}
              onFocus={handleEmailFocus}
              onBlur={handleEmailBlur}
              required
              autoComplete="username"
              placeholder="e.g. ashwin@gmail.com or SSC-2026-MTS-01"
              error={identifierError}
              hint="Press L to focus. After typing, press Tab — I will read it back and ask you to confirm."
              inputRef={emailInputRef}
              icon={<Mail className="w-4 h-4 text-[#53627A] dark:text-slate-400" aria-hidden="true" />}
            />

            {/* Field 2: Secure Password Entry with Show/Hide Toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="candidate-password"
                  className="block text-sm font-bold text-[#172033] dark:text-slate-100"
                >
                  Password{' '}
                  <span className="text-red-600 dark:text-red-400 font-extrabold" aria-hidden="true">
                    *
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password as plain text'}
                  className="text-xs font-semibold text-[#1749E8] dark:text-blue-400 hover:underline inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[#1749E8] rounded px-1.5 py-0.5"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Show</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <input
                  id="candidate-password"
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    passwordRef.current = e.target.value;
                    if (passwordError) setPasswordError(null);
                  }}
                  onFocus={handlePasswordFocus}
                  onBlur={handlePasswordBlur}
                  required
                  autoComplete="current-password"
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? 'candidate-password-error' : 'candidate-password-hint'}
                  placeholder="Enter your confidential password"
                  className={`w-full px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 ${
                    passwordError
                      ? 'border-red-500 focus:ring-red-200'
                      : 'border-slate-300 dark:border-slate-700 focus:border-[#1749E8] focus:ring-blue-200'
                  }`}
                />
              </div>

              {passwordError ? (
                <p id="candidate-password-error" role="alert" className="text-xs font-bold text-red-600 dark:text-red-400 mt-1">
                  {passwordError}
                </p>
              ) : (
                <p id="candidate-password-hint" className="text-xs text-[#53627A] dark:text-slate-400 mt-1">
                  Private password entry. Press P to focus. Never spoken aloud.
                </p>
              )}
            </div>

            {/* Field 3: Accessible 4-Digit Audio CAPTCHA */}
            <AudioCaptchaControls
              id="audio-captcha-input"
              challenge={challenge}
              loadingChallenge={challengeLoading}
              captchaInput={captchaInput}
              onCaptchaInputChange={(val) => {
                setCaptchaInput(val);
                captchaInputRefVal.current = val;
                if (captchaError) setCaptchaError(null);
              }}
              onPlayAudio={handlePlayCaptchaAudio}
              onRefreshChallenge={() => fetchNewChallenge(true, false)}
              isVerified={!!verificationToken}
              error={captchaError}
              inputRef={captchaInputRef}
              onInputFocus={handleCaptchaFocus}
              onInputBlur={handleCaptchaBlur}
            />

            {/* Submit & Action Buttons */}
            <div className="pt-2 space-y-3">

              {/* Pre-Submit Confirmation Banner (shown when S is pressed) */}
              {awaitingSubmitConfirmation && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-600 space-y-2"
                >
                  <p className="text-sm font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <span aria-hidden="true">⚠️</span>
                    Confirm Before Signing In
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    <strong>Email:</strong>{' '}
                    <span className="font-mono tracking-wider">{identifier}</span>
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    <strong>Password:</strong> <em>entered (hidden for security)</em>
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    <strong>Verification Code:</strong>{' '}
                    <span className="font-mono tracking-wider">{captchaInput}</span>
                  </p>
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAwaitingSubmitConfirmation(false);
                        awaitingSubmitRef.current = false;
                        executeSignIn();
                      }}
                      className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      aria-label="Confirm and sign in"
                    >
                      ✓ Yes, Sign In <kbd className="ml-1 text-xs opacity-80 font-mono">[Y]</kbd>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAwaitingSubmitConfirmation(false);
                        awaitingSubmitRef.current = false;
                        const msg = 'Cancelled. Review your details and press S again when ready.';
                        announce(msg, 'polite'); speakText(msg);
                      }}
                      className="flex-1 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-400"
                      aria-label="Cancel and go back"
                    >
                      ✗ No, Go Back <kbd className="ml-1 text-xs opacity-80 font-mono">[N]</kbd>
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[50px] px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-[#1749E8] hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all shadow-md inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                    <span>Signing in securely...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" aria-hidden="true" />
                    <span>Sign In to Candidate Dashboard</span>
                  </>
                )}
              </button>

              {/* Developer / Demo Quick Testing Button */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleFillDemoCredentials}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline focus:outline-none focus:ring-2 focus:ring-[#1749E8] rounded px-2 py-1"
                >
                  Fill Demo Credentials (Aarav Sharma - Visually Impaired Candidate)
                </button>
              </div>
            </div>
          </form>
        </div>
      </AuthenticationCard>
    </AuthenticationLayout>
  );
}
