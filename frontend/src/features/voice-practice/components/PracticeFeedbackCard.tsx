/**
 * ACCESSPREP-X — Voice Practice Immediate Feedback Card
 * ============================================================================
 * High-visibility explanation card for Voice Practice questions.
 * Backwards-compatible wrapper around AccessibleExplanationCard.
 */

import React from 'react';
import { AccessibleExplanationCard } from '../../../components/common/AccessibleExplanationCard.tsx';

export interface PracticeFeedbackCardProps {
  isCorrect: boolean;
  correctOption: string;
  explanation: string;
  questionText?: string;
  selectedOption?: string | null;
  selectedOptionText?: string;
  correctOptionText?: string;
  simplifiedExplanation?: string;
  subject?: string;
  topic?: string;
  onReadAloud?: () => void;
}

export function PracticeFeedbackCard({
  isCorrect,
  correctOption,
  explanation,
  questionText,
  selectedOption,
  selectedOptionText,
  correctOptionText,
  simplifiedExplanation,
  subject,
  topic,
  onReadAloud
}: PracticeFeedbackCardProps) {
  return (
    <AccessibleExplanationCard
      isCorrect={isCorrect}
      correctOption={correctOption}
      correctOptionText={correctOptionText}
      explanation={explanation}
      questionText={questionText}
      selectedOption={selectedOption}
      selectedOptionText={selectedOptionText}
      simplifiedExplanation={simplifiedExplanation}
      subject={subject}
      topic={topic}
      marksAwarded={isCorrect ? 3 : 0}
      onReadAloud={onReadAloud}
      className="my-3"
    />
  );
}
