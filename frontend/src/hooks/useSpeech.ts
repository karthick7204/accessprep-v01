/**
 * ACCESSPREP-X — useSpeech Hook
 * Provides convenient access to Text-to-Speech (TTS), Speech-to-Text (STT),
 * and live ARIA announcements from the central AccessibilityContext.
 */

import { useAccessibility } from '../context/AccessibilityContext.tsx';

export function useSpeech() {
  const {
    speakText,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    slowDownSpeech,
    isSpeaking,
    isPausedSpeaking,
    isVoiceListening,
    micPermissionStatus,
    startVoiceListening,
    stopVoiceListening,
    registerVoiceHandler,
    announce,
    playBeacon
  } = useAccessibility();

  return {
    speakText,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    slowDownSpeech,
    isSpeaking,
    isPausedSpeaking,
    isVoiceListening,
    micPermissionStatus,
    startVoiceListening,
    stopVoiceListening,
    registerVoiceHandler,
    announce,
    playBeacon
  };
}
