// New Launch Content Page (Selection Screen)
// Reference: @docs/request.md - Choose between manual or AI creation

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, Loader2, Pencil, Sparkles, Rocket } from 'lucide-react';

export default function NewProductPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Rocket className="h-8 w-8" />
            新規ローンチコンテンツ作成
          </h1>
          <p className="text-muted-foreground mt-2">
            作成方法を選んでください
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Manual Creation Card */}
        <Card className="hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden">
          <Link href="/products/new/manual" className="absolute inset-0 z-10" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="relative">
            <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Pencil className="h-7 w-7 text-slate-600 dark:text-slate-300" />
            </div>
            <CardTitle className="text-xl">自分で作る</CardTitle>
            <CardDescription className="text-base">
              フォームに直接入力して、発信定義を自分で設計します
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                すべて自分でカスタマイズ
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                細かい設定が可能
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                経験者向け
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* AI Creation Card */}
        <Card className="hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden border-violet-200 dark:border-violet-800">
          <Link href="/products/new/ai" className="absolute inset-0 z-10" />
          <div className="absolute inset-0 bg-gradient-to-br from-violet-50 to-indigo-100 dark:from-violet-950 dark:to-indigo-900 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-4 right-4 px-2 py-1 bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs font-medium rounded-full">
            おすすめ
          </div>
          <CardHeader className="relative">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-violet-500/25">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <CardTitle className="text-xl">AIで作る</CardTitle>
            <CardDescription className="text-base">
              長文を入力して4つの質問に答えるだけで、発信定義が自動生成されます
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
                4回の質問に答えるだけ
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
                コンセプト・ターゲット・PAIN自動生成
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
                初心者でも安心
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
