import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { db } from '../../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { approveSubscriptionPayment, rejectSubscriptionPayment } from '../../lib/youpiService';
import { RefreshCw } from 'lucide-react';
import PaymentApprovalRow, { PaymentRowData } from './PaymentApprovalRow';

/**
 * Payment Verification Queue for platform admins.
 * Merges Firestore and Supabase real-time subscriptions.
 * Adheres strictly to GEMINI.md: text status with 6px dot, no colored pills, 120ms transitions.
 */
export default function AdminPaymentApprovals() {
  const [payments, setPayments] = useState<PaymentRowData[]>([]);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const firestorePaymentsRef = useRef<PaymentRowData[]>([]);
  const supabasePaymentsRef = useRef<PaymentRowData[]>([]);

  const combineAndSetPayments = (
    fsList: PaymentRowData[],
    sbList: PaymentRowData[],
    currentFilter: 'pending' | 'all'
  ) => {
    const map = new Map<string, PaymentRowData>();

    // 1. Add Firestore records
    fsList.forEach((p) => {
      map.set(p.order_id, p);
    });

    // 2. Overlay or append Supabase records
    sbList.forEach((sp) => {
      const existing = map.get(sp.order_id);
      map.set(sp.order_id, {
        id: sp.id || existing?.id || sp.order_id,
        user_id: sp.user_id || existing?.user_id || '',
        order_id: sp.order_id,
        plan: sp.plan || existing?.plan || 'monthly',
        amount: sp.amount !== undefined ? sp.amount : existing?.amount || 49,
        currency: sp.currency || existing?.currency || 'INR',
        status: sp.status || existing?.status || 'PENDING_VERIFICATION',
        utr: sp.utr || existing?.utr,
        payer_email: sp.payer_email || existing?.payer_email,
        admin_notes: sp.admin_notes || existing?.admin_notes,
        created_at: sp.created_at || existing?.created_at || new Date().toISOString()
      });
    });

    let combined = Array.from(map.values()).sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    if (currentFilter === 'pending') {
      combined = combined.filter((p) => p.status === 'PENDING_VERIFICATION');
    }

    setPayments(combined);
    setLoading(false);
  };

  const fetchSupabasePayments = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        supabasePaymentsRef.current = data;
        combineAndSetPayments(firestorePaymentsRef.current, data, filter);
      }
    } catch (err) {
      console.warn('Error fetching Supabase payments:', err);
    }
  };

  useEffect(() => {
    setLoading(true);

    // 1. Realtime listener on Firestore subscription_payments
    const unsubFirestore = onSnapshot(
      collection(db, 'subscription_payments'),
      (snapshot) => {
        const items: PaymentRowData[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          items.push({
            id: d.id,
            user_id: data.userId || '',
            order_id: data.orderId || d.id,
            plan: data.plan || 'monthly',
            amount: Number(data.amount) || 49,
            currency: data.currency || 'INR',
            status: data.status || 'PENDING_VERIFICATION',
            utr: data.utr || '',
            payer_email: data.payerEmail || '',
            admin_notes: data.adminNotes || '',
            created_at: data.createdAt
              ? (typeof data.createdAt === 'number'
                  ? new Date(data.createdAt).toISOString()
                  : String(data.createdAt))
              : new Date().toISOString()
          });
        });

        firestorePaymentsRef.current = items;
        combineAndSetPayments(items, supabasePaymentsRef.current, filter);
      },
      (err) => {
        console.warn('Error listening to Firestore payments:', err);
        setLoading(false);
      }
    );

    // 2. Fetch Supabase payments
    fetchSupabasePayments();

    // 3. Setup Supabase realtime listener
    const channel = supabase
      .channel('admin_subscription_payments_feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscription_payments' },
        () => {
          fetchSupabasePayments();
        }
      )
      .subscribe();

    return () => {
      unsubFirestore();
      supabase.removeChannel(channel);
    };
  }, [filter]);

  const handleApprove = async (orderId: string) => {
    if (!window.confirm(`Approve payment ${orderId} and grant subscription access?`)) return;
    setActionLoading(orderId);
    try {
      await approveSubscriptionPayment(orderId, 'Manually approved via Admin Portal');
      await fetchSupabasePayments();
    } catch (err: any) {
      alert(`Approval error: ${err.message || err}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (orderId: string) => {
    const reason = window.prompt(
      'Enter reason for rejecting this payment (e.g. Invalid UTR):',
      'Invalid UTR reference'
    );
    if (reason === null) return;
    setActionLoading(orderId);
    try {
      await rejectSubscriptionPayment(orderId, reason);
      await fetchSupabasePayments();
    } catch (err: any) {
      alert(`Rejection error: ${err.message || err}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
      {/* Table Header Controls */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Payment Verification Queue
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Review submitted 12-digit bank UTR numbers and approve ₹49 subscriptions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5">
            <button
              onClick={() => setFilter('pending')}
              className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors duration-120 border-0 cursor-pointer ${
                filter === 'pending'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Pending Only
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors duration-120 border-0 cursor-pointer ${
                filter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All Records
            </button>
          </div>

          <button
            onClick={() => {
              setLoading(true);
              fetchSupabasePayments();
            }}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-120 border-0 cursor-pointer"
            title="Refresh payments"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Loading payments...
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            {filter === 'pending'
              ? 'No payments pending verification. All caught up.'
              : 'No payment records found.'}
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <th className="p-4">Order / User</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Bank UTR</th>
                <th className="p-4">Submitted</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {payments.map((p) => (
                <PaymentApprovalRow
                  key={p.order_id}
                  payment={p}
                  isProcessing={actionLoading === p.order_id}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
