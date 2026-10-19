/**
 * Canonical route definitions and path resolution for CrestFlow multi-page architecture.
 */

export type AppRoute =
  | 'dashboard'
  | 'clients'
  | 'work'
  | 'invoices'
  | 'reviews'
  | 'onboarding'
  | 'profile'
  | 'admin'
  | 'privacy'
  | 'terms'
  | 'contact';

export interface RouteMatch {
  route: AppRoute;
  path: string;
  params: Record<string, string>;
  isSpecialMode?: 'client_portal' | 'freelancer_profile' | 'feedback';
}

export const ROUTE_PATHS: Record<AppRoute, string> = {
  dashboard: '/dashboard',
  clients: '/clients',
  work: '/work',
  invoices: '/invoices',
  reviews: '/reviews',
  onboarding: '/onboarding',
  profile: '/profile',
  admin: '/admin',
  privacy: '/privacy',
  terms: '/terms',
  contact: '/contact',
};

/**
 * Resolves the canonical AppRoute from the current pathname and search parameters.
 */
export function resolveRoute(pathname: string, search: string = ''): RouteMatch {
  const cleanPath = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const searchParams = new URLSearchParams(search);
  const params: Record<string, string> = {};
  searchParams.forEach((val, key) => {
    params[key] = val;
  });

  // Check special URL modes first
  if (searchParams.get('feedback') === 'true') {
    return { route: 'dashboard', path: cleanPath, params, isSpecialMode: 'feedback' };
  }
  if (searchParams.get('freelancerId')) {
    return { route: 'dashboard', path: cleanPath, params, isSpecialMode: 'freelancer_profile' };
  }
  const isClientPortalHash = typeof window !== 'undefined' && window.location?.hash ? window.location.hash.includes('portal') : false;
  if (searchParams.get('portal') === 'client' || isClientPortalHash) {
    return { route: 'dashboard', path: cleanPath, params, isSpecialMode: 'client_portal' };
  }

  // Public Onboarding route with dynamic freelancer UID: /onboarding/:freelancerId
  const publicOnboardingMatch = cleanPath.match(/^\/onboarding\/([a-zA-Z0-9_-]+)$/);
  if (publicOnboardingMatch) {
    const targetFreelancerId = publicOnboardingMatch[1];
    return {
      route: 'dashboard',
      path: cleanPath,
      params: { ...params, freelancerId: targetFreelancerId },
      isSpecialMode: 'freelancer_profile'
    };
  }

  // Exact path or alias matching
  switch (cleanPath) {
    case '':
    case '/':
      return { route: 'dashboard', path: '/dashboard', params };

    case '/dashboard':
      return { route: 'dashboard', path: '/dashboard', params };

    case '/clients':
      return { route: 'clients', path: '/clients', params };

    case '/work':
    case '/work-log':
      return { route: 'work', path: '/work', params };

    case '/invoices':
    case '/invoice':
      return { route: 'invoices', path: '/invoices', params };

    case '/reviews':
      return { route: 'reviews', path: '/reviews', params };

    case '/onboarding':
    case '/client-onboarding':
      return { route: 'onboarding', path: '/onboarding', params };

    case '/profile':
    case '/settings':
      return { route: 'profile', path: '/profile', params };

    case '/admin':
      return { route: 'admin', path: '/admin', params };

    case '/privacy':
      return { route: 'privacy', path: '/privacy', params };

    case '/terms':
      return { route: 'terms', path: '/terms', params };

    case '/contact':
      return { route: 'contact', path: '/contact', params };

    default:
      // Fallback: check hash routes for backwards compatibility
      const hash = (typeof window !== 'undefined' ? window.location.hash : '').toLowerCase();
      if (hash.includes('admin')) return { route: 'admin', path: '/admin', params };
      if (hash.includes('privacy')) return { route: 'privacy', path: '/privacy', params };
      if (hash.includes('terms')) return { route: 'terms', path: '/terms', params };
      if (hash.includes('contact')) return { route: 'contact', path: '/contact', params };
      if (hash.includes('profile') || hash.includes('settings')) return { route: 'profile', path: '/profile', params };

      return { route: 'dashboard', path: '/dashboard', params };
  }
}

/**
 * Returns the URL path string for an AppRoute.
 */
export function getRoutePath(route: AppRoute, queryParams?: Record<string, string>): string {
  const basePath = ROUTE_PATHS[route] || '/dashboard';
  if (!queryParams || Object.keys(queryParams).length === 0) {
    return basePath;
  }
  const search = new URLSearchParams(queryParams).toString();
  return `${basePath}?${search}`;
}
