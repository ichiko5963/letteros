// Analytics Page (Firebase)
// Reference: @docs/02_FRONTEND_DEVELOPMENT/REACT_SERVER_COMPONENTS.md

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Mail, Send, Eye, MousePointer, TrendingUp, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { Newsletter } from '@/lib/firebase/firestore-helpers';

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load newsletters in background (non-blocking)
  useEffect(() => {
    if (user) {
      // Dynamically import to avoid blocking
      import('@/lib/firebase/firestore-helpers').then(({ getUserNewsletters }) => {
        getUserNewsletters(user.uid)
          .then(setNewsletters)
          .catch(console.error)
          .finally(() => setIsLoadingData(false));
      });
    }
  }, [user]);

  // Don't block page render for auth loading
  if (!user && !loading) {
    return null;
  }

  // Calculate basic stats
  const totalNewsletters = newsletters.length;
  const sentNewsletters = newsletters.filter(n => n.status === 'SENT');
  const draftNewsletters = newsletters.filter(n => n.status === 'DRAFT');
  const scheduledNewsletters = newsletters.filter(n => n.status === 'SCHEDULED');

  const metrics = [
    {
      title: '総メルマガ数',
      value: totalNewsletters,
      icon: Mail,
      description: '作成した全メルマガ',
      color: 'text-blue-500',
    },
    {
      title: '配信済み',
      value: sentNewsletters.length,
      icon: Send,
      description: '配信完了したメール',
      color: 'text-green-500',
    },
    {
      title: '下書き',
      value: draftNewsletters.length,
      icon: BarChart3,
      description: '編集中のメルマガ',
      color: 'text-amber-500',
    },
    {
      title: '予約済み',
      value: scheduledNewsletters.length,
      icon: Calendar,
      description: '配信予約されたメール',
      color: 'text-violet-500',
    },
  ];

  // Placeholder stats for future implementation
  const performanceMetrics = [
    {
      title: '平均開封率',
      value: '--',
      icon: Eye,
      description: 'Resend連携後に表示',
      color: 'text-emerald-500',
      comingSoon: true,
    },
    {
      title: '平均クリック率',
      value: '--',
      icon: MousePointer,
      description: 'Resend連携後に表示',
      color: 'text-indigo-500',
      comingSoon: true,
    },
    {
      title: 'エンゲージメント',
      value: '--',
      icon: TrendingUp,
      description: 'データ蓄積後に表示',
      color: 'text-rose-500',
      comingSoon: true,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">分析</h1>
        <p className="text-muted-foreground mt-2">
          メルマガのパフォーマンスを分析
        </p>
      </div>

      {/* Current Stats */}
      <div>
        <h2 className="text-xl font-semibold mb-4">配信状況</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {metric.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${metric.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoadingData ? (
                      <span className="text-muted-foreground animate-pulse">--</span>
                    ) : (
                      metric.value
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metric.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Performance Metrics (Coming Soon) */}
      <div>
        <h2 className="text-xl font-semibold mb-4">パフォーマンス指標</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {performanceMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.title} className="relative overflow-hidden">
                {metric.comingSoon && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-xs rounded-full text-muted-foreground">
                    Coming Soon
                  </div>
                )}
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {metric.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${metric.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-muted-foreground">{metric.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metric.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Newsletters */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">最近のメルマガ</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/newsletters">
              すべて見る <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {newsletters.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                メルマガがありません
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                最初のメルマガを作成しましょう
              </p>
              <Button asChild>
                <Link href="/newsletters/new">メルマガを作成</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {newsletters.slice(0, 5).map((newsletter) => (
              <Link key={newsletter.id} href={`/newsletters/${newsletter.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full ${newsletter.status === 'SENT' ? 'bg-green-500' :
                        newsletter.status === 'SCHEDULED' ? 'bg-violet-500' :
                          'bg-amber-500'
                        }`} />
                      <div>
                        <p className="font-medium">{newsletter.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {newsletter.productName || '未分類'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 text-xs rounded-full ${newsletter.status === 'SENT' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                        newsletter.status === 'SCHEDULED' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                        }`}>
                        {newsletter.status === 'SENT' ? '配信済み' :
                          newsletter.status === 'SCHEDULED' ? '予約済み' : '下書き'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Future Integration Note */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            高度な分析機能
          </CardTitle>
          <CardDescription>
            Resendと連携することで、開封率・クリック率などの詳細な分析が可能になります
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• 開封率の時系列推移</li>
            <li>• クリック率とリンク別分析</li>
            <li>• A/Bテスト結果の比較</li>
            <li>• 最適な配信時間の分析</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

