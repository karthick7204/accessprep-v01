/**
 * ACCESSPREP-X — AI Syllabus Tutor Backend Service
 */

import '../config/env.config.ts';
import { GoogleGenAI } from '@google/genai';
import { loadQuestions } from '../repositories/index.ts';

let geminiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
  try {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } catch {
    geminiClient = null;
  }
}

export function getGeminiClient(): GoogleGenAI | null {
  return geminiClient;
}

export function setGeminiApiKey(apiKey: string): void {
  process.env.GEMINI_API_KEY = apiKey;
  geminiClient = new GoogleGenAI({ apiKey });
}

export function selectGroundedContextQuestions(subject?: string, topic?: string) {
  const allQuestions = loadQuestions();
  let relevant = allQuestions.filter((q) => {
    if (subject && q.subject.toLowerCase() !== subject.toLowerCase()) return false;
    if (topic && q.topic.toLowerCase() !== topic.toLowerCase()) return false;
    return true;
  });
  return relevant.length === 0 ? allQuestions.slice(0, 3) : relevant.slice(0, 3);
}
