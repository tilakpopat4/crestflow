import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { describe, test, before, after, beforeEach } from 'node:test';

let testEnv: RulesTestEnvironment;

const ACTIVE_USER_UID = 'user_active_123';
const EXPIRED_USER_UID = 'user_expired_456';
const ATTACKER_USER_UID = 'user_attacker_789';
const NO_SUB_USER_UID = 'user_nosub_000';

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'crestflow-billing-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

after(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  // Seed baseline subscription states via admin / securityRulesDisabled context
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    // 1. Active User: accessUntil set to 30 days in the future
    await db.collection('subscriptions').doc(ACTIVE_USER_UID).set({
      userId: ACTIVE_USER_UID,
      plan: 'pro_monthly',
      status: 'active',
      accessUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // 2. Expired User: accessUntil expired 5 days ago
    await db.collection('subscriptions').doc(EXPIRED_USER_UID).set({
      userId: EXPIRED_USER_UID,
      plan: 'pro_monthly',
      status: 'expired',
      accessUntil: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    });

    // Existing invoice for expired user to verify read-only capability
    await db.collection('invoices').doc('inv_existing_expired').set({
      userId: EXPIRED_USER_UID,
      clientName: 'Legacy Client',
      totalAmount: 15000,
      clientEmail: 'client@legacy.com',
    });

    // Existing client for expired user
    await db.collection('clients').doc('client_existing_expired').set({
      userId: EXPIRED_USER_UID,
      name: 'Legacy Client',
      email: 'client@legacy.com',
    });
  });
});

describe('Firestore Billing Anti-Bypass Security Suite', () => {
  test('1. Bypass Attempt: Client tries to write own subscription doc -> FAILS', async () => {
    const clientDb = testEnv.authenticatedContext(ACTIVE_USER_UID).firestore();
    const subRef = clientDb.collection('subscriptions').doc(ACTIVE_USER_UID);

    await assertFails(
      subRef.set({
        userId: ACTIVE_USER_UID,
        status: 'active',
      })
    );
  });

  test('2. Bypass Attempt: Client tries to set future accessUntil on own doc -> FAILS', async () => {
    const clientDb = testEnv.authenticatedContext(ACTIVE_USER_UID).firestore();
    const subRef = clientDb.collection('subscriptions').doc(ACTIVE_USER_UID);

    await assertFails(
      subRef.update({
        accessUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      })
    );
  });

  test('3. Bypass Attempt: Direct SDK write to trial_ledger -> FAILS', async () => {
    const clientDb = testEnv.authenticatedContext(ATTACKER_USER_UID).firestore();
    const ledgerRef = clientDb.collection('trial_ledger').doc('hash_phone_99999');

    await assertFails(
      ledgerRef.set({
        claimedByUid: ATTACKER_USER_UID,
        claimedAt: new Date(),
      })
    );
  });

  test('4. Bypass Attempt: Direct SDK write to webhook_events -> FAILS', async () => {
    const clientDb = testEnv.authenticatedContext(ATTACKER_USER_UID).firestore();
    const webhookRef = clientDb.collection('webhook_events').doc('evt_fake_payment_123');

    await assertFails(
      webhookRef.set({
        eventId: 'evt_fake_payment_123',
        status: 'processed',
        amount: 7900,
      })
    );
  });

  test("5. Bypass Attempt: Reading another user's subscription doc -> FAILS", async () => {
    const attackerDb = testEnv.authenticatedContext(ATTACKER_USER_UID).firestore();
    const targetSubRef = attackerDb.collection('subscriptions').doc(ACTIVE_USER_UID);

    await assertFails(targetSubRef.get());
  });

  test('6. Legitimate Read: Client reading their own subscription doc -> SUCCEEDS', async () => {
    const clientDb = testEnv.authenticatedContext(ACTIVE_USER_UID).firestore();
    const ownSubRef = clientDb.collection('subscriptions').doc(ACTIVE_USER_UID);

    await assertSucceeds(ownSubRef.get());
  });

  test('7. Bypass Attempt: Expired user creating an invoice -> FAILS', async () => {
    const expiredDb = testEnv.authenticatedContext(EXPIRED_USER_UID).firestore();
    const invRef = expiredDb.collection('invoices').doc('inv_expired_bypass');

    await assertFails(
      invRef.set({
        userId: EXPIRED_USER_UID,
        clientName: 'New Client',
        totalAmount: 10000,
        clientEmail: 'client@new.com',
      })
    );
  });

  test('8. Bypass Attempt: Expired user creating a client -> FAILS', async () => {
    const expiredDb = testEnv.authenticatedContext(EXPIRED_USER_UID).firestore();
    const clientRef = expiredDb.collection('clients').doc('client_expired_bypass');

    await assertFails(
      clientRef.set({
        userId: EXPIRED_USER_UID,
        name: 'New Client Inc',
        email: 'billing@clientinc.com',
      })
    );
  });

  test('9. Read-Only State: Expired user CAN read existing invoices and clients -> SUCCEEDS', async () => {
    const expiredDb = testEnv.authenticatedContext(EXPIRED_USER_UID).firestore();

    const invRef = expiredDb.collection('invoices').doc('inv_existing_expired');
    await assertSucceeds(invRef.get());

    const clientRef = expiredDb.collection('clients').doc('client_existing_expired');
    await assertSucceeds(clientRef.get());
  });

  test('10. Legitimate Write: Active user with future accessUntil creating an invoice -> SUCCEEDS', async () => {
    const activeDb = testEnv.authenticatedContext(ACTIVE_USER_UID).firestore();
    const invRef = activeDb.collection('invoices').doc('inv_active_valid');

    await assertSucceeds(
      invRef.set({
        userId: ACTIVE_USER_UID,
        clientName: 'Acme Studio',
        totalAmount: 25000,
        clientEmail: 'producer@acme.com',
      })
    );
  });

  test('11. Unsubscribed User: User without subscription doc creating invoice -> FAILS', async () => {
    const noSubDb = testEnv.authenticatedContext(NO_SUB_USER_UID).firestore();
    const invRef = noSubDb.collection('invoices').doc('inv_nosub');

    await assertFails(
      invRef.set({
        userId: NO_SUB_USER_UID,
        clientName: 'Acme Studio',
        totalAmount: 25000,
        clientEmail: 'producer@acme.com',
      })
    );
  });
});
