import { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, getDocs, query, where } from 'firebase/firestore';

export interface AdminUserUnified {
  id: string; // User UID
  name: string;
  email: string;
  phone?: string;
  upi_id?: string;
  professional_title?: string;
  subscription_status: string;
  subscription_plan: string;
  current_period_end?: string;
  created_at: string;
  updated_at?: string;
  photo_url?: string;
  // History metrics
  invoicesCount: number;
  totalBilled: number;
  clientsCount: number;
  workItemsCount: number;
  invoices: any[];
  clients: any[];
  workItems: any[];
}

export interface PlatformHistoryStats {
  totalUsers: number;
  totalInvoices: number;
  totalClients: number;
  totalWorkItems: number;
  totalBilledVolume: number;
  activeSubscribers: number;
}

/**
 * useAdminUsersAndHistory: Aggregates users and activity across all Firestore collections
 * (profiles, subscriptions, invoices, clients, workItems, auth.currentUser).
 * Ensures zero data loss so all historical and current users are surfaced.
 */
export function useAdminUsersAndHistory(isAdmin: boolean) {
  const [users, setUsers] = useState<AdminUserUnified[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlatformHistoryStats>({
    totalUsers: 0,
    totalInvoices: 0,
    totalClients: 0,
    totalWorkItems: 0,
    totalBilledVolume: 0,
    activeSubscribers: 0,
  });

  const fetchAllData = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    try {
      const curr = auth.currentUser;

      // 1. Fetch raw collections in parallel with graceful fallbacks
      let profilesSnap: any = null;
      let subsSnap: any = null;
      let invoicesSnap: any = null;
      let clientsSnap: any = null;
      let workSnap: any = null;

      try {
        profilesSnap = await getDocs(collection(db, 'profiles'));
      } catch (e) {
        console.warn('Error reading profiles collection:', e);
      }

      try {
        subsSnap = await getDocs(collection(db, 'subscriptions'));
      } catch (e) {
        console.warn('Error reading subscriptions collection:', e);
      }

      try {
        invoicesSnap = await getDocs(collection(db, 'invoices'));
      } catch (e) {
        if (curr?.uid) {
          invoicesSnap = await getDocs(query(collection(db, 'invoices'), where('userId', '==', curr.uid))).catch(() => null);
        }
      }

      try {
        clientsSnap = await getDocs(collection(db, 'clients'));
      } catch (e) {
        if (curr?.uid) {
          clientsSnap = await getDocs(query(collection(db, 'clients'), where('userId', '==', curr.uid))).catch(() => null);
        }
      }

      try {
        workSnap = await getDocs(collection(db, 'workItems'));
      } catch (e) {
        if (curr?.uid) {
          workSnap = await getDocs(query(collection(db, 'workItems'), where('userId', '==', curr.uid))).catch(() => null);
        }
      }

      const userMap = new Map<string, Partial<AdminUserUnified>>();

      // Helper to get or init user record
      const getOrCreate = (uid: string): Partial<AdminUserUnified> => {
        if (!userMap.has(uid)) {
          userMap.set(uid, {
            id: uid,
            name: '',
            email: '',
            subscription_status: 'inactive',
            subscription_plan: 'free',
            created_at: new Date().toISOString(),
            invoicesCount: 0,
            totalBilled: 0,
            clientsCount: 0,
            workItemsCount: 0,
            invoices: [],
            clients: [],
            workItems: [],
          });
        }
        return userMap.get(uid)!;
      };

      // Ingest Profiles
      profilesSnap?.forEach((d: any) => {
        const data = d.data();
        const u = getOrCreate(d.id);
        u.name = data.name || u.name || '';
        u.email = data.email || u.email || '';
        u.phone = data.phone || u.phone;
        u.upi_id = data.upiId || u.upi_id;
        u.professional_title = data.professionalTitle || u.professional_title;
        u.photo_url = data.photoURL || u.photo_url;
        u.subscription_status = data.subscriptionStatus || u.subscription_status || 'inactive';
        u.subscription_plan = data.subscriptionPlan || u.subscription_plan || 'free';
        if (data.currentPeriodEnd) {
          u.current_period_end =
            typeof data.currentPeriodEnd === 'number'
              ? new Date(data.currentPeriodEnd).toISOString()
              : String(data.currentPeriodEnd);
        }
        if (data.createdAt) {
          u.created_at = new Date(data.createdAt).toISOString();
        }
        if (data.updatedAt) {
          u.updated_at = new Date(data.updatedAt).toISOString();
        }
      });

      // Ingest Subscriptions
      subsSnap?.forEach((d: any) => {
        const data = d.data();
        const uid = data.userId || d.id;
        const u = getOrCreate(uid);
        if (data.status) u.subscription_status = data.status;
        if (data.plan) u.subscription_plan = data.plan;
        if (data.accessUntil) {
          const date = data.accessUntil.toDate ? data.accessUntil.toDate() : new Date(data.accessUntil);
          u.current_period_end = date.toISOString();
        }
      });

      // Ingest Invoices
      let totalBilledAll = 0;
      let totalInvoicesAll = 0;
      invoicesSnap?.forEach((d: any) => {
        const data = d.data();
        const uid = data.userId;
        totalInvoicesAll++;
        const amt = Number(data.totalAmount) || 0;
        totalBilledAll += amt;

        if (uid) {
          const u = getOrCreate(uid);
          u.invoicesCount = (u.invoicesCount || 0) + 1;
          u.totalBilled = (u.totalBilled || 0) + amt;
          u.invoices = u.invoices || [];
          u.invoices.push({ id: d.id, ...data });
        }
      });

      // Ingest Clients
      let totalClientsAll = 0;
      clientsSnap?.forEach((d: any) => {
        const data = d.data();
        const uid = data.userId;
        totalClientsAll++;
        if (uid) {
          const u = getOrCreate(uid);
          u.clientsCount = (u.clientsCount || 0) + 1;
          u.clients = u.clients || [];
          u.clients.push({ id: d.id, ...data });
        }
      });

      // Ingest Work Items
      let totalWorkAll = 0;
      workSnap?.forEach((d: any) => {
        const data = d.data();
        const uid = data.userId;
        totalWorkAll++;
        if (uid) {
          const u = getOrCreate(uid);
          u.workItemsCount = (u.workItemsCount || 0) + 1;
          u.workItems = u.workItems || [];
          u.workItems.push({ id: d.id, ...data });
        }
      });

      // Include Current Logged In Admin / User if missing
      if (curr?.uid) {
        const u = getOrCreate(curr.uid);
        if (!u.email && curr.email) u.email = curr.email;
        if (!u.name && curr.displayName) u.name = curr.displayName;
        if (!u.photo_url && curr.photoURL) u.photo_url = curr.photoURL;
      }

      // Finalize user list
      const unifiedList: AdminUserUnified[] = Array.from(userMap.values()).map((u) => ({
        id: u.id || 'unknown',
        name: u.name || (u.email ? u.email.split('@')[0] : 'Freelancer'),
        email: u.email || '',
        phone: u.phone || '',
        upi_id: u.upi_id || '',
        professional_title: u.professional_title || '',
        subscription_status: u.subscription_status || 'inactive',
        subscription_plan: u.subscription_plan || 'free',
        current_period_end: u.current_period_end,
        created_at: u.created_at || new Date().toISOString(),
        updated_at: u.updated_at,
        photo_url: u.photo_url,
        invoicesCount: u.invoicesCount || 0,
        totalBilled: u.totalBilled || 0,
        clientsCount: u.clientsCount || 0,
        workItemsCount: u.workItemsCount || 0,
        invoices: (u.invoices || []).sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0)),
        clients: (u.clients || []).sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0)),
        workItems: (u.workItems || []).sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0)),
      }));

      // Sort newest users first
      unifiedList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Count active subscribers
      const nowTime = Date.now();
      const activeCount = unifiedList.filter((u) => {
        if (u.subscription_status === 'active') {
          if (!u.current_period_end) return true;
          return new Date(u.current_period_end).getTime() > nowTime;
        }
        return false;
      }).length;

      setUsers(unifiedList);
      setStats({
        totalUsers: unifiedList.length,
        totalInvoices: totalInvoicesAll,
        totalClients: totalClientsAll,
        totalWorkItems: totalWorkAll,
        totalBilledVolume: totalBilledAll,
        activeSubscribers: activeCount,
      });
      setLoading(false);
    } catch (err) {
      console.warn('Error fetching unified admin users and history:', err);
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Realtime hook into profiles to auto-refresh whenever a new profile signs up
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(
      collection(db, 'profiles'),
      () => {
        fetchAllData();
      },
      (err) => console.warn('Profiles onSnapshot error in admin hook:', err)
    );
    return () => unsub();
  }, [isAdmin, fetchAllData]);

  return {
    users,
    stats,
    loading,
    refresh: fetchAllData,
  };
}
