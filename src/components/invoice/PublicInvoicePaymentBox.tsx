import React, { useState } from 'react';
import { Copy, ExternalLink, Check } from 'lucide-react';
import { buildUpiPaymentUri, isValidUpiId } from '../../lib/upiQr';

interface PublicInvoicePaymentBoxProps {
  invoiceId: string;
  invoiceNumber?: string;
  payeeName?: string;
  payeeUpiId?: string;
  totalAmount: number;
  qrUrl: string | null;
  hasClaim: boolean;
  onClaimSubmitted: (claim: { claimedAt: number; claimedBy?: string; note?: string; reference?: string }) => void;
}

/**
 * UPI QR payment panel and "I've paid" claim form on public token-scoped invoice view.
 */
export function PublicInvoicePaymentBox({
  invoiceId,
  invoiceNumber,
  payeeName,
  payeeUpiId,
  totalAmount,
  qrUrl,
  hasClaim,
  onClaimSubmitted,
}: PublicInvoicePaymentBoxProps) {
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimName, setClaimName] = useState('');
  const [claimRef, setClaimRef] = useState('');
  const [claimNote, setClaimNote] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const searchToken =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('t') || '' : '';

  const upiUri =
    payeeUpiId && isValidUpiId(payeeUpiId)
      ? buildUpiPaymentUri(payeeUpiId, payeeName || 'Creator', totalAmount, invoiceNumber || invoiceId)
      : '';

  const handleCopyUpi = async () => {
    if (!payeeUpiId) return;
    try {
      await navigator.clipboard.writeText(payeeUpiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    } catch {}
  };

  const handleClaimPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingClaim(true);
    setClaimError(null);
    try {
      const res = await fetch('/api/public-invoice/claim-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId,
          token: searchToken,
          claimedBy: claimName.trim(),
          referenceNote: claimRef.trim(),
          reference: claimRef.trim(),
          note: claimNote.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        paymentClaim?: { claimedAt: number; claimedBy?: string; note?: string; reference?: string };
        error?: string;
      };
      if (!res.ok || !data.success) {
        setClaimError(data.error || 'Could not record payment notification.');
      } else {
        onClaimSubmitted(data.paymentClaim || { claimedAt: Date.now() });
        setClaimOpen(false);
      }
    } catch {
      setClaimError('Network error submitting confirmation.');
    } finally {
      setSubmittingClaim(false);
    }
  };

  return (
    <div className="space-y-4">
      {payeeUpiId && (
        <div className="rounded-xl bg-[#1B1B22] border border-[#2A2A33] p-5 flex flex-col sm:flex-row items-center justify-between gap-5">
          {qrUrl && (
            <div className="bg-[#131318] p-2.5 rounded-lg shrink-0">
              <img src={qrUrl} alt="UPI Payment QR" className="w-36 h-36 block" />
            </div>
          )}
          <div className="flex-1 space-y-3 text-center sm:text-left">
            <div className="text-xs font-semibold text-[#F7F7F8]">Pay directly via UPI</div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <code className="text-xs text-[#F7F7F8] bg-[#131318] border border-[#2A2A33] px-2.5 py-1 rounded">
                {payeeUpiId}
              </code>
              <button
                type="button"
                onClick={handleCopyUpi}
                aria-label="Copy UPI ID"
                className="p-1.5 rounded bg-[#131318] border border-[#2A2A33] text-[#A1A1AA] hover:text-[#F7F7F8] cursor-pointer"
              >
                {copiedUpi ? <Check size={13} className="text-[#2DD4A0]" /> : <Copy size={13} />}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              {upiUri && (
                <a
                  href={upiUri}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg cf-btn-primary text-xs font-semibold no-underline"
                >
                  <ExternalLink size={13} />
                  <span>Pay with UPI app</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => setClaimOpen(true)}
                className="px-3.5 py-2 rounded-lg bg-[#131318] hover:bg-[#2A2A33] border border-[#2A2A33] text-xs font-semibold text-[#F7F7F8] cursor-pointer"
              >
                I&apos;ve paid
              </button>
            </div>
          </div>
        </div>
      )}

      {hasClaim && (
        <div className="rounded-lg bg-[#1B1B22] border border-[#FFB020]/40 p-3.5 text-xs text-[#F7F7F8]">
          <span className="font-semibold text-[#FFB020]">Payment claim recorded.</span>{' '}
          Awaiting freelancer confirmation before marking this invoice Paid.
        </div>
      )}

      {claimOpen && (
        <form onSubmit={handleClaimPaid} className="rounded-xl bg-[#1B1B22] border border-[#2A2A33] p-4 space-y-3">
          <div className="text-xs font-semibold text-[#F7F7F8]">Confirm your UPI payment</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={claimName}
              onChange={(e) => setClaimName(e.target.value)}
              placeholder="Your name (optional)"
              className="px-3 py-2 rounded-lg text-xs"
            />
            <input
              type="text"
              value={claimRef}
              onChange={(e) => setClaimRef(e.target.value)}
              placeholder="UPI UTR / transaction ID (optional)"
              className="px-3 py-2 rounded-lg text-xs"
            />
          </div>
          <input
            type="text"
            value={claimNote}
            onChange={(e) => setClaimNote(e.target.value)}
            placeholder="Note for freelancer (optional)"
            className="w-full px-3 py-2 rounded-lg text-xs"
          />
          {claimError && <p className="text-xs text-[#F0607A]">{claimError}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setClaimOpen(false)}
              className="px-3 py-1.5 rounded-lg bg-[#131318] border border-[#2A2A33] text-xs text-[#A1A1AA] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingClaim}
              className="px-4 py-1.5 rounded-lg cf-btn-primary text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {submittingClaim ? 'Sending...' : 'Notify freelancer'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
