// Newsletters List Page (Firebase)
// Reference: @docs/02_FRONTEND_DEVELOPMENT/REACT_SERVER_COMPONENTS.md

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { Newsletter } from '@/lib/firebase/firestore-helpers';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Plus, Mail, Clock, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

const statusConfig = {
  DRAFT: { label: '下書き', icon: Clock, color: 'text-yellow-600' },
  SCHEDULED: { label: '配信予約', icon: Clock, color: 'text-blue-600' },
  SENT: { label: '配信済み', icon: CheckCircle2, color: 'text-green-600' },
  FAILED: { label: '失敗', icon: XCircle, color: 'text-red-600' },
};

// Skeleton component for loading state
const NewsletterSkeleton = () => (
  <div className="space-y-8">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">メルマガ</h1>
        <p className="text-muted-foreground mt-2">
          作成・配信したメルマガを管理
        </p>
      </div>
      <Button disabled>
        <Plus className="mr-2 h-4 w-4" />
        新規作成
      </Button>
    </div>
    <div className="grid gap-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-6 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded mt-2" />
          </CardHeader>
          <CardContent>
            <div className="h-4 w-64 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default function NewslettersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load data non-blocking - localStorage first for instant display
  useEffect(() => {
    if (user) {
      let localDataLoaded = false;

      // Step 1: Load from localStorage immediately (instant)
      try {
        const localNewsletters = JSON.parse(localStorage.getItem('letteros_newsletters') || '[]');
        const localUserNewsletters = localNewsletters.filter((n: Newsletter) => n.userId === user.uid);
        setNewsletters(localUserNewsletters);
        localDataLoaded = true;
        setIsLoading(false);
        setDataLoaded(true);
      } catch {
        // Continue to Firestore
      }

      // Step 2: Load from Firestore with timeout
      const timeoutId = setTimeout(() => {
        // If Firestore takes too long, just show what we have
        if (!localDataLoaded) {
          setIsLoading(false);
          setDataLoaded(true);
        }
      }, 3000); // 3 second timeout

      import('@/lib/firebase/firestore-helpers').then(({ getUserNewsletters }) => {
        getUserNewsletters(user.uid)
          .then((fetchedNewsletters) => {
            clearTimeout(timeoutId);
            setNewsletters(fetchedNewsletters);
            setIsLoading(false);
            setDataLoaded(true);
            // Update localStorage
            localStorage.setItem('letteros_newsletters', JSON.stringify(fetchedNewsletters));
          })
          .catch((error) => {
            console.error('Failed to load newsletters:', error);
            clearTimeout(timeoutId);
            setIsLoading(false);
            setDataLoaded(true);
          });
      });

      return () => clearTimeout(timeoutId);
    }
  }, [user]);

  // Show skeleton during auth loading or initial data loading
  if (authLoading || (user && isLoading && !dataLoaded)) {
    return <NewsletterSkeleton />;
  }

  // Redirect case - show skeleton while redirecting
  if (!user) {
    return <NewsletterSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">メルマガ</h1>
          <p className="text-muted-foreground mt-2">
            作成・配信したメルマガを管理
          </p>
        </div>
        <Button asChild>
          <Link href="/newsletters/new">
            <Plus className="mr-2 h-4 w-4" />
            新規作成
          </Link>
        </Button>
      </div>

      {newsletters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          {/* Decorative wave icon */}
          <div className="relative mb-8">
            <svg
              width="120"
              height="120"
              viewBox="0 0 120 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-slate-300 dark:text-slate-600"
            >
              {/* Wave lines */}
              <path
                d="M20 100 Q40 80, 60 90 T100 70"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M15 80 Q35 60, 55 70 T95 50"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M10 60 Q30 40, 50 50 T90 30"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M25 40 Q45 20, 65 30 T105 15"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
              {/* Small decorative dots */}
              <circle cx="105" cy="50" r="3" fill="currentColor" />
              <circle cx="110" cy="30" r="2" fill="currentColor" />
            </svg>
          </div>

          <h3 className="text-2xl font-bold mb-3 text-slate-800 dark:text-slate-200">
            メルマガを作成しましょう
          </h3>
          <p className="text-muted-foreground text-center max-w-md mb-8">
            AIと対話しながら、ターゲットに刺さる<br />
            高品質なメルマガを簡単に作成できます
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white">
              <Link href="/newsletters/ai-create">
                <Sparkles className="mr-2 h-5 w-5" />
                AIで作成
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/newsletters/new">
                <Plus className="mr-2 h-5 w-5" />
                手動で作成
              </Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            AIで作成すると、壁打ちで経験談を深掘りして<br />
            読者に響くメルマガを自動生成できます
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {newsletters.map((newsletter) => {
            const status = statusConfig[newsletter.status as keyof typeof statusConfig] || statusConfig.DRAFT;
            const StatusIcon = status.icon;

            return (
              <Card key={newsletter.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="line-clamp-1">
                        {newsletter.title}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {newsletter.productName && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-xs font-medium mr-2">
                            {newsletter.productName}
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 ${status.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/newsletters/${newsletter.id}`}>
                        編集
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div>
                      作成日: {newsletter.createdAt ? formatDateTime(newsletter.createdAt.toDate()) : '-'}
                    </div>
                    {newsletter.scheduledAt && (
                      <div>
                        配信予定: {formatDateTime(newsletter.scheduledAt.toDate())}
                      </div>
                    )}
                    {newsletter.sentAt && (
                      <div>
                        配信日: {formatDateTime(newsletter.sentAt.toDate())}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
