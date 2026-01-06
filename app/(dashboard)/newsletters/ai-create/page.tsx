// AI Newsletter Creation Wizard (LetterOS Core Feature)
// Based on: @docs/request.md - 仮説検証プロセスとしてのメルマガ運用

'use client';

import { useEffect, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  RefreshCw,
} from 'lucide-react';
import { getUserProducts, Product, createNewsletter } from '@/lib/firebase/firestore-helpers';
import { cn } from '@/lib/utils';

// Steps in the wizard
const STEPS = [
  { id: 'product', title: 'プロダクト選択', icon: Target, description: '発信主体を選択' },
  { id: 'plan', title: '企画作成', icon: Lightbulb, description: '読者の認知をどう変えるか' },
  { id: 'generate', title: 'AI生成', icon: Sparkles, description: '複数案を生成' },
  { id: 'select', title: '選択', icon: Check, description: '最適な案を選ぶ' },
  { id: 'edit', title: '最終編集', icon: FileText, description: '仕上げと確認' },
];

// Types
interface PlanData {
  targetSegment: string;
  currentBelief: string;
  desiredBelief: string;
  mainPoint: string;
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
  
  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [plan, setPlan] = useState<PlanData>({
    targetSegment: '',
    currentBelief: '',
    desiredBelief: '',
    mainPoint: '',
    proof: '',
    cta: '',
  });
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
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Auth check
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load products
  useEffect(() => {
    if (user) {
      getUserProducts(user.uid)
        .then(setProducts)
        .catch(console.error)
        .finally(() => setLoadingProducts(false));
    }
  }, [user]);

  // Generate content with AI
  const handleGenerate = async () => {
    if (!selectedProduct) return;
    
    setIsGenerating(true);
    try {
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
          plan,
        }),
      });

      if (!response.ok) throw new Error('Generation failed');
      
      const data = await response.json();
      setGeneratedContent(data);
      setCurrentStep(3); // Move to selection step
    } catch (error) {
      console.error('Generation error:', error);
      alert('コンテンツの生成に失敗しました。もう一度お試しください。');
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
    setCurrentStep(4);
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
        hypothesis: {
          plan,
          selectedVariants: {
            subject: selectedContent.subject?.id,
            introduction: selectedContent.introduction?.id,
            structure: selectedContent.structure?.id,
            conclusion: selectedContent.conclusion?.id,
          },
        },
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
      case 1: return plan.targetSegment && plan.mainPoint && plan.desiredBelief;
      case 2: return true;
      case 3: return selectedContent.subject && selectedContent.introduction && 
                     selectedContent.structure && selectedContent.conclusion;
      case 4: return finalContent.title && finalContent.content;
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep === 2) {
      handleGenerate();
    } else if (currentStep === 3) {
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
          マーケティング思想に基づいたAIアシスタントが、効果的なニュースレターの作成をサポートします
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          
          return (
            <div key={step.id} className="flex items-center">
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
                  'text-xs mt-1 text-center',
                  isCurrent ? 'text-violet-500 font-medium' : 'text-muted-foreground'
                )}>
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={cn(
                  'w-16 h-0.5 mx-2',
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
                プロダクトとは「口調・思想・読者・目的が一貫した発信主体」の単位です。
                メルマガを配信する際の"顔"を選択してください。
              </p>
              
              {products.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    まだプロダクトが作成されていません。
                  </p>
                  <Button onClick={() => router.push('/products/new')}>
                    プロダクトを作成
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
                        {product.targetAudience && (
                          <p className="text-xs text-muted-foreground mt-2">
                            ターゲット: {product.targetAudience}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 1: Plan Creation */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground bg-violet-50 dark:bg-violet-950 p-4 rounded-lg">
                💡 企画とは「今回のメルマガで、読者のどの認知を、どちら側に倒すか」を決める行為です。
                1通で複数のことを教えようとしないでください。
              </p>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetSegment">読者セグメント</Label>
                  <Input
                    id="targetSegment"
                    placeholder="例: 週3回以上メルマガを読んでいるマーケター"
                    value={plan.targetSegment}
                    onChange={(e) => setPlan({ ...plan, targetSegment: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currentBelief">読者の現在の認識（誤解・迷い）</Label>
                  <Textarea
                    id="currentBelief"
                    placeholder="例: メルマガは長文の方が読者に価値を提供できると思っている"
                    value={plan.currentBelief}
                    onChange={(e) => setPlan({ ...plan, currentBelief: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desiredBelief">読後に持ってほしい認識</Label>
                  <Textarea
                    id="desiredBelief"
                    placeholder="例: 短くても1つの判断を変えられれば十分な価値がある"
                    value={plan.desiredBelief}
                    onChange={(e) => setPlan({ ...plan, desiredBelief: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mainPoint">今回の論点（1つだけ）</Label>
                  <Input
                    id="mainPoint"
                    placeholder="例: メルマガの価値は長さではなく、認知の変化量で決まる"
                    value={plan.mainPoint}
                    onChange={(e) => setPlan({ ...plan, mainPoint: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proof">根拠・証拠（Proof）</Label>
                  <Textarea
                    id="proof"
                    placeholder="例: 実際に100文字のメルマガで開封率40%を達成した事例"
                    value={plan.proof}
                    onChange={(e) => setPlan({ ...plan, proof: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    賢い読者は意見ではなく判断材料を求めます。必ず1つ以上の根拠を入れてください。
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cta">読後に取らせたい行動（CTA）</Label>
                  <Input
                    id="cta"
                    placeholder="例: 次のメルマガを300文字以内で書いてみる"
                    value={plan.cta}
                    onChange={(e) => setPlan({ ...plan, cta: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Confirm & Generate */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="bg-muted/50 p-6 rounded-lg space-y-4">
                <h3 className="font-semibold">企画内容の確認</h3>
                <div className="grid gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">プロダクト:</span>
                    <span className="ml-2 font-medium">{selectedProduct?.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">読者セグメント:</span>
                    <span className="ml-2">{plan.targetSegment}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">論点:</span>
                    <span className="ml-2">{plan.mainPoint}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">認知の変化:</span>
                    <span className="ml-2">{plan.currentBelief} → {plan.desiredBelief}</span>
                  </div>
                </div>
              </div>

              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">
                  AIが上記の企画に基づいて、件名・導入・本文構成・結論の複数案を生成します。
                </p>
                <Button 
                  size="lg" 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600"
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

          {/* Step 3: Selection */}
          {currentStep === 3 && generatedContent && (
            <div className="space-y-8">
              <p className="text-sm text-muted-foreground bg-violet-50 dark:bg-violet-950 p-4 rounded-lg">
                💡 AIは選択肢を提示するだけです。最終的に何を選ぶかは、あなたが決めてください。
              </p>

              {/* Subject Selection */}
              <SelectionSection
                title="件名を選択"
                variants={generatedContent.subjects}
                selected={selectedContent.subject}
                onSelect={(v) => setSelectedContent({ ...selectedContent, subject: v })}
              />

              {/* Introduction Selection */}
              <SelectionSection
                title="導入部を選択"
                variants={generatedContent.introductions}
                selected={selectedContent.introduction}
                onSelect={(v) => setSelectedContent({ ...selectedContent, introduction: v })}
              />

              {/* Structure Selection */}
              <SelectionSection
                title="本文構成を選択"
                variants={generatedContent.structures}
                selected={selectedContent.structure}
                onSelect={(v) => setSelectedContent({ ...selectedContent, structure: v })}
              />

              {/* Conclusion Selection */}
              <SelectionSection
                title="結論・CTAを選択"
                variants={generatedContent.conclusions}
                selected={selectedContent.conclusion}
                onSelect={(v) => setSelectedContent({ ...selectedContent, conclusion: v })}
              />
            </div>
          )}

          {/* Step 4: Final Edit */}
          {currentStep === 4 && (
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
                  className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600"
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
      {currentStep < 4 && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
          
          {currentStep !== 2 && (
            <Button
              onClick={handleNext}
              disabled={!canProceed() || isGenerating}
            >
              {currentStep === 3 ? '内容を確定' : '次へ'}
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

