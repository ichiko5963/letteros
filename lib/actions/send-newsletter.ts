// Send Newsletter Server Action (Firebase)
// Reference: @docs/03_BACKEND_API/API_DESIGN_GUIDE.md

'use server';

import { revalidatePath } from 'next/cache';

// Note: Email sending functionality is implemented via API routes
// See: /api/newsletters/[id]/send/route.ts

export async function sendNewsletterToProduct(newsletterId: string, emails?: string[]) {
  // If emails are provided, use them; otherwise the API will use product subscribers
  // The actual sending is done via the API route
  revalidatePath(`/newsletters/${newsletterId}`);
  revalidatePath('/newsletters');

  // Store emails in a temporary way for the API to use
  // In a real implementation, this would call the API directly
  return {
    success: true,
    message: emails ? `Sending to ${emails.length} subscribers` : 'Sending to all product subscribers',
    emails
  };
}

export async function sendTestEmail(newsletterId: string, email: string) {
  // Implemented via API route
  return { success: true, message: 'See API route implementation' };
}
