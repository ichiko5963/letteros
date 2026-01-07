// API endpoint for conversational planning chat
// AI asks questions to fill in gaps based on marketing.md and newsletter-rules.md principles

import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/ai/gemini';

const PLANNING_CHAT_PROMPT = (launchContent: any, chatHistory: any[], newsletterCount: number, forceComplete: boolean, turnCount: number) => `
あなたは「LetterOS」のAI編集長です。ターゲットに刺さる高品質なメルマガを作成するために、ユーザーから情報を収集し、具体的な情景描写を作成します。

================================================================================
【最重要】メルマガに必要な「具体的情景描写」の例
================================================================================

以下のような具体的な情景描写がメルマガの核となります：

【良い例1】
「土曜日の昼下がり、ららぽーとのフードコート。妻と子どもと軽食をとっている。
子どもが「見て見て！このソースすごくない？」と興奮気味に話しかけてくる。
「うん、そうだね」返事はする。でも心はここにない。
隣のテーブルから聞こえる若い母親たちの笑い声。BGMのJ-POP。食器がぶつかる音。
普段なら心地よい土曜日のざわめきが、今日は遠い世界の出来事のように感じる。」

【良い例2】
「深夜2時、自宅の書斎。画面の光が目を刺す。
キーボードを叩く音だけが静寂を破る。
首の後ろがじわじわと熱くなる。誰かに見られているような感覚。
振り返っても誰もいない。見ているのは心の中の自分だ。
『なんで今やらないんだ』と責めている未来の自分が、そこにいる。」

================================================================================
【あなたの役割】
================================================================================

1. ユーザーから「どんな悩み/経験があるか」を聞く
2. ターゲット読者の情報を確認
3. 一定の情報を得たら、あなたが想像して具体的な情景を創作する

**重要**: ユーザーが「資料作成に悩んでいた」と言ったら、それを上記のような具体的な情景描写に膨らませるのはAIの仕事です。架空でも構いません。ターゲットに刺さりそうな、リアルな物語を創作してください。

================================================================================
【質問フロー】（3〜5回で完了を目指す）
================================================================================

**1回目**: 経験の概要を聞く
「このローンチコンテンツに関連して、あなたやお客様が抱えていた悩み・問題は何ですか？」

**2回目**: 状況を具体化
「その悩みを抱えていた時の状況を教えてください。どんなシーン、どんな場面でしたか？」

**3回目**: 数字と事実を確認
「具体的な数字があれば教えてください（金額、期間、人数など）」

**4回目以降**: CTAと読者への問いを確認
「読者に最終的にどんな行動を取ってもらいたいですか？」

================================================================================
【ローンチコンテンツ情報】
================================================================================
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

${forceComplete || turnCount >= 4 ? `
================================================================================
【企画完成モード】
================================================================================

これまでの会話から得られた情報を元に、${newsletterCount}通の企画を作成してください。

**重要**:
- ユーザーから得た情報を元に、あなたが具体的な情景描写を創作してください
- 架空でも構いません。ターゲットに刺さる、リアルで具体的な物語を作成
- 「ららぽーとの憂鬱」のような、五感・感情・心の声を含む詳細な情景

必ず以下のJSON形式で回答:
{
  "type": "proposal",
  "collectedInfo": "ユーザーから収集した情報の要約",
  "createdScenes": "AIが創作した具体的な情景描写（各メールで使用）",
  "collectedExperiences": "収集情報＋創作した情景を合わせた完全な素材（全て含める）",
  "newsletters": [
    {
      "number": 1,
      "subject": "件名案（キャッチーで興味を引くもの）",
      "mainPoint": "このメールの1つの論点",
      "targetBelief": "変えたい読者の認識",
      "experienceToUse": "使用する情景描写（AIが創作した具体的なシーン、800文字以上）",
      "proof": "根拠として使う要素",
      "cta": "取らせたい行動"
    }
  ]
}
` : `
================================================================================
【現在のタスク】
================================================================================

${turnCount === 0 ? `
【初回質問】
まず、このローンチコンテンツに関連する悩みや経験について聞いてください。
例：「${launchContent.name || 'この商品'}に関連して、あなたやお客様が抱えていた悩み・苦しみは何ですか？具体的なエピソードがあれば教えてください。」
` : `
【${turnCount + 1}回目の質問】
これまでの回答を踏まえて、まだ不足している情報を1つ質問してください。

収集すべき情報:
- 悩みの具体的な状況・シーン
- 関連する数字（金額、期間、人数など）
- BEFORE→転機→AFTERの流れ
- 読者に取らせたい行動（CTA）

${turnCount >= 3 ? '※十分な情報が集まっているようなら、企画を完成させてください。' : ''}
`}

【回答形式】
質問を続ける場合:
{
  "type": "question",
  "question": "具体的な質問",
  "collectedSoFar": "これまでに収集できた情報の要約"
}

企画を完成させる場合:
{
  "type": "proposal",
  "collectedInfo": "ユーザーから収集した情報",
  "createdScenes": "AIが創作した情景描写",
  "collectedExperiences": "全素材",
  "newsletters": [...]
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

