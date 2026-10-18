import { useState, useEffect } from 'react';
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

import { useSupabase } from './useSupabase';

export function useFirestore<T extends { id: string }>(collectionName: string, userId?: string) {
  const supabaseHook = useSupabase<T>(collectionName, userId);
  return supabaseHook;
}
