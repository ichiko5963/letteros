// Newsletters List Page (Firebase)
// Reference: @docs/02_FRONTEND_DEVELOPMENT/REACT_SERVER_COMPONENTS.md

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { getUserNewsletters, Newsletter } from '@/lib/firebase/firestore-helpers';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Plus, Mail, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

const statusConfig = {
  DRAFT: { label: '下書き', icon: Clock, color: 'text-yellow-600' },
  SCHEDULED: { label: '配信予約', icon: Clock, color: 'text-blue-600' },
  SENT: { label: '配信済み', icon: CheckCircle2, color: 'text-green-600' },
  FAILED: { label: '失敗', icon: XCircle, color: 'text-red-600' },
};

export default function NewslettersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loadingNewsletters, setLoadingNewsletters] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      getUserNewsletters(user.uid)
        .then(setNewsletters)
        .catch((error) => {
          console.error('Failed to load newsletters:', error);
        })
        .finally(() => setLoadingNewsletters(false));
    }
  }, [user]);

  if (loading || loadingNewsletters) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ニュースレター</h1>
          <p className="text-muted-foreground mt-2">
            作成・配信したニュースレターを管理
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
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              ニュースレターがありません
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              最初のニュースレターを作成しましょう
            </p>
            <Button asChild>
              <Link href="/newsletters/new">
                <Plus className="mr-2 h-4 w-4" />
                新規作成
              </Link>
            </Button>
          </CardContent>
        </Card>
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
