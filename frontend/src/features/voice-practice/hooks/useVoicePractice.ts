/**
 * ACCESSPREP-X — useVoicePractice Hook
 */

import { useState, useCallback } from 'react';
import type { Question } from '../../../types/global/domain.types.ts';
import {
  fetchPracticeQuestions,
  submitPracticeAnswer
} from '../services/voicePractice.service.ts';

export function useVoicePractice() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const loadQuestions = useCallback(async (subject?: string, topic?: string, difficulty?: string) => {
    setLoading(true);
    try {
      const list = await fetchPracticeQuestions({ subject, topic, difficulty });
      setQuestions(list);
      return list;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    questions,
    setQuestions,
    loading,
    loadQuestions,
    submitPracticeAnswer
  };
}
