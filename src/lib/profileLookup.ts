import { UserProfile } from '../types';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Asynchronously looks up a UserProfile by document ID, username handle, userId, or email prefix.
 */
export async function lookupPublicProfile(identifier: string): Promise<UserProfile | null> {
  const cleanIdent = identifier.trim().toLowerCase();

  // 1. Direct doc fetch by docId
  try {
    const docRef = doc(db, 'profiles', identifier.trim());
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as UserProfile;
    }
  } catch {
    // Continue to query fallbacks
  }

  // 2. Query by custom username handle
  try {
    const q = query(collection(db, 'profiles'), where('username', '==', cleanIdent));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as UserProfile;
    }
  } catch (err) {
    console.warn('[lookupPublicProfile] username query failed:', err);
  }

  // 3. Query by userId == identifier
  try {
    const q = query(collection(db, 'profiles'), where('userId', '==', identifier.trim()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as UserProfile;
    }
  } catch (err) {
    console.warn('[lookupPublicProfile] userId query failed:', err);
  }

  // 4. Query by email prefix fallback (e.g. tilakpopat2007 -> tilakpopat2007@gmail.com)
  if (!cleanIdent.includes('@')) {
    try {
      const q = query(collection(db, 'profiles'), where('email', '==', `${cleanIdent}@gmail.com`));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { id: snap.docs[0].id, ...snap.docs[0].data() } as UserProfile;
      }
    } catch (err) {
      console.warn('[lookupPublicProfile] email fallback query failed:', err);
    }
  }

  return null;
}
