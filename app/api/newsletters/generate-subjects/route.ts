// API endpoint for AI-powered subject line generation
// Generates multiple subject line options based on newsletter content

import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/ai/gemini';

const SUBJECT_PROMPT = (content: string, productContext?: string) => `
あなたはメールマーケティングの専門家です。以下のメルマガ本文を分析し、開封率を最大化する件名を3つ提案してください。

${productContext ? `【発信主体のコンテキスト】
${productContext}

` : ''}【メルマガ本文】
${content.slice(0, 2000)}

【件名作成のルール】
1. 各件名は40文字以内
2. 好奇心を刺激する
3. 具体的な数字やベネフィットを含める
4. 緊急性や限定感を適度に使う
5. 3つの件名はそれぞれ異なるアプローチで作成:
   - パターンA: 好奇心・疑問形
   - パターンB: ベネフィット訴求
   - パターンC: ストーリー・共感

必ず以下のJSON形式で回答してください。他のテキストは一切含めないでください:
{
  "subjects": [
    {"id": "a", "text": "件名A", "approach": "好奇心・疑問形", "reason": "このアプローチを選んだ理由"},
    {"id": "b", "text": "件名B", "approach": "ベネフィット訴求", "reason": "このアプローチを選んだ理由"},
    {"id": "c", "text": "件名C", "approach": "ストーリー・共感", "reason": "このアプローチを選んだ理由"}
  ]
}
`;

export async function POST(request: NextRequest) {
    try {
        const { content, productContext } = await request.json();

        if (!content || content.trim().length < 50) {
            return NextResponse.json(
                { error: '本文が短すぎます（50文字以上必要）' },
                { status: 400 }
            );
        }

        const model = getGeminiModel();
        const prompt = SUBJECT_PROMPT(content, productContext);

        const result = await model.generateContent(prompt);
        const response = result.response;
        const responseText = response.text();

        // Parse JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse AI response as JSON');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        return NextResponse.json({
            subjects: parsed.subjects,
        });
    } catch (error) {
        console.error('Subject generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate subjects' },
            { status: 500 }
        );
    }
}
