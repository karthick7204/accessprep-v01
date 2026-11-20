/**
 * ACCESSPREP-X — Core Examination & Accessibility Constants
 */

export const SSC_MTS_SUBJECTS = [
  'Numerical and Mathematical Ability',
  'Reasoning Ability and Problem Solving',
  'General Awareness',
  'English Language and Comprehension'
] as const;

export type SscMtsSubject = (typeof SSC_MTS_SUBJECTS)[number];

export const EXAM_DURATION_SECONDS = {
  STANDARD: 90 * 60, // 90 minutes (5,400 seconds)
  PWD_COMPENSATORY: 120 * 60, // 120 minutes (7,200 seconds)
  DIAGNOSTIC_STANDARD: 25 * 60, // 25 minutes
  DIAGNOSTIC_PWD: 35 * 60 // 35 minutes
} as const;

export const WAKE_WORD_PHRASES = [
  'hey vision',
  'hi vision',
  'hello vision',
  'okay vision',
  'ok vision'
] as const;
