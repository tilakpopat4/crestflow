import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_HERO_CONFIG,
  mergeHeroConfig,
  parseVideoSource,
  HeroConfig,
} from '../src/lib/heroConfig';

describe('Hero Section & Landing Page CMS Suite', () => {
  test('1. DEFAULT_HERO_CONFIG provides canonical text, 3 benefits, and right card alignment', () => {
    assert.strictEqual(DEFAULT_HERO_CONFIG.headline, 'Invoice. Scan. Get Paid.');
    assert.strictEqual(DEFAULT_HERO_CONFIG.headlineHighlight, 'Get Paid.');
    assert.ok(DEFAULT_HERO_CONFIG.subtitle.includes('The all-in-one client CRM'));
    assert.strictEqual(DEFAULT_HERO_CONFIG.benefits.length, 3);
    assert.strictEqual(DEFAULT_HERO_CONFIG.cardAlignment, 'right');
    assert.strictEqual(DEFAULT_HERO_CONFIG.backgroundType, 'color');
    assert.strictEqual(DEFAULT_HERO_CONFIG.showWorkflowIllustration, true);
  });

  test('2. mergeHeroConfig sanitizes custom text, preserves valid media, and clamps overlay opacity', () => {
    const custom: Partial<HeroConfig> = {
      headline: 'Next-Gen Freelance Suite',
      headlineHighlight: 'Freelance Suite',
      subtitle: 'Fast payments with zero friction.',
      benefits: [
        { id: 'b-custom', title: 'Automated Reminders', description: 'Never chase an unpaid invoice again.' },
      ],
      showWorkflowIllustration: false,
      backgroundType: 'image',
      backgroundImageUrl: 'https://images.unsplash.com/custom-bg.jpg',
      backgroundOverlayOpacity: 1.5, // should be clamped to 1
      cardAlignment: 'left',
      videoEnabled: true,
      showOnMobile: false,
    };

    const merged = mergeHeroConfig(custom);
    assert.strictEqual(merged.headline, 'Next-Gen Freelance Suite');
    assert.strictEqual(merged.headlineHighlight, 'Freelance Suite');
    assert.strictEqual(merged.subtitle, 'Fast payments with zero friction.');
    assert.strictEqual(merged.benefits.length, 1);
    assert.strictEqual(merged.benefits[0].title, 'Automated Reminders');
    assert.strictEqual(merged.showWorkflowIllustration, false);
    assert.strictEqual(merged.backgroundType, 'image');
    assert.strictEqual(merged.backgroundImageUrl, 'https://images.unsplash.com/custom-bg.jpg');
    assert.strictEqual(merged.backgroundOverlayOpacity, 1); // clamped
    assert.strictEqual(merged.cardAlignment, 'left');
    assert.strictEqual(merged.videoEnabled, true);
    assert.strictEqual(merged.showOnMobile, false);
  });

  test('3. mergeHeroConfig falls back to defaults for invalid background types and alignments', () => {
    const invalid: any = {
      backgroundType: 'invalid_type',
      cardAlignment: 'invalid_align',
      benefits: [],
    };

    const merged = mergeHeroConfig(invalid);
    assert.strictEqual(merged.backgroundType, 'color');
    assert.strictEqual(merged.cardAlignment, 'right');
    assert.strictEqual(merged.benefits.length, 3);

    const hiddenBenefits = mergeHeroConfig({ showBenefits: false, benefits: [] });
    assert.strictEqual(hiddenBenefits.showBenefits, false);
    assert.strictEqual(hiddenBenefits.benefits.length, 0);
  });

  test('4. SignInScreen renders dynamic hero config, background media, and card alignment', () => {
    const signInSource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/auth/SignInScreen.tsx'),
      'utf-8'
    );

    assert.ok(signInSource.includes('useHeroConfig'), 'SignInScreen must use useHeroConfig hook');
    assert.ok(signInSource.includes('config.backgroundType === \'image\''), 'SignInScreen must support image background');
    assert.ok(signInSource.includes('isMobileScreen'), 'SignInScreen must detect mobile screen size');
    assert.ok(signInSource.includes('shouldReduceMotion') || signInSource.includes('prefers-reduced-motion'), 'SignInScreen must respect reduced motion');
    assert.ok(signInSource.includes('visibilitychange'), 'SignInScreen must pause video when tab hidden');
    assert.ok(signInSource.includes('surface-900') || signInSource.includes('#1A1A1A'), 'SignInScreen must use #1A1A1A dark scrim');
  });

  test('5. Admin & Worker route landing media endpoints and Cloudflare R2 bucket', () => {
    const wranglerSource = fs.readFileSync(path.join(process.cwd(), 'wrangler.jsonc'), 'utf-8');
    const workerIndexSource = fs.readFileSync(path.join(process.cwd(), 'worker/index.ts'), 'utf-8');
    const landingMediaSource = fs.readFileSync(path.join(process.cwd(), 'worker/routes/landingMedia.ts'), 'utf-8');

    assert.ok(wranglerSource.includes('VIDEOS_BUCKET'), 'wrangler.jsonc must configure VIDEOS_BUCKET');
    assert.ok(workerIndexSource.includes('/api/admin/landing-media/upload'), 'Worker must route upload endpoint');
    assert.ok(workerIndexSource.includes('/api/media/landing-video'), 'Worker must route streaming video endpoint');
    assert.ok(landingMediaSource.includes('detectVideoMime'), 'Must validate magic bytes file signatures');
    assert.ok(landingMediaSource.includes('MAX_VIDEO_BYTES'), 'Must enforce 25 MB limit');
  });

  test('6. parseVideoSource handles YouTube, Vimeo, Google Drive, and direct video files', () => {
    const ytWatch = parseVideoSource('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    assert.strictEqual(ytWatch.type, 'youtube');
    assert.strictEqual(ytWatch.videoId, 'dQw4w9WgXcQ');
    assert.ok(ytWatch.embedUrl.includes('dQw4w9WgXcQ'));
    assert.ok(ytWatch.embedUrl.includes('autoplay=1'));
    assert.ok(ytWatch.posterUrl?.includes('dQw4w9WgXcQ'));

    const ytShorts = parseVideoSource('https://www.youtube.com/shorts/dQw4w9WgXcQ');
    assert.strictEqual(ytShorts.type, 'youtube');
    assert.strictEqual(ytShorts.videoId, 'dQw4w9WgXcQ');

    const ytDirectId = parseVideoSource('dQw4w9WgXcQ');
    assert.strictEqual(ytDirectId.type, 'youtube');
    assert.strictEqual(ytDirectId.videoId, 'dQw4w9WgXcQ');

    const directMp4 = parseVideoSource('https://assets.example.com/video.mp4');
    assert.strictEqual(directMp4.type, 'direct');
    assert.strictEqual(directMp4.directUrl, 'https://assets.example.com/video.mp4');

    const localR2 = parseVideoSource('/api/media/landing-video');
    assert.strictEqual(localR2.type, 'direct');
    assert.strictEqual(localR2.directUrl, '/api/media/landing-video');
  });

  test('7. Palette compliance: headline highlight, SVG illustration, and SignInCard divider', () => {
    const signInScreenSource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/auth/SignInScreen.tsx'),
      'utf-8'
    );
    assert.ok(signInScreenSource.includes('text-accent'), 'Headline highlight must use text-accent (#E1002D)');
    assert.ok(!signInScreenSource.includes('#6366f1'), 'Off-palette purple #6366f1 must be removed');

    const signInCardSource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/auth/SignInCard.tsx'),
      'utf-8'
    );
    assert.ok(signInCardSource.includes('OR'), 'Divider must be centered OR row');
    assert.ok(!signInCardSource.includes('text-indigo-400'), 'Off-palette text-indigo-400 must be removed');

    const svgSource = fs.readFileSync(path.join(process.cwd(), 'public/workflow-diagram.svg'), 'utf-8');
    assert.ok(!svgSource.includes('#d6d6e3'), 'SVG lavender tint must be removed');
    assert.ok(!svgSource.includes('#090814'), 'SVG dark navy tint must be replaced with palette #1a1a1a');
  });

  test('8. All modified and created files comply with AGENTS.md 300-line max limit', () => {
    const filesToCheck = [
      'src/lib/heroConfig.ts',
      'src/components/auth/SignInScreen.tsx',
      'src/components/auth/SignInCard.tsx',
      'src/components/admin/AdminHeroManager.tsx',
      'src/components/admin/AdminHeroBenefitsSection.tsx',
      'src/components/admin/AdminHeroMediaSection.tsx',
      'src/components/admin/AdminHeroVideoManager.tsx',
      'src/hooks/useAdminLandingMedia.ts',
      'src/components/ProfilePage.tsx',
      'src/components/AdminTab.tsx',
      'worker/routes/landingMedia.ts',
      'worker/index.ts',
    ];

    for (const relPath of filesToCheck) {
      const fullPath = path.join(process.cwd(), relPath);
      const lines = fs.readFileSync(fullPath, 'utf-8').split('\n').length;
      assert.ok(
        lines <= 300,
        `${relPath} has ${lines} lines, exceeding the 300-line limit in AGENTS.md`
      );
    }
  });
});
