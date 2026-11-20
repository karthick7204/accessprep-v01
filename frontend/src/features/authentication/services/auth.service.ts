/**
 * ACCESSPREP-X — Authentication Service
 */

import { apiGet, apiPost } from '../../../services/api/apiClient.service.ts';
import type {
  AuthChallengeResponse,
  AuthVerifyChallengeResponse
} from '../../../types/api/api.types.ts';
import type {
  LoginCredentials,
  RegistrationPayload,
  AuthenticatedSession
} from '../types/auth.types.ts';

export * from '../../../utils/authVoiceUtils.ts';
export * from '../../../utils/humanVerification.ts';

export async function fetchVerificationChallenge(): Promise<AuthChallengeResponse> {
  return apiGet<AuthChallengeResponse>('/api/auth/challenge');
}

export async function verifySpokenChallenge(
  challengeId: string,
  spokenPhrase: string
): Promise<AuthVerifyChallengeResponse> {
  return apiPost<AuthVerifyChallengeResponse>('/api/auth/verify-challenge', {
    challengeId,
    spokenPhrase
  });
}

export async function loginCandidate(credentials: LoginCredentials): Promise<AuthenticatedSession> {
  return apiPost<AuthenticatedSession>('/api/auth/login', credentials);
}

export async function registerCandidate(payload: RegistrationPayload): Promise<AuthenticatedSession> {
  return apiPost<AuthenticatedSession>('/api/auth/register', payload);
}
