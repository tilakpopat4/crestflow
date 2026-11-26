export type AccessAnalyticsEvent =
  | 'explore_viewed'
  | 'trial_started'
  | 'upgrade_sheet_opened'
  | 'checkout_started'
  | 'payment_succeeded'
  | 'trial_expired'
  | 'export_clicked';

export interface AnalyticsPayload {
  action?: string;
  plan?: string;
  mode?: string;
  format?: string;
  source?: string;
  [key: string]: unknown;
}

const SESSION_LOG_KEY = 'crestflow_analytics_events';

/**
 * Emits structured product analytics events through a single shared helper.
 * Supports optional gtag/analytics endpoints without throwing in offline or test runs.
 */
export function trackAccessEvent(event: AccessAnalyticsEvent, payload: AnalyticsPayload = {}): void {
  const entry = {
    event,
    payload,
    timestamp: Date.now(),
  };

  try {
    if (typeof window !== 'undefined') {
      const w = window as unknown as {
        gtag?: (...args: unknown[]) => void;
        dataLayer?: unknown[];
        __crestflowAnalytics?: Array<typeof entry>;
      };

      w.__crestflowAnalytics = w.__crestflowAnalytics || [];
      w.__crestflowAnalytics.push(entry);
      if (w.__crestflowAnalytics.length > 100) {
        w.__crestflowAnalytics.shift();
      }

      if (typeof w.gtag === 'function') {
        w.gtag('event', event, payload);
      }

      try {
        const raw = window.sessionStorage.getItem(SESSION_LOG_KEY);
        const list = raw ? (JSON.parse(raw) as Array<typeof entry>) : [];
        list.push(entry);
        if (list.length > 50) list.shift();
        window.sessionStorage.setItem(SESSION_LOG_KEY, JSON.stringify(list));
      } catch {
        // Ignore storage quota or private-mode restrictions
      }
    }
  } catch {
    // Analytics must never interrupt product flows
  }
}
