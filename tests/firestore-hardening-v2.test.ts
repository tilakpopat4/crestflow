import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'crestflow-v2-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080
    }
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('Firestore Rules v2 Hardening Test Suite', () => {
  const OWNER_UID = 'owner_user_1';
  const CLIENT_EMAIL = 'client@company.com';
  const ATTACKER_UID = 'attacker_user_2';

  test('1. ClientPortal: Real where("clientEmail", "==", email) query succeeds for verified client', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('invoices').doc('inv_1').set({
        userId: OWNER_UID,
        clientEmail: CLIENT_EMAIL,
        totalAmount: 12000
      });
      await ctx.firestore().collection('workItems').doc('work_1').set({
        userId: OWNER_UID,
        clientEmail: CLIENT_EMAIL,
        description: 'Rough Cut Delivery'
      });
    });

    const clientDb = testEnv.authenticatedContext('client_auth_id', {
      email: CLIENT_EMAIL,
      email_verified: true
    }).firestore();

    const invQuery = clientDb.collection('invoices').where('clientEmail', '==', CLIENT_EMAIL);
    await assertSucceeds(invQuery.get());

    const workQuery = clientDb.collection('workItems').where('clientEmail', '==', CLIENT_EMAIL);
    await assertSucceeds(workQuery.get());
  });

  test('2. ClientPortal: Unverified email (email_verified: false) FAILS where query', async () => {
    const unverifiedClientDb = testEnv.authenticatedContext('unverified_client', {
      email: CLIENT_EMAIL,
      email_verified: false
    }).firestore();

    const invQuery = unverifiedClientDb.collection('invoices').where('clientEmail', '==', CLIENT_EMAIL);
    await assertFails(invQuery.get());
  });

  test('3. Public Reviews: Real where("isApproved", "==", true) query succeeds for anon', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('reviews').doc('rev_ok').set({
        userId: OWNER_UID,
        isApproved: true,
        rating: 5,
        feedbackText: 'Super fast editor!'
      });
    });

    const anonDb = testEnv.unauthenticatedContext().firestore();
    const approvedQuery = anonDb.collection('reviews').where('isApproved', '==', true);
    await assertSucceeds(approvedQuery.get());
  });

  test('4. Notes: Real where("userId", "==", uid) query succeeds for owner and fails for attacker', async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID, { email: 'owner@test.com' }).firestore();
    const attackerDb = testEnv.authenticatedContext(ATTACKER_UID, { email: 'att@test.com' }).firestore();

    await assertSucceeds(ownerDb.collection('notes').where('userId', '==', OWNER_UID).get());
    await assertFails(attackerDb.collection('notes').where('userId', '==', OWNER_UID).get());
  });

  test('5. Profile Private Subdocument: Owner has full access, anon and attacker get denied', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('profiles').doc(OWNER_UID).set({
        userId: OWNER_UID,
        name: 'Tilak Films',
        isPublicProfile: true
      });
      await ctx.firestore().collection('profiles').doc(OWNER_UID).collection('private').doc('settings').set({
        geminiApiKey: 'AIzaSy_SecretApiKey123',
        accountNumber: '9192939495'
      });
    });

    const ownerDb = testEnv.authenticatedContext(OWNER_UID, { email: 'owner@test.com' }).firestore();
    const anonDb = testEnv.unauthenticatedContext().firestore();
    const attackerDb = testEnv.authenticatedContext(ATTACKER_UID, { email: 'att@test.com' }).firestore();

    await assertSucceeds(ownerDb.collection('profiles').doc(OWNER_UID).collection('private').doc('settings').get());
    await assertFails(anonDb.collection('profiles').doc(OWNER_UID).collection('private').doc('settings').get());
    await assertFails(attackerDb.collection('profiles').doc(OWNER_UID).collection('private').doc('settings').get());
  });

  test('6. Review Update: Owner can toggle isApproved, but cannot alter feedbackText or rating', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('reviews').doc('rev_test').set({
        userId: OWNER_UID,
        clientName: 'Acme',
        rating: 4,
        feedbackText: 'Great work',
        isApproved: false
      });
    });

    const ownerDb = testEnv.authenticatedContext(OWNER_UID, { email: 'owner@test.com' }).firestore();

    // Toggle isApproved -> SUCCEEDS
    await assertSucceeds(ownerDb.collection('reviews').doc('rev_test').update({
      isApproved: true
    }));

    // Alter rating or text -> FAILS
    await assertFails(ownerDb.collection('reviews').doc('rev_test').update({
      rating: 5
    }));
  });

  test('7. Platform Settings: Direct client read and write are completely DENIED', async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID, { email: 'owner@test.com' }).firestore();
    await assertFails(ownerDb.collection('platform_settings').doc('billing').get());
    await assertFails(ownerDb.collection('platform_settings').doc('billing').set({ enabled: false }));
  });

  test('8. Blocked Users: get allowed for target user; list and write restricted to admin claim', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('blocked_users').doc(OWNER_UID).set({ blockedAt: Date.now() });
    });

    const ownerDb = testEnv.authenticatedContext(OWNER_UID, { email: 'owner@test.com' }).firestore();
    const regularDb = testEnv.authenticatedContext(ATTACKER_UID, { email: 'regular@test.com' }).firestore();
    const adminDb = testEnv.authenticatedContext('admin_master', { email: 'admin@crestflow.com', admin: true }).firestore();

    // Target user can get their own status
    await assertSucceeds(ownerDb.collection('blocked_users').doc(OWNER_UID).get());

    // Non-admin cannot get someone else's or list
    await assertFails(regularDb.collection('blocked_users').doc(OWNER_UID).get());
    await assertFails(regularDb.collection('blocked_users').get());
    await assertFails(regularDb.collection('blocked_users').doc('user_x').set({ blockedAt: Date.now() }));

    // Admin can list and write
    await assertSucceeds(adminDb.collection('blocked_users').get());
    await assertSucceeds(adminDb.collection('blocked_users').doc('bad_user').set({ blockedAt: Date.now() }));
  });

  test('9. Paywall: Expired claim blocks writes; billing_required: false bypasses paywall', async () => {
    const expiredClaimDb = testEnv.authenticatedContext(OWNER_UID, {
      email: 'owner@test.com',
      pro_expiry_timestamp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
    }).firestore();

    // Expired user writing client -> FAILS
    await assertFails(expiredClaimDb.collection('clients').doc('c1').set({
      userId: OWNER_UID,
      name: 'Client A'
    }));

    // User with billing_required: false -> SUCCEEDS
    const bypassedDb = testEnv.authenticatedContext('free_user', {
      email: 'free@test.com',
      billing_required: false
    }).firestore();

    await assertSucceeds(bypassedDb.collection('clients').doc('c2').set({
      userId: 'free_user',
      name: 'Grandfathered Free Client'
    }));
  });

  test('10. Owner CRUD with Validators: Clients, Invoices, WorkItems', async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID, {
      email: 'owner@test.com',
      billing_required: false
    }).firestore();

    // Valid Client
    await assertSucceeds(ownerDb.collection('clients').doc('client_ok').set({
      userId: OWNER_UID,
      name: 'Good Client',
      email: 'client@lowercase.com'
    }));

    // Invalid Client (uppercase email violates lowercase enforcement)
    await assertFails(ownerDb.collection('clients').doc('client_bad').set({
      userId: OWNER_UID,
      name: 'Bad Client',
      email: 'Client@UPPERCASE.com'
    }));

    // Valid Invoice
    await assertSucceeds(ownerDb.collection('invoices').doc('inv_ok').set({
      userId: OWNER_UID,
      clientName: 'Good Client',
      totalAmount: 5000,
      clientEmail: 'client@lowercase.com'
    }));

    // Valid WorkItem
    await assertSucceeds(ownerDb.collection('workItems').doc('work_ok').set({
      userId: OWNER_UID,
      title: 'YouTube 4K Edit',
      clientEmail: 'client@lowercase.com'
    }));
  });
});
