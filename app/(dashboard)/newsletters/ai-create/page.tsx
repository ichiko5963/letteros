// AI Newsletter Creation Wizard (LetterOS Core Feature)
// Based on: @docs/newsletter-rules.md, @docs/newsletter-sequence-patterns.md

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
  FileText,
  Send,
  Loader2,
  MessageSquare,
  Hash,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  Wand2,
} from 'lucide-react';
import { getUserProducts, Product, createNewsletter } from '@/lib/firebase/firestore-helpers';
import { cn } from '@/lib/utils';

// Steps in the wizard - simplified flow
const STEPS = [
  { id: 'product', title: 'ローンチコンテンツ', icon: Target, description: '発信主体を選択' },
  { id: 'count', title: '通数提案', icon: Hash, description: 'AIが最適な通数を提案' },
  { id: 'plan', title: 'AI壁打ち', icon: MessageSquare, description: '経験談を深掘り' },
  { id: 'confirm', title: '企画確認', icon: Check, description: '壁打ち内容を確認' },
  { id: 'generate', title: 'AI生成', icon: Sparkles, description: 'メルマガを一括生成' },
  { id: 'edit', title: '最終編集', icon: FileText, description: '仕上げと保存' },
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
  experienceToUse: string;
  proof: string;
  cta: string;
}

interface GeneratedNewsletter {
  number: number;
  subject: string;
  body: string;
  wordCount: number;
  qualityCheck: {
    hasSceneDescription?: boolean;
    experienceWordCount?: number;
    numberCount?: number;
    hasQuestions?: boolean;
    hasCta?: boolean;
    hasPs?: boolean;
  };
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
  const [collectedExperiences, setCollectedExperiences] = useState<string>('');

  // Generation state - NEW: stores all generated newsletters
  const [generatedNewsletters, setGeneratedNewsletters] = useState<GeneratedNewsletter[]>([]);
  const [editableNewsletters, setEditableNewsletters] = useState<GeneratedNewsletter[]>([]);
  const [expandedNewsletter, setExpandedNewsletter] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  // Plan editing state
  const [editingPlan, setEditingPlan] = useState<{ index: number; field: string } | null>(null);
  const [planEditInput, setPlanEditInput] = useState('');
  const [isLoadingAlternatives, setIsLoadingAlternatives] = useState(false);
  const [alternatives, setAlternatives] = useState<{ value: string; reason: string }[]>([]);
  const [isModifyingPlan, setIsModifyingPlan] = useState(false);

  // AI Assist state for final edit
  const [showSubjectAssist, setShowSubjectAssist] = useState(false);
  const [showBodyAssist, setShowBodyAssist] = useState(false);
  const [subjectAlternatives, setSubjectAlternatives] = useState<{ value: string; reason: string }[]>([]);
  const [isLoadingSubjectAlternatives, setIsLoadingSubjectAlternatives] = useState(false);
  const [bodyAssistInput, setBodyAssistInput] = useState('');
  const [isModifyingBody, setIsModifyingBody] = useState(false);

  // Context-based generation state
  const [showContextSelector, setShowContextSelector] = useState(false);
  const [availableContexts, setAvailableContexts] = useState<{ id: string; title: string; content: string }[]>([]);
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);
  const [contextRecommendations, setContextRecommendations] = useState<{
    id: string;
    relevanceScore: number;
    reason: string;
    suggestedUse: string;
  }[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

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

  // Load available contexts
  useEffect(() => {
    if (user) {
      try {
        const savedContexts = localStorage.getItem(`letteros_contexts_${user.uid}`);
        if (savedContexts) {
          const parsed = JSON.parse(savedContexts);
          setAvailableContexts(parsed.map((c: any) => ({
            id: c.id,
            title: c.title,
            content: c.content,
          })));
        }
      } catch (error) {
        console.error('Failed to load contexts:', error);
      }
    }
  }, [user]);

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
        // Store collected info so far if available
        if (data.collectedSoFar) {
          setCollectedExperiences(data.collectedSoFar);
        }
      } else if (data.type === 'proposal') {
        setNewsletterPlans(data.newsletters);
        // Store the complete collected experiences
        setCollectedExperiences(data.collectedExperiences || '');
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `🎉 経験談の収集が完了しました！${data.newsletters.length}通のメルマガシリーズを企画しました。「次へ」をクリックして確認しましょう。`
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
        // Store the complete collected experiences
        setCollectedExperiences(data.collectedExperiences || '');
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `✅ 企画を作成しました！${data.newsletters.length}通のメルマガシリーズを提案します。「次へ」をクリックして確認しましょう。`
        }]);
      }
    } catch (error) {
      console.error('Failed to force complete:', error);
      alert('企画の作成に失敗しました。');
    } finally {
      setIsChatLoading(false);
    }
  };

  // Generate all newsletters with AI (full content)
  const handleGenerate = async () => {
    if (!selectedProduct || newsletterPlans.length === 0) return;

    setIsGenerating(true);
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

      // Build collected experiences from chat history if not already set
      const experiences = collectedExperiences || chatMessages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join('\n\n');

      const response = await fetch('/api/ai/newsletter-full-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          launchContent,
          newsletterCount: selectedCount,
          newsletterPlans,
          collectedExperiences: experiences,
          chatHistory: chatMessages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Generation API error:', errorData);
        throw new Error(errorData.details || errorData.error || 'Generation failed');
      }

      const data = await response.json();

      if (data.success && data.newsletters) {
        setGeneratedNewsletters(data.newsletters);
        setEditableNewsletters(data.newsletters);
        setExpandedNewsletter(1);
        setCurrentStep(5); // Move to edit step
      } else {
        throw new Error('No newsletters generated');
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert(`メルマガの生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Update editable newsletter content
  const updateNewsletterContent = (index: number, field: 'subject' | 'body', value: string) => {
    setEditableNewsletters(prev => prev.map((nl, i) =>
      i === index ? { ...nl, [field]: value, wordCount: field === 'body' ? value.length : nl.wordCount } : nl
    ));
  };

  // Update newsletter plan field
  const updatePlanField = (index: number, field: keyof NewsletterPlan, value: string) => {
    setNewsletterPlans(prev => prev.map((plan, i) =>
      i === index ? { ...plan, [field]: value } : plan
    ));
  };

  // Start editing a plan field
  const startEditingPlan = (index: number, field: string) => {
    setEditingPlan({ index, field });
    setPlanEditInput('');
    setAlternatives([]);
  };

  // Cancel editing
  const cancelEditingPlan = () => {
    setEditingPlan(null);
    setPlanEditInput('');
    setAlternatives([]);
  };

  // Generate alternatives for a field
  const generateAlternatives = async (index: number, field: string) => {
    if (!selectedProduct) return;

    setIsLoadingAlternatives(true);
    setAlternatives([]);

    try {
      const response = await fetch('/api/ai/modify-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'alternatives',
          plan: newsletterPlans[index],
          field,
          instruction: '',
          launchContent: {
            name: selectedProduct.name,
            description: selectedProduct.description,
            targetAudience: selectedProduct.targetAudience,
          },
          collectedExperiences: collectedExperiences || chatMessages.filter(m => m.role === 'user').map(m => m.content).join('\n\n'),
        }),
      });

      const data = await response.json();
      if (data.success && data.alternatives) {
        setAlternatives(data.alternatives);
      }
    } catch (error) {
      console.error('Failed to generate alternatives:', error);
    } finally {
      setIsLoadingAlternatives(false);
    }
  };

  // Modify plan with AI based on instruction
  const modifyPlanWithAI = async (index: number, field: string, instruction: string) => {
    if (!selectedProduct || !instruction.trim()) return;

    setIsModifyingPlan(true);

    try {
      const response = await fetch('/api/ai/modify-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'modify',
          plan: newsletterPlans[index],
          field,
          instruction,
          launchContent: {
            name: selectedProduct.name,
            description: selectedProduct.description,
            targetAudience: selectedProduct.targetAudience,
          },
          collectedExperiences: collectedExperiences || chatMessages.filter(m => m.role === 'user').map(m => m.content).join('\n\n'),
        }),
      });

      const data = await response.json();
      if (data.success && data.modifiedValue) {
        updatePlanField(index, field as keyof NewsletterPlan, data.modifiedValue);
        cancelEditingPlan();
      }
    } catch (error) {
      console.error('Failed to modify plan:', error);
    } finally {
      setIsModifyingPlan(false);
    }
  };

  // Apply an alternative
  const applyAlternative = (index: number, field: string, value: string) => {
    updatePlanField(index, field as keyof NewsletterPlan, value);
    cancelEditingPlan();
  };

  // Generate subject alternatives for final edit
  const generateSubjectAlternatives = async (index: number) => {
    const newsletter = editableNewsletters[index];
    if (!newsletter) return;

    setIsLoadingSubjectAlternatives(true);
    setSubjectAlternatives([]);

    try {
      const response = await fetch('/api/ai/assist-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'subject_alternatives',
          currentSubject: newsletter.subject,
          currentBody: newsletter.body,
          launchContent: {
            name: selectedProduct?.name,
            targetAudience: selectedProduct?.targetAudience,
          },
        }),
      });

      const data = await response.json();
      if (data.success && data.alternatives) {
        setSubjectAlternatives(data.alternatives);
      }
    } catch (error) {
      console.error('Failed to generate subject alternatives:', error);
    } finally {
      setIsLoadingSubjectAlternatives(false);
    }
  };

  // Apply subject alternative
  const applySubjectAlternative = (index: number, value: string) => {
    updateNewsletterContent(index, 'subject', value);
    setShowSubjectAssist(false);
    setSubjectAlternatives([]);
  };

  // Modify body with AI
  const modifyBodyWithAI = async (index: number, instruction: string) => {
    const newsletter = editableNewsletters[index];
    if (!newsletter || !instruction.trim()) return;

    setIsModifyingBody(true);

    try {
      const response = await fetch('/api/ai/assist-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'body_modify',
          currentBody: newsletter.body,
          instruction,
          selectedText: newsletter.body.slice(0, 500), // Modify first part for now
        }),
      });

      const data = await response.json();
      if (data.success && data.modifiedText) {
        // Replace the modified portion
        const newBody = data.modifiedText + newsletter.body.slice(500);
        updateNewsletterContent(index, 'body', newBody);
        setBodyAssistInput('');
        setShowBodyAssist(false);
      }
    } catch (error) {
      console.error('Failed to modify body:', error);
    } finally {
      setIsModifyingBody(false);
    }
  };

  // Fetch AI recommendations for contexts
  const fetchContextRecommendations = async () => {
    if (!selectedProduct || availableContexts.length === 0) return;

    setIsLoadingRecommendations(true);
    setContextRecommendations([]);

    try {
      const launchContent = {
        name: selectedProduct.name,
        description: selectedProduct.description,
        targetAudience: selectedProduct.targetAudience,
        valueProposition: selectedProduct.valueProposition,
        concept: selectedProduct.launchContent?.concept,
        targetPain: selectedProduct.launchContent?.targetPain,
      };

      const response = await fetch('/api/ai/recommend-contexts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          launchContent,
          contexts: availableContexts,
          newsletterCount: selectedCount,
        }),
      });

      const data = await response.json();
      if (data.success && data.recommendations) {
        setContextRecommendations(data.recommendations);
        // Auto-select top recommended contexts (up to newsletterCount)
        const topRecommended = data.recommendations
          .filter((r: { relevanceScore: number }) => r.relevanceScore >= 60)
          .slice(0, Math.min(selectedCount, 3))
          .map((r: { id: string }) => r.id);
        setSelectedContextIds(topRecommended);
      }
    } catch (error) {
      console.error('Failed to fetch context recommendations:', error);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  // Toggle context selection
  const toggleContextSelection = (contextId: string) => {
    setSelectedContextIds(prev =>
      prev.includes(contextId)
        ? prev.filter(id => id !== contextId)
        : [...prev, contextId]
    );
  };

  // Generate from selected contexts
  const handleGenerateFromContexts = async () => {
    if (selectedContextIds.length === 0 || !selectedProduct) return;

    // Combine selected contexts as collected experiences
    const selectedContextsContent = availableContexts
      .filter(c => selectedContextIds.includes(c.id))
      .map(c => `【${c.title}】\n${c.content}`)
      .join('\n\n---\n\n');

    setCollectedExperiences(selectedContextsContent);
    setShowContextSelector(false);

    // Force complete with the context data
    setIsChatLoading(true);
    setChatMessages([{
      role: 'assistant',
      content: `コンテキストから${selectedContextIds.length}件のエピソードを読み込みました。これを元に企画を作成します...`
    }]);

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
          chatHistory: [{ role: 'user', content: selectedContextsContent }],
          newsletterCount: selectedCount,
          forceComplete: true,
        }),
      });

      const data = await response.json();

      if (data.type === 'proposal') {
        setNewsletterPlans(data.newsletters);
        setCollectedExperiences(data.collectedExperiences || selectedContextsContent);
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `🎉 ${data.newsletters.length}通のメルマガ企画を作成しました！「次へ」をクリックして確認しましょう。`
        }]);
      }
    } catch (error) {
      console.error('Failed to generate from contexts:', error);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'エラーが発生しました。もう一度お試しください。'
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Save a single newsletter
  const handleSaveNewsletter = async (index: number) => {
    if (!user || !selectedProduct?.id) return;

    const newsletter = editableNewsletters[index];
    if (!newsletter) return;

    setSavingIndex(index);
    setIsSaving(true);
    try {
      const newsletterId = await createNewsletter({
        userId: user.uid,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        title: newsletter.subject,
        content: newsletter.body,
        status: 'DRAFT',
        sequenceNumber: newsletter.number,
        totalInSequence: selectedCount,
      });

      alert(`${newsletter.number}通目を保存しました`);
    } catch (error) {
      console.error('Save error:', error);
      alert('保存に失敗しました。');
    } finally {
      setIsSaving(false);
      setSavingIndex(null);
    }
  };

  // Save all newsletters
  const handleSaveAll = async () => {
    if (!user || !selectedProduct?.id) return;

    setIsSaving(true);
    try {
      for (let i = 0; i < editableNewsletters.length; i++) {
        setSavingIndex(i);
        const newsletter = editableNewsletters[i];
        await createNewsletter({
          userId: user.uid,
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          title: newsletter.subject,
          content: newsletter.body,
          status: 'DRAFT',
          sequenceNumber: newsletter.number,
          totalInSequence: selectedCount,
        });
      }

      alert(`${editableNewsletters.length}通全て保存しました！`);
      router.push('/newsletters');
    } catch (error) {
      console.error('Save error:', error);
      alert('保存に失敗しました。');
    } finally {
      setIsSaving(false);
      setSavingIndex(null);
    }
  };

  // Navigation
  const canProceed = () => {
    switch (currentStep) {
      case 0: return selectedProduct !== null;
      case 1: return selectedCount >= 1 && selectedCount <= 5;
      case 2: return newsletterPlans.length > 0;
      case 3: return newsletterPlans.length > 0; // Confirm step
      case 4: return true; // Generate step (handled by button)
      case 5: return editableNewsletters.length > 0;
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
      // Go to confirm step
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // Go to generate step
      setCurrentStep(4);
    } else if (currentStep === 4) {
      // Generate is handled by button
      handleGenerate();
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
                <div className="grid gap-3">
                  {products.map((product) => (
                    <Card
                      key={product.id}
                      className={cn(
                        'cursor-pointer transition-all hover:shadow-md hover:border-violet-300',
                        selectedProduct?.id === product.id && 'border-violet-500 border-2 shadow-sm bg-violet-50/10'
                      )}
                      onClick={() => setSelectedProduct(product)}
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-medium">{product.name}</CardTitle>
                          {selectedProduct?.id === product.id && (
                            <Check className="h-4 w-4 text-violet-500" />
                          )}
                        </div>
                      </CardHeader>
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
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-muted-foreground bg-violet-50 dark:bg-violet-950 p-4 rounded-lg flex-1">
                  💬 AIと対話しながら、{selectedCount}通のメルマガ企画を詰めていきます。
                  質問に答えていくと、企画が完成します。
                </p>
                {availableContexts.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      if (!showContextSelector) {
                        setShowContextSelector(true);
                        fetchContextRecommendations();
                      } else {
                        setShowContextSelector(false);
                      }
                    }}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    コンテキストから生成
                  </Button>
                )}
              </div>

              {/* Context Selector with AI Recommendations */}
              {showContextSelector && (
                <div className="p-4 border-2 border-violet-200 rounded-lg bg-violet-50/50 dark:bg-violet-950/50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-violet-500" />
                      AIおすすめ順でコンテキストを選択
                    </h4>
                    <Button variant="ghost" size="sm" onClick={() => setShowContextSelector(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    「{selectedProduct?.name}」に最適なエピソードをAIが選定しました。
                    {availableContexts.length > 10 && `（${availableContexts.length}件中トップ10を表示）`}
                  </p>

                  {isLoadingRecommendations ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-violet-500 mb-2" />
                      <span className="text-sm text-muted-foreground">AIがコンテキストを分析中...</span>
                      <span className="text-xs text-muted-foreground mt-1">
                        {availableContexts.length > 10 ? 'タイトルから候補を選定 → 内容を読んでスコア付け' : '内容を読んでスコア付け中'}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto mb-3">
                      {/* Only show contexts that have recommendations (max 10) */}
                      {contextRecommendations.length > 0 ? (
                        contextRecommendations.map((recommendation, index) => {
                          const context = availableContexts.find(c => c.id === recommendation.id);
                          if (!context) return null;

                          const score = recommendation.relevanceScore;
                          const isHighlyRecommended = score >= 80;

                          return (
                            <div
                              key={context.id}
                              className={cn(
                                'p-3 rounded-lg cursor-pointer transition-colors border',
                                selectedContextIds.includes(context.id)
                                  ? 'bg-violet-100 dark:bg-violet-900 border-violet-400'
                                  : isHighlyRecommended
                                    ? 'bg-amber-50 dark:bg-amber-950 border-amber-200 hover:border-amber-300'
                                    : 'bg-white dark:bg-slate-800 border-gray-100 hover:border-violet-200'
                              )}
                              onClick={() => toggleContextSelection(context.id)}
                            >
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  'w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5',
                                  selectedContextIds.includes(context.id)
                                    ? 'bg-violet-500 border-violet-500 text-white'
                                    : 'border-gray-300'
                                )}>
                                  {selectedContextIds.includes(context.id) && <Check className="h-3 w-3" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-muted-foreground font-medium">#{index + 1}</span>
                                    <span className="text-sm font-medium truncate">{context.title}</span>
                                    {isHighlyRecommended && (
                                      <span className="shrink-0 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-xs rounded-full font-medium">
                                        おすすめ
                                      </span>
                                    )}
                                    <span className={cn(
                                      'shrink-0 text-xs font-bold ml-auto',
                                      score >= 80 ? 'text-amber-600' : score >= 60 ? 'text-green-600' : 'text-muted-foreground'
                                    )}>
                                      {score}点
                                    </span>
                                  </div>
                                  <p className="text-xs text-violet-600 dark:text-violet-400 mb-1">
                                    {recommendation.reason}
                                  </p>
                                  {recommendation.suggestedUse && (
                                    <p className="text-xs text-muted-foreground">
                                      💡 {recommendation.suggestedUse}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          おすすめのコンテキストが見つかりませんでした
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      {selectedContextIds.length}件選択中
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowContextSelector(false)}>
                        キャンセル
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleGenerateFromContexts}
                        disabled={selectedContextIds.length === 0 || isChatLoading || isLoadingRecommendations}
                        className="bg-violet-500 hover:bg-violet-600 text-white"
                      >
                        {isChatLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-1" />
                            {selectedContextIds.length}件で企画を生成
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

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

          {/* Step 3: Confirm - Show all collected info from chat with AI editing */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="bg-violet-50 dark:bg-violet-950 p-4 rounded-lg">
                <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
                  📋 企画を確認・修正してください
                </p>
                <p className="text-xs mt-1 text-muted-foreground">
                  各項目の横にある<Wand2 className="inline h-3 w-3 mx-1" />をクリックすると、AIで別案を生成できます
                </p>
              </div>

              {/* Basic Info */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <h3 className="font-semibold text-sm">基本情報</h3>
                <div className="grid gap-2 text-sm">
                  <div className="flex">
                    <span className="text-muted-foreground w-32">ローンチコンテンツ:</span>
                    <span className="font-medium">{selectedProduct?.name}</span>
                  </div>
                  <div className="flex">
                    <span className="text-muted-foreground w-32">メルマガ通数:</span>
                    <span>{selectedCount}通</span>
                  </div>
                </div>
              </div>

              {/* Collected Experiences */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <h3 className="font-semibold text-sm">収集した経験談・情報</h3>
                <div className="max-h-40 overflow-y-auto">
                  {collectedExperiences ? (
                    <p className="text-sm whitespace-pre-wrap">{collectedExperiences}</p>
                  ) : (
                    <div className="space-y-2">
                      {chatMessages.filter(m => m.role === 'user').map((msg, i) => (
                        <div key={i} className="p-2 bg-white dark:bg-slate-800 rounded text-sm">
                          {msg.content}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Newsletter Plans - Editable */}
              {newsletterPlans.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">メルマガ企画（{newsletterPlans.length}通）- クリックして編集</h3>
                  {newsletterPlans.map((plan, index) => (
                    <Card key={index} className="border-2 hover:border-violet-300 transition-colors">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-violet-500 text-white flex items-center justify-center font-bold">
                            {plan.number}
                          </div>
                          <div className="flex-1">
                            <span className="text-xs text-muted-foreground">{plan.number}通目</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Subject */}
                        <div className="group">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">件名</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                startEditingPlan(index, 'subject');
                                generateAlternatives(index, 'subject');
                              }}
                            >
                              <Wand2 className="h-3 w-3 mr-1" />
                              別案
                            </Button>
                          </div>
                          {editingPlan?.index === index && editingPlan?.field === 'subject' ? (
                            <div className="mt-2 space-y-2">
                              <Input
                                value={plan.subject}
                                onChange={(e) => updatePlanField(index, 'subject', e.target.value)}
                                className="text-sm"
                              />
                              <div className="flex gap-2">
                                <Input
                                  placeholder="AIへの指示（例: もっと緊急性を出して）"
                                  value={planEditInput}
                                  onChange={(e) => setPlanEditInput(e.target.value)}
                                  className="flex-1 text-sm"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => modifyPlanWithAI(index, 'subject', planEditInput)}
                                  disabled={isModifyingPlan || !planEditInput.trim()}
                                >
                                  {isModifyingPlan ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={cancelEditingPlan}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                              {isLoadingAlternatives && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  別案を生成中...
                                </div>
                              )}
                              {alternatives.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">別案を選択:</p>
                                  {alternatives.map((alt, altIndex) => (
                                    <div
                                      key={altIndex}
                                      className="p-2 bg-violet-50 dark:bg-violet-950 rounded cursor-pointer hover:bg-violet-100 dark:hover:bg-violet-900 transition-colors"
                                      onClick={() => applyAlternative(index, 'subject', alt.value)}
                                    >
                                      <p className="text-sm font-medium">{alt.value}</p>
                                      <p className="text-xs text-muted-foreground">{alt.reason}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm font-medium cursor-pointer hover:text-violet-600" onClick={() => startEditingPlan(index, 'subject')}>
                              {plan.subject}
                            </p>
                          )}
                        </div>

                        {/* Main Point */}
                        <div className="group">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">論点</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                startEditingPlan(index, 'mainPoint');
                                generateAlternatives(index, 'mainPoint');
                              }}
                            >
                              <Wand2 className="h-3 w-3 mr-1" />
                              別案
                            </Button>
                          </div>
                          {editingPlan?.index === index && editingPlan?.field === 'mainPoint' ? (
                            <div className="mt-2 space-y-2">
                              <Textarea
                                value={plan.mainPoint}
                                onChange={(e) => updatePlanField(index, 'mainPoint', e.target.value)}
                                className="text-sm min-h-[60px]"
                              />
                              <div className="flex gap-2">
                                <Input
                                  placeholder="AIへの指示（例: もっと具体的に）"
                                  value={planEditInput}
                                  onChange={(e) => setPlanEditInput(e.target.value)}
                                  className="flex-1 text-sm"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => modifyPlanWithAI(index, 'mainPoint', planEditInput)}
                                  disabled={isModifyingPlan || !planEditInput.trim()}
                                >
                                  {isModifyingPlan ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={cancelEditingPlan}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                              {isLoadingAlternatives && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  別案を生成中...
                                </div>
                              )}
                              {alternatives.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">別案を選択:</p>
                                  {alternatives.map((alt, altIndex) => (
                                    <div
                                      key={altIndex}
                                      className="p-2 bg-violet-50 dark:bg-violet-950 rounded cursor-pointer hover:bg-violet-100 dark:hover:bg-violet-900 transition-colors"
                                      onClick={() => applyAlternative(index, 'mainPoint', alt.value)}
                                    >
                                      <p className="text-sm">{alt.value}</p>
                                      <p className="text-xs text-muted-foreground">{alt.reason}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm cursor-pointer hover:text-violet-600" onClick={() => startEditingPlan(index, 'mainPoint')}>
                              {plan.mainPoint}
                            </p>
                          )}
                        </div>

                        {/* Experience to Use */}
                        <div className="group">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">使用する経験</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                startEditingPlan(index, 'experienceToUse');
                                generateAlternatives(index, 'experienceToUse');
                              }}
                            >
                              <Wand2 className="h-3 w-3 mr-1" />
                              別案
                            </Button>
                          </div>
                          {editingPlan?.index === index && editingPlan?.field === 'experienceToUse' ? (
                            <div className="mt-2 space-y-2">
                              <Textarea
                                value={plan.experienceToUse}
                                onChange={(e) => updatePlanField(index, 'experienceToUse', e.target.value)}
                                className="text-sm min-h-[100px]"
                              />
                              <div className="flex gap-2">
                                <Input
                                  placeholder="AIへの指示（例: 家族との場面を追加）"
                                  value={planEditInput}
                                  onChange={(e) => setPlanEditInput(e.target.value)}
                                  className="flex-1 text-sm"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => modifyPlanWithAI(index, 'experienceToUse', planEditInput)}
                                  disabled={isModifyingPlan || !planEditInput.trim()}
                                >
                                  {isModifyingPlan ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={cancelEditingPlan}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                              {isLoadingAlternatives && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  別案を生成中...
                                </div>
                              )}
                              {alternatives.length > 0 && (
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                  <p className="text-xs text-muted-foreground">別案を選択:</p>
                                  {alternatives.map((alt, altIndex) => (
                                    <div
                                      key={altIndex}
                                      className="p-2 bg-violet-50 dark:bg-violet-950 rounded cursor-pointer hover:bg-violet-100 dark:hover:bg-violet-900 transition-colors"
                                      onClick={() => applyAlternative(index, 'experienceToUse', alt.value)}
                                    >
                                      <p className="text-sm">{alt.value.slice(0, 100)}...</p>
                                      <p className="text-xs text-muted-foreground">{alt.reason}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm cursor-pointer hover:text-violet-600" onClick={() => startEditingPlan(index, 'experienceToUse')}>
                              {plan.experienceToUse ? (plan.experienceToUse.length > 150 ? plan.experienceToUse.slice(0, 150) + '...' : plan.experienceToUse) : '（未設定）'}
                            </p>
                          )}
                        </div>

                        {/* CTA */}
                        <div className="group">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">CTA（行動喚起）</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                startEditingPlan(index, 'cta');
                                generateAlternatives(index, 'cta');
                              }}
                            >
                              <Wand2 className="h-3 w-3 mr-1" />
                              別案
                            </Button>
                          </div>
                          {editingPlan?.index === index && editingPlan?.field === 'cta' ? (
                            <div className="mt-2 space-y-2">
                              <Input
                                value={plan.cta}
                                onChange={(e) => updatePlanField(index, 'cta', e.target.value)}
                                className="text-sm"
                              />
                              <div className="flex gap-2">
                                <Input
                                  placeholder="AIへの指示（例: 無料相談を促す）"
                                  value={planEditInput}
                                  onChange={(e) => setPlanEditInput(e.target.value)}
                                  className="flex-1 text-sm"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => modifyPlanWithAI(index, 'cta', planEditInput)}
                                  disabled={isModifyingPlan || !planEditInput.trim()}
                                >
                                  {isModifyingPlan ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={cancelEditingPlan}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                              {isLoadingAlternatives && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  別案を生成中...
                                </div>
                              )}
                              {alternatives.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">別案を選択:</p>
                                  {alternatives.map((alt, altIndex) => (
                                    <div
                                      key={altIndex}
                                      className="p-2 bg-violet-50 dark:bg-violet-950 rounded cursor-pointer hover:bg-violet-100 dark:hover:bg-violet-900 transition-colors"
                                      onClick={() => applyAlternative(index, 'cta', alt.value)}
                                    >
                                      <p className="text-sm">{alt.value}</p>
                                      <p className="text-xs text-muted-foreground">{alt.reason}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm cursor-pointer hover:text-violet-600" onClick={() => startEditingPlan(index, 'cta')}>
                              {plan.cta}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <p className="text-center text-sm text-muted-foreground">
                企画を確認したら「次へ」をクリックして、{selectedCount}通分のメルマガを一括生成します
              </p>
            </div>
          )}

          {/* Step 4: Generate - Trigger generation */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center py-8">
                {isGenerating ? (
                  <>
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-violet-500" />
                    <p className="text-lg font-medium mt-4">メルマガを生成中...</p>
                    <p className="text-muted-foreground mt-2">
                      {selectedCount}通分のメルマガを作成しています。しばらくお待ちください。
                    </p>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-12 w-12 mx-auto text-violet-500" />
                    <p className="text-lg font-medium mt-4">準備完了</p>
                    <p className="text-muted-foreground mt-2 mb-6">
                      収集した経験談を元に、{selectedCount}通のメルマガを一括生成します
                    </p>
                    <Button
                      size="lg"
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                    >
                      <Sparkles className="mr-2 h-5 w-5" />
                      {selectedCount}通のメルマガを一括生成
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Final Edit - Edit newsletters with arrow navigation */}
          {currentStep === 5 && editableNewsletters.length > 0 && (
            <div className="space-y-6">
              {/* Header with navigation */}
              <div className="flex items-center justify-between">
                <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg flex-1">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">
                    🎉 {editableNewsletters.length}通のメルマガが生成されました！
                  </p>
                </div>

                {/* Navigation Arrows */}
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setExpandedNewsletter(Math.max(1, expandedNewsletter - 1))}
                    disabled={expandedNewsletter <= 1}
                    className="h-9 w-9"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <span className="text-sm font-medium px-3 py-1 bg-violet-100 dark:bg-violet-900 rounded-full min-w-[80px] text-center">
                    {expandedNewsletter}通目 / {editableNewsletters.length}通
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setExpandedNewsletter(Math.min(editableNewsletters.length, expandedNewsletter + 1))}
                    disabled={expandedNewsletter >= editableNewsletters.length}
                    className="h-9 w-9"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Current Newsletter Editor */}
              {(() => {
                const currentIndex = expandedNewsletter - 1;
                const newsletter = editableNewsletters[currentIndex];
                if (!newsletter) return null;

                return (
                  <Card className="border-2 border-violet-200">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-violet-500 text-white flex items-center justify-center font-bold text-lg">
                            {newsletter.number}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{newsletter.number}通目</CardTitle>
                            <CardDescription>
                              {newsletter.wordCount.toLocaleString()}文字
                              {newsletter.qualityCheck?.experienceWordCount && (
                                <span className="ml-2">
                                  (経験談: {newsletter.qualityCheck.experienceWordCount.toLocaleString()}文字)
                                </span>
                              )}
                            </CardDescription>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSaveNewsletter(currentIndex)}
                          disabled={isSaving && savingIndex === currentIndex}
                        >
                          {isSaving && savingIndex === currentIndex ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'この通を保存'
                          )}
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Subject with AI Assist */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-semibold">件名</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-violet-500 hover:text-violet-700 hover:bg-violet-50"
                            onClick={() => {
                              setShowSubjectAssist(!showSubjectAssist);
                              if (!showSubjectAssist) {
                                generateSubjectAlternatives(currentIndex);
                              }
                            }}
                          >
                            <Wand2 className="h-4 w-4 mr-1" />
                            AIで別案
                          </Button>
                        </div>
                        <Input
                          value={newsletter.subject}
                          onChange={(e) => updateNewsletterContent(currentIndex, 'subject', e.target.value)}
                          className="text-lg"
                        />
                        {/* Subject AI Assist Panel */}
                        {showSubjectAssist && (
                          <div className="mt-2 p-3 bg-violet-50 dark:bg-violet-950 rounded-lg border border-violet-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
                                別案を選択
                              </span>
                              <Button variant="ghost" size="sm" onClick={() => setShowSubjectAssist(false)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            {isLoadingSubjectAlternatives ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                別案を生成中...
                              </div>
                            ) : subjectAlternatives.length > 0 ? (
                              <div className="space-y-2">
                                {subjectAlternatives.map((alt, altIndex) => (
                                  <div
                                    key={altIndex}
                                    className="p-2 bg-white dark:bg-slate-800 rounded cursor-pointer hover:bg-violet-100 dark:hover:bg-violet-900 transition-colors border"
                                    onClick={() => applySubjectAlternative(currentIndex, alt.value)}
                                  >
                                    <p className="text-sm font-medium">{alt.value}</p>
                                    <p className="text-xs text-muted-foreground">{alt.reason}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">別案を読み込めませんでした</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Body with AI Assist */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-semibold">本文</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-violet-500 hover:text-violet-700 hover:bg-violet-50"
                            onClick={() => setShowBodyAssist(!showBodyAssist)}
                          >
                            <Wand2 className="h-4 w-4 mr-1" />
                            AIで修正
                          </Button>
                        </div>
                        {/* Body AI Assist Panel */}
                        {showBodyAssist && (
                          <div className="p-3 bg-violet-50 dark:bg-violet-950 rounded-lg border border-violet-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
                                AIに修正を指示
                              </span>
                              <Button variant="ghost" size="sm" onClick={() => setShowBodyAssist(false)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex gap-2">
                              <Input
                                placeholder="例: 冒頭をもっと感情的に、具体的な数字を追加して"
                                value={bodyAssistInput}
                                onChange={(e) => setBodyAssistInput(e.target.value)}
                                className="flex-1"
                              />
                              <Button
                                size="sm"
                                onClick={() => modifyBodyWithAI(currentIndex, bodyAssistInput)}
                                disabled={isModifyingBody || !bodyAssistInput.trim()}
                              >
                                {isModifyingBody ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              本文の冒頭500文字をAIが修正します
                            </p>
                          </div>
                        )}
                        <Textarea
                          value={newsletter.body}
                          onChange={(e) => updateNewsletterContent(currentIndex, 'body', e.target.value)}
                          className="min-h-[400px] font-mono text-sm"
                        />
                      </div>

                      {/* Quality Indicators */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {newsletter.qualityCheck?.hasSceneDescription && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded">
                            ✅ 情景描写あり
                          </span>
                        )}
                        {newsletter.qualityCheck?.numberCount && newsletter.qualityCheck.numberCount >= 3 && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded">
                            ✅ 数字{newsletter.qualityCheck.numberCount}個
                          </span>
                        )}
                        {newsletter.qualityCheck?.hasQuestions && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded">
                            ✅ 問いかけあり
                          </span>
                        )}
                        {newsletter.qualityCheck?.hasCta && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded">
                            ✅ CTAあり
                          </span>
                        )}
                        {newsletter.qualityCheck?.hasPs && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded">
                            ✅ 追伸あり
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Quick Navigation Dots */}
              {editableNewsletters.length > 1 && (
                <div className="flex justify-center gap-2">
                  {editableNewsletters.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setExpandedNewsletter(index + 1)}
                      className={cn(
                        'w-3 h-3 rounded-full transition-all',
                        expandedNewsletter === index + 1
                          ? 'bg-violet-500 w-6'
                          : 'bg-muted hover:bg-violet-300'
                      )}
                      aria-label={`${index + 1}通目に移動`}
                    />
                  ))}
                </div>
              )}

              {/* Save All Button */}
              <div className="flex gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => router.push('/newsletters')}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      保存中... ({savingIndex !== null ? `${savingIndex + 1}/${editableNewsletters.length}` : ''})
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {editableNewsletters.length}通すべてを保存
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      {currentStep < 5 && currentStep !== 4 && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed() || isGenerating || isChatLoading}
          >
            次へ
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Back button only for step 4 */}
      {currentStep === 4 && !isGenerating && (
        <div className="flex justify-start">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(3)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
        </div>
      )}
    </div>
  );
}
