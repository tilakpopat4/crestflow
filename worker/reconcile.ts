import { Env, ServiceAccountCredentials, SubscriptionRecord } from './types';
import {
  parseServiceAccount,
  getGoogleAccessToken,
  fromFirestoreValue,
  updateSubscriptionInFirestore,
} from './firestore';
import { fetchRazorpaySubscription } from './razorpay';
import {
  sendTrialDay5Email,
  sendCharge24hEmail,
  sendChargeFailedEmail,
  sendExpiredEmail,
} from './resend';

/**
 * Lists all subscription documents from Firestore `subscriptions` collection.
 */
export async function listSubscriptionsFromFirestore(
  creds: ServiceAccountCredentials
): Promise<SubscriptionRecord[]> {
  const token = await getGoogleAccessToken(creds);
  const url = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/subscriptions?pageSize=300`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to list subscriptions from Firestore: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    documents?: Array<{ name: string; fields?: Record<string, any> }>;
  };

  if (!data.documents || !Array.isArray(data.documents)) {
    return [];
  }

  return data.documents.map((doc) => {
    const parts = doc.name.split('/');
    const userId = parts[parts.length - 1];
    const result: any = { userId };
    if (doc.fields) {
      for (const [k, v] of Object.entries(doc.fields)) {
        result[k] = fromFirestoreValue(v);
      }
    }
    return result as SubscriptionRecord;
  });
}

/**
 * Reconciles a single subscription record with Razorpay, validates expiration,
 * and dispatches Resend lifecycle notification emails.
 */
export async function reconcileSubscription(
  env: Env,
  creds: ServiceAccountCredentials,
  sub: SubscriptionRecord,
  nowMs = Date.now()
): Promise<{ updated: boolean; emailsSent: string[] }> {
  const emailsSent: string[] = [];
  const updates: Partial<SubscriptionRecord> = {};
  const userEmail = sub.userEmail;
  const userName = sub.userName;

  // 1. Razorpay State Sync (if subscription has an active Razorpay ID)
  if (sub.razorpaySubscriptionId) {
    try {
      const rzpSub = await fetchRazorpaySubscription(env, sub.razorpaySubscriptionId);

      if (rzpSub.status === 'halted') {
        const graceEnd = (rzpSub.current_end || 0) * 1000 + 3 * 24 * 3600 * 1000;
        if (nowMs > graceEnd) {
          updates.status = 'expired';
        } else {
          updates.status = 'past_due';
        }
      } else if (rzpSub.status === 'cancelled') {
        const currentEndMs = (rzpSub.current_end || 0) * 1000;
        if (currentEndMs > 0 && nowMs >= currentEndMs) {
          updates.status = 'expired';
        }
      } else if (rzpSub.status === 'pending') {
        updates.status = 'past_due';
      } else if (rzpSub.status === 'active' && sub.status === 'trialing') {
        // Trial was charged and transitioned to active paid cycle
        updates.status = 'active';
        if (rzpSub.current_end) {
          updates.currentPeriodEnd = rzpSub.current_end * 1000;
          updates.accessUntil = new Date(rzpSub.current_end * 1000).toISOString();
        }
      }
    } catch (err: any) {
      console.warn(`[Reconcile Razorpay Error] user ${sub.userId}: ${err.message}`);
    }
  }

  // 2. Access Expiration Verification
  const currentAccessUntil = updates.accessUntil || sub.accessUntil;
  if (currentAccessUntil) {
    const accessUntilMs = new Date(currentAccessUntil).getTime();
    if (accessUntilMs <= nowMs && (updates.status || sub.status) !== 'expired') {
      updates.status = 'expired';
      if (!sub.notifiedExpired && userEmail) {
        await sendExpiredEmail(env, userEmail, userName);
        updates.notifiedExpired = true;
        emailsSent.push('expired');
      }
    }
  }

  // 3. Pending Plan Change Activation
  if (sub.pendingPlanChange && nowMs >= sub.pendingPlanChange.effectiveDate) {
    updates.plan = sub.pendingPlanChange.newPlan;
    updates.billingCycle = sub.pendingPlanChange.newPlan;
    updates.razorpaySubscriptionId = sub.pendingPlanChange.newSubscriptionId;
    updates.razorpayPlanId = sub.pendingPlanChange.newPlanId;
    updates.cancelAtPeriodEnd = false;
    updates.pendingPlanChange = undefined as any;
  }

  // 4. Lifecycle & Milestone Resend Emails
  const effectiveStatus = updates.status || sub.status;

  // Charge failed email (past_due status)
  if (effectiveStatus === 'past_due' && !sub.notifiedChargeFailed && userEmail) {
    await sendChargeFailedEmail(env, userEmail, userName);
    updates.notifiedChargeFailed = true;
    emailsSent.push('charge_failed');
  }

  // Trial Milestone Resend Emails
  if (effectiveStatus === 'trialing') {
    const trialEndStr = sub.trialEndsAt || currentAccessUntil;
    const trialEndMs = trialEndStr ? new Date(trialEndStr).getTime() : 0;
    const msRemaining = trialEndMs - nowMs;

    // Day 5 of 7-day trial: ~2 days remaining (between 24h and 48h before trial end)
    if (
      msRemaining <= 48 * 3600 * 1000 &&
      msRemaining > 24 * 3600 * 1000 &&
      !sub.notifiedTrialDay5 &&
      userEmail
    ) {
      await sendTrialDay5Email(env, userEmail, userName);
      updates.notifiedTrialDay5 = true;
      emailsSent.push('trial_day_5');
    }

    // 24 hours before first charge: between 0 and 24h remaining, if not canceled
    if (
      msRemaining <= 24 * 3600 * 1000 &&
      msRemaining > 0 &&
      !sub.cancelAtPeriodEnd &&
      !sub.notifiedCharge24h &&
      userEmail
    ) {
      const planName = String(sub.plan || 'Pro').toUpperCase();
      await sendCharge24hEmail(env, userEmail, userName, planName);
      updates.notifiedCharge24h = true;
      emailsSent.push('charge_24h_reminder');
    }
  }

  // 5. Commit Updates to Firestore
  if (Object.keys(updates).length > 0) {
    updates.updatedAt = nowMs;
    await updateSubscriptionInFirestore(creds, sub.userId, updates);
    return { updated: true, emailsSent };
  }

  return { updated: false, emailsSent };
}

/**
 * Main Daily Cron Reconciliation Handler
 */
export async function handleCronReconciliation(
  env: Env,
  nowMs = Date.now()
): Promise<{ processed: number; updated: number; emailsSent: number }> {
  const creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  const subscriptions = await listSubscriptionsFromFirestore(creds);

  let updatedCount = 0;
  let totalEmailsSent = 0;

  for (const sub of subscriptions) {
    try {
      const res = await reconcileSubscription(env, creds, sub, nowMs);
      if (res.updated) updatedCount++;
      totalEmailsSent += res.emailsSent.length;
    } catch (err: any) {
      console.error(`[Cron Reconcile Error] user ${sub.userId}:`, err);
    }
  }

  return {
    processed: subscriptions.length,
    updated: updatedCount,
    emailsSent: totalEmailsSent,
  };
}
