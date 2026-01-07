// API endpoint for conversational planning chat
// AI asks questions to fill in gaps based on marketing.md and newsletter-rules.md principles

import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/ai/gemini';

const PLANNING_CHAT_PROMPT = (launchContent: any, chatHistory: any[], newsletterCount: number, forceComplete: boolean, turnCount: number) => `
あなたは「LetterOS」のAI編集長です。メルマガの素材となる「日常の一コマ」を集めます。

================================================================================
【最重要】メルマガに使う「日常の一コマ」とは？
================================================================================

メルマガの冒頭は、読者が共感できる「日常のワンシーン」から始まります。

【良い例：ららぽーとの憂鬱】
土曜日の昼下がり、ららぽーとのフードコート。妻と子どもと軽食をとっている。
子どもが「見て見て！このソースすごくない？」と興奮気味に話しかけてくる。
「うん、そうだね」返事はする。でも心はここにない。
→ 楽しいはずの家族の時間なのに、仕事のことが頭から離れない...

このような「日常の場面」と「悩みがどう入り込むか」を聞き出します。

================================================================================
【質問のルール】
================================================================================

1. **質問は短く、シンプルに** - 長々と聞かない
2. **「具体的に」を連発しない** - 疲れさせない
3. **日常の一コマを必ず聞く** - 2回目で聞く
4. **JSONは絶対に出力しない**（forceCompleteモード以外）

================================================================================
【ローンチコンテンツ情報】
================================================================================
名前: ${launchContent.name || '未設定'}
説明: ${launchContent.description || '未設定'}
ターゲット: ${launchContent.targetAudience || '未設定'}
コンセプト: ${launchContent.concept || '未設定'}
顧客のPAIN: ${launchContent.targetPain || '未設定'}

【これまでの会話】(${turnCount}ターン目)
${chatHistory.map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`).join('\n')}

${forceComplete ? `
================================================================================
【企画完成モード】- 必ず${newsletterCount}通分のJSON形式で出力
================================================================================

これまでの会話で収集した全ての情報を活用して、必ず${newsletterCount}通の企画を作成してください。

**ルール**:
- 架空の人物名は使わない（主語は「私」「あなた」）
- 日常の場面 + そこに入り込む悩み という構成で描写
- ユーザーが語った経験を元に、${newsletterCount}通それぞれで異なる切り口で書く
- 必ず${newsletterCount}個のnewslettersを配列に含める

**収集した経験（これを全て活用）**:
${chatHistory.filter(m => m.role === 'user').map(m => m.content).join('\n\n')}

以下のJSON形式のみを出力してください:
{
  "type": "proposal",
  "collectedExperiences": "収集した全ての経験の詳細な要約（日常の一コマ + 悩み + 感情）",
  "newsletters": [
    ${Array.from({ length: newsletterCount }, (_, i) => `{
      "number": ${i + 1},
      "subject": "${i + 1}通目の件名（50文字以内）",
      "mainPoint": "${i + 1}通目で伝えるポイント",
      "targetBelief": "変えたい認識",
      "experienceToUse": "使用する経験（日常の一コマから始まる具体的な描写）",
      "proof": "根拠",
      "cta": "行動"
    }`).join(',\n    ')}
  ]
}
` : `
================================================================================
【質問フロー】
================================================================================

${turnCount === 0 ? `
【1回目】悩みをざっくり聞く
シンプルに聞いてください。例：
「${launchContent.name || 'このサービス'}を作ろうと思ったきっかけって何ですか？どんな悩みがあったんですか？」
` : turnCount === 1 ? `
【2回目】★日常の一コマを聞く★（最重要）
「その悩みを抱えている時、休日や家族との時間で、ふと仕事のことが頭をよぎった経験ってありますか？どんな場面でしたか？」

または
「その問題を抱えている時、プライベートの時間でも心ここにあらずだった経験ってありますか？」

短く聞いてください。
` : turnCount === 2 ? `
【3回目】日常と悩みの関係を聞く
「その場面で、どんなことが頭をよぎっていましたか？」
または
「その時、どんな気持ちでしたか？」

短く聞いてください。
` : `
【${turnCount + 1}回目】
十分な素材が集まっていれば：
「ありがとうございます！いい素材が集まりました。これでメルマガを作成しますね。」

まだ足りなければ、1つだけ補足質問。
`}

**出力**: 質問文だけを出力。JSONは絶対に出力しない。
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

