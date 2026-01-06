// User Navigation Component (Firebase Auth)
// Reference: @docs/03_BACKEND_API/AUTHENTICATION.md

'use client';

import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { signOut } from '@/lib/firebase/auth-helpers';
import { useRouter } from 'next/navigation';

export function UserNav() {
  const { user } = useAuth();
  const router = useRouter();

  if (!user) {
    return null;
  }

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{user.displayName || 'ユーザー'}</span>
          <span className="text-xs text-muted-foreground">{user.email}</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSignOut}
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
