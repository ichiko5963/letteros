// Dashboard Navigation Component
// Reference: @docs/02_FRONTEND_DEVELOPMENT/UI_COMPONENTS_LIBRARY.md

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Mail,
  BarChart3,
  Settings,
  Package,
} from 'lucide-react';

const navItems = [
  {
    title: 'ダッシュボード',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'ニュースレター',
    href: '/newsletters',
    icon: Mail,
  },
  {
    title: 'プロダクト',
    href: '/products',
    icon: Package,
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
    <nav className="flex flex-col gap-1">
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
    </nav>
  );
}
