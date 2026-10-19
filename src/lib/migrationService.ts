import { db, auth, googleProvider } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { supabase } from './supabase';
import { toSnakeCase } from '../hooks/useSupabase';

export interface MigrationSummary {
  clients: number;
  workItems: number;
  invoices: number;
  stickyNotes: number;
  clientReviews: number;
  serviceRequests: number;
  profile: boolean;
  sourceFirebaseUid?: string;
}

/**
 * Finds the user's previous Firebase UID from local storage or active auth session.
 */
export function detectPreviousFirebaseUid(currentSupabaseUid: string): string | null {
  if (typeof window === 'undefined') return null;

  // 1. If Firebase Auth is already signed in and its UID differs from Supabase UUID
  if (auth.currentUser?.uid && auth.currentUser.uid !== currentSupabaseUid) {
    return auth.currentUser.uid;
  }

  // 2. Scan localStorage for crestflow_profile_* keys
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('crestflow_profile_') && !key.includes('completed') && !key.includes('dismissed')) {
        const potentialUid = key.replace('crestflow_profile_', '');
        if (potentialUid && potentialUid !== currentSupabaseUid && potentialUid.length > 5) {
          return potentialUid;
        }
      }
    }
  } catch (e) {
    console.warn('[Migration] Error inspecting localStorage for previous UID:', e);
  }

  return null;
}

/**
 * Migrates all data for the user from Firebase Firestore into Supabase PostgreSQL.
 */
export async function migrateFirestoreToSupabase(targetSupabaseUid: string): Promise<MigrationSummary> {
  if (!targetSupabaseUid) {
    throw new Error('Supabase User ID is required for data migration.');
  }

  // Attempt to authenticate Firebase using Supabase Google provider token if available
  if (!auth.currentUser) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.provider_token) {
        const cred = GoogleAuthProvider.credential(null, session.provider_token);
        await signInWithCredential(auth, cred);
        console.log('[Migration] Silently authenticated Firebase with Google provider token. Firebase UID:', auth.currentUser?.uid);
      }
    } catch (authErr) {
      console.warn('[Migration] Silent Firebase auth via provider_token failed:', authErr);
    }
  }

  // Detect previous Firebase UID
  let sourceFirebaseUid = auth.currentUser?.uid || detectPreviousFirebaseUid(targetSupabaseUid);

  // If still not signed in to Firebase and cannot detect UID, trigger quick Firebase Google popup
  if (!sourceFirebaseUid && !auth.currentUser) {
    try {
      console.log('[Migration] Prompting Google popup to connect to Firebase Firestore...');
      const res = await signInWithPopup(auth, googleProvider);
      sourceFirebaseUid = res.user.uid;
    } catch (popupErr: any) {
      console.warn('[Migration] Popup auth failed or cancelled:', popupErr);
    }
  }

  console.log(`[Migration] Migrating from Firebase UID [${sourceFirebaseUid || 'unknown'}] to Supabase UUID [${targetSupabaseUid}]`);

  const summary: MigrationSummary = {
    clients: 0,
    workItems: 0,
    invoices: 0,
    stickyNotes: 0,
    clientReviews: 0,
    serviceRequests: 0,
    profile: false,
    sourceFirebaseUid: sourceFirebaseUid || undefined,
  };

  // Helper to fetch collection items for the given UID (or try both source & target UIDs)
  async function fetchFirestoreCollection(collectionName: string): Promise<any[]> {
    const candidateUids = Array.from(new Set([sourceFirebaseUid, targetSupabaseUid].filter(Boolean))) as string[];
    const itemsMap = new Map<string, any>();

    for (const uid of candidateUids) {
      try {
        const q = query(collection(db, collectionName), where('userId', '==', uid));
        const snap = await getDocs(q);
        snap.forEach((d) => {
          if (!itemsMap.has(d.id)) {
            itemsMap.set(d.id, { id: d.id, ...d.data() });
          }
        });
      } catch (e) {
        console.warn(`[Migration] Error fetching ${collectionName} with uid ${uid}:`, e);
      }
    }

    return Array.from(itemsMap.values());
  }

  // 1. Migrate Profile
  try {
    const profiles = await fetchFirestoreCollection('userProfiles');
    if (profiles.length > 0) {
      const p = profiles[0];
      const snakeProfile = toSnakeCase({ ...p, id: targetSupabaseUid });
      const { error } = await supabase.from('profiles').upsert(snakeProfile, { onConflict: 'id' });
      if (!error) summary.profile = true;
    }
  } catch (err) {
    console.error('[Migration] Profile migration error:', err);
  }

  // 2. Migrate Clients
  try {
    const clients = await fetchFirestoreCollection('clients');
    if (clients.length > 0) {
      const snakeClients = clients.map((c) => toSnakeCase({ ...c, userId: targetSupabaseUid }));
      const { error } = await supabase.from('clients').upsert(snakeClients, { onConflict: 'id' });
      if (!error) summary.clients = clients.length;
      else console.error('[Migration] Supabase clients upsert error:', error);
    }
  } catch (err) {
    console.error('[Migration] Clients migration error:', err);
  }

  // 3. Migrate Work Items
  try {
    const workItems = await fetchFirestoreCollection('workItems');
    if (workItems.length > 0) {
      const snakeItems = workItems.map((w) => toSnakeCase({ ...w, userId: targetSupabaseUid }));
      const { error } = await supabase.from('work_items').upsert(snakeItems, { onConflict: 'id' });
      if (!error) summary.workItems = workItems.length;
      else console.error('[Migration] Supabase work items upsert error:', error);
    }
  } catch (err) {
    console.error('[Migration] Work items migration error:', err);
  }

  // 4. Migrate Invoices
  try {
    const invoices = await fetchFirestoreCollection('invoices');
    if (invoices.length > 0) {
      const snakeInvoices = invoices.map((inv) => toSnakeCase({ ...inv, userId: targetSupabaseUid }));
      const { error } = await supabase.from('invoices').upsert(snakeInvoices, { onConflict: 'id' });
      if (!error) summary.invoices = invoices.length;
      else console.error('[Migration] Supabase invoices upsert error:', error);
    }
  } catch (err) {
    console.error('[Migration] Invoices migration error:', err);
  }

  // 5. Migrate Sticky Notes
  try {
    const stickyNotes = await fetchFirestoreCollection('stickyNotes');
    if (stickyNotes.length > 0) {
      const snakeNotes = stickyNotes.map((n) => toSnakeCase({ ...n, userId: targetSupabaseUid }));
      const { error } = await supabase.from('sticky_notes').upsert(snakeNotes, { onConflict: 'id' });
      if (!error) summary.stickyNotes = stickyNotes.length;
    }
  } catch (err) {
    console.error('[Migration] Sticky notes migration error:', err);
  }

  // 6. Migrate Client Reviews
  try {
    const reviews = await fetchFirestoreCollection('clientReviews');
    if (reviews.length > 0) {
      const snakeReviews = reviews.map((r) => toSnakeCase({ ...r, userId: targetSupabaseUid }));
      const { error } = await supabase.from('client_reviews').upsert(snakeReviews, { onConflict: 'id' });
      if (!error) summary.clientReviews = reviews.length;
    }
  } catch (err) {
    console.error('[Migration] Client reviews migration error:', err);
  }

  // 7. Migrate Service Requests
  try {
    const requests = await fetchFirestoreCollection('serviceRequests');
    if (requests.length > 0) {
      const snakeRequests = requests.map((req) => toSnakeCase({ ...req, userId: targetSupabaseUid }));
      const { error } = await supabase.from('service_requests').upsert(snakeRequests, { onConflict: 'id' });
      if (!error) summary.serviceRequests = requests.length;
    }
  } catch (err) {
    console.error('[Migration] Service requests migration error:', err);
  }

  console.log('[Migration] Migration completed successfully:', summary);
  return summary;
}
