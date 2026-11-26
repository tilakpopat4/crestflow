/**
 * Cloudflare Worker environment bindings, pricing plan keys, and entitlement types.
 */

export type PlanKey = 'trial' | 'monthly' | 'quarterly' | 'yearly';
export type PaidPlanKey = 'monthly' | 'quarterly' | 'yearly';
export type EntitlementStatus = 'none' | 'trialing' | 'active' | 'grace' | 'expired' | 'suspended';

export interface R2UploadedObject {
  key: string;
  size: number;
  etag: string;
  httpEtag?: string;
  httpMetadata?: Record<string, string>;
  customMetadata?: Record<string, string>;
  writeHttpMetadata?: (headers: Headers) => void;
}

export interface R2ObjectBody extends R2UploadedObject {
  body: ReadableStream;
  arrayBuffer: () => Promise<ArrayBuffer>;
  text: () => Promise<string>;
  json: <T>() => Promise<T>;
  blob: () => Promise<Blob>;
}

export interface R2Bucket {
  get: (key: string, options?: any) => Promise<R2ObjectBody | null>;
  put: (
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null | Blob,
    options?: any
  ) => Promise<R2UploadedObject>;
  delete: (keys: string | string[]) => Promise<void>;
  head: (key: string) => Promise<R2UploadedObject | null>;
}

export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  VIDEOS_BUCKET?: R2Bucket;
  BASE_URL?: string;
  CRON_SECRET?: string;

  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  RAZORPAY_WEBHOOK_SECRET: string;
  RAZORPAY_PLAN_MONTHLY?: string;
  RAZORPAY_PLAN_QUARTERLY?: string;
  RAZORPAY_PLAN_YEARLY?: string;

  FIREBASE_SERVICE_ACCOUNT: string;
  FIREBASE_PROJECT_ID?: string;
  TRIAL_LEDGER_PEPPER?: string;

  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  EMAILJS_SERVICE_ID?: string;
  EMAILJS_TEMPLATE_ID?: string;
  EMAILJS_PUBLIC_KEY?: string;
  EMAILJS_PRIVATE_KEY?: string;

  GMAIL_CLIENT_ID?: string;
  GMAIL_CLIENT_SECRET?: string;
  GMAIL_REFRESH_TOKEN?: string;
  GMAIL_USER_EMAIL?: string;

  GOOGLE_DRIVE_CLIENT_ID?: string;
  GOOGLE_DRIVE_CLIENT_SECRET?: string;
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
  admin?: boolean;
}

export interface EntitlementRecord {
  userId: string;
  userEmail?: string;
  userName?: string;
  status: EntitlementStatus;
  plan: string;
  billingCycle?: PaidPlanKey | 'trial' | 'lifetime';
  validUntil: string | null;
  graceUntil?: string | null;
  trialStartedAt?: string | null;
  trialUsed: boolean;
  cancelAtPeriodEnd: boolean;
  razorpayCustomerId?: string | null;
  razorpaySubscriptionId?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  checkoutMode?: 'subscription' | 'order' | null;
  lastEventTimestamp?: number;
  lockTimestamp?: number;
  notifiedTrialDay5?: boolean;
  notifiedChargeFailed?: boolean;
  notifiedExpired?: boolean;
  lastPaymentAt?: number;
  lastPaymentAmount?: number;
  lastPaymentMethod?: string;
  lastPaymentVpa?: string | null;
  welcomeEmailSent?: boolean;
  updatedAt: string;
}

export interface TrialLedgerEntry {
  hash?: string;
  keyHash?: string;
  type?: 'uid' | 'email' | 'vpa' | string;
  status: 'used' | 'reserved' | string;
  claimedByUid?: string;
  claimedAt?: number;
  reservedAt?: number;
  expiresAt?: number;
  usedAt?: number;
  subscriptionId?: string;
  createdAt?: number;
}

/**
 * Legacy type kept only for migration script typing and backward-compat readers.
 */
export interface SubscriptionRecord {
  userId: string;
  userEmail?: string;
  userName?: string;
  plan: string;
  billingCycle?: string;
  status: string;
  currentPeriodStart?: number;
  currentPeriodEnd?: number;
  accessUntil?: string | Date;
  trialEndsAt?: string | Date | null;
  trialClaimed?: boolean;
  trialClaimedAt?: number;
  trialStartedAt?: number | string;
  graceUntil?: string | null;
  hasHadTrial?: boolean;
  hasHadSubscription?: boolean;
  razorpaySubscriptionId?: string;
  razorpayPlanId?: string;
  cancelAtPeriodEnd?: boolean;
  lastEventTimestamp?: number;
  lastPaymentAt?: number;
  lastPaymentAmount?: number;
  lastPaymentMethod?: string;
  lastPaymentVpa?: string;
  lastPaymentId?: string;
  welcomeEmailSent?: boolean;
  updatedAt?: number;
}
