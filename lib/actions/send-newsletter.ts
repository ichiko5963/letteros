// Send Newsletter Server Action (Firebase)
// Reference: @docs/03_BACKEND_API/API_DESIGN_GUIDE.md

'use server';

import { revalidatePath } from 'next/cache';

// Note: Email sending functionality is implemented via API routes
// See: /api/newsletters/[id]/send/route.ts

export async function sendNewsletterToProduct(newsletterId: string) {
  // Implemented via API route
  revalidatePath(`/newsletters/${newsletterId}`);
  revalidatePath('/newsletters');
  return { success: true, message: 'See API route implementation' };
}

export async function sendTestEmail(newsletterId: string, email: string) {
  // Implemented via API route
  return { success: true, message: 'See API route implementation' };
}
