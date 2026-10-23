import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { SUPER_ADMIN_EMAIL, isAuthorizedAdminEmail } from '../lib/adminConfig';

export { SUPER_ADMIN_EMAIL };

export interface AdminAuthState {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  adminEmails: string[];
}

/**
 * Hook to manage admin authentication state.
 * Authorizes 'tilakpopat2007@gmail.com' by default (Super Admin),
 * as well as any Google ID/email added to the 'admin_users' collection in Firestore.
 */
const CACHED_ADMINS_KEY = 'crestflow_cached_admin_emails_v1';

export function useAdminAuth(user: User | null): AdminAuthState {
  const [adminEmails, setAdminEmails] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem(CACHED_ADMINS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [SUPER_ADMIN_EMAIL];
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      collection(db, 'admin_users'),
      (snapshot) => {
        const emails: string[] = [SUPER_ADMIN_EMAIL];
        snapshot.forEach((d) => {
          const email = (d.data()?.email || d.id || '').toLowerCase().trim();
          if (email && !emails.includes(email)) {
            emails.push(email);
          }
        });
        setAdminEmails(emails);
        try {
          localStorage.setItem(CACHED_ADMINS_KEY, JSON.stringify(emails));
        } catch {}
        setLoading(false);
      },
      (err) => {
        console.warn('Error reading admin_users collection:', err);
        // Fallback: Super Admin is always valid even if collection read has issues
        setAdminEmails([SUPER_ADMIN_EMAIL]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  const cleanUserEmail = user?.email?.trim().toLowerCase() || '';
  const isSuperAdmin = cleanUserEmail === SUPER_ADMIN_EMAIL;
  const isAdmin = isSuperAdmin || adminEmails.includes(cleanUserEmail);

  return {
    isAdmin,
    isSuperAdmin,
    loading,
    adminEmails,
  };
}
