/**
 * ACCESSPREP-X — Question Creation Request Validator
 */

export const REQUIRED_QUESTION_FIELDS = [
  'subject',
  'topic',
  'question_text',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'correct_answer',
  'explanation',
  'difficulty_label',
  'source_name',
  'source_reference',
  'source_type'
] as const;

export function validateNewQuestionInput(body: any): {
  valid: boolean;
  error?: string;
} {
  const missing = REQUIRED_QUESTION_FIELDS.filter((f) => !body?.[f]);
  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missing.join(', ')}`
    };
  }

  if (!['A', 'B', 'C', 'D'].includes(String(body.correct_answer).toUpperCase())) {
    return {
      valid: false,
      error: 'correct_answer must be one of A, B, C, or D.'
    };
  }

  if (!['Easy', 'Medium', 'Hard'].includes(body.difficulty_label)) {
    return {
      valid: false,
      error: 'difficulty_label must be Easy, Medium, or Hard.'
    };
  }

  return { valid: true };
}
