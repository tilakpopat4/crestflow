import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { getIstYearMonth, isUserEntitled, handleCreateClient, handleCreateInvoice } from '../worker/routes/limits';
import { MockWebhookState, createMockFetch, createMockIdToken } from './mockWebhookFetch';
import { Env } from '../worker/types';

describe('Server-Enforced Entitlement Quotas & API Gate Suite', () => {
  let originalFetch: typeof globalThis.fetch;
  let mockState: MockWebhookState;
  let privateKeyPem: string;
  let env: Env;

  before(() => {
    const kp = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    privateKeyPem = kp.privateKey;
    const jwk = crypto.createPublicKey(kp.privateKey).export({ format: 'jwk' }) as any;
    originalFetch = globalThis.fetch;
    mockState = {
      processedEvents: new Set(),
      firestoreSubscriptions: new Map(),
      entitlements: new Map(),
      trialLedger: new Map(),
      razorpaySubscriptions: new Map(),
      refundedPayments: [],
      cancelledSubscriptions: [],
      cancellationsDetailed: [],
      sentEmails: [],
      publicKeyJwk: { ...jwk, kid: 'mock_kid', alg: 'RS256', use: 'sig' },
    };
    globalThis.fetch = createMockFetch(mockState, originalFetch);
    env = {
      ASSETS: { fetch: async () => new Response('ok') },
      RAZORPAY_KEY_ID: 'rzp_test_1',
      RAZORPAY_KEY_SECRET: 'rzp_sec_1',
      RAZORPAY_WEBHOOK_SECRET: 'rzp_wh_1',
      FIREBASE_PROJECT_ID: 'test-project',
      FIREBASE_SERVICE_ACCOUNT: JSON.stringify({
        project_id: 'test-project',
        client_email: 'sa@test-project.iam.gserviceaccount.com',
        private_key: privateKeyPem,
      }),
    };
  });

  after(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    mockState.entitlements!.clear();
    mockState.extraDocs?.clear();
  });

  it('1. Asia/Kolkata Month Calculation: correctly formats year and month in IST', () => {
    const lateUtc = new Date('2026-11-14T23:30:00Z');
    const istTime = getIstYearMonth(lateUtc);
    assert.equal(istTime.key, '2026_11');

    const newYearUtc = new Date('2026-12-31T19:00:00Z');
    const newYearIst = getIstYearMonth(newYearUtc);
    assert.equal(newYearIst.key, '2027_01');
  });

  it('2. Entitlement Check: requires validUntil > now and allowed status', () => {
    const now = Date.now();
    assert.equal(isUserEntitled(null, now), false);
    assert.equal(isUserEntitled({ status: 'none', validUntil: new Date(now + 86400000).toISOString() }, now), false);
    assert.equal(isUserEntitled({ status: 'expired', validUntil: new Date(now + 86400000).toISOString() }, now), false);
    assert.equal(isUserEntitled({ status: 'suspended', validUntil: new Date(now + 86400000).toISOString() }, now), false);

    assert.equal(isUserEntitled({ status: 'active', validUntil: new Date(now + 86400000).toISOString() }, now), true);
    assert.equal(isUserEntitled({ status: 'trialing', validUntil: new Date(now + 86400000).toISOString() }, now), true);
    assert.equal(isUserEntitled({ status: 'grace', validUntil: new Date(now + 86400000).toISOString() }, now), true);
    assert.equal(isUserEntitled({ status: 'active', validUntil: new Date(now - 1000).toISOString() }, now), false);
  });

  it('3. Worker client/invoice endpoints reject missing or expired entitlements with ENTITLEMENT_REQUIRED', async () => {
    const uid = 'usr_gate_1';
    const token = createMockIdToken(uid, 'gate@example.com', privateKeyPem);

    const deniedClientRes = await handleCreateClient(
      new Request('https://crestflow.space/api/create-client', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'cli_1', name: 'Acme Studio' }),
      }),
      env
    );
    assert.equal(deniedClientRes.status, 403);
    assert.equal(((await deniedClientRes.json()) as any).code, 'ENTITLEMENT_REQUIRED');

    mockState.entitlements!.set(uid, {
      userId: uid,
      status: 'active',
      plan: 'pro_monthly',
      validUntil: new Date(Date.now() + 86400000).toISOString(),
    });

    const okClientRes = await handleCreateClient(
      new Request('https://crestflow.space/api/create-client', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'cli_1', name: 'Acme Studio' }),
      }),
      env
    );
    assert.equal(okClientRes.status, 201);

    const okInvRes = await handleCreateInvoice(
      new Request('https://crestflow.space/api/create-invoice', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'inv_1', clientName: 'Acme Studio', totalAmount: 5000 }),
      }),
      env
    );
    assert.equal(okInvRes.status, 201);
  });
});
