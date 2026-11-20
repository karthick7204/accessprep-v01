/**
 * ACCESSPREP-X — Results & Scorecard Service
 */

import { apiGet } from '../../../services/api/apiClient.service.ts';
import type { MockExamAttempt } from '../../../types/global/domain.types.ts';

export * from '../../../utils/scoring.ts';

export async function fetchResultsHistory(userId: string): Promise<MockExamAttempt[]> {
  return apiGet<MockExamAttempt[]>(`/api/mock/history?userId=${encodeURIComponent(userId)}`);
}
