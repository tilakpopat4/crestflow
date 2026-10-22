/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { X, Printer, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Invoice, Client, UserProfile } from '../../types';
import Logo from '../Logo';
import StatusBadge from '../StatusBadge';
import { generateUPILink } from '../../lib/paymentUtils';

interface ClientPortalInvoiceModalProps {
  invoice: Invoice;
  currentClient: Client | null;
  userEmail: string | null;
  freelancerProfile: UserProfile | null;
  onClose: () => void;
}

/**
 * Responsive modal for inspecting invoice details and issuing UPI payment.
 * Accommodates mobile viewports (320px+) with scrollable contents and touch targets.
 */
export const ClientPortalInvoiceModal: React.FC<ClientPortalInvoiceModalProps> = ({
  invoice,
  currentClient,
  userEmail,
  freelancerProfile,
  onClose,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const payeeUpi = invoice.payeeUpiId || freelancerProfile?.upiId || '';
  const payeeName = invoice.payeeName || freelancerProfile?.name || 'Freelancer';
  const upiLink = payeeUpi ? generateUPILink(payeeUpi, payeeName, invoice.totalAmount) : '';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-modal-title"
      className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-lg max-w-xl w-full border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Logo className="w-6 h-6 rounded-md" />
            <span id="invoice-modal-title" className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
              Invoice Details
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close invoice details"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                Billed To
              </span>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
                {currentClient?.name || 'Client'}
              </div>
              <div className="text-slate-500 dark:text-slate-400 text-xs truncate">{userEmail}</div>
            </div>

            <div className="text-right">
              <span className="text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                Invoice Date
              </span>
              <div className="font-mono text-slate-900 dark:text-slate-100 font-semibold mt-0.5">
                {new Date(invoice.date).toLocaleDateString()}
              </div>
              <div className="mt-1 flex justify-end">
                <StatusBadge status={invoice.status} />
              </div>
            </div>
          </div>

          {/* Line items table with fluid mobile columns */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoice.reels?.map((reel, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                      {reel.title}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-300">
                      {reel.quantity}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300 text-right">
                      ₹{reel.rate}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 dark:text-slate-100 text-right">
                      ₹{(reel.quantity * reel.rate).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-3">
            {invoice.discountAmount && invoice.discountAmount > 0 ? (
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Discount:</span>
                <span>-₹{invoice.discountAmount}</span>
              </div>
            ) : null}
            {invoice.extraCostAmount && invoice.extraCostAmount > 0 ? (
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Extra Costs ({invoice.extraCostDescription || 'Additional'}):</span>
                <span>+₹{invoice.extraCostAmount}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>Total Amount:</span>
              <span>₹{invoice.totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* UPI Payment Option if Pending */}
          {invoice.status === 'Pending' && payeeUpi && (
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3.5 sm:p-4 flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
              <div className="w-24 h-24 bg-white p-2 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center">
                <QRCodeSVG
                  value={upiLink}
                  size={80}
                  level="M"
                  className="w-full h-full"
                />
              </div>
              <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Scan & Pay via any UPI App
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                  UPI ID: {payeeUpi}
                </div>
                <a
                  href={upiLink}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors min-h-[44px] w-full sm:w-auto"
                >
                  <QrCode size={14} />
                  <span>Pay with UPI App</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-3 sm:p-4 flex items-center justify-end gap-2 bg-slate-50/50 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[44px] px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer size={14} />
            <span>Print Invoice</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
