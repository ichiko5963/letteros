// API endpoint for AI-powered context recommendations
// Recommends contexts based on relevance to the selected launch content

import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/ai/gemini';

interface Context {
    id: string;
    title: string;
    content: string;
}

interface LaunchContent {
    name: string;
    description?: string;
    targetAudience?: string;
    valueProposition?: string;
    concept?: string;
    targetPain?: string;
}

interface RecommendRequest {
    launchContent: LaunchContent;
    contexts: Context[];
    newsletterCount: number;
}

// Step 1: Select top 10 candidates based on titles only
const SELECT_CANDIDATES_PROMPT = (launchContent: LaunchContent, contexts: Context[]) => `
あなたはメルマガコンテンツ戦略の専門家です。
タイトルのみを見て、このローンチコンテンツに関連しそうなエピソードを10個選んでください。

【ローンチコンテンツ】
名前: ${launchContent.name}
説明: ${launchContent.description || '未設定'}
ターゲット: ${launchContent.targetAudience || '未設定'}
コンセプト: ${launchContent.concept || '未設定'}

【コンテキストのタイトル一覧】
${contexts.map((c, i) => `${i}: "${c.title}"`).join('\n')}

【出力形式】
関連しそうな10個のインデックス番号をJSON配列で出力してください:
{"selected": [0, 3, 5, 7, ...]}

タイトルからローンチコンテンツとの関連性が高そうなものを10個選んでください。
`;

// Step 2: Score the selected candidates based on content
const SCORE_CANDIDATES_PROMPT = (launchContent: LaunchContent, candidates: Context[], newsletterCount: number) => `
あなたはメルマガコンテンツ戦略の専門家です。
以下のエピソードを読み、ローンチコンテンツへの適合度をスコア付けしてください。

【ローンチコンテンツ】
名前: ${launchContent.name}
説明: ${launchContent.description || '未設定'}
ターゲット: ${launchContent.targetAudience || '未設定'}
価値提案: ${launchContent.valueProposition || '未設定'}
コンセプト: ${launchContent.concept || '未設定'}
ターゲットの痛み: ${launchContent.targetPain || '未設定'}

【作成するメルマガ通数】
${newsletterCount}通

【評価対象のエピソード】
${candidates.map((c, i) => `
---[${i}] ID="${c.id}"---
タイトル: ${c.title}
内容:
${c.content.slice(0, 800)}${c.content.length > 800 ? '...' : ''}
`).join('\n')}

【出力形式】
以下のJSON形式のみを出力:
{
  "recommendations": [
    {"id": "ID値", "relevanceScore": 85, "reason": "理由1文", "suggestedUse": "1通目の導入で使用"}
  ]
}

【評価基準】
- relevanceScore: 0-100。ターゲットの共感を得られる具体的エピソードほど高スコア
- reason: このエピソードがなぜ効果的か（1文）
- suggestedUse: ${newsletterCount}通のうちどこでどう使うか

スコア順に並べて出力してください。
`;

export async function POST(request: NextRequest) {
    try {
        const body: RecommendRequest = await request.json();
        const { launchContent, contexts, newsletterCount } = body;

        if (!contexts || contexts.length === 0) {
            return NextResponse.json({
                success: true,
                recommendations: []
            });
        }

        const model = getGeminiModel();

        // If 10 or fewer contexts, skip step 1 and score all of them
        let candidateContexts: Context[];

        if (contexts.length <= 10) {
            candidateContexts = contexts;
            console.log('[recommend-contexts] Skipping selection, only', contexts.length, 'contexts');
        } else {
            // Step 1: Select top 10 candidates based on titles
            console.log('[recommend-contexts] Step 1: Selecting from', contexts.length, 'contexts by title');

            const selectPrompt = SELECT_CANDIDATES_PROMPT(launchContent, contexts);
            const selectResult = await model.generateContent(selectPrompt);
            let selectResponse = selectResult.response.text();

            selectResponse = selectResponse
                .replace(/```json\s*/gi, '')
                .replace(/```\s*/gi, '')
                .trim();

            console.log('[recommend-contexts] Step 1 response:', selectResponse.slice(0, 200));

            // Parse selected indices
            let selectedIndices: number[] = [];
            try {
                const selectMatch = selectResponse.match(/\{[\s\S]*"selected"[\s\S]*\}/);
                if (selectMatch) {
                    const parsed = JSON.parse(selectMatch[0]);
                    selectedIndices = parsed.selected || [];
                }
            } catch {
                // Fallback: try to extract numbers from the response
                const numbers = selectResponse.match(/\d+/g);
                if (numbers) {
                    selectedIndices = numbers.slice(0, 10).map(n => parseInt(n));
                }
            }

            // Validate indices and get candidates
            selectedIndices = selectedIndices
                .filter(i => typeof i === 'number' && i >= 0 && i < contexts.length)
                .slice(0, 10);

            if (selectedIndices.length === 0) {
                // Fallback: take first 10
                selectedIndices = contexts.slice(0, 10).map((_, i) => i);
            }

            candidateContexts = selectedIndices.map(i => contexts[i]);
            console.log('[recommend-contexts] Selected', candidateContexts.length, 'candidates');
        }

        // Step 2: Score the candidates based on content
        console.log('[recommend-contexts] Step 2: Scoring', candidateContexts.length, 'candidates');

        const scorePrompt = SCORE_CANDIDATES_PROMPT(launchContent, candidateContexts, newsletterCount);
        const scoreResult = await model.generateContent(scorePrompt);
        let scoreResponse = scoreResult.response.text();

        scoreResponse = scoreResponse
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/gi, '')
            .trim();

        console.log('[recommend-contexts] Step 2 response:', scoreResponse.slice(0, 300));

        // Parse recommendations
        const jsonMatch = scoreResponse.match(/\{[\s\S]*"recommendations"[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('[recommend-contexts] No JSON found in score response');
            return NextResponse.json({
                success: true,
                recommendations: candidateContexts.map((c, i) => ({
                    id: c.id,
                    relevanceScore: 80 - (i * 5),
                    reason: 'このエピソードはローンチに活用できます',
                    suggestedUse: 'メルマガ本文で活用'
                }))
            });
        }

        try {
            const parsed = JSON.parse(jsonMatch[0]);
            const recommendations = parsed.recommendations || [];

            // Map recommendations to candidate contexts
            const finalRecommendations = candidateContexts.map((context, idx) => {
                const rec = recommendations.find((r: any) => r.id === context.id);

                if (rec) {
                    return {
                        id: context.id,
                        relevanceScore: typeof rec.relevanceScore === 'number' ? rec.relevanceScore : 70,
                        reason: rec.reason || 'このエピソードは効果的です',
                        suggestedUse: rec.suggestedUse || ''
                    };
                }

                // Check if recommendation uses index instead of ID
                const recByIndex = recommendations[idx];
                if (recByIndex) {
                    return {
                        id: context.id,
                        relevanceScore: typeof recByIndex.relevanceScore === 'number' ? recByIndex.relevanceScore : 70,
                        reason: recByIndex.reason || 'このエピソードは効果的です',
                        suggestedUse: recByIndex.suggestedUse || ''
                    };
                }

                return {
                    id: context.id,
                    relevanceScore: 60,
                    reason: 'このエピソードは活用可能です',
                    suggestedUse: ''
                };
            });

            // Sort by score descending
            finalRecommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);

            console.log('[recommend-contexts] Final recommendations:', finalRecommendations.length);

            return NextResponse.json({
                success: true,
                recommendations: finalRecommendations
            });
        } catch (parseError) {
            console.error('[recommend-contexts] JSON parse error:', parseError);

            return NextResponse.json({
                success: true,
                recommendations: candidateContexts.map((c, i) => ({
                    id: c.id,
                    relevanceScore: 80 - (i * 5),
                    reason: 'このエピソードはローンチに活用できます',
                    suggestedUse: 'メルマガ本文で活用'
                }))
            });
        }
    } catch (error) {
        console.error('[recommend-contexts] Error:', error);
        return NextResponse.json(
            { error: 'Failed to recommend contexts' },
            { status: 500 }
        );
    }
}
