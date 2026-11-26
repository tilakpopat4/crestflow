import React from 'react';

interface AdminUserInvoicesTabProps {
  invoices: any[];
}

export default function AdminUserInvoicesTab({ invoices }: AdminUserInvoicesTabProps) {
  if (invoices.length === 0) {
    return <div className="text-center py-12 text-[#A1A1AA] text-xs">No invoices created yet.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-[#2A2A33] dark:border-[#2A2A33] text-[#A1A1AA] uppercase font-semibold">
            <th className="pb-2">Invoice #</th>
            <th className="pb-2">Client</th>
            <th className="pb-2">Amount</th>
            <th className="pb-2">Status</th>
            <th className="pb-2 text-right">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2A2A33] dark:divide-[#2A2A33]/60">
          {invoices.map((inv: any) => (
            <tr key={inv.id} className="hover:bg-[#131318] dark:hover:bg-[#1B1B22]">
              <td className="py-2.5 font-mono text-[#A1A1AA] dark:text-[#A1A1AA]">
                {inv.invoiceNumber || inv.id.slice(0, 8)}
              </td>
              <td className="py-2.5">
                <div className="font-semibold text-[#F7F7F8] dark:text-[#F7F7F8]">
                  {inv.clientName || 'Unnamed'}
                </div>
                {inv.clientEmail && (
                  <div className="text-[11px] text-[#A1A1AA]">{inv.clientEmail}</div>
                )}
              </td>
              <td className="py-2.5 font-semibold text-[#F7F7F8] dark:text-[#F7F7F8]">
                {inv.currency || '₹'} {Number(inv.totalAmount || 0).toLocaleString()}
              </td>
              <td className="py-2.5">
                <span
                  className={`font-medium ${
                    inv.status === 'paid'
                      ? 'text-[#FF2D4A] dark:text-[#FF2D4A]'
                      : inv.status === 'overdue'
                      ? 'text-[#E0002B] dark:text-[#F0607A]'
                      : 'text-[#A1A1AA] dark:text-[#A1A1AA]'
                  }`}
                >
                  {inv.status || 'draft'}
                </span>
              </td>
              <td className="py-2.5 text-right text-[#A1A1AA]">
                {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

