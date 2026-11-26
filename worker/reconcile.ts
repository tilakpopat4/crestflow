import { Env, EntitlementRecord, ServiceAccountCredentials } from './types';
import { parseServiceAccount, getGoogleAccessToken, fromFirestoreValue } from './firestore';
import { writeEntitlement } from './entitlements';
import { fetchRazorpaySubscription } from './razorpay';
import { GRACE_DURATION_DAYS } from '../src/shared/pricing';
import {
  sendTrialDay5Email,
  sendChargeFailedEmail,
  sendExpiredEmail,
} from './resend';

/**
 * Lists all entitlement documents from Firestore `entitlements` collection.
 */
export async function listEntitlementsFromFirestore(
  creds: ServiceAccountCredentials
): Promise<EntitlementRecord[]> {
  const token = await getGoogleAccessToken(creds);
  const url = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/entitlements?pageSize=300`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to list entitlements from Firestore: ${res.status} ${text}`);
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
    return result as EntitlementRecord;
  });
}

/**
 * Reconciles a single entitlement record with Razorpay and dispatches lifecycle notifications.
 * Expiry enforcement never depends on cron (`validUntil > request.time` is authoritative).
 */
export async function reconcileEntitlement(
  env: Env,
  creds: ServiceAccountCredentials,
  ent: EntitlementRecord,
  nowMs = Date.now()
): Promise<{ updated: boolean; emailsSent: string[] }> {
  if (ent.plan === 'lifetime' || ent.status === 'suspended' || ent.status === 'none') {
    return { updated: false, emailsSent: [] };
  }

  const emailsSent: string[] = [];
  const updates: Partial<EntitlementRecord> = {};
  const userEmail = ent.userEmail;
  const userName = ent.userName;

  if (ent.razorpaySubscriptionId && ent.checkoutMode === 'subscription') {
    try {
      const rzpSub = await fetchRazorpaySubscription(env, ent.razorpaySubscriptionId);
      if (rzpSub.status === 'halted' || rzpSub.status === 'pending') {
        const baseEndMs = Math.max(
          (rzpSub.current_end || 0) * 1000,
          ent.validUntil ? new Date(ent.validUntil).getTime() : nowMs
        );
        const graceEndIso = ent.graceUntil || new Date(baseEndMs + GRACE_DURATION_DAYS * 86400 * 1000).toISOString();
        if (nowMs > new Date(graceEndIso).getTime()) {
          updates.status = 'expired';
          updates.validUntil = new Date(nowMs - 1000).toISOString();
          updates.graceUntil = null;
        } else {
          updates.status = 'grace';
          updates.graceUntil = graceEndIso;
          updates.validUntil = graceEndIso;
        }
      } else if (rzpSub.status === 'cancelled') {
        updates.cancelAtPeriodEnd = true;
        const currentEndMs = (rzpSub.current_end || 0) * 1000;
        if (currentEndMs > 0 && nowMs >= currentEndMs) {
          updates.status = 'expired';
          updates.validUntil = new Date(currentEndMs).toISOString();
        }
      } else if (rzpSub.status === 'active' && rzpSub.current_end) {
        const currentEndIso = new Date(rzpSub.current_end * 1000).toISOString();
        if (ent.status === 'grace' || currentEndIso !== ent.validUntil) {
          updates.status = 'active';
          updates.validUntil = currentEndIso;
          updates.graceUntil = null;
        }
      }
    } catch (err: any) {
      console.warn(`[Reconcile Razorpay Warning] user ${ent.userId}:`, err?.message);
    }
  }

  const currentValidUntil = updates.validUntil !== undefined ? updates.validUntil : ent.validUntil;
  const currentStatus = updates.status || ent.status;

  if (currentValidUntil) {
    const validMs = new Date(currentValidUntil).getTime();
    if (validMs <= nowMs && currentStatus !== 'expired') {
      updates.status = 'expired';
      updates.graceUntil = null;
      if (!ent.notifiedExpired && userEmail) {
        await sendExpiredEmail(env, userEmail, userName);
        updates.notifiedExpired = true;
        emailsSent.push('expired');
      }
    }
  }

  if ((updates.status || ent.status) === 'grace' && !ent.notifiedChargeFailed && userEmail) {
    await sendChargeFailedEmail(env, userEmail, userName);
    updates.notifiedChargeFailed = true;
    emailsSent.push('charge_failed');
  }

  if ((updates.status || ent.status) === 'trialing' && currentValidUntil) {
    const msRemaining = new Date(currentValidUntil).getTime() - nowMs;
    if (msRemaining <= 48 * 3600 * 1000 && msRemaining > 0 && !ent.notifiedTrialDay5 && userEmail) {
      await sendTrialDay5Email(env, userEmail, userName);
      updates.notifiedTrialDay5 = true;
      emailsSent.push('trial_day_5');
    }
  }

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = new Date(nowMs).toISOString();
    await writeEntitlement(creds, ent.userId, updates);
    return { updated: true, emailsSent };
  }

  return { updated: false, emailsSent };
}

export async function handleCronReconciliation(
  env: Env,
  nowMs = Date.now()
): Promise<{ processed: number; updated: number; emailsSent: number }> {
  const creds = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  const entitlements = await listEntitlementsFromFirestore(creds);

  let updatedCount = 0;
  let totalEmailsSent = 0;

  for (const ent of entitlements) {
    try {
      const res = await reconcileEntitlement(env, creds, ent, nowMs);
      if (res.updated) updatedCount++;
      totalEmailsSent += res.emailsSent.length;
    } catch (err: any) {
      console.error(`[Cron Reconcile Error] user ${ent.userId}:`, err?.message);
    }
  }

  return {
    processed: entitlements.length,
    updated: updatedCount,
    emailsSent: totalEmailsSent,
  };
}
