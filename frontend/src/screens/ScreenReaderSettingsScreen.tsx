import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAccessibility } from '../context/AccessibilityContext.tsx';
import { AudioToolbar } from '../components/AudioToolbar.tsx';
import {
  Volume2,
  Volume1,
  Headphones,
  Play,
  Pause,
  Square,
  RotateCcw,
  Check,
  Save,
  Globe,
  Sliders,
  Sparkles,
  VolumeX,
  Radio,
  BookOpen,
  ArrowRight,
  Mic,
  HelpCircle
} from 'lucide-react';

export const SCREEN_READER_VOICE_GUIDE =
  'Welcome to Screen Reader Settings. You can control every button and audio parameter on this page using your voice. ' +
  'To adjust speech rate, say: "Set speech speed to 1.5x", "Speed 2x", "Speed 0.5x", "Faster speech", or "Slower speech". ' +
  'To adjust voice pitch, say: "Set pitch to 1.2", "Higher pitch", "Lower pitch", or "Normal pitch". ' +
  'To adjust speech volume, say: "Set volume to 80 percent" or "Volume 100". ' +
  'To test audio playback, say: "Test voice" or "Play test". ' +
  'To save your preferences, say: "Save preferences" or "Save settings". ' +
  'To reset all speech settings to defaults, say: "Restore defaults". ' +
  'To toggle automatic question reading, say: "Toggle question reading". ' +
  'To toggle automatic option reading, say: "Toggle option reading". ' +
  'To switch to visual and font settings, say: "Open accessibility settings". ' +
  'Say "Stop" at any time to silence speech, or say "Read voice commands" to hear this guide again.';

export function ScreenReaderSettingsScreen() {
  const {
    settings,
    updateSettings,
    speakText,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    isSpeaking,
    isPausedSpeaking,
    announce,
    activeAnnouncement,
    navigateTo,
    registerVoiceHandler,
    isBlindMode,
    toggleBlindMode,
    isVisionAssistantActive,
    activateVisionAssistant,
    deactivateVisionAssistant,
    micPermissionStatus,
    isVoiceListening
  } = useAccessibility();

  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(settings.voiceURI || 'default');
  const [rate, setRate] = useState<number>(settings.speechRate || 1.0);
  const [pitch, setPitch] = useState<number>(settings.speechPitch || 1.0);
  const [volume, setVolume] = useState<number>(settings.speechVolume ?? 1.0);
  const [recognitionLang, setRecognitionLang] = useState<string>(settings.recognitionLang || 'en-IN');
  const hasAnnouncedIntroRef = useRef<boolean>(false);

  // Initialize intro state without auto-blasting speech
  useEffect(() => {
    if (!hasAnnouncedIntroRef.current) {
      hasAnnouncedIntroRef.current = true;
    }
  }, []);

  // Audio Reading Preferences
  const [autoReadAloud, setAutoReadAloud] = useState<boolean>(Boolean(settings.autoReadAloud));
  const [readQuestionAutomatically, setReadQuestionAutomatically] = useState<boolean>(
    settings.readQuestionAutomatically ?? true
  );
  const [readOptionsAutomatically, setReadOptionsAutomatically] = useState<boolean>(
    settings.readOptionsAutomatically ?? true
  );
  const [autoAnnouncements, setAutoAnnouncements] = useState<boolean>(
    settings.autoAnnouncements ?? true
  );

  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Load available browser speech synthesis voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setBrowserVoices(voices);
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Filter voices by selected language, prioritizing English voices
  const filteredVoices = useMemo(() => {
    let list = browserVoices;
    if (selectedLanguage !== 'all') {
      list = browserVoices.filter((v) => v.lang.toLowerCase().startsWith(selectedLanguage.toLowerCase()));
    }
    // Sort prioritizing English voices (en-IN highest, then other en, then others)
    return [...list].sort((a, b) => {
      const aLang = a.lang.toLowerCase();
      const bLang = b.lang.toLowerCase();
      const aScore = aLang.startsWith('en-in') ? 3 : aLang.startsWith('en') ? 2 : 1;
      const bScore = bLang.startsWith('en-in') ? 3 : bLang.startsWith('en') ? 2 : 1;
      return bScore - aScore;
    });
  }, [browserVoices, selectedLanguage]);

  // Unique languages available among voices
  const availableLanguages = useMemo(() => {
    const langs = new Set<string>();
    browserVoices.forEach((v) => {
      const prefix = v.lang.split('-')[0].toLowerCase();
      if (prefix) langs.add(prefix);
    });
    return Array.from(langs).sort();
  }, [browserVoices]);

  // Rate preset options: 0.5x, 1x, 1.5x, 2x, 2.5x, 3x (RPwD Compliant)
  const ratePresets = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0];

  const handleRateSelect = (newRate: number) => {
    setRate(newRate);
    updateSettings({ speechRate: newRate });
    const msg = `Speech rate set to ${newRate}x speed.`;
    announce(msg, 'polite');
    speakText(msg);
  };

  const handlePitchChange = (newPitch: number) => {
    setPitch(newPitch);
    updateSettings({ speechPitch: newPitch });
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    updateSettings({ speechVolume: newVol });
  };

  const handleVoiceSelect = (uri: string) => {
    setSelectedVoiceURI(uri);
    updateSettings({ voiceURI: uri });
    const voiceObj = browserVoices.find((v) => v.voiceURI === uri);
    const voiceName = voiceObj ? `${voiceObj.name} (${voiceObj.lang})` : 'System Default';
    const msg = `Voice changed to ${voiceName}.`;
    announce(msg, 'polite');
    speakText(msg);
  };

  const handleTestVoice = () => {
    const testPhrase =
      'This is a test of your accessible SSC MTS screen reader configuration. General Awareness, Reasoning Ability, and Mathematical questions will be announced in this voice.';
    announce('Playing voice sample test.', 'polite');
    speakText(testPhrase);
  };

  const handleRepeatLast = () => {
    if (activeAnnouncement?.message) {
      announce(`Repeating: ${activeAnnouncement.message}`, 'assertive');
      speakText(activeAnnouncement.message);
    } else {
      const fallback = 'No previous announcement found. Screen reader is operational.';
      announce(fallback, 'polite');
      speakText(fallback);
    }
  };

  const handleResetDefaults = () => {
    setRate(1.0);
    setPitch(1.0);
    setVolume(1.0);
    setRecognitionLang('en-IN');
    setSelectedVoiceURI('default');
    setAutoReadAloud(false);
    setReadQuestionAutomatically(true);
    setReadOptionsAutomatically(true);
    setAutoAnnouncements(true);

    updateSettings({
      speechRate: 1.0,
      speechPitch: 1.0,
      speechVolume: 1.0,
      recognitionLang: 'en-IN',
      voiceURI: 'default',
      autoReadAloud: false,
      readQuestionAutomatically: true,
      readOptionsAutomatically: true,
      autoAnnouncements: true
    });

    const msg = 'Screen reader settings reset to default values.';
    announce(msg, 'assertive');
    speakText(msg);
  };

  const handleSavePreferences = () => {
    updateSettings({
      speechRate: rate,
      speechPitch: pitch,
      speechVolume: volume,
      recognitionLang,
      voiceURI: selectedVoiceURI,
      autoReadAloud,
      readQuestionAutomatically,
      readOptionsAutomatically,
      autoAnnouncements
    });

    const msg = 'Screen reader preferences saved successfully. Settings applied globally.';
    setSaveSuccessMessage(msg);
    announce(msg, 'assertive');
    speakText(msg);

    setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 4000);
  };

  // Register screen-specific voice commands (Section 4 & 5)
  useEffect(() => {
    if (!registerVoiceHandler) return;
    const unregister = registerVoiceHandler((rawTranscript: string) => {
      const clean = rawTranscript.toLowerCase().trim();

      // Rate voice command: "set speech speed to 1.5x", "set speed to 3x", "speed 2x"
      const rateMatch = clean.match(/(?:set\s+)?(?:speech\s+)?(?:speed|rate)(?:\s+to)?\s+([0-9]+(?:\.[0-9]+)?)\s*x?/i);
      if (rateMatch && rateMatch[1]) {
        const val = parseFloat(rateMatch[1]);
        if (!isNaN(val) && val >= 0.25 && val <= 4.0) {
          handleRateSelect(val);
          return true;
        }
      }

      // Standalone rate match "2x speed", "1.5x"
      const suffixRateMatch = clean.match(/^([0-9]+(?:\.[0-9]+)?)\s*x\s*(?:speed|rate)?$/i);
      if (suffixRateMatch && suffixRateMatch[1]) {
        const val = parseFloat(suffixRateMatch[1]);
        if (!isNaN(val) && val >= 0.25 && val <= 4.0) {
          handleRateSelect(val);
          return true;
        }
      }

      // Pitch voice command: "set pitch to 1.2"
      const pitchMatch = clean.match(/(?:set\s+)?(?:speech\s+)?pitch(?:\s+to)?\s+([0-9]+(?:\.[0-9]+)?)/i);
      if (pitchMatch && pitchMatch[1]) {
        const val = parseFloat(pitchMatch[1]);
        if (!isNaN(val) && val >= 0.4 && val <= 2.2) {
          handlePitchChange(val);
          const msg = `Speech pitch set to ${val}.`;
          announce(msg, 'polite');
          speakText(msg);
          return true;
        }
      }

      // Volume voice command: "set volume to 80%", "volume 100", "set speech volume to 50"
      const volMatch = clean.match(/(?:set\s+)?(?:speech\s+)?volume(?:\s+to)?\s+([0-9]+)\s*%?/i);
      if (volMatch && volMatch[1]) {
        let val = parseFloat(volMatch[1]);
        if (val > 1.0) val = val / 100;
        if (!isNaN(val) && val >= 0.0 && val <= 1.0) {
          handleVolumeChange(val);
          const msg = `Speech volume set to ${Math.round(val * 100)} percent.`;
          announce(msg, 'polite');
          speakText(msg);
          return true;
        }
      }

      // Faster / Slower speech aliases
      if (clean === 'faster speech' || clean === 'increase speed' || clean === 'read faster' || clean === 'speed up') {
        const nextRate = Math.min(3.0, Number((rate + 0.25).toFixed(2)));
        handleRateSelect(nextRate);
        return true;
      }
      if (clean === 'slower speech' || clean === 'decrease speed' || clean === 'read slower' || clean === 'slow down') {
        const nextRate = Math.max(0.5, Number((rate - 0.25).toFixed(2)));
        handleRateSelect(nextRate);
        return true;
      }

      // Higher / Lower pitch aliases
      if (clean === 'higher pitch' || clean === 'increase pitch') {
        const newPitch = Math.min(1.5, Number((pitch + 0.1).toFixed(1)));
        handlePitchChange(newPitch);
        const msg = `Speech pitch increased to ${newPitch}.`;
        announce(msg, 'polite');
        speakText(msg);
        return true;
      }
      if (clean === 'lower pitch' || clean === 'decrease pitch') {
        const newPitch = Math.max(0.5, Number((pitch - 0.1).toFixed(1)));
        handlePitchChange(newPitch);
        const msg = `Speech pitch decreased to ${newPitch}.`;
        announce(msg, 'polite');
        speakText(msg);
        return true;
      }
      if (clean === 'normal pitch' || clean === 'reset pitch') {
        handlePitchChange(1.0);
        const msg = `Speech pitch reset to normal 1.0.`;
        announce(msg, 'polite');
        speakText(msg);
        return true;
      }

      // Question Auto-Reading Toggle
      if (
        clean === 'toggle question reading' ||
        clean === 'read questions automatically' ||
        clean === 'dont read questions automatically' ||
        clean === 'do not read questions automatically' ||
        clean === 'auto read questions on' ||
        clean === 'auto read questions off'
      ) {
        const nextVal = clean.includes('off') || clean.includes('dont') || clean.includes('do not') ? false : clean.includes('on') ? true : !readQuestionAutomatically;
        setReadQuestionAutomatically(nextVal);
        updateSettings({ readQuestionAutomatically: nextVal });
        const msg = `Automatic question reading ${nextVal ? 'enabled' : 'disabled'}.`;
        announce(msg, 'polite');
        speakText(msg);
        return true;
      }

      // Option Auto-Reading Toggle
      if (
        clean === 'toggle option reading' ||
        clean === 'read options automatically' ||
        clean === 'dont read options automatically' ||
        clean === 'do not read options automatically' ||
        clean === 'auto read options on' ||
        clean === 'auto read options off'
      ) {
        const nextVal = clean.includes('off') || clean.includes('dont') || clean.includes('do not') ? false : clean.includes('on') ? true : !readOptionsAutomatically;
        setReadOptionsAutomatically(nextVal);
        updateSettings({ readOptionsAutomatically: nextVal });
        const msg = `Automatic option reading ${nextVal ? 'enabled' : 'disabled'}.`;
        announce(msg, 'polite');
        speakText(msg);
        return true;
      }

      // Read Voice Commands & Guidance (Aloud for Blind Candidates)
      if (
        clean === 'read voice commands' ||
        clean === 'voice commands' ||
        clean === 'read commands' ||
        clean === 'explain page' ||
        clean === 'explain this page' ||
        clean === 'help' ||
        clean === 'what can i say' ||
        clean === 'list commands' ||
        clean === 'read instructions' ||
        clean === 'voice instructions' ||
        clean === 'voice guide'
      ) {
        announce(SCREEN_READER_VOICE_GUIDE, 'polite');
        speakText(SCREEN_READER_VOICE_GUIDE);
        return true;
      }

      // Quick Switch to Visual Accessibility Settings
      if (
        clean === 'open accessibility settings' ||
        clean === 'go to accessibility settings' ||
        clean === 'accessibility settings' ||
        clean === 'visual settings' ||
        clean === 'contrast settings' ||
        clean === 'font settings' ||
        clean === 'font face settings' ||
        clean === 'theme settings'
      ) {
        navigateTo('accessibility_settings');
        return true;
      }

      // Test voice
      if (clean === 'test voice' || clean === 'test speech' || clean === 'play test' || clean === 'sample voice') {
        handleTestVoice();
        return true;
      }

      // Reset defaults
      if (clean === 'restore defaults' || clean === 'restore default settings' || clean === 'reset defaults' || clean === 'reset settings') {
        handleResetDefaults();
        return true;
      }

      // Save preferences
      if (clean === 'save preferences' || clean === 'save settings' || clean === 'save') {
        handleSavePreferences();
        return true;
      }

      // Stop speech
      if (clean === 'stop speaking' || clean === 'stop' || clean === 'silence') {
        stopSpeaking();
        return true;
      }

      // Pause speech
      if (clean === 'pause speaking' || clean === 'pause') {
        pauseSpeaking();
        return true;
      }

      // Resume speech
      if (clean === 'resume speaking' || clean === 'resume') {
        resumeSpeaking();
        return true;
      }

      return false;
    });

    return () => {
      unregister();
    };
  }, [
    registerVoiceHandler,
    handleRateSelect,
    handlePitchChange,
    handleTestVoice,
    handleResetDefaults,
    handleSavePreferences,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    announce,
    speakText,
    navigateTo,
    rate,
    pitch,
    readQuestionAutomatically,
    readOptionsAutomatically,
    updateSettings
  ]);

  const pageInstructionText =
    'Dedicated Screen Reader Settings page. Adjust speech rate between 0.5x and 3.0x, customize voice pitch, choose your preferred browser voice model, configure automatic question and option reading, and test audio playback.';

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-8" id="main-content">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#D9E1EF]">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#EEF4FF] text-[#1749E8] text-xs font-bold border border-[#D9E1EF] mb-2">
            <Headphones className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Screen 18 of 18</span>
            <span>·</span>
            <span>Screen Reader Settings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172033] tracking-tight">
            Screen Reader &amp; Voice Configuration
          </h1>
          <p className="text-xs sm:text-sm text-[#53627A] mt-1 max-w-2xl">
            Dedicated speech synthesis rate, voice model, pitch control, and question reading preferences. Configured speech parameters apply globally across all test sessions and mock exams.
          </p>
        </div>

        <div className="shrink-0">
          <AudioToolbar textToRead={pageInstructionText} label="Listen to screen reader settings instructions" />
        </div>
      </div>

      {/* Save Success Banner */}
      {saveSuccessMessage && (
        <div
          role="status"
          aria-live="polite"
          className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-3 shadow-xs animate-fade-in"
        >
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-bold">{saveSuccessMessage}</p>
        </div>
      )}

      {/* Dedicated Voice Controls & Spoken Guidance Banner (WCAG AAA & Blind-First Voice Accessible) */}
      <section
        aria-labelledby="sr-voice-control-heading"
        className="p-5 bg-gradient-to-r from-blue-50 via-indigo-50/40 to-blue-50 rounded-2xl border-2 border-[#1749E8]/40 shadow-sm"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D9E1EF]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1749E8] text-white flex items-center justify-center shadow-sm">
              <Mic className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="sr-voice-control-heading" className="text-base font-extrabold text-[#172033]">
                  Voice Controls &amp; Spoken Audio Commands
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1749E8] text-white">
                  Hands-Free Voice Active
                </span>
              </div>
              <p className="text-xs text-[#53627A]">
                Blind candidates can say any command listed below to adjust speech speed, pitch, volume, test playback, and save preferences.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                announce(SCREEN_READER_VOICE_GUIDE, 'polite');
                speakText(SCREEN_READER_VOICE_GUIDE);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#1749E8] hover:bg-[#123BB8] text-white text-xs font-bold rounded-lg shadow-sm focus:ring-2 focus:ring-[#1749E8] transition-colors"
              aria-label="Read screen reader voice commands guide aloud"
            >
              <Volume2 className="w-4 h-4" />
              <span>Listen to Voice Guide Aloud</span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo('accessibility_settings')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F8F9FB] text-[#1749E8] text-xs font-bold rounded-lg border border-[#D9E1EF] transition-colors"
              aria-label="Switch to Visual and Font Accessibility Settings"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Visual &amp; Font Settings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Categorized Spoken Commands Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-4 text-xs">
          <div className="p-3 bg-white rounded-xl border border-[#D9E1EF] space-y-1.5">
            <div className="font-bold text-[#172033] flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-[#1749E8]" />
              <span>Speech Speed &amp; Rate</span>
            </div>
            <p className="text-[11px] text-[#53627A]">Say any speed command:</p>
            <div className="flex flex-wrap gap-1 font-mono text-[10px]">
              <span className="px-2 py-0.5 bg-blue-50 text-[#1749E8] border border-blue-200 rounded font-bold">Say: &ldquo;Speed 1.5x&rdquo;</span>
              <span className="px-2 py-0.5 bg-blue-50 text-[#1749E8] border border-blue-200 rounded font-bold">Say: &ldquo;Speed 2x&rdquo;</span>
              <span className="px-2 py-0.5 bg-blue-50 text-[#1749E8] border border-blue-200 rounded font-bold">Say: &ldquo;Faster speech&rdquo;</span>
              <span className="px-2 py-0.5 bg-blue-50 text-[#1749E8] border border-blue-200 rounded font-bold">Say: &ldquo;Slower speech&rdquo;</span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-[#D9E1EF] space-y-1.5">
            <div className="font-bold text-[#172033] flex items-center gap-1.5">
              <Headphones className="w-3.5 h-3.5 text-[#1749E8]" />
              <span>Pitch, Volume &amp; Testing</span>
            </div>
            <p className="text-[11px] text-[#53627A]">Tone &amp; test controls:</p>
            <div className="flex flex-wrap gap-1 font-mono text-[10px]">
              <span className="px-2 py-0.5 bg-blue-50 text-[#1749E8] border border-blue-200 rounded font-bold">Say: &ldquo;Set pitch to 1.2&rdquo;</span>
              <span className="px-2 py-0.5 bg-blue-50 text-[#1749E8] border border-blue-200 rounded font-bold">Say: &ldquo;Set volume to 80 percent&rdquo;</span>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-bold">Say: &ldquo;Test voice&rdquo;</span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-[#D9E1EF] space-y-1.5">
            <div className="font-bold text-[#172033] flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#1749E8]" />
              <span>Saving, Reading &amp; Defaults</span>
            </div>
            <p className="text-[11px] text-[#53627A]">Save or toggle reading:</p>
            <div className="flex flex-wrap gap-1 font-mono text-[10px]">
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-bold">Say: &ldquo;Save preferences&rdquo;</span>
              <span className="px-2 py-0.5 bg-blue-50 text-[#1749E8] border border-blue-200 rounded font-bold">Say: &ldquo;Toggle question reading&rdquo;</span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-300 rounded font-bold">Say: &ldquo;Restore defaults&rdquo;</span>
              <span className="px-2 py-0.5 bg-red-50 text-red-800 border border-red-200 rounded font-bold">Say: &ldquo;Stop&rdquo;</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Audio Playback Control Bar */}
      <section
        aria-labelledby="audio-controls-heading"
        className="p-5 bg-white rounded-2xl border border-[#D9E1EF] shadow-xs space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 id="audio-controls-heading" className="text-sm font-extrabold text-[#172033] uppercase tracking-wider">
              Speech Controls &amp; Audio Actions
            </h2>
            <p className="text-xs text-[#53627A]">
              Test voice output, pause or resume active speech, repeat last announcement, or stop speech immediately.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Test Voice */}
            <button
              type="button"
              onClick={handleTestVoice}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1749E8] text-white text-xs font-bold hover:bg-[#123BB8] transition-colors focus:ring-2 focus:ring-[#1749E8] focus:outline-none"
              aria-label="Test current screen reader voice. Voice command: Say 'Test voice'"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Test Voice</span>
              <span className="text-[9px] font-mono font-bold bg-white/20 px-1.5 py-0.5 rounded ml-1">Say: &ldquo;Test voice&rdquo;</span>
            </button>

            {/* Repeat Last Announcement */}
            <button
              type="button"
              onClick={handleRepeatLast}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#EEF4FF] text-[#1749E8] text-xs font-bold border border-[#D9E1EF] hover:bg-[#E0EBFF] transition-colors focus:ring-2 focus:ring-[#1749E8] focus:outline-none"
              aria-label="Repeat last screen reader announcement. Voice command: Say 'Repeat'"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Repeat Last</span>
              <span className="text-[9px] font-mono font-bold bg-[#1749E8]/10 text-[#1749E8] px-1.5 py-0.5 rounded ml-1">Say: &ldquo;Repeat&rdquo;</span>
            </button>

            {/* Pause / Resume */}
            {isSpeaking && !isPausedSpeaking && (
              <button
                type="button"
                onClick={pauseSpeaking}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 text-amber-800 text-xs font-bold border border-amber-300 hover:bg-amber-100 transition-colors focus:ring-2 focus:ring-amber-500 focus:outline-none"
                aria-label="Pause speech"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>
            )}

            {isPausedSpeaking && (
              <button
                type="button"
                onClick={resumeSpeaking}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-300 hover:bg-emerald-100 transition-colors focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                aria-label="Resume speech"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Resume</span>
              </button>
            )}

            {/* Stop Speaking */}
            <button
              type="button"
              onClick={stopSpeaking}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-bold border border-red-200 hover:bg-red-100 transition-colors focus:ring-2 focus:ring-red-500 focus:outline-none"
              aria-label="Stop speaking immediately. Voice command: Say 'Stop'"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Stop Speech</span>
              <span className="text-[9px] font-mono font-bold bg-red-200 text-red-900 px-1.5 py-0.5 rounded ml-1">Say: &ldquo;Stop&rdquo;</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. Speech Rate Control Section */}
      <section
        aria-labelledby="speech-rate-heading"
        className="p-6 bg-white rounded-2xl border border-[#D9E1EF] shadow-xs space-y-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-[#1749E8]" />
              <h2 id="speech-rate-heading" className="text-base font-bold text-[#172033]">
                1. Speech Rate (Playback Speed)
              </h2>
            </div>
            <p className="text-xs text-[#53627A] mt-1">
              Select standard reading speed from 0.5x to 3.0x. Higher rates (1.5x–2.0x) are recommended for proficient screen-reader users.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-[#EEF4FF] text-[#1749E8] font-bold text-xs shrink-0">
            Current: {rate}x
          </span>
        </div>

        {/* Preset Chips */}
        <div>
          <label className="block text-xs font-bold text-[#53627A] uppercase tracking-wider mb-2">
            Speed Presets:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {ratePresets.map((preset) => {
              const isActive = rate === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleRateSelect(preset)}
                  className={`p-3 rounded-xl border-2 text-center font-bold text-sm transition-all focus:ring-2 focus:ring-[#1749E8] focus:outline-none ${
                    isActive
                      ? 'border-[#1749E8] bg-[#EEF4FF] text-[#1749E8] shadow-xs'
                      : 'border-[#D9E1EF] text-[#172033] hover:border-[#1749E8]/40 hover:bg-[#F8F9FB]'
                  }`}
                  aria-pressed={isActive}
                  aria-label={`Set speech rate to ${preset}x speed. Voice command: Say 'Speed ${preset}x'`}
                >
                  <div>{preset}x</div>
                  <div className="text-[9px] font-mono font-bold text-[#1749E8]">
                    Say: &ldquo;Speed {preset}x&rdquo;
                  </div>
                  <span className="text-[10px] font-normal text-[#53627A]">
                    {preset === 0.5 ? 'Slow' : preset === 1.0 ? 'Normal' : preset === 1.5 ? 'Fast' : preset === 2.0 ? 'Very Fast' : 'Max'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fine Tuning Slider */}
        <div className="pt-2">
          <div className="flex justify-between items-center text-xs text-[#53627A] mb-1.5 font-bold">
            <span>Fine-Tune Speed:</span>
            <span>{rate.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="3.0"
            step="0.05"
            value={rate}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setRate(val);
              updateSettings({ speechRate: val });
            }}
            className="w-full accent-[#1749E8] cursor-pointer"
            aria-label="Fine tune speech rate slider from 0.5 to 3.0"
          />
          <div className="flex justify-between text-[10px] text-[#53627A] mt-1 font-mono">
            <span>0.5x</span>
            <span>1.0x (Default)</span>
            <span>2.0x</span>
            <span>3.0x</span>
          </div>
        </div>
      </section>

      {/* 4. Pitch Adjustment Section */}
      <section
        aria-labelledby="pitch-heading"
        className="p-6 bg-white rounded-2xl border border-[#D9E1EF] shadow-xs space-y-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#1749E8]" />
              <h2 id="pitch-heading" className="text-base font-bold text-[#172033]">
                2. Voice Pitch Adjustment
              </h2>
            </div>
            <p className="text-xs text-[#53627A] mt-1">
              Adjust speech frequency between 0.5 (deep/low) and 1.5 (high/sharp) to match hearing preferences and acoustics.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-[#EEF4FF] text-[#1749E8] font-bold text-xs shrink-0">
            Pitch: {pitch.toFixed(1)}
          </span>
        </div>

        <div>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            value={pitch}
            onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
            className="w-full accent-[#1749E8] cursor-pointer"
            aria-label="Adjust voice pitch from 0.5 to 1.5"
          />
          <div className="flex justify-between text-[10px] text-[#53627A] mt-1 font-mono">
            <span>0.5 (Lower Tone)</span>
            <span>1.0 (Natural Pitch)</span>
            <span>1.5 (Higher Tone)</span>
          </div>
        </div>
      </section>

      {/* 4B. Speech Volume Control Section */}
      <section
        aria-labelledby="volume-heading"
        className="p-6 bg-white rounded-2xl border border-[#D9E1EF] shadow-xs space-y-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-[#1749E8]" />
              <h2 id="volume-heading" className="text-base font-bold text-[#172033]">
                3. Speech Output Volume
              </h2>
            </div>
            <p className="text-xs text-[#53627A] mt-1">
              Adjust speech playback volume between 10% and 100% (full volume).
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-[#EEF4FF] text-[#1749E8] font-bold text-xs shrink-0">
            Volume: {Math.round(volume * 100)}%
          </span>
        </div>

        <div className="space-y-3">
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full accent-[#1749E8] cursor-pointer"
            aria-label="Adjust speech volume from 10% to 100%"
          />
          <div className="flex justify-between text-[10px] text-[#53627A] font-mono">
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100% (Default)</span>
          </div>
        </div>
      </section>

      {/* 5. Browser Voice Selection Section */}
      <section
        aria-labelledby="voice-selection-heading"
        className="p-6 bg-white rounded-2xl border border-[#D9E1EF] shadow-xs space-y-5"
      >
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#1749E8]" />
            <h2 id="voice-selection-heading" className="text-base font-bold text-[#172033]">
              3. Browser Voice Model &amp; Language
            </h2>
          </div>
          <p className="text-xs text-[#53627A] mt-1">
            Choose from the installed speech synthesis voice engines available on your system. Indian English (en-IN) voices provide optimal pronunciation of Indian names and terms.
          </p>
        </div>

        {/* Language Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label htmlFor="language-filter" className="text-xs font-bold text-[#53627A] shrink-0">
            Filter by Language:
          </label>
          <select
            id="language-filter"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#D9E1EF] text-xs font-semibold text-[#172033] bg-[#F8F9FB] focus:ring-2 focus:ring-[#1749E8] focus:outline-none"
          >
            <option value="all">All Available Languages ({browserVoices.length} voices)</option>
            <option value="en">English (All Accents)</option>
            <option value="en-in">English (India)</option>
            <option value="hi">Hindi</option>
            {availableLanguages
              .filter((l) => l !== 'en' && l !== 'hi')
              .map((l) => (
                <option key={l} value={l}>
                  {l.toUpperCase()}
                </option>
              ))}
          </select>
        </div>

        {/* Voice Selection Dropdown */}
        <div className="space-y-2">
          <label htmlFor="voice-select" className="text-xs font-bold text-[#53627A]">
            Selected Voice Model:
          </label>
          <select
            id="voice-select"
            value={selectedVoiceURI}
            onChange={(e) => handleVoiceSelect(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9E1EF] text-xs font-semibold text-[#172033] bg-white focus:ring-2 focus:ring-[#1749E8] focus:outline-none"
          >
            <option value="default">System Default Voice</option>
            {filteredVoices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} — {v.lang} {v.default ? '(Default)' : ''} {v.localService ? '(Local)' : '(Cloud)'}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* 6. Reading Preferences Section */}
      <section
        aria-labelledby="reading-preferences-heading"
        className="p-6 bg-white rounded-2xl border border-[#D9E1EF] shadow-xs space-y-4"
      >
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#1749E8]" />
            <h2 id="reading-preferences-heading" className="text-base font-bold text-[#172033]">
              4. Question &amp; Exam Reading Preferences
            </h2>
          </div>
          <p className="text-xs text-[#53627A] mt-1">
            Configure how questions and answers are presented during Practice Sessions, Mock Exams, and Pilot Demo tests.
          </p>
        </div>

        <div className="space-y-3 pt-1">
          {/* Read question text automatically */}
          <label className="p-3.5 rounded-xl border border-[#D9E1EF] flex items-center justify-between gap-3 cursor-pointer hover:bg-[#F8F9FB] transition-colors">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#172033] block">
                  Auto-Read Question Text
                </span>
                <span className="text-[10px] font-mono font-bold text-[#1749E8] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                  Say: &ldquo;Toggle question reading&rdquo;
                </span>
              </div>
              <span className="text-[11px] text-[#53627A]">
                Automatically reads the question text aloud whenever navigating to a new question.
              </span>
            </div>
            <input
              type="checkbox"
              checked={readQuestionAutomatically}
              onChange={(e) => {
                setReadQuestionAutomatically(e.target.checked);
                updateSettings({ readQuestionAutomatically: e.target.checked });
              }}
              className="w-4 h-4 rounded text-[#1749E8] accent-[#1749E8] focus:ring-[#1749E8]"
            />
          </label>

          {/* Read options automatically */}
          <label className="p-3.5 rounded-xl border border-[#D9E1EF] flex items-center justify-between gap-3 cursor-pointer hover:bg-[#F8F9FB] transition-colors">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#172033] block">
                  Auto-Read Question Options (A, B, C, D)
                </span>
                <span className="text-[10px] font-mono font-bold text-[#1749E8] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                  Say: &ldquo;Toggle option reading&rdquo;
                </span>
              </div>
              <span className="text-[11px] text-[#53627A]">
                Sequentially announces all four multiple-choice options immediately following the question text.
              </span>
            </div>
            <input
              type="checkbox"
              checked={readOptionsAutomatically}
              onChange={(e) => {
                setReadOptionsAutomatically(e.target.checked);
                updateSettings({ readOptionsAutomatically: e.target.checked });
              }}
              className="w-4 h-4 rounded text-[#1749E8] accent-[#1749E8] focus:ring-[#1749E8]"
            />
          </label>

          {/* Spoken system announcements */}
          <label className="p-3.5 rounded-xl border border-[#D9E1EF] flex items-center justify-between gap-3 cursor-pointer hover:bg-[#F8F9FB] transition-colors">
            <div>
              <span className="text-xs font-bold text-[#172033] block">
                Spoken System Status Announcements
              </span>
              <span className="text-[11px] text-[#53627A]">
                Vocalizes session milestones, compensatory timer warnings (5-minute reminder), and section transitions.
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoAnnouncements}
              onChange={(e) => {
                setAutoAnnouncements(e.target.checked);
                updateSettings({ autoAnnouncements: e.target.checked });
              }}
              className="w-4 h-4 rounded text-[#1749E8] accent-[#1749E8] focus:ring-[#1749E8]"
            />
          </label>

          {/* Screen read-aloud toggle */}
          <label className="p-3.5 rounded-xl border border-[#D9E1EF] flex items-center justify-between gap-3 cursor-pointer hover:bg-[#F8F9FB] transition-colors">
            <div>
              <span className="text-xs font-bold text-[#172033] block">
                Read-Aloud Assistant Everywhere
              </span>
              <span className="text-[11px] text-[#53627A]">
                Automatically reads the overview summary whenever landing on any portal screen.
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoReadAloud}
              onChange={(e) => {
                setAutoReadAloud(e.target.checked);
                updateSettings({ autoReadAloud: e.target.checked });
              }}
              className="w-4 h-4 rounded text-[#1749E8] accent-[#1749E8] focus:ring-[#1749E8]"
            />
          </label>
        </div>
      </section>

      {/* 6B. Wake-Word & Speech Recognition Preferences */}
      <section
        aria-labelledby="wake-word-heading"
        className="p-6 bg-white rounded-2xl border border-[#D9E1EF] shadow-xs space-y-5"
      >
        <div>
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-[#1749E8]" />
            <h2 id="wake-word-heading" className="text-base font-bold text-[#172033]">
              5. Wake-Word &amp; Voice Recognition Preferences
            </h2>
          </div>
          <p className="text-xs text-[#53627A] mt-1">
            Configure the &ldquo;Hey Vision&rdquo; voice assistant standby trigger, microphone status, and speech recognition language.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Wake-Word Standby Card */}
          <div className="p-4 rounded-xl border border-[#D9E1EF] bg-[#F8FAFC] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#172033]">Wake-Word Standby</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isBlindMode ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
              }`}>
                {isBlindMode ? 'Standby Armed' : 'Disabled'}
              </span>
            </div>
            <p className="text-[11px] text-[#53627A]">
              Say <strong className="text-[#1749E8] font-mono">&ldquo;Hey Vision&rdquo;</strong> to activate the assistant without pressing any button.
            </p>
            <button
              type="button"
              onClick={toggleBlindMode}
              className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-colors ${
                isBlindMode
                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                  : 'bg-[#1749E8] text-white border-[#123BB8] hover:bg-[#123BB8]'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>{isBlindMode ? 'Deactivate Vision Mode' : 'Enable Vision Mode'}</span>
            </button>
          </div>

          {/* Microphone & Recognition Language */}
          <div className="p-4 rounded-xl border border-[#D9E1EF] bg-[#F8FAFC] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#172033]">Microphone Status</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                micPermissionStatus === 'granted'
                  ? 'bg-emerald-100 text-emerald-800'
                  : micPermissionStatus === 'denied'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {micPermissionStatus === 'granted' ? 'Microphone Active' : micPermissionStatus === 'denied' ? 'Permission Denied' : 'Ready on Prompt'}
              </span>
            </div>
            <label htmlFor="rec-lang-select" className="block text-[11px] font-bold text-[#53627A] pt-1">
              Voice Recognition Language:
            </label>
            <select
              id="rec-lang-select"
              value={recognitionLang}
              onChange={(e) => {
                setRecognitionLang(e.target.value);
                updateSettings({ recognitionLang: e.target.value });
                const msg = `Speech recognition language set to ${e.target.value}`;
                announce(msg, 'polite');
              }}
              className="w-full px-3 py-1.5 rounded-lg border border-[#D9E1EF] text-xs font-semibold text-[#172033] bg-white focus:ring-2 focus:ring-[#1749E8] focus:outline-none"
            >
              <option value="en-IN">English (India) — en-IN (Recommended for SSC MTS)</option>
              <option value="en-US">English (United States) — en-US</option>
              <option value="en-GB">English (United Kingdom) — en-GB</option>
              <option value="hi-IN">Hindi (India) — hi-IN</option>
            </select>
          </div>
        </div>
      </section>

      {/* 7. Action Footer: Save Preferences & Reset */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#D9E1EF]">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSavePreferences}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1749E8] text-white font-bold text-xs hover:bg-[#123BB8] transition-colors focus:ring-2 focus:ring-[#1749E8] focus:outline-none shadow-xs"
            aria-label="Save preferences. Voice command: Say 'Save preferences'"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
            <span className="text-[9px] font-mono font-bold bg-white/20 px-1.5 py-0.5 rounded">Say: &ldquo;Save preferences&rdquo;</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#53627A] font-bold text-xs border border-[#D9E1EF] hover:bg-[#F8F9FB] transition-colors focus:ring-2 focus:ring-[#1749E8] focus:outline-none"
            aria-label="Reset to default settings. Voice command: Say 'Restore defaults'"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
            <span className="text-[9px] font-mono font-bold bg-slate-100 text-[#53627A] px-1.5 py-0.5 rounded">Say: &ldquo;Restore defaults&rdquo;</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigateTo('accessibility_settings')}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#1749E8] hover:underline"
          aria-label="Switch to Visual and Font Settings. Voice command: Say 'Accessibility Settings'"
        >
          <span>Visual &amp; Font Settings (Screen 13)</span>
          <span className="text-[10px] font-mono font-bold text-[#1749E8] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
            Say: &ldquo;Accessibility Settings&rdquo;
          </span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

