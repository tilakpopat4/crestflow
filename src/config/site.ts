/**
 * Site configuration for CrestFlow marketing & landing assets.
 *
 * PASTE YOUR UPLOADTHING VIDEO URLS HERE (or supply via environment variables):
 * - webm: Paste your WebM URL below or set VITE_HERO_VIDEO_WEBM
 * - mp4:  Paste your MP4 URL below or set VITE_HERO_VIDEO_MP4
 */
export interface HeroVideoConfig {
  webm: string;
  mp4: string;
  poster: string;
}

export interface SiteConfig {
  heroVideo: HeroVideoConfig;
}

export const siteConfig: SiteConfig = {
  heroVideo: {
    webm: (import.meta as any).env?.VITE_HERO_VIDEO_WEBM || 'https://REPLACE_ME/hero-v1.webm',
    mp4:
      (import.meta as any).env?.VITE_HERO_VIDEO_MP4 ||
      'https://n0ohengfxq.ufs.sh/f/5eQObb6EGfZUbFbEqe1zlKdcPQ7uSWwnfGFYeVU19MkHLIas',
    poster: '/hero-v1-poster.jpg',
  },
};
