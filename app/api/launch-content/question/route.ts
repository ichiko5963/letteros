// AI Launch Content Question API
// Generates next question based on step and previous answers

import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/ai/gemini';

const QUESTION_PROMPTS: Record<number, (context: { longText: string; answers: string[] }) => string> = {
    2: (ctx) => `あなたはLetterOSのマーケティング戦略AIです。

## ビジネス説明
${ctx.longText}

## これまでの回答
ターゲット設定: ${ctx.answers[0]}

## タスク
「コンセプト設計（どんな未来に連れていくか）」について選択肢を3つ生成してください。
選択されたターゲットに対して提供できる理想の未来を具体的に提案してください。

以下のJSON形式で出力してください:
{
  "question": "選択したターゲットを、どのような理想の未来に連れていきますか？",
  "options": [
    "選択肢1：具体的な理想の未来",
    "選択肢2：別の具体的な理想の未来",
    "選択肢3：さらに別の具体的な理想の未来"
  ]
}`,

    3: (ctx) => `あなたはLetterOSのマーケティング戦略AIです。

## ビジネス説明
${ctx.longText}

## これまでの回答
ターゲット設定: ${ctx.answers[0]}
コンセプト: ${ctx.answers[1]}

## タスク
「顧客のPAIN（最も深刻な痛み）」について選択肢を3つ生成してください。
ターゲット顧客が抱える最も切実な悩みを具体的に提案してください。

以下のJSON形式で出力してください:
{
  "question": "ターゲット顧客が抱える、最も深刻な痛みは何ですか？",
  "options": [
    "選択肢1：具体的なPAIN",
    "選択肢2：別の具体的なPAIN",
    "選択肢3：さらに別の具体的なPAIN"
  ]
}`,

    4: (ctx) => `あなたはLetterOSのマーケティング戦略AIです。

## ビジネス説明
${ctx.longText}

## これまでの回答
ターゲット設定: ${ctx.answers[0]}
コンセプト: ${ctx.answers[1]}
顧客のPAIN: ${ctx.answers[2]}

## タスク
「理想の未来（顧客の理想の状態）」について選択肢を3つ生成してください。
PAINが解決された後の具体的な理想の状態を提案してください。

以下のJSON形式で出力してください:
{
  "question": "顧客のPAINが解決された後、どのような理想の状態になりますか？",
  "options": [
    "選択肢1：具体的な理想の状態",
    "選択肢2：別の具体的な理想の状態",
    "選択肢3：さらに別の具体的な理想の状態"
  ]
}`,
};

export async function POST(request: NextRequest) {
    try {
        const { step, context } = await request.json();

        if (!step || !context) {
            return NextResponse.json(
                { error: 'Step and context are required' },
                { status: 400 }
            );
        }

        if (step < 2 || step > 4) {
            return NextResponse.json(
                { error: 'Invalid step' },
                { status: 400 }
            );
        }

        const model = getGeminiModel();
        const promptGenerator = QUESTION_PROMPTS[step];
        const prompt = promptGenerator(context);

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
        console.error('Question generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate question' },
            { status: 500 }
        );
    }
}
