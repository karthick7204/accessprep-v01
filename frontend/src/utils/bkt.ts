/**
 * ACCESSPREP-X Bayesian Knowledge Tracing (BKT) Algorithm
 * Models topic and subtopic latent skill mastery P(L_t) given sequential candidate observations.
 * Parameters:
 *   p_init: Initial prior probability of knowing the skill (e.g. 0.20)
 *   p_transit: Probability of transitioning from unlearned to learned state (e.g. 0.15)
 *   p_slip: Probability of answering incorrectly despite knowing the skill (e.g. 0.10)
 *   p_guess: Probability of guessing correctly without knowing the skill (e.g. 0.25 for 4-option MCQ)
 */

export interface BKTParameters {
  p_init: number;
  p_transit: number;
  p_slip: number;
  p_guess: number;
}

export const DEFAULT_BKT_PARAMS: BKTParameters = {
  p_init: 0.25,
  p_transit: 0.18,
  p_slip: 0.08,
  p_guess: 0.25 // 1 out of 4 multiple-choice options
};

export interface TopicMasteryState {
  topic: string;
  subject: string;
  totalAttempts: number;
  correctAttempts: number;
  p_known: number; // probability from 0.0 to 1.0
  masteryPercentage: number; // 0 to 100
  tier: 'Novice' | 'Developing' | 'Proficient' | 'Mastered';
  lastUpdated: string;
}

/**
 * Updates the probability of knowing the skill given a new observation (correct/incorrect).
 */
export function updateBKT(
  current_p_known: number,
  isCorrect: boolean,
  params: BKTParameters = DEFAULT_BKT_PARAMS
): number {
  const { p_transit, p_slip, p_guess } = params;

  // Step 1: Posterior update given evidence
  let p_known_given_obs: number;
  if (isCorrect) {
    const num = current_p_known * (1 - p_slip);
    const denom = num + (1 - current_p_known) * p_guess;
    p_known_given_obs = denom > 0 ? num / denom : current_p_known;
  } else {
    const num = current_p_known * p_slip;
    const denom = num + (1 - current_p_known) * (1 - p_guess);
    p_known_given_obs = denom > 0 ? num / denom : current_p_known;
  }

  // Step 2: Learning transition update for next opportunity
  const p_next = p_known_given_obs + (1 - p_known_given_obs) * p_transit;
  return Math.max(0.01, Math.min(0.99, Math.round(p_next * 1000) / 1000));
}

export function classifyMasteryTier(p_known: number): 'Novice' | 'Developing' | 'Proficient' | 'Mastered' {
  if (p_known >= 0.85) return 'Mastered';
  if (p_known >= 0.65) return 'Proficient';
  if (p_known >= 0.40) return 'Developing';
  return 'Novice';
}

export function getSkillLevel(p_known: number): string {
  return classifyMasteryTier(p_known);
}
