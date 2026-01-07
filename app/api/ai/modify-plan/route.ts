// API endpoint for modifying newsletter plans with AI assistance
// Allows users to request changes to specific aspects of the plan

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

interface ModifyRequest {
    plan: NewsletterPlan;
    field: 'subject' | 'mainPoint' | 'targetBelief' | 'experienceToUse' | 'proof' | 'cta';
    instruction: string;
    launchContent: {
        name: string;
        description?: string;
        targetAudience?: string;
    };
    collectedExperiences: string;
}

const MODIFY_PROMPT = (request: ModifyRequest) => `
あなたはメルマガ企画の専門家です。ユーザーからの指示に従って、企画の一部を修正してください。

================================================================================
【現在の企画】
================================================================================
${request.plan.number}通目
- 件名: ${request.plan.subject}
- 論点: ${request.plan.mainPoint}
- 変えたい認識: ${request.plan.targetBelief}
- 使用する経験: ${request.plan.experienceToUse}
- 根拠: ${request.plan.proof}
- CTA: ${request.plan.cta}

================================================================================
【収集した経験談】
================================================================================
${request.collectedExperiences}

================================================================================
【ユーザーからの修正指示】
================================================================================
修正対象: ${request.field}
指示: ${request.instruction}

================================================================================
【出力形式】
================================================================================
修正後の${request.field}の値だけを出力してください。
JSON形式や説明は不要です。値だけを出力してください。
`;

const GENERATE_ALTERNATIVES_PROMPT = (request: ModifyRequest) => `
あなたはメルマガ企画の専門家です。現在の${request.field}に対して、5つの別案を提案してください。

================================================================================
【現在の企画】
================================================================================
${request.plan.number}通目
- 件名: ${request.plan.subject}
- 論点: ${request.plan.mainPoint}
- 変えたい認識: ${request.plan.targetBelief}
- 使用する経験: ${request.plan.experienceToUse}

================================================================================
【ローンチコンテンツ】
================================================================================
名前: ${request.launchContent.name}
説明: ${request.launchContent.description || ''}
ターゲット: ${request.launchContent.targetAudience || ''}

================================================================================
【収集した経験談】
================================================================================
${request.collectedExperiences}

================================================================================
【現在の値】
================================================================================
${request.field}: ${request.plan[request.field]}

================================================================================
【出力形式】- JSON形式で5つの案を出力
================================================================================
{
  "alternatives": [
    {"value": "案1の内容", "reason": "この案の狙い"},
    {"value": "案2の内容", "reason": "この案の狙い"},
    {"value": "案3の内容", "reason": "この案の狙い"},
    {"value": "案4の内容", "reason": "この案の狙い"},
    {"value": "案5の内容", "reason": "この案の狙い"}
  ]
}
`;

export async function POST(request: NextRequest) {
    try {
        const body: ModifyRequest & { action: 'modify' | 'alternatives' } = await request.json();

        const { action = 'modify' } = body;
        const model = getGeminiModel();

        if (action === 'alternatives') {
            // Generate 5 alternatives
            const prompt = GENERATE_ALTERNATIVES_PROMPT(body);
            const result = await model.generateContent(prompt);
            let responseText = result.response.text();

            // Clean up response
            responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

            try {
                const parsed = JSON.parse(responseText);
                return NextResponse.json({
                    success: true,
                    alternatives: parsed.alternatives || []
                });
            } catch {
                // Try to extract alternatives manually
                const alternativesMatch = responseText.match(/\{[\s\S]*"alternatives"[\s\S]*\}/);
                if (alternativesMatch) {
                    try {
                        const parsed = JSON.parse(alternativesMatch[0]);
                        return NextResponse.json({
                            success: true,
                            alternatives: parsed.alternatives || []
                        });
                    } catch {
                        return NextResponse.json({
                            success: false,
                            error: 'Failed to parse alternatives'
                        }, { status: 500 });
                    }
                }
                return NextResponse.json({
                    success: false,
                    error: 'Failed to generate alternatives'
                }, { status: 500 });
            }
        } else {
            // Modify single field
            const prompt = MODIFY_PROMPT(body);
            const result = await model.generateContent(prompt);
            const responseText = result.response.text().trim();

            return NextResponse.json({
                success: true,
                modifiedValue: responseText
            });
        }
    } catch (error) {
        console.error('Modify plan error:', error);
        return NextResponse.json(
            { error: 'Failed to modify plan' },
            { status: 500 }
        );
    }
}
