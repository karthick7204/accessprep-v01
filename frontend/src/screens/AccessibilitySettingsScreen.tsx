import React, { useState, useEffect, useRef } from 'react';
import { useAccessibility, FontFace, FontSize } from '../context/AccessibilityContext';
import { AudioToolbar } from '../components/AudioToolbar';
import { ScreenNavigationDisclaimer } from '../components/ScreenNavigationDisclaimer';
import {
  Sliders,
  Eye,
  Volume2,
  Type,
  Clock,
  Keyboard,
  Check,
  ShieldCheck,
  RefreshCw,
  Play,
  Pause,
  Square,
  RotateCcw,
  Mic,
  Headphones,
  Sparkles,
  HelpCircle,
  VolumeX,
  ArrowRight
} from 'lucide-react';

export const ACCESSIBILITY_VOICE_GUIDE =
  'Welcome to Accessibility Settings. You can control every button and feature on this page using your voice. ' +
  'To choose a font face, say: "System font", "Hyperlegible font", "OpenDyslexic font", "Verdana font", "Serif font", or "Monospace font". ' +
  'To scale text size, say: "Normal font", "Large font", "Extra large font", or "Maximum font". ' +
  'To toggle dyslexia-friendly typography, say: "Enable dyslexia font" or "Disable dyslexia font". ' +
  'To configure exam time accommodations, say: "Enable compensatory time" or "Disable compensatory time" for 60-minute PwD sessions. ' +
  'To test audio playback, say: "Test voice". ' +
  'To hear your active settings, say: "Read current settings". ' +
  'To reset all settings to defaults, say: "Reset defaults". ' +
  'To adjust speech rate and audio, say: "Open screen reader settings". ' +
  'Say "Stop" at any time to silence speech, or say "Read voice commands" to hear this guide again.';

export const AccessibilitySettingsScreen: React.FC = () => {
  const {
    fontFace,
    setFontFace,
    fontSize,
    setFontSize,
    dyslexiaFont,
    setDyslexiaFont,
    speechRate,
    setSpeechRate,
    compensatoryTime,
    setCompensatoryTime,
    whisperModel,
    setWhisperModel,
    settings,
    updateSettings,
    speak,
    speakText,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    isPausedSpeaking,
    isSpeaking,
    announce,
    registerVoiceHandler,
    startVoiceListening,
    navigateTo,
    isVoiceListening,
    isVisionAssistantActive,
    isBlindMode
  } = useAccessibility();

  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(settings.voiceURI || 'default');
  const [pitch, setPitch] = useState<number>(settings.speechPitch || 1.0);
  const hasAnnouncedIntroRef = useRef<boolean>(false);

  // Automatically read out the voice description on entry so blind candidates know all voice commands
  useEffect(() => {
    if (!hasAnnouncedIntroRef.current) {
      hasAnnouncedIntroRef.current = true;
      announce(ACCESSIBILITY_VOICE_GUIDE, 'polite');
      speak(ACCESSIBILITY_VOICE_GUIDE);
    }
  }, [announce, speak]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setBrowserVoices(voices);
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const speechRates = [0.5, 1.0, 1.5, 2.0, 3.0];

  const handleRateChange = (rate: number) => {
    setSpeechRate(rate);
    updateSettings({ speechRate: rate });
    const msg = `Speech rate set to ${rate}x`;
    announce(msg, 'polite');
    speak(msg);
  };

  const handleVoiceChange = (uri: string) => {
    setSelectedVoiceURI(uri);
    updateSettings({ voiceURI: uri });
    const voiceObj = browserVoices.find((v) => v.voiceURI === uri);
    const voiceName = voiceObj ? voiceObj.name : 'System Default';
    const msg = `Voice changed to ${voiceName}`;
    announce(msg, 'polite');
    speak(msg);
  };

  const handlePitchChange = (newPitch: number) => {
    setPitch(newPitch);
    updateSettings({ speechPitch: newPitch });
  };

  const handlePitchPreview = () => {
    const msg = `Pitch level set to ${pitch.toFixed(1)}`;
    announce(msg, 'polite');
    speak(msg);
  };

  const handleResetDefaults = () => {
    setSpeechRate(1.0);
    setPitch(1.0);
    setSelectedVoiceURI('default');
    updateSettings({ speechRate: 1.0, speechPitch: 1.0, voiceURI: 'default' });
    const msg = 'Screen reader settings reset to default values.';
    announce(msg, 'assertive');
    speak(msg);
  };

  const handleTestAudio = () => {
    const testMsg = 'This is a test of your accessible SSC MTS screen reader voice configuration.';
    announce(testMsg, 'polite');
    speak(testMsg);
  };

  // Register full voice command handler for all accessibility customizations
  useEffect(() => {
    const unregister = registerVoiceHandler((rawTranscript: string) => {
      const clean = rawTranscript
        .toLowerCase()
        .replace(/[^\w\s\.]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // 1. Font Face Selection
      if (
        clean.includes('system font') ||
        clean.includes('inter font') ||
        clean === 'default font' ||
        clean === 'font 1'
      ) {
        setFontFace('system');
        announce('Font face set to System Default Inter', 'polite');
        speak('Font face set to System Default Inter');
        return true;
      }

      if (
        clean.includes('hyperlegible') ||
        clean.includes('atkinson') ||
        clean === 'font 2'
      ) {
        setFontFace('hyperlegible');
        announce('Font face set to Atkinson Hyperlegible', 'polite');
        speak('Font face set to Atkinson Hyperlegible');
        return true;
      }

      if (
        clean.includes('opendyslexic') ||
        clean.includes('open dyslexic') ||
        clean === 'font 3'
      ) {
        setFontFace('opendyslexic');
        announce('Font face set to OpenDyslexic', 'polite');
        speak('Font face set to OpenDyslexic');
        return true;
      }

      if (
        clean.includes('verdana') ||
        clean === 'font 4'
      ) {
        setFontFace('verdana');
        announce('Font face set to Verdana', 'polite');
        speak('Font face set to Verdana');
        return true;
      }

      if (
        clean.includes('serif') ||
        clean.includes('georgia') ||
        clean === 'font 5'
      ) {
        setFontFace('serif');
        announce('Font face set to Georgia Serif', 'polite');
        speak('Font face set to Georgia Serif');
        return true;
      }

      if (
        clean.includes('mono') ||
        clean.includes('monospace') ||
        clean.includes('consolas') ||
        clean === 'font 6'
      ) {
        setFontFace('mono');
        announce('Font face set to Monospace', 'polite');
        speak('Font face set to Monospace');
        return true;
      }

      // 2. Font Size Scaling
      if (
        clean === 'normal font' ||
        clean === 'standard font' ||
        clean === 'default font' ||
        clean === 'font 100' ||
        clean === 'font size normal' ||
        clean === '100 percent' ||
        clean === '100 font'
      ) {
        setFontSize('normal');
        announce('Text scale set to 100% Standard', 'polite');
        speak('Text scale set to 100% Standard');
        return true;
      }

      if (
        clean === 'large font' ||
        clean === 'font size large' ||
        clean === '125 percent' ||
        clean === 'font 125'
      ) {
        setFontSize('large');
        announce('Text scale set to 125% Large', 'polite');
        speak('Text scale set to 125% Large');
        return true;
      }

      if (
        clean === 'extra large font' ||
        clean === 'xlarge font' ||
        clean === 'font size extra large' ||
        clean === '150 percent' ||
        clean === 'font 150'
      ) {
        setFontSize('xlarge');
        announce('Text scale set to 150% Extra Large', 'polite');
        speak('Text scale set to 150% Extra Large');
        return true;
      }

      if (
        clean === 'maximum font' ||
        clean === 'xxlarge font' ||
        clean === 'font size maximum' ||
        clean === 'biggest font' ||
        clean === '200 percent' ||
        clean === 'font 200'
      ) {
        setFontSize('xxlarge');
        announce('Text scale set to Maximum 175% to 200%', 'polite');
        speak('Text scale set to Maximum 175% to 200%');
        return true;
      }

      if (clean === 'increase font' || clean === 'bigger font' || clean === 'larger font') {
        const order: FontSize[] = ['normal', 'large', 'xlarge', 'xxlarge'];
        const currentIdx = order.indexOf(fontSize);
        const next = order[Math.min(order.length - 1, currentIdx + 1)];
        setFontSize(next);
        announce(`Text scale increased to ${next}`, 'polite');
        speak(`Text scale increased to ${next}`);
        return true;
      }

      if (clean === 'decrease font' || clean === 'smaller font') {
        const order: FontSize[] = ['normal', 'large', 'xlarge', 'xxlarge'];
        const currentIdx = order.indexOf(fontSize);
        const prev = order[Math.max(0, currentIdx - 1)];
        setFontSize(prev);
        announce(`Text scale decreased to ${prev}`, 'polite');
        speak(`Text scale decreased to ${prev}`);
        return true;
      }

      // 3. Dyslexia Font
      if (
        clean === 'enable dyslexia font' ||
        clean === 'turn on dyslexia font' ||
        clean === 'dyslexia font on' ||
        clean === 'activate dyslexia font'
      ) {
        setDyslexiaFont(true);
        announce('Dyslexia font enabled', 'polite');
        speak('Dyslexia font enabled');
        return true;
      }

      if (
        clean === 'disable dyslexia font' ||
        clean === 'turn off dyslexia font' ||
        clean === 'dyslexia font off' ||
        clean === 'deactivate dyslexia font'
      ) {
        setDyslexiaFont(false);
        announce('Dyslexia font disabled', 'polite');
        speak('Dyslexia font disabled');
        return true;
      }

      if (clean === 'toggle dyslexia font' || clean === 'switch dyslexia font') {
        const next = !dyslexiaFont;
        setDyslexiaFont(next);
        announce(`Dyslexia font ${next ? 'enabled' : 'disabled'}`, 'polite');
        speak(`Dyslexia font ${next ? 'enabled' : 'disabled'}`);
        return true;
      }

      // 4. Speech Rate
      if (clean === 'speech rate 0.5' || clean === 'speed 0.5' || clean === 'slow speech' || clean === 'slow speed') {
        handleRateChange(0.5);
        return true;
      }
      if (clean === 'speech rate 1' || clean === 'speech rate 1.0' || clean === 'speed 1' || clean === 'normal speed') {
        handleRateChange(1.0);
        return true;
      }
      if (clean === 'speech rate 1.5' || clean === 'speed 1.5') {
        handleRateChange(1.5);
        return true;
      }
      if (clean === 'speech rate 2' || clean === 'speech rate 2.0' || clean === 'speed 2' || clean === 'double speed') {
        handleRateChange(2.0);
        return true;
      }
      if (
        clean === 'speech rate 3' ||
        clean === 'speech rate 3.0' ||
        clean === 'speed 3' ||
        clean === 'triple speed' ||
        clean === 'fastest speed'
      ) {
        handleRateChange(3.0);
        return true;
      }
      if (clean === 'faster speech' || clean === 'increase speed' || clean === 'read faster') {
        const nextRate = Math.min(3.0, Number((speechRate + 0.25).toFixed(2)));
        handleRateChange(nextRate);
        return true;
      }
      if (clean === 'slower speech' || clean === 'decrease speed' || clean === 'read slower') {
        const nextRate = Math.max(0.5, Number((speechRate - 0.25).toFixed(2)));
        handleRateChange(nextRate);
        return true;
      }

      // 5. Pitch
      if (clean === 'higher pitch' || clean === 'increase pitch') {
        const newPitch = Math.min(1.5, Number((pitch + 0.1).toFixed(1)));
        handlePitchChange(newPitch);
        speak(`Pitch increased to ${newPitch}`);
        return true;
      }
      if (clean === 'lower pitch' || clean === 'decrease pitch') {
        const newPitch = Math.max(0.5, Number((pitch - 0.1).toFixed(1)));
        handlePitchChange(newPitch);
        speak(`Pitch decreased to ${newPitch}`);
        return true;
      }
      if (clean === 'normal pitch' || clean === 'reset pitch') {
        handlePitchChange(1.0);
        speak('Pitch reset to normal 1.0');
        return true;
      }
      if (clean === 'preview pitch') {
        handlePitchPreview();
        return true;
      }

      // 6. Compensatory Time
      if (
        clean === 'enable compensatory time' ||
        clean === 'turn on compensatory time' ||
        clean === 'compensatory time on' ||
        clean === '60 minutes' ||
        clean === 'pwd time on'
      ) {
        setCompensatoryTime(true);
        const msg = 'Compensatory time activated: 60 minutes per session (DoPT norms).';
        announce(msg, 'polite');
        speak(msg);
        return true;
      }
      if (
        clean === 'disable compensatory time' ||
        clean === 'turn off compensatory time' ||
        clean === 'compensatory time off' ||
        clean === '45 minutes' ||
        clean === 'standard time'
      ) {
        setCompensatoryTime(false);
        const msg = 'Compensatory time deactivated: standard 45 minutes per session.';
        announce(msg, 'polite');
        speak(msg);
        return true;
      }
      if (clean === 'toggle compensatory time') {
        const next = !compensatoryTime;
        setCompensatoryTime(next);
        const msg = next
          ? 'Compensatory time activated: 60 minutes per session'
          : 'Compensatory time deactivated: standard 45 minutes per session';
        announce(msg, 'polite');
        speak(msg);
        return true;
      }

      // 7. Actions & Summaries
      if (clean === 'test voice' || clean === 'test audio' || clean === 'voice test') {
        handleTestAudio();
        return true;
      }
      if (clean === 'reset defaults' || clean === 'restore defaults' || clean === 'reset settings') {
        handleResetDefaults();
        return true;
      }
      if (
        clean === 'read current settings' ||
        clean === 'settings summary' ||
        clean === 'what are my settings' ||
        clean === 'read settings'
      ) {
        const summary = `Current settings: Font face is ${fontFace}. Text scale is ${fontSize}. Dyslexia font is ${
          dyslexiaFont ? 'enabled' : 'disabled'
        }. Speech rate is ${speechRate}x. Pitch is ${pitch.toFixed(1)}. Compensatory time is ${
          compensatoryTime ? '60 minutes (PwD active)' : '45 minutes (Standard)'
        }.`;
        announce(summary, 'polite');
        speak(summary);
        return true;
      }

      // 8. Read Voice Commands & Guidance (Aloud for Blind Candidates)
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
        announce(ACCESSIBILITY_VOICE_GUIDE, 'polite');
        speak(ACCESSIBILITY_VOICE_GUIDE);
        return true;
      }

      // 9. Quick Switch to Screen Reader Settings
      if (
        clean === 'open screen reader settings' ||
        clean === 'go to screen reader settings' ||
        clean === 'screen reader settings' ||
        clean === 'open voice settings' ||
        clean === 'voice settings' ||
        clean === 'speech settings'
      ) {
        navigateTo('screen_reader_settings');
        return true;
      }

      // 10. Stop / Pause / Resume
      if (clean === 'stop' || clean === 'stop speaking' || clean === 'stop reading' || clean === 'be quiet') {
        stopSpeaking();
        return true;
      }
      if (clean === 'pause' || clean === 'pause speaking') {
        pauseSpeaking();
        return true;
      }
      if (clean === 'resume' || clean === 'resume speaking') {
        resumeSpeaking();
        return true;
      }

      return false;
    });

    return () => unregister();
  }, [
    registerVoiceHandler,
    fontFace,
    setFontFace,
    fontSize,
    setFontSize,
    dyslexiaFont,
    setDyslexiaFont,
    speechRate,
    pitch,
    compensatoryTime,
    setCompensatoryTime,
    handleRateChange,
    handlePitchChange,
    handlePitchPreview,
    handleResetDefaults,
    handleTestAudio,
    speak,
    announce,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    navigateTo
  ]);

  const fontFaces: { id: FontFace; label: string; desc: string; sample: string; voicePhrase: string }[] = [
    {
      id: 'system',
      label: 'System Default (Inter)',
      desc: 'Clean, balanced, modern sans-serif optimized for all digital displays and mathematical formulas.',
      sample: 'font-face-system',
      voicePhrase: 'System font'
    },
    {
      id: 'hyperlegible',
      label: 'Atkinson Hyperlegible',
      desc: 'Specially crafted for low vision by the Braille Institute to maximize letter distinction.',
      sample: 'font-face-hyperlegible',
      voicePhrase: 'Hyperlegible font'
    },
    {
      id: 'opendyslexic',
      label: 'OpenDyslexic',
      desc: 'Weighted bottom letterforms engineered to prevent character rotation and reading confusion.',
      sample: 'font-face-opendyslexic',
      voicePhrase: 'OpenDyslexic font'
    },
    {
      id: 'verdana',
      label: 'Verdana',
      desc: 'Generous character spacing and tall x-height designed for effortless on-screen readability.',
      sample: 'font-face-verdana',
      voicePhrase: 'Verdana font'
    },
    {
      id: 'serif',
      label: 'Georgia Serif',
      desc: 'Classic high-contrast serif typeface providing strong baseline guidance for long passages.',
      sample: 'font-face-serif',
      voicePhrase: 'Serif font'
    },
    {
      id: 'mono',
      label: 'Monospace (Consolas)',
      desc: 'Uniform character widths ensuring precise character counting, alignments, and code inspection.',
      sample: 'font-face-mono',
      voicePhrase: 'Monospace font'
    }
  ];

  const fontSizes: { id: FontSize; label: string; desc: string }[] = [
    { id: 'normal', label: '100% Standard', desc: 'Default readable typography (16px base)' },
    { id: 'large', label: '125% Large', desc: 'Enlarged body text (20px base)' },
    { id: 'xlarge', label: '150% Extra Large', desc: 'Strong magnification (24px base)' },
    { id: 'xxlarge', label: '175%–200% Maximum', desc: 'Maximum screen reader / visual magnifier size' }
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="mb-6 border-b border-slate-300 dark:border-slate-700 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-sm border border-blue-200 dark:border-blue-800">
            <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
            Screen 13 of 18 • Visual &amp; Accessibility Settings
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            Visual &amp; System Accessibility Configuration
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Configure visual contrast palettes, typographic sizing, OpenDyslexic font, Whisper speech recognition, and PwD exam time accommodations. For audio speech rate and voice synthesis, visit Screen Reader Settings.
          </p>
        </div>

        <AudioToolbar
          textToRead="System and Accessibility configuration page. Customize your visual contrast, text size, speech synthesizer, and exam time settings."
          label="Settings Audio"
        />
      </div>

      {/* Screen Navigation Disclaimer */}
      <ScreenNavigationDisclaimer
        screenId="ACCESSIBILITY_SETTINGS"
        screenTitle="Visual & System Accessibility Settings"
        description="All accessibility preferences can be toggled by voice, keyboard, or clicking buttons. Settings automatically persist for your candidate profile."
        actions={[
          {
            label: '1. Font Face Customization',
            opens: 'Switches between System Default (Inter), Atkinson Hyperlegible, OpenDyslexic, Verdana, Georgia Serif, and Monospace.',
            voiceCommand: 'Say "System font", "Hyperlegible font", "OpenDyslexic font", "Verdana font", "Serif font", or "Monospace font"'
          },
          {
            label: '2. Text Sizing / Scaling',
            opens: 'Adjusts body font magnification (100% Normal, 125% Large, 150% Extra Large, 200% Maximum).',
            voiceCommand: 'Say "Normal font", "Large font", "Extra large font", "Increase font", or "Decrease font"'
          },
          {
            label: '3. OpenDyslexic Typography',
            opens: 'Enables weighted letterforms to prevent character inversion and symbol confusion.',
            voiceCommand: 'Say "Enable dyslexia font", "Disable dyslexia font", or "Toggle dyslexia font"'
          },
          {
            label: '4. Speech Rate Speed',
            opens: 'Sets screen reader speech rate between 0.5x, 1.0x, 1.5x, 2.0x, and 3.0x.',
            voiceCommand: 'Say "Speech rate 1", "Speech rate 1.5", "Faster speech", or "Slower speech"'
          },
          {
            label: '5. Voice Pitch & Synthesizer',
            opens: 'Tunes audio pitch frequency and selects installed system synthesizers.',
            voiceCommand: 'Say "Higher pitch", "Lower pitch", "Normal pitch", or "Preview pitch"'
          },
          {
            label: '6. PwD Compensatory Time',
            opens: 'Activates 60 minutes per session (20 mins compensatory time per hour per DoPT guidelines).',
            voiceCommand: 'Say "Enable compensatory time" or "Disable compensatory time"'
          },
          {
            label: '7. Audio Test & Defaults',
            opens: 'Performs live voice test or resets all screen reader settings to standard defaults.',
            voiceCommand: 'Say "Test voice", "Reset defaults", or "Read current settings"'
          },
          {
            label: '8. Stop Speech Playback',
            opens: 'Immediately silences speech synthesis across any screen in the portal.',
            shortcut: 'Escape',
            voiceCommand: 'Say "Stop"'
          }
        ]}
      />

      {/* Dedicated Voice Controls & Spoken Guidance Banner (WCAG AAA & Blind-First Voice Accessible) */}
      <section
        aria-labelledby="voice-control-heading"
        className="mb-8 p-5 bg-gradient-to-r from-blue-50 via-indigo-50/40 to-blue-50 dark:from-slate-900 dark:via-blue-950/30 dark:to-slate-900 rounded-xl border-2 border-blue-600/40 dark:border-blue-500/40 shadow-sm"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-blue-200 dark:border-blue-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-sm">
              <Mic className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="voice-control-heading" className="text-base font-extrabold text-slate-900 dark:text-white">
                  Voice Controls &amp; Spoken Action Commands
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">
                  Hands-Free Voice Active
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Blind and low-vision candidates can speak the exact voice commands below to control buttons and settings hands-free.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                announce(ACCESSIBILITY_VOICE_GUIDE, 'polite');
                speak(ACCESSIBILITY_VOICE_GUIDE);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 transition-colors"
              aria-label="Read full voice commands guide aloud"
            >
              <Volume2 className="w-4 h-4" />
              <span>Listen to Voice Guide Aloud</span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo('screen_reader_settings')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-lg border border-blue-300 dark:border-blue-700 transition-colors"
              aria-label="Switch to Screen Reader Settings"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Screen Reader Settings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Categorized Spoken Commands Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-4 text-xs">
          <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-blue-600" />
              <span>Accessible Font Face</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Say any phrase to change font:</p>
            <div className="flex flex-wrap gap-1 font-mono text-[10px]">
              <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 rounded font-bold">Say: &ldquo;System font&rdquo;</span>
              <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 rounded font-bold">Say: &ldquo;Hyperlegible font&rdquo;</span>
              <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800 rounded font-bold">Say: &ldquo;OpenDyslexic font&rdquo;</span>
              <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 rounded font-bold">Say: &ldquo;Verdana font&rdquo;</span>
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded font-bold">Say: &ldquo;Serif font&rdquo;</span>
              <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-400 dark:border-slate-600 rounded font-bold">Say: &ldquo;Monospace font&rdquo;</span>
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              <span>Text Scaling &amp; Dyslexia</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Control typography by speaking:</p>
            <div className="flex flex-wrap gap-1 font-mono text-[10px]">
              <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 rounded font-bold">Say: &ldquo;Normal font&rdquo;</span>
              <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 rounded font-bold">Say: &ldquo;Large font&rdquo;</span>
              <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 rounded font-bold">Say: &ldquo;Extra large font&rdquo;</span>
              <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 rounded font-bold">Say: &ldquo;Maximum font&rdquo;</span>
              <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800 rounded font-bold">Say: &ldquo;Enable dyslexia font&rdquo;</span>
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Compensatory Time &amp; Audio</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Quick exam &amp; audio controls:</p>
            <div className="flex flex-wrap gap-1 font-mono text-[10px]">
              <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 rounded font-bold">Say: &ldquo;Enable compensatory time&rdquo;</span>
              <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 rounded font-bold">Say: &ldquo;Test voice&rdquo;</span>
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded font-bold">Say: &ldquo;Reset defaults&rdquo;</span>
              <span className="px-2 py-0.5 bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800 rounded font-bold">Say: &ldquo;Stop&rdquo;</span>
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-8">
        {/* Section 1: Font Face Selection */}
        <section aria-labelledby="fontface-heading" className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-6 rounded-sm shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Type className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <h2 id="fontface-heading" className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              1. Font Face Selection (Accessible Typography)
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
            Select an accessible font face applied consistently across all portal dashboards, MCQs, examination interfaces, instructions, and accessibility guides. Font preference persists across visits without breaking mathematical formulas or icons.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fontFaces.map((f) => {
              const isSelected = fontFace === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setFontFace(f.id);
                    speak(`Font face switched to ${f.label}`);
                  }}
                  className={`p-4 rounded-sm border-2 text-left transition-all focus:ring-3 focus:ring-blue-600 ${
                    isSelected
                      ? 'border-blue-700 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-950/40 ring-2 ring-blue-500'
                      : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 bg-white'
                  }`}
                  aria-label={`${f.label}. Voice command: Say '${f.voicePhrase}'`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{f.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded">
                        Say: &ldquo;{f.voicePhrase}&rdquo;
                      </span>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 dark:text-blue-400">
                          <Check className="w-4 h-4" /> Active
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">{f.desc}</p>
                  <div className={`p-2 rounded border border-slate-200 text-xs bg-slate-50 text-slate-900 ${f.sample}`}>
                    Sample: SSC MTS 2026 — General Intelligence &amp; Reasoning
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 2: Typography & Sizing */}
        <section aria-labelledby="typography-heading" className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-6 rounded-sm shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Type className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <h2 id="typography-heading" className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              2. Typographic Scaling & Legibility
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {fontSizes.map((f) => {
              const voicePhrase =
                f.id === 'normal'
                  ? 'Normal font'
                  : f.id === 'large'
                  ? 'Large font'
                  : f.id === 'xlarge'
                  ? 'Extra large font'
                  : 'Maximum font';

              return (
                <button
                  key={f.id}
                  onClick={() => {
                    setFontSize(f.id);
                    speak(`Text scale set to ${f.label}`);
                  }}
                  className={`p-3 rounded-sm border-2 text-left transition-all focus:ring-3 focus:ring-blue-600 ${
                    fontSize === f.id
                      ? 'border-blue-700 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-950/40'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                  aria-label={`${f.label}. Voice command: Say '${voicePhrase}'`}
                >
                  <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                    <span>{f.label}</span>
                    {fontSize === f.id && <Check className="w-4 h-4 text-blue-700 dark:text-blue-400" />}
                  </div>
                  <div className="mt-1">
                    <span className="text-[10px] font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded">
                      Say: &ldquo;{voicePhrase}&rdquo;
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">{f.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Dyslexia Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-sm border border-slate-200 dark:border-slate-700">
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>Dyslexia-Friendly Letter Spacing &amp; Weight (OpenDyslexic / Lucida Sans)</span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Enhances character boundary distinction and reduces symbol rotation confusion.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/50 px-2 py-1 rounded">
                Say: &ldquo;Enable dyslexia font&rdquo;
              </span>
              <button
                onClick={() => {
                  setDyslexiaFont(!dyslexiaFont);
                  speak(`Dyslexia font ${!dyslexiaFont ? 'enabled' : 'disabled'}`);
                }}
                className={`px-4 py-2 text-xs font-bold rounded-sm border focus:ring-2 focus:ring-blue-600 ${
                  dyslexiaFont
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600'
                }`}
              >
                {dyslexiaFont ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        </section>

        {/* Section 3: Dedicated Screen Reader & Speech Configuration (Section 9) */}
        <section aria-labelledby="screen-reader-heading" className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-6 rounded-sm shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              <h2 id="screen-reader-heading" className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                3. Screen Reader &amp; Audio Synthesizer Settings
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded border border-slate-300 dark:border-slate-600 inline-flex items-center gap-1.5"
                title="Reset all screen reader parameters to standard defaults"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Defaults</span>
              </button>
            </div>
          </div>

          {/* 3A: Speech Rate Buttons (0.5x, 1x, 1.5x, 2x, 3x) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Speech Rate: <span className="text-blue-700 dark:text-blue-400 font-mono">{speechRate}x</span>
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select your preferred reading speed. Settings are stored and automatically synchronized with candidate session.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1" role="radiogroup" aria-label="Speech Rate Selection">
              {speechRates.map((rate) => {
                const isActive = Math.abs(speechRate - rate) < 0.05;
                return (
                  <button
                    key={rate}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => handleRateChange(rate)}
                    className={`px-4 py-2 text-xs font-bold rounded-lg border-2 transition-all ${isActive
                        ? 'bg-blue-700 text-white border-blue-700 shadow-sm ring-2 ring-blue-400'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:border-blue-500'
                      }`}
                  >
                    {rate}x {rate === 1.0 ? '(Normal)' : rate === 0.5 ? '(Slow)' : rate === 3.0 ? '(Fastest)' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3B: Voice Selection Dropdown */}
          <div className="space-y-2">
            <label htmlFor="browser-voice-select" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Browser Voice Synthesizer Selection:
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choose from speech-synthesis voices installed on your operating system or browser (NVDA, Windows OneCore, Google Speech, etc.).
            </p>
            <select
              id="browser-voice-select"
              value={selectedVoiceURI}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className="w-full max-w-xl text-xs font-semibold p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            >
              <option value="default">System Default Voice</option>
              {browserVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang}){v.default ? ' [Default]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 3C: Pitch Control Slider with Preview */}
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center justify-between">
              <label htmlFor="speech-pitch-slider" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Voice Pitch: <span className="text-blue-700 dark:text-blue-400 font-mono">{pitch.toFixed(1)}</span>
              </label>
              <button
                type="button"
                onClick={handlePitchPreview}
                className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline"
              >
                Preview Pitch
              </button>
            </div>
            <input
              id="speech-pitch-slider"
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={pitch}
              onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
              aria-valuemin={0.5}
              aria-valuemax={1.5}
              aria-valuenow={pitch}
              aria-valuetext={`Pitch level ${pitch.toFixed(1)}`}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-700"
            />
            <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              <span>0.5 (Low Pitch)</span>
              <span>1.0 (Standard)</span>
              <span>1.5 (High Pitch)</span>
            </div>
          </div>

          {/* 3D: Playback Controls & Test Voice Button */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Live Audio Playback &amp; Voice Verification Controls
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleTestAudio}
                className="px-4 py-2 bg-[#1749E8] hover:bg-[#123BB8] text-white text-xs font-bold rounded-lg shadow-2xs inline-flex items-center gap-1.5"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Test Voice Settings</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const instruction = 'Screen Reader settings allow you to configure voice speed, pitch, and synthesizer output.';
                  announce(instruction, 'polite');
                  speak(instruction);
                }}
                className="px-3.5 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-bold inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Replay Last Instruction</span>
              </button>

              {isPausedSpeaking ? (
                <button
                  type="button"
                  onClick={() => {
                    resumeSpeaking();
                    announce('Speech resumed', 'polite');
                  }}
                  className="px-3.5 py-2 bg-amber-50 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume Reading</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    pauseSpeaking();
                    announce('Speech paused', 'polite');
                  }}
                  disabled={!isSpeaking}
                  className="px-3.5 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Reading</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  announce('Speech stopped', 'polite');
                }}
                disabled={!isSpeaking && !isPausedSpeaking}
                className="px-3.5 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-40 rounded-lg border border-rose-300 text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Reading (Esc)</span>
              </button>
            </div>
          </div>
        </section>

        {/* Section 4: PwD Compensatory Time */}
        <section aria-labelledby="pwd-heading" className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-6 rounded-sm shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <h2 id="pwd-heading" className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              4. Official SSC MTS Compensatory Time Accommodation
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-sm border border-slate-200 dark:border-slate-700">
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>Persons with Benchmark Disabilities (PwD) Compensatory Time</span>
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  SSC Guidelines
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Provides <strong>60 minutes per session</strong> (instead of standard 45 minutes) = <strong>20 minutes compensatory time per hour</strong> as per Department of Personnel and Training (DoPT) norms.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-1 rounded">
                Say: &ldquo;Enable compensatory time&rdquo;
              </span>
              <button
                onClick={() => {
                  setCompensatoryTime(!compensatoryTime);
                  speak(`Compensatory time ${!compensatoryTime ? 'activated: 60 minutes per session' : 'deactivated: standard 45 minutes per session'}`);
                }}
                className={`px-4 py-2.5 text-xs font-bold rounded-sm border focus:ring-3 focus:ring-blue-600 transition-colors ${compensatoryTime
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600'
                  }`}
              >
                {compensatoryTime ? '60 Mins (PwD Active)' : '45 Mins (Standard)'}
              </button>
            </div>
          </div>
        </section>

        {/* Section 5: Centralized Keyboard Shortcuts Cheatsheet (Section 11) */}
        <section aria-labelledby="shortcuts-heading" className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-6 rounded-sm shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Keyboard className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <h2 id="shortcuts-heading" className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              5. Centralized Global Keyboard Shortcuts Cheatsheet
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {[
              { key: 'Alt + Space', desc: 'Activate Vision Voice Assistant' },
              { key: 'Alt + V', desc: 'Toggle Vision Mode ("Hey Vision")' },
              { key: 'Alt + D', desc: 'Candidate Dashboard' },
              { key: 'Alt + T', desc: 'AI Syllabus Tutor' },
              { key: 'Alt + P', desc: 'Voice Practice' },
              { key: 'Alt + E', desc: 'Mock Examination' },
              { key: 'Alt + M', desc: 'Pilot Demo Diagnostic' },
              { key: 'Alt + R', desc: 'Spaced Revision Planner' },
              { key: 'Alt + A', desc: 'Weak Areas Analysis' },
              { key: 'Alt + S', desc: 'Screen Reader Settings' },
              { key: 'Alt + G', desc: 'Subject Deep Dive Topics' },
              { key: 'Alt + C', desc: 'Current Affairs & GK' },
              { key: 'Alt + H', desc: 'Transcript Workspace & History' },
              { key: 'Alt + K', desc: 'Spoken Human Verification / Login' },
              { key: 'Alt + Q', desc: 'Read Current Question Aloud' },
              { key: 'Alt + O', desc: 'Read Options Aloud' },
              { key: 'Alt + L', desc: 'Sign Out / Logout' },
              { key: 'Escape', desc: 'Stop Reading / Speech Playback' },
              { key: 'Alt + /', desc: 'Shortcuts Reference Dialog' }
            ].map((k, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700">
                <span className="text-slate-700 dark:text-slate-300 font-medium">{k.desc}</span>
                <kbd className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded font-mono font-bold text-blue-700 dark:text-blue-300 text-[11px]">
                  {k.key}
                </kbd>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
