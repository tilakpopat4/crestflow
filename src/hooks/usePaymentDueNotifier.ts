import { useEffect } from 'react';
import { User } from 'firebase/auth';
import { Client, Invoice, WorkItem } from '../types';
import { getPaymentStatusInfo } from '../lib/paymentUtils';

/**
 * Automatically notifies the freelancer when any active client has a payment due today.
 * Deduplicated locally and on the server to dispatch at most once per client per calendar day.
 */
export function usePaymentDueNotifier(
  user: User | null,
  clients: Client[],
  invoices: Invoice[],
  workItems: WorkItem[]
) {
  useEffect(() => {
    if (!user || clients.length === 0) return;

    const todayStr = new Date().toISOString().slice(0, 10);

    clients.forEach((client) => {
      if (client.isClosed) return;

      const status = getPaymentStatusInfo(client, invoices, workItems);
      if (status.code !== 'DUE_TODAY') return;

      const storageKey = `crestflow_due_notified_${user.uid}_${client.id}_${todayStr}`;
      if (localStorage.getItem(storageKey)) return;

      user.getIdToken()
        .then((token) => {
          fetch('/api/notify/payment-due-today', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              clientId: client.id,
              clientName: client.name,
              amountDueFormatted: `₹${(status.totalPendingAmount || client.monthlyRetainerAmount || 0).toLocaleString('en-IN')}`,
              paymentBasis: client.paymentBasis === 'monthly_retainer' ? 'Monthly Retainer' : 'Per Deliverable',
              dueDateFormatted: new Date(status.nextDueDate).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }),
            }),
          })
            .then((res) => res.json())
            .then(() => localStorage.setItem(storageKey, 'true'))
            .catch((err) => console.warn('Payment due notification dispatch error:', err));
        })
        .catch(() => {});
    });
  }, [user, clients, invoices, workItems]);
}
