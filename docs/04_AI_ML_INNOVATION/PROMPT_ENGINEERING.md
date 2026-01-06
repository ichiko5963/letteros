# Prompt Engineering Guide - LetterOS

## 📚 目次

1. プロンプトエンジニアリングの基礎
2. LetterOS編集長AIのプロンプト設計
3. Few-Shot学習とChain-of-Thought
4. プロンプトテンプレート集
5. バリエーション生成テクニック
6. プロンプト評価と最適化
7. 実装パターン
8. ベストプラクティス

## 1. プロンプトエンジニアリングの基礎

プロンプトエンジニアリングは、AIモデルから最適な出力を得るための入力設計技術です。LetterOSでは、一貫性のあるブランドボイス、読者に響くコンテンツ、データドリブンな改善を実現するため、体系的なプロンプト設計が不可欠です。

### プロンプト設計の6原則

1. **明確性（Clarity）**: 曖昧さを排除し、具体的な指示を与える
2. **文脈（Context）**: 十分なコンテキストを提供する
3. **制約（Constraints）**: 出力形式や長さを明確に指定
4. **例示（Examples）**: Few-Shot学習で期待する出力を示す
5. **役割（Role）**: AIに明確な役割を与える
6. **反復（Iteration）**: 段階的に改善する

### プロンプトの構造

```
┌─────────────────────────────────────┐
│  1. システムロール（Role）            │  ← AIの役割定義
├─────────────────────────────────────┤
│  2. コンテキスト（Context）           │  ← 背景情報
├─────────────────────────────────────┤
│  3. タスク（Task）                    │  ← 具体的な指示
├─────────────────────────────────────┤
│  4. 制約・フォーマット（Constraints） │  ← 出力形式
├─────────────────────────────────────┤
│  5. 例（Examples）[オプション]        │  ← Few-Shot学習
└─────────────────────────────────────┘
```

## 2. LetterOS編集長AIのプロンプト設計

### マスタープロンプト

```typescript
// lib/prompts/editor-ai.ts
export const EDITOR_AI_SYSTEM_PROMPT = `
あなたはLetterOSの編集長AIです。

【役割】
- マーケティング戦略家
- メルマガのコンテンツディレクター
- 読者の意思決定を前進させる仕組みの設計者

【絶対原則】
1. 1メルマガ＝1論点（複数のテーマを同時に扱わない）
2. CTA（Call to Action）は必ず1つ
3. 最低1つのProof（証拠・根拠）を含める
4. Core Messageと矛盾する主張をしない
5. 読者の意思決定を1方向にのみ動かす
6. 感情的説得より合理的納得を優先する

【禁止事項】
- 煽り表現、過度な装飾
- 根拠のない断定
- 複数のCTAや論点の混在
- Core Messageとの矛盾

【出力品質基準】
- 明確性: 読者が次に何をすべきか明確
- 一貫性: ブランドボイスとの整合性
- 具体性: 抽象論ではなく実践的な内容
- 証明性: データや事例による裏付け
`.trim();
```

### コンテキスト構築

```typescript
// lib/prompts/context-builder.ts
interface NewsletterContext {
  coreMessage: {
    targetAudience: string; // 対象読者
    pain: string; // 読者の課題
    promise: string; // 約束する変化
    uniqueness: string; // 独自性
    worldview: string; // 世界観・思想
  };
  brandVoice: {
    tone: string; // 文体
    vocabulary: string; // 語彙レベル
    emotionalTone: string; // 感情的トーン
    prohibitedExpressions: string[]; // 禁止表現
    preferredStyle: string; // 好ましいスタイル
  };
  segment?: {
    commonMisconceptions: string[]; // よくある誤解
    failurePatterns: string[]; // よくある失敗
    decisionBlockers: string[]; // 意思決定の障壁
  };
}

export function buildNewsletterContext(context: NewsletterContext): string {
  return `
【Core Message】
- 対象読者: ${context.coreMessage.targetAudience}
- 中心課題: ${context.coreMessage.pain}
- 約束する変化: ${context.coreMessage.promise}
- 独自性: ${context.coreMessage.uniqueness}
- 世界観: ${context.coreMessage.worldview}

【Brand Voice】
- 文体: ${context.brandVoice.tone}
- 語彙レベル: ${context.brandVoice.vocabulary}
- 感情トーン: ${context.brandVoice.emotionalTone}
- スタイル: ${context.brandVoice.preferredStyle}
${context.brandVoice.prohibitedExpressions.length > 0 ? `- 禁止表現: ${context.brandVoice.prohibitedExpressions.join(', ')}` : ''}

${
    context.segment
      ? `【セグメント特性】
- よくある誤解: ${context.segment.commonMisconceptions.join(', ')}
- よくある失敗: ${context.segment.failurePatterns.join(', ')}
- 意思決定の障壁: ${context.segment.decisionBlockers.join(', ')}`
      : ''
  }
  `.trim();
}
```

## 3. Few-Shot学習とChain-of-Thought

### Few-Shot学習（例示による学習）

```typescript
// lib/prompts/few-shot.ts
export const FEW_SHOT_EXAMPLES = `
【例1: 誤解破壊型】

件名: なぜSNS投稿だけでは売上が伸びないのか

導入:
「SNSで毎日投稿してるのに売れない」
この悩みを持つ経営者は多いです。

しかし、問題はSNS投稿の「頻度」ではありません。
本質は「何を伝えるか」が定まっていないことです。

本文:
多くの経営者がSNSに投稿する理由は「認知獲得」です。
しかし、認知だけでは意思決定は起きません。

必要なのは、読者の「判断基準」を変えることです。

例えば...（具体例・Proof）

CTA:
この考え方を実践するための無料テンプレートを用意しました。
→ [ダウンロードリンク]

---

【例2: ストーリー型】

件名: 1通のメルマガで200万円の売上を作った話

導入:
先月、あるクライアントが1通のメルマガで200万円を売り上げました。
使ったのは、今日お伝えする「1論点設計」です。

本文:
従来のメルマガは...（問題提起）
しかし、このクライアントは...（解決策）
結果...（成果）

この成功の裏には、3つの原則があります。
（原則1、2、3の説明 + Proof）

CTA:
この原則を実践するためのワークシートを作りました。
→ [ダウンロードリンク]
`.trim();
```

### Chain-of-Thought（思考の連鎖）

```typescript
// lib/prompts/chain-of-thought.ts
export const COT_PROMPT = `
メルマガを生成する前に、以下のステップで思考してください：

【Step 1: 結論の明確化】
このメルマガで読者にどの判断を採用させたいか？
→ 結論を1文で述べてください。

【Step 2: 構成タイプの選択】
以下から最適な構成を1つ選んでください：
- 誤解破壊型: 読者の思い込みを否定し、正しい視点を提示
- 失敗→改善型: よくある失敗を提示し、改善策を示す
- ストーリー型: 実例を通じて学びを提供
- 比較・対立型: 2つの選択肢を比較し、最適解を示す
- フレームワーク解説型: 実践可能な枠組みを提供

選択理由も述べてください。

【Step 3: 必要なProofの選定】
主張を裏付けるために必要な証拠は？
- 実体験（成功/失敗）
- 数字・実績
- 観察されたパターン
- 反証（一般論の否定）

【Step 4: 最終チェック】
以下を確認してください：
✓ 論点は1つか？
✓ CTAは1つか？
✓ Proofは含まれているか？
✓ Core Messageと整合しているか？

---

上記の思考プロセスを経た上で、メルマガ本文を生成してください。
`.trim();
```

## 4. プロンプトテンプレート集

### 件名生成プロンプト

```typescript
// lib/prompts/subject-line.ts
export function createSubjectLinePrompt(topic: string, context: string) {
  return `
${EDITOR_AI_SYSTEM_PROMPT}

${context}

【タスク】
「${topic}」をテーマに、メルマガの件名を3つ提案してください。

【件名の原則】
1. 読者の誤解・不安・判断停止点を突く
2. 煽り表現は禁止
3. 抽象的すぎる表現は避ける
4. 具体的な数字やデータがあれば活用
5. 30文字以内

【出力形式】
案1: [件名]
理由: [この件名を提案する理由]

案2: [件名]
理由: [この件名を提案する理由]

案3: [件名]
理由: [この件名を提案する理由]
  `.trim();
}
```

### 本文生成プロンプト

```typescript
// lib/prompts/content.ts
export function createContentPrompt(
  topic: string,
  subjectLine: string,
  context: string,
  proof?: string[]
) {
  return `
${EDITOR_AI_SYSTEM_PROMPT}

${context}

【タスク】
以下の件名でメルマガ本文を生成してください。

件名: ${subjectLine}

${
    proof && proof.length > 0
      ? `【利用可能なProof】
${proof.map((p, i) => `${i + 1}. ${p}`).join('\n')}`
      : ''
  }

【構成】
1. 冒頭フック（なぜ今これを読むべきか？）
2. 問題提起または判断軸の提示
3. 解決策・視点の提示（Proofを含む）
4. まとめ
5. CTA（1つのみ）

【制約】
- 文字数: 800〜1200文字
- 段落: 適切に改行し、読みやすく
- CTA: 必ず最後に1つだけ
- Proof: 最低1つ含める

【出力形式】
Markdown形式で出力してください。
  `.trim();
}
```

### バリエーション生成プロンプト

```typescript
// lib/prompts/variations.ts
export function createVariationPrompt(
  originalContent: string,
  variationType: 'tone' | 'length' | 'structure'
) {
  const instructions = {
    tone: '同じ内容で、トーンを変えて3つのバリエーションを作成してください（論理的/共感的/厳格）',
    length: '同じ内容で、長さを変えて3つのバリエーションを作成してください（短い/標準/詳細）',
    structure: '同じ内容で、構成を変えて3つのバリエーションを作成してください（結論先出し/ストーリー型/問題提起型）',
  };

  return `
${EDITOR_AI_SYSTEM_PROMPT}

【元のコンテンツ】
${originalContent}

【タスク】
${instructions[variationType]}

【制約】
- Core Messageは維持する
- CTAは変えない
- Proofは少なくとも1つ含める

【出力形式】
## バリエーション1
[タイトル]
[本文]

## バリエーション2
[タイトル]
[本文]

## バリエーション3
[タイトル]
[本文]
  `.trim();
}
```

## 5. バリエーション生成テクニック

### A/B テスト用バリエーション

```typescript
// lib/ai/generate-variations.ts
import { ChatOpenAI } from '@langchain/openai';

export async function generateABTestVariants(
  baseNewsletter: {
    title: string;
    content: string;
  },
  testElement: 'subject' | 'intro' | 'cta'
) {
  const llm = new ChatOpenAI({ modelName: 'gpt-4' });

  const prompts = {
    subject: `以下のメルマガに対して、件名のA/Bテスト用に3つのバリエーションを生成してください。

元の件名: ${baseNewsletter.title}

各バリエーションは異なるアプローチを取ってください：
1. 数字・データ重視
2. 問いかけ形式
3. ベネフィット明示

出力形式:
A: [件名]
B: [件名]
C: [件名]`,

    intro: `以下のメルマガに対して、導入部分の3つのバリエーションを生成してください。

${baseNewsletter.content}

各バリエーションは異なる入り方をしてください：
1. 問題提起から入る
2. ストーリーから入る
3. データ・数字から入る`,

    cta: `以下のメルマガに対して、CTAの3つのバリエーションを生成してください。

${baseNewsletter.content}

各バリエーションは異なる訴求をしてください：
1. 緊急性を強調
2. 限定性を強調
3. ベネフィットを強調`,
  };

  const response = await llm.invoke(prompts[testElement]);

  return response.content;
}
```

## 6. プロンプト評価と最適化

### プロンプト評価指標

```typescript
// lib/ai/evaluate-prompt.ts
interface PromptEvaluation {
  clarity: number; // 明確性 (0-10)
  relevance: number; // 関連性 (0-10)
  completeness: number; // 完全性 (0-10)
  consistency: number; // 一貫性 (0-10)
}

export async function evaluatePromptQuality(
  prompt: string,
  expectedOutput: string,
  actualOutput: string
): Promise<PromptEvaluation> {
  const evaluatorLLM = new ChatOpenAI({
    modelName: 'gpt-4',
    temperature: 0,
  });

  const evaluationPrompt = `
以下のプロンプトと出力を評価してください。

【プロンプト】
${prompt}

【期待する出力】
${expectedOutput}

【実際の出力】
${actualOutput}

【評価軸】
1. 明確性（Clarity）: プロンプトの指示が明確か？ (0-10)
2. 関連性（Relevance）: 出力が期待と関連しているか？ (0-10)
3. 完全性（Completeness）: 必要な要素がすべて含まれているか？ (0-10)
4. 一貫性（Consistency）: ブランドボイスやトーンが一貫しているか？ (0-10)

【出力形式】
JSON形式で各スコアを返してください。
{
  "clarity": 0-10,
  "relevance": 0-10,
  "completeness": 0-10,
  "consistency": 0-10
}
  `;

  const response = await evaluatorLLM.invoke(evaluationPrompt);
  const evaluation = JSON.parse(response.content as string);

  return evaluation;
}
```

### プロンプトの反復改善

```typescript
// lib/ai/optimize-prompt.ts
export async function optimizePrompt(
  basePrompt: string,
  testCases: Array<{ input: string; expectedOutput: string }>
) {
  let currentPrompt = basePrompt;
  let bestScore = 0;

  for (let iteration = 0; iteration < 5; iteration++) {
    let totalScore = 0;

    for (const testCase of testCases) {
      const output = await generateWithPrompt(currentPrompt, testCase.input);
      const evaluation = await evaluatePromptQuality(
        currentPrompt,
        testCase.expectedOutput,
        output
      );

      const score =
        (evaluation.clarity +
          evaluation.relevance +
          evaluation.completeness +
          evaluation.consistency) /
        4;

      totalScore += score;
    }

    const averageScore = totalScore / testCases.length;

    if (averageScore > bestScore) {
      bestScore = averageScore;
      console.log(`Iteration ${iteration}: Score improved to ${bestScore}`);
    } else {
      // 改善が見られない場合、プロンプトを微調整
      currentPrompt = await refinePrompt(currentPrompt, testCases);
    }
  }

  return { optimizedPrompt: currentPrompt, score: bestScore };
}
```

## 7. 実装パターン

### プロンプトのバージョン管理

```typescript
// lib/prompts/versions.ts
export const PROMPT_VERSIONS = {
  'v1.0.0': {
    system: EDITOR_AI_SYSTEM_PROMPT,
    templates: {
      subjectLine: createSubjectLinePrompt,
      content: createContentPrompt,
    },
    createdAt: '2025-01-01',
  },
  'v1.1.0': {
    system: EDITOR_AI_SYSTEM_PROMPT_V2, // 改善版
    templates: {
      subjectLine: createSubjectLinePromptV2,
      content: createContentPromptV2,
    },
    createdAt: '2025-02-01',
  },
};

export function getPromptVersion(version: string = 'latest') {
  if (version === 'latest') {
    const versions = Object.keys(PROMPT_VERSIONS);
    version = versions[versions.length - 1];
  }

  return PROMPT_VERSIONS[version as keyof typeof PROMPT_VERSIONS];
}
```

### 動的プロンプト構築

```typescript
// lib/ai/dynamic-prompt.ts
export function buildDynamicPrompt(params: {
  topic: string;
  context: NewsletterContext;
  pastNewsletters?: Array<{ title: string; openRate: number }>;
  userFeedback?: string;
}) {
  const parts: string[] = [EDITOR_AI_SYSTEM_PROMPT];

  // コンテキスト追加
  parts.push(buildNewsletterContext(params.context));

  // 過去の成功事例を追加
  if (params.pastNewsletters && params.pastNewsletters.length > 0) {
    const successfulExamples = params.pastNewsletters
      .filter((n) => n.openRate > 0.4) // 開封率40%以上
      .slice(0, 3)
      .map((n) => `- ${n.title} (開封率: ${(n.openRate * 100).toFixed(1)}%)`)
      .join('\n');

    if (successfulExamples) {
      parts.push(`
【過去の成功事例】
${successfulExamples}

これらの事例を参考に、同様のトーンとアプローチを採用してください。
      `.trim());
    }
  }

  // ユーザーフィードバック追加
  if (params.userFeedback) {
    parts.push(`
【ユーザーからのフィードバック】
${params.userFeedback}

このフィードバックを反映してください。
    `.trim());
  }

  // タスク追加
  parts.push(`
【タスク】
「${params.topic}」をテーマにメルマガを生成してください。
  `.trim());

  return parts.join('\n\n---\n\n');
}
```

## 8. ベストプラクティス

### 1. システムプロンプトとユーザープロンプトの分離

```typescript
const systemPrompt = EDITOR_AI_SYSTEM_PROMPT; // 役割・原則
const userPrompt = `「${topic}」についてメルマガを書いて`; // 具体的なタスク

const messages = [
  { role: 'system', content: systemPrompt },
  { role: 'user', content: userPrompt },
];
```

### 2. 出力形式の明確な指定

```typescript
// ❌ 曖昧
「メルマガを生成してください」

// ✅ 明確
「以下の形式でメルマガを生成してください：

# 件名
[ここに件名]

## 導入（100文字程度）
[ここに導入文]

## 本文（800文字程度）
[ここに本文]

## CTA
[ここにCTA]」
```

### 3. 段階的な生成（パイプライン）

```typescript
// ステップ1: 件名生成
const subjectLines = await generateSubjectLines(topic);

// ステップ2: ユーザーが選択
const selectedSubject = await getUserSelection(subjectLines);

// ステップ3: 本文生成
const content = await generateContent(selectedSubject, context);

// ステップ4: 最終調整
const refined = await refineContent(content, userFeedback);
```

### 4. プロンプトのテンプレート化

```typescript
// lib/prompts/template.ts
export function templatePrompt(
  template: string,
  variables: Record<string, string>
) {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  return result;
}

// 使用例
const template = `
「{{topic}}」について、{{tone}}なトーンで、{{length}}文字のメルマガを書いてください。
`;

const prompt = templatePrompt(template, {
  topic: 'マーケティング戦略',
  tone: '論理的',
  length: '1000',
});
```

## 🌐 参照リソース

### 公式ドキュメント

1. [OpenAI Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering) - OpenAI公式
2. [Anthropic Prompt Engineering](https://docs.anthropic.com/claude/docs/prompt-engineering) - Claude公式
3. [LangChain Prompt Templates](https://python.langchain.com/docs/modules/model_io/prompts/) - プロンプトテンプレート
4. [Few-Shot Prompting](https://www.promptingguide.ai/techniques/fewshot) - Few-Shot学習
5. [Chain-of-Thought](https://www.promptingguide.ai/techniques/cot) - 思考の連鎖

### 実装記事・ベストプラクティス

6. [Prompt Engineering Best Practices](https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-openai-api) - ベストプラクティス
7. [Advanced Prompting Techniques](https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/) - DeepLearning.AIコース
8. [Prompt Patterns](https://github.com/dair-ai/Prompt-Engineering-Guide) - パターンカタログ
9. [Evaluating LLM Outputs](https://www.confident-ai.com/blog/llm-evaluation-metrics-everything-you-need-for-llm-evaluation) - 評価手法
10. [Production Prompt Engineering](https://eugeneyan.com/writing/prompting/) - 本番環境でのプロンプト

---

**実装時間目安**: 基本プロンプト作成 1人日、最適化・評価システム 2-3人日
