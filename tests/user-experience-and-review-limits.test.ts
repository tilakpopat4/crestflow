import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { SITE_URL } from '../src/lib/siteConfig';
import { getOnboardingUrl, getPortalUrl, resolveOrigin } from '../src/lib/userHandle';

describe('User Experience, Domain, and Review Limits Suite', () => {
  it('1. Domain Verification: SITE_URL points strictly to crestflow.space and nonum.online is eradicated', () => {
    assert.strictEqual(SITE_URL, 'https://crestflow.space');
    const resolved = resolveOrigin();
    assert.strictEqual(resolved, 'https://crestflow.space');

    const onboardingUrl = getOnboardingUrl('tilakpopat');
    assert.strictEqual(onboardingUrl, 'https://crestflow.space/tilakpopat/onboarding');

    const portalUrl = getPortalUrl('tilakpopat');
    assert.strictEqual(portalUrl, 'https://crestflow.space/portal?freelancerId=tilakpopat');
  });

  it('2. Onboarding View Tabs: Enforces dark contrast tokens and eliminates white-on-white text', () => {
    const tabsFile = fs.readFileSync('src/components/onboarding/OnboardingViewTabs.tsx', 'utf-8');
    // Active tabs must not be bg-white with text-slate-900 because text-slate-900 gets overridden to light text in index.css
    assert.ok(!tabsFile.includes('bg-white dark:bg-slate-900 text-slate-900'), 'Must not use bg-white with text-slate-900');
    assert.ok(
      tabsFile.includes("bg-[#1B1B22] text-white") || tabsFile.includes("bg-[#282828] text-white"),
      'Active tab must use graphite/raised bg with explicit white text'
    );
  });

  it('3. Direct Photo Upload: Profile uploader exists and firestore.rules permits photoURL data URLs up to 250KB', () => {
    const uploaderFile = fs.readFileSync('src/components/profile/ProfileAvatarUploader.tsx', 'utf-8');
    assert.ok(uploaderFile.includes('type="file"'), 'Must support native direct file input');
    assert.ok(uploaderFile.includes('processProfileImage'), 'Must process profile image directly');

    const rules = fs.readFileSync('firestore.rules', 'utf-8');
    assert.ok(
      rules.includes('data.photoURL.size() <= 250000'),
      'firestore.rules must allow photoURL up to 250,000 chars for compressed avatars'
    );
  });

  it('4. Onboarding Requests: Requires authentication on submission and binds submittedByUid', () => {
    const rules = fs.readFileSync('firestore.rules', 'utf-8').replace(/\r\n/g, '\n');
    assert.ok(
      rules.includes('match /serviceRequests/{requestId} {\n      allow create: if isSignedIn()'),
      'serviceRequests must require signed-in authentication'
    );
    assert.ok(
      rules.includes('submittedByUid'),
      'serviceRequests must validate submittedByUid against request.auth.uid'
    );

    const onboardingLead = fs.readFileSync('src/lib/onboardingLead.ts', 'utf-8');
    assert.ok(
      onboardingLead.includes('submittedByUid: currentUser.uid'),
      'submitOnboardingServiceRequest must attach current user UID'
    );
  });

  it('5. Reviews & Ratings: Enforces 1-review-per-account guarantee and denies self-reviews', () => {
    const rules = fs.readFileSync('firestore.rules', 'utf-8').replace(/\r\n/g, '\n');
    assert.ok(
      rules.includes('match /reviews/{reviewId} {\n      allow read:'),
      'reviews rule block must exist'
    );
    assert.ok(
      rules.includes('request.resource.data.userId != request.auth.uid'),
      'reviews must disallow reviewing own profile'
    );
    assert.ok(
      rules.includes('request.resource.data.reviewerUid == request.auth.uid'),
      'reviews must ensure reviewerUid matches authenticated auth.uid'
    );

    const feedbackForm = fs.readFileSync('src/components/ClientFeedbackForm.tsx', 'utf-8');
    assert.ok(
      feedbackForm.includes('${currentUser.uid}_${freelancerUid}'),
      'ClientFeedbackForm must use deterministic review document ID to prevent duplicate reviews'
    );
    assert.ok(
      feedbackForm.includes('FeedbackAuthPrompt'),
      'ClientFeedbackForm must prompt for Google sign-in if unauthenticated'
    );
  });

  it('6. AGENTS.md File Size Limits: All modified and new files remain <= 300 lines max', () => {
    const files = [
      'src/components/onboarding/OnboardingViewTabs.tsx',
      'src/components/PublicFreelancerProfile.tsx',
      'src/components/PublicOnboardingForm.tsx',
      'src/components/ClientFeedbackForm.tsx',
      'src/components/feedback/FeedbackSuccessCard.tsx',
      'src/components/feedback/FeedbackAuthPrompt.tsx',
      'src/components/feedback/FeedbackRatingSelector.tsx',
      'src/components/profile/ProfileAvatarUploader.tsx',
      'src/components/profile/ProfilePublicSection.tsx',
      'src/components/ProfilePage.tsx',
      'src/lib/onboardingLead.ts',
      'src/lib/imageUpload.ts',
    ];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n').length;
      assert.ok(
        lines <= 300,
        `File ${file} exceeds 300 lines (actual: ${lines} lines). Must satisfy AGENTS.md.`
      );
    }
  });
});
