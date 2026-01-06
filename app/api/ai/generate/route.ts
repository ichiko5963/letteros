// AI Content Generation API (Firebase)
// Reference: @docs/03_BACKEND_API/API_DESIGN_GUIDE.md

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/firebase/server-auth';
import { generateContent } from '@/lib/ai/generate';
import { z } from 'zod';

const generateSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  context: z.string().optional(),
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
    const validatedData = generateSchema.parse(body);

    const result = await generateContent(
      validatedData.topic,
      validatedData.context
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI generation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}
