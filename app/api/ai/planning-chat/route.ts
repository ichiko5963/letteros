// API endpoint for conversational planning chat
// AI asks questions to fill in gaps based on marketing.md principles

import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/ai/gemini';

const PLANNING_CHAT_PROMPT = (launchContent: any, chatHistory: any[], newsletterCount: number, forceComplete: boolean, turnCount: number) => `
あなたは「LetterOS」のAI編集長です。マーケティングの専門家として、ユーザーがメルマガ企画を完成させる手助けをします。

【重要な原則】（marketing.mdより）
1. メルマガは読者の意思決定を"一方向に少しだけ動かす装置"
2. 1メルマガ = 1論点。複数のことを教えない
3. 意見ではなく判断材料（Proof）を提供
4. 上流（思想）→ 中流（戦略）→ 下流（文章）の順序を守る

【ローンチコンテンツ情報】
名前: ${launchContent.name || '未設定'}
説明: ${launchContent.description || '未設定'}
ターゲット読者: ${launchContent.targetAudience || '未設定'}
提供価値: ${launchContent.valueProposition || '未設定'}
コンセプト: ${launchContent.concept || '未設定'}
顧客のPAIN: ${launchContent.targetPain || '未設定'}
顧客の現状: ${launchContent.currentState || '未設定'}
理想の未来: ${launchContent.idealFuture || '未設定'}

【選択された通数】${newsletterCount}通

【これまでの会話】(${turnCount}ターン目)
${chatHistory.map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`).join('\n')}

${forceComplete || turnCount >= 5 ? `
【重要指示】
ユーザーが企画の完成を希望しています。または十分な情報が集まりました。
これ以上質問せず、今ある情報を最大限活用して${newsletterCount}通の企画を提案してください。
不足している情報は合理的に推測してください。

必ず以下のJSON形式で回答してください:
{
  "type": "proposal",
  "newsletters": [
    {
      "number": 1,
      "subject": "件名案",
      "mainPoint": "このメールの1つの論点",
      "targetBelief": "変えたい読者の認識",
      "proof": "根拠として使う要素",
      "cta": "取らせたい行動"
    }
  ]
}
` : `
【あなたのタスク】
1. ローンチコンテンツと会話履歴を分析
2. ${newsletterCount}通のメルマガシリーズを作るために足りない情報を特定
3. 1つの具体的な質問をする（残り最大${10 - turnCount}回の質問が可能）

質問すべき観点（優先順）:
- 読者の現在の誤解や迷いは何か？
- 読後に取らせたい具体的な行動（CTA）は？
- 主張を裏付ける根拠（Proof）は？
- イベント・セミナーの日程や詳細は？

十分な情報が集まったと判断したら、以下のJSON形式で企画を提案:
{
  "type": "proposal",
  "newsletters": [
    {
      "number": 1,
      "subject": "件名案",
      "mainPoint": "このメールの1つの論点",
      "targetBelief": "変えたい読者の認識",
      "proof": "根拠として使う要素",
      "cta": "取らせたい行動"
    }
  ]
}

まだ質問が必要な場合:
{
  "type": "question",
  "question": "具体的な質問",
  "reason": "なぜこの質問が必要か"
}
`}
`;

export async function POST(request: NextRequest) {
    try {
        const { launchContent, chatHistory = [], newsletterCount = 3, forceComplete = false } = await request.json();

        if (!launchContent) {
            return NextResponse.json(
                { error: 'ローンチコンテンツが必要です' },
                { status: 400 }
            );
        }

        // Count user turns
        const turnCount = chatHistory.filter((m: any) => m.role === 'user').length;

        // Force complete after 10 turns max
        const shouldForceComplete = forceComplete || turnCount >= 10;

        const model = getGeminiModel();
        const prompt = PLANNING_CHAT_PROMPT(launchContent, chatHistory, newsletterCount, shouldForceComplete, turnCount);

        const result = await model.generateContent(prompt);
        const response = result.response;
        const responseText = response.text();

        // Try to parse JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                return NextResponse.json({ ...parsed, turnCount });
            } catch {
                // Fall through to text response
            }
        }

        // If we should force complete but AI didn't return proposal, create a basic one
        if (shouldForceComplete) {
            return NextResponse.json({
                type: 'proposal',
                turnCount,
                newsletters: Array.from({ length: newsletterCount }, (_, i) => ({
                    number: i + 1,
                    subject: `${launchContent.name || 'メルマガ'} - 第${i + 1}通`,
                    mainPoint: launchContent.valueProposition || '価値を伝える',
                    targetBelief: launchContent.targetPain || '読者の課題',
                    proof: '実績・事例',
                    cta: 'お問い合わせ',
                })),
            });
        }

        // Return as plain text question
        return NextResponse.json({
            type: 'question',
            question: responseText.trim(),
            reason: 'メルマガ企画を完成させるために必要な情報を収集しています',
            turnCount,
        });
    } catch (error) {
        console.error('Planning chat error:', error);
        return NextResponse.json(
            { error: 'Failed to process planning chat' },
            { status: 500 }
        );
    }
}

