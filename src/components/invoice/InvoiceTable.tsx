import React from 'react';
import {
  Mail,
  Download,
  Edit2,
  Trash2,
  Search,
  X,
  Archive,
  Loader2,
  Link2,
  Link2Off,
  Check,
  CheckCircle2,
  Lock,
} from 'lucide-react';
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
  canWrite?: boolean;
  sharedLinks?: Record<string, string>;
  shareLoadingId?: string | null;
  onToggleStatus: (id: string) => void;
  onRedownloadPdf: (inv: Invoice) => void;
  onEditInvoice: (inv: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
  onOpenEmailModal: (inv: Invoice) => void;
  onCreateShareLink?: (inv: Invoice) => void;
  onRevokeShareLink?: (inv: Invoice) => void;
  onConfirmPaymentClaim?: (inv: Invoice) => void;
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
  canWrite = true,
  sharedLinks = {},
  shareLoadingId,
  onToggleStatus,
  onRedownloadPdf,
  onEditInvoice,
  onDeleteInvoice,
  onOpenEmailModal,
  onCreateShareLink,
  onRevokeShareLink,
  onConfirmPaymentClaim,
}: InvoiceTableProps) {
  const filteredInvoices = invoices.filter((inv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const invNo = formatInvoiceNumber(inv, allInvoices).toLowerCase();
    const clientName = (inv.clientName || '').toLowerCase();
    return invNo.includes(q) || clientName.includes(q);
  });

  return (
    <div className="bg-surface-700 border-0 rounded-xl overflow-hidden">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoices..."
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
            <span>{showClosed ? 'Hide Closed' : `Closed (${closedCount})`}</span>
          </Button>
        )}
      </div>

      <div className="overflow-x-auto w-full max-w-full">
        <table className="w-full min-w-[960px] text-left border-collapse text-xs">
          <thead>
            <tr className="bg-surface-800 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
              <th className="py-3 px-4">Invoice</th>
              <th className="py-3 px-4">Client</th>
              <th className="py-3 px-4">Items</th>
              <th className="py-3 px-4 text-right">Amount</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-400/50">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-text-muted">
                  {searchQuery ? 'No matching invoices.' : 'No invoices yet.'}
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
                            ? 'Retainer'
                            : `${inv.reels.length} ${inv.reels.length === 1 ? 'item' : 'items'}`}
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
                      <div className="flex flex-col items-center gap-1">
                        <StatusBadge
                          status={inv.status}
                          onClick={() => onToggleStatus(inv.id)}
                          title={`Click to mark as ${inv.status === 'Paid' ? 'Pending' : 'Paid'}`}
                        />
                        {inv.status === 'Pending' && inv.paymentClaim && (
                          <button
                            type="button"
                            onClick={() => onConfirmPaymentClaim?.(inv)}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#FFB020] hover:text-[#FFC145] bg-[#1B1B22] border border-[#FFB020]/40 px-2 py-0.5 rounded cursor-pointer"
                            title="Client notified payment. Click to confirm Paid."
                          >
                            <CheckCircle2 size={10} />
                            <span>Confirm claim</span>
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap shrink-0">
                        {onCreateShareLink && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onCreateShareLink(inv)}
                            disabled={shareLoadingId === inv.id}
                            className="gap-1 whitespace-nowrap shrink-0 text-xs h-7"
                            title="Copy or rotate client payment link"
                          >
                            {shareLoadingId === inv.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : sharedLinks[inv.id] ? (
                              <Check size={12} className="text-[#2DD4A0]" />
                            ) : !canWrite ? (
                              <Lock size={11} />
                            ) : (
                              <Link2 size={12} />
                            )}
                            <span>{sharedLinks[inv.id] ? 'Copied link' : 'Share link'}</span>
                          </Button>
                        )}

                        {onRevokeShareLink && (inv.shareEnabled || sharedLinks[inv.id]) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onRevokeShareLink(inv)}
                            disabled={shareLoadingId === inv.id}
                            title="Revoke public invoice link"
                            className="h-7 w-7"
                          >
                            <Link2Off size={13} className="text-[#F0607A]" />
                          </Button>
                        )}

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onOpenEmailModal(inv)}
                          className="gap-1.5 whitespace-nowrap shrink-0 text-xs h-7 font-medium"
                          title="Send via Gmail"
                        >
                          {!canWrite ? <Lock size={11} /> : <Mail size={12} />}
                          <span>Send via Gmail</span>
                        </Button>

                        <Button variant="ghost" size="icon" onClick={() => onRedownloadPdf(inv)} disabled={downloadingPdfId === inv.id} title="Download PDF" className="h-7 w-7 border-0">
                          {downloadingPdfId === inv.id ? <Loader2 size={13} className="animate-spin text-text-muted" /> : <Download size={13} />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onEditInvoice(inv)} title="Edit Invoice" className="h-7 w-7 border-0">
                          {!canWrite ? <Lock size={12} /> : <Edit2 size={13} />}
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => onDeleteInvoice(inv.id)} title="Delete Invoice" className="h-7 w-7 border-0">
                          {!canWrite ? <Lock size={12} /> : <Trash2 size={13} />}
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
