/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase';
import { safeStringify, sanitizePayload } from './useFirestore';
import { UserProfile, UserProfilePrivate } from '../types';

/**
 * Hook for managing the authenticated user's profile and private settings.
 * Directly listens to and writes to doc(db, 'profiles', user.uid) with { merge: true }
 * to prevent security rules permission denials on protected subscription fields.
 */
export function useUserProfile(user: User | null) {
  const [firestoreProfile, setFirestoreProfile] = useState<UserProfile | null>(null);
  const [profilesLoading, setProfilesLoading] = useState(true);

  // Initialize cached public profile from localStorage
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

  // Initialize cached private settings (API keys, bank details) from localStorage
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

  // Listen directly to doc(db, 'profiles', user.uid) for real-time public profile updates
  useEffect(() => {
    if (!user) {
      setFirestoreProfile(null);
      setCachedProfile(null);
      setPrivateSettings(null);
      setProfilesLoading(false);
      return;
    }

    setProfilesLoading(true);

    // Read stored caches
    try {
      const savedProfile = localStorage.getItem(`crestflow_profile_${user.uid}`);
      if (savedProfile) setCachedProfile(JSON.parse(savedProfile));
      const savedPrivate = localStorage.getItem(`crestflow_private_${user.uid}`);
      if (savedPrivate) setPrivateSettings(JSON.parse(savedPrivate));
    } catch {}

    const profileRef = doc(db, 'profiles', user.uid);
    const unsubProfile = onSnapshot(
      profileRef,
      (snap) => {
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() } as UserProfile;
          setFirestoreProfile(data);
          setCachedProfile(data);
          try {
            localStorage.setItem(`crestflow_profile_${user.uid}`, safeStringify(data));
            localStorage.setItem(`crestflow_profile_completed_${user.uid}`, 'true');
          } catch {}

          // Auto-sync Google photoURL/email if missing from stored profile
          if (
            (user.photoURL && !data.photoURL) ||
            (user.email && !data.email) ||
            data.isPublicProfile !== true
          ) {
            const enriched = {
              photoURL: user.photoURL || undefined,
              email: user.email || undefined,
              isPublicProfile: true,
            };
            setDoc(profileRef, sanitizePayload(enriched), { merge: true }).catch((err) =>
              console.warn('Auto-sync profile photo error:', err)
            );
          }

          // Trigger automated welcome greeting email once per user
          const welcomeKey = `crestflow_welcome_sent_${user.uid}`;
          if (!localStorage.getItem(welcomeKey)) {
            user.getIdToken().then((token) => {
              fetch('/api/notify/welcome', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              })
                .then((r) => r.json())
                .then(() => localStorage.setItem(welcomeKey, 'true'))
                .catch((err) => console.warn('Welcome email dispatch error:', err));
            }).catch(() => {});
          }
        }
        setProfilesLoading(false);
      },
      (err) => {
        console.warn('Profile snapshot read error:', err);
        setProfilesLoading(false);
      }
    );

    // Listen to private settings subcollection (API keys, bank accounts)
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

    return () => {
      unsubProfile();
      unsubPrivate();
    };
  }, [user]);

  const rawProfile = firestoreProfile || cachedProfile;

  // Memoize composed profile object with private credentials
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

  /**
   * Saves updated profile fields to Firestore with { merge: true }
   * and immediately updates cache & memory state for instant UI consistency.
   */
  const handleSaveProfile = async (updatedProfile: UserProfile) => {
    if (!user) return;

    const profileWithMeta: UserProfile = {
      ...updatedProfile,
      id: user.uid,
      userId: user.uid,
      isPublicProfile: true,
      ...(user.photoURL && !updatedProfile.photoURL ? { photoURL: user.photoURL } : {}),
      ...(user.email && !updatedProfile.email ? { email: user.email } : {}),
    };

    // 1. Immediately update cache & local state for instant feedback
    setCachedProfile(profileWithMeta);
    setFirestoreProfile(profileWithMeta);
    try {
      localStorage.setItem(`crestflow_profile_${user.uid}`, safeStringify(profileWithMeta));
      localStorage.setItem(`crestflow_profile_completed_${user.uid}`, 'true');
    } catch {}

    const { geminiApiKey, accountNumber, ifscCode, bankName, ...publicFields } = profileWithMeta;

    // 2. Save public fields to root profiles document with merge: true
    // Using merge: true prevents deleting protected subscription fields
    const profileRef = doc(db, 'profiles', user.uid);
    const sanitizedPublic = sanitizePayload({
      ...publicFields,
      userId: user.uid,
      isPublicProfile: true,
    });
    await setDoc(profileRef, sanitizedPublic, { merge: true });

    // 3. Update private settings in-memory & cache
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

    // 4. Save private settings document with deleteField support for removals
    const privateSettingsRef = doc(db, 'profiles', user.uid, 'private', 'settings');
    const privateDocData: Record<string, any> = {
      updatedAt: Date.now(),
    };

    if (geminiApiKey && geminiApiKey.trim()) {
      privateDocData.geminiApiKey = geminiApiKey.trim();
    } else if (privateSettings?.geminiApiKey) {
      privateDocData.geminiApiKey = deleteField();
    }

    if (accountNumber && accountNumber.trim()) {
      privateDocData.accountNumber = accountNumber.trim();
    } else if (privateSettings?.accountNumber) {
      privateDocData.accountNumber = deleteField();
    }

    if (ifscCode && ifscCode.trim()) {
      privateDocData.ifscCode = ifscCode.trim();
    } else if (privateSettings?.ifscCode) {
      privateDocData.ifscCode = deleteField();
    }

    if (bankName && bankName.trim()) {
      privateDocData.bankName = bankName.trim();
    } else if (privateSettings?.bankName) {
      privateDocData.bankName = deleteField();
    }

    await setDoc(privateSettingsRef, privateDocData, { merge: true });
  };

  return {
    profile,
    profilesLoading,
    handleSaveProfile,
  };
}
