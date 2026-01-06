// Edit Newsletter Page (Firebase)
// Reference: @docs/02_FRONTEND_DEVELOPMENT/REACT_SERVER_COMPONENTS.md

'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { getNewsletter, getUserProducts, Newsletter, Product } from '@/lib/firebase/firestore-helpers';
import { NewsletterForm } from '@/components/newsletters/newsletter-form';
import { SendDialog } from '@/components/newsletters/send-dialog';

export default function EditNewsletterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && resolvedParams.id) {
      Promise.all([
        getNewsletter(resolvedParams.id),
        getUserProducts(user.uid),
      ])
        .then(([newsletterData, productsData]) => {
          if (!newsletterData) {
            router.push('/newsletters');
            return;
          }
          if (newsletterData.userId !== user.uid) {
            router.push('/newsletters');
            return;
          }
          setNewsletter(newsletterData);
          setProducts(productsData);
        })
        .catch((error) => {
          console.error('Failed to load newsletter:', error);
          router.push('/newsletters');
        })
        .finally(() => setLoadingData(false));
    }
  }, [user, resolvedParams.id, router]);

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (!user || !newsletter) {
    return null;
  }

  // Transform products to match the expected format
  const productOptions = products.map(p => ({ id: p.id!, name: p.name }));

  // Transform newsletter for the form
  const newsletterForForm = {
    id: newsletter.id!,
    title: newsletter.title,
    content: newsletter.content,
    productId: newsletter.productId || null,
    status: newsletter.status,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ニュースレター編集</h1>
          <p className="text-muted-foreground mt-2">
            ニュースレターの内容を編集します
          </p>
        </div>
        <SendDialog
          newsletterId={newsletter.id!}
          hasProduct={!!newsletter.productId}
          productName={newsletter.productName}
          subscriberCount={0}
        />
      </div>

      <NewsletterForm newsletter={newsletterForForm} products={productOptions} />
    </div>
  );
}
