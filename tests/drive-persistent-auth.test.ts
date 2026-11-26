import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleDriveRoutes } from '../worker/routes/drive';
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
  FIREBASE_SERVICE_ACCOUNT: JSON.stringify({
    project_id: 'test-project',
    client_email: 'test@serviceaccount.com',
    private_key: testPrivateKeyPem,
  }),
  FIREBASE_PROJECT_ID: 'test-project',
  GOOGLE_DRIVE_CLIENT_ID: 'drive-client-id.apps.googleusercontent.com',
  GOOGLE_DRIVE_CLIENT_SECRET: 'drive-client-secret',
};

const firestoreStore = new Map<string, Record<string, any>>();
let simulateInvalidGrant = false;
let revokedTokens: string[] = [];

beforeEach(() => {
  firestoreStore.clear();
  firestoreStore.set('entitlements/uid_creator', {
    userId: { stringValue: 'uid_creator' },
    status: { stringValue: 'active' },
    plan: { stringValue: 'pro_monthly' },
    validUntil: { timestampValue: new Date(Date.now() + 86400_000).toISOString() },
  });
  simulateInvalidGrant = false;
  revokedTokens = [];

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
      const bodyStr = String(init?.body || '');
      if (bodyStr.includes('grant_type=authorization_code')) {
        return new Response(
          JSON.stringify({
            access_token: 'fresh_oauth_access_token',
            refresh_token: 'perm_refresh_token_123',
            expires_in: 3600,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (bodyStr.includes('grant_type=refresh_token')) {
        if (simulateInvalidGrant) {
          return new Response(JSON.stringify({ error: 'invalid_grant' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(
          JSON.stringify({
            access_token: 'silently_refreshed_access_token',
            expires_in: 3600,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ access_token: 'mock_sa_token', expires_in: 3600 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (urlStr.includes('oauth2.googleapis.com/revoke')) {
      const tokenParam = new URL(urlStr).searchParams.get('token') || '';
      revokedTokens.push(tokenParam);
      return new Response('', { status: 200 });
    }

    if (urlStr.includes('googleapis.com/oauth2/v2/userinfo')) {
      return new Response(JSON.stringify({ email: 'creator@example.com' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const docMatch = urlStr.match(/\/documents\/([^?]+)/);
    if (docMatch) {
      const docPath = docMatch[1];
      if (init?.method === 'PATCH') {
        const parsed = JSON.parse(String(init.body || '{}'));
        const existing = firestoreStore.get(docPath) || {};
        firestoreStore.set(docPath, { ...existing, ...(parsed.fields || {}) });
        return new Response(JSON.stringify({ name: docPath, fields: firestoreStore.get(docPath) }), { status: 200 });
      }
      const existing = firestoreStore.get(docPath);
      if (!existing) return new Response('Not Found', { status: 404 });
      return new Response(JSON.stringify({ name: docPath, fields: existing }), { status: 200 });
    }

    return new Response('{}', { status: 200 });
  }) as any;
});

async function authHeaders(uid = 'uid_creator', email = 'creator@example.com'): Promise<Record<string, string>> {
  const token = await createMockIdToken(uid, email, testPrivateKeyPem);
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

describe('Persistent Google Drive Connection API & Client Integration', () => {
  it('rejects unauthenticated requests to /api/drive/status with 401 and unentitled /api/drive/session with 403', async () => {
    const req = new Request('https://crestflow.space/api/drive/status', { method: 'GET' });
    const res = await handleDriveRoutes(req, new URL(req.url), TEST_ENV);
    assert.ok(res);
    assert.equal(res.status, 401);

    firestoreStore.delete('entitlements/uid_creator');
    const headers = await authHeaders();
    const deniedRes = await handleDriveRoutes(
      new Request('https://crestflow.space/api/drive/session', {
        method: 'POST',
        headers,
        body: JSON.stringify({ accessToken: 'tok_unentitled' }),
      }),
      new URL('https://crestflow.space/api/drive/session'),
      TEST_ENV
    );
    assert.equal(deniedRes?.status, 403);
    const deniedJson = (await deniedRes!.json()) as any;
    assert.equal(deniedJson.code, 'ENTITLEMENT_REQUIRED');
  });

  it('persists Firebase Drive session across tabs/reloads via /api/drive/session & /api/drive/status', async () => {
    const headers = await authHeaders();
    const saveReq = new Request('https://crestflow.space/api/drive/session', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        accessToken: 'firebase_drive_tok_1',
        expiresAt: Date.now() + 50 * 60 * 1000,
        email: 'creator@example.com',
      }),
    });
    const saveRes = await handleDriveRoutes(saveReq, new URL(saveReq.url), TEST_ENV);
    assert.equal(saveRes?.status, 200);
    const savedBody = (await saveRes!.json()) as any;
    assert.equal(savedBody.connected, true);

    const statusReq = new Request('https://crestflow.space/api/drive/status', { method: 'GET', headers });
    const statusRes = await handleDriveRoutes(statusReq, new URL(statusReq.url), TEST_ENV);
    assert.equal(statusRes?.status, 200);
    const statusBody = (await statusRes!.json()) as any;
    assert.equal(statusBody.connected, true);
    assert.equal(statusBody.email, 'creator@example.com');
    assert.equal(statusBody.supportsOfflineRefresh, true);

    const tokReq = new Request('https://crestflow.space/api/drive/token', { method: 'GET', headers });
    const tokRes = await handleDriveRoutes(tokReq, new URL(tokReq.url), TEST_ENV);
    const tokBody = (await tokRes!.json()) as any;
    assert.equal(tokBody.accessToken, 'firebase_drive_tok_1');
  });

  it('exchanges GIS code for permanent refresh_token and silently refreshes when expired or forced', async () => {
    const headers = await authHeaders();
    const exReq = new Request('https://crestflow.space/api/drive/exchange', {
      method: 'POST',
      headers,
      body: JSON.stringify({ code: 'gis_auth_code_xyz' }),
    });
    const exRes = await handleDriveRoutes(exReq, new URL(exReq.url), TEST_ENV);
    assert.equal(exRes?.status, 200);
    const exBody = (await exRes!.json()) as any;
    assert.equal(exBody.connected, true);
    assert.equal(exBody.permanent, true);
    assert.equal(exBody.accessToken, 'fresh_oauth_access_token');

    // Force silent refresh using stored refresh_token
    const forceReq = new Request('https://crestflow.space/api/drive/token?force=1', { method: 'GET', headers });
    const forceRes = await handleDriveRoutes(forceReq, new URL(forceReq.url), TEST_ENV);
    assert.equal(forceRes?.status, 200);
    const forceBody = (await forceRes!.json()) as any;
    assert.equal(forceBody.connected, true);
    assert.equal(forceBody.permanent, true);
    assert.equal(forceBody.accessToken, 'silently_refreshed_access_token');
  });

  it('clears stored credentials and reports revoked:true when Google returns invalid_grant', async () => {
    const headers = await authHeaders();
    await handleDriveRoutes(
      new Request('https://crestflow.space/api/drive/exchange', {
        method: 'POST',
        headers,
        body: JSON.stringify({ code: 'gis_auth_code_xyz' }),
      }),
      new URL('https://crestflow.space/api/drive/exchange'),
      TEST_ENV
    );

    simulateInvalidGrant = true;
    const forceReq = new Request('https://crestflow.space/api/drive/token?force=1', { method: 'GET', headers });
    const forceRes = await handleDriveRoutes(forceReq, new URL(forceReq.url), TEST_ENV);
    const forceBody = (await forceRes!.json()) as any;
    assert.equal(forceBody.connected, false);
    assert.equal(forceBody.revoked, true);
    assert.equal(forceBody.accessToken, null);
  });

  it('disconnects Google Drive, revokes token, and marks status disconnected', async () => {
    const headers = await authHeaders();
    await handleDriveRoutes(
      new Request('https://crestflow.space/api/drive/exchange', {
        method: 'POST',
        headers,
        body: JSON.stringify({ code: 'gis_auth_code_xyz' }),
      }),
      new URL('https://crestflow.space/api/drive/exchange'),
      TEST_ENV
    );

    const discReq = new Request('https://crestflow.space/api/drive/disconnect', { method: 'POST', headers });
    const discRes = await handleDriveRoutes(discReq, new URL(discReq.url), TEST_ENV);
    assert.equal(discRes?.status, 200);
    assert.ok(revokedTokens.includes('perm_refresh_token_123'));

    const statusReq = new Request('https://crestflow.space/api/drive/status', { method: 'GET', headers });
    const statusRes = await handleDriveRoutes(statusReq, new URL(statusReq.url), TEST_ENV);
    const statusBody = (await statusRes!.json()) as any;
    assert.equal(statusBody.connected, false);
  });

  it('uses persistent localStorage, drive.file-only scope, and Disconnect UI in client modules', () => {
    const storageSrc = fs.readFileSync(path.join(ROOT, 'src/lib/driveStorage.ts'), 'utf8');
    const authSrc = fs.readFileSync(path.join(ROOT, 'src/lib/driveAuth.ts'), 'utf8');
    const modalSrc = fs.readFileSync(path.join(ROOT, 'src/components/GoogleDriveUploadModal.tsx'), 'utf8');

    assert.ok(storageSrc.includes('localStorage.setItem'), 'Drive connection must persist in localStorage');
    assert.ok(!authSrc.includes('gmail.send'), 'Drive auth must not request restricted gmail.send scope');
    assert.ok(!authSrc.includes('gmail.compose'), 'Drive auth must not request restricted gmail.compose scope');
    assert.ok(authSrc.includes('login_hint'), 'Firebase fallback should pass login_hint to skip account chooser');
    assert.ok(modalSrc.includes('checkDriveConnectionStatus'), 'Modal must sync Drive connection state on open');
    assert.ok(modalSrc.includes('handleDisconnectDrive'), 'Modal must allow intentional disconnect');
  });
});
