import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  LIFETIME_VALID_UNTIL_ISO,
  resolvePaidPlanKey,
  SERVER_PLAN_CATALOG,
} from '../src/shared/pricing';
import { EntitlementRecord, EntitlementStatus } from '../worker/types';
import { normalizeGoogleEmail } from '../worker/trialLedger';

export interface LegacyMigrationInput {
  profiles: Array<Record<string, any>>;
  subscriptions: Array<Record<string, any>>;
  whitelist: Array<Record<string, any>>;
  adminUsers: Array<Record<string, any>>;
  trialLedger: Array<Record<string, any>>;
  nowMs?: number;
  pepper?: string;
}

export interface MigrationPlanOutput {
  dryRun: boolean;
  entitlements: Array<{ uid: string; record: EntitlementRecord; source: string }>;
  trialClaims: Array<{ claimKey: string; payload: Record<string, any> }>;
  summary: {
    totalProfiles: number;
    lifetime: number;
    activePaid: number;
    activeTrialPreserved: number;
    grace: number;
    expired: number;
    none: number;
    trialClaimsToWrite: number;
  };
}

function toMs(val: any): number | null {
  if (!val) return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (typeof val === 'string') {
    const p = Date.parse(val);
    return Number.isFinite(p) ? p : null;
  }
  if (typeof val === 'object' && typeof val._seconds === 'number') {
    return val._seconds * 1000;
  }
  return null;
}

function sha256Hex(value: string, pepper = ''): string {
  return crypto.createHash('sha256').update(`${pepper}::${value}`).digest('hex');
}

/**
 * Pure migration planner transforming legacy profiles, subscriptions, whitelists, and trial_ledger
 * into `entitlements/{uid}` and `trialClaims/{claimKey}`. Preserves remaining days on ₹1-started trials.
 */
export function planEntitlementMigrations(
  input: LegacyMigrationInput,
  dryRun = true
): MigrationPlanOutput {
  const nowMs = input.nowMs || Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const pepper = input.pepper || '';

  const subMap = new Map<string, Record<string, any>>();
  for (const s of input.subscriptions) {
    const uid = String(s.userId || s.id || '');
    if (uid) subMap.set(uid, s);
  }

  const adminEmails = new Set<string>(['tilakpopat2007@gmail.com']);
  for (const a of input.adminUsers) {
    const em = String(a.email || a.id || '').trim().toLowerCase();
    if (em) adminEmails.add(em);
  }

  const whitelistMap = new Map<string, Record<string, any>>();
  for (const w of input.whitelist) {
    const em = String(w.email || w.id || '').trim().toLowerCase();
    if (em) whitelistMap.set(em, w);
  }

  const allUids = new Set<string>();
  for (const p of input.profiles) {
    const uid = String(p.id || p.userId || '');
    if (uid) allUids.add(uid);
  }
  for (const uid of subMap.keys()) allUids.add(uid);

  const profileMap = new Map<string, Record<string, any>>();
  for (const p of input.profiles) {
    const uid = String(p.id || p.userId || '');
    if (uid) profileMap.set(uid, p);
  }

  const entitlements: Array<{ uid: string; record: EntitlementRecord; source: string }> = [];
  const trialClaims: Array<{ claimKey: string; payload: Record<string, any> }> = [];
  const seenClaims = new Set<string>();

  const addTrialClaim = (claimKey: string, payload: Record<string, any>) => {
    if (seenClaims.has(claimKey)) return;
    seenClaims.add(claimKey);
    trialClaims.push({ claimKey, payload });
  };

  const summary = {
    totalProfiles: allUids.size,
    lifetime: 0,
    activePaid: 0,
    activeTrialPreserved: 0,
    grace: 0,
    expired: 0,
    none: 0,
    trialClaimsToWrite: 0,
  };

  for (const uid of allUids) {
    const prof = profileMap.get(uid) || {};
    const sub = subMap.get(uid) || {};
    const rawEmail = String(prof.email || sub.userEmail || '').trim().toLowerCase();
    const userName = String(prof.name || sub.userName || '').trim() || undefined;
    const isAdminOrOwner = adminEmails.has(rawEmail) || Boolean(whitelistMap.get(rawEmail)?.lifetime);

    if (isAdminOrOwner) {
      summary.lifetime++;
      entitlements.push({
        uid,
        source: 'admin_or_lifetime_whitelist',
        record: {
          userId: uid,
          userEmail: rawEmail || undefined,
          userName,
          status: 'active',
          plan: 'lifetime',
          billingCycle: 'lifetime',
          validUntil: LIFETIME_VALID_UNTIL_ISO,
          graceUntil: null,
          trialStartedAt: null,
          trialUsed: true,
          cancelAtPeriodEnd: false,
          updatedAt: nowIso,
        },
      });
      continue;
    }

    const legacyStatus = String(sub.status || 'none').toLowerCase();
    const accessUntilMs = toMs(sub.accessUntil) ?? toMs(sub.trialEndsAt) ?? toMs(sub.currentPeriodEnd);
    const graceUntilMs = toMs(sub.graceUntil);
    const trialStartedMs = toMs(sub.trialStartedAt);
    const hadTrial = Boolean(sub.trialClaimed || sub.hasHadTrial || trialStartedMs || legacyStatus === 'trialing');

    let status: EntitlementStatus = 'none';
    let validUntil: string | null = accessUntilMs ? new Date(accessUntilMs).toISOString() : null;
    let source = 'unsubscribed_none';

    if (legacyStatus === 'suspended' || legacyStatus === 'banned') {
      status = 'suspended';
      source = 'legacy_suspended';
    } else if (legacyStatus === 'trialing' && accessUntilMs && accessUntilMs > nowMs) {
      status = 'trialing';
      summary.activeTrialPreserved++;
      source = 'preserved_active_trial';
    } else if ((legacyStatus === 'past_due' || legacyStatus === 'grace') && (graceUntilMs || accessUntilMs || 0) > nowMs) {
      status = 'grace';
      validUntil = new Date(graceUntilMs || accessUntilMs || nowMs).toISOString();
      summary.grace++;
      source = 'legacy_grace';
    } else if ((legacyStatus === 'active' || legacyStatus === 'cancelled' || legacyStatus === 'canceled') && accessUntilMs && accessUntilMs > nowMs) {
      status = 'active';
      summary.activePaid++;
      source = 'legacy_active_paid';
    } else if (sub.status && legacyStatus !== 'none' && legacyStatus !== 'free') {
      status = 'expired';
      summary.expired++;
      source = 'legacy_expired';
    } else {
      status = 'none';
      validUntil = null;
      summary.none++;
    }

    const paidKey = resolvePaidPlanKey(sub.billingCycle || sub.plan);
    const plan = status === 'trialing' ? 'pro_trial' : paidKey ? SERVER_PLAN_CATALOG[paidKey].planCode : sub.plan || 'none';

    entitlements.push({
      uid,
      source,
      record: {
        userId: uid,
        userEmail: rawEmail || undefined,
        userName,
        status,
        plan,
        billingCycle: paidKey || (status === 'trialing' ? 'trial' : sub.billingCycle || null),
        validUntil,
        graceUntil: graceUntilMs ? new Date(graceUntilMs).toISOString() : null,
        trialStartedAt: trialStartedMs ? new Date(trialStartedMs).toISOString() : null,
        trialUsed: hadTrial,
        cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd || legacyStatus === 'cancelled' || legacyStatus === 'canceled'),
        razorpaySubscriptionId: sub.razorpaySubscriptionId || null,
        razorpayOrderId: sub.razorpayOrderId || null,
        razorpayPaymentId: sub.razorpayPaymentId || null,
        checkoutMode: sub.razorpaySubscriptionId ? 'subscription' : sub.razorpayOrderId ? 'order' : null,
        updatedAt: nowIso,
      },
    });

    if (hadTrial) {
      addTrialClaim(`uid_${uid}`, { claimKey: `uid_${uid}`, type: 'uid', claimedByUid: uid, claimedAt: nowIso, migrated: true });
      if (rawEmail) {
        const emailHash = sha256Hex(normalizeGoogleEmail(rawEmail), pepper);
        addTrialClaim(`email_${emailHash}`, { claimKey: `email_${emailHash}`, type: 'email', claimedByUid: uid, claimedAt: nowIso, migrated: true });
      }
    }
  }

  for (const entry of input.trialLedger) {
    const hash = String(entry.hash || entry.id || '');
    if (!hash || entry.status === 'released') continue;
    const type = entry.type || (entry.identifierType === 'email' ? 'email' : 'legacy');
    const claimKey = `${type}_${hash}`;
    addTrialClaim(claimKey, {
      claimKey,
      type,
      claimedByUid: entry.claimedByUid || entry.userId || 'migrated',
      claimedAt: toMs(entry.usedAt || entry.claimedAt) ? new Date(toMs(entry.usedAt || entry.claimedAt)!).toISOString() : nowIso,
      migrated: true,
    });
  }

  summary.trialClaimsToWrite = trialClaims.length;
  return { dryRun, entitlements, trialClaims, summary };
}

function runCli() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  const fixtureIdx = args.indexOf('--fixture');

  if (!execute && fixtureIdx === -1) {
    console.log('[migrate-entitlements] Dry-run mode active by default. Pass --fixture <path> to simulate on a snapshot.');
    return;
  }

  if (fixtureIdx !== -1) {
    const fixturePath = path.resolve(process.cwd(), args[fixtureIdx + 1] || '');
    const raw = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const plan = planEntitlementMigrations(raw, !execute);
    console.log(JSON.stringify({ mode: execute ? 'EXECUTE' : 'DRY_RUN', summary: plan.summary, sampleEntitlements: plan.entitlements.slice(0, 6) }, null, 2));
    if (!execute) {
      console.log(`[migrate-entitlements] DRY RUN complete. Zero Firestore writes executed. Planned ${plan.entitlements.length} entitlements and ${plan.trialClaims.length} trialClaims.`);
    }
    return;
  }

  console.error('[migrate-entitlements] Refusing live --execute without explicit confirmation & Admin SDK setup per policy.');
  process.exit(1);
}

const isDirect = process.argv[1] && process.argv[1].endsWith('migrate-entitlements.ts');
if (isDirect) runCli();
