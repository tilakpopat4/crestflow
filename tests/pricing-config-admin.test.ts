import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_PRICING_CONFIG, mergePricingConfig } from '../src/lib/pricingConfig';
import { DEFAULT_FOOTER_CONFIG, mergeFooterConfig } from '../src/lib/footerConfig';
import { getTrialDisclosureText } from '../src/lib/subscriptionPlans';
import { handleAdminSettings, handleGetPricingConfig, handleGetFooterConfig } from '../worker/routes/adminSettings';
import { Env } from '../worker/types';
import { createMockIdToken } from './mockWebhookFetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const { privateKey: testPrivateKeyPem } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const TEST_ENV: Env = {
  ASSETS: { fetch: async () => new Response('Asset') },
  RAZORPAY_KEY_ID: 'rzp_test_key',
  RAZORPAY_KEY_SECRET: 'rzp_test_sec',
  RAZORPAY_WEBHOOK_SECRET: 'rzp_wh_sec',
  RAZORPAY_PLAN_MONTHLY: 'plan_m',
  RAZORPAY_PLAN_YEARLY: 'plan_y',
  FIREBASE_SERVICE_ACCOUNT: JSON.stringify({
    project_id: 'test-project',
    client_email: 'test@serviceaccount.com',
    private_key: testPrivateKeyPem,
  }),
  FIREBASE_PROJECT_ID: 'test-project',
};

const systemSettingsStore = new Map<string, any>();

beforeEach(() => {
  systemSettingsStore.clear();

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = input.toString();

    if (urlStr.includes('securetoken@system.gserviceaccount.com')) {
      const pubKeyObj = crypto.createPublicKey(testPrivateKeyPem);
      const jwk = pubKeyObj.export({ format: 'jwk' }) as any;
      return new Response(JSON.stringify({ keys: [{ ...jwk, kid: 'mock_kid', alg: 'RS256', use: 'sig' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (urlStr.includes('oauth2.googleapis.com/token')) {
      return new Response(JSON.stringify({ access_token: 'mock_google_token', expires_in: 3600 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (urlStr.includes('/documents/admin_users/')) {
      return new Response(JSON.stringify({ error: { code: 404 } }), { status: 404 });
    }

    if (urlStr.includes('/documents/system_settings/')) {
      const key = urlStr.split('/documents/system_settings/')[1].split('?')[0];
      if (init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body || '{}'));
        systemSettingsStore.set(key, body.fields || {});
        return new Response(JSON.stringify({ name: key, fields: body.fields }), { status: 200 });
      }
      if (!systemSettingsStore.has(key)) {
        return new Response(JSON.stringify({ error: { code: 404 } }), { status: 404 });
      }
      return new Response(JSON.stringify({ fields: systemSettingsStore.get(key) }), { status: 200 });
    }

    return new Response('Not Found', { status: 404 });
  }) as typeof fetch;
});

describe('Editable Subscription Wall & Admin Pricing Config Suite', () => {
  it('1. mergePricingConfig merges custom features, extraInfo, ctaLabel, and preserves ₹0 trial', () => {
    const merged = mergePricingConfig({
      wallTitle: 'Custom Wall Headline',
      plans: [
        {
          ...DEFAULT_PRICING_CONFIG.plans[0],
          name: 'Free 7-Day Pass',
          price: 99, // must remain locked at 0 for trial
          features: ['Feature A', 'Feature B', '  '],
          extraInfo: 'No card needed.',
          ctaLabel: 'Claim Free Pass',
        },
        {
          ...DEFAULT_PRICING_CONFIG.plans[1],
          price: 89,
          features: ['Unlimited Everything', 'Custom Priority Support'],
          disclosureText: 'Custom billing notice for monthly plan.',
        },
      ],
    });

    assert.equal(merged.wallTitle, 'Custom Wall Headline');
    assert.equal(merged.plans.length, 5);

    const trial = merged.plans.find((p) => p.id === 'trial')!;
    assert.equal(trial.name, 'Free 7-Day Pass');
    assert.equal(trial.price, 0);
    assert.deepEqual(trial.features, ['Feature A', 'Feature B']);
    assert.equal(trial.extraInfo, 'No card needed.');
    assert.equal(trial.ctaLabel, 'Claim Free Pass');

    const monthly = merged.plans.find((p) => p.id === 'monthly')!;
    assert.equal(monthly.price, 89);
    assert.deepEqual(monthly.features, ['Unlimited Everything', 'Custom Priority Support']);
    assert.equal(getTrialDisclosureText(monthly), 'Custom billing notice for monthly plan.');
  });

  it('2. POST /api/admin/settings rejects non-admin and allows Super Admin to publish pricing_config', async () => {
    const userToken = await createMockIdToken('usr_regular', 'freelancer@gmail.com', testPrivateKeyPem);
    const deniedRes = await handleAdminSettings(
      new Request('https://crestflow.space/api/admin/settings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ settingId: 'pricing_config', data: DEFAULT_PRICING_CONFIG }),
      }),
      TEST_ENV
    );
    assert.equal(deniedRes.status, 403);

    const adminToken = await createMockIdToken('usr_admin', 'tilakpopat2007@gmail.com', testPrivateKeyPem);
    const customConfig = mergePricingConfig({
      wallTitle: 'Unlock Your Studio',
      footerNote: 'Powered by CrestFlow Billing.',
    });

    const saveRes = await handleAdminSettings(
      new Request('https://crestflow.space/api/admin/settings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ settingId: 'pricing_config', data: customConfig }),
      }),
      TEST_ENV
    );
    assert.equal(saveRes.status, 200);

    const getRes = await handleGetPricingConfig(TEST_ENV);
    assert.equal(getRes.status, 200);
    assert.equal(getRes.headers.get('Cache-Control'), 'no-store');
    const json = (await getRes.json()) as any;
    assert.equal(json.config.wallTitle, 'Unlock Your Studio');
    assert.equal(json.config.footerNote, 'Powered by CrestFlow Billing.');
    assert.equal(json.config.plans.length, 5);
  });

  it('3. All new and modified subscription/admin files remain <= 300 lines (AGENTS.md)', () => {
    const filesToCheck = [
      'src/lib/pricingConfig.ts',
      'src/lib/footerConfig.ts',
      'src/lib/subscriptionPlans.ts',
      'src/components/admin/AdminPricingManager.tsx',
      'src/components/admin/AdminPlanEditorCard.tsx',
      'src/components/AdminTab.tsx',
      'src/components/subscription/SubscriptionWallPage.tsx',
      'src/components/subscription/PricingPage.tsx',
      'src/components/subscription/PricingCard.tsx',
      'src/components/subscription/PlanSelectionStep.tsx',
      'src/components/SubscriptionModal.tsx',
      'worker/routes/adminSettings.ts',
      'worker/index.ts',
    ];

    for (const relPath of filesToCheck) {
      const lines = fs.readFileSync(path.join(ROOT, relPath), 'utf8').split(/\r?\n/).length;
      assert.ok(lines <= 300, `${relPath} has ${lines} lines (max 300)`);
    }
  });

  it('4. POST /api/admin/settings updates footer_config and handleGetFooterConfig returns it globally with no-store', async () => {
    const adminToken = await createMockIdToken('usr_admin', 'tilakpopat2007@gmail.com', testPrivateKeyPem);
    const customFooter = mergeFooterConfig({
      brandName: 'CrestFlow Studio Global',
      copyrightText: '© 2026 CrestFlow Global. All rights reserved.',
      versionText: '2.0.0',
    });

    const saveRes = await handleAdminSettings(
      new Request('https://crestflow.space/api/admin/settings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ settingId: 'footer_config', data: customFooter }),
      }),
      TEST_ENV
    );
    assert.equal(saveRes.status, 200);

    const getRes = await handleGetFooterConfig(TEST_ENV);
    assert.equal(getRes.status, 200);
    assert.equal(getRes.headers.get('Cache-Control'), 'no-store');
    const json = (await getRes.json()) as any;
    assert.equal(json.config.brandName, 'CrestFlow Studio Global');
    assert.equal(json.config.copyrightText, '© 2026 CrestFlow Global. All rights reserved.');
    assert.equal(json.config.versionText, '2.0.0');
  });
});
