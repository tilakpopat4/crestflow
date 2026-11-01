import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';

export function useAuthSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isBlocked, setIsBlocked] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setIsBlocked(false);
      return;
    }
    const unsub = onSnapshot(
      doc(db, 'blocked_users', user.uid),
      (snap) => {
        setIsBlocked(snap.exists());
      },
      () => setIsBlocked(false)
    );
    return () => unsub();
  }, [user]);

  const handleLogin = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res?.user) {
        const u = res.user;
        const profileRef = doc(db, 'profiles', u.uid);
        const initialData = {
          id: u.uid,
          userId: u.uid,
          name: u.displayName || (u.email ? u.email.split('@')[0] : 'Freelancer'),
          email: u.email || '',
          photoURL: u.photoURL || '',
          isPublicProfile: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setDoc(profileRef, initialData, { merge: true }).catch((err) => {
          console.warn('Initial profile upsert on login error:', err);
        });
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        alert(`Sign in error: ${err.message}`);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }
  };

  return {
    user,
    loading,
    isSigningIn,
    isBlocked,
    handleLogin,
    handleLogout,
  };
}
