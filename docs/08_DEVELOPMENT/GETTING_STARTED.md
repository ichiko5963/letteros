# Getting Started - LetterOS 開発ガイド

## 📚 目次

1. 開発環境の準備
2. プロジェクトのセットアップ
3. データベースの初期化
4. 開発サーバーの起動
5. プロジェクト構造の理解
6. 最初の機能実装
7. トラブルシューティング
8. 次のステップ

## 1. 開発環境の準備

### 必要なソフトウェア

LetterOSの開発には以下のソフトウェアが必要です：

| ソフトウェア | バージョン | 用途 |
|------------|----------|------|
| Node.js | 20.x以上 | JavaScriptランタイム |
| npm | 10.x以上 | パッケージマネージャー |
| PostgreSQL | 16.x以上 | データベース |
| Git | 最新版 | バージョン管理 |

### インストール手順

#### macOS

```bash
# Homebrewでインストール
brew install node@20
brew install postgresql@16
brew install git

# PostgreSQL起動
brew services start postgresql@16
```

#### Windows

```bash
# Node.jsをインストール
# https://nodejs.org/ からダウンロード

# PostgreSQLをインストール
# https://www.postgresql.org/download/windows/

# Gitをインストール
# https://git-scm.com/download/win
```

#### Linux (Ubuntu/Debian)

```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL
sudo apt-get install postgresql-16

# Git
sudo apt-get install git
```

### 推奨ツール

```bash
# VS Code（エディタ）
https://code.visualstudio.com/

# VS Code拡張機能
- ESLint
- Prettier
- Prisma
- Tailwind CSS IntelliSense
- GitLens
```

## 2. プロジェクトのセットアップ

### リポジトリのクローン

```bash
# HTTPSでクローン
git clone https://github.com/your-org/letteros.git

# SSHでクローン（推奨）
git clone git@github.com:your-org/letteros.git

# ディレクトリに移動
cd letteros
```

### 依存関係のインストール

```bash
# パッケージをインストール
npm install

# インストール確認
npm list --depth=0
```

**インストールされる主なパッケージ**：
- `next@16.1.1` - フレームワーク
- `react@19.2.3` - UIライブラリ
- `@prisma/client` - ORMクライアント
- `next-auth` - 認証
- `tailwindcss` - CSSフレームワーク
- `zod` - バリデーション

### 環境変数の設定

```bash
# .env.exampleをコピー
cp .env.example .env

# .envファイルを編集
nano .env  # または code .env
```

**必須の環境変数**：

```bash
# .env
# データベース
DATABASE_URL="postgresql://postgres:password@localhost:5432/letteros"

# NextAuth
AUTH_SECRET="your-secret-key"  # openssl rand -base64 32 で生成
AUTH_URL="http://localhost:3000"

# Google OAuth（オプション）
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# GitHub OAuth（オプション）
AUTH_GITHUB_ID="your-github-client-id"
AUTH_GITHUB_SECRET="your-github-client-secret"

# OpenAI API（AI機能用）
OPENAI_API_KEY="sk-..."

# Resend（メール配信用）
RESEND_API_KEY="re_..."
```

### 秘密鍵の生成

```bash
# AUTH_SECRET生成
openssl rand -base64 32
```

## 3. データベースの初期化

### PostgreSQLデータベース作成

```bash
# PostgreSQLに接続
psql postgres

# データベース作成
CREATE DATABASE letteros;

# ユーザー作成（必要に応じて）
CREATE USER letteros_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE letteros TO letteros_user;

# 終了
\q
```

### Prismaマイグレーション実行

```bash
# スキーマをデータベースに適用
npx prisma migrate dev

# Prisma Clientを生成
npx prisma generate
```

### データベースのシード（サンプルデータ）

```bash
# サンプルデータを投入
npm run db:seed

# または
npx prisma db seed
```

**シードデータに含まれるもの**：
- デモユーザー（`demo@letteros.com`）
- サンプルニュースレター（10件）
- サンプル購読者（100人）
- 分析データ

### Prisma Studio（データベース管理UI）

```bash
# Prisma Studioを起動
npx prisma studio

# http://localhost:5555 でアクセス可能
```

## 4. 開発サーバーの起動

### 基本的な起動

```bash
# 開発サーバーを起動
npm run dev

# ブラウザで開く
# http://localhost:3000
```

### ポート変更

```bash
# 異なるポートで起動
PORT=3001 npm run dev
```

### Turbopack（高速ビルド）

```bash
# Turbopackを有効化（Next.js 16+）
npm run dev -- --turbo
```

### 並行実行

```bash
# 複数のプロセスを同時実行
npm install -g concurrently

# 開発サーバー + Prisma Studio
concurrently "npm run dev" "npx prisma studio"
```

## 5. プロジェクト構造の理解

```
letteros/
├── app/                      # Next.js App Router
│   ├── (auth)/              # 認証関連ルート
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/         # ダッシュボード
│   │   ├── newsletters/
│   │   ├── analytics/
│   │   └── settings/
│   ├── api/                 # API Routes
│   │   ├── newsletters/
│   │   ├── ai/
│   │   └── webhooks/
│   ├── actions/             # Server Actions
│   ├── layout.tsx
│   └── page.tsx
├── components/              # Reactコンポーネント
│   ├── ui/                  # UIプリミティブ
│   ├── providers/           # Context Providers
│   └── ...
├── lib/                     # ユーティリティ関数
│   ├── db.ts                # Prismaクライアント
│   ├── auth.ts              # NextAuth設定
│   ├── utils.ts             # 汎用ユーティリティ
│   └── validations/         # Zodスキーマ
├── prisma/                  # Prisma設定
│   ├── schema.prisma        # データベーススキーマ
│   ├── migrations/          # マイグレーションファイル
│   └── seed.ts              # シードスクリプト
├── public/                  # 静的ファイル
├── docs/                    # ドキュメント
├── .env                     # 環境変数
├── next.config.ts           # Next.js設定
├── tailwind.config.ts       # Tailwind CSS設定
├── tsconfig.json            # TypeScript設定
└── package.json             # 依存関係
```

### 重要なファイル

| ファイル | 説明 |
|---------|------|
| `app/layout.tsx` | ルートレイアウト |
| `lib/db.ts` | Prismaクライアントシングルトン |
| `lib/auth.ts` | NextAuth設定 |
| `middleware.ts` | 認証ミドルウェア |
| `prisma/schema.prisma` | データベーススキーマ定義 |

## 6. 最初の機能実装

### Step 1: 新しいページを作成

```tsx
// app/(dashboard)/my-page/page.tsx
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export default async function MyPage() {
  const session = await auth();

  const data = await db.newsletter.findMany({
    where: { userId: session?.user?.id },
    take: 10,
  });

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">My Page</h1>
      <div className="grid gap-4">
        {data.map((item) => (
          <div key={item.id} className="border p-4 rounded">
            <h2>{item.title}</h2>
            <p>{item.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Step 2: APIエンドポイントを作成

```typescript
// app/api/my-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await db.newsletter.findMany({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ data });
}
```

### Step 3: Server Actionを作成

```typescript
// app/actions/my-actions.ts
'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createNewsletter(formData: FormData) {
  const session = await auth();

  if (!session) {
    throw new Error('Unauthorized');
  }

  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  const newsletter = await db.newsletter.create({
    data: {
      title,
      content,
      userId: session.user.id,
    },
  });

  revalidatePath('/newsletters');
  return newsletter;
}
```

### Step 4: UIコンポーネントを作成

```tsx
// components/my-component.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function MyComponent() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <Button onClick={() => setCount(count + 1)}>
        Increment
      </Button>
    </div>
  );
}
```

## 7. トラブルシューティング

### よくある問題と解決策

#### 問題: データベース接続エラー

```bash
Error: P1001: Can't reach database server
```

**解決策**：
```bash
# PostgreSQLが起動しているか確認
brew services list  # macOS
sudo systemctl status postgresql  # Linux

# PostgreSQLを起動
brew services start postgresql@16  # macOS
sudo systemctl start postgresql  # Linux

# 接続テスト
psql postgres
```

#### 問題: Prismaマイグレーションエラー

```bash
Error: Database schema is not in sync with migration history
```

**解決策**：
```bash
# マイグレーション履歴をリセット
npx prisma migrate reset

# 新しいマイグレーションを作成
npx prisma migrate dev
```

#### 問題: ポート3000が既に使用中

```bash
Error: Port 3000 is already in use
```

**解決策**：
```bash
# 別のポートで起動
PORT=3001 npm run dev

# または、プロセスを終了
lsof -ti:3000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3000  # Windows
```

#### 問題: モジュールが見つからない

```bash
Error: Cannot find module '@/lib/db'
```

**解決策**：
```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install

# TypeScript設定を確認
cat tsconfig.json  # paths設定を確認
```

#### 問題: 環境変数が読み込まれない

**解決策**：
```bash
# .envファイルが正しい場所にあるか確認
ls -la .env

# 開発サーバーを再起動
# Ctrl+Cで停止して npm run dev
```

### デバッグツール

```bash
# ログを詳細表示
DEBUG=* npm run dev

# TypeScriptの型チェック
npm run type-check

# Lintチェック
npm run lint

# Prismaクエリのデバッグ
# .envに追加
DATABASE_URL="...?connection_limit=1&pool_timeout=60"
DEBUG="prisma:*"
```

## 8. 次のステップ

### 学習リソース

1. **Next.js公式ドキュメント**
   - [App Router](https://nextjs.org/docs/app)
   - [データフェッチング](https://nextjs.org/docs/app/building-your-application/data-fetching)

2. **Prisma公式ドキュメント**
   - [Prisma Client](https://www.prisma.io/docs/orm/prisma-client)
   - [リレーション](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations)

3. **NextAuth.js**
   - [認証ガイド](https://next-auth.js.org/getting-started/introduction)

4. **Tailwind CSS**
   - [ユーティリティクラス](https://tailwindcss.com/docs)

### 推奨する学習パス

```mermaid
graph LR
    A[環境構築] --> B[プロジェクト構造理解]
    B --> C[データベース設計]
    C --> D[認証実装]
    D --> E[API開発]
    E --> F[UI実装]
    F --> G[AI統合]
    G --> H[デプロイ]
```

### 次に読むべきドキュメント

1. [`02_FRONTEND_DEVELOPMENT/NEXTJS_APP_ROUTER_GUIDE.md`](../02_FRONTEND_DEVELOPMENT/NEXTJS_APP_ROUTER_GUIDE.md) - App Routerの詳細
2. [`03_BACKEND_API/DATABASE_SCHEMA.md`](../03_BACKEND_API/DATABASE_SCHEMA.md) - データベース設計
3. [`03_BACKEND_API/AUTHENTICATION.md`](../03_BACKEND_API/AUTHENTICATION.md) - 認証実装
4. [`04_AI_ML_INNOVATION/RAG_IMPLEMENTATION.md`](../04_AI_ML_INNOVATION/RAG_IMPLEMENTATION.md) - AI機能

### コミュニティとサポート

- **GitHub Issues**: https://github.com/your-org/letteros/issues
- **Discord**: https://discord.gg/letteros
- **ドキュメント**: https://docs.letteros.com

## 🌐 参照リソース

### 公式ドキュメント

1. [Next.js Getting Started](https://nextjs.org/docs/getting-started/installation) - Next.js公式
2. [Prisma Getting Started](https://www.prisma.io/docs/getting-started) - Prisma公式
3. [Node.js Documentation](https://nodejs.org/docs/latest/api/) - Node.js公式
4. [PostgreSQL Tutorial](https://www.postgresql.org/docs/current/tutorial.html) - PostgreSQL公式
5. [Git Handbook](https://guides.github.com/introduction/git-handbook/) - Git基礎

### チュートリアル・実践ガイド

6. [Next.js Learn Course](https://nextjs.org/learn) - Next.js公式チュートリアル
7. [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) - TypeScript基礎
8. [React Documentation](https://react.dev/learn) - React公式学習ガイド
9. [Tailwind CSS Tutorial](https://tailwindcss.com/docs/installation) - Tailwind入門
10. [Prisma Tutorial](https://www.prisma.io/blog/fullstack-nextjs-graphql-prisma-oklidw1rhw) - フルスタックチュートリアル

---

**セットアップ時間目安**: 初回セットアップ 0.5-1時間、データベース設定 0.5時間
