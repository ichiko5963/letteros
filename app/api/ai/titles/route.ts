// AI Title Generation API (Firebase)
// Reference: @docs/03_BACKEND_API/API_DESIGN_GUIDE.md

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/firebase/server-auth';
import { generateTitles } from '@/lib/ai/generate';
import { z } from 'zod';

const titlesSchema = z.object({
  content: z.string().min(1, 'Content is required'),
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
    const validatedData = titlesSchema.parse(body);

    const result = await generateTitles(validatedData.content);

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI title generation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate titles' },
      { status: 500 }
    );
  }
}
