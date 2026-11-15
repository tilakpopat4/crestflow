import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { resolveRoute } from '../src/lib/router';
import { getOnboardingUrl, getPublicProfileUrl } from '../src/lib/userHandle';

describe('Public Onboarding & Unified Profile Route Suite', () => {
  it('1. Unified Routing: /:username/publicprofile resolves to /:username/onboarding', () => {
    const onboardingMatch = resolveRoute('/tilakpopat2007/onboarding');
    assert.strictEqual(onboardingMatch.isSpecialMode, 'freelancer_profile');
    assert.strictEqual(onboardingMatch.path, '/tilakpopat2007/onboarding');
    assert.strictEqual(onboardingMatch.params.username, 'tilakpopat2007');
    assert.strictEqual(onboardingMatch.params.mode, 'onboarding');

    const publicProfileMatch = resolveRoute('/tilakpopat2007/publicprofile');
    assert.strictEqual(publicProfileMatch.isSpecialMode, 'freelancer_profile');
    assert.strictEqual(publicProfileMatch.path, '/tilakpopat2007/onboarding');
    assert.strictEqual(publicProfileMatch.params.username, 'tilakpopat2007');
    assert.strictEqual(publicProfileMatch.params.mode, 'onboarding');

    const legacyProfileMatch = resolveRoute('/publicprofile/user_123');
    assert.strictEqual(legacyProfileMatch.isSpecialMode, 'freelancer_profile');
    assert.strictEqual(legacyProfileMatch.path, '/onboarding/user_123');
    assert.strictEqual(legacyProfileMatch.params.freelancerId, 'user_123');
  });

  it('2. URL Canonicalization: getPublicProfileUrl returns getOnboardingUrl', () => {
    const handle = 'tilakpopat2007';
    const onboardingUrl = getOnboardingUrl(handle);
    const publicProfileUrl = getPublicProfileUrl(handle);

    assert.strictEqual(onboardingUrl, 'https://crestflow.tilakpopat2007.workers.dev/tilakpopat2007/onboarding');
    assert.strictEqual(publicProfileUrl, onboardingUrl);
  });

  it('3. Firestore Rules: public_profiles allows unauthenticated read, while profiles & system_settings remain protected', () => {
    const rules = fs.readFileSync('firestore.rules', 'utf-8').replace(/\r\n/g, '\n');

    // public_profiles is publicly readable for onboarding on all devices
    assert.ok(
      rules.includes('match /public_profiles/{profileId} {\n      allow read: if true;'),
      'public_profiles must allow public read for prospective clients'
    );

    // profiles remains strictly owner-authenticated
    assert.ok(
      rules.includes('match /profiles/{profileId} {\n      allow read: if isSignedIn()'),
      'profiles root collection must strictly require authentication'
    );

    // system_settings remains completely client-denied
    assert.ok(
      rules.includes('match /system_settings/{settingId} {\n      allow read, write: if false;'),
      'system_settings must deny client reads and writes'
    );
  });

  it('4. File size compliance: All modified files remain under 300 lines max per AGENTS.md', () => {
    const files = [
      'src/lib/router.ts',
      'src/lib/userHandle.ts',
      'src/lib/profileLookup.ts',
      'src/components/PublicFreelancerProfile.tsx',
      'src/components/profile/ProfilePublicLinksCard.tsx',
      'src/components/profile/ProfilePublicSection.tsx',
      'worker/routes/publicProfile.ts',
      'worker/index.ts',
      'firestore.rules',
    ];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n').length;
      assert.ok(lines <= 300, `${file} has ${lines} lines, exceeding the 300-line limit`);
    }
  });
});
