// Send Newsletter Server Action
// Reference: @docs/03_BACKEND_API/API_DESIGN_GUIDE.md

'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendToProduct, sendNewsletter } from '@/lib/email/send';
import { revalidatePath } from 'next/cache';

export async function sendNewsletterToProduct(newsletterId: string) {
  const session = await auth();

  if (!session?.user) {
    throw new Error('認証が必要です');
  }

  const newsletter = await db.newsletter.findUnique({
    where: { id: newsletterId },
  });

  if (!newsletter || newsletter.userId !== session.user.id) {
    throw new Error('権限がありません');
  }

  if (!newsletter.productId) {
    throw new Error('プロダクトが設定されていません');
  }

  try {
    const result = await sendToProduct(newsletterId);

    revalidatePath(`/newsletters/${newsletterId}`);
    revalidatePath('/newsletters');

    return result;
  } catch (error) {
    console.error('Failed to send newsletter:', error);
    throw error;
  }
}

export async function sendTestEmail(newsletterId: string, email: string) {
  const session = await auth();

  if (!session?.user) {
    throw new Error('認証が必要です');
  }

  const newsletter = await db.newsletter.findUnique({
    where: { id: newsletterId },
  });

  if (!newsletter || newsletter.userId !== session.user.id) {
    throw new Error('権限がありません');
  }

  try {
    await sendNewsletter({
      newsletterId,
      to: email,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send test email:', error);
    throw error;
  }
}
