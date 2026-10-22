/**
 * Cloudflare Worker environment bindings and subscription types.
 */

export type PlanKey = 'monthly' | 'quarterly' | 'half' | 'yearly';

export interface Env {
  // Cloudflare Static Assets Binding
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };

  // Razorpay Secrets (Stored via wrangler secret put)
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  RAZORPAY_WEBHOOK_SECRET: string;
  RAZORPAY_PLAN_MONTHLY?: string;
  RAZORPAY_PLAN_QUARTERLY?: string;
  RAZORPAY_PLAN_HALF?: string;
  RAZORPAY_PLAN_YEARLY?: string;

  // Firebase Service Account Credentials (Stored as single JSON string in worker secret)
  FIREBASE_SERVICE_ACCOUNT: string;

  // Optional project ID override
  FIREBASE_PROJECT_ID?: string;

  // Secret pepper for salting trial ledger SHA-256 hashes
  TRIAL_LEDGER_PEPPER?: string;

  // Resend API Configuration
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
}

export interface TrialLedgerEntry {
  hash: string;
  type: 'email' | 'vpa';
  status: 'reserved' | 'used';
  claimedByUid: string;
  reservedAt: number;
  expiresAt?: number;
  usedAt?: number;
  subscriptionId?: string;
}

export interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
}

export interface VerifiedUser {
  uid: string;
  email?: string;
  name?: string;
}

export interface PendingPlanChange {
  newPlan: PlanKey;
  newPlanId: string;
  newSubscriptionId: string;
  effectiveDate: number;
  requestedAt: number;
}

export interface SubscriptionRecord {
  userId: string;
  userEmail?: string;
  userName?: string;
  plan: 'free' | 'pro' | PlanKey;
  billingCycle?: PlanKey;
  status: 'active' | 'trialing' | 'pending' | 'past_due' | 'cancelled' | 'halted' | 'expired';
  currentPeriodStart?: number;
  currentPeriodEnd?: number;
  accessUntil?: string | Date;
  trialEndsAt?: string | Date | null;
  hasHadSubscription?: boolean;
  razorpaySubscriptionId?: string;
  razorpayPlanId?: string;
  cancelAtPeriodEnd?: boolean;
  lockTimestamp?: number;
  lastEventTimestamp?: number;
  notifiedTrialDay5?: boolean;
  notifiedCharge24h?: boolean;
  notifiedChargeFailed?: boolean;
  notifiedExpired?: boolean;
  pendingPlanChange?: PendingPlanChange;
  updatedAt: number;
}
