# React Server Components 実装ガイド

## 📚 目次

1. Server Componentsの基礎概念
2. Client ComponentsとServer Componentsの境界設計
3. データフェッチングパターン
4. ストリーミングとSuspense
5. キャッシング戦略
6. パフォーマンス最適化
7. 実装パターンとアンチパターン
8. LetterOS固有の実装例

## 1. Server Componentsの基礎概念

React Server Components (RSC)は、サーバー上でのみ実行されるReactコンポーネントです。LetterOSでは、AIによるメルマガ生成、データベースクエリ、外部API呼び出しなど、サーバー側のリソースに直接アクセスする必要がある機能で活用します。

### Server Componentsの特徴

**利点**：
- ゼロバンドル: JavaScriptバンドルサイズに影響しない
- 直接データアクセス: データベース、ファイルシステム、外部APIへ直接アクセス
- セキュリティ: 機密情報（APIキー、トークン）をサーバーに保持
- SEOフレンドリー: 完全にレンダリングされたHTMLを提供
- 自動コード分割: Client Componentsのみがバンドルに含まれる

**制限事項**：
- インタラクティブ機能なし（onClick、onChangeなど）
- Reactフック使用不可（useState、useEffectなど）
- ブラウザAPIアクセス不可（window、localStorageなど）
- Context API使用不可（createContext、useContext）

## 2. Client ComponentsとServer Componentsの境界設計

### 適切な境界設計の原則

```tsx
// ❌ アンチパターン: ルート全体をClient Componentに
'use client';

export default function NewsletterPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/newsletters').then(res => setData(res.json()));
  }, []);

  return <div>{/* ... */}</div>;
}
```

```tsx
// ✅ 推奨パターン: Server ComponentでデータフェッチしてClient Componentに渡す
// Server Component (デフォルト)
import { NewsletterEditor } from './NewsletterEditor';

export default async function NewsletterPage() {
  // サーバーで直接データ取得
  const newsletters = await db.newsletter.findMany();
  const aiSuggestions = await generateSuggestions(newsletters);

  return (
    <div>
      <h1>ニュースレター編集</h1>
      {/* Client Componentはインタラクティブな部分のみ */}
      <NewsletterEditor
        initialData={newsletters}
        suggestions={aiSuggestions}
      />
    </div>
  );
}

// Client Component - 別ファイル
'use client';

export function NewsletterEditor({ initialData, suggestions }) {
  const [content, setContent] = useState(initialData.content);
  // インタラクティブなロジックのみここで実装
}
```

### コンポーネント境界の設計パターン

```tsx
// Server Component: データレイヤー
export default async function DashboardPage() {
  const user = await getUser();
  const stats = await getNewsletterStats(user.id);

  return (
    <DashboardShell user={user}>
      {/* Server Component: 静的コンテンツ */}
      <StatsOverview data={stats} />

      {/* Client Component: インタラクティブなグラフ */}
      <InteractiveChart data={stats.chartData} />

      {/* Server Component: リスト表示 */}
      <RecentNewsletters userId={user.id} />
    </DashboardShell>
  );
}
```

## 3. データフェッチングパターン

### パターン1: 直接データベースアクセス

```tsx
// app/(dashboard)/newsletters/[id]/page.tsx
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewsletterDetailPage({ params }: PageProps) {
  const { id } = await params;

  const newsletter = await db.newsletter.findUnique({
    where: { id },
    include: {
      analytics: true,
      segments: true,
    },
  });

  if (!newsletter) {
    notFound();
  }

  return (
    <article>
      <h1>{newsletter.title}</h1>
      <NewsletterContent content={newsletter.content} />
      <AnalyticsPanel data={newsletter.analytics} />
    </article>
  );
}
```

### パターン2: 外部APIとのintegration

```tsx
// Server Componentで外部AI APIを呼び出し
import { openai } from '@/lib/openai';

export async function AIContentSuggestions({ topic }: { topic: string }) {
  const suggestions = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'あなたはメルマガの編集長AIです。',
      },
      {
        role: 'user',
        content: `「${topic}」についてのメルマガ案を3つ提案してください。`,
      },
    ],
  });

  const ideas = suggestions.choices[0].message.content;

  return (
    <div className="bg-blue-50 p-6 rounded-lg">
      <h3 className="font-bold mb-4">AI提案</h3>
      <div className="prose">{ideas}</div>
    </div>
  );
}
```

### パターン3: 並列データフェッチング

```tsx
// 複数のデータソースを並列取得
export default async function AnalyticsDashboard() {
  // Promise.allで並列実行 - 高速化
  const [
    openRates,
    clickRates,
    subscriberGrowth,
    topPerformers,
  ] = await Promise.all([
    fetchOpenRates(),
    fetchClickRates(),
    fetchSubscriberGrowth(),
    fetchTopPerformers(),
  ]);

  return (
    <div className="grid grid-cols-2 gap-6">
      <MetricCard title="開封率" data={openRates} />
      <MetricCard title="クリック率" data={clickRates} />
      <GrowthChart data={subscriberGrowth} />
      <TopNewsletters data={topPerformers} />
    </div>
  );
}
```

## 4. ストリーミングとSuspense

### 基本的なストリーミングパターン

```tsx
// app/(dashboard)/analytics/page.tsx
import { Suspense } from 'react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <h1>アナリティクス</h1>

      {/* 即座に表示される部分 */}
      <QuickStats />

      {/* データ取得中はスケルトンを表示 */}
      <Suspense fallback={<ChartSkeleton />}>
        <DetailedChart />
      </Suspense>

      <Suspense fallback={<TableSkeleton />}>
        <DataTable />
      </Suspense>
    </div>
  );
}

// 別ファイル: 重いデータフェッチを行うコンポーネント
async function DetailedChart() {
  // 時間のかかるデータ取得
  await new Promise(resolve => setTimeout(resolve, 2000));
  const data = await fetchDetailedAnalytics();

  return <ChartComponent data={data} />;
}
```

### ネストされたSuspense

```tsx
export default function NewsletterDetailPage({ params }) {
  return (
    <div>
      {/* 基本情報は優先的に表示 */}
      <Suspense fallback={<HeaderSkeleton />}>
        <NewsletterHeader id={params.id} />
      </Suspense>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          {/* エディタ部分 */}
          <Suspense fallback={<EditorSkeleton />}>
            <NewsletterContent id={params.id} />
          </Suspense>
        </div>

        <aside>
          {/* アナリティクスは遅延ロードでOK */}
          <Suspense fallback={<StatsSkeleton />}>
            <NewsletterAnalytics id={params.id} />
          </Suspense>
        </aside>
      </div>
    </div>
  );
}
```

## 5. キャッシング戦略

### fetch()のキャッシュオプション

```tsx
// 1. 静的データ（デフォルト: 無期限キャッシュ）
async function getProductList() {
  const res = await fetch('https://api.example.com/products');
  return res.json();
}

// 2. 動的データ（キャッシュなし）
async function getRealTimeStats() {
  const res = await fetch('https://api.example.com/stats', {
    cache: 'no-store', // 毎回最新データを取得
  });
  return res.json();
}

// 3. 時間ベースの再検証（ISR: Incremental Static Regeneration）
async function getNewsletterList() {
  const res = await fetch('https://api.example.com/newsletters', {
    next: { revalidate: 300 }, // 5分ごとに再生成
  });
  return res.json();
}

// 4. タグベースの再検証
async function getUserNewsletters(userId: string) {
  const res = await fetch(`https://api.example.com/users/${userId}/newsletters`, {
    next: { tags: ['newsletters', `user-${userId}`] },
  });
  return res.json();
}
```

### revalidatePathとrevalidateTag

```tsx
// app/actions.ts
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

export async function publishNewsletter(id: string) {
  await db.newsletter.update({
    where: { id },
    data: { status: 'published' },
  });

  // 特定のパスのキャッシュを無効化
  revalidatePath('/newsletters');
  revalidatePath(`/newsletters/${id}`);

  // タグベースの無効化
  revalidateTag('newsletters');
  revalidateTag(`newsletter-${id}`);
}
```

### Route Segment Config

```tsx
// app/(dashboard)/newsletters/page.tsx

// ページ全体のキャッシュ設定
export const revalidate = 60; // 60秒ごとに再検証
export const dynamic = 'force-dynamic'; // 常に動的レンダリング
export const fetchCache = 'force-no-store'; // fetchキャッシュを無効化

export default async function NewslettersPage() {
  const newsletters = await getNewsletters();
  return <NewsletterList newsletters={newsletters} />;
}
```

## 6. パフォーマンス最適化

### 1. Preload Pattern

```tsx
import { preload } from 'react-dom';

// データとコンポーネントの並列ロード
export default async function Page() {
  // データ取得を開始
  preload('/api/newsletters', { as: 'fetch' });

  // UIを並行してレンダリング
  const newsletters = await getNewsletters();

  return <NewsletterList newsletters={newsletters} />;
}
```

### 2. データのコロケーション

```tsx
// ❌ アンチパターン: データを親で取得して深くprops渡し
export default async function Page() {
  const data = await getAllData(); // 全データ取得

  return (
    <Layout>
      <Sidebar data={data.sidebar} />
      <Main data={data.main} />
      <Footer data={data.footer} />
    </Layout>
  );
}

// ✅ 推奨パターン: 各コンポーネントが必要なデータを取得
export default function Page() {
  return (
    <Layout>
      <Sidebar /> {/* 内部でデータ取得 */}
      <Main />    {/* 内部でデータ取得 */}
      <Footer />  {/* 内部でデータ取得 */}
    </Layout>
  );
}

async function Sidebar() {
  const sidebarData = await getSidebarData();
  return <aside>{/* ... */}</aside>;
}
```

### 3. 部分的プリレンダリング（PPR）

```tsx
// next.config.ts
export default {
  experimental: {
    ppr: true, // Partial Prerendering
  },
};

// 静的部分と動的部分を混在
export default function ProductPage() {
  return (
    <div>
      {/* 静的部分 - ビルド時にプリレンダリング */}
      <ProductDetails />

      {/* 動的部分 - リクエスト時にレンダリング */}
      <Suspense fallback={<Skeleton />}>
        <UserRecommendations />
      </Suspense>
    </div>
  );
}
```

## 7. 実装パターンとアンチパターン

### パターン1: Server Componentから Client Componentへデータ渡し

```tsx
// ✅ 正しい: propsでシリアライズ可能なデータを渡す
// Server Component
export default async function Page() {
  const data = await fetchData();

  return <ClientComponent data={data} />;
}

// Client Component
'use client';
export function ClientComponent({ data }) {
  const [state, setState] = useState(data);
  // ...
}
```

```tsx
// ❌ 誤り: 関数やシンボルは渡せない
export default async function Page() {
  const handleClick = () => console.log('clicked');

  return <ClientComponent onClick={handleClick} />; // エラー
}
```

### パターン2: Client ComponentからServer Componentへの子渡し

```tsx
// ✅ 正しい: children propsでServer Componentを渡す
// Client Component
'use client';
export function Tabs({ children }) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      <TabButtons onSelect={setActiveTab} />
      <div>{children}</div> {/* Server Componentを含められる */}
    </div>
  );
}

// Server Component
export default function Page() {
  return (
    <Tabs>
      <ServerDataComponent /> {/* Server Component */}
    </Tabs>
  );
}
```

### パターン3: Context API代替

```tsx
// ❌ アンチパターン: Server ComponentでContextは使えない
'use client';
const ThemeContext = createContext();

// Server Componentではエラー
export default function Layout({ children }) {
  return (
    <ThemeContext.Provider value="dark">
      {children}
    </ThemeContext.Provider>
  );
}
```

```tsx
// ✅ 推奨: Client ComponentでContextをラップ
// providers.tsx (Client Component)
'use client';
export function Providers({ children }) {
  return (
    <ThemeContext.Provider value="dark">
      {children}
    </ThemeContext.Provider>
  );
}

// layout.tsx (Server Component)
import { Providers } from './providers';

export default function Layout({ children }) {
  return (
    <html>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

## 8. LetterOS固有の実装例

### AI生成機能の実装

```tsx
// app/(dashboard)/newsletters/generate/page.tsx
import { generateNewsletterDraft } from '@/lib/ai';
import { DraftEditor } from './DraftEditor';

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const { topic } = await searchParams;

  let draft = null;
  if (topic) {
    // Server Componentで直接AI APIを呼び出し
    draft = await generateNewsletterDraft(topic);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1>AI メルマガ生成</h1>

      {draft ? (
        <DraftEditor initialDraft={draft} />
      ) : (
        <TopicSelector />
      )}
    </div>
  );
}
```

### 配信履歴とアナリティクス

```tsx
// app/(dashboard)/newsletters/[id]/analytics/page.tsx
import { Suspense } from 'react';
import { db } from '@/lib/db';

export default async function NewsletterAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 基本情報は即座に取得
  const newsletter = await db.newsletter.findUnique({
    where: { id },
    select: { title: true, sentAt: true, recipientCount: true },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1>{newsletter.title}</h1>
        <p>{newsletter.recipientCount}人に配信</p>
      </header>

      {/* リアルタイム統計はストリーミング */}
      <Suspense fallback={<StatsSkeleton />}>
        <LiveStats newsletterId={id} />
      </Suspense>

      {/* 詳細な分析は後から読み込み */}
      <Suspense fallback={<ChartSkeleton />}>
        <DetailedAnalytics newsletterId={id} />
      </Suspense>
    </div>
  );
}

async function LiveStats({ newsletterId }: { newsletterId: string }) {
  // リアルタイムデータ（キャッシュなし）
  const stats = await fetch(
    `https://api.letteros.com/analytics/${newsletterId}/live`,
    { cache: 'no-store' }
  );

  return <StatsCards data={await stats.json()} />;
}
```

## 🌐 参照リソース

### 公式ドキュメント

1. [React Server Components RFC](https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md) - RSC仕様書
2. [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components) - Next.js公式ガイド
3. [React Suspense](https://react.dev/reference/react/Suspense) - Suspense公式ドキュメント
4. [Next.js Caching](https://nextjs.org/docs/app/building-your-application/caching) - キャッシング完全ガイド
5. [Data Fetching Patterns](https://nextjs.org/docs/app/building-your-application/data-fetching/patterns) - データフェッチングパターン

### 実装記事・ベストプラクティス

6. [Understanding React Server Components](https://vercel.com/blog/understanding-react-server-components) - Vercel詳細解説
7. [Server Components Patterns](https://www.joshwcomeau.com/react/server-components/) - Josh Comeau実践ガイド
8. [RSC from Scratch](https://github.com/reactwg/server-components/discussions/5) - React WG ディスカッション
9. [Next.js 15 Best Practices](https://www.builder.io/blog/nextjs-15-best-practices) - Builder.io 2025版
10. [Streaming and Suspense Deep Dive](https://www.youtube.com/watch?v=pj5N-Khihgc) - Dan Abramov解説動画

---

**実装時間目安**: RSC基礎理解 1人日、実践的パターン習得 2-3人日
