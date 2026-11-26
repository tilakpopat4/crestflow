import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Search, RefreshCw, Users } from 'lucide-react';
import UserSubscriptionRow, { ProfileRowData } from './UserSubscriptionRow';
import AdminUserHistoryModal from './AdminUserHistoryModal';
import AdminSyncAuthModal from './AdminSyncAuthModal';
import { AdminUserUnified } from '../../hooks/useAdminUsersAndHistory';

interface BlockedItem {
  id: string;
  blockedAt: number;
}

interface AdminUserSubscriptionsProps {
  users: AdminUserUnified[];
  loading: boolean;
  onRefresh: () => void;
}

/**
 * Registered Freelancers and Subscriptions console.
 * Backed by unified multi-collection aggregator (profiles, subscriptions, invoices, clients).
 * Adheres strictly to GEMINI.md: text status with 6px dot, no colored pills, 120ms transitions.
 */
export default function AdminUserSubscriptions({
  users,
  loading,
  onRefresh,
}: AdminUserSubscriptionsProps) {
  const [blockedList, setBlockedList] = useState<BlockedItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<AdminUserUnified | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  useEffect(() => {
    // Listen to blocked users from Firestore
    const unsubBlocked = onSnapshot(
      collection(db, 'blocked_users'),
      (snapshot) => {
        const items: BlockedItem[] = [];
        snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as BlockedItem));
        setBlockedList(items);
      },
      (err) => console.warn('Error fetching blocked users:', err)
    );

    return () => unsubBlocked();
  }, []);

  const isUserBlocked = (userId: string) => blockedList.some((u) => u.id === userId);

  const handleGrantDays = async (userId: string, userName: string, grantLifetime: boolean = false) => {
    const label = grantLifetime ? 'Lifetime Pro access' : '30 extra days of Pro access';
    if (!window.confirm(`Grant ${label} to ${userName || 'this user'}?`)) return;
    setActionLoading(userId);
    try {
      if (!auth.currentUser) throw new Error('You must be signed in as admin');
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/admin/grant-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(grantLifetime ? { userId, plan: 'lifetime' } : { userId, days: 30 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to grant subscription');
      }
      onRefresh();
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
      if (!auth.currentUser) throw new Error('You must be signed in as admin');
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/admin/revoke-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to revoke access');
      }
      onRefresh();
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
          blockedAt: Date.now(),
        });
      }
      onRefresh();
    } catch (err: any) {
      alert(`Error updating block status: ${err.message || err}`);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = users.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q)) ||
      (p.professional_title && p.professional_title.toLowerCase().includes(q)) ||
      (p.upi_id && p.upi_id.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q)) ||
      (p.id && p.id.toLowerCase().includes(q))
    );
  });

  return (
    <>
      <div className="bg-[#131318] dark:bg-[#131318] border border-[#2A2A33] dark:border-[#2A2A33] rounded-xl overflow-hidden shadow-2xs">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2A2A33] dark:border-[#2A2A33]">
          <div>
            <h2 className="text-lg font-bold text-[#F7F7F8] dark:text-[#F7F7F8]">
              Registered Freelancers & Subscriptions ({users.length})
            </h2>
            <p className="text-sm text-[#A1A1AA] dark:text-[#A1A1AA] mt-0.5">
              Comprehensive list of all current and historical users aggregated from profiles, subscriptions, and activities.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="px-3 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-semibold transition-colors duration-120 border-0 cursor-pointer inline-flex items-center gap-1.5 shrink-0"
              title="Sync accounts from Firebase Authentication"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Sync Auth Users</span>
            </button>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, email, phone, UID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#131318] dark:bg-[#0B0B0E] border border-[#2A2A33] dark:border-[#2A2A33] rounded-lg pl-9 pr-3.5 py-2 text-sm text-[#F7F7F8] dark:text-[#F7F7F8] placeholder:text-[#A1A1AA] outline-none focus:border-[#FF2D4A] transition-colors duration-120"
              />
            </div>
            <button
              onClick={onRefresh}
              className="p-2 text-[#A1A1AA] hover:text-[#F7F7F8] dark:text-[#A1A1AA] dark:hover:text-[#F7F7F8] rounded-lg hover:bg-[#131318] dark:hover:bg-[#1B1B22] transition-colors duration-120 border-0 cursor-pointer"
              title="Refresh list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-[#A1A1AA] text-sm">
              Loading all historical and current users...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-[#A1A1AA] text-sm">
              No accounts matching search criteria.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#131318] dark:bg-[#0B0B0E] text-[#A1A1AA] dark:text-[#A1A1AA] text-xs uppercase tracking-wider font-semibold border-b border-[#2A2A33] dark:border-[#2A2A33]">
                  <th className="p-4">Freelancer</th>
                  <th className="p-4">Contact / UPI</th>
                  <th className="p-4">Activity History</th>
                  <th className="p-4">Plan Status</th>
                  <th className="p-4">Access Expiry</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A33] dark:divide-[#2A2A33]/60">
                {filtered.map((p) => (
                  <UserSubscriptionRow
                    key={p.id}
                    profile={p}
                    isBlocked={isUserBlocked(p.id)}
                    isProcessing={actionLoading === p.id}
                    onGrantDays={handleGrantDays}
                    onRevoke={handleRevoke}
                    onToggleBlock={handleToggleBlock}
                    onViewHistory={(row) => {
                      const full = users.find((u) => u.id === row.id) || null;
                      setSelectedUserForHistory(full);
                    }}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Inspection Modal */}
      <AdminUserHistoryModal
        user={selectedUserForHistory}
        isOpen={Boolean(selectedUserForHistory)}
        onClose={() => setSelectedUserForHistory(null)}
      />

      {/* Sync Firebase Auth Accounts Modal */}
      <AdminSyncAuthModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onSynced={() => {
          onRefresh();
        }}
      />
    </>
  );
}
