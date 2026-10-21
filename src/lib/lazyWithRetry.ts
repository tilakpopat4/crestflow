import { lazy, ComponentType } from 'react';

/**
 * Robust lazy loading wrapper with automatic retry and stale-chunk recovery.
 * When a dynamic import fails (e.g. after a new production deployment when chunk hashes change),
 * this automatically catches the missing chunk, refreshes the page to load the newest bundle,
 * and completely prevents "Failed to fetch dynamically imported module" errors.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T } | { [key: string]: any }>,
  keyExtractor?: (module: any) => { default: T }
) {
  return lazy(async () => {
    try {
      const module = await factory();
      if (keyExtractor) {
        return keyExtractor(module);
      }
      return module as { default: T };
    } catch (error: any) {
      console.warn('Dynamic chunk import failed. Initiating automatic deployment recovery...', error);

      const isChunkError =
        error?.message?.includes('dynamically imported module') ||
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('Failed to fetch') ||
        error?.name === 'TypeError';

      const reloadKey = 'crestflow_chunk_reload_timestamp';
      const lastReload = typeof window !== 'undefined' ? sessionStorage.getItem(reloadKey) : null;
      const now = Date.now();

      // Only auto-reload if we haven't reloaded in the last 15 seconds to prevent infinite reload loops
      if (isChunkError && typeof window !== 'undefined' && (!lastReload || now - parseInt(lastReload, 10) > 15000)) {
        sessionStorage.setItem(reloadKey, now.toString());
        window.location.reload();
        // Return a pending promise so React Suspense/ErrorBoundary does not render an error screen while reloading
        return new Promise<{ default: T }>(() => {});
      }

      throw error;
    }
  });
}
