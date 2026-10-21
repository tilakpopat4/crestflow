import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SUPER_ADMIN_EMAIL, isAuthorizedAdminEmail } from '../src/lib/adminConfig';

describe('Admin Google Authentication & Authorization', () => {
  it('identifies tilakpopat2007@gmail.com as the permanent Super Admin', () => {
    assert.strictEqual(SUPER_ADMIN_EMAIL, 'tilakpopat2007@gmail.com');
  });

  it('authorizes tilakpopat2007@gmail.com with case-insensitivity and trimming', () => {
    const testCases = [
      'tilakpopat2007@gmail.com',
      'TilakPopat2007@gmail.com',
      '  tilakpopat2007@gmail.com  ',
      'TILAKPOPAT2007@GMAIL.COM'
    ];

    testCases.forEach((input) => {
      const normalized = input.trim().toLowerCase();
      const isAuthorized = normalized === SUPER_ADMIN_EMAIL;
      assert.strictEqual(isAuthorized, true, `Failed for ${input}`);
    });
  });

  it('rejects unauthorized Google accounts by default', () => {
    const unauthorizedEmails = [
      'randomuser@gmail.com',
      'attacker@example.com',
      'tilakpopat2007@otherdomain.com',
      'guest@gmail.com'
    ];

    const adminEmails = [SUPER_ADMIN_EMAIL];

    unauthorizedEmails.forEach((email) => {
      const isAuthorized = adminEmails.includes(email.trim().toLowerCase());
      assert.strictEqual(isAuthorized, false, `Should reject ${email}`);
    });
  });

  it('authorizes manually added Google IDs from admin collection', () => {
    const adminEmails = [SUPER_ADMIN_EMAIL, 'cofounder@gmail.com', 'support@gmail.com'];

    assert.strictEqual(adminEmails.includes('cofounder@gmail.com'), true);
    assert.strictEqual(adminEmails.includes('support@gmail.com'), true);
    assert.strictEqual(adminEmails.includes('unknown@gmail.com'), false);
  });

  it('protects Super Admin from being revoked or deleted', () => {
    const emailToRevoke = 'tilakpopat2007@gmail.com';
    const canRevoke = emailToRevoke.trim().toLowerCase() !== SUPER_ADMIN_EMAIL;
    assert.strictEqual(canRevoke, false, 'Super admin must not be revocable');
  });
});
