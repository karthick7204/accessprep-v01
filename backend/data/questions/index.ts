/**
 * ACCESSPREP-X — Verified Question Bank Accessor
 * Canonical dataset: src/data/ssc_mts_questions.json (400 verified SSC MTS questions)
 */

export { loadQuestions, resetQuestionsCache } from '../../db/database.ts';
export type { Question } from '../../src/models/domain.models.ts';
