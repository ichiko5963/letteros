// Dashboard Navigation Component
// Reference: @docs/02_FRONTEND_DEVELOPMENT/UI_COMPONENTS_LIBRARY.md

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Mail,
  BarChart3,
  Settings,
  Rocket,
  Users,
  Sparkles,
} from 'lucide-react';

const navItems = [
  {
    title: 'ダッシュボード',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'メルマガ',
    href: '/newsletters',
    icon: Mail,
  },
  {
    title: 'リスト管理',
    href: '/subscribers',
    icon: Users,
  },
  {
    title: 'ローンチコンテンツ',
    href: '/products',
    icon: Rocket,
  },
  {
    title: '分析',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    title: '設定',
    href: '/settings',
    icon: Settings,
  },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-4">
      {/* AI Newsletter Creation Button */}
      <Link href="/newsletters/ai-create">
        <Button 
          className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          AIでメルマガを作成
        </Button>
      </Link>

      <div className="flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
