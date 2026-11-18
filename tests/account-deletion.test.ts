import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleDeleteAccount } from '../worker/routes/account';
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
  TRIAL_LEDGER_PEPPER: 'test_pepper',
};

const deletedDocPaths: string[] = [];
const cancelledRazorpaySubs: string[] = [];
const deletedAuthUids: string[] = [];
const preservedTrialLedgerHashes: string[] = [];

beforeEach(() => {
  deletedDocPaths.length = 0;
  cancelledRazorpaySubs.length = 0;
  deletedAuthUids.length = 0;
  preservedTrialLedgerHashes.length = 0;

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

    if (urlStr.includes('api.razorpay.com/v1/subscriptions/') && urlStr.endsWith('/cancel')) {
      const subId = urlStr.split('/subscriptions/')[1].split('/cancel')[0];
      cancelledRazorpaySubs.push(subId);
      return new Response(JSON.stringify({ id: subId, status: 'cancelled' }), { status: 200 });
    }

    if (urlStr.includes('identitytoolkit.googleapis.com/v1/projects/test-project/accounts:delete')) {
      const body = JSON.parse(String(init?.body || '{}'));
      deletedAuthUids.push(body.localId);
      return new Response(JSON.stringify({ kind: 'identitytoolkit#DeleteAccountResponse' }), { status: 200 });
    }

    if (urlStr.includes('/documents/subscriptions/usr_delete_me') && (!init?.method || init.method === 'GET')) {
      return new Response(
        JSON.stringify({
          fields: {
            status: { stringValue: 'active' },
            razorpaySubscriptionId: { stringValue: 'sub_rzp_999' },
            trialClaimed: { booleanValue: true },
          },
        }),
        { status: 200 }
      );
    }

    if (urlStr.includes('/documents/trial_ledger/') && init?.method === 'PATCH') {
      const hash = urlStr.split('/documents/trial_ledger/')[1].split('?')[0];
      preservedTrialLedgerHashes.push(hash);
      return new Response(JSON.stringify({ name: hash }), { status: 200 });
    }

    if (urlStr.endsWith(':runQuery') && init?.method === 'POST') {
      const body = JSON.parse(String(init.body || '{}'));
      const col = body.structuredQuery.from[0].collectionId;
      return new Response(
        JSON.stringify([
          { document: { name: `projects/test-project/databases/(default)/documents/${col}/${col}_1` } },
        ]),
        { status: 200 }
      );
    }

    if (urlStr.endsWith('/profiles/usr_delete_me/private') && (!init?.method || init.method === 'GET')) {
      return new Response(
        JSON.stringify({
          documents: [
            { name: 'projects/test-project/databases/(default)/documents/profiles/usr_delete_me/private/settings' },
          ],
        }),
        { status: 200 }
      );
    }

    if (init?.method === 'DELETE') {
      const docPath = urlStr.split('/documents/')[1];
      deletedDocPaths.push(docPath);
      return new Response('{}', { status: 200 });
    }

    return new Response(JSON.stringify({ error: { code: 404 } }), { status: 404 });
  }) as typeof fetch;
});

describe('POST /api/delete-account Complete Freelancer Account Deletion Suite', () => {
  it('1. Rejects unauthenticated requests with 401', async () => {
    const res = await handleDeleteAccount(
      new Request('https://crestflow.space/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE' }),
      }),
      TEST_ENV
    );
    assert.equal(res.status, 401);
  });

  it('2. Rejects deletion without explicit DELETE confirmation with 400', async () => {
    const token = await createMockIdToken('usr_delete_me', 'creator@gmail.com', testPrivateKeyPem);
    const res = await handleDeleteAccount(
      new Request('https://crestflow.space/api/delete-account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'yes' }),
      }),
      TEST_ENV
    );
    assert.equal(res.status, 400);
    assert.equal(deletedAuthUids.length, 0);
  });

  it('3. Completely deletes Firestore workspace, cancels Razorpay sub, preserves trial_ledger, and deletes Firebase Auth user', async () => {
    const token = await createMockIdToken('usr_delete_me', 'creator@gmail.com', testPrivateKeyPem);
    const res = await handleDeleteAccount(
      new Request('https://crestflow.space/api/delete-account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE' }),
      }),
      TEST_ENV
    );

    assert.equal(res.status, 200);
    const json = (await res.json()) as any;
    assert.equal(json.success, true);
    assert.equal(json.uid, 'usr_delete_me');

    // Razorpay active recurring subscription cancelled
    assert.deepEqual(cancelledRazorpaySubs, ['sub_rzp_999']);

    // Lifetime trial ledger preserved (anti-abuse)
    assert.equal(preservedTrialLedgerHashes.length, 1);

    // Owned collections + private settings + profile + public_profile + subscription deleted
    assert.ok(deletedDocPaths.includes('clients/clients_1'));
    assert.ok(deletedDocPaths.includes('workItems/workItems_1'));
    assert.ok(deletedDocPaths.includes('invoices/invoices_1'));
    assert.ok(deletedDocPaths.includes('notes/notes_1'));
    assert.ok(deletedDocPaths.includes('reviews/reviews_1'));
    assert.ok(deletedDocPaths.includes('serviceRequests/serviceRequests_1'));
    assert.ok(deletedDocPaths.includes('profiles/usr_delete_me/private/settings'));
    assert.ok(deletedDocPaths.includes('profiles/usr_delete_me'));
    assert.ok(deletedDocPaths.includes('public_profiles/usr_delete_me'));
    assert.ok(deletedDocPaths.includes('subscriptions/usr_delete_me'));

    // Firebase Auth account deleted
    assert.deepEqual(deletedAuthUids, ['usr_delete_me']);
  });

  it('4. Account deletion files comply with AGENTS.md 300-line limit', () => {
    const files = [
      'worker/routes/account.ts',
      'worker/firestoreAuth.ts',
      'worker/index.ts',
      'src/components/profile/ProfileDangerSection.tsx',
      'src/components/profile/ProfileNavSidebar.tsx',
      'src/components/ProfilePage.tsx',
    ];
    for (const rel of files) {
      const lines = fs.readFileSync(path.join(ROOT, rel), 'utf8').split(/\r?\n/).length;
      assert.ok(lines <= 300, `${rel} has ${lines} lines (max 300)`);
    }
  });
});
