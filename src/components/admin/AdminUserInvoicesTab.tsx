import React from 'react';

interface AdminUserInvoicesTabProps {
  invoices: any[];
}

export default function AdminUserInvoicesTab({ invoices }: AdminUserInvoicesTabProps) {
  if (invoices.length === 0) {
    return <div className="text-center py-12 text-slate-400 text-xs">No invoices created yet.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
            <th className="pb-2">Invoice #</th>
            <th className="pb-2">Client</th>
            <th className="pb-2">Amount</th>
            <th className="pb-2">Status</th>
            <th className="pb-2 text-right">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {invoices.map((inv: any) => (
            <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <td className="py-2.5 font-mono text-slate-700 dark:text-slate-300">
                {inv.invoiceNumber || inv.id.slice(0, 8)}
              </td>
              <td className="py-2.5">
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {inv.clientName || 'Unnamed'}
                </div>
                {inv.clientEmail && (
                  <div className="text-[11px] text-slate-400">{inv.clientEmail}</div>
                )}
              </td>
              <td className="py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                {inv.currency || '₹'} {Number(inv.totalAmount || 0).toLocaleString()}
              </td>
              <td className="py-2.5">
                <span
                  className={`font-medium ${
                    inv.status === 'paid'
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : inv.status === 'overdue'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {inv.status || 'draft'}
                </span>
              </td>
              <td className="py-2.5 text-right text-slate-400">
                {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
