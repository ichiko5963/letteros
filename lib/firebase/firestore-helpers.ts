// Firestore Helper Functions
// Reference: @docs/03_BACKEND_API/DATABASE_SCHEMA.md

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';

// Types
export interface Newsletter {
  id?: string;
  userId: string;
  title: string;
  content: string;
  status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'FAILED';
  productId?: string;
  productName?: string;
  scheduledAt?: Timestamp | null;
  sentAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  // LetterOS hypothesis tracking
  hypothesis?: {
    plan?: {
      targetSegment: string;
      currentBelief: string;
      desiredBelief: string;
      mainPoint: string;
      proof: string;
      cta: string;
    };
    selectedVariants?: {
      subject?: string;
      introduction?: string;
      structure?: string;
      conclusion?: string;
    };
  };
}

export interface Product {
  id?: string;
  userId: string;
  name: string;
  description: string;
  // LetterOS product definition (発信主体)
  targetAudience?: string;  // どんな読者に
  valueProposition?: string;  // どんな価値を
  tone?: string;  // どんなトーンで
  coreMessage?: string;  // コアメッセージ
  subscriberCount?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  // LetterOS発信定義（AIで生成される追加フィールド）
  launchContent?: {
    concept?: string;           // コンセプト
    targetPain?: string;        // 顧客のPAIN
    currentState?: string;      // 顧客の現状
    idealFuture?: string;       // 理想の未来
    usp?: string;               // USP
    belief?: string;            // Belief
    claim?: string;             // Claim
    generatedBy?: 'manual' | 'ai';
    aiAnswers?: {
      step1?: string;
      step2?: string;
      step3?: string;
      step4?: string;
    };
  };
}

export interface Subscriber {
  id?: string;
  email: string;
  productId: string;
  status: 'ACTIVE' | 'UNSUBSCRIBED' | 'BOUNCED';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Newsletters
export async function createNewsletter(data: Omit<Newsletter, 'id' | 'createdAt' | 'updatedAt'>) {
  const docRef = await addDoc(collection(db, 'newsletters'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getNewsletter(id: string): Promise<Newsletter | null> {
  const docRef = doc(db, 'newsletters', id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Newsletter;
  }

  return null;
}

export async function getUserNewsletters(userId: string): Promise<Newsletter[]> {
  try {
    const q = query(
      collection(db, 'newsletters'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Newsletter[];
  } catch (error) {
    console.error('Failed to get user newsletters:', error);
    return [];
  }
}

export async function updateNewsletter(id: string, data: Partial<Newsletter>) {
  const docRef = doc(db, 'newsletters', id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteNewsletter(id: string) {
  const docRef = doc(db, 'newsletters', id);
  await deleteDoc(docRef);
}

// Products
export async function createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
  const docRef = await addDoc(collection(db, 'products'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getProduct(id: string): Promise<Product | null> {
  const docRef = doc(db, 'products', id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Product;
  }

  return null;
}

export async function getUserProducts(userId: string): Promise<Product[]> {
  try {
    const q = query(
      collection(db, 'products'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Product[];
  } catch (error) {
    console.error('Failed to get user products:', error);
    return [];
  }
}

export async function updateProduct(id: string, data: Partial<Product>) {
  const docRef = doc(db, 'products', id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProduct(id: string) {
  const docRef = doc(db, 'products', id);
  await deleteDoc(docRef);
}

// Subscribers
export async function createSubscriber(data: Omit<Subscriber, 'id' | 'createdAt' | 'updatedAt'>) {
  const docRef = await addDoc(collection(db, 'subscribers'), {
    ...data,
    status: 'ACTIVE',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getProductSubscribers(productId: string): Promise<Subscriber[]> {
  const q = query(
    collection(db, 'subscribers'),
    where('productId', '==', productId),
    where('status', '==', 'ACTIVE')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Subscriber[];
}

export async function unsubscribe(subscriberId: string) {
  const docRef = doc(db, 'subscribers', subscriberId);
  await updateDoc(docRef, {
    status: 'UNSUBSCRIBED',
    updatedAt: serverTimestamp(),
  });
}

// Dashboard Stats
export async function getDashboardStats(userId: string) {
  const defaultStats = {
    newsletterCount: 0,
    productCount: 0,
    totalSubscribers: 0,
    sentCount: 0,
  };

  try {
    const newsletters = await getUserNewsletters(userId);
    const products = await getUserProducts(userId);

    const newsletterCount = newsletters.length;
    const productCount = products.length;
    const sentCount = newsletters.filter(n => n.status === 'SENT').length;

    // Count subscribers across all products
    let totalSubscribers = 0;
    for (const product of products) {
      if (product.id) {
        try {
          const subscribers = await getProductSubscribers(product.id);
          totalSubscribers += subscribers.length;
        } catch (error) {
          console.error('Failed to get subscribers for product:', product.id, error);
        }
      }
    }

    return {
      newsletterCount,
      productCount,
      totalSubscribers,
      sentCount,
    };
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    return defaultStats;
  }
}
