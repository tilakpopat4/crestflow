import { UserProfile } from '../types';
import { SITE_URL } from './siteConfig';

/**
 * List of reserved system keywords that cannot be used as user handles.
 */
export const RESERVED_HANDLES = new Set([
  'admin',
  'api',
  'auth',
  'billing',
  'clients',
  'contact',
  'dashboard',
  'feedback',
  'invoice',
  'invoices',
  'login',
  'not-found',
  'onboarding',
  'plans',
  'portal',
  'pricing',
  'privacy',
  'profile',
  'publicprofile',
  'public-profile',
  'refund',
  'refund-policy',
  'reviews',
  'settings',
  'sitemap',
  'subscription',
  'terms',
  'work',
  'work-log',
  '404',
]);

/**
 * Cleans and formats an input string into a valid URL username slug.
 */
export function cleanUsername(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 30);
}

/**
 * Validates whether a given username handle is legal and available for use.
 */
export function isValidUsername(handle: string): boolean {
  const clean = cleanUsername(handle);
  if (clean.length < 3 || clean.length > 30) return false;
  if (RESERVED_HANDLES.has(clean)) return false;
  return /^[a-z0-9][a-z0-9_-]*[a-z0-9]$|^[a-z0-9]{3,}$/.test(clean);
}

/**
 * Checks whether the profile has an explicitly configured, valid username.
 */
export function hasConfiguredUsername(profile?: Partial<UserProfile> | null): boolean {
  return Boolean(profile?.username && isValidUsername(profile.username));
}

/**
 * Resolves the professional username handle for a freelancer.
 * Prefers explicitly configured profile.username, then email prefix, then name, then uid.
 */
export function getUserHandle(
  profile?: Partial<UserProfile> | null,
  user?: { email?: string | null; displayName?: string | null; uid?: string } | null
): string {
  if (profile?.username && isValidUsername(profile.username)) {
    return cleanUsername(profile.username);
  }

  const email = profile?.email || user?.email;
  if (email && email.includes('@')) {
    const prefix = cleanUsername(email.split('@')[0]);
    if (prefix && prefix.length >= 3 && !RESERVED_HANDLES.has(prefix)) {
      return prefix;
    }
  }

  const name = profile?.name || user?.displayName;
  if (name) {
    const slug = cleanUsername(name);
    if (slug && slug.length >= 3 && !RESERVED_HANDLES.has(slug)) {
      return slug;
    }
  }

  return user?.uid || profile?.id || 'creator';
}

/**
 * Returns the canonical public client onboarding URL for a given handle.
 * Format: https://<domain>/<username>/onboarding
 */
export function getOnboardingUrl(handle: string, customOrigin?: string): string {
  const origin = (customOrigin || SITE_URL).replace(/\/+$/, '');
  const clean = cleanUsername(handle) || handle;
  return `${origin}/${encodeURIComponent(clean)}/onboarding`;
}

/**
 * Returns the canonical public freelancer profile showcase URL for a given handle.
 * Format: https://<domain>/<username>/publicprofile
 */
export function getPublicProfileUrl(handle: string, customOrigin?: string): string {
  const origin = (customOrigin || SITE_URL).replace(/\/+$/, '');
  const clean = cleanUsername(handle) || handle;
  return `${origin}/${encodeURIComponent(clean)}/publicprofile`;
}

/**
 * Returns the canonical public client portal URL for a given handle.
 * Format: https://<domain>/portal?freelancerId=<username>
 */
export function getPortalUrl(handle?: string, customOrigin?: string): string {
  const origin = (customOrigin || SITE_URL).replace(/\/+$/, '');
  if (!handle) return `${origin}/portal`;
  const clean = cleanUsername(handle) || handle;
  return `${origin}/portal?freelancerId=${encodeURIComponent(clean)}`;
}
