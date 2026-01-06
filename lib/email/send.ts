// Email Sending Utilities
// Reference: @docs/05_EMAIL_DELIVERY/RESEND_INTEGRATION.md

import { resend, EMAIL_CONFIG } from './resend';
import { render } from '@react-email/components';
import NewsletterEmail from '@/emails/newsletter-template';
import { db } from '@/lib/db';

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
  const newsletter = await db.newsletter.findUnique({
    where: { id: newsletterId },
    include: { product: true },
  });

  if (!newsletter) {
    throw new Error('Newsletter not found');
  }

  const unsubscribeUrl = subscriberId
    ? `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe/${subscriberId}`
    : undefined;

  const emailHtml = render(
    NewsletterEmail({
      title: newsletter.title,
      content: newsletter.content,
      productName: newsletter.product?.name,
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

  // Record the email send in database
  await db.email.create({
    data: {
      newsletterId,
      subscriberId,
      recipient: to,
      subject: newsletter.title,
      status: result.error ? 'FAILED' : 'SENT',
      externalId: result.data?.id,
      sentAt: result.error ? null : new Date(),
      error: result.error ? JSON.stringify(result.error) : null,
    },
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
 */
export async function sendToProduct(newsletterId: string) {
  const newsletter = await db.newsletter.findUnique({
    where: { id: newsletterId },
    include: {
      product: {
        include: {
          subscribers: {
            where: {
              status: 'ACTIVE',
            },
          },
        },
      },
    },
  });

  if (!newsletter) {
    throw new Error('Newsletter not found');
  }

  if (!newsletter.product) {
    throw new Error('Newsletter is not associated with a product');
  }

  const recipients = newsletter.product.subscribers.map((subscriber) => ({
    email: subscriber.email,
    subscriberId: subscriber.id,
  }));

  if (recipients.length === 0) {
    throw new Error('No active subscribers found');
  }

  const result = await sendNewsletterBatch({
    newsletterId,
    recipients,
  });

  // Update newsletter status
  await db.newsletter.update({
    where: { id: newsletterId },
    data: {
      status: 'SENT',
      sentAt: new Date(),
    },
  });

  return result;
}
