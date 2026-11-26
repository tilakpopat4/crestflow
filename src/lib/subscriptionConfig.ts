import { useState } from 'react';

export interface SubscriptionFeatureConfig {
  isEnabled: boolean;
  isLoading: boolean;
  setEnabled: (val: boolean) => Promise<void>;
}

/**
 * Entitlement enforcement is permanently active as part of CrestFlow's server-authoritative
 * access control architecture. Retained for Admin display compatibility without client bypasses.
 */
export function getSubscriptionFeatureEnabledSync(): boolean {
  return true;
}

export async function setSubscriptionFeatureEnabled(_enabled: boolean): Promise<void> {
  // Server-authoritative entitlements/{uid} cannot be disabled via client toggles.
}

export function useSubscriptionConfig(): SubscriptionFeatureConfig {
  const [isLoading] = useState(false);

  return {
    isEnabled: true,
    isLoading,
    setEnabled: setSubscriptionFeatureEnabled,
  };
}
