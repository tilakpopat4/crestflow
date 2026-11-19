import React from 'react';
import { Invoice } from '../../types';
import StatusBadge from '../StatusBadge';
import { Button } from '../ui/button';

interface DashboardRecentInvoicesProps {
  recentInvoices: Invoice[];
  toggleInvoiceStatus: (id: string) => void;
  deleteInvoice: (id: string) => void;
  onNavigateToInvoices?: () => void;
}

export const DashboardRecentInvoices: React.FC<DashboardRecentInvoicesProps> = ({
  recentInvoices,
  toggleInvoiceStatus,
  deleteInvoice,
  onNavigateToInvoices,
}) => {
  return (
    <div className="bg-surface-700 border border-surface-400 rounded-xl shadow-2xs overflow-hidden flex flex-col">
      <div className="p-4 sm:p-5 flex justify-between items-center border-b border-surface-400/60 bg-surface-700">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-text-primary uppercase tracking-wider">
            Recent Invoices
          </h3>
          <p className="text-[11px] text-text-secondary mt-0.5">
            Latest client billing activities and statuses.
          </p>
        </div>
        {recentInvoices.length > 0 && onNavigateToInvoices && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateToInvoices}
            className="text-xs text-text-secondary hover:text-text-primary"
          >
            View All ({recentInvoices.length}) &rarr;
          </Button>
        )}
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-800 border-b border-surface-400/60 text-[10px] sm:text-xs uppercase tracking-wider text-text-secondary font-semibold">
              <th className="px-3 sm:px-6 py-2.5 sm:py-3 whitespace-nowrap">Date</th>
              <th className="px-3 sm:px-6 py-2.5 sm:py-3">Client</th>
              <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-right whitespace-nowrap">Amount</th>
              <th className="px-2 sm:px-6 py-2.5 sm:py-3 text-center whitespace-nowrap">Status</th>
              <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-500">
            {recentInvoices.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 sm:px-6 py-12 text-center text-text-secondary">
                  <div className="flex flex-col items-center justify-center space-y-2.5">
                    <p className="text-xs">No invoices generated yet.</p>
                    {onNavigateToInvoices && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={onNavigateToInvoices}
                      >
                        Create Your First Invoice
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              recentInvoices.slice(0, 8).map((inv) => (
                <tr
                  key={inv.id}
                  className="hover:bg-surface-600/50 transition-colors duration-120"
                >
                  <td className="px-3 sm:px-6 py-3 whitespace-nowrap text-xs font-mono tabular-nums text-text-secondary">
                    {new Date(inv.date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium text-text-primary">
                    <div className="truncate max-w-[120px] sm:max-w-none">{inv.clientName}</div>
                    {inv.discountAmount ? (
                      <div className="text-[10px] text-text-muted font-normal mt-0.5 truncate">
                        -₹{inv.discountAmount.toLocaleString('en-IN')}
                        {inv.discountDescription ? ` (${inv.discountDescription})` : ''}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 sm:px-6 py-3 text-right text-xs sm:text-sm font-semibold font-mono tabular-nums text-text-primary whitespace-nowrap">
                    ₹{inv.totalAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-2 sm:px-6 py-3 text-center whitespace-nowrap">
                    <StatusBadge
                      status={inv.status}
                      onClick={() => toggleInvoiceStatus(inv.id)}
                      title="Click to toggle payment status"
                    />
                  </td>
                  <td className="px-3 sm:px-6 py-3 text-right whitespace-nowrap space-x-1.5 text-xs">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleInvoiceStatus(inv.id)}
                      className="text-xs h-7 px-2"
                    >
                      {inv.status === 'Paid' ? 'Mark Pending' : 'Approve Payment'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteInvoice(inv.id)}
                      className="text-xs h-7 px-2 text-text-secondary hover:text-accent"
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardRecentInvoices;
