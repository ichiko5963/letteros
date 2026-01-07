// Send Newsletter Dialog Component
// Reference: @docs/02_FRONTEND_DEVELOPMENT/UI_COMPONENTS_LIBRARY.md

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { sendNewsletterToProduct, sendTestEmail } from '@/lib/actions/send-newsletter';
import { Loader2, Send, Mail, CheckCircle2 } from 'lucide-react';

interface SendDialogProps {
  newsletterId: string;
  hasProduct: boolean;
  productName?: string;
  subscriberCount?: number;
}

export function SendDialog({
  newsletterId,
  hasProduct,
  productName,
  subscriberCount = 0,
}: SendDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [sendComplete, setSendComplete] = useState(false);

  async function handleSendToProduct() {
    setIsSending(true);

    try {
      const result = await sendNewsletterToProduct(newsletterId);
      console.log('Send result:', result);
      setSendComplete(true);
    } catch (error) {
      console.error('Failed to send:', error);
      alert('配信に失敗しました');
    } finally {
      setIsSending(false);
    }
  }

  async function handleSendTest() {
    if (!testEmail) return;

    setIsSendingTest(true);
    setTestSent(false);

    try {
      await sendTestEmail(newsletterId, testEmail);
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    } catch (error) {
      console.error('Failed to send test:', error);
      alert('テスト送信に失敗しました');
    } finally {
      setIsSendingTest(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Send className="mr-2 h-4 w-4" />
          配信
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        {!sendComplete ? (
          <>
            <DialogHeader>
              <DialogTitle>メルマガを配信</DialogTitle>
              <DialogDescription>
                配信前にテスト送信で内容を確認することをお勧めします
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">テスト送信</CardTitle>
                  <CardDescription>
                    自分宛にテストメールを送信して内容を確認
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        type="email"
                        placeholder="test@example.com"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendTest}
                      disabled={!testEmail || isSendingTest}
                    >
                      {isSendingTest ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          送信中...
                        </>
                      ) : testSent ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          送信完了
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          送信
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {hasProduct && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">本番配信</CardTitle>
                    <CardDescription>
                      {productName} の購読者 {subscriberCount} 名に配信します
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={handleSendToProduct}
                      disabled={isSending || subscriberCount === 0}
                      className="w-full"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          配信中...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          {subscriberCount} 名に配信
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {!hasProduct && (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground text-center">
                      ローンチコンテンツが設定されていないため、本番配信できません。
                      <br />
                      メルマガ編集画面でローンチコンテンツを選択してください。
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                閉じる
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>配信完了</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="h-16 w-16 text-green-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                メルマガの配信が完了しました
              </h3>
              <p className="text-sm text-muted-foreground">
                購読者へのメール送信を開始しました
              </p>
            </div>

            <DialogFooter>
              <Button onClick={() => setOpen(false)}>
                閉じる
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
