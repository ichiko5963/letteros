// Email Sending Utilities (Firebase)
// Reference: @docs/05_EMAIL_DELIVERY/RESEND_INTEGRATION.md

import { resend, EMAIL_CONFIG } from './resend';
import { render } from '@react-email/components';
import NewsletterEmail from '@/emails/newsletter-template';
import { getNewsletter } from '@/lib/firebase/firestore-helpers';

interface SendNewsletterParams {
  newsletterId: string;
  to: string;
  subscriberId?: string;
}

/**
 * Send a newsletter to a single recipient
 */
export async function sendNewsletter({
  newsletterId,
  to,
  subscriberId,
}: SendNewsletterParams) {
  const newsletter = await getNewsletter(newsletterId);

  if (!newsletter) {
    throw new Error('Newsletter not found');
  }

  const unsubscribeUrl = subscriberId
    ? `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe/${subscriberId}`
    : undefined;

  const emailHtml = await render(
    NewsletterEmail({
      title: newsletter.title,
      content: newsletter.content,
      productName: newsletter.productName,
      unsubscribeUrl,
    })
  );

  const result = await resend.emails.send({
    from: EMAIL_CONFIG.from,
    to,
    subject: newsletter.title,
    html: emailHtml,
    replyTo: EMAIL_CONFIG.replyTo,
  });

  if (result.error) {
    throw new Error(`Failed to send email: ${result.error.message}`);
  }

  return result.data;
}

interface SendBatchParams {
  newsletterId: string;
  recipients: Array<{
    email: string;
    subscriberId?: string;
  }>;
}

/**
 * Send newsletter to multiple recipients in batch
 */
export async function sendNewsletterBatch({
  newsletterId,
  recipients,
}: SendBatchParams) {
  const results = [];

  // Send in batches of 10 to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    const batchResults = await Promise.allSettled(
      batch.map((recipient) =>
        sendNewsletter({
          newsletterId,
          to: recipient.email,
          subscriberId: recipient.subscriberId,
        })
      )
    );

    results.push(...batchResults);

    // Wait 1 second between batches to respect rate limits
    if (i + batchSize < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  const successful = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  return {
    total: recipients.length,
    successful,
    failed,
    results,
  };
}

/**
 * Send newsletter to all subscribers of a product
 * Note: This requires fetching subscribers from Firestore
 */
export async function sendToProduct(newsletterId: string) {
  // TODO: Implement with Firebase
  return {
    total: 0,
    successful: 0,
    failed: 0,
    message: 'Email sending to product subscribers not yet implemented',
  };
}
