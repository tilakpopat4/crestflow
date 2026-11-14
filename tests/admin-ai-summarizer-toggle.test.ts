import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';

// Polyfill localStorage for Node test runner
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => { store.set(key, String(val)); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    length: 0
  } as any;
}

import {
  getAiSummarizerFeatureEnabledSync,
  setAiSummarizerFeatureEnabled
} from '../src/lib/aiConfig';
import { ProfilePreferencesCard } from '../src/components/profile/ProfilePreferencesCard';
import AISummarizer from '../src/components/AISummarizer';
import ProfileNavSidebar from '../src/components/profile/ProfileNavSidebar';

describe('Admin AI Summarizer Master Feature Toggle Suite', () => {
  beforeEach(() => {
    // Reset localStorage before each test
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  test('1. Default State: AI Summarizer is disabled by default', () => {
    const isEnabled = getAiSummarizerFeatureEnabledSync();
    assert.strictEqual(isEnabled, false, 'AI summarizer must be disabled by default until admin enables it');
  });

  test('2. Admin Toggle: setAiSummarizerFeatureEnabled toggles state and persists to storage', async () => {
    await setAiSummarizerFeatureEnabled(true);
    assert.strictEqual(getAiSummarizerFeatureEnabledSync(), true, 'Must return true after admin enables AI');

    await setAiSummarizerFeatureEnabled(false);
    assert.strictEqual(getAiSummarizerFeatureEnabledSync(), false, 'Must return false after admin disables AI');
  });

  test('3. Admin Command Center: AdminTab contains the AI Summarizer toggle switch', () => {
    const adminTabContent = fs.readFileSync(path.join(process.cwd(), 'src/components/AdminTab.tsx'), 'utf-8');
    assert.ok(
      adminTabContent.includes('useAiSummarizerConfig'),
      'AdminTab must import and consume useAiSummarizerConfig'
    );
    assert.ok(
      adminTabContent.includes('AI Summarizer:'),
      'AdminTab must render the AI Summarizer title indicator'
    );
    assert.ok(
      adminTabContent.includes('Toggle AI Work Summarizer'),
      'AdminTab must have an accessible switch toggle for AI Work Summarizer'
    );
    assert.ok(
      adminTabContent.includes('handleToggleAi'),
      'AdminTab must have handleToggleAi handler'
    );
  });

  test('4. DashboardTab: AI Summarizer tool and button are conditioned on isAiEnabled', () => {
    const dashboardContent = fs.readFileSync(path.join(process.cwd(), 'src/components/DashboardTab.tsx'), 'utf-8');
    assert.ok(
      dashboardContent.includes('useAiSummarizerConfig'),
      'DashboardTab must import useAiSummarizerConfig'
    );
    assert.ok(
      dashboardContent.includes('{isAiEnabled && (') && dashboardContent.includes('AI Summarizer'),
      'AI Summarizer button must be wrapped in isAiEnabled check'
    );
    assert.ok(
      dashboardContent.includes('{isAiEnabled && activeWorkspaceTool === \'ai\' && ('),
      'AI Summarizer component must be guarded by isAiEnabled'
    );
  });

  test('5. AISummarizer Component: Hidden when AI feature is disabled', () => {
    // When disabled
    const htmlDisabled = ReactDOMServer.renderToStaticMarkup(
      React.createElement(AISummarizer, { clients: [], workItems: [], profile: null })
    );
    assert.strictEqual(htmlDisabled, '', 'AISummarizer must return null when disabled');

    // When enabled
    localStorage.setItem('crestflow_ai_summarizer_enabled', 'true');
    const htmlEnabled = ReactDOMServer.renderToStaticMarkup(
      React.createElement(AISummarizer, { clients: [], workItems: [], profile: null })
    );
    assert.ok(htmlEnabled.includes('AI Work Summarizer'), 'AISummarizer must render when enabled');
  });

  test('6. ProfileNavSidebar: AI & Automations nav link is hidden when AI feature is disabled', () => {
    // When disabled
    localStorage.setItem('crestflow_ai_summarizer_enabled', 'false');
    const htmlDisabled = ReactDOMServer.renderToStaticMarkup(
      React.createElement(ProfileNavSidebar, {
        activeSection: 'profile',
        onSelectSection: () => {},
        hasSubscription: true
      })
    );
    assert.ok(!htmlDisabled.includes('AI &amp; Automations') && !htmlDisabled.includes('AI & Automations'), 'AI nav link must be hidden when disabled');

    // When enabled
    localStorage.setItem('crestflow_ai_summarizer_enabled', 'true');
    const htmlEnabled = ReactDOMServer.renderToStaticMarkup(
      React.createElement(ProfileNavSidebar, {
        activeSection: 'profile',
        onSelectSection: () => {},
        hasSubscription: true
      })
    );
    assert.ok(htmlEnabled.includes('AI &amp; Automations') || htmlEnabled.includes('AI & Automations'), 'AI nav link must appear when enabled');
  });

  test('7. ProfilePreferencesCard: Hidden when AI feature is disabled', () => {
    // When disabled
    localStorage.setItem('crestflow_ai_summarizer_enabled', 'false');
    const htmlDisabled = ReactDOMServer.renderToStaticMarkup(
      React.createElement(ProfilePreferencesCard, {
        geminiApiKey: '',
        setGeminiApiKey: () => {}
      })
    );
    assert.strictEqual(htmlDisabled, '', 'ProfilePreferencesCard must return null when disabled');

    // When enabled
    localStorage.setItem('crestflow_ai_summarizer_enabled', 'true');
    const htmlEnabled = ReactDOMServer.renderToStaticMarkup(
      React.createElement(ProfilePreferencesCard, {
        geminiApiKey: 'AIzaSyTestKey',
        setGeminiApiKey: () => {}
      })
    );
    assert.ok(htmlEnabled.includes('Gemini AI API Key'), 'ProfilePreferencesCard must render when enabled');
  });

  test('8. ProfilePage: Guards ProfilePreferencesCard with isAiEnabled', () => {
    const profilePageContent = fs.readFileSync(path.join(process.cwd(), 'src/components/ProfilePage.tsx'), 'utf-8');
    assert.ok(
      profilePageContent.includes('{isAiEnabled && (') && profilePageContent.includes('<ProfilePreferencesCard'),
      'ProfilePage must guard ProfilePreferencesCard with isAiEnabled'
    );
  });
});
