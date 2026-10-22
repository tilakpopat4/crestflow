/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FileText, QrCode } from 'lucide-react';
import { Invoice } from '../../types';
import StatusBadge from '../StatusBadge';

interface ClientPortalInvoicesProps {
  invoices: Invoice[];
  statusFilter: 'all' | 'Pending' | 'Paid';
  onStatusFilterChange: (status: 'all' | 'Pending' | 'Paid') => void;
  onViewInvoice: (invoice: Invoice) => void;
}

/**
 * Invoices tab for Client Portal.
 * Renders a responsive grid of invoice cards with status, totals, and detail inspection.
 */
export const ClientPortalInvoices: React.FC<ClientPortalInvoicesProps> = ({
  invoices,
  statusFilter,
  onStatusFilterChange,
  onViewInvoice,
}) => {
  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter === 'all') return true;
    return inv.status === statusFilter;
  });

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 w-full sm:w-auto">
        {(['all', 'Pending', 'Paid'] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => onStatusFilterChange(status)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer flex-1 sm:flex-initial min-h-[44px] flex items-center justify-center ${
              statusFilter === status
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {status === 'all' ? 'All Invoices' : status}
          </button>
        ))}
      </div>

      {/* Invoices Responsive Grid (1 col on mobile, 2 on md, 3 on lg) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filteredInvoices.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 dark:text-slate-500 text-xs bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            No invoices found.
          </div>
        ) : (
          filteredInvoices.map((inv) => (
            <div
              key={inv.id}
              className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                    {new Date(inv.date).toLocaleDateString()}
                  </span>
                  <StatusBadge status={inv.status} />
                </div>

                <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                  ₹{inv.totalAmount.toLocaleString('en-IN')}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Contains {inv.reels?.length || 0} line item(s)</span>
                  {inv.status === 'Pending' && inv.payeeUpiId && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                      <QrCode size={12} /> UPI Enabled
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onViewInvoice(inv)}
                className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <FileText size={14} />
                <span>View Invoice Details</span>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
