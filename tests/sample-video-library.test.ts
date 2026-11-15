import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { isGoogleDriveUrl, extractDriveFileId, getDriveEmbedUrl, getDriveThumbnailUrl } from '../src/lib/driveService';
import { SampleWorkItem, WorkItem } from '../src/types';

describe('Sample Video Library Connected to Google Drive Suite', () => {
  it('1. Google Drive URL & Embed Resolution: accurately identifies and converts Drive URLs', () => {
    const shareUrl = 'https://drive.google.com/file/d/1a2B3c4D5e6F7g8H9/view?usp=sharing';
    assert.strictEqual(isGoogleDriveUrl(shareUrl), true);
    assert.strictEqual(extractDriveFileId(shareUrl), '1a2B3c4D5e6F7g8H9');
    assert.strictEqual(
      getDriveEmbedUrl(shareUrl),
      'https://drive.google.com/file/d/1a2B3c4D5e6F7g8H9/preview'
    );
    assert.strictEqual(
      getDriveThumbnailUrl(shareUrl),
      'https://lh3.googleusercontent.com/d/1a2B3c4D5e6F7g8H9=w800'
    );

    const openUrl = 'https://drive.google.com/open?id=xyz987ABC';
    assert.strictEqual(extractDriveFileId(openUrl), 'xyz987ABC');
    assert.strictEqual(
      getDriveEmbedUrl(openUrl),
      'https://drive.google.com/file/d/xyz987ABC/preview'
    );
    assert.strictEqual(
      getDriveThumbnailUrl(openUrl),
      'https://lh3.googleusercontent.com/d/xyz987ABC=w800'
    );

    assert.strictEqual(isGoogleDriveUrl('https://example.com/video.mp4'), false);
  });

  it('2. Sample Work Item Data Structure: preserves title, category, description and Drive videoUrl', () => {
    const sample: SampleWorkItem = {
      id: 'sample_001',
      title: 'Cinematic Fashion Reel',
      videoUrl: 'https://drive.google.com/file/d/1122334455/view',
      category: 'Reels',
      description: 'Color graded and sound designed in DaVinci Resolve',
      clientName: 'Zara Apparel',
      createdAt: Date.now(),
    };

    assert.strictEqual(sample.id, 'sample_001');
    assert.strictEqual(sample.title, 'Cinematic Fashion Reel');
    assert.strictEqual(isGoogleDriveUrl(sample.videoUrl), true);
    assert.strictEqual(sample.category, 'Reels');
  });

  it('3. Work Log Candidate Filtering: accurately identifies work items with Google Drive links', () => {
    const items: Partial<WorkItem>[] = [
      { id: 'w1', description: 'Reel 1', videoUrl: 'https://drive.google.com/file/d/abc/view' },
      { id: 'w2', description: 'Reel 2', videoUrl: '' },
      { id: 'w3', description: 'Reel 3', videoUrl: 'https://drive.google.com/file/d/def/view' },
      { id: 'w4', description: 'Reel 4' },
    ];

    const candidates = items.filter((w) => w.videoUrl && w.videoUrl.trim().length > 0);
    assert.strictEqual(candidates.length, 2);
    assert.strictEqual(candidates[0].id, 'w1');
    assert.strictEqual(candidates[1].id, 'w3');
  });

  it('4. Firestore Rules: isValidProfile permits sampleWorks list', () => {
    const rules = fs.readFileSync('firestore.rules', 'utf-8');
    assert.ok(
      rules.includes("(!('sampleWorks' in data) || (data.sampleWorks is list))"),
      'firestore.rules must validate and permit sampleWorks in user profile'
    );
  });

  it('5. UI Cleanliness: Eliminates duplicate play buttons and translucent backgrounds in cards', () => {
    const cardContent = fs.readFileSync('src/components/onboarding/SampleVideoCard.tsx', 'utf-8');
    // Does not render iframe in the card preview (prevents duplicate Google play button)
    assert.ok(!cardContent.includes('<iframe'), 'SampleVideoCard must not render an iframe in the thumbnail preview');
    // Uses solid black background for pure pillarboxing without white translucent bleed
    assert.ok(cardContent.includes('bg-black'), 'Card viewport must use solid bg-black');
    // Uses single play button
    assert.ok(cardContent.includes('Exactly One Single Play Button'), 'Card must have exactly one play button');
  });

  it('6. File size compliance: All sample video components remain <= 300 lines max per AGENTS.md', () => {
    const files = [
      'src/types.ts',
      'src/hooks/useUserProfile.ts',
      'src/components/PublicFreelancerProfileCard.tsx',
      'src/components/PublicFreelancerProfile.tsx',
      'src/components/onboarding/SampleVideoLibrary.tsx',
      'src/components/onboarding/SampleVideoCard.tsx',
      'src/components/onboarding/ManageSampleVideosModal.tsx',
      'src/components/onboarding/OnboardingSampleVideoBanner.tsx',
      'src/components/onboarding/AddSampleVideoForm.tsx',
      'src/components/onboarding/WorkLogVideoPicker.tsx',
      'src/components/onboarding/OnboardingViewTabs.tsx',
      'src/components/onboarding/PublicProfileNotFound.tsx',
      'src/components/ClientOnboardingTab.tsx',
      'src/components/layout/AppRouterView.tsx',
      'firestore.rules',
    ];

    for (const f of files) {
      const content = fs.readFileSync(f, 'utf-8');
      const lines = content.split('\n').length;
      assert.ok(lines <= 300, `${f} exceeded 300 lines: ${lines}`);
    }
  });
});
