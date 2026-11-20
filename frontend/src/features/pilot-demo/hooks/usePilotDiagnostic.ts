/**
 * ACCESSPREP-X — usePilotDiagnostic Hook
 */

import { useState, useCallback } from 'react';
import type { Question, DiagnosticAttempt } from '../types/pilotDemo.types.ts';
import {
  fetchDiagnosticQuestionSet,
  fetchDiagnosticAttempts
} from '../services/pilotDemo.service.ts';

export function usePilotDiagnostic(userId?: string) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [history, setHistory] = useState<DiagnosticAttempt[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const loadDiagnosticSet = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDiagnosticQuestionSet();
      setQuestions(data.questions || []);
      return data.questions || [];
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    if (!userId) return [];
    const list = await fetchDiagnosticAttempts(userId);
    setHistory(list);
    return list;
  }, [userId]);

  return {
    questions,
    history,
    loading,
    loadDiagnosticSet,
    loadHistory
  };
}
