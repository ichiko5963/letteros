// Send Newsletter API
// Reference: @docs/03_BACKEND_API/API_DESIGN_GUIDE.md

import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendToProduct, sendNewsletter } from '@/lib/email/send';
import { z } from 'zod';

const sendSchema = z.object({
  to: z.string().email().optional(),
  sendToProduct: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const newsletter = await db.newsletter.findUnique({
      where: { id: params.id },
      include: { product: true },
    });

    if (!newsletter) {
      return NextResponse.json(
        { error: 'Newsletter not found' },
        { status: 404 }
      );
    }

    if (newsletter.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = sendSchema.parse(body);

    let result;

    if (validatedData.sendToProduct) {
      if (!newsletter.productId) {
        return NextResponse.json(
          { error: 'Newsletter is not associated with a product' },
          { status: 400 }
        );
      }

      result = await sendToProduct(params.id);
    } else if (validatedData.to) {
      const emailResult = await sendNewsletter({
        newsletterId: params.id,
        to: validatedData.to,
      });

      result = {
        total: 1,
        successful: 1,
        failed: 0,
        emailId: emailResult?.id,
      };
    } else {
      return NextResponse.json(
        { error: 'Either "to" or "sendToProduct" must be specified' },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Send newsletter error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to send newsletter' },
      { status: 500 }
    );
  }
}
