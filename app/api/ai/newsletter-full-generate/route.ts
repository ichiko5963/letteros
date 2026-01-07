// API endpoint for full newsletter generation
// Based on: @docs/newsletter-rules.md, @docs/newsletter-sequence-patterns.md
// Generates complete newsletter content including subject and body

import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/ai/gemini';

interface NewsletterPlan {
    number: number;
    subject: string;
    mainPoint: string;
    targetBelief: string;
    experienceToUse: string;
    proof: string;
    cta: string;
}

interface GenerateRequest {
    launchContent: {
        name: string;
        description?: string;
        targetAudience?: string;
        valueProposition?: string;
        concept?: string;
        targetPain?: string;
        currentState?: string;
        idealFuture?: string;
    };
    newsletterCount: number;
    newsletterPlans: NewsletterPlan[];
    collectedExperiences: string;
    chatHistory: Array<{ role: string; content: string }>;
}

// Master prompt incorporating all rules from newsletter-rules.md and newsletter-sequence-patterns.md
const NEWSLETTER_GENERATION_PROMPT = (
    request: GenerateRequest,
    newsletterNumber: number,
    sequencePatternGuide: string
) => `
あなたは高品質メルマガ作成の専門家です。以下のルールと情報に基づいて、${request.newsletterCount}通シーケンスの${newsletterNumber}通目のメルマガを作成してください。

================================================================================
【最重要】架空でもリアルな具体的情景描写を作成すること
================================================================================

以下のような具体的な情景描写がメルマガの核となります。ユーザーから収集した情報を元に、
**あなたが想像力を駆使して、架空でもリアルに感じる具体的なシーンを創作してください。**

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
【絶対に守るべきルール】
================================================================================

1. 【構成の原則】
   - 必ず上記のような具体的な情景描写から始める（時間、場所、状況を明確に）
   - 問題提起 → 共感 → 解決策（または次への期待）→ 行動喚起 の流れ
   - 1通で1つのメッセージに集中する
   - 最低3000文字以上（理想は3500〜5000文字）

2. 【経験談の盛り込み】（最重要）
   - ユーザーから収集した情報を元に、あなたが具体的な情景を創作する
   - **架空でも構いません。ターゲットに刺さる、リアルで具体的な物語を作成**
   - 経験談パートは最低800〜1500文字
   - 含めるべき要素:
     - 具体的な状況描写（いつ、どこで、誰と、何をしていたか）
     - 感情の動き（その時何を感じたか）
     - 対話の再現（実際の会話）
     - 五感の表現（見た、聞いた、感じたこと）
     - 内面の葛藤（迷い、不安、期待など）

3. 【具体性の原則】
   - 具体的な数字を3つ以上必ず入れる（金額、人数、期間など）
   - 固有名詞を使う（場所名、ツール名、人物のイニシャルなど）
   - 時間を明確にする（曜日、時刻、季節など）
   - 抽象的な表現は禁止（「たくさん」「少し」「多くの」は使わない）

4. 【感情表現】
   - 率直に感情を表現する
   - 「...」「。。。」で余韻を残す
   - 短い文で感情を強調（「でも違った。」「これが、現実です。」）
   - 問題 → 葛藤 → 転機 → 解決の感情の流れを作る

5. 【読者との対話】
   - 問いかけを最低2回は入れる
   - 「あなたも」「あなたにも」という二人称で語りかける
   - 読者が「これ、私のことだ」と思える描写をする

6. 【CTA（行動喚起）】
   - メールの最後に必ず明確な次のアクションを提示
   - 追伸（PS）で追加の価値提供とさらなる行動喚起

================================================================================
【${request.newsletterCount}通シーケンスの構成ガイド】
================================================================================

${sequencePatternGuide}

================================================================================
【今回のメルマガの企画情報】
================================================================================

■ ローンチコンテンツ
- 名前: ${request.launchContent.name}
- 説明: ${request.launchContent.description || '未設定'}
- ターゲット読者: ${request.launchContent.targetAudience || '未設定'}
- 提供価値: ${request.launchContent.valueProposition || '未設定'}
- コンセプト: ${request.launchContent.concept || '未設定'}
- 顧客のPAIN: ${request.launchContent.targetPain || '未設定'}
- 顧客の現状: ${request.launchContent.currentState || '未設定'}
- 理想の未来: ${request.launchContent.idealFuture || '未設定'}

■ ${newsletterNumber}通目の企画
${request.newsletterPlans[newsletterNumber - 1] ? `
- 論点: ${request.newsletterPlans[newsletterNumber - 1].mainPoint}
- 変えたい読者の認識: ${request.newsletterPlans[newsletterNumber - 1].targetBelief}
- 使用する経験談: ${request.newsletterPlans[newsletterNumber - 1].experienceToUse}
- 根拠（Proof）: ${request.newsletterPlans[newsletterNumber - 1].proof}
- CTA: ${request.newsletterPlans[newsletterNumber - 1].cta}
` : '企画情報なし'}

================================================================================
【ユーザーから収集した経験談・情報（壁打ちの全内容）】
================================================================================

${request.collectedExperiences}

【壁打ちの会話履歴】
${request.chatHistory.map(m => `${m.role === 'user' ? '👤' : '🤖'}: ${m.content}`).join('\n\n')}

================================================================================
【出力形式】
================================================================================

以下のJSON形式で出力してください。件名はあなたが最適なものを1つ決定してください：

{
  "subject": "件名（50文字以内、興味を引く魅力的なもの）",
  "body": "本文（3000文字以上、Markdown形式）",
  "wordCount": 文字数,
  "qualityCheck": {
    "hasSceneDescription": true/false,
    "experienceWordCount": 経験談部分の文字数,
    "numberCount": 含まれる具体的数字の数,
    "hasQuestions": true/false,
    "hasCta": true/false,
    "hasPs": true/false
  }
}

================================================================================
【重要な注意事項】
================================================================================

1. 収集した経験談は必ず本文に組み込んでください。省略は禁止です。
2. 具体的な情景描写で始めてください（抽象的な導入は禁止）
3. シーケンスの他の通との一貫性を保ってください
4. ${newsletterNumber > 1 ? `これは${newsletterNumber}通目なので、前の通からの流れを意識してください` : 'これは1通目なので、問題提起と共感に重点を置いてください'}
5. ${newsletterNumber < request.newsletterCount ? '次のメールへの期待感を残してください' : '最終通なので、明確なオファーと行動喚起を含めてください'}
`;

// Sequence pattern guides based on newsletter count
const getSequencePatternGuide = (count: number, currentNumber: number): string => {
    const patterns: Record<number, Record<number, string>> = {
        1: {
            1: `【1通パターン: All-in-One】(3500〜5000文字)
1. 冒頭の引き込み (300〜500文字) - 具体的な情景描写
2. 問題提起と共感 (800〜1200文字) - 読者の課題と自分の経験談
3. 解決策の提示 (1000〜1500文字) - ビフォーアフターと方法論
4. オファーと行動喚起 (500〜800文字) - 具体的な提案
5. 追伸 (200〜400文字) - 追加の価値提供`
        },
        2: {
            1: `【2通パターンの1通目: 問題提起と共感】(3000〜4000文字)
1. 冒頭の引き込み (300〜500文字) - 具体的な情景描写
2. 問題の深掘り (1200〜1800文字) - 経験談メイン、読者の痛みに寄り添う
3. 問題の本質を示唆 (500〜800文字) - なぜこの問題が起きるのか
4. 次回予告 (200〜300文字) - 「明日は解決策について」`,
            2: `【2通パターンの2通目: 解決策とオファー】(3500〜4500文字)
1. 前回の振り返り (200〜300文字)
2. 転機・きっかけ (800〜1200文字) - どうやって自分が変わったか
3. 解決策の提示 (1200〜1800文字) - 成功事例・実績
4. オファーと行動喚起 (800〜1200文字)
5. 追伸 (200〜400文字)`
        },
        3: {
            1: `【3通パターンの1通目: 問題提起と共感】(3000〜4000文字)
1. 冒頭の引き込み (300〜500文字) - 具体的な情景描写
2. 問題の深掘り (1500〜2000文字) - 経験談メイン、複数の失敗パターン
3. 問題の本質 (600〜800文字) - 根本原因、仮想敵の明確化
4. 次回予告 (200〜300文字)`,
            2: `【3通パターンの2通目: 転機と解決策】(3500〜4500文字)
1. 前回の振り返り (200〜300文字)
2. 転機の物語 (1000〜1500文字) - ビフォーアフターの詳細
3. 解決策の提示 (1500〜2000文字) - 本質的な方法論
4. 期待感の醸成 (500〜800文字) - この方法で得られる未来
5. 次回予告 (200〜300文字)`,
            3: `【3通パターンの3通目: 証明とオファー】(4000〜5000文字)
1. シリーズの振り返り (300〜500文字)
2. 成功事例・実績 (1200〜1800文字) - 具体的な数字とデータ
3. 幸せなビジネスの提示 (800〜1200文字) - 理想の未来の描写
4. オファーと行動喚起 (1000〜1500文字) - 具体的な提案、限定性
5. 追伸 (200〜400文字)`
        },
        4: {
            1: `【4通パターンの1通目: 問題提起と共感】(3000〜4000文字)
問題の深掘りと読者の痛みへの共感に重点を置く`,
            2: `【4通パターンの2通目: 転機と気づき】(3500〜4500文字)
転機の物語と本質的な気づきを詳細に描く`,
            3: `【4通パターンの3通目: 解決策と実績】(4000〜5000文字)
具体的な方法論と成功事例を詳しく説明`,
            4: `【4通パターンの4通目: 理想の未来とオファー】(4000〜5000文字)
最終的なオファーと行動喚起、追伸で締める`
        },
        5: {
            1: `【5通パターンの1通目: 問題提起と深い共感】(3500〜4500文字)
鮮明な情景描写で始まり、複数の経験談で問題を多角的に描写`,
            2: `【5通パターンの2通目: 転機と気づき】(3500〜4500文字)
転機の詳細な物語、ビフォーの自分、きっかけの瞬間、気づきのプロセス`,
            3: `【5通パターンの3通目: 解決策の詳細】(4000〜5000文字)
解決策の全体像、具体的なフレームワーク、アフターの自分`,
            4: `【5通パターンの4通目: 成功事例と証明】(4000〜5000文字)
複数のクライアント成功事例、具体的な数字、幸せなビジネスの実現`,
            5: `【5通パターンの5通目: ビジョンとオファー】(4500〜5500文字)
シリーズ全体の総括、最終的なビジョン、オファーの詳細、最終的な行動喚起`
        }
    };

    return patterns[count]?.[currentNumber] || patterns[3][currentNumber] || patterns[3][1];
};

export async function POST(request: NextRequest) {
    try {
        const body: GenerateRequest = await request.json();

        const {
            launchContent,
            newsletterCount,
            newsletterPlans,
            collectedExperiences,
            chatHistory
        } = body;

        if (!launchContent || !newsletterPlans || newsletterPlans.length === 0) {
            return NextResponse.json(
                { error: 'ローンチコンテンツと企画情報が必要です' },
                { status: 400 }
            );
        }

        const model = getGeminiModel();
        const generatedNewsletters = [];

        // Generate each newsletter in the sequence
        for (let i = 1; i <= newsletterCount; i++) {
            const sequenceGuide = getSequencePatternGuide(newsletterCount, i);
            const prompt = NEWSLETTER_GENERATION_PROMPT(body, i, sequenceGuide);

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            // Parse JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    generatedNewsletters.push({
                        number: i,
                        subject: parsed.subject,
                        body: parsed.body,
                        wordCount: parsed.wordCount || parsed.body?.length || 0,
                        qualityCheck: parsed.qualityCheck || {}
                    });
                } catch (parseError) {
                    console.error(`Failed to parse newsletter ${i}:`, parseError);
                    generatedNewsletters.push({
                        number: i,
                        subject: `${launchContent.name} - 第${i}通`,
                        body: responseText,
                        wordCount: responseText.length,
                        qualityCheck: {}
                    });
                }
            } else {
                generatedNewsletters.push({
                    number: i,
                    subject: `${launchContent.name} - 第${i}通`,
                    body: responseText,
                    wordCount: responseText.length,
                    qualityCheck: {}
                });
            }
        }

        return NextResponse.json({
            success: true,
            newsletters: generatedNewsletters,
            totalCount: newsletterCount
        });
    } catch (error) {
        console.error('Newsletter full generation error:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate newsletters',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}
