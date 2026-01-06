// Analytics Page
// Reference: @docs/02_FRONTEND_DEVELOPMENT/REACT_SERVER_COMPONENTS.md

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default async function AnalyticsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">分析</h1>
        <p className="text-muted-foreground mt-2">
          ニュースレターのパフォーマンスを分析
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            分析機能は準備中です
          </h3>
          <p className="text-sm text-muted-foreground">
            開封率、クリック率などの分析機能を追加予定です
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
