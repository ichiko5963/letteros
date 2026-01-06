// Session API Route
// Reference: @docs/03_BACKEND_API/AUTHENTICATION.md

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';

const SESSION_COOKIE_NAME = 'session';
const SESSION_EXPIRATION = 60 * 60 * 24 * 5 * 1000; // 5 days

/**
 * POST: Create session cookie from ID token
 */
export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { error: 'ID token is required' },
        { status: 400 }
      );
    }

    // Check if adminAuth is available
    if (!adminAuth) {
      // In development without Firebase Admin SDK, just return success
      console.warn('Firebase Admin SDK not initialized, skipping session creation');
      return NextResponse.json({ success: true });
    }

    // Verify the ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // Create session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRATION,
    });

    // Set the session cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_EXPIRATION / 1000, // Convert to seconds
      path: '/',
    });

    return NextResponse.json({
      success: true,
      uid: decodedToken.uid,
    });
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 401 }
    );
  }
}

/**
 * DELETE: Clear session cookie
 */
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}

/**
 * GET: Check session status
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE_NAME);

    if (!session?.value) {
      return NextResponse.json({ authenticated: false });
    }

    // Check if adminAuth is available
    if (!adminAuth) {
      // In development without Firebase Admin SDK, return authenticated based on cookie presence
      return NextResponse.json({ authenticated: true });
    }

    // Verify the session cookie
    const decodedToken = await adminAuth.verifySessionCookie(session.value, true);

    return NextResponse.json({
      authenticated: true,
      uid: decodedToken.uid,
    });
  } catch (error) {
    // Session is invalid or expired
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);

    return NextResponse.json({ authenticated: false });
  }
}

