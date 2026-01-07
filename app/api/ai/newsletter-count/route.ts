// API endpoint for AI-powered newsletter count suggestion
// Analyzes launch content and suggests optimal number of newsletters

import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/ai/gemini';

const COUNT_SUGGESTION_PROMPT = (launchContent: any) => `
あなたはメールマーケティングの専門家です。以下のローンチコンテンツを分析し、効果的なメルマガシリーズの通数を提案してください。

【ローンチコンテンツ情報】
名前: ${launchContent.name || '未設定'}
説明: ${launchContent.description || '未設定'}
ターゲット: ${launchContent.targetAudience || '未設定'}
提供価値: ${launchContent.valueProposition || '未設定'}
コンセプト: ${launchContent.concept || '未設定'}
顧客のPAIN: ${launchContent.targetPain || '未設定'}

【通数の目安】
- 1通: 単発の告知・リマインダー
- 2通: 1日のセミナー・イベント（興味喚起→参加促進）
- 3通: 2日間のセミナーまたは商品プリローンチ
- 4通: 長期プログラム・高額商品・複数日イベント
- 5通: 大型キャンペーン・フルファネルローンチ

以下のJSON形式で回答してください。他のテキストは含めないでください:
{
  "recommended": 3,
  "reasoning": "このローンチコンテンツの内容から判断した理由",
  "options": [
    {"count": 2, "name": "コンパクト", "description": "興味喚起→行動促進の2ステップ"},
    {"count": 3, "name": "スタンダード", "description": "認知→理解→行動の3ステップ（推奨）"},
    {"count": 4, "name": "じっくり", "description": "信頼構築を重視した4ステップ"}
  ]
}
`;

export async function POST(request: NextRequest) {
    try {
        const { launchContent } = await request.json();

        if (!launchContent) {
            return NextResponse.json(
                { error: 'ローンチコンテンツが必要です' },
                { status: 400 }
            );
        }

        const model = getGeminiModel();
        const prompt = COUNT_SUGGESTION_PROMPT(launchContent);

        const result = await model.generateContent(prompt);
        const response = result.response;
        const responseText = response.text();

        // Parse JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse AI response as JSON');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        return NextResponse.json(parsed);
    } catch (error) {
        console.error('Newsletter count suggestion error:', error);

        // Fallback response
        return NextResponse.json({
            recommended: 3,
            reasoning: '一般的なローンチには3通のシリーズが効果的です',
            options: [
                { count: 2, name: 'コンパクト', description: '興味喚起→行動促進の2ステップ' },
                { count: 3, name: 'スタンダード', description: '認知→理解→行動の3ステップ' },
                { count: 4, name: 'じっくり', description: '信頼構築を重視した4ステップ' },
            ],
        });
    }
}
