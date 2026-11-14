import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

const STORAGE_KEY = 'crestflow_subscriptions_enabled';
const EVENT_NAME = 'crestflow:subscription-config-changed';

/**
 * Returns whether subscriptions are currently enabled.
 * Default is true (compulsory paywall active by default; users cannot use tool without paying).
 */
export function getSubscriptionFeatureEnabledSync(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val !== null) {
      return val === 'true';
    }
    return true;
  } catch {
    return true;
  }
}

/**
 * Updates the subscription master toggle.
 * Saves to localStorage, Firestore (system_settings/subscriptions), and broadcasts across the app.
 */
export async function setSubscriptionFeatureEnabled(enabled: boolean): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {}

  // Broadcast event in current window
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { enabled } }));

  // Persist to server endpoint /api/admin/settings (trusted path)
  try {
    const token = await auth.currentUser?.getIdToken();
    if (token) {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settingId: 'subscriptions',
          data: { isEnabled: enabled, updatedAt: Date.now() },
        }),
      });
      if (res.ok) return;
    }
    await setDoc(doc(db, 'system_settings', 'subscriptions'), {
      isEnabled: enabled,
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (err) {
    console.warn('[subscriptionConfig] Save warning:', err);
  }
}

/**
 * React hook to observe subscription enabled state in real time.
 */
export function useSubscriptionConfig() {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => getSubscriptionFeatureEnabledSync());
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. Listen to local broadcast event
    const handleLocal = (e: any) => {
      if (e?.detail?.enabled !== undefined) {
        setIsEnabled(Boolean(e.detail.enabled));
      }
    };
    window.addEventListener(EVENT_NAME, handleLocal);

    // 2. Listen to cross-tab storage event
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setIsEnabled(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorage);

    // 3. Listen to Firestore real-time doc
    let unsubscribe = () => {};
    try {
      unsubscribe = onSnapshot(doc(db, 'system_settings', 'subscriptions'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const remoteEnabled = data?.isEnabled !== undefined ? Boolean(data.isEnabled) : true;
          setIsEnabled(remoteEnabled);
          try {
            localStorage.setItem(STORAGE_KEY, remoteEnabled ? 'true' : 'false');
          } catch {}
        } else {
          setIsEnabled(true);
          try {
            localStorage.setItem(STORAGE_KEY, 'true');
          } catch {}
        }
        setLoading(false);
      }, (err) => {
        console.warn('[subscriptionConfig] onSnapshot error:', err);
        setIsEnabled(true);
        setLoading(false);
      });
    } catch {
      setIsEnabled(true);
      setLoading(false);
    }

    return () => {
      window.removeEventListener(EVENT_NAME, handleLocal);
      window.removeEventListener('storage', handleStorage);
      unsubscribe();
    };
  }, []);

  return {
    isEnabled,
    setEnabled: setSubscriptionFeatureEnabled,
    loading
  };
}
