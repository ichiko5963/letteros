// Dashboard Page (Firebase)
// Reference: @docs/02_FRONTEND_DEVELOPMENT/REACT_SERVER_COMPONENTS.md

'use client';

import { useEffect, useState, useTransition } from 'react';
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
import { Mail, Users, Rocket, Send, Plus, Sparkles, PenLine } from 'lucide-react';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    newsletterCount: 0,
    productCount: 0,
    totalSubscribers: 0,
    sentCount: 0,
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load stats in background (non-blocking)
  useEffect(() => {
    if (user) {
      // Dynamically import to avoid blocking initial render
      import('@/lib/firebase/firestore-helpers').then(({ getDashboardStats }) => {
        getDashboardStats(user.uid)
          .then(setStats)
          .catch(console.error);
      });

      // Also count localStorage products
      try {
        const localProducts = JSON.parse(localStorage.getItem('letteros_products') || '[]');
        const userLocalProducts = localProducts.filter((p: { userId: string }) => p.userId === user.uid);
        if (userLocalProducts.length > 0) {
          setStats(prev => ({
            ...prev,
            productCount: prev.productCount + userLocalProducts.length,
          }));
        }
      } catch (e) {
        console.error('Failed to load local products:', e);
      }
    }
  }, [user]);

  // Don't block render for auth loading - show immediately
  if (!user && !loading) {
    return null;
  }

  const statCards = [
    {
      title: 'メルマガ',
      value: stats.newsletterCount,
      description: '作成したメルマガ数',
      icon: Mail,
      href: '/newsletters',
    },
    {
      title: 'ローンチコンテンツ',
      value: stats.productCount,
      description: '発信主体の数',
      icon: Rocket,
      href: '/products',
    },
    {
      title: 'リスト',
      value: stats.totalSubscribers,
      description: '合計購読者数',
      icon: Users,
      href: '/subscribers',
    },
    {
      title: '配信済み',
      value: stats.sentCount,
      description: '送信したメール数',
      icon: Send,
      href: '/analytics',
    },
  ];

  const quickActions = [
    {
      title: 'AIでローンチコンテンツ作成',
      description: '4つの質問に答えるだけで発信定義を自動生成',
      icon: Sparkles,
      href: '/products/new/ai',
      color: 'from-violet-500 to-indigo-500',
    },
    {
      title: 'メルマガ作成',
      description: '新しいメルマガを作成',
      icon: PenLine,
      href: '/newsletters/new',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'AIでメルマガ作成',
      description: 'AIがメルマガの下書きを生成',
      icon: Sparkles,
      href: '/newsletters/ai-create',
      color: 'from-amber-500 to-orange-500',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">ダッシュボード</h1>
        <p className="text-muted-foreground mt-2">
          ようこそ、{user?.displayName || user?.email || 'ゲスト'}さん
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
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
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">クイックアクション</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} href={action.href}>
                <Card className="hover:shadow-lg transition-all cursor-pointer group h-full">
                  <CardHeader>
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-base">{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
