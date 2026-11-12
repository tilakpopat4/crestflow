import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export interface UserHistoryDetails {
  invoices: any[];
  clients: any[];
  workItems: any[];
  profile: any;
  subscription: any;
  invoicesCount: number;
  totalBilled: number;
  clientsCount: number;
  workItemsCount: number;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch complete real-time history for a specific user directly from Firestore.
 * Queries invoices, clients, workItems, and profile doc scoped by userId.
 */
export function useFetchUserHistory(userId?: string | null, userEmail?: string | null): UserHistoryDetails {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [workItems, setWorkItems] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setInvoices([]);
      setClients([]);
      setWorkItems([]);
      setProfile(null);
      setSubscription(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadData = async () => {
      try {
        // 1. Fetch Invoices for this user
        const invQ = query(collection(db, 'invoices'), where('userId', '==', userId));
        const invSnap = await getDocs(invQ).catch((err) => {
          console.warn('Direct user invoice query error:', err);
          return null;
        });
        const invList: any[] = [];
        invSnap?.forEach((d) => invList.push({ id: d.id, ...d.data() }));

        // 2. Fetch Clients for this user
        const clientsQ = query(collection(db, 'clients'), where('userId', '==', userId));
        const clientsSnap = await getDocs(clientsQ).catch((err) => {
          console.warn('Direct user clients query error:', err);
          return null;
        });
        const clientsList: any[] = [];
        clientsSnap?.forEach((d) => clientsList.push({ id: d.id, ...d.data() }));

        // 3. Fetch Work Items for this user
        const workQ = query(collection(db, 'workItems'), where('userId', '==', userId));
        const workSnap = await getDocs(workQ).catch((err) => {
          console.warn('Direct user workItems query error:', err);
          return null;
        });
        const workList: any[] = [];
        workSnap?.forEach((d) => workList.push({ id: d.id, ...d.data() }));

        // 4. Fetch Full Profile Doc
        const profSnap = await getDoc(doc(db, 'profiles', userId)).catch(() => null);
        const profData = profSnap?.exists() ? profSnap.data() : null;

        // 5. Fetch Subscription Doc
        const subSnap = await getDoc(doc(db, 'subscriptions', userId)).catch(() => null);
        const subData = subSnap?.exists() ? subSnap.data() : null;

        if (isMounted) {
          invList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          clientsList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          workList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

          setInvoices(invList);
          setClients(clientsList);
          setWorkItems(workList);
          setProfile(profData);
          setSubscription(subData);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Failed to load user history:', err);
        if (isMounted) {
          setError(err?.message || 'Failed to load details');
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [userId, userEmail]);

  const totalBilled = invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);

  return {
    invoices,
    clients,
    workItems,
    profile,
    subscription,
    invoicesCount: invoices.length,
    totalBilled,
    clientsCount: clients.length,
    workItemsCount: workItems.length,
    loading,
    error,
  };
}

