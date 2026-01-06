# Next.js App Router 完全実装ガイド

## 📚 目次

1. App Routerの概要と設計思想
2. ファイルベースルーティングシステム
3. Server ComponentsとClient Componentsの使い分け
4. レイアウトとテンプレート設計
5. データフェッチング戦略
6. ローディング・エラーハンドリング
7. パフォーマンス最適化
8. 実装パターン集

## 1. App Routerの概要と設計思想

Next.js 16のApp Routerは、React Server Components (RSC)を基盤とした新しいルーティングシステムです。LetterOSでは、メルマガ編集、配信管理、分析ダッシュボードなど、複雑なUI要件を効率的に実装するために、App Routerの特性を最大限活用します。

### 主要な設計原則

- **デフォルトでServer Components**: サーバーサイドレンダリングによる高速な初期ロード
- **ストリーミングSSR**: Suspenseを活用した段階的レンダリング
- **レイアウトの再利用**: ナビゲーション時にレイアウトを保持し、部分的に更新
- **並列データフェッチ**: 複数のデータソースを同時に取得

## 2. ファイルベースルーティングシステム

LetterOSの推奨ディレクトリ構造：

```
app/
├── (auth)/              # ルートグループ（URLに影響しない）
│   ├── login/
│   │   └── page.tsx
│   └── signup/
│       └── page.tsx
├── (dashboard)/         # 認証後のダッシュボード
│   ├── layout.tsx       # 共通レイアウト
│   ├── newsletters/     # メルマガ一覧
│   │   ├── page.tsx
│   │   ├── [id]/        # 動的ルート
│   │   │   ├── page.tsx
│   │   │   └── edit/
│   │   │       └── page.tsx
│   │   └── new/
│   │       └── page.tsx
│   ├── analytics/       # 分析ダッシュボード
│   │   └── page.tsx
│   └── settings/
│       └── page.tsx
├── api/                 # API Routes
│   ├── newsletters/
│   │   └── route.ts
│   └── ai/
│       └── generate/
│           └── route.ts
├── layout.tsx           # ルートレイアウト
├── page.tsx             # ホームページ
├── loading.tsx          # グローバルローディング
└── error.tsx            # グローバルエラー
```

### 特殊ファイルの役割

| ファイル名 | 目的 | Server/Client |
|----------|------|--------------|
| `layout.tsx` | ネストされた共通レイアウト | Server |
| `page.tsx` | ルート固有のUI | Server/Client |
| `loading.tsx` | Suspenseベースのローディング | Server |
| `error.tsx` | エラーバウンダリ | Client必須 |
| `not-found.tsx` | 404ページ | Server |
| `route.ts` | API エンドポイント | Server |

## 3. Server ComponentsとClient Componentsの使い分け

### Server Components（デフォルト）の利点

```tsx
// app/(dashboard)/newsletters/page.tsx
import { db } from '@/lib/db';

// デフォルトでServer Component - 直接DBにアクセス可能
export default async function NewslettersPage() {
  // サーバーサイドでデータ取得
  const newsletters = await db.newsletter.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">ニュースレター一覧</h1>
      <NewsletterList newsletters={newsletters} />
    </div>
  );
}
```

**Server Componentsを使うべき場合**：
- データベースや外部APIへの直接アクセス
- 機密情報（APIキー、トークン）の使用
- 大きな依存関係を持つライブラリの使用
- SEOが重要なコンテンツ

### Client Components（'use client'）

```tsx
// app/(dashboard)/newsletters/components/NewsletterEditor.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function NewsletterEditor({ initialData }) {
  const [content, setContent] = useState(initialData?.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/newsletters', {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      router.refresh(); // サーバーコンポーネントを再取得
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full min-h-[500px] p-4 border rounded"
      />
      <button onClick={handleSave} disabled={isSaving}>
        {isSaving ? '保存中...' : '保存'}
      </button>
    </div>
  );
}
```

**Client Componentsを使うべき場合**：
- インタラクティブなイベントハンドラ（onClick、onChange）
- State/Effect Hooks（useState、useEffect）
- ブラウザ専用API（localStorage、navigator）
- カスタムフック

### 混在パターン（推奨）

```tsx
// app/(dashboard)/newsletters/[id]/page.tsx (Server Component)
import { NewsletterEditor } from './components/NewsletterEditor';
import { NewsletterStats } from './components/NewsletterStats';

export default async function NewsletterDetailPage({ params }) {
  const newsletter = await getNewsletterById(params.id);
  const stats = await getNewsletterStats(params.id);

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2">
        {/* Client Component: インタラクティブなエディタ */}
        <NewsletterEditor initialData={newsletter} />
      </div>
      <aside className="col-span-1">
        {/* Server Component: 静的な統計表示 */}
        <NewsletterStats data={stats} />
      </aside>
    </div>
  );
}
```

## 4. レイアウトとテンプレート設計

### ルートレイアウト（必須）

```tsx
// app/layout.tsx
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'LetterOS - メルマガ運用OS',
  description: 'AI駆動型ニュースレター配信プラットフォーム',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
```

### ネストされたレイアウト

```tsx
// app/(dashboard)/layout.tsx
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen">
      <Sidebar user={session.user} />
      <div className="flex-1 flex flex-col">
        <Header user={session.user} />
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
```

## 5. データフェッチング戦略

### 並列データフェッチ（推奨）

```tsx
// app/(dashboard)/analytics/page.tsx
async function getOpenRates() {
  const res = await fetch('https://api.letteros.com/stats/opens', {
    next: { revalidate: 300 }, // 5分キャッシュ
  });
  return res.json();
}

async function getClickRates() {
  const res = await fetch('https://api.letteros.com/stats/clicks', {
    next: { revalidate: 300 },
  });
  return res.json();
}

export default async function AnalyticsPage() {
  // 並列実行 - 高速化
  const [openRates, clickRates] = await Promise.all([
    getOpenRates(),
    getClickRates(),
  ]);

  return (
    <div className="grid grid-cols-2 gap-6">
      <MetricCard title="開封率" data={openRates} />
      <MetricCard title="クリック率" data={clickRates} />
    </div>
  );
}
```

### ストリーミングとSuspense

```tsx
// app/(dashboard)/newsletters/page.tsx
import { Suspense } from 'react';
import { NewsletterList } from './components/NewsletterList';
import { NewsletterListSkeleton } from './components/NewsletterListSkeleton';

export default function NewslettersPage() {
  return (
    <div>
      <h1>ニュースレター</h1>
      {/* データ取得中はSkeletonを表示 */}
      <Suspense fallback={<NewsletterListSkeleton />}>
        <NewsletterList />
      </Suspense>
    </div>
  );
}

// 別ファイル: components/NewsletterList.tsx
async function NewsletterList() {
  const newsletters = await fetch('https://api.letteros.com/newsletters');
  // レンダリング
}
```

## 6. ローディング・エラーハンドリング

### loading.tsx（自動Suspense）

```tsx
// app/(dashboard)/newsletters/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  );
}
```

### error.tsx（エラーバウンダリ）

```tsx
// app/(dashboard)/newsletters/error.tsx
'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Newsletter error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <h2 className="text-2xl font-bold mb-4">エラーが発生しました</h2>
      <p className="text-gray-600 mb-6">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        再試行
      </button>
    </div>
  );
}
```

## 7. パフォーマンス最適化

### 1. 動的インポートでコード分割

```tsx
'use client';

import dynamic from 'next/dynamic';

// 重いエディタコンポーネントを遅延ロード
const RichTextEditor = dynamic(
  () => import('@/components/RichTextEditor'),
  {
    loading: () => <p>エディタを読み込み中...</p>,
    ssr: false, // クライアントサイドのみ
  }
);

export function NewsletterEditor() {
  return (
    <div>
      <RichTextEditor />
    </div>
  );
}
```

### 2. 画像最適化

```tsx
import Image from 'next/image';

export function NewsletterThumbnail({ src, alt }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={600}
      height={400}
      quality={80}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..."
      className="rounded-lg"
    />
  );
}
```

### 3. Partial Prerendering（実験的機能）

```tsx
// next.config.ts
export default {
  experimental: {
    ppr: true, // Partial Prerendering有効化
  },
};
```

## 8. 実装パターン集

### パターン1: 楽観的更新（Optimistic UI）

```tsx
'use client';

import { useOptimistic } from 'react';
import { markAsRead } from '@/app/actions';

export function Newsletter({ id, isRead }) {
  const [optimisticRead, setOptimisticRead] = useOptimistic(
    isRead,
    (state, newState) => newState
  );

  const handleMarkAsRead = async () => {
    setOptimisticRead(true);
    await markAsRead(id);
  };

  return (
    <button
      onClick={handleMarkAsRead}
      className={optimisticRead ? 'opacity-50' : ''}
    >
      {optimisticRead ? '既読' : '未読'}
    </button>
  );
}
```

### パターン2: Server Actions

```tsx
// app/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';

export async function createNewsletter(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  await db.newsletter.create({
    data: { title, content },
  });

  revalidatePath('/newsletters');
}

// Client Component
'use client';

import { createNewsletter } from '@/app/actions';

export function CreateNewsletterForm() {
  return (
    <form action={createNewsletter}>
      <input name="title" required />
      <textarea name="content" required />
      <button type="submit">作成</button>
    </form>
  );
}
```

### パターン3: ルートハンドラ（API Routes）

```tsx
// app/api/newsletters/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;

  const newsletters = await db.newsletter.findMany({
    skip: (page - 1) * limit,
    take: limit,
  });

  return NextResponse.json({ newsletters });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const newsletter = await db.newsletter.create({
    data: body,
  });

  return NextResponse.json({ newsletter }, { status: 201 });
}
```

## 🌐 参照リソース

### 公式ドキュメント

1. [Next.js App Router Documentation](https://nextjs.org/docs/app) - 公式App Routerガイド
2. [React Server Components](https://react.dev/reference/rsc/server-components) - RSC公式ドキュメント
3. [Next.js Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching) - データフェッチング詳細
4. [Next.js Routing](https://nextjs.org/docs/app/building-your-application/routing) - ルーティング完全ガイド
5. [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images) - 画像最適化

### 実装記事・ベストプラクティス

6. [Patterns for Building React Apps with Next.js](https://vercel.com/blog/building-react-apps-with-nextjs) - Vercel公式パターン集
7. [Server Components Best Practices](https://www.builder.io/blog/nextjs-14-app-router-best-practices) - Builder.io実装ガイド
8. [Next.js Performance Optimization Guide](https://www.patterns.dev/react/nextjs) - Patterns.dev最適化ガイド
9. [App Router Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration) - Pages Routerからの移行
10. [React 19 and Next.js 15+ Features](https://react.dev/blog/2024/04/25/react-19) - React 19新機能

### コミュニティリソース

11. [Next.js Examples Repository](https://github.com/vercel/next.js/tree/canary/examples) - 公式サンプル集
12. [Awesome Next.js](https://github.com/unicodeveloper/awesome-nextjs) - Next.js厳選リソース
13. [Next.js Discord Community](https://nextjs.org/discord) - 公式コミュニティ

---

**実装時間目安**: 初期セットアップ 0.5人日、基本ルーティング 1人日、高度な機能 2-3人日
