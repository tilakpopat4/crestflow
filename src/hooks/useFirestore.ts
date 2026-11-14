import { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

export function safeStringify(val: any): string {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'string') return val;
  if (typeof val !== 'object') return String(val);

  try {
    const seen = new Set();
    return JSON.stringify(val, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
        if (typeof window !== 'undefined' && (value instanceof Element || value === window || value instanceof Node || (value as any).nodeType)) {
          return '[DOM Element]';
        }
      }
      if (typeof value === 'function') {
        return undefined;
      }
      return value;
    });
  } catch {
    try {
      return String(val);
    } catch {
      return '[Unserializable]';
    }
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  let errorMessage = 'Unknown error';
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'object' && error !== null) {
    errorMessage = (error as any).message || (error as any).code || String(error);
  } else if (error !== undefined && error !== null) {
    errorMessage = String(error);
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
    },
    operationType,
    path,
  };
  
  const serialized = safeStringify(errInfo);
  console.error('Firestore Error Details:', serialized);
  return new Error(errorMessage);
}

// Deep clean payload to remove undefined fields recursively (including nested objects & arrays) which cause Firestore errors
export function sanitizePayload(val: any): any {
  if (val === undefined) {
    return null;
  }
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (val instanceof Date) {
    return val;
  }
  if (Array.isArray(val)) {
    return val
      .filter((item) => item !== undefined)
      .map((item) => sanitizePayload(item));
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(val)) {
    if (value !== undefined) {
      const sanitized = sanitizePayload(value);
      if (sanitized !== undefined) {
        clean[key] = sanitized;
      }
    }
  }
  return clean;
}

export function useFirestore<T extends { id: string }>(collectionName: string, userId?: string) {
  const getInitialCache = (): { items: T[]; hasCache: boolean } => {
    if (!userId || typeof window === 'undefined') return { items: [], hasCache: false };
    try {
      const raw = localStorage.getItem(`crestflow_cache_${userId}_${collectionName}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return { items: parsed, hasCache: true };
      }
    } catch {}
    return { items: [], hasCache: false };
  };

  const initial = useMemo(() => getInitialCache(), [collectionName, userId]);
  const [data, setData] = useState<T[]>(initial.items);
  const [loading, setLoading] = useState<boolean>(!initial.hasCache);
  const [error, setError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);

  useEffect(() => {
    if (!userId) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }
    
    // Seed from cache if available to prevent 3-4 second blank screen
    const cache = getInitialCache();
    if (cache.hasCache && data.length === 0) {
      setData(cache.items);
      setLoading(false);
    } else if (!cache.hasCache && data.length === 0) {
      setLoading(true);
    }
    setError(null);

    let isSubscribed = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const q = query(collection(db, collectionName), where("userId", "==", userId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!isSubscribed) return;
        const items: T[] = [];
        snapshot.forEach((docSnapshot) => {
          items.push({ id: docSnapshot.id, ...docSnapshot.data() } as T);
        });
        setData(items);
        setLoading(false);
        setError(null);
        try {
          if (typeof window !== 'undefined' && userId) {
            localStorage.setItem(`crestflow_cache_${userId}_${collectionName}`, JSON.stringify(items));
          }
        } catch {}
      },
      (err) => {
        if (!isSubscribed) return;
        const formattedErr = handleFirestoreError(err, OperationType.GET, collectionName);
        console.warn(`[useFirestore:${collectionName}] Snapshot warning:`, formattedErr.message);
        setError(formattedErr.message);
        setLoading(false);

        // Auto retry with exponential backoff on connection disconnect (1.5s, 3s, 6s)
        const delay = Math.min(1500 * Math.pow(2, retryAttempt), 6000);
        retryTimer = setTimeout(() => {
          if (isSubscribed) {
            setRetryAttempt((prev) => prev + 1);
          }
        }, delay);
      }
    );

    return () => {
      isSubscribed = false;
      if (retryTimer) clearTimeout(retryTimer);
      unsubscribe();
    };
  }, [collectionName, userId, retryAttempt]);

  const addOrUpdateItem = async (item: T) => {
    if (!userId) return;
    try {
      const sanitized = sanitizePayload({ ...item, userId });
      // Optimistic update for instant UI feedback
      setData((prev) => {
        const idx = prev.findIndex((i) => i.id === item.id);
        const next = idx >= 0 ? prev.map((i, iIdx) => (iIdx === idx ? { ...item, userId } : i)) : [...prev, { ...item, userId }];
        try {
          localStorage.setItem(`crestflow_cache_${userId}_${collectionName}`, JSON.stringify(next));
        } catch {}
        return next;
      });
      await setDoc(doc(db, collectionName, item.id), sanitized, { merge: true });
    } catch (err) {
      throw handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${item.id}`);
    }
  };

  const removeItem = async (id: string) => {
    if (!userId) return;
    try {
      setData((prev) => {
        const next = prev.filter((i) => i.id !== id);
        try {
          localStorage.setItem(`crestflow_cache_${userId}_${collectionName}`, JSON.stringify(next));
        } catch {}
        return next;
      });
      await deleteDoc(doc(db, collectionName, id));
    } catch (err) {
      throw handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
    }
  };
  
  // Scalable chunking for batch operations (max 400 writes per batch to respect 500 limit)
  const batchReplaceAll = async (items: T[]) => {
    if (!userId || items.length === 0) return;
    try {
      const CHUNK_SIZE = 400;
      for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        const chunk = items.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((item) => {
          const docRef = doc(db, collectionName, item.id);
          const sanitized = sanitizePayload({ ...item, userId });
          batch.set(docRef, sanitized);
        });
        await batch.commit();
      }
      setData(items);
      try {
        localStorage.setItem(`crestflow_cache_${userId}_${collectionName}`, JSON.stringify(items));
      } catch {}
    } catch (err) {
      throw handleFirestoreError(err, OperationType.WRITE, collectionName);
    }
  };

  return { data, loading, error, addOrUpdateItem, removeItem, batchReplaceAll };
}
