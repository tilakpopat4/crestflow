import { UserProfile } from '../types';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Asynchronously looks up a public UserProfile by document ID, username handle, or userId.
 * Queries public_profiles collection (accessible to all devices) and falls back to /api/public-profile.
 */
export async function lookupPublicProfile(identifier: string): Promise<UserProfile | null> {
  if (!identifier || !identifier.trim()) return null;
  const cleanIdent = identifier.trim().toLowerCase();
  const rawIdent = identifier.trim();

  // 1. Direct doc fetch from public_profiles by username handle or userId
  try {
    const docRef = doc(db, 'public_profiles', cleanIdent);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as UserProfile;
    }
    if (cleanIdent !== rawIdent) {
      const rawRef = doc(db, 'public_profiles', rawIdent);
      const rawSnap = await getDoc(rawRef);
      if (rawSnap.exists()) {
        return { id: rawSnap.id, ...rawSnap.data() } as UserProfile;
      }
    }
  } catch (err) {
    console.warn('[lookupPublicProfile] public_profiles direct fetch failed:', err);
  }

  // 2. Query public_profiles by username or userId
  try {
    const qUser = query(collection(db, 'public_profiles'), where('username', '==', cleanIdent));
    const snapUser = await getDocs(qUser);
    if (!snapUser.empty) {
      return { id: snapUser.docs[0].id, ...snapUser.docs[0].data() } as UserProfile;
    }

    const qUid = query(collection(db, 'public_profiles'), where('userId', '==', rawIdent));
    const snapUid = await getDocs(qUid);
    if (!snapUid.empty) {
      return { id: snapUid.docs[0].id, ...snapUid.docs[0].data() } as UserProfile;
    }
  } catch (err) {
    console.warn('[lookupPublicProfile] public_profiles query failed:', err);
  }

  // 3. Worker API fallback: GET /api/public-profile?handle=...
  try {
    const apiRes = await fetch(`/api/public-profile?handle=${encodeURIComponent(cleanIdent)}`);
    if (apiRes.ok) {
      const json = await apiRes.json() as { success?: boolean; profile?: UserProfile };
      if (json.success && json.profile) {
        return json.profile;
      }
    }
  } catch (apiErr) {
    console.warn('[lookupPublicProfile] /api/public-profile failed:', apiErr);
  }

  // 4. Fallback for authenticated user viewing their own profile via profiles collection
  try {
    const docRef = doc(db, 'profiles', rawIdent);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as UserProfile;
    }
  } catch {
    // Expected to fail with PERMISSION_DENIED for unauthenticated visitors
  }

  return null;
}
