import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import {
  extractOnboardingHandle,
  calculateExperienceText,
  injectPersonalizedOnboardingMeta,
  PublicFreelancerMeta,
} from '../worker/onboardingMeta';

describe('Personalized Onboarding Link Preview Suite', () => {
  it('1. Extracts username handle accurately from various onboarding routes', () => {
    assert.strictEqual(extractOnboardingHandle('/tilakpopat2007/onboarding'), 'tilakpopat2007');
    assert.strictEqual(extractOnboardingHandle('/akshatpopat/onboarding/'), 'akshatpopat');
    assert.strictEqual(extractOnboardingHandle('/onboarding/user_abc'), 'user_abc');
    assert.strictEqual(extractOnboardingHandle('/client-onboarding/xyz_99'), 'xyz_99');
    assert.strictEqual(extractOnboardingHandle('/dashboard'), null);
    assert.strictEqual(extractOnboardingHandle('/pricing'), null);
  });

  it('2. Formats experience duration accurately for link preview description', () => {
    // 9 months ago
    const nineMonthsAgo = new Date();
    nineMonthsAgo.setMonth(nineMonthsAgo.getMonth() - 9);
    const dateStr = nineMonthsAgo.toISOString().split('T')[0];
    const expText = calculateExperienceText(dateStr);
    assert.ok(expText.includes('month') || expText.includes('mo'), `Expected months in: ${expText}`);

    // Fallback when missing or invalid
    assert.strictEqual(calculateExperienceText(null), 'verified professional');
    assert.strictEqual(calculateExperienceText('invalid-date'), 'verified professional');
  });

  it('3. Injects personalized metadata: Heading Claim The Service of <Name>, experience, and DP', () => {
    const rawHtml = fs.readFileSync('index.html', 'utf-8');
    const mockProfile: PublicFreelancerMeta = {
      userId: 'xVglbVvnrSNVzJG7OBYatahRBQ02',
      username: 'tilakpopat2007',
      name: 'Tilak Popat',
      professionalTitle: 'Video Editor',
      servicesDescription: 'Video Editing & Visual Storytelling',
      photoURL: 'https://lh3.googleusercontent.com/test-avatar.jpg',
      freelanceStartDate: '2026-02-14',
    };

    const targetUrl = 'https://crestflow.space/tilakpopat2007/onboarding';
    const resultHtml = injectPersonalizedOnboardingMeta(rawHtml, mockProfile, targetUrl);

    // Title tag
    assert.ok(
      resultHtml.includes('<title>Claim The Service of Tilak Popat | CrestFlow</title>'),
      'HTML title must be personalized with "Claim The Service of <Name>"'
    );

    // OG Title
    assert.ok(
      resultHtml.includes('<meta property="og:title" content="Claim The Service of Tilak Popat" />'),
      'og:title must contain "Claim The Service of Tilak Popat"'
    );

    // Twitter Title
    assert.ok(
      resultHtml.includes('<meta name="twitter:title" content="Claim The Service of Tilak Popat" />'),
      'twitter:title must contain "Claim The Service of Tilak Popat"'
    );

    // Description with experience
    assert.ok(
      resultHtml.includes('Having ') && resultHtml.includes('experience'),
      'og:description must state "Having <X> experience"'
    );

    // DP / Profile Photo
    assert.ok(
      resultHtml.includes('<meta property="og:image" content="https://lh3.googleusercontent.com/test-avatar.jpg" />'),
      'og:image must be the freelancer DP'
    );
    assert.ok(
      resultHtml.includes('<meta name="twitter:image" content="https://lh3.googleusercontent.com/test-avatar.jpg" />'),
      'twitter:image must be the freelancer DP'
    );

    // Canonical URL
    assert.ok(
      resultHtml.includes(`<meta property="og:url" content="${targetUrl}" />`),
      'og:url must match the personalized onboarding URL'
    );
  });

  it('4. Files remain under 300 lines max per AGENTS.md', () => {
    const files = [
      'worker/onboardingMeta.ts',
      'worker/staticHandler.ts',
      'src/components/PublicFreelancerProfile.tsx',
    ];

    for (const f of files) {
      const lines = fs.readFileSync(f, 'utf-8').split('\n').length;
      assert.ok(lines <= 300, `${f} exceeded 300 lines: ${lines}`);
    }
  });
});
