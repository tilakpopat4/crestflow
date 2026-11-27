import { useState, useEffect } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';

export function useAuthSession() {
  const [user, setUser] = useState<User | null>(() => auth.currentUser || null);
  const [loading, setLoading] = useState<boolean>(() => !auth.currentUser);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isBlocked, setIsBlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('crestflow_is_blocked') === 'true';
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser?.uid) {
        const profileRef = doc(db, 'profiles', currentUser.uid);
        const data = {
          id: currentUser.uid,
          userId: currentUser.uid,
          name: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Freelancer'),
          email: currentUser.email || '',
          photoURL: currentUser.photoURL || '',
          isPublicProfile: true,
          updatedAt: Date.now(),
        };
        setDoc(profileRef, data, { merge: true }).catch((err) =>
          console.warn('Auto profile sync on auth state change error:', err)
        );
      }
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
        const blocked = snap.exists();
        setIsBlocked(blocked);
        try {
          if (blocked) {
            localStorage.setItem('crestflow_is_blocked', 'true');
          } else {
            localStorage.removeItem('crestflow_is_blocked');
          }
        } catch {}
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

  const handleEmailSignUp = async (email: string, pass: string, name?: string): Promise<{ success: boolean; error?: string }> => {
    if (isSigningIn) return { success: false, error: 'Auth in progress' };
    setIsSigningIn(true);
    try {
      const res = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      if (res.user) {
        if (name && name.trim()) {
          try {
            await updateProfile(res.user, { displayName: name.trim() });
          } catch {}
        }
        const profileRef = doc(db, 'profiles', res.user.uid);
        const initialData = {
          id: res.user.uid,
          userId: res.user.uid,
          name: name?.trim() || email.split('@')[0],
          email: email.trim().toLowerCase(),
          photoURL: '',
          isPublicProfile: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await setDoc(profileRef, initialData, { merge: true });
      }
      return { success: true };
    } catch (err: any) {
      let msg = err.message || 'Registration failed';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = 'Email/Password accounts are currently disabled in Firebase Console. Please sign in using "Continue with Google" or enable Email/Password in Firebase Console.';
      }
      return { success: false, error: msg };
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleEmailSignIn = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    if (isSigningIn) return { success: false, error: 'Auth in progress' };
    setIsSigningIn(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
      return { success: true };
    } catch (err: any) {
      let msg = err.message || 'Sign in failed';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password. Please verify your credentials.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many failed login attempts. Please try again later or reset password.';
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = 'Email/Password sign-in is not enabled in Firebase Console. Please sign in with Google or enable Email/Password provider in Firebase Console.';
      }
      return { success: false, error: msg };
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
    handleEmailSignUp,
    handleEmailSignIn,
    handleLogout,
  };
}
