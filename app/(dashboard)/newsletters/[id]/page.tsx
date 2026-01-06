// Edit Newsletter Page
// Reference: @docs/02_FRONTEND_DEVELOPMENT/REACT_SERVER_COMPONENTS.md

import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { NewsletterForm } from '@/components/newsletters/newsletter-form';
import { SendDialog } from '@/components/newsletters/send-dialog';

export default async function EditNewsletterPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const newsletter = await db.newsletter.findUnique({
    where: { id: params.id },
    include: {
      product: {
        include: {
          _count: {
            select: {
              subscribers: {
                where: { status: 'ACTIVE' },
              },
            },
          },
        },
      },
    },
  });

  if (!newsletter) {
    notFound();
  }

  if (newsletter.userId !== session.user.id) {
    redirect('/newsletters');
  }

  const products = await db.product.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
  });

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
          newsletterId={newsletter.id}
          hasProduct={!!newsletter.productId}
          productName={newsletter.product?.name}
          subscriberCount={newsletter.product?._count.subscribers || 0}
        />
      </div>

      <NewsletterForm newsletter={newsletter} products={products} />
    </div>
  );
}
