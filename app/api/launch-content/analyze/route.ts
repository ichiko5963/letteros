// AI Launch Content Analysis API
// Analyzes long text and generates first question

import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/ai/gemini';

const ANALYZE_PROMPT = (text: string, name: string) => `あなたはLetterOSのマーケティング戦略AIです。
以下のビジネス説明を分析し、ターゲット設定に関する質問を生成してください。

## ビジネス説明
${text}

## ローンチコンテンツ名
${name}

## タスク
この説明を分析し、「誰を助けたいか（ターゲット設定）」について選択肢を3つ生成してください。
選択肢は具体的で、それぞれ異なるターゲット像を提案してください。

以下のJSON形式で出力してください:
{
  "question": "あなたが最も助けたいと思う顧客は、どのような人ですか？",
  "options": [
    "選択肢1：具体的なターゲット像",
    "選択肢2：別の具体的なターゲット像",
    "選択肢3：さらに別の具体的なターゲット像"
  ]
}`;

export async function POST(request: NextRequest) {
    try {
        const { text, name } = await request.json();

        if (!text || !name) {
            return NextResponse.json(
                { error: 'Text and name are required' },
                { status: 400 }
            );
        }

        const model = getGeminiModel();
        const prompt = ANALYZE_PROMPT(text, name);

        const result = await model.generateContent(prompt);
        const response = result.response;
        const responseText = response.text();

        // Parse JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('AI returned invalid JSON response');
        }

        const question = JSON.parse(jsonMatch[0]);

        return NextResponse.json({ question });
    } catch (error) {
        console.error('Analysis error:', error);
        return NextResponse.json(
            { error: 'Failed to analyze content' },
            { status: 500 }
        );
    }
}
