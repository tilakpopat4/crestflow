import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { describe, test, before, after, beforeEach } from 'node:test';

let testEnv: RulesTestEnvironment;

const U_NONE = 'uid_state_none';
const U_TRIAL = 'uid_state_trialing';
const U_ACTIVE = 'uid_state_active';
const U_GRACE = 'uid_state_grace';
const U_EXPIRED = 'uid_state_expired';
const U_SUSPENDED = 'uid_state_suspended';

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'crestflow-entitlements-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});

after(async () => {
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  const future = new Date(Date.now() + 10 * 86400 * 1000);
  const past = new Date(Date.now() - 60 * 1000);

  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.collection('entitlements').doc(U_NONE).set({ userId: U_NONE, status: 'none', plan: 'none', validUntil: null });
    await db.collection('entitlements').doc(U_TRIAL).set({ userId: U_TRIAL, status: 'trialing', plan: 'pro_trial', validUntil: future });
    await db.collection('entitlements').doc(U_ACTIVE).set({ userId: U_ACTIVE, status: 'active', plan: 'pro_monthly', validUntil: future });
    await db.collection('entitlements').doc(U_GRACE).set({ userId: U_GRACE, status: 'grace', plan: 'pro_monthly', validUntil: future });
    await db.collection('entitlements').doc(U_EXPIRED).set({ userId: U_EXPIRED, status: 'active', plan: 'pro_monthly', validUntil: past });
    await db.collection('entitlements').doc(U_SUSPENDED).set({ userId: U_SUSPENDED, status: 'suspended', plan: 'pro_monthly', validUntil: future });

    await db.collection('clients').doc('cli_exp').set({ userId: U_EXPIRED, name: 'Client A' });
    await db.collection('workItems').doc('wi_exp').set({ userId: U_EXPIRED, title: 'Reel 1' });
    await db.collection('invoices').doc('inv_exp').set({ userId: U_EXPIRED, clientName: 'Client A', totalAmount: 3000 });
    await db.collection('reviews').doc('rev_exp').set({ userId: U_EXPIRED, clientName: 'Client A', rating: 5, isApproved: false });
    await db.collection('profiles').doc(U_EXPIRED).set({ userId: U_EXPIRED, name: 'Expired Creator', username: 'expcreator', workExperienceBio: 'Bio' });
  });
});

describe('Firestore Rules All 6 Entitlement States Matrix', () => {
  test('1. Entitled states (trialing, active, grace) can create/update/delete workspace collections', async () => {
    for (const uid of [U_TRIAL, U_ACTIVE, U_GRACE]) {
      const db = testEnv.authenticatedContext(uid).firestore();
      await assertSucceeds(db.collection('clients').doc(`c_${uid}`).set({ userId: uid, name: 'Studio', email: 's@test.com' }));
      await assertSucceeds(db.collection('workItems').doc(`w_${uid}`).set({ userId: uid, title: 'Cut 1', status: 'Uninvoiced' }));
      await assertSucceeds(db.collection('invoices').doc(`i_${uid}`).set({ userId: uid, clientName: 'Studio', totalAmount: 2000 }));
      await assertSucceeds(db.collection('notes').doc(`n_${uid}`).set({ userId: uid, title: 'Note', content: 'Text' }));
      await assertSucceeds(db.collection('clients').doc(`c_${uid}`).update({ name: 'Studio Updated' }));
      await assertSucceeds(db.collection('clients').doc(`c_${uid}`).delete());
    }
  });

  test('2. Non-entitled states (none, missing, expired validUntil<request.time, suspended) denied workspace writes', async () => {
    for (const uid of ['uid_missing_doc', U_NONE, U_EXPIRED, U_SUSPENDED]) {
      const db = testEnv.authenticatedContext(uid).firestore();
      await assertFails(db.collection('clients').doc(`cf_${uid}`).set({ userId: uid, name: 'Studio' }));
      await assertFails(db.collection('workItems').doc(`wf_${uid}`).set({ userId: uid, title: 'Cut' }));
      await assertFails(db.collection('invoices').doc(`if_${uid}`).set({ userId: uid, clientName: 'Studio', totalAmount: 100 }));
    }
  });

  test('3. User can NEVER write own entitlement; expired user CAN read/export own data & safe profile fields', async () => {
    const activeDb = testEnv.authenticatedContext(U_ACTIVE).firestore();
    await assertFails(activeDb.collection('entitlements').doc(U_ACTIVE).update({ plan: 'lifetime' }));

    const expiredDb = testEnv.authenticatedContext(U_EXPIRED).firestore();
    await assertSucceeds(expiredDb.collection('clients').doc('cli_exp').get());
    await assertSucceeds(expiredDb.collection('workItems').doc('wi_exp').get());
    await assertSucceeds(expiredDb.collection('invoices').doc('inv_exp').get());
    await assertSucceeds(expiredDb.collection('reviews').doc('rev_exp').get());
    await assertSucceeds(expiredDb.collection('profiles').doc(U_EXPIRED).update({ name: 'Updated Safe Name', workExperienceBio: 'Updated' }));
    await assertFails(expiredDb.collection('profiles').doc(U_EXPIRED).update({ username: 'changed_after_expiry' }));
    await assertFails(expiredDb.collection('profiles').doc(U_EXPIRED).update({ admin: true }));
    await assertFails(expiredDb.collection('clients').doc('cli_exp').delete());
  });
});
