/**
 * ACCESSPREP-X — useAccessibilityPreferences Hook
 */

import { useAccessibility } from '../../../context/AccessibilityContext.tsx';

export function useAccessibilityPreferences() {
  const {
    settings,
    updateSettings,
    theme,
    isBlindMode,
    setIsBlindMode,
    speakText,
    stopSpeaking,
    announce
  } = useAccessibility();

  return {
    settings,
    updateSettings,
    theme,
    isBlindMode,
    setIsBlindMode,
    speakText,
    stopSpeaking,
    announce
  };
}
