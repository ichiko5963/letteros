// AI Launch Content Generation API
// Generates final launch content definition from all answers

import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/ai/gemini';

const GENERATE_PROMPT = (name: string, longText: string, answers: string[]) => `あなたはLetterOSのマーケティング戦略AIです。
以下の情報を基に、完全なローンチコンテンツ定義を生成してください。

## ローンチコンテンツ名
${name}

## ビジネス説明
${longText}

## ユーザーの選択
1. ターゲット設定: ${answers[0]}
2. コンセプト: ${answers[1]}
3. 顧客のPAIN: ${answers[2]}
4. 理想の未来: ${answers[3]}

## タスク
上記の情報を基に、LetterOSの発信定義を完全に生成してください。
各フィールドは具体的で実用的な内容にしてください。

以下のJSON形式で出力してください:
{
  "name": "${name}",
  "description": "このローンチコンテンツの説明（2-3文）",
  "targetAudience": "具体的なターゲット読者の説明",
  "valueProposition": "提供する価値の説明",
  "tone": "storytelling",
  "coreMessage": "一貫して伝えるコアメッセージ",
  "launchContent": {
    "concept": "コンセプト（一言で端的に表したもの）",
    "targetPain": "顧客のPAIN（切実な悩み）",
    "currentState": "顧客の現状（PAINを抱えている状態）",
    "idealFuture": "理想の未来（PAINが解決された状態）",
    "generatedBy": "ai",
    "aiAnswers": {
      "step1": "${answers[0]}",
      "step2": "${answers[1]}",
      "step3": "${answers[2]}",
      "step4": "${answers[3]}"
    }
  }
}`;

export async function POST(request: NextRequest) {
    try {
        const { name, longText, answers } = await request.json();

        if (!name || !longText || !answers || answers.length !== 4) {
            return NextResponse.json(
                { error: 'Name, longText, and 4 answers are required' },
                { status: 400 }
            );
        }

        const model = getGeminiModel();
        const prompt = GENERATE_PROMPT(name, longText, answers);

        const result = await model.generateContent(prompt);
        const response = result.response;
        const responseText = response.text();

        // Parse JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('AI returned invalid JSON response');
        }

        const content = JSON.parse(jsonMatch[0]);

        return NextResponse.json({ content });
    } catch (error) {
        console.error('Generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate content' },
            { status: 500 }
        );
    }
}
