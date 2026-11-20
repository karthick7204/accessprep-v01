/**
 * ACCESSPREP-X Global Voice Navigation Command Types
 * Strict 16-screen routing, role-based protection, and exam safety.
 */

import { ScreenId } from '../types/screens.ts';
import { User } from '../db/database.ts';

export type CommandIntentType =
  | 'GLOBAL_NAV'
  | 'EXAM_CONFIRMATION'
  | 'ASSISTANCE'
  | 'SYSTEM_CONTROL'
  | 'SCREEN_LOCAL'
  | 'UNKNOWN';

export interface NavigationTarget {
  screenId: ScreenId;
  screenNumber: number;
  title: string;
  shortLabel: string;
  spokenName: string;
  aliases: string[];
  requiresAuth: boolean;
  isAdminOnly?: boolean;
  actionSummary: string;
}

export type VoiceNavigationStatus =
  | 'success'
  | 'blocked_by_active_exam'
  | 'forbidden_role'
  | 'unauthenticated'
  | 'local_handled'
  | 'assistance_provided'
  | 'system_handled'
  | 'unrecognized'
  | 'ambiguous';

export interface NavigationCommandResult {
  status: VoiceNavigationStatus;
  destination?: ScreenId;
  destinationTitle?: string;
  spokenResponse: string;
  announcement?: string;
  originalTranscript: string;
  cleanTranscript: string;
  needsConfirmation?: boolean;
}

export interface SpeechSettingCommand {
  type: 'rate' | 'pitch';
  value: number;
}

export interface NavigationContext {
  currentScreen: ScreenId;
  user: User | null;
  isExamActive: boolean;
  pendingExamExit: {
    destination: ScreenId;
    title: string;
  } | null;
  historyStack: ScreenId[];
  lastSpokenText: string;
  isVisionAssistantActive?: boolean;
}

