/**
 * ACCESSPREP-X — Transcript Workspace Types
 */

import type {
  TranscriptLogEntry,
  TranscriptPrivacySettings,
  LearningHistoryEntry
} from '../../../types/global/domain.types.ts';

export type { TranscriptLogEntry, TranscriptPrivacySettings, LearningHistoryEntry };

export type TranscriptWorkspaceTab = 'overview' | 'transcript_log' | 'live_workspace' | 'privacy_settings';

export type TranscriptExportFormat = 'txt' | 'json' | 'csv';
