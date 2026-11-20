/**
 * ACCESSPREP-X — Mock Examination Feature Types
 */

import type {
  Question,
  MockExamAttempt,
  MockExamRotationState
} from '../../../types/global/domain.types.ts';
import type { RotationStatus } from '../../../services/mockExamRotationService.ts';

export type { Question, MockExamAttempt, MockExamRotationState, RotationStatus };

export interface MockAnswerEntry {
  selectedOption: string | null;
  timeSpent: number;
  markedForReview?: boolean;
}

export type MockAnswersMap = Record<string, MockAnswerEntry>;
