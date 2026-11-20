/**
 * ACCESSPREP-X — Default Accessibility Preferences Constants
 */

import type { AccessibilitySettings } from '../../../types/global/domain.types.ts';

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  userId: 'usr-001',
  theme: 'sapphire',
  fontScale: 100,
  dyslexiaFont: false,
  speechRate: 1.0,
  speechPitch: 1.0,
  voiceURI: '',
  autoReadAloud: true,
  highContrastBorders: true,
  reduceMotion: false,
  compensatoryTimeEnabled: true,
  whisperModelSize: 'base',
  isBlindMode: false,
  speechVolume: 1.0,
  recognitionLang: 'en-IN',
  readQuestionAutomatically: true,
  readOptionsAutomatically: true,
  autoAnnouncements: true
};
