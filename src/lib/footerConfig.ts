import { useState, useEffect, useCallback } from 'react';
import { auth } from '../firebase';

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
  copyrightText: '© 2026 CrestFlow. Built in India by Tilak Popat.',
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
    { id: 'soc_ig', platform: 'instagram', name: 'CrestFlow on Instagram', url: 'https://instagram.com' },
    { id: 'soc_x', platform: 'x', name: 'CrestFlow on X', url: 'https://x.com' },
    { id: 'soc_gh', platform: 'github', name: 'CrestFlow on GitHub', url: 'https://github.com' },
    { id: 'soc_li', platform: 'linkedin', name: 'CrestFlow on LinkedIn', url: 'https://linkedin.com' },
    { id: 'soc_yt', platform: 'youtube', name: 'CrestFlow on YouTube', url: 'https://youtube.com' },
  ],
};

const STORAGE_KEY = 'crestflow_footer_config_v1';
const EVENT_NAME = 'crestflow:footer-config-changed';

/**
 * Sanitizes and validates footer configuration payload against defaults.
 */
export function mergeFooterConfig(raw?: Partial<FooterConfig> | null): FooterConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_FOOTER_CONFIG;
  return {
    ...DEFAULT_FOOTER_CONFIG,
    ...raw,
    brandName: typeof raw.brandName === 'string' && raw.brandName.trim() ? raw.brandName.trim() : DEFAULT_FOOTER_CONFIG.brandName,
    tagline: typeof raw.tagline === 'string' ? raw.tagline : DEFAULT_FOOTER_CONFIG.tagline,
    copyrightText: typeof raw.copyrightText === 'string' && raw.copyrightText.trim() ? raw.copyrightText.trim() : DEFAULT_FOOTER_CONFIG.copyrightText,
    versionText: typeof raw.versionText === 'string' && raw.versionText.trim() ? raw.versionText.trim() : DEFAULT_FOOTER_CONFIG.versionText,
    primaryLinks: Array.isArray(raw.primaryLinks)
      ? raw.primaryLinks.map((l) => ({
          id: String(l?.id || `link_${Math.random().toString(36).substring(2, 7)}`),
          name: String(l?.name || '').trim(),
          url: String(l?.url || '#').trim(),
          route: typeof l?.route === 'string' ? l.route.trim() : undefined,
          openInNewTab: Boolean(l?.openInNewTab),
        }))
      : DEFAULT_FOOTER_CONFIG.primaryLinks,
    legalLinks: Array.isArray(raw.legalLinks)
      ? raw.legalLinks.map((l) => ({
          id: String(l?.id || `legal_${Math.random().toString(36).substring(2, 7)}`),
          name: String(l?.name || '').trim(),
          url: String(l?.url || '#').trim(),
          route: typeof l?.route === 'string' ? l.route.trim() : undefined,
          openInNewTab: Boolean(l?.openInNewTab),
        }))
      : DEFAULT_FOOTER_CONFIG.legalLinks,
    socialLinks: Array.isArray(raw.socialLinks)
      ? raw.socialLinks.map((s) => ({
          id: String(s?.id || `soc_${Math.random().toString(36).substring(2, 7)}`),
          platform: s?.platform || 'custom',
          name: String(s?.name || '').trim(),
          url: String(s?.url || '#').trim(),
        }))
      : DEFAULT_FOOTER_CONFIG.socialLinks,
  };
}

/**
 * Returns the cached or default footer configuration synchronously.
 */
export function getFooterConfigSync(): FooterConfig {
  if (typeof window === 'undefined') return DEFAULT_FOOTER_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FOOTER_CONFIG;
    return mergeFooterConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_FOOTER_CONFIG;
  }
}

/**
 * Updates footer configuration in localStorage, publishes to Cloudflare Worker, and notifies subscribers.
 */
export async function saveFooterConfig(config: FooterConfig): Promise<FooterConfig> {
  const merged = mergeFooterConfig(config);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { config: merged } }));
  }

  const currentUser = auth.currentUser;
  if (!currentUser) return merged;

  const token = await currentUser.getIdToken(true);
  const res = await fetch('/api/admin/settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      settingId: 'footer_config',
      data: { ...merged, updatedAt: Date.now() },
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error || `Failed to publish footer globally (${res.status})`);
  }

  return merged;
}

/**
 * Resets footer configuration back to project defaults.
 */
export async function resetFooterConfig(): Promise<FooterConfig> {
  return saveFooterConfig(DEFAULT_FOOTER_CONFIG);
}

/**
 * Hook to read and subscribe to real-time footer configuration changes across all devices.
 */
export function useFooterConfig() {
  const [config, setConfig] = useState<FooterConfig>(() => getFooterConfigSync());
  const [loading, setLoading] = useState<boolean>(true);

  const fetchRemote = useCallback(async () => {
    try {
      const res = await fetch('/api/footer-config', { cache: 'no-store' });
      if (res.ok) {
        const payload = (await res.json()) as { config?: Partial<FooterConfig> | null };
        if (payload?.config) {
          const merged = mergeFooterConfig(payload.config);
          setConfig(merged);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          } catch {}
        }
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRemote();

    const handleLocal = (e: any) => {
      if (e?.detail?.config) {
        setConfig(mergeFooterConfig(e.detail.config));
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setConfig(mergeFooterConfig(JSON.parse(e.newValue)));
        } catch {}
      }
    };

    window.addEventListener(EVENT_NAME, handleLocal);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, handleLocal);
      window.removeEventListener('storage', handleStorage);
    };
  }, [fetchRemote]);

  return {
    config,
    loading,
    saveConfig: saveFooterConfig,
    resetConfig: resetFooterConfig,
    refresh: fetchRemote,
  };
}
