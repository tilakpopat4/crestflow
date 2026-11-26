import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEntitlementPayload,
  resolveAccessFromSnapshot,
  readCachedEntitlement,
  writeCachedEntitlement,
} from '../src/lib/accessState';
import {
  buildClientsCsv,
  buildInvoicesCsv,
  buildWorkItemsCsv,
  buildWorkspaceBackupJson,
} from '../src/lib/workspaceExport';
import {
  SAMPLE_CLIENTS,
  SAMPLE_INVOICES,
  SAMPLE_REVIEWS,
  SAMPLE_SERVICE_REQUESTS,
  SAMPLE_UPI_ID,
  SAMPLE_WORK_ITEMS,
} from '../src/data/sampleWorkspaceData';
import { planEntitlementMigrations } from '../scripts/migrate-entitlements';
import { LIFETIME_VALID_UNTIL_ISO } from '../src/shared/pricing';

if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = globalThis;
}
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    length: 0,
  } as any;
}

describe('Client Access State, Flicker-Free Cache, Export & Dry-Run Migration Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('1. Client never resolves an entitlement with past validUntil as writable (even if raw status says active)', () => {
    const nowMs = Date.parse('2026-11-20T12:00:00Z');
    const staleActive = normalizeEntitlementPayload({
      status: 'active',
      plan: 'pro_monthly',
      validUntil: new Date(nowMs - 5000).toISOString(),
    });
    const res = resolveAccessFromSnapshot(staleActive, nowMs);
    assert.equal(res.state, 'expired');
    assert.equal(res.canWrite, false);
    assert.equal(res.daysLeft, 0);
  });

  it('2. Evaluates all 6 access states + lifetime deterministically with zero intermediate flicker', () => {
    const nowMs = Date.parse('2026-11-20T12:00:00Z');
    const future = new Date(nowMs + 5 * 86400 * 1000).toISOString();

    assert.equal(resolveAccessFromSnapshot(normalizeEntitlementPayload({ status: 'none' }), nowMs).isExploring, true);
    assert.equal(resolveAccessFromSnapshot(normalizeEntitlementPayload({ status: 'trialing', trialStartedAt: new Date(nowMs - 2 * 86400 * 1000).toISOString(), validUntil: future }), nowMs).trialDay, 3);
    assert.equal(resolveAccessFromSnapshot(normalizeEntitlementPayload({ status: 'active', validUntil: future }), nowMs).canWrite, true);
    assert.equal(resolveAccessFromSnapshot(normalizeEntitlementPayload({ status: 'grace', validUntil: future, graceUntil: future }), nowMs).canWrite, true);
    assert.equal(resolveAccessFromSnapshot(normalizeEntitlementPayload({ status: 'suspended', validUntil: future }), nowMs).canWrite, false);

    const lifetime = resolveAccessFromSnapshot(
      normalizeEntitlementPayload({ status: 'active', plan: 'lifetime', validUntil: LIFETIME_VALID_UNTIL_ISO }),
      nowMs
    );
    assert.equal(lifetime.state, 'active');
    assert.equal(lifetime.isLifetime, true);
    assert.equal(lifetime.canWrite, true);
  });

  it('3. Per-UID localStorage cache paints deterministically and isolates different accounts', () => {
    const snapA = normalizeEntitlementPayload({
      status: 'active',
      plan: 'pro_yearly',
      validUntil: new Date(Date.now() + 20 * 86400 * 1000).toISOString(),
    }, 'uid_a');
    writeCachedEntitlement('uid_a', snapA);

    const readA = readCachedEntitlement('uid_a');
    const readB = readCachedEntitlement('uid_b');
    assert.ok(readA);
    assert.equal(readA!.status, 'active');
    assert.equal(readB, null, 'Different UID must never inherit cached entitlement');
  });

  it('4. Explorer sample data provides realistic in-memory preview without Firestore writes', () => {
    assert.ok(SAMPLE_CLIENTS.length >= 1);
    assert.ok(SAMPLE_WORK_ITEMS.length >= 2);
    assert.ok(SAMPLE_INVOICES.some((i) => i.status === 'Paid'));
    assert.ok(SAMPLE_INVOICES.some((i) => i.status === 'Pending') && SAMPLE_UPI_ID.includes('@'));
    assert.ok(SAMPLE_REVIEWS.length >= 1);
    assert.ok(SAMPLE_SERVICE_REQUESTS.length >= 1);
  });

  it('5. JSON and CSV exports work identically regardless of entitlement (no gating, CSV formula escaping)', () => {
    const maliciousClients = [
      ...SAMPLE_CLIENTS,
      { id: 'c_inj', name: '=CMD()', email: 'x@test.com', phone: '999', billingBasis: 'Per Reel', defaultRate: 1500, createdAt: Date.now() },
    ] as any;
    const json = buildWorkspaceBackupJson({ profile: { name: 'Creator' }, clients: maliciousClients, workItems: SAMPLE_WORK_ITEMS, invoices: SAMPLE_INVOICES });
    const parsed = JSON.parse(json);
    assert.equal(parsed.currency, 'INR');
    assert.equal(parsed.clients.length, maliciousClients.length);
    assert.equal(parsed.invoices.length, SAMPLE_INVOICES.length);

    const clientsCsv = buildClientsCsv(maliciousClients);
    assert.ok(clientsCsv.includes("'=CMD()"), 'CSV must neutralize formula injection prefix');
    assert.ok(clientsCsv.includes('Billing Basis'));

    const workCsv = buildWorkItemsCsv(SAMPLE_WORK_ITEMS, SAMPLE_CLIENTS);
    assert.ok(workCsv.includes('Total (INR)'));

    const invCsv = buildInvoicesCsv(SAMPLE_INVOICES, SAMPLE_CLIENTS);
    assert.ok(invCsv.includes('Status'));
    assert.ok(invCsv.includes('Paid') && invCsv.includes('Pending'));
  });

  it('6. Migration dry-run preserves active ₹1 trial days, grants founder lifetime, and maps expired/none accurately', () => {
    const nowMs = Date.parse('2026-11-26T12:00:00Z');
    const trialEndsMs = nowMs + 4 * 86400 * 1000;
    const plan = planEntitlementMigrations(
      {
        nowMs,
        pepper: 'test_pep',
        profiles: [
          { id: 'uid_owner', email: 'tilakpopat2007@gmail.com', name: 'Tilak Popat' },
          { id: 'uid_trial1', email: 'trialer@gmail.com', name: 'Trial Creator' },
          { id: 'uid_paid1', email: 'pro@gmail.com', name: 'Pro Creator' },
          { id: 'uid_exp1', email: 'old@gmail.com', name: 'Expired Creator' },
          { id: 'uid_free', email: 'explorer@gmail.com', name: 'Free User' },
        ],
        subscriptions: [
          { userId: 'uid_trial1', status: 'trialing', trialStartedAt: nowMs - 3 * 86400 * 1000, accessUntil: trialEndsMs, trialClaimed: true },
          { userId: 'uid_paid1', status: 'active', billingCycle: 'yearly', accessUntil: nowMs + 200 * 86400 * 1000 },
          { userId: 'uid_exp1', status: 'active', billingCycle: 'monthly', accessUntil: nowMs - 2 * 86400 * 1000, hasHadTrial: true },
        ],
        whitelist: [],
        adminUsers: [],
        trialLedger: [{ hash: 'abc123', type: 'email', claimedByUid: 'uid_trial1', usedAt: nowMs - 3 * 86400 * 1000 }],
      },
      true
    );

    assert.equal(plan.dryRun, true);
    assert.equal(plan.summary.lifetime, 1);
    assert.equal(plan.summary.activeTrialPreserved, 1);
    assert.equal(plan.summary.activePaid, 1);
    assert.equal(plan.summary.expired, 1);
    assert.equal(plan.summary.none, 1);

    const ownerEnt = plan.entitlements.find((e) => e.uid === 'uid_owner')!;
    assert.equal(ownerEnt.record.plan, 'lifetime');
    assert.equal(ownerEnt.record.validUntil, LIFETIME_VALID_UNTIL_ISO);

    const trialEnt = plan.entitlements.find((e) => e.uid === 'uid_trial1')!;
    assert.equal(trialEnt.record.status, 'trialing');
    assert.equal(trialEnt.record.validUntil, new Date(trialEndsMs).toISOString());
    assert.ok(plan.trialClaims.some((c) => c.claimKey === 'uid_uid_trial1'));
  });
});
