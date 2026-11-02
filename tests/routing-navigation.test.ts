import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolveRoute, getRoutePath } from '../src/lib/router';
import {
  cleanUsername,
  isValidUsername,
  getUserHandle,
  getOnboardingUrl,
  getPublicProfileUrl,
} from '../src/lib/userHandle';

describe('CrestFlow Multi-Page Routing Architecture', () => {
  it('resolves root "/" to dashboard', () => {
    const match = resolveRoute('/');
    assert.strictEqual(match.route, 'dashboard');
    assert.strictEqual(match.path, '/dashboard');
  });

  it('resolves canonical workspace paths', () => {
    assert.strictEqual(resolveRoute('/dashboard').route, 'dashboard');
    assert.strictEqual(resolveRoute('/clients').route, 'clients');
    assert.strictEqual(resolveRoute('/work').route, 'work');
    assert.strictEqual(resolveRoute('/invoices').route, 'invoices');
    assert.strictEqual(resolveRoute('/reviews').route, 'reviews');
    assert.strictEqual(resolveRoute('/onboarding').route, 'onboarding');
    assert.strictEqual(resolveRoute('/profile').route, 'profile');
    assert.strictEqual(resolveRoute('/admin').route, 'admin');
    assert.strictEqual(resolveRoute('/pricing').route, 'pricing');
    assert.strictEqual(resolveRoute('/billing').route, 'billing');
    assert.strictEqual(resolveRoute('/privacy').route, 'privacy');
    assert.strictEqual(resolveRoute('/terms').route, 'terms');
    assert.strictEqual(resolveRoute('/contact').route, 'contact');
    assert.strictEqual(resolveRoute('/refund').route, 'refund');
  });

  it('resolves legacy path aliases to canonical routes', () => {
    assert.strictEqual(resolveRoute('/settings').route, 'profile');
    assert.strictEqual(resolveRoute('/plans').route, 'pricing');
    assert.strictEqual(resolveRoute('/subscription').route, 'billing');
    assert.strictEqual(resolveRoute('/work-log').route, 'work');
    assert.strictEqual(resolveRoute('/invoice').route, 'invoices');
    assert.strictEqual(resolveRoute('/client-onboarding').route, 'onboarding');
    assert.strictEqual(resolveRoute('/refund-policy').route, 'refund');
  });

  it('correctly parses search params into route params', () => {
    const match = resolveRoute('/clients', '?id=client_987&filter=active');
    assert.strictEqual(match.route, 'clients');
    assert.strictEqual(match.params.id, 'client_987');
    assert.strictEqual(match.params.filter, 'active');
  });

  it('resolves professional /:username/onboarding routes without random IDs', () => {
    const match = resolveRoute('/tilakpopat2007/onboarding');
    assert.strictEqual(match.route, 'dashboard');
    assert.strictEqual(match.path, '/tilakpopat2007/onboarding');
    assert.strictEqual(match.isSpecialMode, 'freelancer_profile');
    assert.strictEqual(match.params.username, 'tilakpopat2007');
    assert.strictEqual(match.params.freelancerId, 'tilakpopat2007');
    assert.strictEqual(match.params.mode, 'onboarding');
  });

  it('resolves professional /:username/publicprofile routes without random IDs', () => {
    const match = resolveRoute('/tilakpopat2007/publicprofile');
    assert.strictEqual(match.route, 'dashboard');
    assert.strictEqual(match.path, '/tilakpopat2007/publicprofile');
    assert.strictEqual(match.isSpecialMode, 'freelancer_profile');
    assert.strictEqual(match.params.username, 'tilakpopat2007');
    assert.strictEqual(match.params.freelancerId, 'tilakpopat2007');
    assert.strictEqual(match.params.mode, 'profile');

    const hyphenMatch = resolveRoute('/maya-editor/public-profile');
    assert.strictEqual(hyphenMatch.params.username, 'maya-editor');
    assert.strictEqual(hyphenMatch.params.mode, 'profile');
  });

  it('identifies special mode routes and legacy formats accurately', () => {
    const freelancerMatch = resolveRoute('/', '?freelancerId=uid_fl_1');
    assert.strictEqual(freelancerMatch.isSpecialMode, 'freelancer_profile');
    assert.strictEqual(freelancerMatch.params.freelancerId, 'uid_fl_1');

    const pathFreelancerMatch = resolveRoute('/onboarding/fl_abc123');
    assert.strictEqual(pathFreelancerMatch.isSpecialMode, 'freelancer_profile');
    assert.strictEqual(pathFreelancerMatch.params.freelancerId, 'fl_abc123');

    // Mixed-case Firebase UID preserves exact casing
    const mixedCaseUidMatch = resolveRoute('/onboarding/aB12CdEfGhIj34Kl');
    assert.strictEqual(mixedCaseUidMatch.isSpecialMode, 'freelancer_profile');
    assert.strictEqual(mixedCaseUidMatch.params.freelancerId, 'aB12CdEfGhIj34Kl');

    const clientPortalMatch = resolveRoute('/', '?portal=client');
    assert.strictEqual(clientPortalMatch.isSpecialMode, 'client_portal');

    const dedicatedPortalMatch = resolveRoute('/portal');
    assert.strictEqual(dedicatedPortalMatch.isSpecialMode, 'client_portal');

    const feedbackMatch = resolveRoute('/', '?feedback=true');
    assert.strictEqual(feedbackMatch.isSpecialMode, 'feedback');
  });

  it('derives clean professional handles and URL paths', () => {
    // 1. From explicit username
    assert.strictEqual(getUserHandle({ username: 'tilakpopat' }, null), 'tilakpopat');

    // 2. From email prefix when username is unset
    assert.strictEqual(getUserHandle({ email: 'tilakpopat2007@gmail.com' }, null), 'tilakpopat2007');

    // 3. From user displayName when no email
    assert.strictEqual(getUserHandle({ name: 'Tilak Popat' }, null), 'tilak-popat');

    // 4. URL builders
    assert.strictEqual(
      getOnboardingUrl('tilakpopat2007', 'https://crestflow.tilakpopat2007.workers.dev'),
      'https://crestflow.tilakpopat2007.workers.dev/tilakpopat2007/onboarding'
    );
    assert.strictEqual(
      getPublicProfileUrl('tilakpopat2007', 'https://crestflow.tilakpopat2007.workers.dev'),
      'https://crestflow.tilakpopat2007.workers.dev/tilakpopat2007/publicprofile'
    );

    // 5. Validation and cleaning
    assert.strictEqual(cleanUsername('Tilak Popat #1!'), 'tilak-popat-1');
    assert.strictEqual(isValidUsername('tilakpopat2007'), true);
    assert.strictEqual(isValidUsername('admin'), false); // Reserved
    assert.strictEqual(isValidUsername('ab'), false); // Too short
  });

  it('generates canonical route paths with optional query parameters', () => {
    assert.strictEqual(getRoutePath('profile'), '/profile');
    assert.strictEqual(getRoutePath('clients', { id: 'cl_1' }), '/clients?id=cl_1');
    assert.strictEqual(getRoutePath('invoices'), '/invoices');
    assert.strictEqual(getRoutePath('not_found'), '/404');
  });

  it('resolves unknown paths outside existing sitemaps to "not_found"', () => {
    assert.strictEqual(resolveRoute('/unknown-route').route, 'not_found');
    assert.strictEqual(resolveRoute('/some/nested/invalid/path').route, 'not_found');
    assert.strictEqual(resolveRoute('/foobar').route, 'not_found');
    assert.strictEqual(resolveRoute('/404').route, 'not_found');
    assert.strictEqual(resolveRoute('/not-found').route, 'not_found');
  });
});
