// New Newsletter Page
// Reference: @docs/02_FRONTEND_DEVELOPMENT/REACT_SERVER_COMPONENTS.md

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { NewsletterForm } from '@/components/newsletters/newsletter-form';

export default async function NewNewsletterPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const products = await db.product.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">新規ニュースレター作成</h1>
        <p className="text-muted-foreground mt-2">
          新しいニュースレターを作成します
        </p>
      </div>

      <NewsletterForm products={products} />
    </div>
  );
}
