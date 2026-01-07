// Gemini AI Configuration
// Reference: @docs/04_AI_ML_INNOVATION/PROMPT_ENGINEERING.md

import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined in environment variables');
}

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const AI_CONFIG = {
  model: 'gemini-2.0-flash',
  temperature: 0.7,
  maxOutputTokens: 2000,
} as const;

// Get Gemini model instance
export function getGeminiModel() {
  return genAI.getGenerativeModel({
    model: AI_CONFIG.model,
    generationConfig: {
      temperature: AI_CONFIG.temperature,
      maxOutputTokens: AI_CONFIG.maxOutputTokens,
    },
  });
}
