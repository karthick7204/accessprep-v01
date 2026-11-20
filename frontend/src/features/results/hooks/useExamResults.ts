/**
 * ACCESSPREP-X — useExamResults Hook
 */

import { useState, useCallback } from 'react';
import type { MockExamAttempt } from '../../../types/global/domain.types.ts';
import { fetchResultsHistory } from '../services/results.service.ts';

export function useExamResults(userId?: string) {
  const [attempts, setAttempts] = useState<MockExamAttempt[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const loadAttempts = useCallback(async () => {
    if (!userId) return [];
    setLoading(true);
    try {
      const list = await fetchResultsHistory(userId);
      setAttempts(list);
      return list;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return { attempts, loading, loadAttempts };
}
