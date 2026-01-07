// AI Content Generation Utilities (Gemini)
// Reference: @docs/04_AI_ML_INNOVATION/PROMPT_ENGINEERING.md

import { getGeminiModel } from './gemini';
import {
  EDITOR_SYSTEM_PROMPT,
  CONTENT_GENERATION_PROMPT,
  CONTENT_IMPROVEMENT_PROMPT,
  TITLE_GENERATION_PROMPT,
} from './prompts';

export interface GeneratedContent {
  title: string;
  content: string;
}

export interface ImprovedContent {
  title: string;
  content: string;
  improvements: string[];
}

export interface TitleSuggestions {
  titles: string[];
}

/**
 * Generate newsletter content from a topic
 */
export async function generateContent(
  topic: string,
  context?: string
): Promise<GeneratedContent> {
  const model = getGeminiModel();

  const prompt = `${EDITOR_SYSTEM_PROMPT}\n\n${CONTENT_GENERATION_PROMPT(topic, context)}`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  // Parse JSON response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI returned invalid JSON response');
  }

  return JSON.parse(jsonMatch[0]) as GeneratedContent;
}

/**
 * Improve existing newsletter content
 */
export async function improveContent(
  content: string,
  feedback?: string
): Promise<ImprovedContent> {
  const model = getGeminiModel();

  const prompt = `${EDITOR_SYSTEM_PROMPT}\n\n${CONTENT_IMPROVEMENT_PROMPT(content, feedback)}`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  // Parse JSON response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI returned invalid JSON response');
  }

  return JSON.parse(jsonMatch[0]) as ImprovedContent;
}

/**
 * Generate title suggestions for content
 */
export async function generateTitles(content: string): Promise<TitleSuggestions> {
  const model = getGeminiModel();

  const prompt = `${EDITOR_SYSTEM_PROMPT}\n\n${TITLE_GENERATION_PROMPT(content)}`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  // Parse JSON response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI returned invalid JSON response');
  }

  return JSON.parse(jsonMatch[0]) as TitleSuggestions;
}

/**
 * Chat with the Editor AI
 */
export async function chatWithEditor(
  message: string,
  conversationHistory: { role: 'user' | 'model'; parts: string }[] = []
): Promise<string> {
  const model = getGeminiModel();

  const chat = model.startChat({
    history: [
      {
        role: 'user',
        parts: [{ text: EDITOR_SYSTEM_PROMPT }],
      },
      {
        role: 'model',
        parts: [{ text: '了解しました。LetterOSの編集長AIとして、あなたのメルマガ作成をサポートします。' }],
      },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.parts }],
      })),
    ],
  });

  const result = await chat.sendMessage(message);
  const response = result.response;

  return response.text();
}
