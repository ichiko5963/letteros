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
あなたは高品質メルマガ作成の専門家です。${request.newsletterCount}通シーケンスの${newsletterNumber}通目のメルマガを作成してください。

================================================================================
【絶対禁止事項】
================================================================================

1. **架空の人物名は禁止** - 「友香さん」「田中さん」「Aさん」などの架空の登場人物は使わない
2. **主語は「私」「あなた」のみ** - 発信者自身の経験として書く
3. **ハッシュタグ見出し禁止** - 「# 問題提起」「# 転機」「# 解決策」などは使わない
4. **JSON/コード記法禁止** - 本文内にJSONやコードブロックは入れない

================================================================================
【見出しのルール】- ①②形式で読みやすく
================================================================================

本文では以下のような①②形式の見出しを使ってください：

【良い例】
① あの日、私は限界だった
② 偶然見つけた「突破口」
③ 今、あなたに伝えたいこと

【悪い例 - 絶対に使わない】
# 問題提起
# 転機
# 解決策
## 1. はじめに

================================================================================
【構成の原則】
================================================================================

1. **具体的な情景描写から始める**（時間、場所、状況を明確に）
   例：「土曜日の昼下がり、ららぽーとのフードコート。妻と子どもと軽食をとっている...」

2. **自分の経験として書く** - 全て一人称「私」で
3. **読者に語りかける** - 「あなたも」「こんな経験ありませんか？」
4. **最低3000文字以上**（理想は3500〜5000文字）

================================================================================
【経験談の書き方】
================================================================================

ユーザーが語った経験を元に、より具体的に膨らませてください：
- いつ・どこで・何をしていたか
- その時の感情（不安、焦り、疲労など）
- 周りの状況（音、光、匂い、温度）
- 心の声（「なんでこうなったんだろう...」など）

================================================================================
【ローンチコンテンツ情報】
================================================================================

■ 基本情報
- 名前: ${request.launchContent.name}
- 説明: ${request.launchContent.description || '未設定'}
- ターゲット: ${request.launchContent.targetAudience || '未設定'}
- 提供価値: ${request.launchContent.valueProposition || '未設定'}
- LP/申込URL: ${(request.launchContent as any).lpUrl || '未設定'}
- 価格: ${(request.launchContent as any).price || '未設定'}

■ ${newsletterNumber}通目の企画
${request.newsletterPlans[newsletterNumber - 1] ? `
- 論点: ${request.newsletterPlans[newsletterNumber - 1].mainPoint}
- 使用する経験: ${request.newsletterPlans[newsletterNumber - 1].experienceToUse}
- CTA: ${request.newsletterPlans[newsletterNumber - 1].cta}
` : '企画情報なし'}

================================================================================
【ユーザーから収集した経験談】
================================================================================

${request.collectedExperiences}

【壁打ちの会話】
${request.chatHistory.map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`).join('\n\n')}

================================================================================
【${request.newsletterCount}通シーケンス - ${newsletterNumber}通目の役割】
================================================================================

${sequencePatternGuide}

${newsletterNumber > 1 ? `※${newsletterNumber}通目なので、前の通からの流れを意識してください` : '※1通目なので、問題提起と共感に重点を置いてください'}
${newsletterNumber < request.newsletterCount ? '※次のメールへの期待感を残してください' : '※最終通なので、明確なオファーと行動喚起を含めてください'}

================================================================================
【出力形式】- 必ずこの形式で出力
================================================================================

以下のJSON形式のみを出力してください。コードブロック(\`\`\`)で囲まないでください：

{"subject": "興味を引く件名（50文字以内）", "body": "本文（3000文字以上）", "wordCount": 3500, "qualityCheck": {"hasSceneDescription": true, "experienceWordCount": 1000, "numberCount": 5, "hasQuestions": true, "hasCta": true, "hasPs": true}}

※bodyの中では①②形式の見出しを使い、「# 問題提起」などのハッシュタグ見出しは使わないでください。
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
            let responseText = result.response.text();

            // Remove markdown code blocks if present
            responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

            // Try to parse JSON from response - find the outermost JSON object
            let parsed: any = null;

            // Try multiple parsing strategies
            try {
                // Strategy 1: Direct parse (if response is pure JSON)
                parsed = JSON.parse(responseText);
            } catch {
                // Strategy 2: Find JSON object pattern
                const jsonMatch = responseText.match(/\{[\s\S]*"subject"[\s\S]*"body"[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        parsed = JSON.parse(jsonMatch[0]);
                    } catch (e) {
                        console.error(`JSON parse failed for newsletter ${i}:`, e);
                    }
                }
            }

            if (parsed && parsed.subject && parsed.body) {
                // Clean up body - remove any remaining markdown artifacts
                let cleanBody = parsed.body;
                // Remove leading/trailing quotes if present
                if (cleanBody.startsWith('"') && cleanBody.endsWith('"')) {
                    cleanBody = cleanBody.slice(1, -1);
                }
                // Unescape common escape sequences
                cleanBody = cleanBody.replace(/\\n/g, '\n').replace(/\\"/g, '"');

                // Remove subject line if it appears at the start of body
                const subjectPatterns = [
                    new RegExp(`^【件名】.*?\n+`, 'i'),
                    new RegExp(`^件名[:：].*?\n+`, 'i'),
                    new RegExp(`^Subject[:：].*?\n+`, 'i'),
                    new RegExp(`^${parsed.subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\n+`, 'i'),
                ];
                for (const pattern of subjectPatterns) {
                    cleanBody = cleanBody.replace(pattern, '');
                }
                // Trim leading/trailing whitespace
                cleanBody = cleanBody.trim();

                generatedNewsletters.push({
                    number: i,
                    subject: parsed.subject,
                    body: cleanBody,
                    wordCount: parsed.wordCount || cleanBody.length,
                    qualityCheck: parsed.qualityCheck || {}
                });
            } else {
                // Fallback: Try to extract subject and body manually
                console.error(`Failed to parse newsletter ${i}, using fallback`);

                // Try to find subject in response
                const subjectMatch = responseText.match(/"subject"\s*:\s*"([^"]+)"/);
                const subject = subjectMatch ? subjectMatch[1] : `${launchContent.name} - 第${i}通`;

                // Try to find body - everything after "body": "
                const bodyMatch = responseText.match(/"body"\s*:\s*"([\s\S]+?)(?:"\s*,\s*"wordCount|"\s*,\s*"qualityCheck|"\s*\})/);
                let bodyContent = bodyMatch ? bodyMatch[1] : responseText;

                // Clean up body
                bodyContent = bodyContent.replace(/\\n/g, '\n').replace(/\\"/g, '"');

                // Remove subject line if it appears at the start of body
                const subjectPatterns = [
                    new RegExp(`^【件名】.*?\n+`, 'i'),
                    new RegExp(`^件名[:：].*?\n+`, 'i'),
                    new RegExp(`^Subject[:：].*?\n+`, 'i'),
                    new RegExp(`^${subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\n+`, 'i'),
                ];
                for (const pattern of subjectPatterns) {
                    bodyContent = bodyContent.replace(pattern, '');
                }
                bodyContent = bodyContent.trim();

                generatedNewsletters.push({
                    number: i,
                    subject: subject,
                    body: bodyContent,
                    wordCount: bodyContent.length,
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
