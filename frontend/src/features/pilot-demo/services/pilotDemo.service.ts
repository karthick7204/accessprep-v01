/**
 * ACCESSPREP-X — Pilot Demo Diagnostic Service
 */

import { apiGet, apiPost } from '../../../services/api/apiClient.service.ts';
import type { Question, DiagnosticAttempt } from '../types/pilotDemo.types.ts';

export * from '../../../utils/pilotDemoScoring.ts';
export * from '../../../utils/pilotDemoAcceptance.ts';

export async function fetchDiagnosticQuestionSet(): Promise<{
  totalQuestions: number;
  questions: Question[];
}> {
  return apiGet<{ totalQuestions: number; questions: Question[] }>('/api/diagnostic/questions');
}

export async function fetchDiagnosticAttempts(userId: string): Promise<DiagnosticAttempt[]> {
  return apiGet<DiagnosticAttempt[]>(`/api/diagnostic/attempts?userId=${encodeURIComponent(userId)}`);
}

export async function submitDiagnosticAttempt(payload: Record<string, unknown>): Promise<{
  status: string;
  attempt: DiagnosticAttempt;
}> {
  return apiPost<{ status: string; attempt: DiagnosticAttempt }>('/api/diagnostic/submit', payload);
}
