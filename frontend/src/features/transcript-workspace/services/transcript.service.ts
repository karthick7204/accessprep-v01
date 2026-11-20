/**
 * ACCESSPREP-X — Transcript Workspace Service
 * Separates transcript log persistence, privacy settings, and export formatting from UI.
 */

import { apiGet, apiPost, apiPut, apiDelete } from '../../../services/api/apiClient.service.ts';
import type {
  TranscriptLogEntry,
  TranscriptPrivacySettings
} from '../types/transcript.types.ts';

export async function fetchTranscriptLogs(userId: string): Promise<TranscriptLogEntry[]> {
  return apiGet<TranscriptLogEntry[]>(`/api/transcripts?userId=${encodeURIComponent(userId)}`);
}

export async function createTranscriptLog(entry: Partial<TranscriptLogEntry> & { userId: string; transcript: string }): Promise<TranscriptLogEntry> {
  return apiPost<TranscriptLogEntry>('/api/transcripts', entry);
}

export async function clearTranscriptLogs(userId: string): Promise<{ status: string; deletedCount?: number }> {
  return apiDelete<{ status: string; deletedCount?: number }>(`/api/transcripts?userId=${encodeURIComponent(userId)}`);
}

export async function fetchTranscriptPrivacySettings(userId: string): Promise<TranscriptPrivacySettings> {
  return apiGet<TranscriptPrivacySettings>(`/api/transcripts/privacy?userId=${encodeURIComponent(userId)}`);
}

export async function updateTranscriptPrivacySettings(
  userId: string,
  settings: Partial<TranscriptPrivacySettings>
): Promise<TranscriptPrivacySettings> {
  return apiPut<TranscriptPrivacySettings>('/api/transcripts/privacy', { userId, ...settings });
}

export function formatTranscriptAsPlainText(logs: TranscriptLogEntry[]): string {
  return logs
    .map(
      (log) =>
        `[${new Date(log.timestamp).toISOString()}] (${log.screenId}) [${log.status}] ${log.transcript}`
    )
    .join('\n');
}
