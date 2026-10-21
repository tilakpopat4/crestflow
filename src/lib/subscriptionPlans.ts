/**
 * CrestFlow Subscription Plans & Limits configuration.
 */

export interface PlanPricing {
  id: 'free' | 'monthly' | 'yearly';
  planCode: 'free' | 'pro_monthly' | 'pro_yearly';
  name: string;
  price: number;
  currency: string;
  durationDays: number;
  periodLabel: string;
  description: string;
  badge?: string;
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
    name: 'CrestFlow Pro Monthly',
    price: 79,
    currency: 'INR',
    durationDays: 30,
    periodLabel: '/ month',
    description: 'Billed monthly. Cancel anytime.',
    features: [
      'Unlimited client accounts & sub-clients',
      'Unlimited invoice generation with personal UPI QR codes',
      'Automated 6:00 AM invoice scheduling',
      'Google Drive & Gmail automated delivery',
      'Client review portal & public freelancer portfolio',
    ],
  },
  {
    id: 'yearly',
    planCode: 'pro_yearly',
    name: 'CrestFlow Pro Yearly',
    price: 799,
    currency: 'INR',
    durationDays: 365,
    periodLabel: '/ year',
    description: 'Billed annually (~₹66/month, save 15%).',
    badge: 'Best Value',
    features: [
      'All Pro Monthly features included',
      '12 months of uninterrupted access',
      'Priority delivery & upcoming feature beta access',
    ],
  },
];
