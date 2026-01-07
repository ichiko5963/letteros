// Subscribers Management Page (Firebase)
// CSV Import with auto-tagging and deduplication

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
import { Upload, Users, Tag, Search, X, Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { collection, getDocs, query, where, deleteDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface Subscriber {
  id?: string;
  email: string;
  name?: string;
  tags: string[];
  createdAt?: any;
  userId: string;
}

interface ImportStatus {
  status: 'idle' | 'importing' | 'success' | 'error';
  message: string;
  total: number;
  imported: number;
  duplicates: number;
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
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [importStatus, setImportStatus] = useState<ImportStatus>({
    status: 'idle',
    message: '',
    total: 0,
    imported: 0,
    duplicates: 0,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Parse CSV file with auto-tagging
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length === 0) return;

      // Parse header
      const header = lines[0].split(',').map(h => h.trim());
      const headerLower = header.map(h => h.toLowerCase());

      // Find email and name columns
      const emailIndex = headerLower.findIndex(h =>
        h.includes('email') || h.includes('メール') || h === 'mail'
      );
      const nameIndex = headerLower.findIndex(h =>
        h.includes('name') || h.includes('名前') || h === '氏名'
      );

      if (emailIndex === -1) {
        alert('CSVにはemailカラムが必要です');
        return;
      }

      // Detect additional columns for auto-tagging
      const tagColumns: { index: number; name: string }[] = [];
      header.forEach((col, idx) => {
        if (idx !== emailIndex && idx !== nameIndex && col.trim()) {
          tagColumns.push({ index: idx, name: col.trim() });
        }
      });

      setDetectedColumns(tagColumns.map(tc => tc.name));

      // Parse data rows with deduplication
      const emailSet = new Set<string>();
      const newSubscribers: Subscriber[] = [];
      let duplicateCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const email = values[emailIndex]?.trim().toLowerCase();

        if (email && email.includes('@')) {
          // Check for duplicate email
          if (emailSet.has(email)) {
            duplicateCount++;
            continue;
          }
          emailSet.add(email);

          const name = nameIndex !== -1 ? values[nameIndex]?.trim() : undefined;

          // Auto-tag from additional columns
          const tags: string[] = [];
          for (const tc of tagColumns) {
            const value = values[tc.index]?.trim();
            if (value) {
              // Column name: value format, or just value if it's a category
              if (value.toLowerCase() !== 'true' && value.toLowerCase() !== 'false' && value !== '0' && value !== '1') {
                tags.push(`${tc.name}:${value}`);
              } else if (value.toLowerCase() === 'true' || value === '1') {
                tags.push(tc.name);
              }
            }
          }

          newSubscribers.push({
            email,
            name,
            tags,
            userId: user.uid,
          });
        }
      }

      // Also check against existing subscribers for duplicates
      const existingEmails = new Set(subscribers.map(s => s.email.toLowerCase()));
      const finalSubscribers = newSubscribers.filter(sub => {
        if (existingEmails.has(sub.email)) {
          duplicateCount++;
          return false;
        }
        return true;
      });

      setImportPreview(finalSubscribers);
      setImportStatus(prev => ({
        ...prev,
        duplicates: duplicateCount,
      }));
    };
    reader.readAsText(file);
  };

  // Import subscribers to Firestore (background)
  const handleImport = async () => {
    if (!user || importPreview.length === 0) return;

    const toImport = [...importPreview];
    const total = toImport.length;

    // Close dialog immediately and show status
    setIsImportDialogOpen(false);
    setImportPreview([]);
    setDetectedColumns([]);

    setImportStatus({
      status: 'importing',
      message: 'インポート中...',
      total,
      imported: 0,
      duplicates: importStatus.duplicates,
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      // Process in batches of 500 (Firestore limit)
      const batchSize = 500;
      let imported = 0;

      for (let i = 0; i < toImport.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = toImport.slice(i, i + batchSize);

        for (const sub of chunk) {
          const docRef = doc(collection(db, 'subscribers'));
          batch.set(docRef, {
            ...sub,
            createdAt: serverTimestamp(),
          });
        }

        await batch.commit();
        imported += chunk.length;

        setImportStatus(prev => ({
          ...prev,
          imported,
          message: `${imported}/${total}件をインポート中...`,
        }));
      }

      setImportStatus({
        status: 'success',
        message: `${total}件のインポートが完了しました`,
        total,
        imported: total,
        duplicates: importStatus.duplicates,
      });

      // Reload subscribers
      loadSubscribers();

      // Clear success status after 5 seconds
      setTimeout(() => {
        setImportStatus({ status: 'idle', message: '', total: 0, imported: 0, duplicates: 0 });
      }, 5000);
    } catch (error) {
      console.error('Failed to import subscribers:', error);
      setImportStatus({
        status: 'error',
        message: 'インポートに失敗しました。もう一度お試しください。',
        total,
        imported: 0,
        duplicates: 0,
      });
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
      {/* Import Status Banner */}
      {importStatus.status !== 'idle' && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          importStatus.status === 'importing' ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200' :
          importStatus.status === 'success' ? 'bg-green-50 dark:bg-green-950 border border-green-200' :
          'bg-red-50 dark:bg-red-950 border border-red-200'
        }`}>
          {importStatus.status === 'importing' && (
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          )}
          {importStatus.status === 'success' && (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
          {importStatus.status === 'error' && (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          <div className="flex-1">
            <p className="font-medium">{importStatus.message}</p>
            {importStatus.status === 'importing' && (
              <div className="mt-2 w-full bg-blue-100 dark:bg-blue-900 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(importStatus.imported / importStatus.total) * 100}%` }}
                />
              </div>
            )}
          </div>
          {importStatus.status !== 'importing' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setImportStatus({ status: 'idle', message: '', total: 0, imported: 0, duplicates: 0 })}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

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
              <Button disabled={importStatus.status === 'importing'}>
                <Upload className="mr-2 h-4 w-4" />
                CSVインポート
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>CSVインポート</DialogTitle>
                <DialogDescription>
                  CSVファイルから購読者をインポートします。追加のカラムは自動的にタグになります。
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Input
                    ref={fileInputRef}
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
                      email (必須), name + その他のカラムは自動タグ化
                    </p>
                  </label>
                </div>

                {/* Detected Columns */}
                {detectedColumns.length > 0 && (
                  <div className="p-3 bg-violet-50 dark:bg-violet-950 rounded-lg">
                    <p className="text-sm font-medium text-violet-700 dark:text-violet-300 mb-2">
                      検出されたタグカラム:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {detectedColumns.map((col, i) => (
                        <span key={i} className="px-2 py-1 bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 text-xs rounded">
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {importPreview.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          プレビュー ({importPreview.length}件)
                        </p>
                        {importStatus.duplicates > 0 && (
                          <p className="text-xs text-amber-600">
                            ※ {importStatus.duplicates}件の重複を除外しました
                          </p>
                        )}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => {
                        setImportPreview([]);
                        setDetectedColumns([]);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}>
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
                              <TableCell className="font-mono text-sm">{sub.email}</TableCell>
                              <TableCell>{sub.name || '-'}</TableCell>
                              <TableCell>
                                <div className="flex gap-1 flex-wrap">
                                  {sub.tags.slice(0, 5).map((tag, j) => (
                                    <span key={j} className="px-2 py-0.5 bg-primary/10 text-xs rounded">
                                      {tag}
                                    </span>
                                  ))}
                                  {sub.tags.length > 5 && (
                                    <span className="px-2 py-0.5 bg-muted text-xs rounded">
                                      +{sub.tags.length - 5}
                                    </span>
                                  )}
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
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {importPreview.length}件をインポート
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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4" />
              タグでフィルター
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedTag === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTag(null)}
              >
                すべて ({subscribers.length})
              </Button>
              {allTags.map(tag => {
                const count = subscribers.filter(s => s.tags.includes(tag)).length;
                return (
                  <Button
                    key={tag}
                    variant={selectedTag === tag ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTag(tag)}
                  >
                    {tag} ({count})
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
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
              {selectedTag && ` (タグ: ${selectedTag})`}
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
                  {filteredSubscribers.slice(0, 100).map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-mono text-sm">{sub.email}</TableCell>
                      <TableCell>{sub.name || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {sub.tags.slice(0, 3).map((tag, j) => (
                            <span
                              key={j}
                              className="px-2 py-0.5 bg-primary/10 text-xs rounded cursor-pointer hover:bg-primary/20"
                              onClick={() => setSelectedTag(tag)}
                            >
                              {tag}
                            </span>
                          ))}
                          {sub.tags.length > 3 && (
                            <span className="px-2 py-0.5 bg-muted text-xs rounded">
                              +{sub.tags.length - 3}
                            </span>
                          )}
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
              {filteredSubscribers.length > 100 && (
                <p className="text-center text-sm text-muted-foreground py-3 border-t">
                  {filteredSubscribers.length - 100}件を表示していません（検索またはタグでフィルターしてください）
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
