// Newsletter Form Component (Firebase)
// Reference: @docs/02_FRONTEND_DEVELOPMENT/STATE_MANAGEMENT.md

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createNewsletter,
  updateNewsletter,
  deleteNewsletter
} from '@/lib/firebase/firestore-helpers';
import { useAuth } from '@/components/providers/auth-provider';
import { Loader2, Save, Trash2, Sparkles, Check } from 'lucide-react';

const newsletterFormSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(200, 'タイトルは200文字以内で入力してください'),
  content: z.string().min(1, 'コンテンツは必須です'),
  productId: z.string().optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'SENT', 'FAILED']).optional(),
});

type NewsletterFormValues = z.infer<typeof newsletterFormSchema>;

interface SubjectOption {
  id: string;
  text: string;
  approach: string;
  reason: string;
}

interface NewsletterFormProps {
  newsletter?: {
    id: string;
    title: string;
    content: string;
    productId: string | null;
    status: string;
  };
  products: { id: string; name: string }[];
}

export function NewsletterForm({ newsletter, products }: NewsletterFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingSubjects, setIsGeneratingSubjects] = useState(false);
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
  const [showSubjectOptions, setShowSubjectOptions] = useState(false);

  const form = useForm<NewsletterFormValues>({
    resolver: zodResolver(newsletterFormSchema),
    defaultValues: {
      title: newsletter?.title || '',
      content: newsletter?.content || '',
      productId: newsletter?.productId || '',
      status: (newsletter?.status as any) || 'DRAFT',
    },
  });

  async function generateSubjects() {
    const content = form.getValues('content');
    if (!content || content.length < 50) {
      alert('件名を生成するには、本文を50文字以上入力してください');
      return;
    }

    setIsGeneratingSubjects(true);
    setShowSubjectOptions(true);

    try {
      const response = await fetch('/api/newsletters/generate-subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) throw new Error('Failed to generate subjects');

      const data = await response.json();
      setSubjectOptions(data.subjects);
    } catch (error) {
      console.error('Failed to generate subjects:', error);
      alert('件名の生成に失敗しました');
      setShowSubjectOptions(false);
    } finally {
      setIsGeneratingSubjects(false);
    }
  }

  function selectSubject(text: string) {
    form.setValue('title', text);
    setShowSubjectOptions(false);
  }

  async function onSubmit(data: NewsletterFormValues) {
    if (!user) return;

    setIsLoading(true);

    try {
      const selectedProduct = products.find(p => p.id === data.productId);

      if (newsletter) {
        await updateNewsletter(newsletter.id, {
          title: data.title,
          content: data.content,
          productId: data.productId || undefined,
          productName: selectedProduct?.name,
          status: data.status || 'DRAFT',
        });
        router.refresh();
      } else {
        const id = await createNewsletter({
          userId: user.uid,
          title: data.title,
          content: data.content,
          productId: data.productId || undefined,
          productName: selectedProduct?.name,
          status: data.status || 'DRAFT',
        });
        router.push(`/newsletters/${id}`);
      }
    } catch (error) {
      console.error('Failed to save newsletter:', error);
      alert('保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!newsletter) return;

    if (!confirm('本当に削除しますか?')) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteNewsletter(newsletter.id);
      router.push('/newsletters');
    } catch (error) {
      console.error('Failed to delete newsletter:', error);
      alert('削除に失敗しました');
      setIsDeleting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
            <CardDescription>
              メルマガのタイトルとコンテンツを入力してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>件名（タイトル）</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateSubjects}
                      disabled={isGeneratingSubjects}
                      className="text-violet-600 border-violet-300 hover:bg-violet-50"
                    >
                      {isGeneratingSubjects ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          生成中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-3 w-3" />
                          AIで件名を生成
                        </>
                      )}
                    </Button>
                  </div>
                  <FormControl>
                    <Input
                      placeholder="メルマガの件名"
                      {...field}
                    />
                  </FormControl>

                  {/* AI Subject Options */}
                  {showSubjectOptions && (
                    <div className="mt-4 space-y-2">
                      {isGeneratingSubjects ? (
                        <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-violet-500" />
                          <p className="text-sm text-muted-foreground mt-2">AIが件名を考えています...</p>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-violet-600">AIが提案する件名（クリックで選択）</p>
                          <div className="space-y-2">
                            {subjectOptions.map((option) => (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => selectSubject(option.text)}
                                className="w-full p-3 text-left border rounded-lg hover:bg-violet-50 hover:border-violet-300 dark:hover:bg-violet-950 transition-colors group"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center text-violet-600 dark:text-violet-300 text-xs font-medium mt-0.5">
                                    {option.id.toUpperCase()}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{option.text}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded mr-2">{option.approach}</span>
                                      {option.reason}
                                    </div>
                                  </div>
                                  <Check className="h-4 w-4 text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </button>
                            ))}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowSubjectOptions(false)}
                            className="text-muted-foreground"
                          >
                            閉じる
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>コンテンツ</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="メルマガの本文を入力してください"
                      className="min-h-[400px] font-mono"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    メール本文として配信されるコンテンツです
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>配信設定</CardTitle>
            <CardDescription>
              ローンチコンテンツとステータスを設定してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ローンチコンテンツ（任意）</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="ローンチコンテンツを選択" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    このメルマガを紐付けるローンチコンテンツを選択
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ステータス</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="ステータスを選択" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="DRAFT">下書き</SelectItem>
                      <SelectItem value="SCHEDULED">配信予約</SelectItem>
                      <SelectItem value="SENT">配信済み</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <div>
            {newsletter && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting || isLoading}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    削除中...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    削除
                  </>
                )}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading || isDeleting}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isLoading || isDeleting}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  保存
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

