import { useState, useEffect, useCallback } from 'react';
import { AppRoute, RouteMatch, resolveRoute, getRoutePath } from '../lib/router';

export function useAppRouter() {
  const [routeMatch, setRouteMatch] = useState<RouteMatch>(() => {
    if (typeof window === 'undefined') {
      return { route: 'dashboard', path: '/dashboard', params: {} };
    }
    return resolveRoute(window.location.pathname, window.location.search);
  });

  // Keep state in sync with browser navigation (back/forward, direct URL changes)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleLocationChange = () => {
      const match = resolveRoute(window.location.pathname, window.location.search);
      setRouteMatch(match);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigate = useCallback((
    target: AppRoute | string,
    queryParams?: Record<string, string>,
    replace: boolean = false
  ) => {
    if (typeof window === 'undefined') return;

    let targetPath: string;
    if (target.startsWith('/')) {
      targetPath = target;
      if (queryParams && Object.keys(queryParams).length > 0) {
        const [base, existingSearch] = target.split('?');
        const sp = new URLSearchParams(existingSearch || '');
        Object.entries(queryParams).forEach(([k, v]) => sp.set(k, v));
        targetPath = `${base}?${sp.toString()}`;
      }
    } else {
      targetPath = getRoutePath(target as AppRoute, queryParams);
    }

    if (replace) {
      window.history.replaceState({}, '', targetPath);
    } else {
      window.history.pushState({}, '', targetPath);
    }

    const nextMatch = resolveRoute(window.location.pathname, window.location.search);
    setRouteMatch(nextMatch);
  }, []);

  return {
    currentRoute: routeMatch.route,
    currentPath: routeMatch.path,
    params: routeMatch.params,
    isSpecialMode: routeMatch.isSpecialMode,
    navigate
  };
}
