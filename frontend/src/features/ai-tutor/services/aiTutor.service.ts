/**
 * ACCESSPREP-X — AI Tutor Scribe Service
 * Isolates Gemini API communication & prompt construction from the UI layer.
 */

import { apiPost } from '../../../services/api/apiClient.service.ts';

export interface TutorMessage {
  id: string;
  sender: 'user' | 'tutor';
  text: string;
  timestamp: string;
}

export interface TutorQueryPayload {
  userId?: string;
  message: string;
  subject?: string;
  conversationHistory?: Array<{ role: 'user' | 'model'; text: string }>;
}

export interface TutorQueryResponse {
  reply: string;
  source?: string;
}

export function buildSocraticTutorPrompt(subject: string, userMessage: string): string {
  return `You are an accessible SSC MTS AI Tutor Scribe for blind and visually impaired students studying ${subject}. Keep explanations clear, structured for Text-to-Speech, and step-by-step without visual-only diagrams. Student question: ${userMessage}`;
}

export async function sendTutorMessage(
  payload: TutorQueryPayload,
  customApiKey?: string
): Promise<TutorQueryResponse> {
  const headers: Record<string, string> = {};
  if (customApiKey) {
    headers['x-gemini-api-key'] = customApiKey;
  }
  return apiPost<TutorQueryResponse, TutorQueryPayload>('/api/tutor/chat', payload, headers);
}
