import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestore, safeStringify } from './useFirestore';
import { UserProfile, UserProfilePrivate } from '../types';

export function useUserProfile(user: User | null) {
  const { data: profiles, loading: profilesLoading, addOrUpdateItem: firestoreSaveProfile } = useFirestore<UserProfile>('profiles', user?.uid);

  const [cachedProfile, setCachedProfile] = useState<UserProfile | null>(() => {
    if (user?.uid) {
      try {
        const saved = localStorage.getItem(`crestflow_profile_${user.uid}`);
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [privateSettings, setPrivateSettings] = useState<UserProfilePrivate | null>(null);

  // Sync private settings subcollection (API keys, bank details)
  useEffect(() => {
    if (!user) {
      setCachedProfile(null);
      setPrivateSettings(null);
      return;
    }
    try {
      const saved = localStorage.getItem(`crestflow_profile_${user.uid}`);
      if (saved) setCachedProfile(JSON.parse(saved));
    } catch {}

    const privateRef = doc(db, 'profiles', user.uid, 'private', 'settings');
    const unsubPrivate = onSnapshot(
      privateRef,
      (snap) => {
        if (snap.exists()) setPrivateSettings(snap.data() as UserProfilePrivate);
      },
      (err) => console.warn('Private settings read error:', err)
    );

    return () => unsubPrivate();
  }, [user]);

  // Sync public Firestore profile to cache & auto-sync Google photoURL if missing
  useEffect(() => {
    if (user && profiles.length > 0) {
      const firestoreProf = profiles[0];
      setCachedProfile(firestoreProf);
      try {
        localStorage.setItem(`crestflow_profile_${user.uid}`, safeStringify(firestoreProf));
        localStorage.setItem(`crestflow_profile_completed_${user.uid}`, 'true');
      } catch {}

      if ((user.photoURL && !firestoreProf.photoURL) || (user.email && !firestoreProf.email)) {
        const enriched: UserProfile = {
          ...firestoreProf,
          ...(user.photoURL && !firestoreProf.photoURL ? { photoURL: user.photoURL } : {}),
          ...(user.email && !firestoreProf.email ? { email: user.email } : {}),
        };
        firestoreSaveProfile(enriched).catch((err) => console.warn('Auto-sync profile photo error:', err));
      }
    }
  }, [user, profiles, firestoreSaveProfile]);

  const rawProfile = profiles[0] || cachedProfile;
  const profile: UserProfile | null = rawProfile ? {
    ...rawProfile,
    photoURL: rawProfile.photoURL || user?.photoURL || undefined,
    email: rawProfile.email || user?.email || undefined,
    ...(privateSettings?.geminiApiKey ? { geminiApiKey: privateSettings.geminiApiKey } : {}),
    ...(privateSettings?.accountNumber ? { accountNumber: privateSettings.accountNumber } : {}),
    ...(privateSettings?.ifscCode ? { ifscCode: privateSettings.ifscCode } : {}),
    ...(privateSettings?.bankName ? { bankName: privateSettings.bankName } : {}),
  } : null;

  const handleSaveProfile = async (updatedProfile: UserProfile) => {
    if (!user) return;
    const profileWithMeta: UserProfile = {
      ...updatedProfile,
      ...(user.photoURL && !updatedProfile.photoURL ? { photoURL: user.photoURL } : {}),
      ...(user.email && !updatedProfile.email ? { email: user.email } : {}),
    };
    setCachedProfile(profileWithMeta);
    try {
      localStorage.setItem(`crestflow_profile_${user.uid}`, safeStringify(profileWithMeta));
      localStorage.setItem(`crestflow_profile_completed_${user.uid}`, 'true');
    } catch {}

    const { geminiApiKey, accountNumber, ifscCode, bankName, ...publicFields } = profileWithMeta;
    await firestoreSaveProfile(publicFields as UserProfile);

    const privateSettingsRef = doc(db, 'profiles', user.uid, 'private', 'settings');
    await setDoc(privateSettingsRef, {
      ...(geminiApiKey !== undefined ? { geminiApiKey } : {}),
      ...(accountNumber !== undefined ? { accountNumber } : {}),
      ...(ifscCode !== undefined ? { ifscCode } : {}),
      ...(bankName !== undefined ? { bankName } : {}),
      updatedAt: Date.now()
    }, { merge: true });
  };

  return {
    profile,
    profilesLoading,
    handleSaveProfile
  };
}
