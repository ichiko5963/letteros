// Server-side Authentication Helper
// Reference: @docs/03_BACKEND_API/AUTHENTICATION.md

import { cookies } from 'next/headers';
import { adminAuth } from './admin';

const SESSION_COOKIE_NAME = 'session';

/**
 * Verify session token on server
 */
export async function verifySession() {
  try {
    if (!adminAuth) {
      return null;
    }

    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE_NAME);

    if (!session?.value) {
      return null;
    }

    const decodedToken = await adminAuth.verifySessionCookie(session.value, true);
    return decodedToken;
  } catch (error) {
    return null;
  }
}

/**
 * Get current user on server
 */
export async function getCurrentUser() {
  if (!adminAuth) {
    return null;
  }

  const decodedToken = await verifySession();

  if (!decodedToken) {
    return null;
  }

  const user = await adminAuth.getUser(decodedToken.uid);
  return user;
}

/**
 * Require authentication (throws if not authenticated)
 */
export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}
