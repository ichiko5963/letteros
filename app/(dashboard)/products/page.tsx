// Products List Page (Firebase)
// Reference: @docs/02_FRONTEND_DEVELOPMENT/REACT_SERVER_COMPONENTS.md

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { Product } from '@/lib/firebase/firestore-helpers';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Plus, Rocket } from 'lucide-react';

export default function ProductsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load data non-blocking - localStorage first for instant display
  useEffect(() => {
    if (user) {
      // Step 1: Load from localStorage immediately (instant)
      try {
        const localProducts = JSON.parse(localStorage.getItem('letteros_products') || '[]');
        const localUserProducts = localProducts.filter((p: Product) => p.userId === user.uid);
        if (localUserProducts.length > 0) {
          setProducts(localUserProducts);
          setIsLoading(false); // Show data immediately
        }
      } catch {
        // Ignore localStorage errors
      }

      // Step 2: Load from Firestore in background and merge
      import('@/lib/firebase/firestore-helpers').then(({ getUserProducts }) => {
        getUserProducts(user.uid)
          .then((firestoreProducts) => {
            // Merge localStorage and Firestore products
            try {
              const localProducts = JSON.parse(localStorage.getItem('letteros_products') || '[]');
              const localUserProducts = localProducts.filter((p: Product) => p.userId === user.uid);

              // Combine, with Firestore products taking priority
              const allProducts = [...firestoreProducts];
              localUserProducts.forEach((localProd: Product) => {
                if (!allProducts.some(p => p.id === localProd.id)) {
                  allProducts.push(localProd);
                }
              });

              setProducts(allProducts);
            } catch {
              setProducts(firestoreProducts);
            }
          })
          .catch((error) => {
            console.error('Firestore error:', error);
            // Keep localStorage data if Firestore fails
          })
          .finally(() => setIsLoading(false));
      });
    }
  }, [user]);

  if (!user && !loading) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ローンチコンテンツ</h1>
          <p className="text-muted-foreground mt-2">
            発信主体とメルマガを管理
          </p>
        </div>
        <Button asChild>
          <Link href="/products/new">
            <Plus className="mr-2 h-4 w-4" />
            新規作成
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                <div className="h-4 w-48 bg-muted animate-pulse rounded mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-full bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Rocket className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              ローンチコンテンツがありません
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              最初のローンチコンテンツを作成しましょう
            </p>
            <Button asChild>
              <Link href="/products/new">
                <Plus className="mr-2 h-4 w-4" />
                新規作成
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="line-clamp-1">{product.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {product.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">購読者</span>
                    <span className="font-medium">{product.subscriberCount || 0}</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-4" asChild>
                    <Link href={`/products/${product.id}`}>
                      詳細を見る
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
