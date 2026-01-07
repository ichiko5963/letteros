// Send Newsletter Dialog Component
// With tag-based subscriber selection

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Loader2, Send, Mail, CheckCircle2, Tag, Users } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { cn } from '@/lib/utils';

interface Subscriber {
  id: string;
  email: string;
  name?: string;
  tags: string[];
}

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
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [sendComplete, setSendComplete] = useState(false);

  // Tag selection state
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

  // Load subscribers and tags when dialog opens
  useEffect(() => {
    if (open && user) {
      loadSubscribersAndTags();
    }
  }, [open, user]);

  const loadSubscribersAndTags = async () => {
    if (!user) return;

    setLoadingTags(true);
    try {
      const q = query(
        collection(db, 'subscribers'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Subscriber[];

      setSubscribers(data);

      // Extract unique tags
      const tags = [...new Set(data.flatMap(s => s.tags))].sort();
      setAllTags(tags);
    } catch (error) {
      console.error('Failed to load subscribers:', error);
    } finally {
      setLoadingTags(false);
    }
  };

  // Calculate filtered subscriber count
  const filteredSubscribers = selectedTags.length === 0
    ? subscribers
    : subscribers.filter(s => selectedTags.some(tag => s.tags.includes(tag)));

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  async function handleSendToSubscribers() {
    setIsSending(true);

    try {
      // Get emails of filtered subscribers
      const emails = filteredSubscribers.map(s => s.email);

      const result = await sendNewsletterToProduct(newsletterId, emails);
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

  const handleClose = () => {
    setOpen(false);
    // Reset state when closing
    setTimeout(() => {
      setSendComplete(false);
      setSelectedTags([]);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Send className="mr-2 h-4 w-4" />
          配信
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {!sendComplete ? (
          <>
            <DialogHeader>
              <DialogTitle>メルマガを配信</DialogTitle>
              <DialogDescription>
                配信前にテスト送信で内容を確認することをお勧めします
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Test Send */}
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

              {/* Tag Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    配信先を選択
                  </CardTitle>
                  <CardDescription>
                    タグで配信対象を絞り込めます（未選択 = 全員に配信）
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingTags ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : allTags.length > 0 ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {allTags.map(tag => {
                          const count = subscribers.filter(s => s.tags.includes(tag)).length;
                          const isSelected = selectedTags.includes(tag);
                          return (
                            <Button
                              key={tag}
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleTag(tag)}
                              className={cn(
                                isSelected && "bg-violet-500 hover:bg-violet-600"
                              )}
                            >
                              {tag} ({count})
                            </Button>
                          );
                        })}
                      </div>
                      {selectedTags.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTags([])}
                          className="text-muted-foreground"
                        >
                          選択をクリア
                        </Button>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      タグが設定された購読者がいません
                    </p>
                  )}

                  {/* Subscriber count summary */}
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {filteredSubscribers.length}名に配信
                      </p>
                      {selectedTags.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          選択タグ: {selectedTags.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Send Button */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">本番配信</CardTitle>
                  <CardDescription>
                    {selectedTags.length > 0
                      ? `「${selectedTags.join('」「')}」タグの購読者に配信します`
                      : '全ての購読者に配信します'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleSendToSubscribers}
                    disabled={isSending || filteredSubscribers.length === 0}
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
                        {filteredSubscribers.length}名に配信
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
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
                {filteredSubscribers.length}名への送信を開始しました
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>
                閉じる
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
