import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolveRoute, getRoutePath } from '../src/lib/router';

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
    assert.strictEqual(resolveRoute('/privacy').route, 'privacy');
    assert.strictEqual(resolveRoute('/terms').route, 'terms');
    assert.strictEqual(resolveRoute('/contact').route, 'contact');
    assert.strictEqual(resolveRoute('/refund').route, 'refund');
  });

  it('resolves legacy path aliases to canonical routes', () => {
    assert.strictEqual(resolveRoute('/settings').route, 'profile');
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

  it('identifies special mode routes accurately', () => {
    const freelancerMatch = resolveRoute('/', '?freelancerId=uid_fl_1');
    assert.strictEqual(freelancerMatch.isSpecialMode, 'freelancer_profile');
    assert.strictEqual(freelancerMatch.params.freelancerId, 'uid_fl_1');

    const pathFreelancerMatch = resolveRoute('/onboarding/fl_abc123');
    assert.strictEqual(pathFreelancerMatch.isSpecialMode, 'freelancer_profile');
    assert.strictEqual(pathFreelancerMatch.params.freelancerId, 'fl_abc123');

    // Mixed-case Firebase UID must preserve exact casing
    const mixedCaseUidMatch = resolveRoute('/onboarding/aB12CdEfGhIj34Kl');
    assert.strictEqual(mixedCaseUidMatch.isSpecialMode, 'freelancer_profile');
    assert.strictEqual(mixedCaseUidMatch.params.freelancerId, 'aB12CdEfGhIj34Kl');
    assert.strictEqual(mixedCaseUidMatch.path, '/onboarding/aB12CdEfGhIj34Kl');

    const clientPortalMatch = resolveRoute('/', '?portal=client');
    assert.strictEqual(clientPortalMatch.isSpecialMode, 'client_portal');

    const feedbackMatch = resolveRoute('/', '?feedback=true');
    assert.strictEqual(feedbackMatch.isSpecialMode, 'feedback');
  });

  it('generates canonical route paths with optional query parameters', () => {
    assert.strictEqual(getRoutePath('profile'), '/profile');
    assert.strictEqual(getRoutePath('clients', { id: 'cl_1' }), '/clients?id=cl_1');
    assert.strictEqual(getRoutePath('invoices'), '/invoices');
  });
});
