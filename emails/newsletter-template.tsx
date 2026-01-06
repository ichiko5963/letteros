// Newsletter Email Template
// Reference: @docs/05_EMAIL_DELIVERY/RESEND_INTEGRATION.md

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Link,
} from '@react-email/components';
import * as React from 'react';

interface NewsletterEmailProps {
  title: string;
  content: string;
  productName?: string;
  unsubscribeUrl?: string;
}

export const NewsletterEmail = ({
  title,
  content,
  productName,
  unsubscribeUrl,
}: NewsletterEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Body style={main}>
        <Container style={container}>
          {productName && (
            <Section style={header}>
              <Text style={headerText}>{productName}</Text>
            </Section>
          )}

          <Section style={content}>
            <Heading style={h1}>{title}</Heading>
            <div
              style={contentText}
              dangerouslySetInnerHTML={{ __html: formatContent(content) }}
            />
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              このメールは {productName || 'LetterOS'} からお送りしています
            </Text>
            {unsubscribeUrl && (
              <Link href={unsubscribeUrl} style={unsubscribeLink}>
                配信停止
              </Link>
            )}
            <Text style={footerText}>
              Powered by LetterOS
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Helper function to format content (convert markdown to HTML if needed)
function formatContent(content: string): string {
  // Basic markdown to HTML conversion
  return content
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '24px',
  borderBottom: '1px solid #e6e6e6',
};

const headerText = {
  margin: '0',
  fontSize: '14px',
  fontWeight: '600',
  color: '#666666',
  textTransform: 'uppercase' as const,
};

const content = {
  padding: '24px',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: '700',
  lineHeight: '1.3',
  margin: '0 0 24px',
};

const contentText = {
  color: '#333333',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0',
};

const footer = {
  padding: '24px',
  borderTop: '1px solid #e6e6e6',
};

const footerText = {
  color: '#666666',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '0 0 8px',
  textAlign: 'center' as const,
};

const unsubscribeLink = {
  color: '#666666',
  fontSize: '12px',
  textDecoration: 'underline',
  display: 'block',
  textAlign: 'center' as const,
  margin: '8px 0',
};

export default NewsletterEmail;
