import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

const STORAGE_KEY = 'crestflow_ai_summarizer_enabled';
const EVENT_NAME = 'crestflow:ai-summarizer-config-changed';

let memoryFallbackValue = false;
const isNode = typeof process !== 'undefined' && Boolean((process as any).versions?.node);

/**
 * Returns whether AI summarizer features are currently enabled.
 * Defaults to false (hidden until explicitly enabled by an admin in Admin Command Center).
 */
export function getAiSummarizerFeatureEnabledSync(): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(STORAGE_KEY);
      if (val !== null) {
        return val === 'true';
      }
    }
    return memoryFallbackValue;
  } catch {
    return memoryFallbackValue;
  }
}

/**
 * Updates the AI summarizer master feature toggle.
 * Saves to localStorage, persists to Firestore (`system_settings/ai_config`),
 * and broadcasts across the application.
 */
export async function setAiSummarizerFeatureEnabled(enabled: boolean): Promise<void> {
  memoryFallbackValue = enabled;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
    }
  } catch {}

  // Broadcast event within current window
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { enabled } }));
    } catch {}
  }

  // Persist to server endpoint /api/admin/settings (trusted path)
  if (!isNode) {
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
            settingId: 'ai_config',
            data: { isEnabled: enabled, updatedAt: Date.now() },
          }),
        });
        if (res.ok) return;
      }
      await Promise.race([
        setDoc(doc(db, 'system_settings', 'ai_config'), {
          isEnabled: enabled,
          updatedAt: Date.now(),
        }, { merge: true }),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    } catch (err) {
      console.warn('[aiConfig] Save warning:', err);
    }
  }
}

/**
 * React hook to observe AI summarizer feature flag in real time.
 * Syncs instantly across local events, storage changes, and Firestore doc snapshot.
 */
export function useAiSummarizerConfig() {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => getAiSummarizerFeatureEnabledSync());
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

    // 3. Listen to Firestore real-time doc (skip in Node.js test environments)
    let unsubscribe = () => {};
    if (!isNode) {
      try {
        unsubscribe = onSnapshot(doc(db, 'system_settings', 'ai_config'), (snap) => {
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
          console.warn('[aiConfig] onSnapshot error:', err);
          setLoading(false);
        });
      } catch {
        setLoading(false);
      }
    } else {
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
    setEnabled: setAiSummarizerFeatureEnabled,
    loading
  };
}
