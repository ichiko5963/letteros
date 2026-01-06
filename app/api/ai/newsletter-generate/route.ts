// AI Newsletter Generation API (LetterOS Core)
// Based on: @docs/request.md - AI生成フェーズ

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/firebase/server-auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
const SYSTEM_PROMPT = `あなたはLetterOSのAIアシスタントです。マーケティング思想に基づいた効果的なニュースレターの作成を支援します。

## LetterOSの基本原則

1. **メルマガは意思決定装置である**
   - 情報提供ではなく、読者の判断を一方向に少しだけ動かすことが目的
   - 1通で1つの認知変化に集中する

2. **上流思考**
   - 文章力より、「何を伝えるか」の上流設計が重要
   - 思想→戦略→手法の順序を守る

3. **Proof中心主義**
   - 意見や感情ではなく、判断材料（数字、実体験、観察、構造）を提示
   - 賢い読者は根拠を求める

4. **選択のためのAI**
   - 決定はしない、代替しない、主役にならない
   - 候補を出し、最適化するだけ

## 出力形式

必ず以下のJSON形式で出力してください：

{
  "subjects": [
    {"id": "s1", "content": "件名案1", "reasoning": "この件名を提案する理由"},
    {"id": "s2", "content": "件名案2", "reasoning": "この件名を提案する理由"},
    {"id": "s3", "content": "件名案3", "reasoning": "この件名を提案する理由"}
  ],
  "introductions": [
    {"id": "i1", "content": "導入文案1（100-150文字）", "reasoning": "この導入を提案する理由"},
    {"id": "i2", "content": "導入文案2（100-150文字）", "reasoning": "この導入を提案する理由"},
    {"id": "i3", "content": "導入文案3（100-150文字）", "reasoning": "この導入を提案する理由"}
  ],
  "structures": [
    {"id": "st1", "content": "本文構成案1（300-500文字）", "reasoning": "この構成を提案する理由"},
    {"id": "st2", "content": "本文構成案2（300-500文字）", "reasoning": "この構成を提案する理由"},
    {"id": "st3", "content": "本文構成案3（300-500文字）", "reasoning": "この構成を提案する理由"}
  ],
  "conclusions": [
    {"id": "c1", "content": "結論・CTA案1（50-100文字）", "reasoning": "この結論を提案する理由"},
    {"id": "c2", "content": "結論・CTA案2（50-100文字）", "reasoning": "この結論を提案する理由"},
    {"id": "c3", "content": "結論・CTA案3（50-100文字）", "reasoning": "この結論を提案する理由"}
  ]
}`;

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

重要:
- 1通で複数のことを教えようとしないでください
- 感情論ではなく、構造で説得してください
- 必ずProof（根拠）を本文に含めてください
- CTAは不自然でない位置に置いてください
`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: SYSTEM_PROMPT + '\n\n' + userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 4000,
      },
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
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate newsletter content' },
      { status: 500 }
    );
  }
}

