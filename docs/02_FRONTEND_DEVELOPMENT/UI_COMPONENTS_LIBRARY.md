# UI Components Library 実装ガイド

## 📚 目次

1. デザインシステムの構築
2. コンポーネントライブラリの選定
3. Tailwind CSS設計パターン
4. 再利用可能なコンポーネント設計
5. アクセシビリティ (a11y)
6. ダークモード実装
7. アニメーションとトランジション
8. コンポーネントカタログ

## 1. デザインシステムの構築

LetterOSのデザインシステムは、一貫性、スケーラビリティ、アクセシビリティを重視します。

### デザイントークン定義

```typescript
// lib/design-tokens.ts
export const tokens = {
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      500: '#3b82f6',
      600: '#2563eb',
      900: '#1e3a8a',
    },
    semantic: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  typography: {
    fontFamily: {
      sans: 'Inter, sans-serif',
      mono: 'Fira Code, monospace',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
    },
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    full: '9999px',
  },
};
```

### Tailwind CSS設定

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';
import { tokens } from './lib/design-tokens';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: tokens.colors,
      spacing: tokens.spacing,
      fontFamily: tokens.typography.fontFamily,
      fontSize: tokens.typography.fontSize,
      borderRadius: tokens.borderRadius,
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};

export default config;
```

## 2. コンポーネントライブラリの選定

### LetterOS推奨スタック

| カテゴリ | ライブラリ | 用途 |
|---------|----------|------|
| 基盤 | Radix UI | ヘッドレスUIプリミティブ |
| スタイリング | Tailwind CSS | ユーティリティファーストCSS |
| アイコン | Lucide React | アイコンセット |
| フォーム | React Hook Form | フォーム管理 |
| アニメーション | Framer Motion | アニメーション |

```bash
npm install @radix-ui/react-dropdown-menu @radix-ui/react-dialog @radix-ui/react-popover
npm install lucide-react
npm install framer-motion
```

### なぜRadix UIか？

- **アクセシビリティ**: ARIA属性、キーボードナビゲーション完備
- **柔軟性**: 完全にスタイル可能（ヘッドレス）
- **TypeScript**: 完全な型サポート
- **小さなバンドル**: 必要なコンポーネントのみインポート

## 3. Tailwind CSS設計パターン

### コンポーネント variants パターン

```tsx
// components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // ベーススタイル
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary-600 text-white hover:bg-primary-700',
        outline: 'border border-gray-300 bg-transparent hover:bg-gray-50',
        ghost: 'hover:bg-gray-100',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-10 px-4',
        lg: 'h-11 px-8 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

// 使用例
<Button variant="outline" size="lg">保存</Button>
```

### ユーティリティ関数: cn (classnames merger)

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## 4. 再利用可能なコンポーネント設計

### Card コンポーネント

```tsx
// components/ui/card.tsx
import { cn } from '@/lib/utils';

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-900',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5', className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-2xl font-semibold leading-none', className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('pt-4', className)} {...props} />;
}

// 使用例
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function NewsletterCard({ newsletter }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{newsletter.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{newsletter.excerpt}</p>
      </CardContent>
    </Card>
  );
}
```

### Modal (Dialog) コンポーネント

```tsx
// components/ui/dialog.tsx
'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-lg',
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
          <X className="h-4 w-4" />
          <span className="sr-only">閉じる</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
);

export const DialogTitle = DialogPrimitive.Title;

// 使用例
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function CreateNewsletterDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>新規作成</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新しいニュースレター</DialogTitle>
        </DialogHeader>
        <NewsletterForm />
      </DialogContent>
    </Dialog>
  );
}
```

### Dropdown Menu コンポーネント

```tsx
// components/ui/dropdown-menu.tsx
'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export function DropdownMenuContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        className={cn(
          'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white p-1 shadow-md',
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100',
        className
      )}
      {...props}
    />
  );
}

// 使用例
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

export function NewsletterActions({ newsletterId }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>編集</DropdownMenuItem>
        <DropdownMenuItem>複製</DropdownMenuItem>
        <DropdownMenuItem className="text-red-600">削除</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## 5. アクセシビリティ (a11y)

### ARIA属性とキーボードナビゲーション

```tsx
// components/ui/tabs.tsx
'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1',
        className
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium transition-all',
        'data-[state=active]:bg-white data-[state=active]:shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2',
        className
      )}
      {...props}
    />
  );
}

export const TabsContent = TabsPrimitive.Content;

// 使用例（自動的にARIA属性が付与される）
<Tabs defaultValue="draft">
  <TabsList>
    <TabsTrigger value="draft">下書き</TabsTrigger>
    <TabsTrigger value="sent">送信済み</TabsTrigger>
  </TabsList>
  <TabsContent value="draft">...</TabsContent>
  <TabsContent value="sent">...</TabsContent>
</Tabs>
```

### スクリーンリーダー対応

```tsx
// components/NewsletterCard.tsx
export function NewsletterCard({ newsletter }) {
  return (
    <article
      aria-labelledby={`newsletter-${newsletter.id}-title`}
      className="rounded-lg border p-4"
    >
      <h3 id={`newsletter-${newsletter.id}-title`}>
        {newsletter.title}
      </h3>
      <time dateTime={newsletter.createdAt.toISOString()}>
        {formatDate(newsletter.createdAt)}
      </time>
      <button
        aria-label={`${newsletter.title}を編集`}
        onClick={() => handleEdit(newsletter.id)}
      >
        編集
      </button>
    </article>
  );
}
```

## 6. ダークモード実装

### next-themes統合

```bash
npm install next-themes
```

```tsx
// components/providers/theme-provider.tsx
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}

// app/layout.tsx
import { ThemeProvider } from '@/components/providers/theme-provider';

export default function RootLayout({ children }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### テーマ切り替えボタン

```tsx
// components/theme-toggle.tsx
'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">テーマ切り替え</span>
    </Button>
  );
}
```

## 7. アニメーションとトランジション

### Framer Motion統合

```tsx
// components/animated-card.tsx
'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';

export function AnimatedCard({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card>{children}</Card>
    </motion.div>
  );
}

// スタガーアニメーション
export function NewsletterList({ newsletters }) {
  return (
    <div className="grid gap-4">
      {newsletters.map((newsletter, index) => (
        <AnimatedCard key={newsletter.id} delay={index * 0.1}>
          <NewsletterCard newsletter={newsletter} />
        </AnimatedCard>
      ))}
    </div>
  );
}
```

### Tailwindアニメーション

```css
/* app/globals.css */
@keyframes slideIn {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

@layer utilities {
  .animate-slide-in {
    animation: slideIn 0.3s ease-out;
  }
}
```

## 8. コンポーネントカタログ

### Badge コンポーネント

```tsx
// components/ui/badge.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'bg-primary-100 text-primary-800',
        success: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        error: 'bg-red-100 text-red-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
```

### Avatar コンポーネント

```tsx
// components/ui/avatar.tsx
'use client';

import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';

export function Avatar({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}
      {...props}
    />
  );
}

export function AvatarImage({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      className={cn('aspect-square h-full w-full', className)}
      {...props}
    />
  );
}

export function AvatarFallback({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      className={cn('flex h-full w-full items-center justify-center bg-gray-100', className)}
      {...props}
    />
  );
}

// 使用例
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

<Avatar>
  <AvatarImage src="/user.jpg" alt="User Name" />
  <AvatarFallback>UN</AvatarFallback>
</Avatar>
```

## 🌐 参照リソース

### 公式ドキュメント

1. [Radix UI Documentation](https://www.radix-ui.com/primitives) - UIプリミティブ
2. [Tailwind CSS](https://tailwindcss.com/docs) - スタイリングフレームワーク
3. [CVA (Class Variance Authority)](https://cva.style/docs) - Variant管理
4. [Lucide Icons](https://lucide.dev/) - アイコンライブラリ
5. [Framer Motion](https://www.framer.com/motion/) - アニメーション

### 実装記事・デザインシステム

6. [shadcn/ui](https://ui.shadcn.com/) - 再利用可能なコンポーネント集
7. [Building a Design System with Tailwind](https://www.smashingmagazine.com/2024/03/building-design-system-tailwind-css/) - デザインシステム構築
8. [Accessible Components](https://www.a11y-101.com/design/button) - アクセシビリティガイド
9. [Tailwind Best Practices](https://www.builder.io/blog/tailwind-css-tips-and-tricks) - ベストプラクティス
10. [Component Composition Patterns](https://www.patterns.dev/react/compound-pattern) - コンポーネントパターン

---

**実装時間目安**: 基本コンポーネント 2人日、デザインシステム 3-4人日
