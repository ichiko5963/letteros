// Dashboard Page (Firebase)
// Reference: @docs/02_FRONTEND_DEVELOPMENT/REACT_SERVER_COMPONENTS.md

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { getDashboardStats } from '@/lib/firebase/firestore-helpers';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Mail, Users, TrendingUp, Send } from 'lucide-react';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    newsletterCount: 0,
    productCount: 0,
    totalSubscribers: 0,
    sentCount: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      // Set a timeout for Firestore operations (5 seconds)
      const timeoutId = setTimeout(() => {
        console.warn('Dashboard stats loading timed out');
        setLoadingStats(false);
      }, 5000);

      getDashboardStats(user.uid)
        .then(setStats)
        .catch((error) => {
          console.error('Failed to load dashboard stats:', error);
          // Use default stats on error
        })
        .finally(() => {
          clearTimeout(timeoutId);
          setLoadingStats(false);
        });

      return () => clearTimeout(timeoutId);
    } else if (!loading) {
      // User is not logged in, stop loading
      setLoadingStats(false);
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const statCards = [
    {
      title: 'ニュースレター',
      value: stats.newsletterCount,
      description: '作成したニュースレター数',
      icon: Mail,
    },
    {
      title: 'プロダクト',
      value: stats.productCount,
      description: '管理中のプロダクト数',
      icon: TrendingUp,
    },
    {
      title: '購読者',
      value: stats.totalSubscribers,
      description: '合計購読者数',
      icon: Users,
    },
    {
      title: '配信済み',
      value: stats.sentCount,
      description: '送信したメール数',
      icon: Send,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">ダッシュボード</h1>
        <p className="text-muted-foreground mt-2">
          ようこそ、{user.displayName}さん
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
