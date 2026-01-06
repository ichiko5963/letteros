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
import { Loader2, Save, Trash2 } from 'lucide-react';

const newsletterFormSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(200, 'タイトルは200文字以内で入力してください'),
  content: z.string().min(1, 'コンテンツは必須です'),
  productId: z.string().optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'SENT', 'FAILED']).optional(),
});

type NewsletterFormValues = z.infer<typeof newsletterFormSchema>;

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

  const form = useForm<NewsletterFormValues>({
    resolver: zodResolver(newsletterFormSchema),
    defaultValues: {
      title: newsletter?.title || '',
      content: newsletter?.content || '',
      productId: newsletter?.productId || '',
      status: (newsletter?.status as any) || 'DRAFT',
    },
  });

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
              ニュースレターのタイトルとコンテンツを入力してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>タイトル</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ニュースレターのタイトル"
                      {...field}
                    />
                  </FormControl>
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
                      placeholder="ニュースレターの本文を入力してください"
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
              プロダクトとステータスを設定してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>プロダクト（任意）</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="プロダクトを選択" />
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
                    このニュースレターを紐付けるプロダクトを選択
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
