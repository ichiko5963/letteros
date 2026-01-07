// AI Newsletter Generation API (LetterOS Core)
// Based on: @docs/request.md - AI生成フェーズ

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/firebase/server-auth';
import { genAI, AI_CONFIG } from '@/lib/ai/gemini';
import { z } from 'zod';

const requestSchema = z.object({
  product: z.object({
    name: z.string(),
    description: z.string().optional(),
    targetAudience: z.string().optional(),
    tone: z.string().optional(),
  }),
  plan: z.object({
    targetSegment: z.string(),
    currentBelief: z.string(),
    desiredBelief: z.string(),
    mainPoint: z.string(),
    proof: z.string(),
    cta: z.string(),
  }),
});

// System prompt based on LetterOS marketing philosophy
const SYSTEM_PROMPT = `あなたはLetterOSのAIアシスタントです。マーケティング思想に基づいた効果的なメルマガの作成を支援します。

## LetterOSの基本原則

1. **メルマガは意思決定装置である**
   - 情報提供ではなく、読者の判断を一方向に少しだけ動かすことが目的
   - 1通で1つの認知変化に集中する

2. **「一次情報」と「物語」で語る**
   - 一般論やノウハウではなく、必ず**「あなたの実体験」「具体的な失敗談」「過去のエピソード」**から始めること
   - 読み手が感情移入できるストーリーテリングを重視する

3. **Proof中心主義**
   - 意見ではなく、判断材料（数字、実体験、観察、構造）を提示
   - 特に「著者が実際に体験したこと」を最強のProofとして扱う

4. **長文で丁寧に語る**
   - 短い箇条書きではなく、文脈のある豊かな文章で語る
   - 読者との対話を意識した、体温のある言葉遣いにする

## 出力形式

必ず以下のJSON形式で出力してください：

{
  "subjects": [
    {"id": "s1", "content": "件名案1", "reasoning": "この件名を提案する理由"},
    {"id": "s2", "content": "件名案2", "reasoning": "この件名を提案する理由"},
    {"id": "s3", "content": "件名案3", "reasoning": "この件名を提案する理由"}
  ],
  "introductions": [
    {"id": "i1", "content": "導入文案1（200-300文字）", "reasoning": "この導入を提案する理由"},
    {"id": "i2", "content": "導入文案2（200-300文字）", "reasoning": "この導入を提案する理由"},
    {"id": "i3", "content": "導入文案3（200-300文字）", "reasoning": "この導入を提案する理由"}
  ],
  "structures": [
    {"id": "st1", "content": "本文構成案1（800-1200文字）", "reasoning": "この構成を提案する理由。どのエピソードを使うか具体的に記述"},
    {"id": "st2", "content": "本文構成案2（800-1200文字）", "reasoning": "この構成を提案する理由。どのエピソードを使うか具体的に記述"},
    {"id": "st3", "content": "本文構成案3（800-1200文字）", "reasoning": "この構成を提案する理由。どのエピソードを使うか具体的に記述"}
  ],
  "conclusions": [
    {"id": "c1", "content": "結論・CTA案1（100-200文字）", "reasoning": "この結論を提案する理由"},
    {"id": "c2", "content": "結論・CTA案2（100-200文字）", "reasoning": "この結論を提案する理由"},
    {"id": "c3", "content": "結論・CTA案3（100-200文字）", "reasoning": "この結論を提案する理由"}
  ]
}`;

export async function POST(request: NextRequest) {
  try {
    // const session = await verifySession();
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const body = await request.json();
    const { product, plan } = requestSchema.parse(body);

    const userPrompt = `
## プロダクト情報
- 名前: ${product.name}
- 説明: ${product.description || 'なし'}
- ターゲット読者: ${product.targetAudience || 'なし'}
- トーン: ${product.tone || '標準'}

## 今回の企画

**読者セグメント**: ${plan.targetSegment}

**現在の読者の認識（誤解・迷い）**:
${plan.currentBelief}

**読後に持ってほしい認識**:
${plan.desiredBelief}

**今回の論点（1つ）**:
${plan.mainPoint}

**根拠・証拠（Proof）**:
${plan.proof}

**CTA（読後に取らせたい行動）**:
${plan.cta}

---

上記の企画に基づいて、件名・導入・本文構成・結論のそれぞれ3つの案を生成してください。
各案には、なぜその案を提案するのかの理由も添えてください。

重要事項（厳守）:
1. **圧倒的な具体性**:
   抽象的な話は禁止です。必ず「具体的なエピソード」「会話文」「数字」を含めてください。
   もしProofに具体的なエピソードがない場合は、そのトピックに関連しそうな"ありそうな失敗談"や"具体的な使用シーン"を創造してでも具体的に描写してください。

2. **十分な長さ**:
   メルマガとして読み応えのある長さ（合計1500文字程度）を目指してください。
   特に本文構成は、スカスカな箇条書きではなく、情景が浮かぶような文章構成案にしてください。

3. **一次情報の重視**:
   「一般的には〜と言われています」ではなく「私は〜という経験をしました」「私のクライアントの〇〇さんは〜でした」という主語で語ってください。
`;

    // Use shared configuration with updated model
    const model = genAI.getGenerativeModel({
      model: AI_CONFIG.model, // Uses gemini-2.0-flash from config
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 4000,
      }
    });

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: SYSTEM_PROMPT + '\n\n' + userPrompt }],
        },
      ],
    });

    const responseText = result.response.text();

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const generatedContent = JSON.parse(jsonMatch[0]);

    return NextResponse.json(generatedContent);
  } catch (error) {
    console.error('Newsletter generation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: (error as any).errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to generate newsletter content',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
