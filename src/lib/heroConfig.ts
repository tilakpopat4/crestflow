import { useState, useEffect, useCallback } from 'react';
import { auth } from '../firebase';

export interface HeroBenefit {
  id: string;
  title: string;
  description: string;
}

export type HeroBackgroundType = 'color' | 'image' | 'video';
export type HeroCardAlignment = 'right' | 'left' | 'center';
export type ParsedVideoType = 'direct' | 'youtube' | 'vimeo' | 'drive' | 'none';

export interface ParsedVideoSource {
  type: ParsedVideoType;
  embedUrl: string;
  directUrl: string;
}

/**
 * Parses user-provided video URLs (YouTube, Vimeo, Google Drive, direct MP4/WebM)
 * into an optimized embed URL for iframe or direct streaming tag.
 */
export function parseVideoSource(rawUrl?: string | null): ParsedVideoSource {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { type: 'none', embedUrl: '', directUrl: '' };
  }
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { type: 'none', embedUrl: '', directUrl: '' };
  }

  // 1. YouTube matching (watch?v=, watch?...v=, youtu.be/, shorts/, embed/, live/)
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    const id = ytMatch[1];
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&playsinline=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&modestbranding=1`,
      directUrl: trimmed,
    };
  }

  // 2. Vimeo matching (vimeo.com/<id> or player.vimeo.com/video/<id>)
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/(?:video\/)?)([0-9]+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    const id = vimeoMatch[1];
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${id}?background=1&autoplay=1&loop=1&muted=1&byline=0&title=0`,
      directUrl: trimmed,
    };
  }

  // 3. Google Drive preview (drive.google.com/file/d/<id>/...)
  const gdriveMatch = trimmed.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=))([a-zA-Z0-9_-]+)/i);
  if (gdriveMatch && gdriveMatch[1]) {
    const id = gdriveMatch[1];
    return {
      type: 'drive',
      embedUrl: `https://drive.google.com/file/d/${id}/preview`,
      directUrl: trimmed,
    };
  }

  // 4. Dropbox direct conversion
  if (trimmed.includes('dropbox.com')) {
    const directUrl = trimmed.replace(/[?&]dl=0/, '').concat(trimmed.includes('?') ? '&raw=1' : '?raw=1');
    return { type: 'direct', embedUrl: '', directUrl };
  }

  // 4. Direct video file (.mp4, .webm, .mov, etc.)
  return {
    type: 'direct',
    embedUrl: '',
    directUrl: trimmed,
  };
}

export interface HeroConfig {
  headline: string;
  headlineHighlight: string;
  subtitle: string;
  benefits: HeroBenefit[];
  showWorkflowIllustration: boolean;
  backgroundType: HeroBackgroundType;
  backgroundColor: string;
  backgroundImageUrl: string;
  backgroundVideoUrl: string;
  backgroundOverlayOpacity: number;
  cardAlignment: HeroCardAlignment;
}

export const DEFAULT_HERO_CONFIG: HeroConfig = {
  headline: 'Invoice. Scan. Get Paid.',
  headlineHighlight: 'Get Paid.',
  subtitle:
    'The all-in-one client CRM, deliverable tracker, and automated invoicing workspace built specifically for Indian freelancers and digital studios.',
  benefits: [
    {
      id: 'b1',
      title: 'Direct UPI Payments',
      description: 'Zero gateway commissions. 100% money goes directly to your bank.',
    },
    {
      id: 'b2',
      title: 'Deliverable Tracking',
      description: 'Log edits, revisions, and status updates seamlessly for every client.',
    },
    {
      id: 'b3',
      title: 'Automated Delivery',
      description: 'Scheduled WhatsApp-ready and email invoices at 6:00 AM sharp.',
    },
  ],
  showWorkflowIllustration: true,
  backgroundType: 'color',
  backgroundColor: '#333333',
  backgroundImageUrl: '',
  backgroundVideoUrl: '',
  backgroundOverlayOpacity: 0.65,
  cardAlignment: 'right',
};

const STORAGE_KEY = 'crestflow_hero_config_v1';
const EVENT_NAME = 'crestflow:hero-config-changed';

/**
 * Safely merges partial remote or cached hero data with canonical defaults.
 */
export function mergeHeroConfig(raw?: Partial<HeroConfig> | null): HeroConfig {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_HERO_CONFIG,
      benefits: DEFAULT_HERO_CONFIG.benefits.map((b) => ({ ...b })),
    };
  }

  const cleanBenefits: HeroBenefit[] = Array.isArray(raw.benefits)
    ? raw.benefits
        .filter((b) => b && typeof b === 'object' && typeof b.title === 'string')
        .map((b, idx) => ({
          id: String(b.id || `b-${idx + 1}`),
          title: String(b.title || '').trim(),
          description: String(b.description || '').trim(),
        }))
    : DEFAULT_HERO_CONFIG.benefits.map((b) => ({ ...b }));

  const validTypes: HeroBackgroundType[] = ['color', 'image', 'video'];
  const validAlignments: HeroCardAlignment[] = ['right', 'left', 'center'];

  return {
    headline: typeof raw.headline === 'string' && raw.headline.trim() ? raw.headline.trim() : DEFAULT_HERO_CONFIG.headline,
    headlineHighlight: typeof raw.headlineHighlight === 'string' ? raw.headlineHighlight.trim() : DEFAULT_HERO_CONFIG.headlineHighlight,
    subtitle: typeof raw.subtitle === 'string' && raw.subtitle.trim() ? raw.subtitle.trim() : DEFAULT_HERO_CONFIG.subtitle,
    benefits: cleanBenefits.length > 0 ? cleanBenefits : DEFAULT_HERO_CONFIG.benefits.map((b) => ({ ...b })),
    showWorkflowIllustration: raw.showWorkflowIllustration !== false,
    backgroundType:
      raw.backgroundType === 'video' || (Boolean(raw.backgroundVideoUrl?.trim()) && raw.backgroundType !== 'image')
        ? 'video'
        : raw.backgroundType === 'image' || (Boolean(raw.backgroundImageUrl?.trim()) && raw.backgroundType !== 'video')
        ? 'image'
        : validTypes.includes(raw.backgroundType as any)
        ? (raw.backgroundType as HeroBackgroundType)
        : 'color',
    backgroundColor: typeof raw.backgroundColor === 'string' && raw.backgroundColor.trim() ? raw.backgroundColor.trim() : '#333333',
    backgroundImageUrl: typeof raw.backgroundImageUrl === 'string' ? raw.backgroundImageUrl.trim() : '',
    backgroundVideoUrl: typeof raw.backgroundVideoUrl === 'string' ? raw.backgroundVideoUrl.trim() : '',
    backgroundOverlayOpacity:
      typeof raw.backgroundOverlayOpacity === 'number' && !Number.isNaN(raw.backgroundOverlayOpacity)
        ? Math.max(0, Math.min(1, raw.backgroundOverlayOpacity))
        : 0.65,
    cardAlignment: validAlignments.includes(raw.cardAlignment as any) ? (raw.cardAlignment as HeroCardAlignment) : 'right',
  };
}

/**
 * Synchronously retrieves cached hero config from localStorage, falling back to defaults.
 */
export function getHeroConfigSync(): HeroConfig {
  if (typeof window === 'undefined') return DEFAULT_HERO_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HERO_CONFIG;
    return mergeHeroConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_HERO_CONFIG;
  }
}

/**
 * Persists updated hero configuration to Firestore via the admin settings API.
 */
export async function saveHeroConfig(config: HeroConfig): Promise<HeroConfig> {
  const normalized = mergeHeroConfig(config);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { config: normalized } }));
  }

  const currentUser = auth.currentUser;
  if (!currentUser) return normalized;

  try {
    const token = await currentUser.getIdToken(true);
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        settingId: 'hero_config',
        data: normalized,
      }),
    });
    if (!res.ok) {
      console.warn(`[heroConfig] Server save returned ${res.status}`);
    }
  } catch (err) {
    console.warn('[heroConfig] Server save error:', err);
  }

  return normalized;
}

/**
 * Resets hero configuration back to defaults.
 */
export async function resetHeroConfig(): Promise<HeroConfig> {
  return saveHeroConfig(DEFAULT_HERO_CONFIG);
}

/**
 * React hook returning live, admin-editable hero configuration.
 */
export function useHeroConfig() {
  const [config, setConfig] = useState<HeroConfig>(() => getHeroConfigSync());
  const [loading, setLoading] = useState<boolean>(true);

  const fetchRemote = useCallback(async () => {
    try {
      const res = await fetch('/api/hero-config', { cache: 'no-store' });
      if (res.ok) {
        const payload = (await res.json()) as { config?: Partial<HeroConfig> | null };
        if (payload?.config) {
          const merged = mergeHeroConfig(payload.config);
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
      if (e?.detail?.config) setConfig(mergeHeroConfig(e.detail.config));
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setConfig(mergeHeroConfig(JSON.parse(e.newValue)));
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
    saveConfig: saveHeroConfig,
    resetConfig: resetHeroConfig,
    loading,
    refresh: fetchRemote,
  };
}
