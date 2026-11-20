/**
 * ACCESSPREP-X — Progress & Topic Mastery Service
 */

import { apiGet } from '../../../services/api/apiClient.service.ts';
import type { TopicMasteryRecord } from '../../../types/global/domain.types.ts';
import type { ProgressAnalyticsSummary } from '../../../types/api/api.types.ts';

export async function fetchTopicMasteryList(userId: string): Promise<TopicMasteryRecord[]> {
  return apiGet<TopicMasteryRecord[]>(`/api/mastery?userId=${encodeURIComponent(userId)}`);
}

export async function fetchProgressAnalytics(userId: string): Promise<ProgressAnalyticsSummary> {
  return apiGet<ProgressAnalyticsSummary>(`/api/progress/analytics?userId=${encodeURIComponent(userId)}`);
}
