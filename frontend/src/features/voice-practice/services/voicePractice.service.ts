/**
 * ACCESSPREP-X — Voice Practice Service
 * Maintains independent practice question fetching & adaptive BKT/SM-2 evaluation.
 */

import { apiGet, apiPost } from '../../../services/api/apiClient.service.ts';
import type { Question } from '../../../types/global/domain.types.ts';
import type { PracticeSubmitPayload, PracticeSubmitResponse } from '../../../types/api/api.types.ts';

export * from '../../../utils/answerParser.ts';
export * from '../../../utils/bkt.ts';
export * from '../../../utils/sm2.ts';
export * from '../../../utils/repeatQuestionHelper.ts';

export async function fetchPracticeQuestions(params?: {
  subject?: string;
  topic?: string;
  difficulty?: string;
  limit?: number;
}): Promise<Question[]> {
  const searchParams = new URLSearchParams();
  if (params?.subject && params.subject !== 'all') searchParams.set('subject', params.subject);
  if (params?.topic && params.topic !== 'all') searchParams.set('topic', params.topic);
  if (params?.difficulty && params.difficulty !== 'all') searchParams.set('difficulty', params.difficulty);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const query = searchParams.toString();
  return apiGet<Question[]>(`/api/questions${query ? `?${query}` : ''}`);
}

export async function submitPracticeAnswer(payload: PracticeSubmitPayload): Promise<PracticeSubmitResponse> {
  return apiPost<PracticeSubmitResponse>('/api/practice/submit', payload);
}
