import React, { useState } from 'react';
import { Check, X, Copy } from 'lucide-react';

export interface PaymentRowData {
  id: string;
  user_id: string;
  order_id: string;
  plan: string;
  amount: number;
  currency: string;
  status: string;
  utr?: string;
  payer_email?: string;
  admin_notes?: string;
  created_at: string;
}

interface PaymentApprovalRowProps {
  key?: React.Key;
  payment: PaymentRowData;
  isProcessing: boolean;
  onApprove: (orderId: string) => void;
  onReject: (orderId: string) => void;
}

/**
 * Payment row in the admin approval queue.
 * Adheres strictly to GEMINI.md: text status with 6px dot, no colored pills, 120ms transitions.
 */
export default function PaymentApprovalRow({
  payment,
  isProcessing,
  onApprove,
  onReject
}: PaymentApprovalRowProps) {
  const [copiedUtr, setCopiedUtr] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUtr(true);
    setTimeout(() => setCopiedUtr(false), 2000);
  };

  const getStatusMeta = (status: string) => {
    switch (status) {
      case 'SUCCESS':
      case 'ACTIVE':
        return { text: 'text-indigo-600 dark:text-indigo-400', dot: 'bg-indigo-600 dark:bg-indigo-400', label: 'Verified' };
      case 'PENDING_VERIFICATION':
        return { text: 'text-slate-600 dark:text-slate-300', dot: 'bg-slate-500 dark:bg-slate-400', label: 'Pending Review' };
      case 'REJECTED':
      case 'FAILED':
        return { text: 'text-red-600 dark:text-red-400', dot: 'bg-red-600 dark:bg-red-400', label: 'Rejected' };
      default:
        return { text: 'text-slate-500 dark:text-slate-400', dot: 'bg-slate-400', label: status };
    }
  };

  const statusMeta = getStatusMeta(payment.status);

  return (
    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors duration-120">
      <td className="p-4">
        <div className="font-mono text-slate-900 dark:text-slate-100 font-semibold text-sm">{payment.order_id}</div>
        <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
          {payment.payer_email || payment.user_id}
        </div>
      </td>
      <td className="p-4 font-bold text-slate-900 dark:text-slate-100 text-sm">
        ₹{payment.amount.toFixed(2)}
      </td>
      <td className="p-4">
        {payment.utr ? (
          <div className="inline-flex items-center gap-2 font-mono text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded text-xs">
            <span className="font-semibold">{payment.utr}</span>
            <button
              onClick={() => copyToClipboard(payment.utr!)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors duration-120 border-0 bg-transparent p-0 cursor-pointer"
              title="Copy UTR"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            {copiedUtr && (
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Copied</span>
            )}
          </div>
        ) : (
          <span className="text-slate-400 italic text-xs">No UTR</span>
        )}
        {payment.admin_notes && (
          <div className="text-xs text-slate-500 mt-1">
            Note: {payment.admin_notes}
          </div>
        )}
      </td>
      <td className="p-4 text-slate-500 dark:text-slate-400 text-xs">
        {new Date(payment.created_at).toLocaleString()}
      </td>
      <td className="p-4">
        <div className={`inline-flex items-center gap-1.5 text-sm font-medium ${statusMeta.text}`}>
          <span className={`w-2 h-2 rounded-full shrink-0 ${statusMeta.dot}`} />
          <span>{statusMeta.label}</span>
        </div>
      </td>
      <td className="p-4 text-right">
        {payment.status === 'PENDING_VERIFICATION' ? (
          <div className="inline-flex items-center gap-2">
            <button
              onClick={() => onApprove(payment.order_id)}
              disabled={isProcessing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm px-3 py-1.5 rounded-lg transition-colors duration-120 disabled:opacity-50 disabled:cursor-default inline-flex items-center gap-1.5 border-0 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Approve</span>
            </button>
            <button
              onClick={() => onReject(payment.order_id)}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs sm:text-sm px-3 py-1.5 rounded-lg transition-colors duration-120 disabled:opacity-50 disabled:cursor-default inline-flex items-center gap-1.5 border-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reject</span>
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-medium">Settled</span>
        )}
      </td>
    </tr>
  );
}
