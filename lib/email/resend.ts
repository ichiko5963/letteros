// Resend Client Configuration
// Reference: @docs/05_EMAIL_DELIVERY/RESEND_INTEGRATION.md

import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not defined in environment variables');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'LetterOS <noreply@letteros.com>',
  replyTo: process.env.EMAIL_REPLY_TO && process.env.EMAIL_REPLY_TO.trim() !== '' 
    ? process.env.EMAIL_REPLY_TO 
    : undefined,
} as const;
