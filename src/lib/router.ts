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
  | 'pricing'
  | 'billing'
  | 'admin'
  | 'privacy'
  | 'terms'
  | 'contact'
  | 'refund'
  | 'not_found';

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
  pricing: '/pricing',
  billing: '/billing',
  admin: '/admin',
  privacy: '/privacy',
  terms: '/terms',
  contact: '/contact',
  refund: '/refund',
  not_found: '/404',
};

/**
 * Resolves the canonical AppRoute from the current pathname and search parameters.
 */
export function resolveRoute(pathname: string, search: string = ''): RouteMatch {
  const rawPath = pathname.replace(/\/+$/, '') || '/';
  const cleanPath = rawPath.toLowerCase();
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
    const fid = searchParams.get('freelancerId')!;
    return { route: 'dashboard', path: cleanPath, params: { ...params, freelancerId: fid, username: fid }, isSpecialMode: 'freelancer_profile' };
  }
  const isClientPortalHash = typeof window !== 'undefined' && window.location?.hash ? window.location.hash.includes('portal') : false;
  if (searchParams.get('portal') === 'client' || isClientPortalHash || cleanPath === '/portal') {
    return { route: 'dashboard', path: '/portal', params, isSpecialMode: 'client_portal' };
  }

  // 1. Professional Onboarding URL: /:username/onboarding
  const userOnboardingMatch = rawPath.match(/^\/([a-zA-Z0-9_-]+)\/onboarding\/?$/i);
  if (userOnboardingMatch) {
    const targetUsername = userOnboardingMatch[1];
    return {
      route: 'dashboard',
      path: `/${targetUsername}/onboarding`,
      params: { ...params, freelancerId: targetUsername, username: targetUsername, mode: 'onboarding' },
      isSpecialMode: 'freelancer_profile',
    };
  }

  // 2. Professional Public Profile URL: /:username/publicprofile or /:username/public-profile
  const userPublicProfileMatch = rawPath.match(/^\/([a-zA-Z0-9_-]+)\/(?:publicprofile|public-profile)\/?$/i);
  if (userPublicProfileMatch) {
    const targetUsername = userPublicProfileMatch[1];
    return {
      route: 'dashboard',
      path: `/${targetUsername}/publicprofile`,
      params: { ...params, freelancerId: targetUsername, username: targetUsername, mode: 'profile' },
      isSpecialMode: 'freelancer_profile',
    };
  }

  // 3. Legacy Onboarding route: /onboarding/:freelancerId or /client-onboarding/:freelancerId
  const legacyOnboardingMatch = rawPath.match(/^\/(?:onboarding|client-onboarding)\/([a-zA-Z0-9_-]+)\/?$/i);
  if (legacyOnboardingMatch) {
    const targetFreelancerId = legacyOnboardingMatch[1];
    return {
      route: 'dashboard',
      path: `/onboarding/${targetFreelancerId}`,
      params: { ...params, freelancerId: targetFreelancerId, username: targetFreelancerId, mode: 'onboarding' },
      isSpecialMode: 'freelancer_profile',
    };
  }

  // 4. Legacy Public Profile route: /publicprofile/:freelancerId or /public-profile/:freelancerId
  const legacyProfileMatch = rawPath.match(/^\/(?:publicprofile|public-profile)\/([a-zA-Z0-9_-]+)\/?$/i);
  if (legacyProfileMatch) {
    const targetFreelancerId = legacyProfileMatch[1];
    return {
      route: 'dashboard',
      path: `/publicprofile/${targetFreelancerId}`,
      params: { ...params, freelancerId: targetFreelancerId, username: targetFreelancerId, mode: 'profile' },
      isSpecialMode: 'freelancer_profile',
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

    case '/pricing':
    case '/plans':
      return { route: 'pricing', path: '/pricing', params };

    case '/billing':
    case '/subscription':
      return { route: 'billing', path: '/billing', params };

    case '/admin':
    case '/sitemap':
      return { route: 'admin', path: '/admin', params };

    case '/privacy':
      return { route: 'privacy', path: '/privacy', params };

    case '/terms':
      return { route: 'terms', path: '/terms', params };

    case '/contact':
      return { route: 'contact', path: '/contact', params };

    case '/login':
    case '/signin':
      return { route: 'dashboard', path: '/login', params, isSpecialMode: 'auth' };

    case '/signup':
    case '/register':
      return { route: 'dashboard', path: '/signup', params, isSpecialMode: 'auth' };

    case '/refund':
    case '/refund-policy':
    case '/cancellation':
      return { route: 'refund', path: '/refund', params };

    case '/404':
    case '/not-found':
      return { route: 'not_found', path: '/404', params };

    default:
      // Fallback: check hash routes for backwards compatibility
      const hash = (typeof window !== 'undefined' ? window.location.hash : '').toLowerCase();
      if (hash.includes('admin') || hash.includes('sitemap')) return { route: 'admin', path: '/admin', params };
      if (hash.includes('pricing') || hash.includes('plans')) return { route: 'pricing', path: '/pricing', params };
      if (hash.includes('billing') || hash.includes('subscription')) return { route: 'billing', path: '/billing', params };
      if (hash.includes('privacy')) return { route: 'privacy', path: '/privacy', params };
      if (hash.includes('terms')) return { route: 'terms', path: '/terms', params };
      if (hash.includes('contact')) return { route: 'contact', path: '/contact', params };
      if (hash.includes('refund')) return { route: 'refund', path: '/refund', params };
      if (hash.includes('profile') || hash.includes('settings')) return { route: 'profile', path: '/profile', params };
      if (hash.includes('reviews')) return { route: 'reviews', path: '/reviews', params };
      if (hash.includes('work')) return { route: 'work', path: '/work', params };
      if (hash.includes('clients')) return { route: 'clients', path: '/clients', params };
      if (hash.includes('invoices') || hash.includes('invoice')) return { route: 'invoices', path: '/invoices', params };
      if (hash.includes('onboarding')) return { route: 'onboarding', path: '/onboarding', params };
      if (hash.includes('dashboard')) return { route: 'dashboard', path: '/dashboard', params };

      return { route: 'not_found', path: cleanPath, params };
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
