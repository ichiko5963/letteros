// Send Newsletter API (Firebase)
// Reference: @docs/03_BACKEND_API/API_DESIGN_GUIDE.md

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/firebase/server-auth';
import { getNewsletter } from '@/lib/firebase/firestore-helpers';
import { z } from 'zod';

const sendSchema = z.object({
  to: z.string().email().optional(),
  sendToProduct: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await verifySession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const newsletter = await getNewsletter(resolvedParams.id);

    if (!newsletter) {
      return NextResponse.json(
        { error: 'Newsletter not found' },
        { status: 404 }
      );
    }

    if (newsletter.userId !== session.uid) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = sendSchema.parse(body);

    // TODO: Implement email sending with Firebase
    // For now, return a placeholder response
    if (validatedData.sendToProduct) {
      if (!newsletter.productId) {
        return NextResponse.json(
          { error: 'Newsletter is not associated with a product' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        total: 0,
        successful: 0,
        failed: 0,
        message: 'Email sending will be implemented soon',
      });
    } else if (validatedData.to) {
      return NextResponse.json({
        total: 1,
        successful: 0,
        failed: 0,
        message: 'Email sending will be implemented soon',
      });
    } else {
      return NextResponse.json(
        { error: 'Either "to" or "sendToProduct" must be specified' },
        { status: 400 }
      );
    }
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
