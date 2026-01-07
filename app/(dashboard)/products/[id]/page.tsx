// Product Detail Page (Launch Content View)
// Shows full details of a launch content item

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { Product } from '@/lib/firebase/firestore-helpers';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, Loader2, Rocket, Sparkles, Target, Heart, Star, Clock, Pencil, Trash2 } from 'lucide-react';

export default function ProductDetailPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const productId = params.id as string;

    const [product, setProduct] = useState<Product | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    // Load product data
    useEffect(() => {
        if (user && productId) {
            setIsLoading(true);

            // Check if it's a local product (id starts with 'local_')
            if (productId.startsWith('local_')) {
                // Load from localStorage
                try {
                    const localProducts = JSON.parse(localStorage.getItem('letteros_products') || '[]');
                    const found = localProducts.find((p: Product) => p.id === productId);
                    if (found) {
                        setProduct(found);
                    }
                } catch (e) {
                    console.error('Failed to load from localStorage:', e);
                }
                setIsLoading(false);
            } else {
                // Load from Firestore
                import('@/lib/firebase/firestore-helpers').then(({ getProduct }) => {
                    getProduct(productId)
                        .then((data) => {
                            if (data) {
                                setProduct(data);
                            }
                        })
                        .catch(console.error)
                        .finally(() => setIsLoading(false));
                });
            }
        }
    }, [user, productId]);

    const handleDelete = async () => {
        if (!confirm('このローンチコンテンツを削除しますか？')) return;

        setIsDeleting(true);

        try {
            if (productId.startsWith('local_')) {
                // Delete from localStorage
                const localProducts = JSON.parse(localStorage.getItem('letteros_products') || '[]');
                const filtered = localProducts.filter((p: Product) => p.id !== productId);
                localStorage.setItem('letteros_products', JSON.stringify(filtered));
            } else {
                // Delete from Firestore
                const { deleteProduct } = await import('@/lib/firebase/firestore-helpers');
                await deleteProduct(productId);
            }
            router.push('/products');
        } catch (error) {
            console.error('Failed to delete:', error);
            alert('削除に失敗しました');
            setIsDeleting(false);
        }
    };

    if (loading || isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!user) return null;

    if (!product) {
        return (
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <Link href="/products">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">ローンチコンテンツが見つかりません</h1>
                        <p className="text-muted-foreground mt-2">
                            このコンテンツは削除されたか、存在しません。
                        </p>
                    </div>
                </div>
                <Button asChild>
                    <Link href="/products">一覧に戻る</Link>
                </Button>
            </div>
        );
    }

    const isAIGenerated = product.launchContent?.generatedBy === 'ai';

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/products">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-bold">{product.name}</h1>
                            {isAIGenerated && (
                                <span className="px-2 py-1 bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
                                    <Sparkles className="h-3 w-3" />
                                    AI生成
                                </span>
                            )}
                        </div>
                        <p className="text-muted-foreground mt-1">{product.description}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" asChild>
                        <Link href={`/products/${productId}/edit`}>
                            <Pencil className="h-4 w-4" />
                        </Link>
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* Basic Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Rocket className="h-5 w-5" />
                        基本情報
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Target className="h-4 w-4" />
                            ターゲット読者
                        </div>
                        <p className="text-sm">{product.targetAudience || '未設定'}</p>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Heart className="h-4 w-4" />
                            提供価値
                        </div>
                        <p className="text-sm">{product.valueProposition || '未設定'}</p>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg md:col-span-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Star className="h-4 w-4" />
                            コアメッセージ
                        </div>
                        <p className="text-sm">{product.coreMessage || '未設定'}</p>
                    </div>
                </CardContent>
            </Card>

            {/* LetterOS Definition */}
            {product.launchContent && (
                <Card className="border-violet-200 dark:border-violet-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-violet-500" />
                            LetterOS発信定義
                        </CardTitle>
                        <CardDescription>
                            {isAIGenerated ? 'AIが生成した発信定義です' : '手動で設定された発信定義です'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-violet-50 dark:bg-violet-950 rounded-lg">
                            <div className="text-sm text-muted-foreground mb-1">コンセプト</div>
                            <p className="font-medium">{product.launchContent.concept || '未設定'}</p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="p-4 bg-violet-50 dark:bg-violet-950 rounded-lg">
                                <div className="text-sm text-muted-foreground mb-1">顧客のPAIN</div>
                                <p className="text-sm">{product.launchContent.targetPain || '未設定'}</p>
                            </div>

                            <div className="p-4 bg-violet-50 dark:bg-violet-950 rounded-lg">
                                <div className="text-sm text-muted-foreground mb-1">顧客の現状</div>
                                <p className="text-sm">{product.launchContent.currentState || '未設定'}</p>
                            </div>
                        </div>

                        <div className="p-4 bg-violet-50 dark:bg-violet-950 rounded-lg">
                            <div className="text-sm text-muted-foreground mb-1">理想の未来</div>
                            <p className="text-sm">{product.launchContent.idealFuture || '未設定'}</p>
                        </div>

                        {/* AI Answers (if AI generated) */}
                        {isAIGenerated && product.launchContent.aiAnswers && (
                            <div className="pt-4 border-t border-violet-200 dark:border-violet-800">
                                <div className="text-sm font-medium mb-3">AIへの回答履歴</div>
                                <div className="grid gap-2 text-sm">
                                    <div className="flex gap-2">
                                        <span className="text-muted-foreground">Step 1:</span>
                                        <span>{product.launchContent.aiAnswers.step1}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="text-muted-foreground">Step 2:</span>
                                        <span>{product.launchContent.aiAnswers.step2}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="text-muted-foreground">Step 3:</span>
                                        <span>{product.launchContent.aiAnswers.step3}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="text-muted-foreground">Step 4:</span>
                                        <span>{product.launchContent.aiAnswers.step4}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Metadata */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        作成日時: {product.createdAt ? new Date(typeof product.createdAt === 'string' ? product.createdAt : product.createdAt.toDate()).toLocaleString('ja-JP') : '不明'}
                    </div>
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4">
                <Button variant="outline" asChild>
                    <Link href="/products">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        一覧に戻る
                    </Link>
                </Button>
            </div>
        </div>
    );
}
