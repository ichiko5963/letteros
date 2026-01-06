// Subscribers Management Page (Firebase)
// CSV Import and Tag Management

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Upload, Users, Tag, Search, X, Plus, Download } from 'lucide-react';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface Subscriber {
  id?: string;
  email: string;
  name?: string;
  tags: string[];
  createdAt?: any;
  userId: string;
}

export default function SubscribersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loadingSubscribers, setLoadingSubscribers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<Subscriber[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Get all unique tags
  const allTags = [...new Set(subscribers.flatMap(s => s.tags))].sort();

  // Filter subscribers
  const filteredSubscribers = subscribers.filter(sub => {
    const matchesSearch = !searchQuery || 
      sub.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.name && sub.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTag = !selectedTag || sub.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const loadSubscribers = useCallback(async () => {
    if (!user) return;
    
    try {
      const q = query(
        collection(db, 'subscribers'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Subscriber[];
      setSubscribers(data);
    } catch (error) {
      console.error('Failed to load subscribers:', error);
    } finally {
      setLoadingSubscribers(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadSubscribers();
    }
  }, [user, loadSubscribers]);

  // Parse CSV file
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) return;

      // Parse header
      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      const emailIndex = header.findIndex(h => h.includes('email') || h.includes('メール'));
      const nameIndex = header.findIndex(h => h.includes('name') || h.includes('名前'));
      const tagsIndex = header.findIndex(h => h.includes('tag') || h.includes('タグ'));

      if (emailIndex === -1) {
        alert('CSVにはemailカラムが必要です');
        return;
      }

      // Parse data rows
      const newSubscribers: Subscriber[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const email = values[emailIndex]?.trim();
        
        if (email && email.includes('@')) {
          const name = nameIndex !== -1 ? values[nameIndex]?.trim() : undefined;
          const tagsStr = tagsIndex !== -1 ? values[tagsIndex]?.trim() : '';
          const tags = tagsStr ? tagsStr.split(/[;|]/).map(t => t.trim()).filter(Boolean) : [];

          newSubscribers.push({
            email,
            name,
            tags,
            userId: user.uid,
          });
        }
      }

      setImportPreview(newSubscribers);
    };
    reader.readAsText(file);
  };

  // Parse CSV line handling quoted values
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  // Import subscribers to Firestore
  const handleImport = async () => {
    if (!user || importPreview.length === 0) return;

    setIsImporting(true);
    try {
      const batch = writeBatch(db);
      
      for (const sub of importPreview) {
        const docRef = doc(collection(db, 'subscribers'));
        batch.set(docRef, {
          ...sub,
          createdAt: serverTimestamp(),
        });
      }

      await batch.commit();
      
      setImportPreview([]);
      setIsImportDialogOpen(false);
      loadSubscribers();
    } catch (error) {
      console.error('Failed to import subscribers:', error);
      alert('インポートに失敗しました');
    } finally {
      setIsImporting(false);
    }
  };

  // Delete subscriber
  const handleDelete = async (id: string) => {
    if (!confirm('この購読者を削除しますか？')) return;

    try {
      await deleteDoc(doc(db, 'subscribers', id));
      setSubscribers(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete subscriber:', error);
    }
  };

  // Export to CSV
  const handleExport = () => {
    const headers = ['email', 'name', 'tags'];
    const csvContent = [
      headers.join(','),
      ...filteredSubscribers.map(s => 
        [s.email, s.name || '', s.tags.join(';')].map(v => `"${v}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `subscribers_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-9 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">購読者管理</h1>
          <p className="text-muted-foreground mt-2">
            メーリングリストの管理とCSVインポート
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={subscribers.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            エクスポート
          </Button>
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                CSVインポート
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>CSVインポート</DialogTitle>
                <DialogDescription>
                  CSVファイルから購読者をインポートします。email, name, tags カラムに対応しています。
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      クリックしてCSVファイルを選択
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      対応カラム: email (必須), name, tags (セミコロン区切り)
                    </p>
                  </label>
                </div>

                {importPreview.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        プレビュー ({importPreview.length}件)
                      </p>
                      <Button onClick={() => setImportPreview([])}>
                        クリア
                      </Button>
                    </div>
                    
                    <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>メールアドレス</TableHead>
                            <TableHead>名前</TableHead>
                            <TableHead>タグ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importPreview.slice(0, 10).map((sub, i) => (
                            <TableRow key={i}>
                              <TableCell>{sub.email}</TableCell>
                              <TableCell>{sub.name || '-'}</TableCell>
                              <TableCell>
                                <div className="flex gap-1 flex-wrap">
                                  {sub.tags.map((tag, j) => (
                                    <span key={j} className="px-2 py-0.5 bg-primary/10 text-xs rounded">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {importPreview.length > 10 && (
                        <p className="text-center text-sm text-muted-foreground py-2">
                          ...他{importPreview.length - 10}件
                        </p>
                      )}
                    </div>

                    <Button 
                      onClick={handleImport} 
                      className="w-full"
                      disabled={isImporting}
                    >
                      {isImporting ? 'インポート中...' : `${importPreview.length}件をインポート`}
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tag filters */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <Button
            variant={selectedTag === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTag(null)}
          >
            すべて
          </Button>
          {allTags.map(tag => (
            <Button
              key={tag}
              variant={selectedTag === tag ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTag(tag)}
            >
              {tag}
            </Button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="メールアドレスまたは名前で検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => setSearchQuery('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Subscribers table */}
      {loadingSubscribers ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : subscribers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              購読者がいません
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              CSVファイルから購読者をインポートしましょう
            </p>
            <Button onClick={() => setIsImportDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              CSVインポート
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>購読者一覧</CardTitle>
            <CardDescription>
              {filteredSubscribers.length} / {subscribers.length} 件表示中
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>メールアドレス</TableHead>
                    <TableHead>名前</TableHead>
                    <TableHead>タグ</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscribers.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.email}</TableCell>
                      <TableCell>{sub.name || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {sub.tags.map((tag, j) => (
                            <span 
                              key={j} 
                              className="px-2 py-0.5 bg-primary/10 text-xs rounded cursor-pointer hover:bg-primary/20"
                              onClick={() => setSelectedTag(tag)}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => sub.id && handleDelete(sub.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

