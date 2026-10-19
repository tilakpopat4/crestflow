import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

const STORAGE_KEY = 'crestflow_subscriptions_enabled';
const EVENT_NAME = 'crestflow:subscription-config-changed';

/**
 * Returns whether subscriptions are currently enabled.
 * Default is false (subscriptions disabled until explicitly enabled in admin portal).
 */
export function getSubscriptionFeatureEnabledSync(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val === 'true';
  } catch {
    return false;
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

  // Persist to Firestore
  try {
    await setDoc(doc(db, 'system_settings', 'subscriptions'), {
      isEnabled: enabled,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (err) {
    console.warn('[subscriptionConfig] Firestore save warning:', err);
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
          const remoteEnabled = Boolean(data?.isEnabled);
          setIsEnabled(remoteEnabled);
          try {
            localStorage.setItem(STORAGE_KEY, remoteEnabled ? 'true' : 'false');
          } catch {}
        }
        setLoading(false);
      }, (err) => {
        console.warn('[subscriptionConfig] onSnapshot error:', err);
        setLoading(false);
      });
    } catch {
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
