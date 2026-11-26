import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import {
  ALL_DISPLAY_PLANS,
  PlanPricing,
  TRIAL_PROMISE_COPY,
} from '../shared/pricing';

export interface PricingWallConfig {
  wallTitle: string;
  wallSubtitle: string;
  pricingTitle: string;
  pricingSubtitle: string;
  termsTitle: string;
  termsBody: string;
  footerNote: string;
  plans: PlanPricing[];
}

export const DEFAULT_PRICING_CONFIG: PricingWallConfig = {
  wallTitle: 'Keep Creating Without Limits',
  wallSubtitle: TRIAL_PROMISE_COPY,
  pricingTitle: 'Simple, Transparent Pricing',
  pricingSubtitle: `${TRIAL_PROMISE_COPY} Zero commission on client UPI payouts.`,
  termsTitle: 'Trial, Cancellation & Refund Terms',
  termsBody:
    `${TRIAL_PROMISE_COPY} Cancel auto-renewal anytime and keep Pro access until the end of your current period. Refund requests are processed according to our published Refund Policy.`,
  footerNote: 'Secure checkout powered by Razorpay. Direct UPI client payments stay 100% yours.',
  plans: ALL_DISPLAY_PLANS.map((plan) => ({
    ...plan,
    tabLabel: plan.name.replace('Pro ', ''),
    features: [...plan.features],
  })),
};

function sanitizeLegacyTrialText(input: string, fallback: string): string {
  const lower = input.toLowerCase();
  if (lower.includes('₹1') || lower.includes('rs. 1') || lower.includes('rs.1') || lower.includes('1 verification')) {
    return fallback;
  }
  return input;
}

/**
 * Merges remote Firestore pricing copy safely over current canonical 4-plan defaults
 * (`trial`, `monthly`, `quarterly`, `yearly`) and strips any stale ₹1 trial copy.
 */
export function mergePricingConfig(raw?: Partial<PricingWallConfig> | null): PricingWallConfig {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_PRICING_CONFIG,
      plans: DEFAULT_PRICING_CONFIG.plans.map((p) => ({ ...p, features: [...p.features] })),
    };
  }

  const incomingPlans = Array.isArray(raw.plans) ? raw.plans : [];
  const mergedPlans: PlanPricing[] = DEFAULT_PRICING_CONFIG.plans.map((defPlan) => {
    const inc = incomingPlans.find((p) => p && p.id === defPlan.id);
    if (!inc) return { ...defPlan, features: [...defPlan.features] };

    const isTrial = defPlan.id === 'trial';
    const rawFeatures = Array.isArray(inc.features)
      ? inc.features.filter((f): f is string => typeof f === 'string' && f.trim().length > 0 && !f.includes('₹1'))
      : [];

    const parsedPrice = Number(inc.price);
    const parsedDays = Number(inc.durationDays);
    const parsedMonthlyEq = Number(inc.monthlyEquivalent);

    return {
      ...defPlan,
      name: typeof inc.name === 'string' && inc.name.trim() ? inc.name.trim() : defPlan.name,
      tabLabel: typeof inc.tabLabel === 'string' && inc.tabLabel.trim() ? inc.tabLabel.trim() : defPlan.tabLabel,
      price: isTrial ? 0 : (Number.isFinite(parsedPrice) && parsedPrice > 1 ? parsedPrice : defPlan.price),
      interval: typeof inc.interval === 'string' && inc.interval.trim() ? inc.interval.trim() : defPlan.interval,
      durationDays: Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : defPlan.durationDays,
      periodLabel: typeof inc.periodLabel === 'string' && inc.periodLabel.trim() ? inc.periodLabel.trim() : defPlan.periodLabel,
      monthlyEquivalent: isTrial ? 0 : (Number.isFinite(parsedMonthlyEq) && parsedMonthlyEq > 0 ? parsedMonthlyEq : defPlan.monthlyEquivalent),
      savingsBadge: typeof inc.savingsBadge === 'string' ? inc.savingsBadge.trim() || defPlan.savingsBadge : defPlan.savingsBadge,
      description:
        typeof inc.description === 'string' && inc.description.trim()
          ? sanitizeLegacyTrialText(inc.description.trim(), defPlan.description)
          : defPlan.description,
      features: rawFeatures.length > 0 ? rawFeatures : [...defPlan.features],
      disclosureText:
        typeof inc.disclosureText === 'string' && inc.disclosureText.trim()
          ? sanitizeLegacyTrialText(inc.disclosureText.trim(), defPlan.disclosureText || '')
          : defPlan.disclosureText,
      ctaLabel: typeof inc.ctaLabel === 'string' ? inc.ctaLabel.trim() || undefined : defPlan.ctaLabel,
      extraInfo: typeof inc.extraInfo === 'string' ? inc.extraInfo.trim() || undefined : defPlan.extraInfo,
    };
  });

  return {
    wallTitle:
      typeof raw.wallTitle === 'string' && raw.wallTitle.trim()
        ? sanitizeLegacyTrialText(raw.wallTitle.trim(), DEFAULT_PRICING_CONFIG.wallTitle)
        : DEFAULT_PRICING_CONFIG.wallTitle,
    wallSubtitle:
      typeof raw.wallSubtitle === 'string' && raw.wallSubtitle.trim()
        ? sanitizeLegacyTrialText(raw.wallSubtitle.trim(), DEFAULT_PRICING_CONFIG.wallSubtitle)
        : DEFAULT_PRICING_CONFIG.wallSubtitle,
    pricingTitle:
      typeof raw.pricingTitle === 'string' && raw.pricingTitle.trim()
        ? sanitizeLegacyTrialText(raw.pricingTitle.trim(), DEFAULT_PRICING_CONFIG.pricingTitle)
        : DEFAULT_PRICING_CONFIG.pricingTitle,
    pricingSubtitle:
      typeof raw.pricingSubtitle === 'string' && raw.pricingSubtitle.trim()
        ? sanitizeLegacyTrialText(raw.pricingSubtitle.trim(), DEFAULT_PRICING_CONFIG.pricingSubtitle)
        : DEFAULT_PRICING_CONFIG.pricingSubtitle,
    termsTitle:
      typeof raw.termsTitle === 'string' && raw.termsTitle.trim()
        ? raw.termsTitle.trim()
        : DEFAULT_PRICING_CONFIG.termsTitle,
    termsBody:
      typeof raw.termsBody === 'string' && raw.termsBody.trim()
        ? sanitizeLegacyTrialText(raw.termsBody.trim(), DEFAULT_PRICING_CONFIG.termsBody)
        : DEFAULT_PRICING_CONFIG.termsBody,
    footerNote:
      typeof raw.footerNote === 'string' && raw.footerNote.trim()
        ? raw.footerNote.trim()
        : DEFAULT_PRICING_CONFIG.footerNote,
    plans: mergedPlans,
  };
}

let cachedConfig: PricingWallConfig = mergePricingConfig(null);

export function getPricingConfigSync(): PricingWallConfig {
  return cachedConfig;
}

export async function savePricingConfig(config: PricingWallConfig): Promise<PricingWallConfig> {
  const user = auth.currentUser;
  if (!user) throw new Error('Must be signed in as admin to update pricing config.');
  const token = await user.getIdToken();
  const normalized = mergePricingConfig(config);

  const res = await fetch('/api/admin/update-settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      settingId: 'pricing_config',
      data: normalized,
    }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || 'Failed to save pricing configuration.');
  }

  cachedConfig = normalized;
  return normalized;
}

export async function resetPricingConfig(): Promise<PricingWallConfig> {
  return savePricingConfig(DEFAULT_PRICING_CONFIG);
}

/**
 * Loads public pricing configuration with safe fallback to canonical shared defaults.
 */
export function usePricingConfig() {
  const [config, setConfig] = useState<PricingWallConfig>(() => cachedConfig);
  const [loading, setLoading] = useState(false);

  const fetchRemote = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'system_settings', 'pricing_config'));
      if (snap.exists()) {
        const merged = mergePricingConfig(snap.data() as Partial<PricingWallConfig>);
        cachedConfig = merged;
        setConfig(merged);
      }
    } catch {
      // Fallback safely to canonical shared defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRemote();
  }, [fetchRemote]);

  return {
    config,
    plans: config.plans,
    trialPlan: config.plans.find((p) => p.id === 'trial') || DEFAULT_PRICING_CONFIG.plans[0],
    proPlans: config.plans.filter((p) => p.id !== 'trial'),
    loading,
    saveConfig: savePricingConfig,
    resetConfig: resetPricingConfig,
    refresh: fetchRemote,
  };
}
