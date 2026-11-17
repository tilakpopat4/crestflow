import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { SubscriptionDoc, SubscriptionState, SubscriptionStateMachine } from '../hooks/useSubscription';

export async function checkIsWhitelisted(email?: string): Promise<boolean> {
  if (!email || !email.trim()) return false;
  const normalized = email.trim().toLowerCase();
  if (normalized === 'tilakpopat2007@gmail.com') return true;
  try {
    const snap = await getDoc(doc(db, 'subscription_whitelist', normalized));
    return snap.exists();
  } catch {
    return false;
  }
}

export interface ComputeStateParams {
  isSubscriptionFeatureEnabled: boolean;
  isWhitelisted: boolean;
  subscriptionDoc: SubscriptionDoc | null;
  serverMe: {
    serverNow: string;
    status: string;
    accessUntil: string | null;
    trialEndsAt: string | null;
    trialClaimed?: boolean;
  } | null;
}

export function computeSubscriptionAccess(params: ComputeStateParams): Omit<
  SubscriptionState,
  'loading' | 'isWhitelisted' | 'isSubscriptionFeatureEnabled' | 'limits' |
  'canCreateClient' | 'canCreateInvoice' | 'refreshSubscription' | 'cancelSubscription' |
  'activateFreeTrial' | 'checkAccess'
> {
  const { isSubscriptionFeatureEnabled, isWhitelisted, subscriptionDoc, serverMe } = params;

  if (!isSubscriptionFeatureEnabled || isWhitelisted) {
    return {
      status: 'active',
      plan: 'pro_yearly',
      isPro: true,
      hasAccess: true,
      stateMachine: 'ACTIVE',
      trialClaimed: true,
      isTrialEligible: false,
      isTrialing: false,
      isPastDue: false,
      isExpired: false,
      isCancelled: false,
      isPaidActive: true,
      cancelAtPeriodEnd: false,
      billingCycle: 'yearly',
      accessUntil: undefined,
      trialEndsAt: undefined,
      daysRemaining: 999,
      serverNow: serverMe?.serverNow,
      currentPeriodEnd: undefined,
    };
  }

  const serverNowMs = serverMe?.serverNow ? new Date(serverMe.serverNow).getTime() : Date.now();
  const accessUntilStr = subscriptionDoc?.accessUntil || serverMe?.accessUntil;
  const trialEndsAtStr = subscriptionDoc?.trialEndsAt || serverMe?.trialEndsAt;
  const accessUntilMs = accessUntilStr ? new Date(accessUntilStr).getTime() : 0;
  const trialEndsAtMs = trialEndsAtStr ? new Date(trialEndsAtStr).getTime() : 0;

  const rawStatus = (subscriptionDoc?.status || serverMe?.status || 'none') as SubscriptionState['status'];
  const isCancelled = Boolean(subscriptionDoc?.cancelAtPeriodEnd);

  // Access entitlement is strictly governed by whether server accessUntil > serverNow
  const hasAccess = accessUntilMs > serverNowMs;
  const isTrialing = rawStatus === 'trialing' && hasAccess;
  const isPastDue = rawStatus === 'past_due' && hasAccess;
  const isPaidActive = (rawStatus === 'active' || rawStatus === 'cancelled') && hasAccess;
  const isExpired = !hasAccess && rawStatus !== 'none';

  let targetEndMs = accessUntilMs;
  if (isTrialing && trialEndsAtMs > 0) targetEndMs = trialEndsAtMs;
  const daysRemaining = targetEndMs > serverNowMs
    ? Math.max(0, Math.ceil((targetEndMs - serverNowMs) / (24 * 60 * 60 * 1000)))
    : 0;

  const trialClaimed = Boolean(
    subscriptionDoc?.trialClaimed ||
    serverMe?.trialClaimed ||
    Boolean(subscriptionDoc?.trialEndsAt) ||
    rawStatus === 'trialing'
  );
  const isTrialEligible = !trialClaimed && !hasAccess;

  let stateMachine: SubscriptionStateMachine = 'FREE';
  if (isTrialing) stateMachine = 'TRIAL_ACTIVE';
  else if (isPaidActive) stateMachine = 'ACTIVE';
  else if (isCancelled && hasAccess) stateMachine = 'CANCELLED';
  else if (rawStatus === 'pending') stateMachine = 'PAYMENT_PENDING';
  else if (isPastDue) stateMachine = 'PAYMENT_FAILED';
  else if (trialClaimed && !hasAccess) stateMachine = 'TRIAL_EXPIRED';
  else if (!hasAccess && rawStatus !== 'none') stateMachine = 'EXPIRED';
  else if (isTrialEligible) stateMachine = 'TRIAL_ELIGIBLE';

  return {
    status: rawStatus,
    plan: subscriptionDoc?.plan || 'pro_monthly',
    stateMachine,
    trialClaimed,
    isTrialEligible,
    isPro: hasAccess,
    hasAccess,
    isTrialing,
    isPastDue,
    isExpired,
    isCancelled,
    isPaidActive,
    cancelAtPeriodEnd: isCancelled,
    billingCycle: subscriptionDoc?.billingCycle || 'monthly',
    accessUntil: accessUntilStr,
    trialEndsAt: trialEndsAtStr,
    daysRemaining,
    serverNow: serverMe?.serverNow,
    currentPeriodEnd: subscriptionDoc?.currentPeriodEnd,
  };
}
