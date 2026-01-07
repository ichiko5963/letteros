// Contexts Management Page
// Allows users to manage their experience contexts for newsletter generation

'use client';

import { useEffect, useState, useRef } from 'react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  FileText,
  Plus,
  Upload,
  Trash2,
  Edit,
  Loader2,
  Sparkles,
  Link2,
} from 'lucide-react';

interface Context {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'markdown' | 'notion' | 'google';
  createdAt: string;
  updatedAt: string;
}

export default function ContextsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [contexts, setContexts] = useState<Context[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingContext, setIsAddingContext] = useState(false);
  const [newContextTitle, setNewContextTitle] = useState('');
  const [newContextContent, setNewContextContent] = useState('');
  const [editingContext, setEditingContext] = useState<Context | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load contexts from localStorage
  useEffect(() => {
    if (user) {
      setIsLoading(true);
      try {
        const savedContexts = localStorage.getItem(`letteros_contexts_${user.uid}`);
        if (savedContexts) {
          setContexts(JSON.parse(savedContexts));
        }
      } catch (error) {
        console.error('Failed to load contexts:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [user]);

  // Save contexts to localStorage
  const saveContexts = (newContexts: Context[]) => {
    if (user) {
      localStorage.setItem(`letteros_contexts_${user.uid}`, JSON.stringify(newContexts));
      setContexts(newContexts);
    }
  };

  // Add new context
  const handleAddContext = async () => {
    if (!newContextTitle.trim() || !newContextContent.trim()) return;

    setIsAddingContext(true);

    const newContext: Context = {
      id: `context_${Date.now()}`,
      title: newContextTitle,
      content: newContextContent,
      type: 'text',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveContexts([...contexts, newContext]);
    setNewContextTitle('');
    setNewContextContent('');
    setShowAddDialog(false);
    setIsAddingContext(false);
  };

  // Handle file upload (Markdown) - supports multiple files
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const total = fileArray.length;

    setIsUploading(true);
    setUploadProgress({ current: 0, total });

    const timestamp = Date.now();
    const newContexts: Context[] = [];

    // Read all files with Promise
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      try {
        const content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsText(file);
        });

        const title = file.name.replace(/\.(md|txt)$/, '');
        newContexts.push({
          id: `context_${timestamp}_${i}`,
          title,
          content,
          type: 'markdown',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error(`Failed to read ${file.name}:`, error);
      }

      setUploadProgress({ current: i + 1, total });
    }

    // Save all contexts
    const updatedContexts = [...contexts, ...newContexts];
    saveContexts(updatedContexts);
    setIsUploading(false);

    // Reset input
    e.target.value = '';
  };

  // Delete context
  const handleDeleteContext = (id: string) => {
    if (confirm('このコンテキストを削除しますか？')) {
      saveContexts(contexts.filter(c => c.id !== id));
    }
  };

  // Update context
  const handleUpdateContext = () => {
    if (!editingContext) return;

    saveContexts(contexts.map(c =>
      c.id === editingContext.id
        ? { ...editingContext, updatedAt: new Date().toISOString() }
        : c
    ));
    setEditingContext(null);
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  // Full screen loading during upload
  if (isUploading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-violet-500 mb-4" />
        <p className="text-lg font-medium">ファイルをアップロード中...</p>
        <p className="text-muted-foreground mt-2">
          {uploadProgress.current} / {uploadProgress.total} ファイル
        </p>
        <div className="w-64 h-2 bg-muted rounded-full mt-4 overflow-hidden">
          <div
            className="h-full bg-violet-500 transition-all duration-300"
            style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8" />
            コンテキスト
          </h1>
          <p className="text-muted-foreground mt-2">
            経験談やエピソードを保存して、メルマガ生成に活用できます
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            ファイルをまとめてアップロード
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                新規追加
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>新しいコンテキストを追加</DialogTitle>
                <DialogDescription>
                  経験談やエピソードを入力してください。AIがタイトルを自動生成することもできます。
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">タイトル</Label>
                  <Input
                    id="title"
                    value={newContextTitle}
                    onChange={(e) => setNewContextTitle(e.target.value)}
                    placeholder="例: ららぽーとでの経験"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">内容</Label>
                  <Textarea
                    id="content"
                    value={newContextContent}
                    onChange={(e) => setNewContextContent(e.target.value)}
                    placeholder="経験談やエピソードを詳しく書いてください..."
                    className="min-h-[200px]"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    キャンセル
                  </Button>
                  <Button onClick={handleAddContext} disabled={isAddingContext || !newContextTitle.trim() || !newContextContent.trim()}>
                    {isAddingContext ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      '追加'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Coming Soon: Integrations */}
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-6">
          <div className="text-center">
            <div className="flex justify-center gap-4 mb-3">
              <Link2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Notion / Google ドキュメント連携は近日公開予定
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Contexts List */}
      {contexts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">コンテキストがありません</h3>
            <p className="text-muted-foreground text-center mb-6">
              経験談やエピソードを追加すると、<br />
              メルマガ生成時に参照できるようになります
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              最初のコンテキストを追加
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contexts.map((context) => (
            <Card key={context.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base line-clamp-1">{context.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {context.type === 'markdown' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 mr-2">
                          Markdown
                        </span>
                      )}
                      {new Date(context.updatedAt).toLocaleDateString('ja-JP')}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditingContext(context)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteContext(context.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {context.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editingContext && (
        <Dialog open={!!editingContext} onOpenChange={() => setEditingContext(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>コンテキストを編集</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">タイトル</Label>
                <Input
                  id="edit-title"
                  value={editingContext.title}
                  onChange={(e) => setEditingContext({ ...editingContext, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-content">内容</Label>
                <Textarea
                  id="edit-content"
                  value={editingContext.content}
                  onChange={(e) => setEditingContext({ ...editingContext, content: e.target.value })}
                  className="min-h-[300px]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingContext(null)}>
                  キャンセル
                </Button>
                <Button onClick={handleUpdateContext}>
                  保存
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
