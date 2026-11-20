/**
 * ACCESSPREP-X — useTranscriptWorkspace Hook
 */

import { useState, useCallback } from 'react';
import type {
  TranscriptLogEntry,
  TranscriptPrivacySettings
} from '../types/transcript.types.ts';
import {
  fetchTranscriptLogs,
  clearTranscriptLogs,
  fetchTranscriptPrivacySettings,
  updateTranscriptPrivacySettings
} from '../services/transcript.service.ts';

export function useTranscriptWorkspace(userId?: string) {
  const [logs, setLogs] = useState<TranscriptLogEntry[]>([]);
  const [privacy, setPrivacy] = useState<TranscriptPrivacySettings | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const loadWorkspaceData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [fetchedLogs, fetchedPrivacy] = await Promise.all([
        fetchTranscriptLogs(userId),
        fetchTranscriptPrivacySettings(userId)
      ]);
      setLogs(fetchedLogs);
      setPrivacy(fetchedPrivacy);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const handleClearLogs = useCallback(async () => {
    if (!userId) return;
    await clearTranscriptLogs(userId);
    setLogs([]);
  }, [userId]);

  return {
    logs,
    setLogs,
    privacy,
    setPrivacy,
    loading,
    loadWorkspaceData,
    handleClearLogs,
    updateTranscriptPrivacySettings
  };
}
