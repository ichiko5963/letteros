// Login Page
// Reference: @docs/03_BACKEND_API/AUTHENTICATION.md

import { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'ログイン | LetterOS',
  description: 'LetterOSにログインして、ニュースレターを作成・配信しましょう',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            LetterOS
          </CardTitle>
          <CardDescription className="text-center">
            AIエディタでニュースレター配信を加速
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
