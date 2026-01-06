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
  scheduledAt?: Timestamp | null;
  sentAt?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Product {
  id?: string;
  userId: string;
  name: string;
  description: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
  const newsletters = await getUserNewsletters(userId);
  const products = await getUserProducts(userId);

  const newsletterCount = newsletters.length;
  const productCount = products.length;
  const sentCount = newsletters.filter(n => n.status === 'SENT').length;

  // Count subscribers across all products
  let totalSubscribers = 0;
  for (const product of products) {
    if (product.id) {
      const subscribers = await getProductSubscribers(product.id);
      totalSubscribers += subscribers.length;
    }
  }

  return {
    newsletterCount,
    productCount,
    totalSubscribers,
    sentCount,
  };
}
