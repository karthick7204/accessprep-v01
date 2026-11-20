/**
 * ACCESSPREP-X — useProgressAnalytics Hook
 */

import { useState, useCallback } from 'react';
import type { TopicMasteryRecord } from '../../../types/global/domain.types.ts';
import type { ProgressAnalyticsSummary } from '../../../types/api/api.types.ts';
import {
  fetchTopicMasteryList,
  fetchProgressAnalytics
} from '../services/progress.service.ts';

export function useProgressAnalytics(userId?: string) {
  const [analytics, setAnalytics] = useState<ProgressAnalyticsSummary | null>(null);
  const [mastery, setMastery] = useState<TopicMasteryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const loadProgress = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [a, m] = await Promise.all([
        fetchProgressAnalytics(userId),
        fetchTopicMasteryList(userId)
      ]);
      setAnalytics(a);
      setMastery(m);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    analytics,
    mastery,
    loading,
    loadProgress
  };
}
