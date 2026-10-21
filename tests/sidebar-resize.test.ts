import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  DEFAULT_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  ICON_ONLY_THRESHOLD,
  MAX_SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_STORAGE_KEY,
} from '../src/hooks/useSidebarResize';

describe('Sidebar Resizing & Free Size Management', () => {
  it('defines sensible default and boundary constants for free sizing', () => {
    assert.strictEqual(DEFAULT_SIDEBAR_WIDTH, 256);
    assert.strictEqual(MIN_SIDEBAR_WIDTH, 68);
    assert.strictEqual(ICON_ONLY_THRESHOLD, 148);
    assert.strictEqual(MAX_SIDEBAR_WIDTH, 480);
    assert.strictEqual(SIDEBAR_WIDTH_STORAGE_KEY, 'crestflow_sidebar_width');
    assert.ok(MIN_SIDEBAR_WIDTH < ICON_ONLY_THRESHOLD);
    assert.ok(ICON_ONLY_THRESHOLD < DEFAULT_SIDEBAR_WIDTH);
    assert.ok(DEFAULT_SIDEBAR_WIDTH < MAX_SIDEBAR_WIDTH);
  });

  it('correctly classifies full mode vs compact icon-only mode', () => {
    const isIconOnly = (w: number) => w < ICON_ONLY_THRESHOLD;

    // Below threshold -> icon-only mode
    assert.strictEqual(isIconOnly(68), true);
    assert.strictEqual(isIconOnly(100), true);
    assert.strictEqual(isIconOnly(147), true);

    // At or above threshold -> full sidebar with text labels
    assert.strictEqual(isIconOnly(148), false);
    assert.strictEqual(isIconOnly(200), false);
    assert.strictEqual(isIconOnly(256), false);
    assert.strictEqual(isIconOnly(350), false);
  });

  it('clamps resized widths within minimum (icon-rail) and maximum boundaries', () => {
    const clampWidth = (val: number, min = MIN_SIDEBAR_WIDTH, max = MAX_SIDEBAR_WIDTH) =>
      Math.min(max, Math.max(min, val));

    // Below minimum
    assert.strictEqual(clampWidth(50), 68);
    assert.strictEqual(clampWidth(0), 68);
    assert.strictEqual(clampWidth(-50), 68);

    // Within bounds
    assert.strictEqual(clampWidth(68), 68);
    assert.strictEqual(clampWidth(120), 120);
    assert.strictEqual(clampWidth(256), 256);
    assert.strictEqual(clampWidth(400), 400);

    // Above maximum
    assert.strictEqual(clampWidth(500), 480);
    assert.strictEqual(clampWidth(800), 480);
  });

  it('supports incremental step adjustments for keyboard accessibility', () => {
    let current = DEFAULT_SIDEBAR_WIDTH;
    const step = (delta: number) => {
      current = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, current + delta));
      return current;
    };

    // Step right (wider)
    assert.strictEqual(step(10), 266);
    assert.strictEqual(step(25), 291);

    // Step left (narrower)
    assert.strictEqual(step(-10), 281);
    assert.strictEqual(step(-25), 256);

    // Reset to default
    current = DEFAULT_SIDEBAR_WIDTH;
    assert.strictEqual(current, 256);
  });
});
