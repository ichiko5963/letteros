// API endpoint for AI-assisted newsletter editing
// Helps with subject alternatives and body text modifications

import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/ai/gemini';

interface AssistRequest {
    type: 'subject_alternatives' | 'body_modify' | 'body_alternatives';
    currentSubject?: string;
    currentBody?: string;
    instruction?: string;
    selectedText?: string;
    launchContent?: {
        name: string;
        description?: string;
        targetAudience?: string;
    };
}

const SUBJECT_ALTERNATIVES_PROMPT = (subject: string, body: string, launchContent: any) => `
あなたはメルマガ件名の専門家です。現在の件名に対して、5つの別案を提案してください。

【現在の件名】
${subject}

【本文の冒頭】
${body.slice(0, 500)}...

【ローンチコンテンツ】
名前: ${launchContent?.name || ''}
ターゲット: ${launchContent?.targetAudience || ''}

【件名作成のルール】
- 50文字以内
- 開封率を上げる工夫（緊急性、好奇心、数字など）
- 本文内容と一致させる

以下のJSON形式で5つの案を出力:
{
  "alternatives": [
    {"value": "件名案1", "reason": "この案の狙い"},
    {"value": "件名案2", "reason": "この案の狙い"},
    {"value": "件名案3", "reason": "この案の狙い"},
    {"value": "件名案4", "reason": "この案の狙い"},
    {"value": "件名案5", "reason": "この案の狙い"}
  ]
}
`;

const BODY_MODIFY_PROMPT = (instruction: string, selectedText: string, fullBody: string) => `
あなたはメルマガ本文の編集者です。ユーザーの指示に従って、選択されたテキストを修正してください。

【選択されたテキスト】
${selectedText}

【全文（参考）】
${fullBody.slice(0, 1000)}...

【ユーザーの指示】
${instruction}

【ルール】
- 選択されたテキスト部分のみを修正
- 前後の文脈と自然につながるように
- 架空の人物名（友香さん等）は使わない
- 主語は「私」「あなた」で

修正後のテキストだけを出力してください（説明不要）:
`;

const BODY_ALTERNATIVES_PROMPT = (selectedText: string, fullBody: string) => `
あなたはメルマガ本文の編集者です。選択されたテキストに対して、3つの言い換え案を提案してください。

【選択されたテキスト】
${selectedText}

【全文（参考）】
${fullBody.slice(0, 1000)}...

【ルール】
- 同じ意味を別の表現で
- 前後の文脈と自然につながるように
- 架空の人物名は使わない

以下のJSON形式で3つの案を出力:
{
  "alternatives": [
    {"value": "言い換え案1", "reason": "この表現の特徴"},
    {"value": "言い換え案2", "reason": "この表現の特徴"},
    {"value": "言い換え案3", "reason": "この表現の特徴"}
  ]
}
`;

export async function POST(request: NextRequest) {
    try {
        const body: AssistRequest = await request.json();
        const model = getGeminiModel();

        if (body.type === 'subject_alternatives') {
            const prompt = SUBJECT_ALTERNATIVES_PROMPT(
                body.currentSubject || '',
                body.currentBody || '',
                body.launchContent
            );
            const result = await model.generateContent(prompt);
            let responseText = result.response.text();
            responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

            try {
                const parsed = JSON.parse(responseText);
                return NextResponse.json({
                    success: true,
                    alternatives: parsed.alternatives || []
                });
            } catch {
                const match = responseText.match(/\{[\s\S]*"alternatives"[\s\S]*\}/);
                if (match) {
                    const parsed = JSON.parse(match[0]);
                    return NextResponse.json({
                        success: true,
                        alternatives: parsed.alternatives || []
                    });
                }
                return NextResponse.json({ success: false, error: 'Parse failed' }, { status: 500 });
            }
        }

        if (body.type === 'body_modify') {
            const prompt = BODY_MODIFY_PROMPT(
                body.instruction || '',
                body.selectedText || '',
                body.currentBody || ''
            );
            const result = await model.generateContent(prompt);
            const responseText = result.response.text().trim();

            return NextResponse.json({
                success: true,
                modifiedText: responseText
            });
        }

        if (body.type === 'body_alternatives') {
            const prompt = BODY_ALTERNATIVES_PROMPT(
                body.selectedText || '',
                body.currentBody || ''
            );
            const result = await model.generateContent(prompt);
            let responseText = result.response.text();
            responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

            try {
                const parsed = JSON.parse(responseText);
                return NextResponse.json({
                    success: true,
                    alternatives: parsed.alternatives || []
                });
            } catch {
                return NextResponse.json({ success: false, error: 'Parse failed' }, { status: 500 });
            }
        }

        return NextResponse.json({ success: false, error: 'Unknown type' }, { status: 400 });
    } catch (error) {
        console.error('Assist edit error:', error);
        return NextResponse.json(
            { error: 'Failed to assist edit' },
            { status: 500 }
        );
    }
}
