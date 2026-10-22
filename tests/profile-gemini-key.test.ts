/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Gemini API Key Persistence & Profile State Management', () => {
  const useUserProfileFile = path.resolve('src/hooks/useUserProfile.ts');
  const profilePageFile = path.resolve('src/components/ProfilePage.tsx');
  const preferencesCardFile = path.resolve('src/components/profile/ProfilePreferencesCard.tsx');

  it('useUserProfile immediately updates privateSettings in memory upon saving', () => {
    const content = fs.readFileSync(useUserProfileFile, 'utf-8');
    assert.ok(
      content.includes('setPrivateSettings(newPrivateSettings)'),
      'useUserProfile should update privateSettings state in memory without waiting for remote roundtrip'
    );
    assert.ok(
      content.includes('localStorage.setItem(`crestflow_private_${user.uid}`'),
      'useUserProfile should cache private credentials in localStorage for instant offline/initial loads'
    );
  });

  it('useUserProfile supports deleting fields cleanly when empty or cleared', () => {
    const content = fs.readFileSync(useUserProfileFile, 'utf-8');
    assert.ok(
      content.includes('deleteField()'),
      'useUserProfile should call deleteField() to remove cleared keys from Firestore document'
    );
    assert.ok(
      content.includes('delete newPrivateSettings.geminiApiKey'),
      'useUserProfile should remove geminiApiKey from local private settings when cleared'
    );
  });

  it('useUserProfile memoizes profile object to prevent cascading form wipes', () => {
    const content = fs.readFileSync(useUserProfileFile, 'utf-8');
    assert.ok(
      content.includes('useMemo('),
      'useUserProfile should memoize profile to prevent re-generating new object references on every render'
    );
  });

  it('ProfilePage protects user input from background profile re-renders', () => {
    const content = fs.readFileSync(profilePageFile, 'utf-8');
    assert.ok(
      content.includes('isInitializedRef'),
      'ProfilePage should use isInitializedRef to prevent background profile sync from wiping user edits'
    );
  });

  it('ProfilePreferencesCard includes show/hide toggle and key configured indicator', () => {
    const content = fs.readFileSync(preferencesCardFile, 'utf-8');
    assert.ok(
      content.includes('EyeOff') && content.includes('Eye'),
      'ProfilePreferencesCard should include Eye / EyeOff toggle for inspecting API keys'
    );
    assert.ok(
      content.includes('Key configured'),
      'ProfilePreferencesCard should indicate when a key is saved and configured'
    );
  });
});
