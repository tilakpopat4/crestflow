import React from 'react';
import { Mail, Copy } from 'lucide-react';
import { Client, Invoice } from '../../types';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatInvoiceNumber } from '../../lib/invoiceUtils';
import { formatCurrencyAmount } from '../../lib/currencyUtils';
import { generateInvoiceEmailDetails } from '../../lib/paymentUtils';

interface ClientInvoicesTabProps {
  client: Client;
  clientInvoices: Invoice[];
  invoices: Invoice[];
  onUpdateInvoice: (inv: Invoice) => Promise<void>;
  onUpdateClient: (client: Client) => Promise<void>;
}

/**
 * Invoices tab view for a client.
 * Displays invoice records, status toggle, and email sharing triggers.
 */
export function ClientInvoicesTab({
  client,
  clientInvoices,
  invoices,
  onUpdateInvoice,
  onUpdateClient,
}: ClientInvoicesTabProps) {
  const handleToggleStatus = async (inv: Invoice) => {
    const newStatus = inv.status === 'Paid' ? 'Pending' : 'Paid';
    await onUpdateInvoice({ ...inv, status: newStatus });
    if (newStatus === 'Paid') {
      const pDate = inv.date || Date.now();
      await onUpdateClient({ ...client, lastPaymentDate: pDate });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 w-full min-w-0">
      <div className="flex justify-between items-center">
        <h3 className="text-base sm:text-lg font-semibold text-text-primary">Invoices</h3>
      </div>

      <div className="overflow-x-auto w-full max-w-full rounded-lg border border-surface-400/80 bg-surface-800">
        <table className="w-full min-w-[540px] sm:min-w-[620px] text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-surface-400/80 bg-surface-700/60 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
              <th className="p-3">Invoice Date</th>
              <th className="p-3">Line Items</th>
              <th className="p-3 text-right">Total Amount</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Email Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-400/50">
            {clientInvoices.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-text-muted">
                  No invoices generated for this client yet.
                </td>
              </tr>
            ) : (
              clientInvoices.map((inv) => {
                const emailData = generateInvoiceEmailDetails(client, inv, null);

                return (
                  <tr key={inv.id} className="hover:bg-surface-700/50 transition-colors">
                    <td className="py-3 px-3 text-text-secondary whitespace-nowrap min-w-[130px]">
                      <div className="font-semibold text-text-primary font-mono tabular-nums">
                        {formatInvoiceNumber(inv, invoices)}
                      </div>
                      <div className="text-[11px] text-text-muted mt-0.5 font-mono tabular-nums">
                        {new Date(inv.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-text-primary min-w-[180px] max-w-[240px]">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="font-medium text-text-primary">
                          {inv.invoiceType === 'monthly_retainer'
                            ? '1 Retainer'
                            : `${inv.reels.length} item(s)`}
                        </span>
                        {inv.invoiceType === 'monthly_retainer' && (
                          <span className="text-[11px] text-text-muted">
                            Monthly Retainer
                          </span>
                        )}
                      </div>
                      <div
                        className="text-[11px] text-text-muted truncate max-w-[220px] mt-0.5"
                        title={inv.reels.map((r) => r.title).join(', ')}
                      >
                        {inv.reels.map((r) => r.title).join(', ')}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-text-primary whitespace-nowrap min-w-[100px] font-mono tabular-nums">
                      {formatCurrencyAmount(inv.totalAmount, client.currency)}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap min-w-[80px]">
                      <StatusBadge
                        status={inv.status}
                        onClick={() => handleToggleStatus(inv)}
                        title={`Click to mark as ${
                          inv.status === 'Paid' ? 'Pending' : 'Paid & update last payment date'
                        }`}
                      />
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap min-w-[170px]">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap shrink-0">
                        <a
                          href={emailData.mailtoLink}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-500 hover:bg-surface-400 text-text-primary rounded-lg text-xs font-semibold transition-colors border border-surface-400 whitespace-nowrap shrink-0"
                          title="Send Email for this Invoice"
                        >
                          <Mail size={12} />
                          <span>Send Email</span>
                        </a>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `Subject: ${emailData.subject}\n\n${emailData.body}`
                            );
                            alert(`Invoice email details for ${client.name} copied to clipboard!`);
                          }}
                          title="Copy Email Text to Clipboard"
                        >
                          <Copy size={13} />
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

export default ClientInvoicesTab;
