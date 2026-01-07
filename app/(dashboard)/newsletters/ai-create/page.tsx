// AI Newsletter Creation Wizard (LetterOS Core Feature)
// Based on: @docs/request.md, @docs/marketing.md

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Target,
  Lightbulb,
  FileText,
  Send,
  Loader2,
  MessageSquare,
  Hash,
} from 'lucide-react';
import { getUserProducts, Product, createNewsletter } from '@/lib/firebase/firestore-helpers';
import { cn } from '@/lib/utils';

// Steps in the wizard  
const STEPS = [
  { id: 'product', title: 'ローンチコンテンツ', icon: Target, description: '発信主体を選択' },
  { id: 'count', title: '通数提案', icon: Hash, description: 'AIが最適な通数を提案' },
  { id: 'plan', title: 'AI壁打ち', icon: MessageSquare, description: '対話で企画を詰める' },
  { id: 'generate', title: 'AI生成', icon: Sparkles, description: '複数案を生成' },
  { id: 'select', title: '選択', icon: Check, description: '最適な案を選ぶ' },
  { id: 'edit', title: '最終編集', icon: FileText, description: '仕上げと確認' },
];

// Types
interface CountOption {
  count: number;
  name: string;
  description: string;
}

interface CountSuggestion {
  recommended: number;
  reasoning: string;
  options: CountOption[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface NewsletterPlan {
  number: number;
  subject: string;
  mainPoint: string;
  targetBelief: string;
  proof: string;
  cta: string;
}

interface GeneratedVariant {
  id: string;
  content: string;
  reasoning: string;
}

interface GeneratedContent {
  subjects: GeneratedVariant[];
  introductions: GeneratedVariant[];
  structures: GeneratedVariant[];
  conclusions: GeneratedVariant[];
}

interface SelectedContent {
  subject: GeneratedVariant | null;
  introduction: GeneratedVariant | null;
  structure: GeneratedVariant | null;
  conclusion: GeneratedVariant | null;
}

export default function AICreateNewsletterPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Count suggestion state
  const [countSuggestion, setCountSuggestion] = useState<CountSuggestion | null>(null);
  const [selectedCount, setSelectedCount] = useState<number>(3);
  const [isLoadingCount, setIsLoadingCount] = useState(false);

  // Chat planning state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [newsletterPlans, setNewsletterPlans] = useState<NewsletterPlan[]>([]);

  // Generation state
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [selectedContent, setSelectedContent] = useState<SelectedContent>({
    subject: null,
    introduction: null,
    structure: null,
    conclusion: null,
  });
  const [finalContent, setFinalContent] = useState({ title: '', content: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Auth check
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load products from localStorage first, then Firestore
  useEffect(() => {
    if (user) {
      setLoadingProducts(true);

      // Load from localStorage first (instant)
      try {
        const localProducts = JSON.parse(localStorage.getItem('letteros_products') || '[]');
        const userLocalProducts = localProducts.filter((p: Product) => p.userId === user.uid);
        if (userLocalProducts.length > 0) {
          setProducts(userLocalProducts);
          setLoadingProducts(false);
        }
      } catch (e) {
        console.error('Failed to load from localStorage:', e);
      }

      // Then load from Firestore
      getUserProducts(user.uid)
        .then((firestoreProducts) => {
          const localProducts = JSON.parse(localStorage.getItem('letteros_products') || '[]');
          const userLocalProducts = localProducts.filter((p: Product) => p.userId === user.uid);

          const allProducts = [...firestoreProducts];
          userLocalProducts.forEach((localProd: Product) => {
            if (!allProducts.some(p => p.id === localProd.id)) {
              allProducts.push(localProd);
            }
          });

          setProducts(allProducts);
        })
        .catch(console.error)
        .finally(() => setLoadingProducts(false));
    }
  }, [user]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Fetch count suggestion when product is selected
  const fetchCountSuggestion = async () => {
    if (!selectedProduct) return;

    setIsLoadingCount(true);
    try {
      const launchContent = {
        name: selectedProduct.name,
        description: selectedProduct.description,
        targetAudience: selectedProduct.targetAudience,
        valueProposition: selectedProduct.valueProposition,
        concept: selectedProduct.launchContent?.concept,
        targetPain: selectedProduct.launchContent?.targetPain,
      };

      const response = await fetch('/api/ai/newsletter-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ launchContent }),
      });

      const data = await response.json();
      setCountSuggestion(data);
      setSelectedCount(data.recommended || 3);
    } catch (error) {
      console.error('Failed to fetch count suggestion:', error);
      // Fallback
      setCountSuggestion({
        recommended: 3,
        reasoning: '一般的なローンチには3通シリーズが効果的です',
        options: [
          { count: 2, name: 'コンパクト', description: '興味喚起→行動促進の2ステップ' },
          { count: 3, name: 'スタンダード', description: '認知→理解→行動の3ステップ' },
          { count: 4, name: 'じっくり', description: '信頼構築を重視した4ステップ' },
        ],
      });
    } finally {
      setIsLoadingCount(false);
    }
  };

  // Start chat with initial AI question
  const startPlanningChat = async () => {
    if (!selectedProduct) return;

    setIsChatLoading(true);
    setChatMessages([]);

    try {
      const launchContent = {
        name: selectedProduct.name,
        description: selectedProduct.description,
        targetAudience: selectedProduct.targetAudience,
        valueProposition: selectedProduct.valueProposition,
        concept: selectedProduct.launchContent?.concept,
        targetPain: selectedProduct.launchContent?.targetPain,
        currentState: selectedProduct.launchContent?.currentState,
        idealFuture: selectedProduct.launchContent?.idealFuture,
      };

      const response = await fetch('/api/ai/planning-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          launchContent,
          chatHistory: [],
          newsletterCount: selectedCount,
        }),
      });

      const data = await response.json();

      if (data.type === 'question') {
        setChatMessages([{ role: 'assistant', content: data.question }]);
      } else if (data.type === 'proposal') {
        setNewsletterPlans(data.newsletters);
        setChatMessages([{
          role: 'assistant',
          content: `企画が完成しました！${data.newsletters.length}通のメルマガシリーズを提案します。`
        }]);
      }
    } catch (error) {
      console.error('Failed to start planning chat:', error);
      setChatMessages([{
        role: 'assistant',
        content: 'このローンチコンテンツで読者に届けたいメッセージは何ですか？具体的な目標や、読者に取らせたい行動を教えてください。'
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Send chat message
  const sendChatMessage = async () => {
    if (!chatInput.trim() || !selectedProduct) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      const launchContent = {
        name: selectedProduct.name,
        description: selectedProduct.description,
        targetAudience: selectedProduct.targetAudience,
        valueProposition: selectedProduct.valueProposition,
        concept: selectedProduct.launchContent?.concept,
        targetPain: selectedProduct.launchContent?.targetPain,
        currentState: selectedProduct.launchContent?.currentState,
        idealFuture: selectedProduct.launchContent?.idealFuture,
      };

      const newHistory = [...chatMessages, { role: 'user' as const, content: userMessage }];

      const response = await fetch('/api/ai/planning-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          launchContent,
          chatHistory: newHistory,
          newsletterCount: selectedCount,
        }),
      });

      const data = await response.json();

      if (data.type === 'question') {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.question }]);
      } else if (data.type === 'proposal') {
        setNewsletterPlans(data.newsletters);
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `🎉 企画が完成しました！${data.newsletters.length}通のメルマガシリーズを作成しました。「次へ」をクリックして内容を生成しましょう。`
        }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.question || 'もう少し詳しく教えてください。' }]);
      }
    } catch (error) {
      console.error('Failed to send chat message:', error);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'すみません、エラーが発生しました。もう一度お試しください。'
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Force complete planning
  const handleForceComplete = async () => {
    if (!selectedProduct) return;

    setIsChatLoading(true);

    try {
      const launchContent = {
        name: selectedProduct.name,
        description: selectedProduct.description,
        targetAudience: selectedProduct.targetAudience,
        valueProposition: selectedProduct.valueProposition,
        concept: selectedProduct.launchContent?.concept,
        targetPain: selectedProduct.launchContent?.targetPain,
        currentState: selectedProduct.launchContent?.currentState,
        idealFuture: selectedProduct.launchContent?.idealFuture,
      };

      const response = await fetch('/api/ai/planning-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          launchContent,
          chatHistory: chatMessages,
          newsletterCount: selectedCount,
          forceComplete: true,
        }),
      });

      const data = await response.json();

      if (data.type === 'proposal') {
        setNewsletterPlans(data.newsletters);
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `✅ 強制的に企画を作成しました！${data.newsletters.length}通のメルマガシリーズを提案します。`
        }]);
      }
    } catch (error) {
      console.error('Failed to force complete:', error);
      alert('企画の作成に失敗しました。');
    } finally {
      setIsChatLoading(false);
    }
  };

  // Generate content with AI
  const handleGenerate = async () => {
    if (!selectedProduct || newsletterPlans.length === 0) return;

    setIsGenerating(true);
    try {
      const plan = newsletterPlans[0]; // For now, use first newsletter plan

      const response = await fetch('/api/ai/newsletter-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            name: selectedProduct.name,
            description: selectedProduct.description,
            targetAudience: selectedProduct.targetAudience,
            tone: selectedProduct.tone,
          },
          plan: {
            targetSegment: selectedProduct.targetAudience || '',
            currentBelief: plan.targetBelief,
            desiredBelief: plan.mainPoint,
            mainPoint: plan.mainPoint,
            proof: plan.proof,
            cta: plan.cta,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Generation API error:', errorData);
        throw new Error(errorData.details || errorData.error || 'Generation failed');
      }

      const data = await response.json();
      setGeneratedContent(data);
      setCurrentStep(4); // Move to selection step
    } catch (error) {
      console.error('Generation error:', error);
      alert(`コンテンツの生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Assemble final content
  const assembleFinalContent = () => {
    if (!selectedContent.subject || !selectedContent.introduction ||
      !selectedContent.structure || !selectedContent.conclusion) {
      return;
    }

    const title = selectedContent.subject.content;
    const content = `${selectedContent.introduction.content}\n\n${selectedContent.structure.content}\n\n${selectedContent.conclusion.content}`;

    setFinalContent({ title, content });
    setCurrentStep(5);
  };

  // Save newsletter
  const handleSave = async () => {
    if (!user || !selectedProduct?.id) return;

    setIsSaving(true);
    try {
      const newsletterId = await createNewsletter({
        userId: user.uid,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        title: finalContent.title,
        content: finalContent.content,
        status: 'DRAFT',
      });

      router.push(`/newsletters/${newsletterId}`);
    } catch (error) {
      console.error('Save error:', error);
      alert('保存に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };

  // Navigation
  const canProceed = () => {
    switch (currentStep) {
      case 0: return selectedProduct !== null;
      case 1: return selectedCount >= 1 && selectedCount <= 5;
      case 2: return newsletterPlans.length > 0;
      case 3: return true;
      case 4: return selectedContent.subject && selectedContent.introduction &&
        selectedContent.structure && selectedContent.conclusion;
      case 5: return finalContent.title && finalContent.content;
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep === 0) {
      fetchCountSuggestion();
      setCurrentStep(1);
    } else if (currentStep === 1) {
      startPlanningChat();
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      handleGenerate();
    } else if (currentStep === 4) {
      assembleFinalContent();
    } else if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  if (loading || loadingProducts) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-violet-500" />
          AIでメルマガを作成
        </h1>
        <p className="text-muted-foreground mt-2">
          AIと対話しながら、効果的なメルマガシリーズを企画・作成します
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between overflow-x-auto pb-2">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div key={step.id} className="flex items-center flex-shrink-0">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                    isCompleted && 'bg-green-500 text-white',
                    isCurrent && 'bg-violet-500 text-white',
                    !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <span className={cn(
                  'text-xs mt-1 text-center whitespace-nowrap',
                  isCurrent ? 'text-violet-500 font-medium' : 'text-muted-foreground'
                )}>
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={cn(
                  'w-8 md:w-12 h-0.5 mx-1',
                  index < currentStep ? 'bg-green-500' : 'bg-muted'
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => {
              const Icon = STEPS[currentStep].icon;
              return <Icon className="h-5 w-5 text-violet-500" />;
            })()}
            {STEPS[currentStep].title}
          </CardTitle>
          <CardDescription>{STEPS[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 0: Product Selection */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                どのローンチコンテンツでメルマガを作成しますか？
              </p>

              {products.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    まだローンチコンテンツが作成されていません。
                  </p>
                  <Button onClick={() => router.push('/products/new/ai')}>
                    ローンチコンテンツを作成
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {products.map((product) => (
                    <Card
                      key={product.id}
                      className={cn(
                        'cursor-pointer transition-all hover:shadow-md',
                        selectedProduct?.id === product.id && 'border-violet-500 border-2 shadow-md'
                      )}
                      onClick={() => setSelectedProduct(product)}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {product.description || '説明なし'}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 1: Count Suggestion */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {isLoadingCount ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-violet-500" />
                  <p className="text-muted-foreground mt-4">AIが最適な通数を分析中...</p>
                </div>
              ) : countSuggestion ? (
                <>
                  <div className="bg-violet-50 dark:bg-violet-950 p-4 rounded-lg">
                    <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
                      💡 AIの提案
                    </p>
                    <p className="text-sm mt-1">{countSuggestion.reasoning}</p>
                  </div>

                  <div className="grid gap-3">
                    {countSuggestion.options.map((option) => (
                      <Card
                        key={option.count}
                        className={cn(
                          'cursor-pointer transition-all hover:shadow-md',
                          selectedCount === option.count && 'border-violet-500 border-2'
                        )}
                        onClick={() => setSelectedCount(option.count)}
                      >
                        <CardContent className="flex items-center gap-4 p-4">
                          <div className={cn(
                            'w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold',
                            selectedCount === option.count
                              ? 'bg-violet-500 text-white'
                              : 'bg-muted text-muted-foreground'
                          )}>
                            {option.count}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{option.name}</p>
                            <p className="text-sm text-muted-foreground">{option.description}</p>
                          </div>
                          {countSuggestion.recommended === option.count && (
                            <span className="px-2 py-1 bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 text-xs rounded-full">
                              おすすめ
                            </span>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="flex items-center gap-4">
                    <Label>カスタム通数:</Label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={selectedCount}
                      onChange={(e) => setSelectedCount(parseInt(e.target.value) || 1)}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">通</span>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* Step 2: AI Chat Planning */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground bg-violet-50 dark:bg-violet-950 p-4 rounded-lg">
                💬 AIと対話しながら、{selectedCount}通のメルマガ企画を詰めていきます。
                質問に答えていくと、企画が完成します。
              </p>

              {/* Chat Messages */}
              <div className="h-80 overflow-y-auto border rounded-lg p-4 space-y-4 bg-slate-50 dark:bg-slate-900">
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] p-3 rounded-lg',
                        msg.role === 'user'
                          ? 'bg-violet-500 text-white'
                          : 'bg-white dark:bg-slate-800 border'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-slate-800 border p-3 rounded-lg">
                      <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="回答を入力..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                  disabled={isChatLoading}
                />
                <Button onClick={sendChatMessage} disabled={isChatLoading || !chatInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {/* Force Complete Button */}
              {chatMessages.length > 0 && newsletterPlans.length === 0 && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleForceComplete}
                    disabled={isChatLoading}
                    className="text-muted-foreground hover:text-violet-500"
                  >
                    この内容で企画を決定する（チャットすればするほど精度が上がります）
                  </Button>
                </div>
              )}

              {/* Newsletter Plans Preview */}
              {newsletterPlans.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">📋 作成された企画</h4>
                  <div className="space-y-2">
                    {newsletterPlans.map((plan, index) => (
                      <div key={index} className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                        <p className="font-medium text-sm">
                          メール{plan.number}: {plan.subject}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          論点: {plan.mainPoint}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirm & Generate */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="bg-muted/50 p-6 rounded-lg space-y-4">
                <h3 className="font-semibold">企画内容の確認</h3>
                <div className="grid gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">ローンチコンテンツ:</span>
                    <span className="ml-2 font-medium">{selectedProduct?.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">メルマガ通数:</span>
                    <span className="ml-2">{selectedCount}通</span>
                  </div>
                  {newsletterPlans.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">1通目の論点:</span>
                      <span className="ml-2">{newsletterPlans[0].mainPoint}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">
                  AIが企画に基づいて、件名・導入・本文構成・結論の複数案を生成します。
                </p>
                <Button
                  size="lg"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      AIで複数案を生成
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Selection */}
          {currentStep === 4 && generatedContent && (
            <div className="space-y-8">
              <p className="text-sm text-muted-foreground bg-violet-50 dark:bg-violet-950 p-4 rounded-lg">
                💡 AIは選択肢を提示するだけです。最終的に何を選ぶかは、あなたが決めてください。
              </p>

              <SelectionSection
                title="件名を選択"
                variants={generatedContent.subjects}
                selected={selectedContent.subject}
                onSelect={(v) => setSelectedContent({ ...selectedContent, subject: v })}
              />

              <SelectionSection
                title="導入部を選択"
                variants={generatedContent.introductions}
                selected={selectedContent.introduction}
                onSelect={(v) => setSelectedContent({ ...selectedContent, introduction: v })}
              />

              <SelectionSection
                title="本文構成を選択"
                variants={generatedContent.structures}
                selected={selectedContent.structure}
                onSelect={(v) => setSelectedContent({ ...selectedContent, structure: v })}
              />

              <SelectionSection
                title="結論・CTAを選択"
                variants={generatedContent.conclusions}
                selected={selectedContent.conclusion}
                onSelect={(v) => setSelectedContent({ ...selectedContent, conclusion: v })}
              />
            </div>
          )}

          {/* Step 5: Final Edit */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="finalTitle">件名</Label>
                <Input
                  id="finalTitle"
                  value={finalContent.title}
                  onChange={(e) => setFinalContent({ ...finalContent, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="finalContent">本文</Label>
                <Textarea
                  id="finalContent"
                  value={finalContent.content}
                  onChange={(e) => setFinalContent({ ...finalContent, content: e.target.value })}
                  className="min-h-[400px] font-mono text-sm"
                />
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => router.push('/newsletters')}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      下書きとして保存
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      {currentStep < 5 && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>

          {currentStep !== 3 && (
            <Button
              onClick={handleNext}
              disabled={!canProceed() || isGenerating || isChatLoading}
            >
              {currentStep === 4 ? '内容を確定' : '次へ'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Selection Section Component
function SelectionSection({
  title,
  variants,
  selected,
  onSelect,
}: {
  title: string;
  variants: GeneratedVariant[];
  selected: GeneratedVariant | null;
  onSelect: (v: GeneratedVariant) => void;
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">{title}</h3>
      <div className="grid gap-3">
        {variants.map((variant) => (
          <Card
            key={variant.id}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md',
              selected?.id === variant.id && 'border-violet-500 border-2'
            )}
            onClick={() => onSelect(variant)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5',
                  selected?.id === variant.id
                    ? 'border-violet-500 bg-violet-500'
                    : 'border-muted-foreground'
                )}>
                  {selected?.id === variant.id && (
                    <Check className="h-4 w-4 text-white" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm whitespace-pre-wrap">{variant.content}</p>
                  <p className="text-xs text-muted-foreground">
                    💡 {variant.reasoning}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
