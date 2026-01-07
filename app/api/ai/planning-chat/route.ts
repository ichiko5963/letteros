// API endpoint for conversational planning chat
// AI asks questions to fill in gaps based on marketing.md and newsletter-rules.md principles

import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/ai/gemini';

const PLANNING_CHAT_PROMPT = (launchContent: any, chatHistory: any[], newsletterCount: number, forceComplete: boolean, turnCount: number) => `
あなたは「LetterOS」のAI編集長です。ユーザー自身の経験を深掘りして、メルマガの素材を集めます。

================================================================================
【最重要ルール】
================================================================================

1. **ユーザー自身の経験だけを聞く** - 架空の人物（友香さん、田中さん等）は絶対に作らない
2. **主語は常に「あなた」「私」** - ユーザーの体験を深掘りする
3. **質問は普通の日本語で** - JSONやコードは絶対に出力しない
4. **1回の質問で1つだけ聞く** - シンプルに会話する

================================================================================
【深掘りの例】
================================================================================

ユーザー「資料作成に悩んでました」
→ 「その資料作成、どんな場面で一番ストレスを感じましたか？例えば、深夜に一人で作業している時とか、締め切り前日とか...」

ユーザー「締め切り前日が辛かったです」
→ 「締め切り前日、具体的にどんな状況でしたか？何時頃まで作業して、その時どんな気持ちでしたか？」

ユーザー「深夜2時まで作業して、もう無理だと思った」
→ 「深夜2時...その時、周りはどんな状況でしたか？家族は寝ていた？画面を見ながら何を考えていましたか？」

→ こうやって、ユーザーの体験を五感レベルまで具体化していく

================================================================================
【ローンチコンテンツ情報】
================================================================================
名前: ${launchContent.name || '未設定'}
説明: ${launchContent.description || '未設定'}
ターゲット読者: ${launchContent.targetAudience || '未設定'}
提供価値: ${launchContent.valueProposition || '未設定'}
コンセプト: ${launchContent.concept || '未設定'}
顧客のPAIN: ${launchContent.targetPain || '未設定'}
LP/申込URL: ${launchContent.lpUrl || '未設定'}
価格: ${launchContent.price || '未設定'}

【選択された通数】${newsletterCount}通

【これまでの会話】(${turnCount}ターン目)
${chatHistory.map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`).join('\n')}

${forceComplete ? `
================================================================================
【企画完成モード】- JSON形式で出力
================================================================================

これまでの会話で収集したユーザーの経験を元に、${newsletterCount}通の企画を作成してください。

**絶対ルール**:
- 架空の人物名（友香さん、田中さん等）は使わない
- 主語は全て「私」「あなた」
- ユーザーが語った経験をそのまま活かし、より具体的に描写する
- ユーザーが語っていない細部（時間、場所、感情）は補完してOK

必ず以下のJSON形式で回答してください:
{
  "type": "proposal",
  "collectedExperiences": "ユーザーから収集した経験の要約（500文字以上）",
  "newsletters": [
    {
      "number": 1,
      "subject": "興味を引く件名（50文字以内）",
      "mainPoint": "このメールで伝える1つのポイント",
      "targetBelief": "変えたい読者の認識",
      "experienceToUse": "使用するユーザーの経験（具体的に800文字以上で描写）",
      "proof": "根拠",
      "cta": "取らせたい行動"
    }
  ]
}
` : `
================================================================================
【現在のタスク】- 普通の日本語で質問する（JSONは出力しない）
================================================================================

${turnCount === 0 ? `
【初回】
「${launchContent.name || 'この商品・サービス'}」に関連して、あなた自身が経験した悩みや課題を聞いてください。
フレンドリーに、1つだけ質問してください。
` : turnCount < 3 ? `
【${turnCount + 1}回目】
ユーザーの回答を受けて、さらに具体的な状況を深掘りしてください。
- いつ？どこで？
- その時どんな気持ちだった？
- 周りの状況は？
- 具体的な数字（時間、金額、回数）は？

1つだけ質問してください。JSONは出力しないでください。
` : `
【${turnCount + 1}回目】
十分な情報が集まっているか確認してください。
- まだ深掘りが必要なら、追加で1つ質問
- 十分なら「ありがとうございます！いい素材が集まりました。これでメルマガを作成しますね。」と伝える

JSONは出力しないでください。
`}

**出力**: 普通の日本語で質問文だけを出力してください。JSONやコードブロックは絶対に出力しないでください。
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

        // Only force complete if explicitly requested (no auto-complete by turn count)
        // This allows thorough experience gathering
        const shouldForceComplete = forceComplete;

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
                // Include full chat history in response for later use
                return NextResponse.json({
                    ...parsed,
                    turnCount,
                    fullChatHistory: chatHistory
                });
            } catch {
                // Fall through to text response
            }
        }

        // If we should force complete but AI didn't return proposal, create a basic one
        if (shouldForceComplete) {
            // Summarize all collected experiences from chat history
            const userMessages = chatHistory
                .filter((m: any) => m.role === 'user')
                .map((m: any) => m.content)
                .join('\n\n');

            return NextResponse.json({
                type: 'proposal',
                turnCount,
                collectedExperiences: userMessages,
                fullChatHistory: chatHistory,
                newsletters: Array.from({ length: newsletterCount }, (_, i) => ({
                    number: i + 1,
                    subject: `${launchContent.name || 'メルマガ'} - 第${i + 1}通`,
                    mainPoint: launchContent.valueProposition || '価値を伝える',
                    targetBelief: launchContent.targetPain || '読者の課題',
                    experienceToUse: userMessages,
                    proof: '実績・事例',
                    cta: 'お問い合わせ',
                })),
            });
        }

        // Return as plain text question
        return NextResponse.json({
            type: 'question',
            question: responseText.trim(),
            reason: 'あなたの経験を詳しく教えてください',
            turnCount,
            fullChatHistory: chatHistory,
        });
    } catch (error) {
        console.error('Planning chat error:', error);
        return NextResponse.json(
            { error: 'Failed to process planning chat' },
            { status: 500 }
        );
    }
}

