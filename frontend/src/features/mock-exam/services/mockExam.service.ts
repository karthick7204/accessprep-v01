/**
 * ACCESSPREP-X — Mock Examination Service
 * Isolates non-repeating mock exam rotation & submission API calls from Voice Practice.
 */

import { apiGet, apiPost } from '../../../services/api/apiClient.service.ts';
import type { RotationStatus } from '../../../services/mockExamRotationService.ts';
import type { MockExamStartResponse } from '../../../types/api/api.types.ts';
import type { MockExamAttempt } from '../../../types/global/domain.types.ts';

export * from '../../../services/mockExamRotationService.ts';
export * from '../../../utils/scoring.ts';

export async function fetchMockRotationStatus(userId: string): Promise<RotationStatus> {
  return apiGet<RotationStatus>(`/api/mock/rotation-status?userId=${encodeURIComponent(userId)}`);
}

export async function startMockExamination(userId: string, examTitle?: string): Promise<MockExamStartResponse> {
  return apiPost<MockExamStartResponse>('/api/mock/start', { userId, examTitle });
}

export async function resetMockRotationCycle(userId: string): Promise<{ status: string; rotationStatus: RotationStatus }> {
  return apiPost<{ status: string; rotationStatus: RotationStatus }>('/api/mock/reset-cycle', { userId });
}

export async function fetchMockAttemptHistory(userId: string): Promise<MockExamAttempt[]> {
  return apiGet<MockExamAttempt[]>(`/api/mock/history?userId=${encodeURIComponent(userId)}`);
}
