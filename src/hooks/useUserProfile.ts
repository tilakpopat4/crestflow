/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, deleteField } from 'firebase/firestore';
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

  const [privateSettings, setPrivateSettings] = useState<UserProfilePrivate | null>(() => {
    if (user?.uid) {
      try {
        const saved = localStorage.getItem(`crestflow_private_${user.uid}`);
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  // Sync private settings subcollection (API keys, bank details)
  useEffect(() => {
    if (!user) {
      setCachedProfile(null);
      setPrivateSettings(null);
      return;
    }
    try {
      const savedProfile = localStorage.getItem(`crestflow_profile_${user.uid}`);
      if (savedProfile) setCachedProfile(JSON.parse(savedProfile));
      const savedPrivate = localStorage.getItem(`crestflow_private_${user.uid}`);
      if (savedPrivate) setPrivateSettings(JSON.parse(savedPrivate));
    } catch {}

    const privateRef = doc(db, 'profiles', user.uid, 'private', 'settings');
    const unsubPrivate = onSnapshot(
      privateRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as UserProfilePrivate;
          setPrivateSettings(data);
          try {
            localStorage.setItem(`crestflow_private_${user.uid}`, safeStringify(data));
          } catch {}
        }
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

      if ((user.photoURL && !firestoreProf.photoURL) || (user.email && !firestoreProf.email) || firestoreProf.isPublicProfile !== true) {
        const enriched: UserProfile = {
          ...firestoreProf,
          isPublicProfile: true,
          ...(user.photoURL && !firestoreProf.photoURL ? { photoURL: user.photoURL } : {}),
          ...(user.email && !firestoreProf.email ? { email: user.email } : {}),
        };
        firestoreSaveProfile(enriched).catch((err) => console.warn('Auto-sync profile photo error:', err));
      }
    }
  }, [user, profiles, firestoreSaveProfile]);

  const rawProfile = profiles[0] || cachedProfile;

  // Memoize profile to avoid generating new references on every re-render
  const profile: UserProfile | null = useMemo(() => {
    if (!rawProfile) return null;
    return {
      ...rawProfile,
      photoURL: rawProfile.photoURL || user?.photoURL || undefined,
      email: rawProfile.email || user?.email || undefined,
      ...(privateSettings?.geminiApiKey ? { geminiApiKey: privateSettings.geminiApiKey } : {}),
      ...(privateSettings?.accountNumber ? { accountNumber: privateSettings.accountNumber } : {}),
      ...(privateSettings?.ifscCode ? { ifscCode: privateSettings.ifscCode } : {}),
      ...(privateSettings?.bankName ? { bankName: privateSettings.bankName } : {}),
    };
  }, [rawProfile, user?.photoURL, user?.email, privateSettings]);

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

    // Save public fields to root profiles document
    await firestoreSaveProfile({
      ...publicFields,
      isPublicProfile: true
    } as UserProfile);

    // Update in-memory private settings immediately to prevent stale empty reads
    const newPrivateSettings: UserProfilePrivate = {
      ...(privateSettings || {}),
      ...(geminiApiKey !== undefined && geminiApiKey.trim() !== '' ? { geminiApiKey: geminiApiKey.trim() } : {}),
      ...(accountNumber !== undefined && accountNumber.trim() !== '' ? { accountNumber: accountNumber.trim() } : {}),
      ...(ifscCode !== undefined && ifscCode.trim() !== '' ? { ifscCode: ifscCode.trim() } : {}),
      ...(bankName !== undefined && bankName.trim() !== '' ? { bankName: bankName.trim() } : {}),
    };

    if (geminiApiKey === undefined || geminiApiKey.trim() === '') {
      delete newPrivateSettings.geminiApiKey;
    }

    setPrivateSettings(newPrivateSettings);
    try {
      localStorage.setItem(`crestflow_private_${user.uid}`, safeStringify(newPrivateSettings));
    } catch {}

    // Save private credentials to subcollection document with deleteField support for removals
    const privateSettingsRef = doc(db, 'profiles', user.uid, 'private', 'settings');
    await setDoc(privateSettingsRef, {
      geminiApiKey: geminiApiKey && geminiApiKey.trim() ? geminiApiKey.trim() : deleteField(),
      accountNumber: accountNumber && accountNumber.trim() ? accountNumber.trim() : deleteField(),
      ifscCode: ifscCode && ifscCode.trim() ? ifscCode.trim() : deleteField(),
      bankName: bankName && bankName.trim() ? bankName.trim() : deleteField(),
      updatedAt: Date.now()
    }, { merge: true });
  };

  return {
    profile,
    profilesLoading,
    handleSaveProfile
  };
}
