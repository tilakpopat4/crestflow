import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { siteConfig } from '../src/config/site';

describe('Self-Hosted UploadThing Hero Video Suite', () => {
  test('1. Configuration: siteConfig defines webm, mp4, and local poster in one location', () => {
    assert.ok(siteConfig.heroVideo, 'siteConfig must define heroVideo');
    assert.strictEqual(typeof siteConfig.heroVideo.webm, 'string');
    assert.strictEqual(typeof siteConfig.heroVideo.mp4, 'string');
    assert.strictEqual(siteConfig.heroVideo.poster, '/hero-v1-poster.jpg');
    assert.ok(
      siteConfig.heroVideo.webm.includes('REPLACE_ME') || siteConfig.heroVideo.webm.startsWith('http'),
      'WebM URL must be placeholder or real URL'
    );
    assert.ok(
      siteConfig.heroVideo.mp4.includes('REPLACE_ME') || siteConfig.heroVideo.mp4.startsWith('http'),
      'MP4 URL must be placeholder or real URL'
    );
  });

  test('2. Video Element: Replaces iframe with self-hosted <video> and ordered sources', () => {
    const signInSource = fs.readFileSync(path.join(process.cwd(), 'src/components/auth/SignInScreen.tsx'), 'utf-8');

    assert.ok(!signInSource.includes('<iframe'), 'SignInScreen must NOT contain any <iframe>');
    assert.ok(!signInSource.includes('youtube.com'), 'SignInScreen must NOT contain any YouTube URLs or embeds');
    assert.ok(!signInSource.includes('postMessage'), 'SignInScreen must NOT contain iframe postMessage logic');

    // Attributes
    assert.ok(signInSource.includes('autoPlay'), 'Video must have autoPlay attribute');
    assert.ok(signInSource.includes('muted'), 'Video must have muted attribute');
    assert.ok(signInSource.includes('loop'), 'Video must have loop attribute');
    assert.ok(signInSource.includes('playsInline'), 'Video must have playsInline attribute');
    assert.ok(signInSource.includes('preload="metadata"'), 'Video must have preload="metadata"');
    assert.ok(signInSource.includes('disablePictureInPicture'), 'Video must have disablePictureInPicture');
    assert.ok(signInSource.includes('controlsList="nodownload noremoteplayback"'), 'Video must have controlsList');
    assert.ok(signInSource.includes('tabIndex={-1}'), 'Video must have tabIndex={-1}');
    assert.ok(signInSource.includes('aria-hidden="true"'), 'Video must have aria-hidden="true"');
    assert.ok(signInSource.includes('poster={posterSrc}'), 'Video must set poster to local poster image');

    // Source Order: WebM first, MP4 second
    const webmIdx = signInSource.indexOf('type="video/webm"');
    const mp4Idx = signInSource.indexOf('type="video/mp4"');
    assert.ok(webmIdx > 0 && mp4Idx > 0, 'Both WebM and MP4 sources must be present');
    assert.ok(webmIdx < mp4Idx, 'WebM source must come before MP4 source');

    // Gradient Overlay
    assert.ok(
      signInSource.includes('from-black/60 to-black/80'),
      'Must render from-black/60 to-black/80 gradient overlay'
    );
  });

  test('3. Performance & Preferences: First-paint LCP deferral and motion/data-saver gating', () => {
    const signInSource = fs.readFileSync(path.join(process.cwd(), 'src/components/auth/SignInScreen.tsx'), 'utf-8');

    assert.ok(signInSource.includes('loadedAfterPaint'), 'Must defer video source loading until after first paint');
    assert.ok(signInSource.includes('requestAnimationFrame'), 'Must use requestAnimationFrame for first-paint detection');
    assert.ok(signInSource.includes('saveData'), 'Must respect navigator.connection.saveData');
    assert.ok(signInSource.includes('prefers-reduced-motion') || signInSource.includes('shouldReduceMotion'), 'Must respect reduced motion');
  });

  test('4. Security & CSP: Worker enforces CSP with UploadThing in media-src and removes frame-src', () => {
    const staticHandlerSource = fs.readFileSync(path.join(process.cwd(), 'worker/staticHandler.ts'), 'utf-8');

    assert.ok(staticHandlerSource.includes('Content-Security-Policy'), 'Worker must send Content-Security-Policy header');
    assert.ok(staticHandlerSource.includes("media-src 'self' https://utfs.io https://*.ufs.sh"), 'media-src must permit UploadThing hosts');
    assert.ok(!staticHandlerSource.includes('frame-src'), 'frame-src for YouTube must be completely removed');
    assert.ok(!staticHandlerSource.includes('youtube.com'), 'YouTube allowances must be removed from CSP');
  });

  test('5. Static Asset: Local poster file exists and is accessible', () => {
    const posterPath = path.join(process.cwd(), 'public/hero-v1-poster.jpg');
    assert.ok(fs.existsSync(posterPath), 'public/hero-v1-poster.jpg must exist in static assets');
    const stats = fs.statSync(posterPath);
    assert.ok(stats.size > 0, 'Poster file must not be empty');
  });

  test('6. AGENTS.md 300-line compliance', () => {
    const files = [
      'src/config/site.ts',
      'src/components/auth/SignInScreen.tsx',
      'worker/staticHandler.ts',
    ];
    for (const f of files) {
      const lines = fs.readFileSync(path.join(process.cwd(), f), 'utf-8').split('\n').length;
      assert.ok(lines <= 300, `${f} has ${lines} lines, exceeding 300`);
    }
  });
});
