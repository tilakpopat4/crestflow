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

export interface SubscriptionRecord {
  userId: string;
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
  updatedAt: number;
}
