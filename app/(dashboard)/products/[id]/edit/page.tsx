// Product Edit Page (Launch Content Edit)
// Allows editing of existing launch content

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { Product, updateProduct } from '@/lib/firebase/firestore-helpers';
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
import { ArrowLeft, Loader2, Save, Rocket, Calendar } from 'lucide-react';

const TONE_OPTIONS = [
    { value: 'storytelling', label: 'ストーリーテリング' },
    { value: 'professional', label: 'プロフェッショナル' },
    { value: 'casual', label: 'カジュアル' },
    { value: 'academic', label: 'アカデミック' },
    { value: 'empathetic', label: '共感型' },
];

export default function ProductEditPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const productId = params.id as string;

    const [product, setProduct] = useState<Product | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [targetAudience, setTargetAudience] = useState('');
    const [valueProposition, setValueProposition] = useState('');
    const [tone, setTone] = useState('storytelling');
    const [coreMessage, setCoreMessage] = useState('');
    const [concept, setConcept] = useState('');
    const [targetPain, setTargetPain] = useState('');
    const [currentState, setCurrentState] = useState('');
    const [idealFuture, setIdealFuture] = useState('');
    // メルマガ用フィールド
    const [lpUrl, setLpUrl] = useState('');
    const [urlType, setUrlType] = useState<'lp' | 'application' | 'purchase' | 'line' | 'other'>('lp');
    const [price, setPrice] = useState('');
    const [priceNote, setPriceNote] = useState('');
    // ローンチ日フィールド
    const [launchDate, setLaunchDate] = useState('');
    const [launchEndDate, setLaunchEndDate] = useState('');
    const [eventType, setEventType] = useState<'product' | 'event' | 'campaign' | 'other'>('product');

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    // Load product data
    useEffect(() => {
        if (user && productId) {
            setIsLoading(true);

            if (productId.startsWith('local_')) {
                // Load from localStorage
                try {
                    const localProducts = JSON.parse(localStorage.getItem('letteros_products') || '[]');
                    const found = localProducts.find((p: Product) => p.id === productId);
                    if (found) {
                        setProduct(found);
                        populateForm(found);
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
                                populateForm(data);
                            }
                        })
                        .catch(console.error)
                        .finally(() => setIsLoading(false));
                });
            }
        }
    }, [user, productId]);

    const populateForm = (p: Product) => {
        setName(p.name || '');
        setDescription(p.description || '');
        setTargetAudience(p.targetAudience || '');
        setValueProposition(p.valueProposition || '');
        setTone(p.tone || 'storytelling');
        setCoreMessage(p.coreMessage || '');
        setConcept(p.launchContent?.concept || '');
        setTargetPain(p.launchContent?.targetPain || '');
        setCurrentState(p.launchContent?.currentState || '');
        setIdealFuture(p.launchContent?.idealFuture || '');
        // メルマガ用フィールド
        setLpUrl(p.launchContent?.lpUrl || '');
        setUrlType(p.launchContent?.urlType || 'lp');
        setPrice(p.launchContent?.price || '');
        setPriceNote(p.launchContent?.priceNote || '');
        // ローンチ日フィールド
        setLaunchDate(p.launchContent?.launchDate || '');
        setLaunchEndDate(p.launchContent?.launchEndDate || '');
        setEventType(p.launchContent?.eventType || 'product');
    };

    const handleSave = async () => {
        if (!user || !product) return;

        setIsSaving(true);

        const updatedData = {
            name,
            description,
            targetAudience,
            valueProposition,
            tone,
            coreMessage,
            launchContent: {
                ...product.launchContent,
                concept,
                targetPain,
                currentState,
                idealFuture,
                // メルマガ用フィールド
                lpUrl,
                urlType,
                price,
                priceNote,
                // ローンチ日フィールド
                launchDate,
                launchEndDate,
                eventType,
            },
        };

        try {
            if (productId.startsWith('local_')) {
                // Update in localStorage
                const localProducts = JSON.parse(localStorage.getItem('letteros_products') || '[]');
                const index = localProducts.findIndex((p: Product) => p.id === productId);
                if (index !== -1) {
                    localProducts[index] = { ...localProducts[index], ...updatedData };
                    localStorage.setItem('letteros_products', JSON.stringify(localProducts));
                }
            } else {
                // Update in Firestore
                await updateProduct(productId, updatedData);
            }
            router.push(`/products/${productId}`);
        } catch (error) {
            console.error('Failed to save:', error);
            alert('保存に失敗しました');
        } finally {
            setIsSaving(false);
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
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/products/${productId}`}>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Rocket className="h-8 w-8" />
                            編集
                        </h1>
                        <p className="text-muted-foreground mt-1">ローンチコンテンツを編集</p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
                    {isSaving ? (
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

            {/* Basic Info */}
            <Card>
                <CardHeader>
                    <CardTitle>基本情報</CardTitle>
                    <CardDescription>ローンチコンテンツの基本設定</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">コンテンツ名 *</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="例: マーケティングLab"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">説明</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="このローンチコンテンツの概要"
                            className="min-h-[100px]"
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="targetAudience">ターゲット読者</Label>
                            <Input
                                id="targetAudience"
                                value={targetAudience}
                                onChange={(e) => setTargetAudience(e.target.value)}
                                placeholder="例: SaaS企業のマーケター"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tone">トーン</Label>
                            <Select value={tone} onValueChange={setTone}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TONE_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="valueProposition">提供価値</Label>
                        <Textarea
                            id="valueProposition"
                            value={valueProposition}
                            onChange={(e) => setValueProposition(e.target.value)}
                            placeholder="読者に提供する価値"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="coreMessage">コアメッセージ</Label>
                        <Textarea
                            id="coreMessage"
                            value={coreMessage}
                            onChange={(e) => setCoreMessage(e.target.value)}
                            placeholder="一貫して伝えたいメッセージ"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* LetterOS Definition */}
            <Card className="border-violet-200 dark:border-violet-800">
                <CardHeader>
                    <CardTitle>LetterOS発信定義</CardTitle>
                    <CardDescription>マーケティング戦略の核となる定義</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="concept">コンセプト</Label>
                        <Textarea
                            id="concept"
                            value={concept}
                            onChange={(e) => setConcept(e.target.value)}
                            placeholder="このコンテンツの核となるコンセプト"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="targetPain">顧客のPAIN</Label>
                        <Textarea
                            id="targetPain"
                            value={targetPain}
                            onChange={(e) => setTargetPain(e.target.value)}
                            placeholder="顧客が抱える最も深刻な痛み"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="currentState">顧客の現状</Label>
                        <Textarea
                            id="currentState"
                            value={currentState}
                            onChange={(e) => setCurrentState(e.target.value)}
                            placeholder="顧客が今どのような状態にいるか"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="idealFuture">理想の未来</Label>
                        <Textarea
                            id="idealFuture"
                            value={idealFuture}
                            onChange={(e) => setIdealFuture(e.target.value)}
                            placeholder="顧客が到達したい理想の状態"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Newsletter Info */}
            <Card className="border-blue-200 dark:border-blue-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        📧 メルマガ用情報
                    </CardTitle>
                    <CardDescription>メルマガのCTA（行動喚起）で使用される情報</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="lpUrl">LP/申込ページURL</Label>
                        <Input
                            id="lpUrl"
                            value={lpUrl}
                            onChange={(e) => setLpUrl(e.target.value)}
                            placeholder="https://example.com/lp"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="urlType">URLの種類</Label>
                        <Select value={urlType} onValueChange={(v) => setUrlType(v as any)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="lp">ランディングページ</SelectItem>
                                <SelectItem value="application">申込フォーム</SelectItem>
                                <SelectItem value="purchase">購入ページ</SelectItem>
                                <SelectItem value="line">LINE登録</SelectItem>
                                <SelectItem value="other">その他</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="price">価格</Label>
                            <Input
                                id="price"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="例: 29,800円"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="priceNote">価格の補足</Label>
                            <Input
                                id="priceNote"
                                value={priceNote}
                                onChange={(e) => setPriceNote(e.target.value)}
                                placeholder="例: 早期割引あり"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Launch Schedule */}
            <Card className="border-green-200 dark:border-green-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        ローンチスケジュール
                    </CardTitle>
                    <CardDescription>ローンチ日やイベント日を設定すると、AIが最適な配信タイミングを提案します</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="eventType">イベント種類</Label>
                        <Select value={eventType} onValueChange={(v) => setEventType(v as any)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="product">プロダクトローンチ</SelectItem>
                                <SelectItem value="event">イベント・セミナー</SelectItem>
                                <SelectItem value="campaign">キャンペーン</SelectItem>
                                <SelectItem value="other">その他</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="launchDate">ローンチ日 / イベント日</Label>
                            <Input
                                id="launchDate"
                                type="date"
                                value={launchDate}
                                onChange={(e) => setLaunchDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="launchEndDate">終了日（任意）</Label>
                            <Input
                                id="launchEndDate"
                                type="date"
                                value={launchEndDate}
                                onChange={(e) => setLaunchEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        この日程を元に、AIがメルマガの配信スケジュールを自動提案します
                    </p>
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4">
                <Button variant="outline" asChild>
                    <Link href={`/products/${productId}`}>
                        キャンセル
                    </Link>
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={isSaving || !name.trim()}
                    className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            保存中...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            変更を保存
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
