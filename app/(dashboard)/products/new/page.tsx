// New Product Page (LetterOS - 発信主体の定義)
// Reference: @docs/request.md - プロダクトとは口調・思想・読者・目的が一貫した発信主体

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { createProduct } from '@/lib/firebase/firestore-helpers';
import { Package, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

const TONE_OPTIONS = [
  { value: 'professional', label: 'プロフェッショナル', description: '専門的で信頼感のある文体' },
  { value: 'casual', label: 'カジュアル', description: '親しみやすくフレンドリーな文体' },
  { value: 'authoritative', label: '権威的', description: '専門家としての立場を強調' },
  { value: 'storytelling', label: 'ストーリー重視', description: '物語形式で感情に訴える' },
  { value: 'data-driven', label: 'データ重視', description: '数字と根拠を中心に' },
];

export default function NewProductPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    targetAudience: '',
    valueProposition: '',
    tone: '',
    coreMessage: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      await createProduct({
        userId: user.uid,
        ...formData,
      });
      router.push('/products');
    } catch (error) {
      console.error('Failed to create product:', error);
      alert('プロダクトの作成に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Package className="h-8 w-8" />
            新規プロダクト作成
          </h1>
          <p className="text-muted-foreground mt-2">
            発信主体を定義します
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>プロダクト情報</CardTitle>
          <CardDescription>
            プロダクトとは「口調・思想・読者・目的が一貫した発信主体」の単位です。
            一人が複数のプロダクトを持つことも前提としています。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">プロダクト名 *</Label>
              <Input
                id="name"
                placeholder="例: マーケティングLab"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                placeholder="このプロダクトの概要を記述"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="p-4 bg-violet-50 dark:bg-violet-950 rounded-lg space-y-4">
              <h3 className="font-semibold text-sm">LetterOS発信定義</h3>
              
              <div className="space-y-2">
                <Label htmlFor="targetAudience">どんな読者に？ *</Label>
                <Textarea
                  id="targetAudience"
                  placeholder="例: SaaS企業のマーケティング担当者で、メルマガの成果に悩んでいる人"
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  具体的なペルソナを記述してください
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="valueProposition">どんな価値を？</Label>
                <Textarea
                  id="valueProposition"
                  placeholder="例: 感覚に頼らない、構造化されたメルマガ運用の方法論"
                  value={formData.valueProposition}
                  onChange={(e) => setFormData({ ...formData, valueProposition: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  読者に提供する本質的な価値を記述してください
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tone">どんなトーンで？</Label>
                <Select
                  value={formData.tone}
                  onValueChange={(value) => setFormData({ ...formData, tone: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="トーンを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {TONE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="coreMessage">コアメッセージ</Label>
                <Textarea
                  id="coreMessage"
                  placeholder="例: メルマガは文章力ではなく、仮説検証の構造で成果が決まる"
                  value={formData.coreMessage}
                  onChange={(e) => setFormData({ ...formData, coreMessage: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  このプロダクトで一貫して伝えたい中心的なメッセージ
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Link href="/products">
                <Button type="button" variant="outline">
                  キャンセル
                </Button>
              </Link>
              <Button 
                type="submit" 
                disabled={isSaving || !formData.name || !formData.targetAudience}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    作成中...
                  </>
                ) : (
                  'プロダクトを作成'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

