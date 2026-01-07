// New Newsletter Page (Firebase)
// Reference: @docs/02_FRONTEND_DEVELOPMENT/REACT_SERVER_COMPONENTS.md

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { getUserProducts, Product } from '@/lib/firebase/firestore-helpers';
import { NewsletterForm } from '@/components/newsletters/newsletter-form';

export default function NewNewsletterPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      getUserProducts(user.uid)
        .then(setProducts)
        .catch((error) => {
          console.error('Failed to load products:', error);
        })
        .finally(() => setLoadingProducts(false));
    }
  }, [user]);

  if (loading || loadingProducts) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Transform products to match the expected format
  const productOptions = products.map(p => ({ id: p.id!, name: p.name }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">新規メルマガ作成</h1>
        <p className="text-muted-foreground mt-2">
          新しいメルマガを作成します
        </p>
      </div>

      <NewsletterForm products={productOptions} />
    </div>
  );
}
