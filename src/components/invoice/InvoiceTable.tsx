import React from 'react';
import { Mail, Download, Edit2, Trash2, Search, X, Archive, Loader2 } from 'lucide-react';
import { Client, Invoice } from '../../types';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatInvoiceNumber } from '../../lib/invoiceUtils';
import { formatCurrencyAmount } from '../../lib/currencyUtils';

interface InvoiceTableProps {
  invoices: Invoice[];
  allInvoices: Invoice[];
  clients: Client[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  showClosed: boolean;
  setShowClosed: React.Dispatch<React.SetStateAction<boolean>>;
  closedCount: number;
  downloadingPdfId: string | null;
  onToggleStatus: (id: string) => void;
  onRedownloadPdf: (inv: Invoice) => void;
  onEditInvoice: (inv: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
  onOpenEmailModal: (inv: Invoice) => void;
}

/**
 * Invoice history table with quick actions, email delivery, and PDF re-downloads.
 */
export function InvoiceTable({
  invoices,
  allInvoices,
  clients,
  searchQuery,
  setSearchQuery,
  showClosed,
  setShowClosed,
  closedCount,
  downloadingPdfId,
  onToggleStatus,
  onRedownloadPdf,
  onEditInvoice,
  onDeleteInvoice,
  onOpenEmailModal,
}: InvoiceTableProps) {
  const filteredInvoices = invoices.filter((inv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const invNo = formatInvoiceNumber(inv, allInvoices).toLowerCase();
    const clientName = (inv.clientName || '').toLowerCase();
    return invNo.includes(q) || clientName.includes(q);
  });

  return (
    <div className="bg-surface-700 border border-surface-400 rounded-xl overflow-hidden shadow-xs space-y-3">
      {/* Search & Closed Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-b border-surface-400/80">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoices by # or client..."
            className="w-full bg-surface-800 text-xs pl-9 pr-7 py-2 rounded-lg border border-surface-400 text-text-primary placeholder:text-text-muted outline-none focus:border-surface-300"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer bg-transparent border-0 p-0"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {closedCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowClosed((prev) => !prev)}
            className="gap-1.5 w-full sm:w-auto text-xs border-0 font-medium"
            title={showClosed ? 'Hide closed client invoices' : 'Show closed client invoices'}
          >
            <Archive size={13} />
            <span>{showClosed ? 'Hide Closed' : `Show Closed (${closedCount})`}</span>
          </Button>
        )}
      </div>

      {/* Invoices Table Container */}
      <div className="overflow-x-auto w-full max-w-full">
        <table className="w-full min-w-[960px] text-left border-collapse text-xs">
          <thead>
            <tr className="bg-surface-800 border-b border-surface-400/80 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
              <th className="py-3 px-4">Invoice # &amp; Date</th>
              <th className="py-3 px-4">Client</th>
              <th className="py-3 px-4">Deliverables / Items</th>
              <th className="py-3 px-4 text-right">Total Amount</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-400/50">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-text-muted">
                  {searchQuery ? `No invoices matching "${searchQuery}"` : 'No invoices generated yet.'}
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => {
                const clientObj = clients.find((c) => c.id === inv.clientId);
                const currency = clientObj?.currency;
                const formattedDate = new Date(inv.date).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                });
                const subClient = inv.reels.find((r) => Boolean(r.subClientName))?.subClientName;

                return (
                  <tr key={inv.id} className="hover:bg-surface-600/40 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap min-w-[130px]">
                      <div className="font-semibold text-text-primary font-mono tabular-nums">
                        {formatInvoiceNumber(inv, allInvoices)}
                      </div>
                      <div className="text-[11px] text-text-muted mt-0.5 font-mono tabular-nums">
                        {formattedDate}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-semibold text-text-primary">
                      <div>{inv.clientName}</div>
                      {subClient && (
                        <div className="text-xs text-text-muted font-normal mt-0.5">
                          {subClient}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-text-secondary min-w-[200px] max-w-[280px]">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="font-medium text-text-primary">
                          {inv.invoiceType === 'monthly_retainer'
                            ? '1 Monthly Retainer'
                            : `${inv.reels.length} item(s)`}
                        </span>
                      </div>
                      <div
                        className="text-[11px] text-text-muted truncate max-w-[260px] mt-0.5"
                        title={inv.reels.map((r) => r.title).join(', ')}
                      >
                        {inv.reels.map((r) => r.title).join(', ')}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-semibold text-text-primary whitespace-nowrap font-mono tabular-nums">
                      {formatCurrencyAmount(inv.totalAmount, currency)}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <StatusBadge
                        status={inv.status}
                        onClick={() => onToggleStatus(inv.id)}
                        title={`Click to mark as ${inv.status === 'Paid' ? 'Pending' : 'Paid & update last payment date'
                          }`}
                      />
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap shrink-0">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onOpenEmailModal(inv)}
                          className="gap-1.5 whitespace-nowrap shrink-0 text-xs h-7 border-0 font-medium"
                          title="Send via Gmail"
                        >
                          <Mail size={12} />
                          <span>Send via Gmail</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRedownloadPdf(inv)}
                          disabled={downloadingPdfId === inv.id}
                          title="Download PDF"
                          className="h-7 w-7"
                        >
                          {downloadingPdfId === inv.id ? (
                            <Loader2 size={13} className="animate-spin text-text-muted" />
                          ) : (
                            <Download size={13} />
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEditInvoice(inv)}
                          title="Edit Invoice"
                          className="h-7 w-7"
                        >
                          <Edit2 size={13} />
                        </Button>

                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => onDeleteInvoice(inv.id)}
                          title="Delete Invoice"
                          className="h-7 w-7"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default InvoiceTable;
