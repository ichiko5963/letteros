// Dashboard Layout (Firebase Auth)
// Reference: @docs/02_FRONTEND_DEVELOPMENT/NEXTJS_APP_ROUTER_GUIDE.md

import { AuthProvider } from '@/components/providers/auth-provider';
import { DashboardNav } from '@/components/layout/dashboard-nav';
import { UserNav } from '@/components/layout/user-nav';
import Image from 'next/image';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-card">
          <div className="flex h-full flex-col gap-4 p-4">
            <div className="flex items-center gap-2 px-2 py-4">
              <div className="relative h-8 w-8">
                <Image
                  src="/logo.png"
                  alt="LetterOS Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <h1 className="text-xl font-bold">LetterOS</h1>
            </div>
            <DashboardNav />
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="border-b bg-card">
            <div className="flex h-16 items-center justify-end px-6">
              <UserNav />
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
