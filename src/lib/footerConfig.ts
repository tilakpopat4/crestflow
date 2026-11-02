import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

export interface FooterLink {
  id: string;
  name: string;
  url: string;
  route?: string;
  openInNewTab?: boolean;
}

export interface FooterSocialLink {
  id: string;
  platform: 'x' | 'github' | 'linkedin' | 'youtube' | 'instagram' | 'custom';
  name: string;
  url: string;
}

export interface FooterConfig {
  brandName: string;
  tagline?: string;
  copyrightText: string;
  versionText: string;
  primaryLinks: FooterLink[];
  legalLinks: FooterLink[];
  socialLinks: FooterSocialLink[];
}

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  brandName: 'CrestFlow',
  tagline: 'Freelancing client manager',
  copyrightText: '© 2026 CrestFlow Inc.',
  versionText: '1.1.0',
  primaryLinks: [
    { id: 'prod', name: 'Product', url: '/', route: 'dashboard' },
    { id: 'feat', name: 'Features', url: '/work', route: 'work' },
    { id: 'price', name: 'Pricing', url: '/pricing', route: 'pricing' },
    { id: 'cust', name: 'Customers', url: '/reviews', route: 'reviews' },
    { id: 'docs', name: 'Docs', url: '/terms', route: 'terms' },
    { id: 'cont', name: 'Contact', url: '/contact', route: 'contact' },
  ],
  legalLinks: [
    { id: 'priv', name: 'Privacy', url: '/privacy', route: 'privacy' },
    { id: 'terms', name: 'Terms', url: '/terms', route: 'terms' },
    { id: 'refund', name: 'Refund Policy', url: '/refund', route: 'refund' },
    { id: 'cookies', name: 'Cookies', url: '/terms', route: 'terms' },
  ],
  socialLinks: [
    { id: 'soc_x', platform: 'x', name: 'CrestFlow on X', url: 'https://x.com' },
    { id: 'soc_gh', platform: 'github', name: 'CrestFlow on GitHub', url: 'https://github.com' },
    { id: 'soc_li', platform: 'linkedin', name: 'CrestFlow on LinkedIn', url: 'https://linkedin.com' },
    { id: 'soc_yt', platform: 'youtube', name: 'CrestFlow on YouTube', url: 'https://youtube.com' },
  ],
};

const STORAGE_KEY = 'crestflow_footer_config_v1';
const EVENT_NAME = 'crestflow:footer-config-changed';

/**
 * Returns the cached or default footer configuration synchronously.
 */
export function getFooterConfigSync(): FooterConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FOOTER_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_FOOTER_CONFIG,
      ...parsed,
      primaryLinks: Array.isArray(parsed?.primaryLinks) ? parsed.primaryLinks : DEFAULT_FOOTER_CONFIG.primaryLinks,
      legalLinks: Array.isArray(parsed?.legalLinks) ? parsed.legalLinks : DEFAULT_FOOTER_CONFIG.legalLinks,
      socialLinks: Array.isArray(parsed?.socialLinks) ? parsed.socialLinks : DEFAULT_FOOTER_CONFIG.socialLinks,
    };
  } catch {
    return DEFAULT_FOOTER_CONFIG;
  }
}

/**
 * Updates footer configuration in localStorage, Firestore, and notifies subscribers.
 */
export async function saveFooterConfig(config: FooterConfig): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}

  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { config } }));

  try {
    await setDoc(doc(db, 'system_settings', 'footer_config'), {
      ...config,
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (err) {
    console.warn('[footerConfig] Firestore save warning:', err);
  }
}

/**
 * Resets footer configuration back to project defaults.
 */
export async function resetFooterConfig(): Promise<void> {
  await saveFooterConfig(DEFAULT_FOOTER_CONFIG);
}

/**
 * Hook to read and subscribe to real-time footer configuration changes.
 */
export function useFooterConfig() {
  const [config, setConfig] = useState<FooterConfig>(() => getFooterConfigSync());
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const handleLocal = (e: any) => {
      if (e?.detail?.config) {
        setConfig(e.detail.config);
      }
    };
    window.addEventListener(EVENT_NAME, handleLocal);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setConfig(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    let unsubscribe = () => {};
    try {
      unsubscribe = onSnapshot(doc(db, 'system_settings', 'footer_config'), (snap) => {
        if (snap.exists()) {
          const remoteData = snap.data() as Partial<FooterConfig>;
          const merged: FooterConfig = {
            brandName: remoteData.brandName || DEFAULT_FOOTER_CONFIG.brandName,
            tagline: remoteData.tagline || DEFAULT_FOOTER_CONFIG.tagline,
            copyrightText: remoteData.copyrightText || DEFAULT_FOOTER_CONFIG.copyrightText,
            versionText: remoteData.versionText || DEFAULT_FOOTER_CONFIG.versionText,
            primaryLinks: Array.isArray(remoteData.primaryLinks)
              ? remoteData.primaryLinks
              : DEFAULT_FOOTER_CONFIG.primaryLinks,
            legalLinks: Array.isArray(remoteData.legalLinks)
              ? remoteData.legalLinks
              : DEFAULT_FOOTER_CONFIG.legalLinks,
            socialLinks: Array.isArray(remoteData.socialLinks)
              ? remoteData.socialLinks
              : DEFAULT_FOOTER_CONFIG.socialLinks,
          };
          setConfig(merged);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          } catch {}
        }
        setLoading(false);
      }, (err) => {
        console.warn('[footerConfig] onSnapshot error:', err);
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

  return { config, loading, saveConfig: saveFooterConfig, resetConfig: resetFooterConfig };
}

