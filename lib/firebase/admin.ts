// Firebase Admin SDK Configuration (Server-side only)
// Reference: @docs/03_BACKEND_API/AUTHENTICATION.md

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

let adminApp: App | null = null;

function initializeAdminApp(): App | null {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Check if environment variables are set
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

  // If environment variables are set, use them
  if (projectId && privateKey && clientEmail) {
    try {
      return initializeApp({
        credential: cert({
          projectId,
          privateKey,
          clientEmail,
        }),
      });
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK with environment variables:', error);
      return null;
    }
  }

  // If environment variables are not set, try to use service account JSON file
  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
      join(process.cwd(), 'letteros-1a481-firebase-adminsdk-fbsvc-d0c455bdb9.json');
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    
    return initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (error) {
    // If service account file doesn't exist, return null
    // This allows the app to run without Firebase Admin SDK in development
    console.warn(
      'Firebase Admin SDK not initialized. ' +
      'Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_PRIVATE_KEY, and FIREBASE_ADMIN_CLIENT_EMAIL environment variables, ' +
      'or provide a service account JSON file at: letteros-1a481-firebase-adminsdk-fbsvc-d0c455bdb9.json'
    );
    return null;
  }
}

adminApp = initializeAdminApp();

// Export adminAuth and adminDb only if adminApp is initialized
export const adminAuth = adminApp ? getAuth(adminApp) : null;
export const adminDb = adminApp ? getFirestore(adminApp) : null;

export default adminApp;
