# LetterOS

AI駆動のメルマガ配信プラットフォーム（Gemini + Firebase + Next.js）

## 概要

LetterOSは、Google Gemini AIを活用した「編集長AI」によってメルマガ作成を支援する、次世代のメール配信プラットフォームです。

### 主な機能

- **AIエディタ**: Gemini 1.5 Proによる高品質なコンテンツ生成・改善提案
- **プロダクト管理**: 複数のプロダクト/サービスごとにメルマガを管理
- **購読者管理**: セグメント機能による配信先の柔軟な制御
- **配信管理**: Resendによる高信頼性のメール配信
- **認証**: Firebase Authentication（Email/Password）

## 技術スタック

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication
- **AI**: Google Gemini 1.5 Pro
- **Email**: Resend + React Email
- **UI**: Tailwind CSS 4, Radix UI
- **State Management**: React Hook Form

## 必要なAPIキー

### 1. Firebase（必須）
[Firebase Console](https://console.firebase.google.com/)でプロジェクトを作成し、以下を取得：
- Firebase Configuration（6つの環境変数）
- Firebase Admin SDK（サーバーサイド用の3つの変数）

### 2. Gemini API Key（必須）
[Google AI Studio](https://aistudio.google.com/app/apikey)でAPIキーを取得

### 3. Resend API Key（必須）
[Resend Dashboard](https://resend.com/api-keys)でAPIキーを取得

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/your-org/letteros.git
cd letteros
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. Firebase プロジェクトのセットアップ

1. [Firebase Console](https://console.firebase.google.com/)でプロジェクトを作成
2. **Authentication** を有効化
   - Sign-in methodで「Email/Password」を有効化
3. **Firestore Database** を作成
   - テストモードで開始（後でルールを設定）
4. **プロジェクト設定** から設定値を取得

### 4. 環境変数の設定

```bash
cp .env.example .env
```

`.env`ファイルを編集：

```env
# Firebase Configuration (Firebaseコンソールから取得)
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."

# Firebase Admin SDK (サービスアカウントキーから取得)
FIREBASE_ADMIN_PROJECT_ID="..."
FIREBASE_ADMIN_PRIVATE_KEY="..."
FIREBASE_ADMIN_CLIENT_EMAIL="..."

# Gemini AI (Google AI Studioから取得)
GEMINI_API_KEY="..."

# Resend (Resend Dashboardから取得)
RESEND_API_KEY="..."
EMAIL_FROM="LetterOS <noreply@yourdomain.com>"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く

## プロジェクト構造

```
letteros/
├── app/                      # Next.js App Router
│   ├── (dashboard)/         # ダッシュボード関連ページ
│   ├── api/                 # API Routes
│   ├── login/               # ログインページ
│   └── signup/              # サインアップページ
├── components/              # Reactコンポーネント
│   ├── ui/                  # 再利用可能なUIコンポーネント
│   ├── auth/                # 認証関連コンポーネント
│   ├── layout/              # レイアウトコンポーネント
│   ├── newsletters/         # メルマガ関連コンポーネント
│   └── providers/           # Context Providers
├── lib/                     # ユーティリティとロジック
│   ├── firebase/            # Firebase設定とヘルパー
│   ├── ai/                  # AI機能 (Gemini)
│   └── email/               # メール送信機能 (Resend)
├── emails/                  # React Emailテンプレート
└── docs/                    # ドキュメント
```

## 開発

### コマンド

```bash
# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build

# 本番サーバー起動
npm start

# Linting
npm run lint
```

### 主要な設計原則

1. **1メルマガ＝1論点**: 各メルマガは1つの明確な論点に集中
2. **AI提案、人間決定**: AIはコンテンツを提案し、最終決定は人間が行う
3. **PDCA**: 配信結果の分析と継続的な改善
4. **プロダクト中心**: プロダクトを軸にしたメルマガ管理

## ライセンス

MIT

## サポート

- GitHub Issues: バグ報告、機能リクエスト
- ドキュメント: `/docs` ディレクトリ
