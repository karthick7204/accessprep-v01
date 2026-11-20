/**
 * ACCESSPREP-X — Accessibility Settings Service
 */

import { apiGet, apiPost } from '../../../services/api/apiClient.service.ts';
import type { AccessibilitySettings } from '../../../types/global/domain.types.ts';

export * from '../../../services/speech/speech.service.ts';
export * from '../../../services/audio/audio.service.ts';

export async function fetchAccessibilitySettings(userId: string): Promise<AccessibilitySettings> {
  return apiGet<AccessibilitySettings>(`/api/settings?userId=${encodeURIComponent(userId)}`);
}

export async function saveAccessibilitySettings(
  settings: Partial<AccessibilitySettings> & { userId: string }
): Promise<{ status: string; settings: AccessibilitySettings }> {
  return apiPost<{ status: string; settings: AccessibilitySettings }>('/api/settings/update', settings);
}
