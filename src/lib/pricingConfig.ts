import { useState, useEffect, useCallback } from 'react';
import { auth } from '../firebase';
import { ALL_DISPLAY_PLANS, PlanIntervalKey, PlanPricing } from './subscriptionPlans';

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
  wallTitle: 'Unlock Full Access to CrestFlow',
  wallSubtitle:
    'To use client portals, generate automated invoices with direct UPI QR codes, and schedule work deliveries, an active subscription is required.',
  pricingTitle: 'Simple, Transparent Pricing',
  pricingSubtitle:
    'Start with our 100% free 7-day trial, or select an annual or monthly plan for uninterrupted workflow.',
  termsTitle: 'Subscription & Trial Terms',
  termsBody:
    'Enjoy a 7-day free trial with zero payment required. No automatic charge occurs upon trial expiration. Paid plans renew automatically per chosen billing cycle and can be cancelled anytime in your billing settings without losing remaining active days.',
  footerNote: 'Secure checkout powered by Razorpay. 256-bit SSL encrypted.',
  plans: ALL_DISPLAY_PLANS.map((plan) => ({
    ...plan,
    tabLabel: plan.name.replace('Pro ', ''),
    features: [...plan.features],
  })),
};

const STORAGE_KEY = 'crestflow_pricing_config_v1';
const EVENT_NAME = 'crestflow:pricing-config-changed';

/**
 * Safely merges partial remote or cached pricing data with canonical defaults.
 * Preserves all 5 core plan IDs and enforces ₹0 for the lifetime free trial.
 */
export function mergePricingConfig(raw?: Partial<PricingWallConfig> | null): PricingWallConfig {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_PRICING_CONFIG,
      plans: DEFAULT_PRICING_CONFIG.plans.map((p) => ({ ...p, features: [...p.features] })),
    };
  }

  const incomingById = new Map<PlanIntervalKey, Partial<PlanPricing>>();
  if (Array.isArray(raw.plans)) {
    for (const p of raw.plans) {
      if (p && p.id) incomingById.set(p.id, p);
    }
  }

  const mergedPlans: PlanPricing[] = DEFAULT_PRICING_CONFIG.plans.map((defPlan) => {
    const inc = incomingById.get(defPlan.id);
    if (!inc) return { ...defPlan, features: [...defPlan.features] };

    const isTrial = defPlan.id === 'trial';
    const parsedPrice = typeof inc.price === 'number' && !Number.isNaN(inc.price) ? Math.max(0, Math.round(inc.price)) : defPlan.price;
    const parsedMonthlyEq =
      typeof inc.monthlyEquivalent === 'number' && !Number.isNaN(inc.monthlyEquivalent)
        ? Math.max(0, Math.round(inc.monthlyEquivalent))
        : defPlan.monthlyEquivalent;
    const parsedDays =
      typeof inc.durationDays === 'number' && inc.durationDays > 0
        ? Math.round(inc.durationDays)
        : defPlan.durationDays;

    const cleanFeatures = Array.isArray(inc.features)
      ? inc.features.map((f) => String(f ?? '').trim()).filter(Boolean)
      : [...defPlan.features];

    return {
      ...defPlan,
      name: typeof inc.name === 'string' && inc.name.trim() ? inc.name.trim() : defPlan.name,
      tabLabel: typeof inc.tabLabel === 'string' && inc.tabLabel.trim() ? inc.tabLabel.trim() : undefined,
      price: isTrial ? 0 : parsedPrice,
      interval: typeof inc.interval === 'string' && inc.interval.trim() ? inc.interval.trim() : defPlan.interval,
      durationDays: parsedDays,
      periodLabel: typeof inc.periodLabel === 'string' && inc.periodLabel.trim() ? inc.periodLabel.trim() : defPlan.periodLabel,
      monthlyEquivalent: isTrial ? 0 : parsedMonthlyEq,
      savingsBadge: typeof inc.savingsBadge === 'string' ? inc.savingsBadge.trim() || undefined : defPlan.savingsBadge,
      description: typeof inc.description === 'string' ? inc.description.trim() : defPlan.description,
      features: cleanFeatures.length > 0 ? cleanFeatures : [...defPlan.features],
      disclosureText: typeof inc.disclosureText === 'string' ? inc.disclosureText.trim() || undefined : undefined,
      ctaLabel: typeof inc.ctaLabel === 'string' ? inc.ctaLabel.trim() || undefined : undefined,
      extraInfo: typeof inc.extraInfo === 'string' ? inc.extraInfo.trim() || undefined : undefined,
      isTrial,
    };
  });

  return {
    wallTitle: typeof raw.wallTitle === 'string' && raw.wallTitle.trim() ? raw.wallTitle.trim() : DEFAULT_PRICING_CONFIG.wallTitle,
    wallSubtitle: typeof raw.wallSubtitle === 'string' ? raw.wallSubtitle.trim() : DEFAULT_PRICING_CONFIG.wallSubtitle,
    pricingTitle: typeof raw.pricingTitle === 'string' && raw.pricingTitle.trim() ? raw.pricingTitle.trim() : DEFAULT_PRICING_CONFIG.pricingTitle,
    pricingSubtitle: typeof raw.pricingSubtitle === 'string' ? raw.pricingSubtitle.trim() : DEFAULT_PRICING_CONFIG.pricingSubtitle,
    termsTitle: typeof raw.termsTitle === 'string' && raw.termsTitle.trim() ? raw.termsTitle.trim() : DEFAULT_PRICING_CONFIG.termsTitle,
    termsBody: typeof raw.termsBody === 'string' ? raw.termsBody.trim() : DEFAULT_PRICING_CONFIG.termsBody,
    footerNote: typeof raw.footerNote === 'string' ? raw.footerNote.trim() : DEFAULT_PRICING_CONFIG.footerNote,
    plans: mergedPlans,
  };
}

/**
 * Returns the cached or default pricing configuration synchronously.
 */
export function getPricingConfigSync(): PricingWallConfig {
  try {
    if (typeof window === 'undefined') return mergePricingConfig(null);
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return mergePricingConfig(null);
    return mergePricingConfig(JSON.parse(raw));
  } catch {
    return mergePricingConfig(null);
  }
}

/**
 * Saves updated pricing wall configuration via trusted Admin Worker API and updates local cache.
 */
export async function savePricingConfig(config: PricingWallConfig): Promise<PricingWallConfig> {
  const normalized = mergePricingConfig(config);

  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error('Admin authentication required to save pricing configuration.');
  }

  const res = await fetch('/api/admin/settings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      settingId: 'pricing_config',
      data: normalized,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error || `Failed to save pricing config (${res.status})`);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { config: normalized } }));
  }

  return normalized;
}

/**
 * Resets pricing wall configuration back to factory defaults.
 */
export async function resetPricingConfig(): Promise<PricingWallConfig> {
  return savePricingConfig(DEFAULT_PRICING_CONFIG);
}

/**
 * React hook returning live, admin-editable pricing plans and wall copy.
 */
export function usePricingConfig() {
  const [config, setConfig] = useState<PricingWallConfig>(() => getPricingConfigSync());
  const [loading, setLoading] = useState<boolean>(true);

  const fetchRemote = useCallback(async () => {
    try {
      const res = await fetch('/api/pricing-config', { cache: 'no-store' });
      if (res.ok) {
        const payload = (await res.json()) as { config?: Partial<PricingWallConfig> | null };
        if (payload?.config) {
          const merged = mergePricingConfig(payload.config);
          setConfig(merged);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          } catch {}
        }
      }
    } catch {
      // Fallback gracefully to cached/default config when offline or during tests
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRemote();

    const handleLocal = (e: any) => {
      if (e?.detail?.config) {
        setConfig(mergePricingConfig(e.detail.config));
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setConfig(mergePricingConfig(JSON.parse(e.newValue)));
        } catch {}
      }
    };

    window.addEventListener(EVENT_NAME, handleLocal);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, handleLocal);
      window.removeEventListener('storage', handleStorage);
    };
  }, [fetchRemote]);

  const trialPlan = config.plans.find((p) => p.id === 'trial') || config.plans[0];
  const proPlans = config.plans.filter((p) => p.id !== 'trial');

  return {
    config,
    plans: config.plans,
    trialPlan,
    proPlans,
    loading,
    saveConfig: savePricingConfig,
    resetConfig: resetPricingConfig,
    refresh: fetchRemote,
  };
}
