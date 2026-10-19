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
      <td className="p-3">
        <div className="font-mono text-slate-900 dark:text-slate-100 font-medium">{payment.order_id}</div>
        <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
          {payment.payer_email || payment.user_id}
        </div>
      </td>
      <td className="p-3 font-medium text-slate-900 dark:text-slate-100">
        ₹{payment.amount.toFixed(2)}
      </td>
      <td className="p-3">
        {payment.utr ? (
          <div className="inline-flex items-center gap-1.5 font-mono text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
            <span>{payment.utr}</span>
            <button
              onClick={() => copyToClipboard(payment.utr!)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors duration-120 border-0 bg-transparent p-0 cursor-pointer"
              title="Copy UTR"
            >
              <Copy className="w-3 h-3" />
            </button>
            {copiedUtr && (
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400">Copied</span>
            )}
          </div>
        ) : (
          <span className="text-slate-400 italic">No UTR</span>
        )}
        {payment.admin_notes && (
          <div className="text-[10px] text-slate-500 mt-0.5">
            Note: {payment.admin_notes}
          </div>
        )}
      </td>
      <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px]">
        {new Date(payment.created_at).toLocaleString()}
      </td>
      <td className="p-3">
        <div className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${statusMeta.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusMeta.dot}`} />
          <span>{statusMeta.label}</span>
        </div>
      </td>
      <td className="p-3 text-right">
        {payment.status === 'PENDING_VERIFICATION' ? (
          <div className="inline-flex items-center gap-1.5">
            <button
              onClick={() => onApprove(payment.order_id)}
              disabled={isProcessing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-2.5 py-1.5 rounded-lg transition-colors duration-120 disabled:opacity-50 disabled:cursor-default inline-flex items-center gap-1 border-0 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Approve</span>
            </button>
            <button
              onClick={() => onReject(payment.order_id)}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700 text-white font-medium text-xs px-2.5 py-1.5 rounded-lg transition-colors duration-120 disabled:opacity-50 disabled:cursor-default inline-flex items-center gap-1 border-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reject</span>
            </button>
          </div>
        ) : (
          <span className="text-[11px] text-slate-400">Settled</span>
        )}
      </td>
    </tr>
  );
}
