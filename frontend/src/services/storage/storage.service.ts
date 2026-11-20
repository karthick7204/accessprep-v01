/**
 * ACCESSPREP-X — Browser Storage Service
 */

export const STORAGE_KEYS = {
  USER: 'accessprep_user',
  SETTINGS: 'accessprep_settings',
  BLIND_MODE: 'accessprep_blind_mode',
  GEMINI_API_KEY: 'accessprep_gemini_api_key',
  DAILY_TARGET: 'accessprep_daily_target',
  PREFERRED_SUBJECT: 'accessprep_preferred_subject',
  LAST_MOCK_ATTEMPT: 'accessprep_last_mock_attempt'
} as const;

export function getStorageItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota errors in restricted environments
  }
}

export function removeStorageItem(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage removal errors
  }
}
