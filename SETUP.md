# LetterOS セットアップガイド

このガイドでは、LetterOSを開発環境で動作させるための詳細な手順を説明します。

## 目次

1. [必要な準備](#必要な準備)
2. [データベースのセットアップ](#データベースのセットアップ)
3. [外部サービスの設定](#外部サービスの設定)
4. [アプリケーションの起動](#アプリケーションの起動)
5. [トラブルシューティング](#トラブルシューティング)

## 必要な準備

### システム要件

- Node.js 18.17以上
- npm 9以上
- PostgreSQL 14以上

### 外部サービスのアカウント

以下のサービスのAPIキーが必要です:

1. **OpenAI API** (必須)
   - https://platform.openai.com/api-keys
   - GPT-4 APIアクセス権限

2. **Resend** (必須)
   - https://resend.com
   - メール送信用APIキー

3. **Google OAuth** (オプション)
   - https://console.cloud.google.com/
   - OAuth 2.0クライアントID

4. **GitHub OAuth** (オプション)
   - https://github.com/settings/developers
   - OAuth Appの作成

## データベースのセットアップ

### PostgreSQLのインストール

#### macOS (Homebrew)

```bash
brew install postgresql@14
brew services start postgresql@14
```

#### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### Windows

PostgreSQL公式サイトからインストーラーをダウンロード:
https://www.postgresql.org/download/windows/

### データベースの作成

```bash
# PostgreSQLにログイン
psql postgres

# データベースとユーザーの作成
CREATE DATABASE letteros;
CREATE USER letteros_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE letteros TO letteros_user;

# 終了
\q
```

### 環境変数の設定

`.env`ファイルにデータベース接続文字列を設定:

```env
DATABASE_URL="postgresql://letteros_user:your_password@localhost:5432/letteros"
```

### マイグレーションの実行

```bash
# Prismaマイグレーションを実行
npx prisma migrate dev --name init

# Prisma Clientを生成
npx prisma generate
```

成功すると、データベースに必要なテーブルが作成されます。

## 外部サービスの設定

### 1. OpenAI API

1. https://platform.openai.com/api-keys にアクセス
2. "Create new secret key"をクリック
3. キーをコピーして`.env`に追加:

```env
OPENAI_API_KEY="sk-..."
```

### 2. Resend

1. https://resend.com にサインアップ
2. APIキーを作成
3. ドメインを検証 (開発環境では不要)
4. `.env`に追加:

```env
RESEND_API_KEY="re_..."
EMAIL_FROM="LetterOS <noreply@yourdomain.com>"
```

### 3. Google OAuth (オプション)

1. https://console.cloud.google.com/ でプロジェクトを作成
2. "OAuth consent screen"を設定
3. "Credentials"で"OAuth 2.0 Client ID"を作成
4. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. `.env`に追加:

```env
AUTH_GOOGLE_ID="your-client-id.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="your-client-secret"
```

### 4. GitHub OAuth (オプション)

1. https://github.com/settings/developers にアクセス
2. "New OAuth App"をクリック
3. Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. `.env`に追加:

```env
AUTH_GITHUB_ID="your-client-id"
AUTH_GITHUB_SECRET="your-client-secret"
```

### 5. NextAuth設定

認証用のシークレットを生成:

```bash
openssl rand -base64 32
```

`.env`に追加:

```env
AUTH_SECRET="生成されたシークレット"
AUTH_URL="http://localhost:3000"
```

## アプリケーションの起動

### 依存関係のインストール

```bash
npm install
```

### 開発サーバーの起動

```bash
npm run dev
```

### 動作確認

1. ブラウザで http://localhost:3000 にアクセス
2. ログインページが表示されることを確認
3. アカウントを作成してログイン

### 初回ユーザーの作成

OAuth認証を使わない場合、直接データベースにユーザーを作成できます:

```bash
# Prisma Studioを起動
npx prisma studio
```

1. ブラウザで http://localhost:5555 を開く
2. "User"テーブルを選択
3. "Add record"でユーザーを作成
4. パスワードはbcryptでハッシュ化する必要があります

または、まずGoogle/GitHub OAuthでログインすることをお勧めします。

## トラブルシューティング

### データベース接続エラー

```
Error: P1001: Can't reach database server
```

**解決方法:**
- PostgreSQLが起動していることを確認
- `DATABASE_URL`が正しいか確認
- ファイアウォールでポート5432が開いているか確認

### OpenAI APIエラー

```
Error: Invalid API key
```

**解決方法:**
- `OPENAI_API_KEY`が正しく設定されているか確認
- APIキーに支払い情報が登録されているか確認
- レート制限に達していないか確認

### Resendエラー

```
Error: Missing API key
```

**解決方法:**
- `RESEND_API_KEY`が設定されているか確認
- Resendアカウントが有効か確認
- 送信元メールアドレスが検証済みか確認

### NextAuthエラー

```
[auth][error] MissingSecret
```

**解決方法:**
- `AUTH_SECRET`を設定
- `openssl rand -base64 32`で新しいシークレットを生成

### ビルドエラー

```
Module not found: Can't resolve '@/...'
```

**解決方法:**
- `npm install`を再実行
- `node_modules`を削除して再インストール:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

## 本番環境へのデプロイ

### Vercelへのデプロイ

1. Vercelアカウントを作成: https://vercel.com
2. GitHubリポジトリを連携
3. 環境変数を設定
4. デプロイ

### 環境変数の設定

本番環境では以下の環境変数を設定:

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="production-secret"
AUTH_URL="https://yourdomain.com"
OPENAI_API_KEY="sk-..."
RESEND_API_KEY="re_..."
EMAIL_FROM="LetterOS <noreply@yourdomain.com>"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

### データベースプロバイダー

推奨されるデータベースプロバイダー:
- [Supabase](https://supabase.com) - 無料プランあり
- [Neon](https://neon.tech) - サーバーレスPostgreSQL
- [Railway](https://railway.app) - 簡単なデプロイ

## 次のステップ

セットアップが完了したら:

1. [開発ガイド](docs/08_DEVELOPMENT/GETTING_STARTED.md)を確認
2. サンプルニュースレターを作成
3. AI機能を試す
4. テストメールを送信

質問やサポートが必要な場合は、GitHubのIssuesをご利用ください。
