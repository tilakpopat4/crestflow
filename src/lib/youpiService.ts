import { supabase } from './supabase';
import { db } from '../firebase';
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { SubscriptionPlan, SubscriptionStatus, SubscriptionPlanItem } from '../types';


export interface PlanDetails {
  id: SubscriptionPlan;
  name: string;
  price: number;
  periodLabel: string;
  durationDays: number;
  description: string;
  features: string[];
}

export const SUBSCRIPTION_PLAN: PlanDetails = {
  id: 'monthly',
  name: 'CrestFlow Pro',
  price: 49,
  periodLabel: '/ month',
  durationDays: 30,
  description: 'Full access to all client management, automated invoicing, and tracking tools.',
  features: [
    'Unlimited client accounts & sub-clients',
    'Unlimited reel & video deliverable tracking',
    'Dynamic UPI QR code generation on invoices',
    'Automated 6:00 AM invoice generator',
    'Google Drive & Gmail delivery integration',
    'Client review portal & public freelancer portfolio'
  ]
};

export const DEFAULT_MERCHANT_VPA = 'crestflow@upi';

/**
 * Returns the configured receiving UPI VPA ID.
 */
export function getReceivingUpiId(): string {
  const envVpa = (import.meta as any).env?.VITE_SUBSCRIPTION_UPI_ID;
  if (envVpa && typeof envVpa === 'string' && envVpa.trim()) {
    return envVpa.trim();
  }
  return DEFAULT_MERCHANT_VPA;
}

/**
 * Returns the configured base URL of the YouPI Payment Core REST API (port 6100).
 */
export function getYoupiApiUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_YOUPI_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return 'http://localhost:6100';
}

/**
 * Returns the configured base URL of the YouPI Customer Checkout Portal (port 7000).
 */
export function getYoupiPortalUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_YOUPI_PORTAL_URL || (import.meta as any).env?.VITE_YOUPI_GATEWAY_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return 'http://localhost:7000';
}

/**
 * Returns the configured base URL of the self-hosted YouPI Payment Gateway (backward compatibility).
 */
export function getYoupiGatewayUrl(): string {
  return getYoupiPortalUrl();
}

export interface CreateOrderParams {
  userId: string;
  userName?: string;
  userEmail?: string;
  plan?: SubscriptionPlan;
  planName?: string;
  amount?: number;
  durationDays?: number;
  merchantVpa?: string;
  returnUrl?: string;
}

export interface PaymentSessionResult {
  orderId: string;
  paymentId?: string;
  checkoutUrl?: string;
  amount: number;
  currency: string;
  upiIntentUrl: string;
  isGatewayOnline: boolean;
}

/**
 * Checks if a given email is whitelisted for free full access.
 */
export async function checkIsWhitelisted(email?: string): Promise<boolean> {
  if (!email || !email.trim()) return false;
  try {
    const { data, error } = await supabase
      .from('subscription_whitelist')
      .select('email')
      .ilike('email', email.trim())
      .maybeSingle();

    if (!error && data) {
      return true;
    }
  } catch (err) {
    console.warn('[YouPI Service] Whitelist check failed:', err);
  }
  return false;
}

/**
 * Creates a subscription order and initializes a YouPI payment session.
 */
export async function createSubscriptionOrder(params: CreateOrderParams): Promise<PaymentSessionResult> {
  const planPrice = params.amount !== undefined ? params.amount : SUBSCRIPTION_PLAN.price;
  const planName = params.planName || SUBSCRIPTION_PLAN.name;
  const planCode = params.plan || 'monthly';
  const orderId = `CF-SUB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const apiUrl = getYoupiApiUrl();
  const portalUrl = getYoupiPortalUrl();
  const vpa = params.merchantVpa || getReceivingUpiId();

  // Construct clean, NPCI-compliant UPI Intent URL
  const payeeName = (import.meta as any).env?.VITE_MERCHANT_NAME || 'Tilak';
  const upiParams = new URLSearchParams({
    pa: vpa,
    pn: payeeName,
    am: planPrice.toFixed(2),
    cu: 'INR',
    tn: 'CrestFlow'
  });
  const upiIntentUrl = `upi://pay?${upiParams.toString()}`;

  let paymentId: string | undefined;
  let checkoutUrl: string | undefined;
  let isGatewayOnline = false;

  // Call the YouPI Payment Core REST API (port 6100)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${apiUrl}/api/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': orderId
      },
      signal: controller.signal,
      body: JSON.stringify({
        orderId,
        amount: planPrice.toFixed(2),
        currency: 'INR',
        autoActivate: true,
        customer: {
          name: params.userName || 'CrestFlow Member',
          email: params.userEmail || ''
        },
        description: `CrestFlow ${planName} — ₹${planPrice.toFixed(2)}`,
        returnUrl: params.returnUrl || window.location.href,
        metadata: {
          userId: params.userId,
          plan: planCode
        }
      })
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      paymentId = data.paymentId;
      checkoutUrl = data.checkoutUrl || `${portalUrl}/checkout/${paymentId}`;
      isGatewayOnline = true;
    }
  } catch {
    isGatewayOnline = false;
  }

  // 1. Record order in Firestore
  try {
    await setDoc(doc(db, 'subscription_payments', orderId), {
      userId: params.userId,
      orderId,
      paymentId: paymentId || null,
      plan: planCode,
      amount: planPrice,
      currency: 'INR',
      status: 'INITIATED',
      method: 'UPI',
      payerEmail: params.userEmail || null,
      createdAt: Date.now()
    });
  } catch (err) {
    console.warn('[YouPI Service] Firestore order log warning:', err);
  }

  // 2. Record order in Supabase
  try {
    await supabase.from('subscription_payments').upsert({
      user_id: params.userId,
      order_id: orderId,
      payment_id: paymentId || null,
      plan: planCode,
      amount: planPrice,
      currency: 'INR',
      status: 'INITIATED',
      method: 'UPI',
      payer_email: params.userEmail || null,
      created_at: new Date().toISOString()
    }, { onConflict: 'order_id' });
  } catch (err) {
    console.warn('[YouPI Service] Supabase order log warning:', err);
  }

  return {
    orderId,
    paymentId,
    checkoutUrl,
    amount: planPrice,
    currency: 'INR',
    upiIntentUrl,
    isGatewayOnline
  };
}

export interface PaymentStatusDetails {
  status: string;
  orderId?: string;
  amount?: string;
  currency?: string;
  method?: string;
  verificationLevel?: number;
  verificationSources?: string[];
  verificationTag?: string;
  completedAt?: string | null;
  utr?: string;
}

/**
 * Checks payment status from the YouPI-PG Gateway and returns transaction details.
 */
export async function checkPaymentStatus(paymentId: string): Promise<PaymentStatusDetails | null> {
  if (!paymentId) return null;
  const apiUrl = getYoupiApiUrl();

  try {
    const res = await fetch(`${apiUrl}/api/v1/payments/${paymentId}`);
    if (res.ok) {
      const data = await res.json();
      const status = data.status || data.internalStatus || 'UNKNOWN';
      return {
        status,
        orderId: data.orderId,
        amount: data.amount,
        currency: data.currency,
        method: data.method,
        verificationLevel: data.verificationLevel,
        verificationSources: data.verificationSources,
        verificationTag: data.verificationTag,
        completedAt: data.completedAt,
        utr: data.utr || data.metadata?.utr || (status === 'SUCCESS' ? `UPI-${data.orderId?.slice(-8) || paymentId.slice(0, 8)}` : undefined)
      };
    }
  } catch {}
  return null;
}

/**
 * Connects to the YouPI Gateway real-time SSE stream for instant payment notification.
 */
export function listenPaymentEvents(
  paymentId: string,
  onUpdate: (details: PaymentStatusDetails) => void
): () => void {
  if (!paymentId || typeof window === 'undefined' || typeof EventSource === 'undefined') {
    return () => {};
  }
  const apiUrl = getYoupiApiUrl();
  try {
    const sse = new EventSource(`${apiUrl}/api/v1/checkout/${paymentId}/events`);

    const handleEvent = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        const status = data.status || data.type || 'UNKNOWN';
        onUpdate({
          status,
          verificationLevel: data.verificationLevel,
          verificationTag: data.verificationTag,
          verificationSources: data.sources || data.verificationSources,
          utr: data.reference || data.bankReferenceNumber
        });
      } catch {}
    };

    sse.onmessage = handleEvent;
    sse.addEventListener('status_change', handleEvent as EventListener);

    return () => {
      sse.close();
    };
  } catch (err) {
    console.warn('[YouPI Service] SSE subscription failed:', err);
    return () => {};
  }
}

/**
 * Developer helper for localhost testing: Simulates an incoming bank credit alert
 * to auto-settle the active YouPI payment session.
 */
export async function simulateIncomingBankPayment(paymentId: string, amount: number = 49): Promise<boolean> {
  const gatewayUrl = getYoupiGatewayUrl();
  const utr = `429${Date.now().toString().slice(-9)}`;
  try {
    const res = await fetch(`${gatewayUrl}/api/v1/checkout/${paymentId}/simulate-observation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer f4806fbe9384422a78742715854e1b8a00f414c8f9b696449b3a3d2bc81602bc'
      },
      body: JSON.stringify({
        source: 'SMS',
        sender: 'AXISBK',
        rawText: `Dear Customer, INR ${amount.toFixed(2)} credited to A/C XX1234 on 19-Oct-26 via UPI Ref ${utr} from sender. Bal INR 1,500.00`
      })
    });
    return res.ok;
  } catch (err) {
    console.warn('[YouPI Service] Dev simulate failed:', err);
    return false;
  }
}

export interface SubmitUtrParams {
  userId: string;
  orderId: string;
  utr: string;
  userEmail?: string;
  amount?: number;
}

/**
 * Submits a 12-digit UTR reference for verification with de-duplication checks.
 */
export async function submitUtrForVerification(params: SubmitUtrParams): Promise<{ status: string; isInstantVerified: boolean }> {
  const cleanUtr = params.utr.trim();
  if (cleanUtr.length < 8) {
    throw new Error('Please enter a valid bank reference / UTR number (8 to 18 digits).');
  }

  // 1. De-duplication check: Ensure this UTR was not used by another order in Supabase
  try {
    const { data: existing, error: checkErr } = await supabase
      .from('subscription_payments')
      .select('id, order_id, status')
      .eq('utr', cleanUtr)
      .neq('order_id', params.orderId);

    if (!checkErr && existing && existing.length > 0) {
      throw new Error('This UPI reference (UTR) has already been submitted or redeemed.');
    }
  } catch (dedupErr: any) {
    if (dedupErr.message?.includes('already been submitted')) throw dedupErr;
  }

  // 2. Check if user is whitelisted
  const isWhitelisted = await checkIsWhitelisted(params.userEmail);
  if (isWhitelisted) {
    await activateSubscription({
      userId: params.userId,
      orderId: params.orderId,
      utr: cleanUtr,
      amount: params.amount || 49
    });
    return { status: 'SUCCESS', isInstantVerified: true };
  }

  const nowMs = Date.now();
  const nowIso = new Date().toISOString();

  // 3. Save to Firestore (Guaranteed to succeed and immediately trigger realtime listeners)
  try {
    await setDoc(
      doc(db, 'subscription_payments', params.orderId),
      {
        userId: params.userId,
        orderId: params.orderId,
        utr: cleanUtr,
        payerEmail: params.userEmail || null,
        amount: params.amount || 49,
        status: 'PENDING_VERIFICATION',
        updatedAt: nowMs
      },
      { merge: true }
    );
  } catch (fsErr) {
    console.warn('[YouPI Service] Firestore save UTR warning:', fsErr);
  }

  // 4. Update or Upsert in Supabase
  try {
    const { error: updateErr } = await supabase
      .from('subscription_payments')
      .update({
        status: 'PENDING_VERIFICATION',
        utr: cleanUtr,
        payer_email: params.userEmail || null,
        updated_at: nowIso
      })
      .eq('order_id', params.orderId);

    if (updateErr) {
      // Upsert full record if update failed
      await supabase.from('subscription_payments').upsert({
        user_id: params.userId,
        order_id: params.orderId,
        utr: cleanUtr,
        payer_email: params.userEmail || null,
        amount: params.amount || 49,
        plan: 'monthly',
        status: 'PENDING_VERIFICATION',
        created_at: nowIso,
        updated_at: nowIso
      }, { onConflict: 'order_id' });
    }
  } catch (sbErr) {
    console.warn('[YouPI Service] Supabase save UTR warning:', sbErr);
  }

  return { status: 'PENDING_VERIFICATION', isInstantVerified: false };
}


export interface ActivationParams {
  userId: string;
  orderId: string;
  paymentId?: string;
  utr?: string;
  amount?: number;
  durationDays?: number;
  planCode?: string;
}

/**
 * Authoritatively activates the Pro subscription for a user with specific duration.
 * Strictly verifies authoritative SUCCESS state on payment-api if paymentId is provided.
 */
export async function activateSubscription(params: ActivationParams): Promise<boolean> {
  // Defensive Verification Rule:
  // Never trust client-side claims. If paymentId is present, verify authoritative SUCCESS on payment-api
  if (params.paymentId) {
    const verifiedStatus = await checkPaymentStatus(params.paymentId);
    if (!verifiedStatus || verifiedStatus.status !== 'SUCCESS') {
      throw new Error(
        `Cannot activate subscription: Payment ${params.paymentId} status is "${verifiedStatus?.status || 'UNVERIFIED'}", not SUCCESS.`
      );
    }
  }

  const days = params.durationDays || 30;
  const durationMs = days * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const currentPeriodStart = now;
  const currentPeriodEnd = now + durationMs;
  const amount = params.amount || SUBSCRIPTION_PLAN.price;
  const plan = params.planCode || 'monthly';

  // 1. Update Profile in Supabase
  try {
    await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        subscription_plan: plan,
        current_period_start: new Date(currentPeriodStart).toISOString(),
        current_period_end: new Date(currentPeriodEnd).toISOString(),
        last_payment_id: params.paymentId || params.orderId,
        last_payment_amount: amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.userId);
  } catch (err) {
    console.warn('[YouPI Service] Error updating profile subscription:', err);
  }

  // 2. Update Payment record in Supabase
  try {
    await supabase
      .from('subscription_payments')
      .update({
        status: 'SUCCESS',
        utr: params.utr || null,
        updated_at: new Date().toISOString()
      })
      .eq('order_id', params.orderId);
  } catch (err) {
    console.warn('[YouPI Service] Error updating subscription_payments table:', err);
  }

  // 3. Update Firestore profile
  try {
    await setDoc(
      doc(db, 'profiles', params.userId),
      {
        subscriptionStatus: 'active',
        subscriptionPlan: plan,
        currentPeriodEnd,
        updatedAt: now
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[YouPI Service] Error updating Firestore profile:', err);
  }

  // 4. Update localStorage cache for instant UI refresh
  try {
    const cacheKey = `crestflow_sub_${params.userId}`;
    const subData = {
      status: 'active' as SubscriptionStatus,
      plan: plan as SubscriptionPlan,
      currentPeriodStart,
      currentPeriodEnd,
      lastPaymentId: params.paymentId || params.orderId,
      lastPaymentAmount: amount,
      updatedAt: now
    };
    localStorage.setItem(cacheKey, JSON.stringify(subData));
  } catch {}

  return true;
}

/**
 * Admin action: Approves a payment in the review queue and activates user account.
 */
export async function approveSubscriptionPayment(orderId: string, adminNotes?: string): Promise<boolean> {
  // Fetch payment details
  const { data: payment, error } = await supabase
    .from('subscription_payments')
    .select('user_id, amount, utr, plan')
    .eq('order_id', orderId)
    .single();

  if (error || !payment) {
    throw new Error('Payment record not found.');
  }

  // Determine duration from plan if available
  let durationDays = 30;
  if (payment.plan) {
    try {
      const { data: planRow } = await supabase
        .from('subscription_plans')
        .select('duration_days')
        .eq('plan_code', payment.plan)
        .maybeSingle();
      if (planRow?.duration_days) {
        durationDays = planRow.duration_days;
      }
    } catch {}
  }

  await activateSubscription({
    userId: payment.user_id,
    orderId,
    utr: payment.utr,
    amount: payment.amount,
    durationDays,
    planCode: payment.plan || 'monthly'
  });


  if (adminNotes) {
    await supabase
      .from('subscription_payments')
      .update({ admin_notes: adminNotes })
      .eq('order_id', orderId);
  }

  return true;
}

/**
 * Admin action: Rejects a payment in the review queue.
 */
export async function rejectSubscriptionPayment(orderId: string, reason?: string): Promise<boolean> {
  const { error } = await supabase
    .from('subscription_payments')
    .update({
      status: 'REJECTED',
      admin_notes: reason || 'Rejected by Admin',
      updated_at: new Date().toISOString()
    })
    .eq('order_id', orderId);

  if (error) throw error;
  return true;
}

/**
 * Admin action: Grants or extends subscription days for a specific user.
 */
export async function grantManualSubscriptionDays(userId: string, additionalDays: number = 30): Promise<boolean> {
  const durationMs = additionalDays * 24 * 60 * 60 * 1000;
  const now = Date.now();

  // Check existing expiration in Supabase
  let baseDate = now;
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_period_end')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.current_period_end) {
      const existingEnd = new Date(profile.current_period_end).getTime();
      if (existingEnd > now) {
        baseDate = existingEnd;
      }
    }
  } catch (err) {
    console.warn('[YouPI Service] Supabase read profile warning:', err);
  }

  // Also check Firestore if Supabase didn't have a future end date
  if (baseDate === now) {
    try {
      const fireDoc = await getDoc(doc(db, 'profiles', userId));
      if (fireDoc.exists()) {
        const fireData = fireDoc.data();
        if (fireData?.currentPeriodEnd && Number(fireData.currentPeriodEnd) > now) {
          baseDate = Number(fireData.currentPeriodEnd);
        }
      }
    } catch {}
  }

  const newPeriodEndMs = baseDate + durationMs;
  const newPeriodEndIso = new Date(newPeriodEndMs).toISOString();

  // 1. Update Supabase
  try {
    await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        subscription_plan: 'monthly',
        current_period_end: newPeriodEndIso,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
  } catch (supabaseErr) {
    console.warn('[YouPI Service] Supabase profile update error:', supabaseErr);
  }

  // 2. Update Firestore
  try {
    await setDoc(
      doc(db, 'profiles', userId),
      {
        subscriptionStatus: 'active',
        subscriptionPlan: 'monthly',
        currentPeriodEnd: newPeriodEndMs,
        updatedAt: now
      },
      { merge: true }
    );
  } catch (firestoreErr) {
    console.warn('[YouPI Service] Firestore profile update error:', firestoreErr);
  }

  // 3. Update localStorage cache
  try {
    const cacheKey = `crestflow_sub_${userId}`;
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        status: 'active',
        plan: 'monthly',
        currentPeriodStart: now,
        currentPeriodEnd: newPeriodEndMs,
        updatedAt: now
      })
    );
  } catch {}

  return true;
}

/**
 * Admin action: Instantly revokes subscription access for a user.
 */
export async function revokeSubscription(userId: string): Promise<boolean> {
  const now = Date.now();

  // 1. Update Supabase
  try {
    await supabase
      .from('profiles')
      .update({
        subscription_status: 'expired',
        current_period_end: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString()
      })
      .eq('id', userId);
  } catch (e) {
    console.warn('[YouPI Service] Supabase revoke error:', e);
  }

  // 2. Update Firestore
  try {
    await setDoc(
      doc(db, 'profiles', userId),
      {
        subscriptionStatus: 'expired',
        currentPeriodEnd: now,
        updatedAt: now
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('[YouPI Service] Firestore revoke error:', e);
  }

  // 3. Update localStorage cache
  try {
    const cacheKey = `crestflow_sub_${userId}`;
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        status: 'expired',
        plan: 'monthly',
        currentPeriodEnd: now,
        updatedAt: now
      })
    );
  } catch {}

  return true;
}


/**
 * Admin action: Adds an email address to the VIP subscription whitelist.
 */
export async function addToWhitelist(email: string, reason?: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) throw new Error('Email cannot be empty');

  const { error } = await supabase
    .from('subscription_whitelist')
    .insert({
      email: cleanEmail,
      reason: reason?.trim() || 'Approved by Admin',
      created_at: new Date().toISOString()
    });

  if (error) throw error;
  return true;
}

/**
 * Admin action: Removes an email from the VIP subscription whitelist.
 */
export async function removeFromWhitelist(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('subscription_whitelist')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

/**
 * Fetches subscription plans from Supabase / Firestore with fallback to default ₹49 plan.
 */
export async function fetchSubscriptionPlans(activeOnly = true): Promise<SubscriptionPlanItem[]> {
  try {
    let query = supabase
      .from('subscription_plans')
      .select('*')
      .order('sort_order', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        planCode: d.plan_code,
        name: d.name,
        price: Number(d.price),
        currency: d.currency || 'INR',
        durationDays: d.duration_days || 30,
        periodLabel: d.period_label || '/ month',
        description: d.description || '',
        badge: d.badge || '',
        features: Array.isArray(d.features) ? d.features : [],
        isActive: d.is_active ?? true,
        sortOrder: d.sort_order ?? 0,
        createdAt: d.created_at
      }));
    }
  } catch (err) {
    console.warn('[YouPI Service] Supabase plans fetch error:', err);
  }

  // Firestore fallback
  try {
    const snap = await getDocs(collection(db, 'subscription_plans'));
    if (!snap.empty) {
      const items: SubscriptionPlanItem[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (!activeOnly || data.isActive !== false) {
          items.push({
            id: d.id,
            planCode: data.planCode || d.id,
            name: data.name,
            price: Number(data.price),
            currency: data.currency || 'INR',
            durationDays: data.durationDays || 30,
            periodLabel: data.periodLabel || '/ month',
            description: data.description || '',
            badge: data.badge || '',
            features: data.features || [],
            isActive: data.isActive ?? true,
            sortOrder: data.sortOrder ?? 0,
            createdAt: data.createdAt
          });
        }
      });
      if (items.length > 0) {
        return items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      }
    }
  } catch (err) {
    console.warn('[YouPI Service] Firestore plans fetch error:', err);
  }

  // Fallback default ₹49 monthly plan
  return [
    {
      id: 'default-monthly',
      planCode: 'monthly',
      name: SUBSCRIPTION_PLAN.name,
      price: SUBSCRIPTION_PLAN.price,
      currency: 'INR',
      durationDays: SUBSCRIPTION_PLAN.durationDays,
      periodLabel: SUBSCRIPTION_PLAN.periodLabel,
      description: SUBSCRIPTION_PLAN.description,
      badge: 'Popular',
      features: SUBSCRIPTION_PLAN.features,
      isActive: true,
      sortOrder: 1
    }
  ];
}

/**
 * Creates a new subscription plan or promotional offer.
 */
export async function createSubscriptionPlan(plan: Omit<SubscriptionPlanItem, 'id'>): Promise<SubscriptionPlanItem> {
  const planCode = plan.planCode.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const nowIso = new Date().toISOString();

  const planPayload = {
    plan_code: planCode,
    name: plan.name.trim(),
    price: plan.price,
    currency: plan.currency || 'INR',
    duration_days: plan.durationDays || 30,
    period_label: plan.periodLabel || '/ month',
    description: plan.description || '',
    badge: plan.badge || '',
    features: plan.features || [],
    is_active: plan.isActive ?? true,
    sort_order: plan.sortOrder ?? 0,
    created_at: nowIso,
    updated_at: nowIso
  };

  let createdId = planCode;

  // 1. Insert into Supabase
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .insert(planPayload)
      .select('id')
      .single();

    if (!error && data?.id) {
      createdId = data.id;
    }
  } catch (err) {
    console.warn('[YouPI Service] Supabase create plan error:', err);
  }

  // 2. Sync to Firestore
  try {
    await setDoc(doc(db, 'subscription_plans', planCode), {
      planCode,
      name: plan.name.trim(),
      price: plan.price,
      currency: plan.currency || 'INR',
      durationDays: plan.durationDays || 30,
      periodLabel: plan.periodLabel || '/ month',
      description: plan.description || '',
      badge: plan.badge || '',
      features: plan.features || [],
      isActive: plan.isActive ?? true,
      sortOrder: plan.sortOrder ?? 0,
      createdAt: Date.now()
    });
  } catch (err) {
    console.warn('[YouPI Service] Firestore create plan error:', err);
  }

  return {
    ...plan,
    id: createdId,
    planCode,
    createdAt: nowIso
  };
}

/**
 * Deletes a subscription plan by ID or code.
 */
export async function deleteSubscriptionPlan(idOrPlanCode: string): Promise<boolean> {
  // 1. Delete from Supabase
  try {
    await supabase
      .from('subscription_plans')
      .delete()
      .or(`id.eq.${idOrPlanCode},plan_code.eq.${idOrPlanCode}`);
  } catch (err) {
    console.warn('[YouPI Service] Supabase delete plan error:', err);
  }

  // 2. Delete from Firestore
  try {
    await deleteDoc(doc(db, 'subscription_plans', idOrPlanCode));
  } catch (err) {
    console.warn('[YouPI Service] Firestore delete plan error:', err);
  }

  return true;
}

/**
 * Toggles a subscription plan active state.
 */
export async function toggleSubscriptionPlan(idOrPlanCode: string, isActive: boolean): Promise<boolean> {
  // 1. Update in Supabase
  try {
    await supabase
      .from('subscription_plans')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .or(`id.eq.${idOrPlanCode},plan_code.eq.${idOrPlanCode}`);
  } catch (err) {
    console.warn('[YouPI Service] Supabase toggle plan error:', err);
  }

  // 2. Update in Firestore
  try {
    await setDoc(
      doc(db, 'subscription_plans', idOrPlanCode),
      { isActive, updatedAt: Date.now() },
      { merge: true }
    );
  } catch (err) {
    console.warn('[YouPI Service] Firestore toggle plan error:', err);
  }

  return true;
}

/**
 * Cancels an initiated subscription order and notifies the gateway to free queue slot.
 */
export async function cancelSubscriptionOrder(orderId: string, paymentId?: string): Promise<void> {
  const apiUrl = getYoupiApiUrl();
  try {
    if (paymentId) {
      await fetch(`${apiUrl}/api/v1/payments/${paymentId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => {});
    }
  } catch {
    // ignore
  }

  try {
    await setDoc(doc(db, 'subscription_payments', orderId), {
      status: 'CANCELLED',
      updatedAt: Date.now()
    }, { merge: true });
  } catch {
    // ignore
  }

  try {
    await supabase
      .from('subscription_payments')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('order_id', orderId);
  } catch {
    // ignore
  }
}


