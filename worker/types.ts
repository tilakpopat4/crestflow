/**
 * Cloudflare Worker environment bindings and subscription types.
 */

export interface Env {
  // Cloudflare Static Assets Binding
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };

  // Razorpay Secrets (Stored via wrangler secret put)
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  RAZORPAY_WEBHOOK_SECRET: string;
  RAZORPAY_PLAN_MONTHLY: string; // e.g. plan_XXXXXX
  RAZORPAY_PLAN_YEARLY: string;  // e.g. plan_YYYYYY

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
  plan: 'free' | 'pro';
  billingCycle?: 'monthly' | 'yearly';
  status: 'active' | 'pending' | 'cancelled' | 'halted' | 'expired';
  currentPeriodStart?: number;
  currentPeriodEnd?: number;
  razorpaySubscriptionId?: string;
  razorpayPlanId?: string;
  cancelAtPeriodEnd?: boolean;
  updatedAt: number;
}
