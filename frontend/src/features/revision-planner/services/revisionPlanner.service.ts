/**
 * ACCESSPREP-X — Revision Planner Service
 */

import { apiGet, apiPost } from '../../../services/api/apiClient.service.ts';
import type { RevisionItem, Question } from '../../../types/global/domain.types.ts';

export * from '../../../utils/sm2.ts';

export interface EnrichedRevisionItem extends RevisionItem {
  question?: Question;
}

export async function fetchRevisionQueue(userId: string): Promise<EnrichedRevisionItem[]> {
  return apiGet<EnrichedRevisionItem[]>(`/api/revision/queue?userId=${encodeURIComponent(userId)}`);
}

export async function submitRevisionReview(payload: {
  userId: string;
  questionId: string;
  quality: number;
}): Promise<RevisionItem> {
  return apiPost<RevisionItem>('/api/revision/review', payload);
}
