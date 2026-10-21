export const SUPER_ADMIN_EMAIL = 'tilakpopat2007@gmail.com';

/**
 * Checks if a given Google email address is an authorized administrator.
 * Matches case-insensitively against the permanent Super Admin or the admin list.
 */
export function isAuthorizedAdminEmail(
  email: string | null | undefined,
  adminList: string[] = []
): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  if (clean === SUPER_ADMIN_EMAIL) return true;
  return adminList.some((e) => e.trim().toLowerCase() === clean);
}
