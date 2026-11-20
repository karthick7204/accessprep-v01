/**
 * ACCESSPREP-X — useRevisionPlanner Hook
 */

import { useState, useCallback } from 'react';
import {
  fetchRevisionQueue,
  submitRevisionReview,
  type EnrichedRevisionItem
} from '../services/revisionPlanner.service.ts';

export function useRevisionPlanner(userId?: string) {
  const [queue, setQueue] = useState<EnrichedRevisionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const loadQueue = useCallback(async () => {
    if (!userId) return [];
    setLoading(true);
    try {
      const items = await fetchRevisionQueue(userId);
      setQueue(items);
      return items;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    queue,
    setQueue,
    loading,
    loadQueue,
    submitRevisionReview
  };
}
