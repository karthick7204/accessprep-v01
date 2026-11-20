/**
 * ACCESSPREP-X — Authentication Feature Types
 */

import type { User, AccessibilitySettings } from '../../../types/global/domain.types.ts';

export interface LoginCredentials {
  identifier: string;
  password: string;
  verificationToken: string;
}

export interface RegistrationPayload {
  name: string;
  rollNumber?: string;
  email: string;
  password: string;
  pwdCategory: User['pwdCategory'];
  needScribe: boolean;
  examRegion: string;
  examLanguage: string;
  verificationToken: string;
}

export interface AuthenticatedSession {
  user: Omit<User, 'passwordHash'>;
  settings?: AccessibilitySettings;
}
