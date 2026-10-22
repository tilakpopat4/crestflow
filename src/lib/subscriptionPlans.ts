/**
 * CrestFlow 4 Subscription Plans (Monthly, Quarterly, 6-Month, Yearly) & Limits.
 */

export type PlanIntervalKey = 'monthly' | 'quarterly' | 'half' | 'yearly';

export interface PlanPricing {
  id: PlanIntervalKey;
  planCode: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  durationDays: number;
  periodLabel: string;
  monthlyEquivalent: number;
  savingsBadge?: string;
  description: string;
  features: string[];
}

export const FREE_TIER_LIMITS = {
  maxClients: 2,
  maxInvoicesPerMonth: 3,
};

export const PRO_PLANS: PlanPricing[] = [
  {
    id: 'monthly',
    planCode: 'pro_monthly',
    name: 'Pro Monthly',
    price: 79,
    currency: 'INR',
    interval: 'month',
    durationDays: 30,
    periodLabel: '/ month',
    monthlyEquivalent: 79,
    description: 'Billed monthly. Complete flexibility.',
    features: [
      'Unlimited clients & sub-clients',
      'Unlimited invoices with personal UPI QR codes',
      'Automated 6:00 AM delivery scheduling',
      'Client review portal & public freelancer portfolio',
      'Direct UPI payment tracking without gateway commission',
    ],
  },
  {
    id: 'quarterly',
    planCode: 'pro_quarterly',
    name: 'Pro Quarterly',
    price: 199,
    currency: 'INR',
    interval: '3 months',
    durationDays: 90,
    periodLabel: '/ quarter',
    monthlyEquivalent: 66,
    savingsBadge: 'Save 16%',
    description: 'Billed every 3 months (~₹66/mo).',
    features: [
      'All Pro Monthly features included',
      'Quarterly uninterrupted workflow',
      'Priority delivery & support',
    ],
  },
  {
    id: 'half',
    planCode: 'pro_half',
    name: 'Pro 6-Month',
    price: 449,
    currency: 'INR',
    interval: '6 months',
    durationDays: 180,
    periodLabel: '/ 6 months',
    monthlyEquivalent: 75,
    savingsBadge: 'Save 5%',
    description: 'Billed every 6 months (~₹75/mo).',
    features: [
      'All Pro features included',
      'Half-year locked pricing',
      'Client review portal & priority roadmap',
    ],
  },
  {
    id: 'yearly',
    planCode: 'pro_yearly',
    name: 'Pro Yearly',
    price: 899,
    currency: 'INR',
    interval: 'year',
    durationDays: 365,
    periodLabel: '/ year',
    monthlyEquivalent: 75,
    savingsBadge: 'Save 5%',
    description: 'Billed annually (~₹75/mo).',
    features: [
      'All Pro features included',
      'Full year uninterrupted access',
      'Custom domain & priority beta features',
    ],
  },
];

/**
 * Returns the exact mandatory disclosure string required by billing regulations:
 * "₹1 today for a 7-day trial, then ₹X on [date]; the ₹1 is non-refundable"
 */
export function getTrialDisclosureText(plan: PlanPricing, baseDate = new Date()): string {
  const chargeDate = new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const formattedDate = chargeDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `₹1 today for a 7-day trial, then ₹${plan.price.toLocaleString('en-IN')} on ${formattedDate}; the ₹1 is non-refundable`;
}
