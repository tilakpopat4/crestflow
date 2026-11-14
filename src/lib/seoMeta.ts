/**
 * Manages document head metadata dynamically across SPA routes.
 */

export interface PageMeta {
  title: string;
  description: string;
  canonicalPath: string;
}

export const ROUTE_METADATA: Record<string, PageMeta> = {
  dashboard: {
    title: 'CrestFlow | UPI invoicing and client management for freelancers',
    description: 'Manage clients, track deliverables, automate invoice delivery, and receive zero-fee direct UPI payments. Built for freelancers and video editors.',
    canonicalPath: '/',
  },
  pricing: {
    title: 'Pricing Plans | CrestFlow',
    description: 'Transparent, zero-commission pricing for freelancers. Free starter limits and CrestFlow Pro memberships with automated invoicing.',
    canonicalPath: '/pricing',
  },
  terms: {
    title: 'Terms of Service | CrestFlow',
    description: 'Terms of service, usage guidelines, and subscription policies for CrestFlow.',
    canonicalPath: '/terms',
  },
  privacy: {
    title: 'Privacy Policy | CrestFlow',
    description: 'Privacy policy, data protection, and transparency details for CrestFlow users and clients.',
    canonicalPath: '/privacy',
  },
  refund: {
    title: 'Cancellation & Refund Policy | CrestFlow',
    description: 'Cancellation and refund terms for CrestFlow Pro subscriptions and services.',
    canonicalPath: '/refund',
  },
  contact: {
    title: 'Contact & Support | CrestFlow',
    description: 'Get in touch with the CrestFlow support and grievance team.',
    canonicalPath: '/contact',
  },
  login: {
    title: 'Sign In | CrestFlow',
    description: 'Sign in to access your CrestFlow dashboard, automated invoicing, and client portals.',
    canonicalPath: '/login',
  },
  signup: {
    title: 'Sign Up | CrestFlow',
    description: 'Create your CrestFlow account to manage clients and collect direct UPI payments with zero fees.',
    canonicalPath: '/signup',
  },
};

export function updatePageMeta(route: string): void {
  if (typeof document === 'undefined') return;
  const meta = ROUTE_METADATA[route] || ROUTE_METADATA.dashboard;

  document.title = meta.title;

  let descEl = document.querySelector('meta[name="description"]');
  if (!descEl) {
    descEl = document.createElement('meta');
    descEl.setAttribute('name', 'description');
    document.head.appendChild(descEl);
  }
  descEl.setAttribute('content', meta.description);

  let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (canonicalEl) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://crestflow.nonum.online';
    canonicalEl.href = `${origin}${meta.canonicalPath}`;
  }
}
