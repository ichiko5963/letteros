// AI Launch Content Creation Page
// 4-step AI-powered launch content generation wizard

'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { createProduct } from '@/lib/firebase/firestore-helpers';
import { ArrowLeft, Loader2, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface AIQuestion {
    question: string;
    options: string[];
}

interface LaunchContentData {
    name: string;
    description: string;
    targetAudience: string;
    valueProposition: string;
    tone: string;
    coreMessage: string;
    launchContent: {
        concept: string;
        targetPain: string;
        currentState: string;
        idealFuture: string;
        generatedBy: 'ai';
        aiAnswers: {
            step1: string;
            step2: string;
            step3: string;
            step4: string;
        };
    };
}

const STEPS = [
    { id: 1, title: 'ターゲット設定', description: '誰を助けたいですか？' },
    { id: 2, title: 'コンセプト設計', description: 'どんな未来に連れていきますか？' },
    { id: 3, title: '顧客のPAIN', description: '顧客の最も深刻な痛みは？' },
    { id: 4, title: '理想の未来', description: '顧客の理想の状態は？' },
];

export default function AIProductPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // State
    const [currentStep, setCurrentStep] = useState(0); // 0 = input, 1-4 = questions, 5 = preview
    const [longText, setLongText] = useState('');
    const [contentName, setContentName] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveProgress, setSaveProgress] = useState(0);
    const [questions, setQuestions] = useState<AIQuestion[]>([]);
    const [answers, setAnswers] = useState<string[]>([]);
    const [generatedContent, setGeneratedContent] = useState<LaunchContentData | null>(null);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    // Analyze long text and generate first question
    const handleAnalyze = async () => {
        if (!longText.trim() || !contentName.trim()) return;

        setIsAnalyzing(true);
        try {
            const response = await fetch('/api/launch-content/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: longText, name: contentName }),
            });

            if (!response.ok) throw new Error('Analysis failed');

            const data = await response.json();
            setQuestions([data.question]);
            setCurrentStep(1);
        } catch (error) {
            console.error('Failed to analyze:', error);
            alert('分析に失敗しました。もう一度お試しください。');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Handle answer selection
    const handleSelectAnswer = async (answer: string) => {
        const newAnswers = [...answers, answer];
        setAnswers(newAnswers);

        if (currentStep < 4) {
            // Get next question
            setIsAnalyzing(true);
            try {
                const response = await fetch('/api/launch-content/question', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        step: currentStep + 1,
                        context: { longText, answers: newAnswers },
                    }),
                });

                if (!response.ok) throw new Error('Failed to get next question');

                const data = await response.json();
                setQuestions([...questions, data.question]);
                setCurrentStep(currentStep + 1);
            } catch (error) {
                console.error('Failed to get next question:', error);
                alert('次の質問の取得に失敗しました。');
            } finally {
                setIsAnalyzing(false);
            }
        } else {
            // Generate final content
            setIsAnalyzing(true);
            try {
                const response = await fetch('/api/launch-content/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: contentName,
                        longText,
                        answers: newAnswers,
                    }),
                });

                if (!response.ok) throw new Error('Failed to generate content');

                const data = await response.json();
                setGeneratedContent(data.content);
                setCurrentStep(5);
            } catch (error) {
                console.error('Failed to generate content:', error);
                alert('コンテンツ生成に失敗しました。');
            } finally {
                setIsAnalyzing(false);
            }
        }
    };

    // Save to localStorage first (guaranteed), then optionally try Firestore
    const handleSave = async () => {
        if (!user || !generatedContent) return;

        setIsSaving(true);
        setSaveProgress(0);

        // Animate progress
        const animateProgress = (target: number, duration: number) => {
            return new Promise<void>((resolve) => {
                const start = saveProgress;
                const startTime = Date.now();
                const animate = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    setSaveProgress(Math.floor(start + (target - start) * progress));
                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        resolve();
                    }
                };
                animate();
            });
        };

        // Extract and structure data properly
        const productData = {
            id: `local_${Date.now()}`,
            userId: user.uid,
            name: generatedContent.name || contentName,
            description: generatedContent.description || '',
            targetAudience: generatedContent.targetAudience || '',
            valueProposition: generatedContent.valueProposition || '',
            tone: generatedContent.tone || 'storytelling',
            coreMessage: generatedContent.coreMessage || '',
            launchContent: {
                concept: generatedContent.launchContent?.concept || '',
                targetPain: generatedContent.launchContent?.targetPain || '',
                currentState: generatedContent.launchContent?.currentState || '',
                idealFuture: generatedContent.launchContent?.idealFuture || '',
                generatedBy: 'ai' as const,
                aiAnswers: {
                    step1: answers[0] || '',
                    step2: answers[1] || '',
                    step3: answers[2] || '',
                    step4: answers[3] || '',
                },
            },
            createdAt: new Date().toISOString(),
        };

        console.log('Saving product data:', productData);

        // Progress: 0 -> 30% (preparing)
        setSaveProgress(30);
        await new Promise(r => setTimeout(r, 300));

        // Step 1: ALWAYS save to localStorage first (instant, guaranteed)
        try {
            const existingProducts = JSON.parse(localStorage.getItem('letteros_products') || '[]');
            existingProducts.push(productData);
            localStorage.setItem('letteros_products', JSON.stringify(existingProducts));
            console.log('Saved to localStorage successfully');
        } catch (localError) {
            console.error('localStorage save failed:', localError);
        }

        // Progress: 30 -> 60% (localStorage done)
        setSaveProgress(60);
        await new Promise(r => setTimeout(r, 300));

        // Step 2: Try Firestore with a 3-second timeout (optional, non-blocking)
        try {
            const firestorePromise = createProduct(productData);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Firestore timeout')), 3000)
            );

            await Promise.race([firestorePromise, timeoutPromise]);
            console.log('Also saved to Firestore');
        } catch (error) {
            console.log('Firestore save skipped or failed (data is safe in localStorage):', error);
        }

        // Progress: 60 -> 100% (complete)
        setSaveProgress(100);
        await new Promise(r => setTimeout(r, 500));

        // Navigate after progress complete
        router.push('/products');
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
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/products/new">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Sparkles className="h-8 w-8 text-violet-500" />
                        AIで作る
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        {currentStep === 0
                            ? '長文を入力して分析を開始'
                            : currentStep <= 4
                                ? `質問 ${currentStep} / 4`
                                : '生成結果をプレビュー'}
                    </p>
                </div>
            </div>

            {/* Progress Bar */}
            {currentStep > 0 && currentStep <= 5 && (
                <div className="flex gap-2">
                    {STEPS.map((step) => (
                        <div
                            key={step.id}
                            className={`flex-1 h-2 rounded-full transition-colors ${step.id < currentStep
                                ? 'bg-violet-500'
                                : step.id === currentStep
                                    ? 'bg-violet-300'
                                    : currentStep === 5
                                        ? 'bg-violet-500'
                                        : 'bg-slate-200 dark:bg-slate-700'
                                }`}
                        />
                    ))}
                </div>
            )}

            {/* Step 0: Input Long Text */}
            {currentStep === 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>あなたのビジネスについて教えてください</CardTitle>
                        <CardDescription>
                            あなたのビジネス、商品、サービス、ターゲット顧客などについて自由に記述してください。
                            できるだけ詳しく書くほど、AIがより正確な発信定義を生成できます。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">ローンチコンテンツ名 *</Label>
                            <Input
                                id="name"
                                placeholder="例: マーケティングLab"
                                value={contentName}
                                onChange={(e) => setContentName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="longText">詳細説明 *</Label>
                            <Textarea
                                id="longText"
                                placeholder={`例:
私は10年間、中小企業のマーケティング支援をしてきました。
特にメルマガ運用に強みがあり、開封率30%以上を達成したクライアントも多数います。

ターゲットは、SaaS企業のマーケティング担当者で...
彼らの悩みは...
私が提供できる価値は...`}
                                value={longText}
                                onChange={(e) => setLongText(e.target.value)}
                                className="min-h-[300px]"
                            />
                            <p className="text-xs text-muted-foreground">
                                500文字以上推奨
                            </p>
                        </div>

                        <Button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing || !longText.trim() || !contentName.trim() || longText.length < 100}
                            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    分析中...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    分析を開始
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Steps 1-4: Questions */}
            {currentStep >= 1 && currentStep <= 4 && questions[currentStep - 1] && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2 text-violet-500 text-sm font-medium mb-2">
                            <Sparkles className="h-4 w-4" />
                            AIからの質問
                        </div>
                        <CardTitle className="text-xl">
                            {STEPS[currentStep - 1].title}
                        </CardTitle>
                        <CardDescription className="text-base">
                            {questions[currentStep - 1].question}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {isAnalyzing ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                            </div>
                        ) : (
                            questions[currentStep - 1].options.map((option, index) => (
                                <Button
                                    key={index}
                                    variant="outline"
                                    className="w-full justify-start text-left h-auto min-h-[60px] py-4 px-4 hover:bg-violet-50 hover:border-violet-300 dark:hover:bg-violet-950 whitespace-normal"
                                    onClick={() => handleSelectAnswer(option)}
                                >
                                    <span className="flex items-start gap-3 w-full">
                                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center text-violet-600 dark:text-violet-300 font-medium mt-0.5">
                                            {String.fromCharCode(65 + index)}
                                        </span>
                                        <span className="text-sm leading-relaxed break-words">{option}</span>
                                    </span>
                                </Button>
                            ))
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Step 5: Preview */}
            {currentStep === 5 && generatedContent && (
                <div className="space-y-6">
                    <Card className="border-violet-200 dark:border-violet-800">
                        <CardHeader>
                            <div className="flex items-center gap-2 text-violet-500 text-sm font-medium mb-2">
                                <CheckCircle2 className="h-4 w-4" />
                                生成完了
                            </div>
                            <CardTitle>{generatedContent.name}</CardTitle>
                            <CardDescription>{generatedContent.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                    <h4 className="font-semibold text-sm mb-2">ターゲット読者</h4>
                                    <p className="text-sm text-muted-foreground">{generatedContent.targetAudience}</p>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                    <h4 className="font-semibold text-sm mb-2">提供価値</h4>
                                    <p className="text-sm text-muted-foreground">{generatedContent.valueProposition}</p>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                    <h4 className="font-semibold text-sm mb-2">コアメッセージ</h4>
                                    <p className="text-sm text-muted-foreground">{generatedContent.coreMessage}</p>
                                </div>

                                <div className="p-4 bg-violet-50 dark:bg-violet-950 rounded-lg space-y-3">
                                    <h4 className="font-semibold text-sm">LetterOS発信定義</h4>

                                    <div>
                                        <span className="text-xs text-muted-foreground">コンセプト</span>
                                        <p className="text-sm">{generatedContent.launchContent.concept}</p>
                                    </div>

                                    <div>
                                        <span className="text-xs text-muted-foreground">顧客のPAIN</span>
                                        <p className="text-sm">{generatedContent.launchContent.targetPain}</p>
                                    </div>

                                    <div>
                                        <span className="text-xs text-muted-foreground">顧客の現状</span>
                                        <p className="text-sm">{generatedContent.launchContent.currentState}</p>
                                    </div>

                                    <div>
                                        <span className="text-xs text-muted-foreground">理想の未来</span>
                                        <p className="text-sm">{generatedContent.launchContent.idealFuture}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        {isSaving && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">保存中...</span>
                                    <span className="font-medium text-violet-600">{saveProgress}%</span>
                                </div>
                                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300 ease-out"
                                        style={{ width: `${saveProgress}%` }}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground text-center">
                                    {saveProgress < 30 ? 'データを準備中...' :
                                        saveProgress < 60 ? 'ローカルに保存中...' :
                                            saveProgress < 100 ? 'クラウドに同期中...' :
                                                'ローンチコンテンツに追加完了！'}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setCurrentStep(0);
                                    setQuestions([]);
                                    setAnswers([]);
                                    setGeneratedContent(null);
                                    setSaveProgress(0);
                                }}
                                disabled={isSaving}
                            >
                                やり直す
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {saveProgress}% 保存中...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        この内容で保存
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
