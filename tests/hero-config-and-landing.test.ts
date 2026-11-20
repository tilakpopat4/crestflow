import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_HERO_CONFIG,
  mergeHeroConfig,
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
  });

  test('4. SignInScreen renders dynamic hero config, background media, and card alignment', () => {
    const signInSource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/auth/SignInScreen.tsx'),
      'utf-8'
    );

    assert.ok(signInSource.includes('useHeroConfig'), 'SignInScreen must use useHeroConfig hook');
    assert.ok(signInSource.includes('config.backgroundType === \'image\''), 'SignInScreen must support image background');
    assert.ok(signInSource.includes('config.backgroundType === \'video\''), 'SignInScreen must support video background');
    assert.ok(signInSource.includes('config.cardAlignment === \'center\''), 'SignInScreen must support centered layout');
    assert.ok(signInSource.includes('config.cardAlignment === \'left\''), 'SignInScreen must support left card layout');
  });

  test('5. AdminTab & Worker API route hero configuration endpoints', () => {
    const adminTabSource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/AdminTab.tsx'),
      'utf-8'
    );
    const workerRoutesSource = fs.readFileSync(
      path.join(process.cwd(), 'worker/routes/adminSettings.ts'),
      'utf-8'
    );
    const workerIndexSource = fs.readFileSync(
      path.join(process.cwd(), 'worker/index.ts'),
      'utf-8'
    );

    assert.ok(adminTabSource.includes('AdminHeroManager'), 'AdminTab must import AdminHeroManager');
    assert.ok(adminTabSource.includes('Hero & Landing'), 'AdminTab must have Hero & Landing tab');
    assert.ok(workerRoutesSource.includes('hero_config'), 'Worker adminSettings must allow hero_config');
    assert.ok(workerRoutesSource.includes('handleGetHeroConfig'), 'Worker adminSettings must export handleGetHeroConfig');
    assert.ok(workerIndexSource.includes('/api/hero-config'), 'Worker index must route /api/hero-config');
  });

  test('6. All modified and created files comply with AGENTS.md 300-line max limit', () => {
    const filesToCheck = [
      'src/lib/heroConfig.ts',
      'src/components/auth/SignInScreen.tsx',
      'src/components/admin/AdminHeroManager.tsx',
      'src/components/admin/AdminHeroBenefitsSection.tsx',
      'src/components/admin/AdminHeroMediaSection.tsx',
      'src/components/AdminTab.tsx',
      'worker/routes/adminSettings.ts',
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
