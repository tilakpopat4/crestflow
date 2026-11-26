import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { describe, test, before, after, beforeEach } from 'node:test';

let testEnv: RulesTestEnvironment;

const ACTIVE_USER_UID = 'user_active_123';
const TRIALING_USER_UID = 'user_trialing_123';
const GRACE_USER_UID = 'user_grace_123';
const EXPIRED_USER_UID = 'user_expired_456';
const SUSPENDED_USER_UID = 'user_suspended_999';
const NO_ENT_USER_UID = 'user_nosub_000';
const ATTACKER_USER_UID = 'user_attacker_789';

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'crestflow-billing-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});

after(async () => {
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  const future = new Date(Date.now() + 30 * 86400 * 1000);
  const past = new Date(Date.now() - 5 * 86400 * 1000);

  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.collection('entitlements').doc(ACTIVE_USER_UID).set({ userId: ACTIVE_USER_UID, plan: 'pro_monthly', status: 'active', validUntil: future });
    await db.collection('entitlements').doc(TRIALING_USER_UID).set({ userId: TRIALING_USER_UID, plan: 'pro_trial', status: 'trialing', validUntil: future });
    await db.collection('entitlements').doc(GRACE_USER_UID).set({ userId: GRACE_USER_UID, plan: 'pro_monthly', status: 'grace', validUntil: future });
    // Even if raw status stayed active, expired validUntil MUST fail
    await db.collection('entitlements').doc(EXPIRED_USER_UID).set({ userId: EXPIRED_USER_UID, plan: 'pro_monthly', status: 'active', validUntil: past });
    await db.collection('entitlements').doc(SUSPENDED_USER_UID).set({ userId: SUSPENDED_USER_UID, plan: 'pro_monthly', status: 'suspended', validUntil: future });

    await db.collection('invoices').doc('inv_existing_expired').set({ userId: EXPIRED_USER_UID, clientName: 'Legacy Client', totalAmount: 15000, clientEmail: 'client@legacy.com' });
    await db.collection('clients').doc('client_existing_expired').set({ userId: EXPIRED_USER_UID, name: 'Legacy Client', email: 'client@legacy.com' });
    await db.collection('workItems').doc('work_existing_expired').set({ userId: EXPIRED_USER_UID, title: 'Reel 1', status: 'Invoiced' });
    await db.collection('profiles').doc(EXPIRED_USER_UID).set({ userId: EXPIRED_USER_UID, name: 'Old Name', username: 'oldhandle', workExperienceBio: 'Old bio' });
  });
});

describe('Firestore Entitlements & Anti-Bypass Security Suite', () => {
  test('1. Client cannot write own entitlements/{uid}, trialClaims, or invoice_shares', async () => {
    const db = testEnv.authenticatedContext(ACTIVE_USER_UID).firestore();
    await assertFails(db.collection('entitlements').doc(ACTIVE_USER_UID).set({ userId: ACTIVE_USER_UID, status: 'active' }));
    await assertFails(db.collection('entitlements').doc(NO_ENT_USER_UID).set({ status: 'active' }));
    await assertFails(db.collection('trialClaims').doc(`uid_${ATTACKER_USER_UID}`).set({ claimedByUid: ATTACKER_USER_UID }));
    await assertFails(db.collection('invoice_shares').doc('inv_x').set({ tokenHash: 'fake' }));
  });

  test('2. Client cannot read another user entitlement; owner CAN read own entitlement', async () => {
    const attackerDb = testEnv.authenticatedContext(ATTACKER_USER_UID).firestore();
    await assertFails(attackerDb.collection('entitlements').doc(ACTIVE_USER_UID).get());
    await assertSucceeds(testEnv.authenticatedContext(ACTIVE_USER_UID).firestore().collection('entitlements').doc(ACTIVE_USER_UID).get());
  });

  test('3. Entitled states (trialing, active, grace) CAN create clients & invoices', async () => {
    for (const uid of [TRIALING_USER_UID, ACTIVE_USER_UID, GRACE_USER_UID]) {
      const db = testEnv.authenticatedContext(uid).firestore();
      await assertSucceeds(db.collection('clients').doc(`cli_${uid}`).set({ userId: uid, name: 'Acme', email: 'acme@test.com' }));
      await assertSucceeds(db.collection('invoices').doc(`inv_${uid}`).set({ userId: uid, clientName: 'Acme', totalAmount: 5000 }));
      await assertSucceeds(db.collection('workItems').doc(`wi_${uid}`).set({ userId: uid, title: 'Edit', status: 'Uninvoiced' }));
    }
  });

  test('4. Non-entitled states (none, expired even if raw status=active, suspended) CANNOT create/mutate workspace docs', async () => {
    for (const uid of [NO_ENT_USER_UID, EXPIRED_USER_UID, SUSPENDED_USER_UID]) {
      const db = testEnv.authenticatedContext(uid).firestore();
      await assertFails(db.collection('clients').doc(`cli_fail_${uid}`).set({ userId: uid, name: 'Blocked', email: 'b@test.com' }));
      await assertFails(db.collection('invoices').doc(`inv_fail_${uid}`).set({ userId: uid, clientName: 'Blocked', totalAmount: 1000 }));
      await assertFails(db.collection('workItems').doc(`wi_fail_${uid}`).set({ userId: uid, title: 'Blocked' }));
    }
  });

  test('5. Expired user CAN read & export all own clients, invoices, and workItems', async () => {
    const expiredDb = testEnv.authenticatedContext(EXPIRED_USER_UID).firestore();
    await assertSucceeds(expiredDb.collection('invoices').doc('inv_existing_expired').get());
    await assertSucceeds(expiredDb.collection('clients').doc('client_existing_expired').get());
    await assertSucceeds(expiredDb.collection('workItems').doc('work_existing_expired').get());
  });

  test('6. Expired user CAN edit name/bio/photoURL but CANNOT mutate username, plan, or entitlement fields', async () => {
    const expiredDb = testEnv.authenticatedContext(EXPIRED_USER_UID).firestore();
    const profRef = expiredDb.collection('profiles').doc(EXPIRED_USER_UID);
    await assertSucceeds(profRef.update({ name: 'New Display Name', workExperienceBio: 'Updated bio' }));
    await assertFails(profRef.update({ username: 'stolenhandle' }));
    await assertFails(profRef.update({ plan: 'lifetime' }));
  });
});
