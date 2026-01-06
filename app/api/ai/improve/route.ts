// AI Content Improvement API
// Reference: @docs/03_BACKEND_API/API_DESIGN_GUIDE.md

import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { improveContent } from '@/lib/ai/generate';
import { z } from 'zod';

const improveSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  feedback: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = improveSchema.parse(body);

    const result = await improveContent(
      validatedData.content,
      validatedData.feedback
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI improvement error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to improve content' },
      { status: 500 }
    );
  }
}
