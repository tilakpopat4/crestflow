import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { generateUpiQrCodeDataUrl, isValidUpiId } from '../../lib/upiQr';
import { formatCurrencyAmount } from '../../lib/currencyUtils';
import { PublicInvoicePaymentBox } from './PublicInvoicePaymentBox';

interface PublicInvoiceData {
  id: string;
  invoiceNumber?: string;
  date: number;
  clientName: string;
  currency?: string;
  reels: Array<{ id: string; title: string; quantity: number; rate: number; subClientName?: string }>;
  totalAmount: number;
  status: 'Pending' | 'Paid';
  discountAmount?: number;
  extraCostAmount?: number;
  lastPaymentDate?: number;
  payeeName?: string;
  payeeUpiId?: string;
  paymentClaim?: { claimedAt: number; claimedBy?: string; note?: string; reference?: string } | null;
}

interface PublicInvoicePageProps {
  invoiceId: string;
  token: string;
}

/**
 * Token-scoped client-facing invoice & UPI payment view (/invoice/:id?t=...).
 */
export function PublicInvoicePage({ invoiceId, token }: PublicInvoicePageProps) {
  const [invoice, setInvoice] = useState<PublicInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow, noarchive';
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadInvoice = async () => {
      setLoading(true);
      setError(null);
      if (!invoiceId || !token) {
        setError('This invoice link is incomplete or invalid.');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/public-invoice?id=${encodeURIComponent(invoiceId)}&t=${encodeURIComponent(token)}`,
        );
        const data = (await res.json().catch(() => ({}))) as { invoice?: PublicInvoiceData };
        if (!res.ok || !data.invoice) {
          if (active) setError('This invoice link is unavailable or has been revoked.');
        } else if (active) {
          setInvoice(data.invoice);
        }
      } catch {
        if (active) setError('Unable to load invoice details right now.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadInvoice();
    return () => {
      active = false;
    };
  }, [invoiceId, token]);

  useEffect(() => {
    if (!invoice || invoice.status === 'Paid') {
      setQrUrl(null);
      return;
    }
    const upi = invoice.payeeUpiId?.trim() || '';
    if (!isValidUpiId(upi) || invoice.totalAmount <= 0) {
      setQrUrl(null);
      return;
    }
    let cancelled = false;
    generateUpiQrCodeDataUrl(upi, invoice.payeeName || 'Creator', invoice.totalAmount, invoice.invoiceNumber || invoice.id)
      .then((res) => {
        if (!cancelled) setQrUrl(res.pngDataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [invoice]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] text-[#F7F7F8] flex items-center justify-center p-6">
        <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
          <Loader2 size={16} className="animate-spin" />
          <span>Loading invoice...</span>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] text-[#F7F7F8] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl bg-[#131318] border border-[#2A2A33] p-6 text-center space-y-3">
          <AlertCircle size={24} className="text-[#F0607A] mx-auto" />
          <h1 className="text-base font-semibold text-[#F7F7F8]">Invoice link unavailable</h1>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            {error || 'Ask your freelancer to share a new invoice payment link.'}
          </p>
        </div>
      </div>
    );
  }

  const isPaid = invoice.status === 'Paid';
  const currency = invoice.currency || 'INR';

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-[#F7F7F8] py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto rounded-xl bg-[#131318] border border-[#2A2A33] overflow-hidden">
        <div className="p-6 border-b border-[#2A2A33] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
              Invoice {invoice.invoiceNumber || invoice.id.slice(0, 8)}
            </div>
            <h1 className="text-lg font-semibold text-[#F7F7F8]">
              {invoice.payeeName || 'Freelancer Invoice'}
            </h1>
            <p className="text-xs text-[#A1A1AA]">
              Billed to <span className="text-[#F7F7F8] font-medium">{invoice.clientName}</span> &middot;{' '}
              {new Date(invoice.date).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                isPaid ? 'text-[#2DD4A0]' : 'text-[#FFB020]'
              }`}
            >
              {isPaid ? <CheckCircle2 size={14} /> : <Clock size={14} />}
              <span>{isPaid ? 'Paid' : 'Pending payment'}</span>
            </span>
            <div className="font-anton-display text-2xl sm:text-3xl text-[#FFC145] tabular-figures">
              {formatCurrencyAmount(invoice.totalAmount, currency)}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#2A2A33] text-[#A1A1AA]">
                <th className="py-2 font-semibold">Item</th>
                <th className="py-2 font-semibold text-right">Qty</th>
                <th className="py-2 font-semibold text-right">Rate</th>
                <th className="py-2 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A33]">
              {invoice.reels.map((item) => (
                <tr key={item.id}>
                  <td className="py-2.5 pr-3 text-[#F7F7F8]">
                    <div>{item.title}</div>
                    {item.subClientName && (
                      <div className="text-[11px] text-[#A1A1AA]">{item.subClientName}</div>
                    )}
                  </td>
                  <td className="py-2.5 text-right tabular-figures text-[#A1A1AA]">{item.quantity}</td>
                  <td className="py-2.5 text-right tabular-figures text-[#A1A1AA]">
                    {formatCurrencyAmount(item.rate, currency)}
                  </td>
                  <td className="py-2.5 text-right tabular-figures font-medium text-[#F7F7F8]">
                    {formatCurrencyAmount(item.quantity * item.rate, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!isPaid && (
            <PublicInvoicePaymentBox
              invoiceId={invoice.id}
              invoiceNumber={invoice.invoiceNumber}
              payeeName={invoice.payeeName}
              payeeUpiId={invoice.payeeUpiId}
              totalAmount={invoice.totalAmount}
              qrUrl={qrUrl}
              hasClaim={Boolean(invoice.paymentClaim)}
              onClaimSubmitted={(claim) => setInvoice((prev) => (prev ? { ...prev, paymentClaim: claim } : prev))}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default PublicInvoicePage;
