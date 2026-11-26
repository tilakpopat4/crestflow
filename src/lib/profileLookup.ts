import { UserProfile } from '../types';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export interface PublicProfileLookupResult {
  profile: UserProfile;
  acceptingRequests: boolean;
  stats?: {
    clientsCount: number;
  };
}

/**
 * Resolves a public creator profile together with live inbound request availability.
 * Checks /api/public-profile first (authoritative entitlement 30-day inactivity check),
 * falling back cleanly to public_profiles in Firestore if unreachable.
 */
export async function lookupPublicProfileWithStatus(
  identifier: string,
): Promise<PublicProfileLookupResult | null> {
  if (!identifier || !identifier.trim()) return null;
  const cleanIdent = identifier.trim().toLowerCase();
  const rawIdent = identifier.trim();

  // 1. Worker API: GET /api/public-profile?handle=... (returns acceptingRequests & stats)
  try {
    const apiRes = await fetch(`/api/public-profile?handle=${encodeURIComponent(rawIdent)}`);
    if (apiRes.ok) {
      const json = (await apiRes.json()) as {
        success?: boolean;
        profile?: UserProfile;
        acceptingRequests?: boolean;
        stats?: { clientsCount?: number };
      };
      if (json.success && json.profile) {
        return {
          profile: json.profile,
          acceptingRequests: json.acceptingRequests !== false,
          stats:
            typeof json.stats?.clientsCount === 'number'
              ? { clientsCount: json.stats.clientsCount }
              : undefined,
        };
      }
    }
  } catch {
    // Fallback to Firestore public_profiles when API is offline
  }

  // 2. Direct doc fetch from public_profiles by username handle or userId
  try {
    const docRef = doc(db, 'public_profiles', cleanIdent);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { profile: { id: docSnap.id, ...docSnap.data() } as UserProfile, acceptingRequests: true };
    }
    if (cleanIdent !== rawIdent) {
      const rawRef = doc(db, 'public_profiles', rawIdent);
      const rawSnap = await getDoc(rawRef);
      if (rawSnap.exists()) {
        return { profile: { id: rawSnap.id, ...rawSnap.data() } as UserProfile, acceptingRequests: true };
      }
    }
  } catch {
    // Continue fallback queries
  }

  // 3. Query public_profiles by username or userId
  try {
    const qUser = query(collection(db, 'public_profiles'), where('username', '==', cleanIdent));
    const snapUser = await getDocs(qUser);
    if (!snapUser.empty) {
      return {
        profile: { id: snapUser.docs[0].id, ...snapUser.docs[0].data() } as UserProfile,
        acceptingRequests: true,
      };
    }

    const qUid = query(collection(db, 'public_profiles'), where('userId', '==', rawIdent));
    const snapUid = await getDocs(qUid);
    if (!snapUid.empty) {
      return {
        profile: { id: snapUid.docs[0].id, ...snapUid.docs[0].data() } as UserProfile,
        acceptingRequests: true,
      };
    }
  } catch {
    // Expected if offline
  }

  // 4. Fallback for authenticated owner viewing own profile
  try {
    const docRef = doc(db, 'profiles', rawIdent);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { profile: { id: docSnap.id, ...docSnap.data() } as UserProfile, acceptingRequests: true };
    }
  } catch {
    // Expected PERMISSION_DENIED for unauthenticated visitors
  }

  return null;
}

/**
 * Legacy helper preserving UserProfile | null return signature.
 */
export async function lookupPublicProfile(identifier: string): Promise<UserProfile | null> {
  const res = await lookupPublicProfileWithStatus(identifier);
  return res?.profile || null;
}
