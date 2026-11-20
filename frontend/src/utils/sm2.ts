/**
 * ACCESSPREP-X SuperMemo SM-2 Spaced Repetition Algorithm
 * Computes optimal revision intervals for questions based on candidate performance.
 */

export interface SM2Item {
  questionId: string;
  repetitions: number;
  intervalDays: number;
  easinessFactor: number; // minimum 1.3, default 2.5
  lastReviewedAt: string;
  nextReviewDue: string;
  masteryLevel: 'Novice' | 'Learning' | 'Reviewing' | 'Mastered';
}

/**
 * Calculates updated SM-2 parameters after a candidate review attempt.
 * @param item Current SM-2 memory parameters
 * @param quality Recall quality rating (0-5 scale):
 *   5 - Perfect response without hesitation
 *   4 - Correct response after a hesitation
 *   3 - Correct response recalled with serious difficulty
 *   2 - Incorrect response; where the correct one seemed easy to recall
 *   1 - Incorrect response; the correct one remembered
 *   0 - Complete blackout
 */
export function calculateSM2(
  item: { repetitions: number; intervalDays: number; easinessFactor: number },
  quality: number
): {
  repetitions: number;
  intervalDays: number;
  easinessFactor: number;
  masteryLevel: 'Novice' | 'Learning' | 'Reviewing' | 'Mastered';
} {
  const q = Math.max(0, Math.min(5, quality));
  let { repetitions, intervalDays, easinessFactor } = item;

  // Update Easiness Factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const newEF = Math.max(
    1.3,
    easinessFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  );

  if (q >= 3) {
    // Successful recall
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * newEF);
    }
    repetitions += 1;
  } else {
    // Failed recall: reset repetitions
    repetitions = 0;
    intervalDays = 1;
  }

  let masteryLevel: 'Novice' | 'Learning' | 'Reviewing' | 'Mastered' = 'Novice';
  if (repetitions >= 5 && intervalDays >= 21) {
    masteryLevel = 'Mastered';
  } else if (repetitions >= 3) {
    masteryLevel = 'Reviewing';
  } else if (repetitions >= 1) {
    masteryLevel = 'Learning';
  }

  return {
    repetitions,
    intervalDays,
    easinessFactor: Math.round(newEF * 100) / 100,
    masteryLevel
  };
}

export function getNextReviewDate(intervalDays: number, fromDate = new Date()): string {
  const d = new Date(fromDate);
  d.setDate(d.getDate() + intervalDays);
  return d.toISOString();
}
