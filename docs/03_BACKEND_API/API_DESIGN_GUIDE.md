# API Design Guide - LetterOS

## 📚 目次

1. API設計思想とアーキテクチャ
2. Next.js Route Handlers
3. RESTful API設計原則
4. エンドポイント設計パターン
5. エラーハンドリング
6. バリデーションとセキュリティ
7. API ドキュメンテーション
8. 実装例集

## 1. API設計思想とアーキテクチャ

LetterOSのAPIは、**Server Actions**と**Route Handlers**を組み合わせたハイブリッドアーキテクチャを採用します。

### アーキテクチャ原則

1. **Server Actions優先**: フォーム送信やシンプルなミューテーションはServer Actions
2. **Route Handlers**: 外部からのアクセス、Webhook、複雑なロジック
3. **型安全性**: TypeScriptで完全に型付け
4. **エラーハンドリング**: 一貫したエラーレスポンス形式
5. **バリデーション**: Zodによるスキーマ検証

### API構造

```
app/
├── api/
│   ├── newsletters/
│   │   ├── route.ts              # GET /api/newsletters, POST /api/newsletters
│   │   └── [id]/
│   │       ├── route.ts          # GET/PUT/DELETE /api/newsletters/[id]
│   │       └── send/
│   │           └── route.ts      # POST /api/newsletters/[id]/send
│   ├── ai/
│   │   └── generate/
│   │       └── route.ts          # POST /api/ai/generate
│   └── webhooks/
│       └── resend/
│           └── route.ts          # POST /api/webhooks/resend
└── actions/
    ├── newsletters.ts            # Server Actions
    ├── analytics.ts
    └── ai.ts
```

## 2. Next.js Route Handlers

### 基本的なRoute Handler

```typescript
// app/api/newsletters/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// GETリクエスト: ニュースレター一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');

    const newsletters = await db.newsletter.findMany({
      where: {
        userId: session.user.id,
        ...(status && { status }),
      },
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { createdAt: 'desc' },
    });

    const total = await db.newsletter.count({
      where: {
        userId: session.user.id,
        ...(status && { status }),
      },
    });

    return NextResponse.json({
      newsletters,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch newsletters:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POSTリクエスト: 新規ニュースレター作成
const createNewsletterSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(10),
  segmentId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createNewsletterSchema.parse(body);

    const newsletter = await db.newsletter.create({
      data: {
        ...validatedData,
        userId: session.user.id,
        status: 'draft',
      },
    });

    return NextResponse.json(
      { newsletter },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Failed to create newsletter:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

### 動的ルートパラメータ

```typescript
// app/api/newsletters/[id]/route.ts
interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: 単一ニュースレター取得
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;
  const session = await auth();

  const newsletter = await db.newsletter.findUnique({
    where: {
      id,
      userId: session?.user?.id,
    },
    include: {
      analytics: true,
      segment: true,
    },
  });

  if (!newsletter) {
    return NextResponse.json(
      { error: 'Newsletter not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ newsletter });
}

// PUT: ニュースレター更新
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;
  const session = await auth();
  const body = await request.json();

  const newsletter = await db.newsletter.update({
    where: {
      id,
      userId: session?.user?.id,
    },
    data: body,
  });

  return NextResponse.json({ newsletter });
}

// DELETE: ニュースレター削除
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;
  const session = await auth();

  await db.newsletter.delete({
    where: {
      id,
      userId: session?.user?.id,
    },
  });

  return NextResponse.json({ success: true }, { status: 204 });
}
```

## 3. RESTful API設計原則

### HTTPメソッドとCRUD操作

| HTTPメソッド | 操作 | 説明 | レスポンスコード |
|------------|-----|------|----------------|
| GET | Read | リソース取得 | 200 OK |
| POST | Create | リソース作成 | 201 Created |
| PUT | Update | リソース完全更新 | 200 OK |
| PATCH | Update | リソース部分更新 | 200 OK |
| DELETE | Delete | リソース削除 | 204 No Content |

### エンドポイント命名規則

```typescript
// ✅ 推奨パターン
GET    /api/newsletters              // 一覧取得
GET    /api/newsletters/:id          // 単一取得
POST   /api/newsletters              // 新規作成
PUT    /api/newsletters/:id          // 更新
DELETE /api/newsletters/:id          // 削除
POST   /api/newsletters/:id/send     // アクション実行
GET    /api/newsletters/:id/analytics // ネストされたリソース

// ❌ 避けるべきパターン
GET    /api/getAllNewsletters         // 動詞を使わない
POST   /api/newsletter/create         // createは不要
GET    /api/newsletter_list           // アンダースコア使用は避ける
```

## 4. エンドポイント設計パターン

### パターン1: ページネーション

```typescript
// app/api/newsletters/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));
  const cursor = searchParams.get('cursor'); // カーソルベースページネーション

  // カーソルベースページネーション（推奨）
  if (cursor) {
    const newsletters = await db.newsletter.findMany({
      take: limit,
      skip: 1,
      cursor: { id: cursor },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      newsletters,
      nextCursor: newsletters[newsletters.length - 1]?.id,
      hasMore: newsletters.length === limit,
    });
  }

  // オフセットベースページネーション
  const newsletters = await db.newsletter.findMany({
    take: limit,
    skip: (page - 1) * limit,
    orderBy: { createdAt: 'desc' },
  });

  const total = await db.newsletter.count();

  return NextResponse.json({
    newsletters,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
```

### パターン2: フィルタリングとソート

```typescript
// app/api/newsletters/route.ts
const filterSchema = z.object({
  status: z.enum(['draft', 'scheduled', 'sent']).optional(),
  search: z.string().optional(),
  segmentId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'sentAt', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const filters = filterSchema.parse(Object.fromEntries(searchParams));

  const newsletters = await db.newsletter.findMany({
    where: {
      ...(filters.status && { status: filters.status }),
      ...(filters.segmentId && { segmentId: filters.segmentId }),
      ...(filters.search && {
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { content: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
      ...(filters.dateFrom && {
        createdAt: { gte: new Date(filters.dateFrom) },
      }),
      ...(filters.dateTo && {
        createdAt: { lte: new Date(filters.dateTo) },
      }),
    },
    orderBy: {
      [filters.sortBy]: filters.sortOrder,
    },
  });

  return NextResponse.json({ newsletters });
}
```

### パターン3: バッチ操作

```typescript
// app/api/newsletters/batch/route.ts
const batchDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

export async function DELETE(request: NextRequest) {
  const session = await auth();
  const body = await request.json();
  const { ids } = batchDeleteSchema.parse(body);

  const result = await db.newsletter.deleteMany({
    where: {
      id: { in: ids },
      userId: session?.user?.id,
    },
  });

  return NextResponse.json({
    deleted: result.count,
  });
}
```

## 5. エラーハンドリング

### 標準化されたエラーレスポンス

```typescript
// lib/api-error.ts
export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export function handleAPIError(error: unknown): NextResponse {
  if (error instanceof APIError) {
    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: {
          message: 'Validation Error',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
      },
      { status: 400 }
    );
  }

  // 予期しないエラー
  console.error('Unexpected API error:', error);
  return NextResponse.json(
    {
      error: {
        message: 'Internal Server Error',
        code: 'INTERNAL_ERROR',
      },
    },
    { status: 500 }
  );
}

// 使用例
export async function POST(request: NextRequest) {
  try {
    // ビジネスロジック
    throw new APIError(404, 'Newsletter not found', 'NEWSLETTER_NOT_FOUND');
  } catch (error) {
    return handleAPIError(error);
  }
}
```

### エラーコード定義

```typescript
// lib/error-codes.ts
export const ErrorCodes = {
  // Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Business Logic
  NEWSLETTER_ALREADY_SENT: 'NEWSLETTER_ALREADY_SENT',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',

  // External Services
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  EMAIL_SERVICE_ERROR: 'EMAIL_SERVICE_ERROR',
} as const;
```

## 6. バリデーションとセキュリティ

### リクエストバリデーション

```typescript
// lib/validations/api.ts
import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const newsletterCreateSchema = z.object({
  title: z.string().min(1, '件名は必須です').max(200),
  content: z.string().min(10, '本文は10文字以上必要です'),
  segmentId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const newsletterUpdateSchema = newsletterCreateSchema.partial();

// 使用例
import { newsletterCreateSchema } from '@/lib/validations/api';

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const validated = newsletterCreateSchema.parse(body);
    // バリデーション済みデータを使用
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
  }
}
```

### レート制限

```typescript
// lib/rate-limit.ts
import { LRUCache } from 'lru-cache';

type RateLimitOptions = {
  interval: number;
  uniqueTokenPerInterval: number;
};

export function rateLimit(options: RateLimitOptions) {
  const tokenCache = new LRUCache({
    max: options.uniqueTokenPerInterval || 500,
    ttl: options.interval || 60000,
  });

  return {
    check: (limit: number, token: string) =>
      new Promise<void>((resolve, reject) => {
        const tokenCount = (tokenCache.get(token) as number[]) || [0];
        if (tokenCount[0] === 0) {
          tokenCache.set(token, tokenCount);
        }
        tokenCount[0] += 1;

        const currentUsage = tokenCount[0];
        const isRateLimited = currentUsage >= limit;

        return isRateLimited ? reject() : resolve();
      }),
  };
}

// 使用例
const limiter = rateLimit({
  interval: 60 * 1000, // 60秒
  uniqueTokenPerInterval: 500,
});

export async function POST(request: NextRequest) {
  const ip = request.ip ?? 'anonymous';

  try {
    await limiter.check(10, ip); // 1分あたり10リクエスト
  } catch {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  // 通常の処理
}
```

## 7. API ドキュメンテーション

### OpenAPI仕様

```yaml
# openapi.yaml
openapi: 3.0.0
info:
  title: LetterOS API
  version: 1.0.0
  description: AI駆動型ニュースレター配信プラットフォームAPI

servers:
  - url: https://api.letteros.com/v1
    description: Production
  - url: http://localhost:3000/api
    description: Development

paths:
  /newsletters:
    get:
      summary: ニュースレター一覧取得
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  newsletters:
                    type: array
                    items:
                      $ref: '#/components/schemas/Newsletter'

components:
  schemas:
    Newsletter:
      type: object
      properties:
        id:
          type: string
          format: uuid
        title:
          type: string
        content:
          type: string
        status:
          type: string
          enum: [draft, scheduled, sent]
```

## 8. 実装例集

### AI生成エンドポイント

```typescript
// app/api/ai/generate/route.ts
import { openai } from '@/lib/openai';
import { StreamingTextResponse } from 'ai';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const { topic, context } = await request.json();

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'あなたはメルマガの編集長AIです。',
      },
      {
        role: 'user',
        content: `「${topic}」についてメルマガを生成してください。${context}`,
      },
    ],
    stream: true,
  });

  // ストリーミングレスポンス
  return new StreamingTextResponse(response);
}
```

### Webhook受信エンドポイント

```typescript
// app/api/webhooks/resend/route.ts
import { headers } from 'next/headers';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const headersList = await headers();
  const signature = headersList.get('resend-signature');

  // 署名検証
  if (!verifyWebhookSignature(signature, await request.text())) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = await request.json();

  // イベント処理
  await db.emailEvent.create({
    data: {
      type: event.type,
      emailId: event.data.email_id,
      metadata: event.data,
    },
  });

  return NextResponse.json({ received: true });
}
```

## 🌐 参照リソース

### 公式ドキュメント

1. [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) - 公式ガイド
2. [Zod Documentation](https://zod.dev/) - バリデーションライブラリ
3. [OpenAPI Specification](https://swagger.io/specification/) - API仕様標準
4. [REST API Best Practices](https://restfulapi.net/) - RESTful設計原則
5. [HTTP Status Codes](https://httpstatuses.com/) - ステータスコード一覧

### 実装記事

6. [API Design Best Practices](https://www.freecodecamp.org/news/rest-api-design-best-practices-build-a-rest-api/) - ベストプラクティス
7. [Next.js API Routes Security](https://vercel.com/guides/security-best-practices-nextjs) - セキュリティガイド
8. [Error Handling in APIs](https://blog.logrocket.com/handling-errors-in-node-js/) - エラーハンドリング
9. [API Rate Limiting](https://blog.logrocket.com/rate-limiting-node-js/) - レート制限実装
10. [API Versioning Strategies](https://www.baeldung.com/rest-versioning) - バージョニング戦略

---

**実装時間目安**: 基本API実装 2人日、高度な機能 3-4人日
