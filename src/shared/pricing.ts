/**
 * Canonical shared pricing, plan metadata, and trial promise copy.
 * Single source of truth consumed by both frontend (src/) and Worker (worker/).
 */

export type PlanIntervalKey = 'trial' | 'monthly' | 'quarterly' | 'yearly';
export type PaidPlanKey = 'monthly' | 'quarterly' | 'yearly';

export const TRIAL_DURATION_DAYS = 7;
export const GRACE_DURATION_DAYS = 3;
export const INACTIVE_REQUEST_PAUSE_DAYS = 30;
export const LIFETIME_VALID_UNTIL_ISO = '2099-12-31T23:59:59.000Z';

export const TRIAL_PROMISE_COPY = '7-day free trial, no card needed, no automatic charge.';

export interface PlanPricing {
  id: PlanIntervalKey;
  planCode: string;
  name: string;
  tabLabel?: string;
  price: number;
  pricePaise: number;
  currency: string;
  interval: string;
  durationDays: number;
  periodLabel: string;
  monthlyEquivalent: number;
  dailyEquivalent: string;
  savingsBadge?: string;
  savingsAmount?: number;
  description: string;
  features: string[];
  disclosureText?: string;
  ctaLabel?: string;
  extraInfo?: string;
  isTrial?: boolean;
  isBestValue?: boolean;
}

export const TRIAL_PLAN: PlanPricing = {
  id: 'trial',
  planCode: 'pro_trial',
  name: '7-Day Free Trial',
  tabLabel: 'Trial',
  price: 0,
  pricePaise: 0,
  currency: 'INR',
  interval: '7 days',
  durationDays: TRIAL_DURATION_DAYS,
  periodLabel: 'for 7 days',
  monthlyEquivalent: 0,
  dailyEquivalent: '₹0.00/day',
  savingsBadge: 'No Card',
  description: TRIAL_PROMISE_COPY,
  isTrial: true,
  ctaLabel: 'Start 7-Day Free Trial',
  features: [
    'Unlimited clients, deliverables, and UPI QR invoices',
    'Token-scoped client invoice links and review portals',
    'Automated 6:00 AM billing and email reminders',
  ],
};

export const PRO_PLANS: PlanPricing[] = [
  {
    id: 'monthly',
    planCode: 'pro_monthly',
    name: 'Pro Monthly',
    tabLabel: 'Monthly',
    price: 79,
    pricePaise: 7900,
    currency: 'INR',
    interval: 'month',
    durationDays: 30,
    periodLabel: '/ month',
    monthlyEquivalent: 79,
    dailyEquivalent: '₹2.63/day',
    description: 'Flexible month-to-month access.',
    ctaLabel: 'Choose Monthly — ₹79',
    features: [
      'Unlimited clients, retainers, and deliverables',
      'Branded UPI QR invoices and token-shared links',
      'Automated 6:00 AM scheduling & due reminders',
    ],
  },
  {
    id: 'quarterly',
    planCode: 'pro_quarterly',
    name: 'Pro Quarterly',
    tabLabel: 'Quarterly',
    price: 199,
    pricePaise: 19900,
    currency: 'INR',
    interval: '3 months',
    durationDays: 90,
    periodLabel: '/ quarter',
    monthlyEquivalent: 66,
    dailyEquivalent: '₹2.21/day',
    savingsBadge: 'Save 16%',
    savingsAmount: 38,
    description: 'Billed every 3 months (~₹66/mo).',
    ctaLabel: 'Choose Quarterly — ₹199',
    features: [
      'Save ₹38 every quarter vs monthly billing',
      'Client portals, Drive sync, and review links',
      'Full JSON & CSV workspace export anytime',
    ],
  },
  {
    id: 'yearly',
    planCode: 'pro_yearly',
    name: 'Pro Yearly',
    tabLabel: 'Yearly',
    price: 699,
    pricePaise: 69900,
    currency: 'INR',
    interval: 'year',
    durationDays: 365,
    periodLabel: '/ year',
    monthlyEquivalent: 58,
    dailyEquivalent: '₹1.92/day',
    savingsBadge: 'Best value · Save 26%',
    savingsAmount: 249,
    isBestValue: true,
    description: 'Billed annually (~₹58/mo). Save ₹249/year.',
    ctaLabel: 'Get Yearly — ₹699',
    features: [
      'Save ₹249/year — over 3 months free',
      'Unlimited invoices, deliverables & client portals',
      'Priority support and uninterrupted annual access',
    ],
  },
];

export const ALL_DISPLAY_PLANS: PlanPricing[] = [
  TRIAL_PLAN,
  ...PRO_PLANS,
];

export const SERVER_PLAN_CATALOG: Record<PaidPlanKey, {
  planCode: string;
  amountPaise: number;
  priceInr: number;
  durationDays: number;
  intervalLabel: string;
}> = {
  monthly: { planCode: 'pro_monthly', amountPaise: 7900, priceInr: 79, durationDays: 30, intervalLabel: 'month' },
  quarterly: { planCode: 'pro_quarterly', amountPaise: 19900, priceInr: 199, durationDays: 90, intervalLabel: '3 months' },
  yearly: { planCode: 'pro_yearly', amountPaise: 69900, priceInr: 699, durationDays: 365, intervalLabel: 'year' },
};

/**
 * Resolves a paid plan key from arbitrary user/config input; returns null for unknown or 'trial'.
 */
export function resolvePaidPlanKey(planKey?: string | null): PaidPlanKey | null {
  const clean = (planKey || '').toLowerCase().trim();
  if (clean === 'monthly' || clean === 'pro_monthly') return 'monthly';
  if (clean === 'quarterly' || clean === 'pro_quarterly') return 'quarterly';
  if (clean === 'yearly' || clean === 'pro_yearly' || clean === 'annual') return 'yearly';
  return null;
}

/**
 * Formats an unambiguous disclosure matching actual payment behavior:
 * - Trial: no card, no automatic charge
 * - Recurring subscription: billed today & auto-renews
 * - Order fallback: pay once until date, no auto-renewal
 */
export function getPlanDisclosureText(
  plan: PlanPricing,
  mode: 'subscription' | 'order' = 'subscription',
  baseDate = new Date()
): string {
  if (plan.disclosureText && plan.disclosureText.trim()) {
    return plan.disclosureText.trim();
  }
  if (plan.isTrial || plan.id === 'trial') {
    return TRIAL_PROMISE_COPY;
  }
  if (mode === 'order') {
    const endDate = new Date(baseDate.getTime() + plan.durationDays * 86400 * 1000);
    const formatted = endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return `Pay once, valid until ${formatted}, no auto-renewal.`;
  }
  return `Charged ₹${plan.price.toLocaleString('en-IN')} today; renews every ${plan.interval} until cancelled.`;
}

/**
 * Legacy helper name retained for tests; delegates to getPlanDisclosureText.
 */
export function getTrialDisclosureText(
  plan: PlanPricing,
  baseDate = new Date(),
  mode: 'subscription' | 'order' = 'subscription'
): string {
  return getPlanDisclosureText(plan, mode, baseDate);
}
