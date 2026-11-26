import { useAccess } from './useAccess';

export type LegacySubscriptionStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'grace'
  | 'expired'
  | 'suspended'
  | 'cancelled'
  | 'halted'
  | 'free'
  | 'inactive';

export interface SubscriptionState {
  status: LegacySubscriptionStatus;
  rawStatus: string;
  plan: string;
  billingCycle: string | null;
  checkoutMode: 'subscription' | 'order' | null;
  hasAccess: boolean;
  canWrite: boolean;
  isExploring: boolean;
  isTrial: boolean;
  isTrialing: boolean;
  isPaidActive: boolean;
  isExpired: boolean;
  isSuspended: boolean;
  isLifetime: boolean;
  isTrialEligible: boolean;
  isSubscriptionFeatureEnabled: boolean;
  loading: boolean;
  isWhitelisted: boolean;
  cancelAtPeriodEnd: boolean;
  accessUntil: string | null;
  currentPeriodEnd: string | null;
  graceUntil: string | null;
  daysRemaining: number;
  trialDay: number;
  trialUsed: boolean;
  requireAccess: (action: string, benefit?: string) => boolean;
  canCreateClient: (currentClientCount?: number) => boolean;
  canCreateInvoice: (currentMonthlyInvoiceCount?: number) => boolean;
  startTrial: () => Promise<{ success: boolean; error?: string }>;
  cancelSubscription: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

/**
 * Compatibility adapter over useAccess() so existing workspace components consume the single
 * server-authoritative AccessProvider without duplicate Firestore listeners or flicker races.
 */
export function useSubscription(_userId?: string, _userEmail?: string): SubscriptionState {
  const access = useAccess();

  const isTrial = access.state === 'trialing';
  const isPaidActive =
    (access.state === 'active' || access.state === 'grace') && access.plan !== 'pro_trial';

  return {
    status: access.state === 'loading' ? 'none' : access.state,
    rawStatus: access.rawStatus,
    plan: access.plan,
    billingCycle: access.billingCycle,
    checkoutMode: access.checkoutMode,
    hasAccess: access.canWrite,
    canWrite: access.canWrite,
    isExploring: access.isExploring,
    isTrial,
    isTrialing: isTrial,
    isPaidActive,
    isExpired: access.isExpired,
    isSuspended: access.state === 'suspended',
    isLifetime: access.isLifetime,
    isTrialEligible: !access.trialUsed && access.state === 'none',
    isSubscriptionFeatureEnabled: true,
    loading: access.isLoading,
    isWhitelisted: access.isLifetime,
    cancelAtPeriodEnd: access.cancelAtPeriodEnd,
    accessUntil: access.validUntil,
    currentPeriodEnd: access.validUntil,
    graceUntil: access.graceUntil,
    daysRemaining: access.daysLeft,
    trialDay: access.trialDay,
    trialUsed: access.trialUsed,
    requireAccess: access.requireAccess,
    canCreateClient: () => access.canWrite,
    canCreateInvoice: () => access.canWrite,
    startTrial: access.activateTrial,
    cancelSubscription: access.cancelSubscription,
    refreshSubscription: access.refreshAccess,
  };
}
