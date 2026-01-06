// AI Chat API (Firebase)
// Reference: @docs/03_BACKEND_API/API_DESIGN_GUIDE.md

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/firebase/server-auth';
import { chatWithEditor } from '@/lib/ai/generate';
import { z } from 'zod';

const chatSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  history: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = chatSchema.parse(body);

    const result = await chatWithEditor(
      validatedData.message,
      validatedData.history
    );

    return NextResponse.json({ response: result });
  } catch (error) {
    console.error('AI chat error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process chat' },
      { status: 500 }
    );
  }
}
