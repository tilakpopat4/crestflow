import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { grantManualSubscriptionDays, revokeSubscription } from '../../lib/youpiService';
import { Search, RefreshCw } from 'lucide-react';
import UserSubscriptionRow, { ProfileRowData } from './UserSubscriptionRow';

interface BlockedItem {
  id: string;
  blockedAt: number;
}

/**
 * Registered Freelancers and Subscriptions console.
 * Dual-source sync from Firestore and Supabase.
 * Adheres strictly to GEMINI.md: text status with 6px dot, no colored pills, 120ms transitions.
 */
export default function AdminUserSubscriptions() {
  const [profiles, setProfiles] = useState<ProfileRowData[]>([]);
  const [blockedList, setBlockedList] = useState<BlockedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const firestoreProfilesRef = useRef<ProfileRowData[]>([]);
  const supabaseProfilesRef = useRef<ProfileRowData[]>([]);

  const combineAndSetProfiles = (fsList: ProfileRowData[], sbList: ProfileRowData[]) => {
    const map = new Map<string, ProfileRowData>();

    // 1. Add Firestore profiles
    fsList.forEach((p) => {
      map.set(p.id, p);
    });

    // 2. Overlay or append Supabase profiles
    sbList.forEach((sp) => {
      const existing = map.get(sp.id);
      map.set(sp.id, {
        id: sp.id,
        name: sp.name || existing?.name || 'Anonymous User',
        phone: sp.phone || existing?.phone,
        upi_id: sp.upi_id || existing?.upi_id,
        professional_title: sp.professional_title || existing?.professional_title,
        subscription_status: sp.subscription_status || existing?.subscription_status || 'inactive',
        subscription_plan: sp.subscription_plan || existing?.subscription_plan || 'monthly',
        current_period_end: sp.current_period_end || existing?.current_period_end,
        created_at: sp.created_at || existing?.created_at || new Date().toISOString()
      });
    });

    const combined = Array.from(map.values()).sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setProfiles(combined);
    setLoading(false);
  };

  const fetchSupabaseProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        supabaseProfilesRef.current = data;
        combineAndSetProfiles(firestoreProfilesRef.current, data);
      }
    } catch (err) {
      console.warn('Error fetching Supabase profiles:', err);
    }
  };

  useEffect(() => {
    setLoading(true);

    // 1. Realtime listener on Firestore profiles
    const unsubFirestore = onSnapshot(
      collection(db, 'profiles'),
      (snapshot) => {
        const items: ProfileRowData[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          items.push({
            id: d.id,
            name: data.name || '',
            phone: data.phone || '',
            upi_id: data.upiId || '',
            professional_title: data.professionalTitle || '',
            subscription_status: data.subscriptionStatus || 'inactive',
            subscription_plan: data.subscriptionPlan || 'monthly',
            current_period_end: data.currentPeriodEnd
              ? (typeof data.currentPeriodEnd === 'number'
                  ? new Date(data.currentPeriodEnd).toISOString()
                  : String(data.currentPeriodEnd))
              : undefined,
            created_at: data.createdAt
              ? new Date(data.createdAt).toISOString()
              : new Date().toISOString()
          });
        });

        firestoreProfilesRef.current = items;
        combineAndSetProfiles(items, supabaseProfilesRef.current);
      },
      (err) => {
        console.warn('Error listening to Firestore profiles:', err);
        setLoading(false);
      }
    );

    // 2. Fetch Supabase profiles
    fetchSupabaseProfiles();

    // 3. Listen to blocked users from Firestore
    const unsubBlocked = onSnapshot(
      collection(db, 'blocked_users'),
      (snapshot) => {
        const items: BlockedItem[] = [];
        snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as BlockedItem));
        setBlockedList(items);
      },
      (err) => console.warn('Error fetching blocked users:', err)
    );

    return () => {
      unsubFirestore();
      unsubBlocked();
    };
  }, []);

  const isUserBlocked = (userId: string) => blockedList.some((u) => u.id === userId);

  const handleGrantDays = async (userId: string, userName: string) => {
    if (!window.confirm(`Grant 30 extra days of Pro access to ${userName || 'this user'}?`)) return;
    setActionLoading(userId);
    try {
      await grantManualSubscriptionDays(userId, 30);
      await fetchSupabaseProfiles();
    } catch (err: any) {
      alert(`Error granting subscription: ${err.message || err}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (userId: string, userName: string) => {
    if (!window.confirm(`Revoke subscription access for ${userName || 'this user'}?`)) return;
    setActionLoading(userId);
    try {
      await revokeSubscription(userId);
      await fetchSupabaseProfiles();
    } catch (err: any) {
      alert(`Error revoking access: ${err.message || err}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleBlock = async (userId: string, currentlyBlocked: boolean) => {
    setActionLoading(userId);
    try {
      if (currentlyBlocked) {
        await deleteDoc(doc(db, 'blocked_users', userId));
      } else {
        await setDoc(doc(db, 'blocked_users', userId), {
          blockedAt: Date.now()
        });
      }
    } catch (err: any) {
      alert(`Error updating block status: ${err.message || err}`);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = profiles.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.professional_title && p.professional_title.toLowerCase().includes(q)) ||
      (p.upi_id && p.upi_id.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q)) ||
      (p.id && p.id.toLowerCase().includes(q))
    );
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Registered Freelancers & Subscriptions
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage user subscription periods, extend access with 1 click, or block abusive accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, phone, UID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500 transition-colors duration-120"
            />
          </div>
          <button
            onClick={() => {
              setLoading(true);
              fetchSupabaseProfiles();
            }}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-120 border-0 cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Loading user accounts...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No accounts matching search criteria.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <th className="p-4">Freelancer</th>
                <th className="p-4">Contact / UPI</th>
                <th className="p-4">Plan Status</th>
                <th className="p-4">Access Expiry</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.map((p) => (
                <UserSubscriptionRow
                  key={p.id}
                  profile={p}
                  isBlocked={isUserBlocked(p.id)}
                  isProcessing={actionLoading === p.id}
                  onGrantDays={handleGrantDays}
                  onRevoke={handleRevoke}
                  onToggleBlock={handleToggleBlock}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
