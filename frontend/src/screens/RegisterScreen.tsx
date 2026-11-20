import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  UserPlus,
  User as UserIcon,
  Mail,
  Key,
  Sparkles,
  Mic,
  BookOpen,
  Loader2,
  Sliders,
  CheckCircle2,
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
  normalizeSpokenName,
  analyzeSpokenEmail,
  spellOutIdentifier,
  validateEmailFormat,
  parseAuthVoiceCommand,
  reconstructSpelledEmail
} from '../utils/authVoiceUtils.ts';
import { extractDigits } from '../utils/humanVerification.ts';
import { parseConfirmationIntent } from '../voice/commandParser.ts';

export type RegisterVoiceStep =
  | 'idle'
  | 'ask_name'
  | 'confirm_name'
  | 'ask_email'
  | 'ambiguous_email'
  | 'confirm_email'
  | 'enter_password'
  | 'confirm_password'
  | 'ask_captcha'
  | 'confirm_captcha'
  | 'confirm_submit';

const REGISTER_INTRO_MESSAGE =
  'Welcome to ACCESSPREP-X Registration. Let us create your accessible account step by step. You can use voice guidance or your keyboard.';

const REGISTER_GUIDE_MESSAGE =
  'Registration Instructions: Step 1, enter your Full Name. Step 2, enter your Email Address. Step 3, create a secure Password of at least 6 characters using your keyboard. Step 4, confirm your Password. Step 5, select your PwD accessibility accommodations if applicable. Step 6, complete the four-digit Audio CAPTCHA and activate Create Account. Say Start Voice Registration for step-by-step guidance.';

const REGISTER_FIELDS_SUMMARY =
  'The Registration form contains: Field 1, Full Name. Field 2, Email Address. Field 3, Password with Show or Hide control. Field 4, Confirm Password with Show or Hide control. Field 5, PwD Category and Scribe Accommodations. Field 6, Four-digit Audio CAPTCHA verification code, followed by the Create Account button and Sign In link.';

export function RegisterScreen() {
  const {
    navigateTo,
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

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    pwdCategory: 'Visually Impaired',
    needScribe: true,
    examRegion: 'Northern Region (NR)',
    examLanguage: 'English',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Field-level & Form-level Validation Errors
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Audio CAPTCHA State
  const [challenge, setChallenge] = useState<CaptchaChallengeData | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [captchaInput, setCaptchaInput] = useState('');
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [verifiedForInput, setVerifiedForInput] = useState<string>('');
  const [isCapturingCaptchaVoice, setIsCapturingCaptchaVoice] = useState(false);
  const [recognizedCaptchaDigits, setRecognizedCaptchaDigits] = useState('');

  // Voice-Guided Registration State Machine
  const [voiceStep, setVoiceStep] = useState<RegisterVoiceStep>('idle');
  const [ambiguousOptions, setAmbiguousOptions] = useState<string[]>([]);
  const lastPromptRef = useRef<string>(REGISTER_INTRO_MESSAGE);
  const hasAnnouncedIntroRef = useRef<boolean>(false);

  // Input Refs for Focus Management
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement | null>(null);
  const captchaInputRef = useRef<HTMLInputElement | null>(null);

  // Live state refs for asynchronous voice handler callbacks
  const voiceStepRef = useRef<RegisterVoiceStep>(voiceStep);
  voiceStepRef.current = voiceStep;
  const formDataRef = useRef(formData);
  formDataRef.current = formData;
  const challengeRef = useRef<CaptchaChallengeData | null>(challenge);
  challengeRef.current = challenge;
  const captchaInputRefVal = useRef<string>(captchaInput);
  captchaInputRefVal.current = captchaInput;
  const isCapturingCaptchaVoiceRef = useRef<boolean>(isCapturingCaptchaVoice);
  isCapturingCaptchaVoiceRef.current = isCapturingCaptchaVoice;
  const recognizedCaptchaDigitsRef = useRef<string>(recognizedCaptchaDigits);
  recognizedCaptchaDigitsRef.current = recognizedCaptchaDigits;

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

  // Initial welcome announcement on mount
  useEffect(() => {
    if (!hasAnnouncedIntroRef.current) {
      hasAnnouncedIntroRef.current = true;
      if (interactionMode === 'voice') {
        speakAndRecord(REGISTER_INTRO_MESSAGE);
      } else {
        announce(REGISTER_INTRO_MESSAGE, 'polite');
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

  // Verify CAPTCHA digits against backend
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
        if (!res.ok || !data.success || !data.verificationToken) {
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
        const netErr = 'Network failure while verifying audio code. Please check your connection.';
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

  // Core Registration Submission
  const executeRegistration = useCallback(
    async (preVerifiedToken?: string | null) => {
      if (loading) return;
      setFormError(null);
      setNameError(null);
      setEmailError(null);
      setPasswordError(null);
      setConfirmPasswordError(null);
      setCaptchaError(null);

      const cur = formDataRef.current;
      const curCaptcha = captchaInputRefVal.current.trim();

      // 1. Validate Full Name
      if (!cur.name.trim()) {
        const msg = 'Please enter your full name.';
        setNameError(msg);
        announce(msg, 'assertive');
        speakText(msg);
        nameInputRef.current?.focus();
        return;
      }

      // 2. Validate Email Address
      if (!cur.email.trim() || !validateEmailFormat(cur.email.trim())) {
        const msg = 'Please enter a valid email address (for example, student@example.com).';
        setEmailError(msg);
        announce(msg, 'assertive');
        speakText(msg);
        emailInputRef.current?.focus();
        return;
      }

      // 3. Validate Password
      if (!cur.password || cur.password.length < 6) {
        const msg = 'Please enter a password of at least 6 characters.';
        setPasswordError(msg);
        announce(msg, 'assertive');
        speakText(msg);
        passwordInputRef.current?.focus();
        return;
      }

      // 4. Validate Confirm Password
      if (cur.password !== cur.confirmPassword) {
        const msg = 'Passwords do not match. Please ensure both password fields match.';
        setConfirmPasswordError(msg);
        announce(msg, 'assertive');
        speakText(msg);
        confirmPasswordInputRef.current?.focus();
        return;
      }

      // 5. Validate Audio CAPTCHA
      let tokenToUse = preVerifiedToken || verificationToken;
      if (!tokenToUse) {
        if (!curCaptcha) {
          const msg = 'Please enter or speak the 4-digit audio verification code.';
          setCaptchaError(msg);
          announce(msg, 'assertive');
          speakText(msg);
          captchaInputRef.current?.focus();
          return;
        }
        tokenToUse = await verifyCaptchaCode(curCaptcha, voiceStepRef.current !== 'idle');
        if (!tokenToUse) {
          return;
        }
      }

      setLoading(true);
      announce('Creating your ACCESSPREP-X account...', 'polite');

      try {
        const isBlind = cur.pwdCategory === 'Visually Impaired' || Boolean(cur.needScribe);
        const payload = {
          name: cur.name.trim(),
          email: cur.email.trim(),
          phone: cur.phone.trim(),
          pwdCategory: cur.pwdCategory,
          needScribe: cur.needScribe,
          examRegion: cur.examRegion,
          examLanguage: cur.examLanguage,
          password: cur.password,
          isBlindMode: isBlind,
          autoReadAloud: isBlind
        };

        if (isBlind) {
          try {
            localStorage.setItem('accessprep_blind_mode', 'true');
          } catch {}
        }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Registration failed. Please verify your information.');
        }

        const rollNumber: string = data.user?.rollNumber || '';
        const welcomeText = `Your ACCESSPREP-X account has been created successfully. Welcome!${
          rollNumber ? ` Your Roll Number is ${rollNumber}.` : ''
        } Redirecting to Sign In.`;

        setSuccessMsg(welcomeText);
        setVoiceStep('idle');
        announce(welcomeText, 'assertive');
        speakText(welcomeText);

        setTimeout(() => {
          navigateTo('login');
        }, 2500);
      } catch (err: any) {
        const msg =
          err.message === 'Failed to fetch'
            ? 'Network error: Unable to reach the registration server. Please check your connection.'
            : err.message || 'Registration failed. Please try again.';
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
      announce,
      speakText,
      navigateTo
    ]
  );

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeRegistration();
  };

  // Voice-Guided Registration Workflow Controls
  const handleStartVoiceRegister = useCallback(() => {
    setFormError(null);
    setNameError(null);
    setEmailError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);
    setCaptchaError(null);
    setIsCapturingCaptchaVoice(false);
    setVoiceStep('ask_name');
    voiceStepRef.current = 'ask_name';

    const prompt =
      'Welcome to ACCESSPREP-X Registration. Let us create your account step by step. Step 1 of 6: Please say your full name clearly.';
    speakAndRecord(prompt, () => {
      startVoiceListening();
    });
  }, [speakAndRecord, startVoiceListening]);

  const handleReadRegisterGuide = useCallback(() => {
    speakAndRecord(REGISTER_GUIDE_MESSAGE);
  }, [speakAndRecord]);

  const handleSwitchToKeyboard = useCallback(() => {
    stopSpeaking();
    stopVoiceListening();
    setVoiceStep('idle');
    voiceStepRef.current = 'idle';
    setIsCapturingCaptchaVoice(false);
    const msg = 'Switched to keyboard input mode. Full name field is now focused.';
    announce(msg, 'polite');
    speakText(msg);
    setTimeout(() => {
      nameInputRef.current?.focus();
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
    const msg = `Audio verification code auto-entered: ${spokenDigits}. CAPTCHA verified. Press S to complete registration.`;
    announce(msg, 'assertive');
    speakText(msg);
  }, [fetchNewChallenge, verifyCaptchaCode, announce, speakText]);

  // Blind-Friendly Single-Key Shortcut Handlers
  const handleFocusName = useCallback(() => {
    nameInputRef.current?.focus();
    const msg = 'Full name field focused. You can now type your full legal name.';
    announce(msg, 'assertive');
    speakText(msg);
  }, [announce, speakText]);

  const handleFocusEmail = useCallback(() => {
    emailInputRef.current?.focus();
    const msg = 'Email field focused. You can now type your registered email address.';
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
    const msg = 'Submitting registration...';
    announce(msg, 'assertive');
    speakText(msg);
    await executeRegistration();
  }, [executeRegistration, announce, speakText]);

  const handleReadKeyboardShortcuts = useCallback(() => {
    const constantDescription =
      'ACCESSPREP-X Keyboard Shortcuts: Press L to type your email address or name. Press P to enter your password. Press C to auto-fill the audio verification code. Press S to create your account. Press R to play audio verification code. Press F 2 to re-read current field. Press Y to confirm. Press N to clear or cancel. Press H for help. Press K to hear this description again. Press Escape to stop speech. The microphone is always listening for your voice commands.';
    announce(constantDescription, 'assertive');
    speakText(constantDescription);
  }, [announce, speakText]);

  // Register single-key shortcuts & auto-fill listener for RegisterScreen
  useEffect(() => {
    const onAutoFill = () => {
      handleAutoFillCaptcha();
    };
    window.addEventListener('accessprep:auto-fill-captcha', onAutoFill);

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (isTyping) {
        if (e.key === 'Escape') {
          target.blur();
          stopSpeaking();
          announce('Exited text field. Shortcuts active: L for Email, P for Password, C for CAPTCHA, S to create account.', 'polite');
        }
        return;
      }

      const key = e.key.toLowerCase();

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
        handleReadRegisterGuide();
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
    handleReadRegisterGuide,
    stopSpeaking,
    announce
  ]);

  // Context-Aware Voice Handler
  useEffect(() => {
    const unregister = registerVoiceHandler(async (rawTranscript: string) => {
      const cmd = parseAuthVoiceCommand(rawTranscript, 'register');

      // Universal & Shared Page Commands
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
        speakText(lastPromptRef.current || REGISTER_INTRO_MESSAGE);
        return true;
      }
      if (cmd === 'explain_page' || cmd === 'what_can_i_do' || cmd === 'help') {
        const helpMsg =
          'You are on the ACCESSPREP-X Registration page. You can create an account by entering your Full Name, Email, Password, PwD Category, and four-digit audio verification code. Available voice commands: Start Voice Registration, Read Instructions, Read All Fields, Repeat CAPTCHA, Refresh CAPTCHA, Use Keyboard, or Go to Login.';
        speakAndRecord(helpMsg, voiceStepRef.current !== 'idle' ? () => startVoiceListening() : undefined);
        return true;
      }
      if (cmd === 'read_instructions') {
        speakAndRecord(REGISTER_GUIDE_MESSAGE, voiceStepRef.current !== 'idle' ? () => startVoiceListening() : undefined);
        return true;
      }
      if (cmd === 'read_all_fields') {
        speakAndRecord(REGISTER_FIELDS_SUMMARY, voiceStepRef.current !== 'idle' ? () => startVoiceListening() : undefined);
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
        handleStartVoiceRegister();
        return true;
      }
      if (cmd === 'go_to_login') {
        stopSpeaking();
        navigateTo('login');
        return true;
      }
      if (cmd === 'go_to_register') {
        speakAndRecord('You are already on the Registration page.');
        return true;
      }

      // Step Machine
      const step = voiceStepRef.current;
      if (step === 'idle') return false;

      // STEP 1: Full Name
      if (step === 'ask_name') {
        const normalizedName = normalizeSpokenName(rawTranscript);
        if (!normalizedName) {
          speakAndRecord('I could not catch your name. Please say your full name clearly.', () =>
            startVoiceListening()
          );
          return true;
        }

        setFormData((prev) => ({ ...prev, name: normalizedName }));
        formDataRef.current = { ...formDataRef.current, name: normalizedName };
        setNameError(null);
        setVoiceStep('confirm_name');
        voiceStepRef.current = 'confirm_name';

        speakAndRecord(
          `I heard your name as ${normalizedName}. Is this correct? Say YES to confirm or NO to repeat.`,
          () => startVoiceListening()
        );
        return true;
      }

      // STEP 1B: Name Confirmation
      if (step === 'confirm_name') {
        const confirmation = parseConfirmationIntent(rawTranscript.toLowerCase());
        if (confirmation === 'yes') {
          setVoiceStep('ask_email');
          voiceStepRef.current = 'ask_email';
          setTimeout(() => emailInputRef.current?.focus(), 50);

          speakAndRecord(
            `Name confirmed as ${formDataRef.current.name}. Step 2 of 6: Please say your email address clearly.`,
            () => startVoiceListening()
          );
          return true;
        }

        if (confirmation === 'no') {
          setVoiceStep('ask_name');
          voiceStepRef.current = 'ask_name';
          speakAndRecord('Let us try again. Please say your full name clearly.', () => startVoiceListening());
          return true;
        }

        speakAndRecord(
          `Please say YES to confirm ${formDataRef.current.name}, or say NO to repeat.`,
          () => startVoiceListening()
        );
        return true;
      }

      // STEP 2: Email Capture
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
          speakAndRecord('I could not catch your email. Please say your email address again.', () =>
            startVoiceListening()
          );
          return true;
        }

        setFormData((prev) => ({ ...prev, email: normalized }));
        formDataRef.current = { ...formDataRef.current, email: normalized };
        setEmailError(null);
        setVoiceStep('confirm_email');
        voiceStepRef.current = 'confirm_email';

        const spelledOut = spellOutIdentifier(normalized);
        speakAndRecord(
          `I heard your email address. I will spell it out for confirmation: ${spelledOut}. Is this your correct email address? Say YES to confirm or NO to enter it again.`,
          () => startVoiceListening()
        );
        return true;
      }

      // STEP 2B: Ambiguous Email Clarification
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
          const reconstructed = reconstructSpelledEmail(rawTranscript);
          if (reconstructed && reconstructed.includes('@')) {
            chosen = reconstructed;
          }
        }

        if (chosen) {
          setFormData((prev) => ({ ...prev, email: chosen! }));
          formDataRef.current = { ...formDataRef.current, email: chosen! };
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

      // STEP 2C: Email Confirmation
      if (step === 'confirm_email') {
        const confirmation = parseConfirmationIntent(rawTranscript.toLowerCase());
        if (confirmation === 'yes') {
          if (!validateEmailFormat(formDataRef.current.email)) {
            setVoiceStep('ask_email');
            voiceStepRef.current = 'ask_email';
            speakAndRecord(
              'Please provide a valid email address with a domain, such as student at example dot com.',
              () => startVoiceListening()
            );
            return true;
          }

          setVoiceStep('enter_password');
          voiceStepRef.current = 'enter_password';
          setTimeout(() => passwordInputRef.current?.focus(), 50);

          speakAndRecord(
            'Email confirmed. Step 3 of 6: Secure password creation. For your security, passwords are never spoken aloud. The password field is now focused. Please type a password of at least 6 characters on your keyboard, then say Continue or press Enter.',
            () => startVoiceListening()
          );
          return true;
        }

        if (confirmation === 'no') {
          setFormData((prev) => ({ ...prev, email: '' }));
          formDataRef.current = { ...formDataRef.current, email: '' };
          setVoiceStep('ask_email');
          voiceStepRef.current = 'ask_email';
          speakAndRecord('Let us try again. Please say your email address clearly.', () => startVoiceListening());
          return true;
        }

        speakAndRecord(
          `Please say YES to confirm ${formDataRef.current.email}, or say NO to re-enter.`,
          () => startVoiceListening()
        );
        return true;
      }

      // STEP 3: Password Entry
      if (step === 'enter_password') {
        const clean = rawTranscript.toLowerCase().trim();
        if (
          clean === 'continue' ||
          clean === 'next' ||
          clean === 'done' ||
          clean === 'password entered' ||
          clean === 'yes'
        ) {
          if (!formDataRef.current.password || formDataRef.current.password.length < 6) {
            speakAndRecord(
              'Password must be at least 6 characters. Please type your password on your keyboard, then say Continue.',
              () => startVoiceListening()
            );
            return true;
          }

          setVoiceStep('confirm_password');
          voiceStepRef.current = 'confirm_password';
          setTimeout(() => confirmPasswordInputRef.current?.focus(), 50);

          speakAndRecord(
            'Password recorded. Step 4 of 6: Confirm password. The confirmation password box is now focused. Please re-type your password on your keyboard, then say Continue or press Enter.',
            () => startVoiceListening()
          );
          return true;
        }

        speakAndRecord(
          'For your protection, passwords are never spoken aloud. Please type your password in the focused field, then say Continue.',
          () => startVoiceListening()
        );
        return true;
      }

      // STEP 4: Confirm Password
      if (step === 'confirm_password') {
        const clean = rawTranscript.toLowerCase().trim();
        if (
          clean === 'continue' ||
          clean === 'next' ||
          clean === 'done' ||
          clean === 'password confirmed' ||
          clean === 'yes'
        ) {
          if (formDataRef.current.password !== formDataRef.current.confirmPassword) {
            speakAndRecord(
              'Passwords do not match. Please re-enter your confirmation password on your keyboard, then say Continue.',
              () => startVoiceListening()
            );
            return true;
          }

          let curChallenge = challengeRef.current;
          if (!curChallenge) {
            curChallenge = await fetchNewChallenge(false, false);
          }

          setVoiceStep('ask_captcha');
          voiceStepRef.current = 'ask_captcha';

          const spokenDigits = curChallenge ? formatCaptchaForSpeech(curChallenge.phrase) : '';
          speakAndRecord(
            `Passwords match. Step 5 of 6: Audio verification. Listen carefully to the four digits: ${spokenDigits} Please repeat these four digits now, or enter them on your keyboard.`,
            () => startVoiceListening()
          );
          return true;
        }

        speakAndRecord(
          'Please type matching confirmation password on your keyboard, then say Continue.',
          () => startVoiceListening()
        );
        return true;
      }

      // STEP 5: Spoken Audio CAPTCHA Capture
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

      // STEP 5B: CAPTCHA Confirmation (YES/NO)
      if (step === 'confirm_captcha') {
        const confirmation = parseConfirmationIntent(rawTranscript.toLowerCase());
        if (confirmation === 'yes') {
          const digits = recognizedCaptchaDigitsRef.current;
          const token = await verifyCaptchaCode(digits, true);
          if (token) {
            setVoiceStep('confirm_submit');
            voiceStepRef.current = 'confirm_submit';
            speakAndRecord(
              `Audio verification code confirmed. Step 6 of 6: Ready to create your account for ${formDataRef.current.name}. Say YES or Create Account to complete registration, or say NO to cancel.`,
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

      // STEP 6: Final Registration Confirmation
      if (step === 'confirm_submit') {
        const clean = rawTranscript.toLowerCase().trim();
        const confirmation = parseConfirmationIntent(clean);
        if (
          confirmation === 'yes' ||
          clean === 'create account' ||
          clean === 'register' ||
          clean === 'submit'
        ) {
          await executeRegistration(verificationToken);
          return true;
        }
        if (confirmation === 'no' || clean === 'cancel') {
          setVoiceStep('idle');
          voiceStepRef.current = 'idle';
          speakAndRecord(
            'Voice registration cancelled. You can review your form entries or activate Create Account when ready.'
          );
          return true;
        }
        speakAndRecord(
          'Please say YES or Create Account to submit your registration, or say NO to cancel.',
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
    handleStartVoiceRegister,
    navigateTo,
    verifyCaptchaCode,
    executeRegistration,
    verificationToken,
    ambiguousOptions
  ]);

  return (
    <AuthenticationLayout
      screenBadge="Candidate Registration"
      headline="Register for ACCESSPREP-X"
      supportingDescription="Accessible, voice-first and keyboard-first examination portal for SSC MTS candidates with visual disabilities."
      features={[
        {
          icon: <Sparkles className="w-5 h-5 text-[#1749E8]" aria-hidden="true" />,
          title: 'Inclusive RPwD Accommodations',
          description: 'Specialized support for blind, low-vision, cerebral palsy, and other disability categories.'
        },
        {
          icon: <Mic className="w-5 h-5 text-[#1749E8]" aria-hidden="true" />,
          title: 'Guided Voice Registration',
          description: 'Register step-by-step using natural speech with full character-level confirmation.'
        },
        {
          icon: <BookOpen className="w-5 h-5 text-[#1749E8]" aria-hidden="true" />,
          title: 'Personalized SSC MTS Portal',
          description: 'Automatic AI tutor, mock test generation, and compensatory time configuration.'
        }
      ]}
    >
      <AuthenticationCard
        title="Create Candidate Account"
        subtitle="Register with full accommodation support for visually impaired, blind, and PwD SSC MTS candidates."
        audioGuideText={REGISTER_GUIDE_MESSAGE}
        audioGuideLabel="Read Candidate Registration Instructions"
        stepBadge="Registration Form"
        footerPromptText="Already have an account?"
        footerActionLabel="Sign In with Voice or Keyboard"
        onFooterAction={() => navigateTo('login')}
      >
        <div className="space-y-6">
          {/* Voice Guidance Controls */}
          <VoiceGuidanceControls
            mode="register"
            isVoiceWorkflowActive={voiceStep !== 'idle'}
            currentStepLabel={
              voiceStep === 'ask_name'
                ? 'Step 1: Listening for Full Name'
                : voiceStep === 'confirm_name'
                ? 'Step 1: Confirming Full Name'
                : voiceStep === 'ask_email'
                ? 'Step 2: Listening for Email Address'
                : voiceStep === 'ambiguous_email'
                ? 'Step 2: Clarifying Email Spelling'
                : voiceStep === 'confirm_email'
                ? 'Step 2: Confirming Email Address'
                : voiceStep === 'enter_password'
                ? 'Step 3: Enter Password via Keyboard'
                : voiceStep === 'confirm_password'
                ? 'Step 4: Confirm Password via Keyboard'
                : voiceStep === 'ask_captcha'
                ? 'Step 5: Repeating Audio CAPTCHA'
                : voiceStep === 'confirm_captcha'
                ? 'Step 5: Confirming Audio CAPTCHA'
                : voiceStep === 'confirm_submit'
                ? 'Step 6: Ready to Submit'
                : undefined
            }
            isSpeaking={isSpeaking}
            isListening={isVoiceListening}
            onStartVoiceWorkflow={handleStartVoiceRegister}
            onReadGuide={handleReadRegisterGuide}
            onStopSpeaking={stopSpeaking}
            onSwitchToKeyboard={handleSwitchToKeyboard}
          />

          {formError && (
            <AuthenticationErrorMessage
              id="register-form-error"
              title="Registration Notice"
              message={formError}
            />
          )}

          {successMsg && (
            <div
              role="status"
              className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-sm font-semibold flex items-center gap-2.5"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
              <span>{successMsg}</span>
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
                <kbd className="font-bold text-[#1749E8]">L</kbd> Email / Name
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
                <kbd className="font-bold text-[#1749E8]">P</kbd> Password
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-emerald-500 text-emerald-800 dark:text-emerald-300">
                <kbd className="font-bold text-emerald-600">C</kbd> Auto-Write CAPTCHA
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
                <kbd className="font-bold text-[#1749E8]">S</kbd> Create Account
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
                <kbd className="font-bold text-[#1749E8]">R</kbd> Play Audio
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
                <kbd className="font-bold text-[#1749E8]">Esc</kbd> Stop Voice
              </span>
            </div>
          </section>

          <form onSubmit={handleFormSubmit} className="space-y-5" noValidate>
            {/* Full Name */}
            <AccessibleFormField
              id="register-name"
              name="name"
              label="Candidate Full Name"
              type="text"
              value={formData.name}
              onChange={(val) => {
                setFormData((prev) => ({ ...prev, name: val }));
                formDataRef.current = { ...formDataRef.current, name: val };
                if (nameError) setNameError(null);
              }}
              required
              autoComplete="name"
              placeholder="e.g. Ashwin Sharma"
              error={nameError}
              hint="Enter your legal full name as per your SSC MTS application."
              inputRef={nameInputRef}
              icon={<UserIcon className="w-4 h-4 text-[#53627A] dark:text-slate-400" aria-hidden="true" />}
            />

            {/* Email Address */}
            <AccessibleFormField
              id="register-email"
              name="email"
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(val) => {
                setFormData((prev) => ({ ...prev, email: val }));
                formDataRef.current = { ...formDataRef.current, email: val };
                if (emailError) setEmailError(null);
              }}
              required
              autoComplete="email"
              placeholder="e.g. ashwin@gmail.com"
              error={emailError}
              hint="Your official examination preparation communications will be sent here. Shortcut: Alt+E"
              inputRef={emailInputRef}
              icon={<Mail className="w-4 h-4 text-[#53627A] dark:text-slate-400" aria-hidden="true" />}
            />

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="register-password"
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
              <input
                id="register-password"
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  formDataRef.current = { ...formDataRef.current, password: e.target.value };
                  if (passwordError) setPasswordError(null);
                }}
                required
                autoComplete="new-password"
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? 'register-password-error' : 'register-password-hint'}
                placeholder="At least 6 characters"
                className={`w-full px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 ${
                  passwordError
                    ? 'border-red-500 focus:ring-red-200'
                    : 'border-slate-300 dark:border-slate-700 focus:border-[#1749E8] focus:ring-blue-200'
                }`}
              />
              {passwordError ? (
                <p id="register-password-error" role="alert" className="text-xs font-bold text-red-600 dark:text-red-400 mt-1">
                  {passwordError}
                </p>
              ) : (
                <p id="register-password-hint" className="text-xs text-[#53627A] dark:text-slate-400 mt-1">
                  Create a secure password with at least 6 characters. Shortcut: Alt+P
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="register-confirm-password"
                  className="block text-sm font-bold text-[#172033] dark:text-slate-100"
                >
                  Confirm Password{' '}
                  <span className="text-red-600 dark:text-red-400 font-extrabold" aria-hidden="true">
                    *
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password as plain text'}
                  className="text-xs font-semibold text-[#1749E8] dark:text-blue-400 hover:underline inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[#1749E8] rounded px-1.5 py-0.5"
                >
                  {showConfirmPassword ? (
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
              <input
                id="register-confirm-password"
                ref={confirmPasswordInputRef}
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => {
                  setFormData({ ...formData, confirmPassword: e.target.value });
                  formDataRef.current = { ...formDataRef.current, confirmPassword: e.target.value };
                  if (confirmPasswordError) setConfirmPasswordError(null);
                }}
                required
                autoComplete="new-password"
                aria-invalid={!!confirmPasswordError}
                aria-describedby={confirmPasswordError ? 'register-confirm-password-error' : 'register-confirm-password-hint'}
                placeholder="Re-type your password"
                className={`w-full px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 ${
                  confirmPasswordError
                    ? 'border-red-500 focus:ring-red-200'
                    : 'border-slate-300 dark:border-slate-700 focus:border-[#1749E8] focus:ring-blue-200'
                }`}
              />
              {confirmPasswordError ? (
                <p id="register-confirm-password-error" role="alert" className="text-xs font-bold text-red-600 dark:text-red-400 mt-1">
                  {confirmPasswordError}
                </p>
              ) : (
                <p id="register-confirm-password-hint" className="text-xs text-[#53627A] dark:text-slate-400 mt-1">
                  Both passwords must match exactly.
                </p>
              )}
            </div>

            {/* PwD Category & Accommodation Settings */}
            <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/80 border-2 border-[#D9E1EF] dark:border-slate-700 space-y-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#1749E8] dark:text-blue-400 shrink-0" aria-hidden="true" />
                <span className="text-sm font-bold text-[#172033] dark:text-slate-100">
                  PwD Accommodations (RPwD Act 2016)
                </span>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="register-pwd-category"
                  className="block text-xs font-bold text-[#172033] dark:text-slate-300"
                >
                  PwD Category
                </label>
                <select
                  id="register-pwd-category"
                  value={formData.pwdCategory}
                  onChange={(e) => {
                    const val = e.target.value;
                    const autoScribe = val === 'Visually Impaired' || val === 'Cerebral Palsy';
                    setFormData({ ...formData, pwdCategory: val, needScribe: autoScribe });
                    formDataRef.current = { ...formDataRef.current, pwdCategory: val, needScribe: autoScribe };
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1749E8]"
                >
                  <option value="Visually Impaired">Visually Impaired (Blind / Low Vision)</option>
                  <option value="Locomotor Disability">Locomotor Disability</option>
                  <option value="Hearing Impaired">Hearing Impaired</option>
                  <option value="Cerebral Palsy">Cerebral Palsy</option>
                  <option value="Other Disability">Other Recognized Disability</option>
                  <option value="None">None (Standard Candidate)</option>
                </select>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <input
                  id="register-scribe-checkbox"
                  type="checkbox"
                  checked={formData.needScribe}
                  onChange={(e) => {
                    setFormData({ ...formData, needScribe: e.target.checked });
                    formDataRef.current = { ...formDataRef.current, needScribe: e.target.checked };
                  }}
                  className="w-4 h-4 rounded text-[#1749E8] focus:ring-2 focus:ring-[#1749E8] border-slate-300"
                />
                <label
                  htmlFor="register-scribe-checkbox"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  I require compensatory time and AI tutor / voice scribe support
                </label>
              </div>
            </div>

            {/* Audio CAPTCHA Controls */}
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
            />

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[50px] px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-[#1749E8] hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all shadow-md inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                    <span>Creating your account...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" aria-hidden="true" />
                    <span>Create Accessible Candidate Account</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
            <p className="text-sm text-[#53627A] dark:text-slate-300">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigateTo('login')}
                className="font-bold text-[#1749E8] dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-[#1749E8] rounded"
              >
                Sign In with Voice or Keyboard
              </button>
            </p>
          </div>
        </div>
      </AuthenticationCard>
    </AuthenticationLayout>
  );
}
