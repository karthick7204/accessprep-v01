/**
 * ACCESSPREP-X — useMockExamRotation Hook
 */

import { useState, useCallback } from 'react';
import type { RotationStatus } from '../types/mockExam.types.ts';
import {
  fetchMockRotationStatus,
  resetMockRotationCycle
} from '../services/mockExam.service.ts';

export function useMockExamRotation(userId?: string) {
  const [rotationStatus, setRotationStatus] = useState<RotationStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const loadRotationStatus = useCallback(async () => {
    if (!userId) return null;
    setLoading(true);
    try {
      const status = await fetchMockRotationStatus(userId);
      setRotationStatus(status);
      return status;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const resetCycle = useCallback(async () => {
    if (!userId) return null;
    setLoading(true);
    try {
      const res = await resetMockRotationCycle(userId);
      setRotationStatus(res.rotationStatus);
      return res.rotationStatus;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    rotationStatus,
    setRotationStatus,
    loading,
    loadRotationStatus,
    resetCycle
  };
}
