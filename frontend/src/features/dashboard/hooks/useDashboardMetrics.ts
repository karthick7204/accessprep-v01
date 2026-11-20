/**
 * ACCESSPREP-X — useDashboardMetrics Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../../../services/api/apiClient.service.ts';
import type { ProgressAnalyticsSummary } from '../../../types/api/api.types.ts';

export function useDashboardMetrics(userId?: string) {
  const [metrics, setMetrics] = useState<ProgressAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshMetrics = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<ProgressAnalyticsSummary>(`/api/progress/analytics?userId=${encodeURIComponent(userId)}`);
      setMetrics(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  return { metrics, loading, error, refreshMetrics };
}
