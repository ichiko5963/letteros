import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/firebase/server-auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Mail, Sparkles, TrendingUp } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LetterOS - メルマガ運用を構造化し、進化させるOS',
  description: 'AIと一緒に判断を積み上げる。仮説 → 実行 → 観測 → 解釈 → 次回反映。',
};

export default async function Home() {
  const user = await getCurrentUser();

  // ログイン済みの場合はダッシュボードにリダイレクト
  if (user) {
    redirect('/dashboard');
  }

  // 未ログインの場合はランディングページを表示
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <header className="flex items-center justify-between mb-16">
          <div className="text-2xl font-bold">LetterOS</div>
          <div className="flex gap-4">
            <Link href="/login">
              <Button variant="ghost">ログイン</Button>
            </Link>
            <Link href="/signup">
              <Button>新規登録</Button>
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <div className="text-center mb-24">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
            LetterOS
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 mb-4 max-w-2xl mx-auto">
            メルマガ運用を構造化し、進化させるOS
          </p>
          <p className="text-lg text-slate-500 dark:text-slate-500 mb-8 max-w-3xl mx-auto">
            AIと一緒に判断を積み上げる。仮説 → 実行 → 観測 → 解釈 → 次回反映。
            この知的プロセスを記録し、比較し、抽象化し、再適用できる形にする。
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="text-lg px-8">
                今すぐ始める
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-lg px-8">
                ログイン
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-24">
          <div className="p-6 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AIが候補を出す</h3>
            <p className="text-slate-600 dark:text-slate-400">
              AIが複数の選択肢を提示。あなたが選び、判断する。思想の責任は人間が取る。
            </p>
          </div>

          <div className="p-6 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            </div>
            <h3 className="text-xl font-semibold mb-2">プロダクト単位で管理</h3>
            <p className="text-slate-600 dark:text-slate-400">
              口調・思想・読者・目的が一貫した発信主体として、プロダクトごとに運用を構造化。
            </p>
          </div>

          <div className="p-6 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            </div>
            <h3 className="text-xl font-semibold mb-2">継続的な改善</h3>
            <p className="text-slate-600 dark:text-slate-400">
              成功も失敗も記録し、次に活かす。忘却と属人化を構造で解決する。
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">今すぐ始めましょう</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            メルマガ運用を次のレベルへ
          </p>
          <Link href="/signup">
            <Button size="lg" className="text-lg px-8">
              無料で始める
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
