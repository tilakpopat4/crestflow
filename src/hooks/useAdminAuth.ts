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
export function useAdminAuth(user: User | null): AdminAuthState {
  const [adminEmails, setAdminEmails] = useState<string[]>([SUPER_ADMIN_EMAIL]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

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
