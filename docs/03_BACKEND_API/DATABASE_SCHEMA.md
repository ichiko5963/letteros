# Database Schema Design - LetterOS

## 📚 目次

1. データベース設計思想
2. Prisma ORM セットアップ
3. スキーマ定義
4. リレーションシップ設計
5. インデックス戦略
6. マイグレーション管理
7. クエリ最適化
8. データシーディング

## 1. データベース設計思想

LetterOSのデータベース設計は、**拡張性**、**パフォーマンス**、**データ整合性**を重視します。

### 技術スタック

- **データベース**: PostgreSQL 16+
- **ORM**: Prisma 6+
- **ホスティング**: Supabase / Neon / Vercel Postgres
- **キャッシング**: Redis (Upstash)

### 設計原則

1. **正規化**: 第3正規形を基本とし、パフォーマンスのため必要に応じて非正規化
2. **UUID**: プライマリキーはUUID v4を使用
3. **タイムスタンプ**: すべてのテーブルに`createdAt`と`updatedAt`を含める
4. **Soft Delete**: 重要データは論理削除（`deletedAt`）
5. **監査ログ**: 変更履歴を追跡

## 2. Prisma ORM セットアップ

### インストール

```bash
npm install prisma @prisma/client
npm install -D prisma
```

### 初期化

```bash
npx prisma init
```

### 環境変数設定

```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/letteros?schema=public"
```

### Prisma設定

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "postgresqlExtensions"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  extensions = [pgvector(map: "vector")]
}
```

## 3. スキーマ定義

### User（ユーザー）

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  accounts      Account[]
  sessions      Session[]
  newsletters   Newsletter[]
  segments      Segment[]
  apiKeys       ApiKey[]

  @@index([email])
  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("sessions")
}
```

### Newsletter（ニュースレター）

```prisma
enum NewsletterStatus {
  DRAFT
  SCHEDULED
  SENDING
  SENT
  FAILED
}

model Newsletter {
  id          String            @id @default(cuid())
  title       String            @db.VarChar(200)
  content     String            @db.Text
  status      NewsletterStatus  @default(DRAFT)
  scheduledAt DateTime?
  sentAt      DateTime?

  userId      String
  segmentId   String?

  // AI関連
  aiGenerated Boolean  @default(false)
  aiPrompt    String?  @db.Text
  aiModel     String?

  // メタデータ
  metadata    Json?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  // Relations
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  segment     Segment?     @relation(fields: [segmentId], references: [id], onDelete: SetNull)
  versions    NewsletterVersion[]
  analytics   NewsletterAnalytics?
  emails      Email[]

  @@index([userId, status])
  @@index([scheduledAt])
  @@index([createdAt])
  @@map("newsletters")
}
```

### NewsletterVersion（バージョン管理）

```prisma
model NewsletterVersion {
  id           String   @id @default(cuid())
  newsletterId String
  version      Int
  title        String   @db.VarChar(200)
  content      String   @db.Text
  changes      String?  @db.Text
  createdBy    String?

  createdAt    DateTime @default(now())

  newsletter   Newsletter @relation(fields: [newsletterId], references: [id], onDelete: Cascade)

  @@unique([newsletterId, version])
  @@index([newsletterId])
  @@map("newsletter_versions")
}
```

### Segment（配信セグメント）

```prisma
model Segment {
  id          String   @id @default(cuid())
  name        String
  description String?
  filters     Json     // 動的なフィルタ条件

  userId      String

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  newsletters Newsletter[]
  subscribers Subscriber[]

  @@index([userId])
  @@map("segments")
}
```

### Subscriber（購読者）

```prisma
enum SubscriberStatus {
  ACTIVE
  UNSUBSCRIBED
  BOUNCED
  COMPLAINED
}

model Subscriber {
  id        String            @id @default(cuid())
  email     String
  name      String?
  status    SubscriberStatus  @default(ACTIVE)

  // カスタムフィールド
  metadata  Json?

  userId    String
  segmentId String?

  subscribedAt   DateTime  @default(now())
  unsubscribedAt DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  segment  Segment?  @relation(fields: [segmentId], references: [id], onDelete: SetNull)
  emails   Email[]

  @@unique([email, userId])
  @@index([userId, status])
  @@index([email])
  @@map("subscribers")
}
```

### Email（配信メール）

```prisma
enum EmailStatus {
  PENDING
  SENT
  DELIVERED
  OPENED
  CLICKED
  BOUNCED
  COMPLAINED
  FAILED
}

model Email {
  id           String      @id @default(cuid())
  newsletterId String
  subscriberId String
  status       EmailStatus @default(PENDING)

  // メール情報
  subject      String
  sentAt       DateTime?
  deliveredAt  DateTime?
  openedAt     DateTime?
  clickedAt    DateTime?

  // Resend関連
  resendId     String?     @unique
  tags         Json?

  // エラー情報
  errorMessage String?

  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  newsletter   Newsletter  @relation(fields: [newsletterId], references: [id], onDelete: Cascade)
  subscriber   Subscriber  @relation(fields: [subscriberId], references: [id], onDelete: Cascade)
  events       EmailEvent[]

  @@index([newsletterId])
  @@index([subscriberId])
  @@index([status])
  @@index([resendId])
  @@map("emails")
}
```

### EmailEvent（メールイベントログ）

```prisma
enum EventType {
  SENT
  DELIVERED
  DELIVERY_DELAYED
  BOUNCED
  OPENED
  CLICKED
  UNSUBSCRIBED
  COMPLAINED
}

model EmailEvent {
  id        String    @id @default(cuid())
  emailId   String
  type      EventType
  metadata  Json?
  timestamp DateTime  @default(now())

  email     Email     @relation(fields: [emailId], references: [id], onDelete: Cascade)

  @@index([emailId, type])
  @@index([timestamp])
  @@map("email_events")
}
```

### NewsletterAnalytics（分析データ）

```prisma
model NewsletterAnalytics {
  id           String   @id @default(cuid())
  newsletterId String   @unique

  // 配信統計
  totalSent    Int      @default(0)
  delivered    Int      @default(0)
  bounced      Int      @default(0)
  failed       Int      @default(0)

  // エンゲージメント統計
  opened       Int      @default(0)
  clicked      Int      @default(0)
  unsubscribed Int      @default(0)
  complained   Int      @default(0)

  // 率（計算フィールドではなく定期的に更新）
  openRate     Float    @default(0)
  clickRate    Float    @default(0)
  bounceRate   Float    @default(0)

  updatedAt    DateTime @updatedAt

  newsletter   Newsletter @relation(fields: [newsletterId], references: [id], onDelete: Cascade)

  @@map("newsletter_analytics")
}
```

### AIGeneration（AI生成履歴）

```prisma
model AIGeneration {
  id        String   @id @default(cuid())
  userId    String
  prompt    String   @db.Text
  response  String   @db.Text
  model     String
  tokens    Int?
  cost      Float?

  // コンテキスト
  context   Json?

  createdAt DateTime @default(now())

  @@index([userId])
  @@index([createdAt])
  @@map("ai_generations")
}
```

## 4. リレーションシップ設計

### ERD（Entity Relationship Diagram）

```mermaid
erDiagram
    User ||--o{ Newsletter : creates
    User ||--o{ Segment : owns
    User ||--o{ Subscriber : manages
    Newsletter ||--o{ NewsletterVersion : has
    Newsletter ||--|| NewsletterAnalytics : has
    Newsletter }o--|| Segment : targets
    Newsletter ||--o{ Email : generates
    Subscriber ||--o{ Email : receives
    Subscriber }o--|| Segment : belongs_to
    Email ||--o{ EmailEvent : tracks
```

### リレーションシップのベストプラクティス

1. **Cascade削除**: ユーザーが削除されたら関連データも削除
2. **SetNull**: セグメント削除時、ニュースレターは残す
3. **Restrict**: 参照整合性が重要な場合に使用

## 5. インデックス戦略

### 複合インデックス

```prisma
model Newsletter {
  // ...

  @@index([userId, status, createdAt(sort: Desc)])
  @@index([scheduledAt, status])
}

model Email {
  // ...

  @@index([subscriberId, status])
  @@index([newsletterId, openedAt])
}
```

### フルテキスト検索

```prisma
model Newsletter {
  id      String @id @default(cuid())
  title   String
  content String @db.Text

  @@index([title(ops: raw("gin_trgm_ops"))], type: Gin)
  @@index([content(ops: raw("gin_trgm_ops"))], type: Gin)
}
```

## 6. マイグレーション管理

### マイグレーション作成

```bash
# 開発環境
npx prisma migrate dev --name add_ai_generation_table

# 本番環境
npx prisma migrate deploy
```

### マイグレーションファイル例

```sql
-- CreateTable
CREATE TABLE "newsletters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "newsletters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE INDEX "newsletters_userId_status_idx" ON "newsletters"("userId", "status");
```

### ロールバック

```bash
npx prisma migrate resolve --rolled-back <migration_name>
```

## 7. クエリ最適化

### N+1問題の回避

```typescript
// ❌ N+1問題あり
const newsletters = await db.newsletter.findMany();
for (const newsletter of newsletters) {
  const analytics = await db.newsletterAnalytics.findUnique({
    where: { newsletterId: newsletter.id },
  });
}

// ✅ includeで一括取得
const newsletters = await db.newsletter.findMany({
  include: {
    analytics: true,
    segment: true,
  },
});
```

### 選択的フィールド取得

```typescript
// 必要なフィールドのみ取得
const newsletters = await db.newsletter.findMany({
  select: {
    id: true,
    title: true,
    status: true,
    createdAt: true,
    analytics: {
      select: {
        openRate: true,
        clickRate: true,
      },
    },
  },
});
```

### ページネーション

```typescript
// カーソルベースページネーション（推奨）
const newsletters = await db.newsletter.findMany({
  take: 20,
  skip: 1,
  cursor: {
    id: lastId,
  },
  orderBy: {
    createdAt: 'desc',
  },
});

// オフセットベース
const newsletters = await db.newsletter.findMany({
  take: 20,
  skip: (page - 1) * 20,
});
```

## 8. データシーディング

### シードスクリプト

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  // ユーザー作成
  const user = await prisma.user.create({
    data: {
      email: 'demo@letteros.com',
      name: 'Demo User',
    },
  });

  // セグメント作成
  const segment = await prisma.segment.create({
    data: {
      name: 'All Subscribers',
      userId: user.id,
      filters: {},
    },
  });

  // 購読者を100人作成
  const subscribers = await Promise.all(
    Array.from({ length: 100 }).map(() =>
      prisma.subscriber.create({
        data: {
          email: faker.internet.email(),
          name: faker.person.fullName(),
          userId: user.id,
          segmentId: segment.id,
        },
      })
    )
  );

  // ニュースレターを10個作成
  for (let i = 0; i < 10; i++) {
    const newsletter = await prisma.newsletter.create({
      data: {
        title: faker.lorem.sentence(),
        content: faker.lorem.paragraphs(5),
        status: faker.helpers.arrayElement(['DRAFT', 'SENT']),
        userId: user.id,
        segmentId: segment.id,
      },
    });

    // 分析データ作成
    await prisma.newsletterAnalytics.create({
      data: {
        newsletterId: newsletter.id,
        totalSent: 100,
        delivered: 98,
        opened: faker.number.int({ min: 20, max: 80 }),
        clicked: faker.number.int({ min: 5, max: 40 }),
        openRate: faker.number.float({ min: 0.2, max: 0.8 }),
        clickRate: faker.number.float({ min: 0.05, max: 0.4 }),
      },
    });
  }

  console.log('Seed data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### package.json設定

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "scripts": {
    "db:seed": "prisma db seed"
  }
}
```

### シード実行

```bash
npm run db:seed
```

## 🌐 参照リソース

### 公式ドキュメント

1. [Prisma Documentation](https://www.prisma.io/docs) - Prisma公式ガイド
2. [PostgreSQL Documentation](https://www.postgresql.org/docs/) - PostgreSQL公式
3. [Supabase Database](https://supabase.com/docs/guides/database) - Supabaseデータベースガイド
4. [Neon Documentation](https://neon.tech/docs/introduction) - Neonサーバーレス Postgres
5. [Prisma Schema Reference](https://www.prisma.io/docs/orm/prisma-schema/overview) - スキーマリファレンス

### 実装記事・ベストプラクティス

6. [Database Design Best Practices](https://www.prisma.io/dataguide/types/relational/comparing-database-types) - DB設計原則
7. [Prisma Performance Optimization](https://www.prisma.io/docs/orm/prisma-client/queries/query-optimization-performance) - パフォーマンス最適化
8. [Database Indexing Strategies](https://use-the-index-luke.com/) - インデックス戦略
9. [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization) - パフォーマンスチューニング
10. [Schema Migration Patterns](https://www.prisma.io/docs/orm/prisma-migrate/workflows) - マイグレーションワークフロー

---

**実装時間目安**: スキーマ設計 1人日、マイグレーション 0.5人日、最適化 1-2人日
