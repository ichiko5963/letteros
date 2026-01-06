// Newsletter Server Actions
// Reference: @docs/03_BACKEND_API/API_DESIGN_GUIDE.md

'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const newsletterSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(200, 'タイトルは200文字以内で入力してください'),
  content: z.string().min(1, 'コンテンツは必須です'),
  productId: z.string().optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'SENT', 'FAILED']).optional(),
  scheduledAt: z.string().optional(),
});

export async function createNewsletter(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    throw new Error('認証が必要です');
  }

  const rawData = {
    title: formData.get('title'),
    content: formData.get('content'),
    productId: formData.get('productId') || undefined,
    status: formData.get('status') || 'DRAFT',
    scheduledAt: formData.get('scheduledAt') || undefined,
  };

  const validatedData = newsletterSchema.parse(rawData);

  const newsletter = await db.newsletter.create({
    data: {
      title: validatedData.title,
      content: validatedData.content,
      userId: session.user.id,
      productId: validatedData.productId,
      status: (validatedData.status as any) || 'DRAFT',
      scheduledAt: validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : null,
    },
  });

  revalidatePath('/newsletters');
  redirect(`/newsletters/${newsletter.id}`);
}

export async function updateNewsletter(id: string, formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    throw new Error('認証が必要です');
  }

  const newsletter = await db.newsletter.findUnique({
    where: { id },
  });

  if (!newsletter || newsletter.userId !== session.user.id) {
    throw new Error('権限がありません');
  }

  const rawData = {
    title: formData.get('title'),
    content: formData.get('content'),
    productId: formData.get('productId') || undefined,
    status: formData.get('status') || newsletter.status,
    scheduledAt: formData.get('scheduledAt') || undefined,
  };

  const validatedData = newsletterSchema.parse(rawData);

  await db.newsletter.update({
    where: { id },
    data: {
      title: validatedData.title,
      content: validatedData.content,
      productId: validatedData.productId,
      status: (validatedData.status as any),
      scheduledAt: validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : null,
      updatedAt: new Date(),
    },
  });

  revalidatePath(`/newsletters/${id}`);
  revalidatePath('/newsletters');
}

export async function deleteNewsletter(id: string) {
  const session = await auth();

  if (!session?.user) {
    throw new Error('認証が必要です');
  }

  const newsletter = await db.newsletter.findUnique({
    where: { id },
  });

  if (!newsletter || newsletter.userId !== session.user.id) {
    throw new Error('権限がありません');
  }

  await db.newsletter.delete({
    where: { id },
  });

  revalidatePath('/newsletters');
  redirect('/newsletters');
}
