import React from 'react';
import { X } from 'lucide-react';
import { EmailRecord } from './AdminEmailHistoryTable';

interface AdminEmailDetailModalProps {
  email: EmailRecord | null;
  onClose: () => void;
  formatDate: (timestamp?: number) => string;
}

/**
 * Inspection modal for examining full raw payload, error codes, and delivery timestamps.
 * Strictly adheres to GEMINI.md design standards: flat, restrained, no emojis.
 */
export default function AdminEmailDetailModal({ email, onClose, formatDate }: AdminEmailDetailModalProps) {
  if (!email) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-lg w-full space-y-4 border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
            Email Dispatch Details
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
            <span className="text-slate-500">Job ID</span>
            <span className="font-mono text-slate-900 dark:text-slate-100">{email.jobId}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
            <span className="text-slate-500">Recipient</span>
            <span className="font-mono text-slate-900 dark:text-slate-100">{email.recipient}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
            <span className="text-slate-500">Subject</span>
            <span className="text-slate-900 dark:text-slate-100">{email.subject || '—'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
            <span className="text-slate-500">Event Trigger</span>
            <span className="font-mono text-slate-900 dark:text-slate-100">{email.eventType}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
            <span className="text-slate-500">Delivery Status</span>
            <span className="font-medium capitalize text-slate-900 dark:text-slate-100">{email.status}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
            <span className="text-slate-500">Provider Message ID</span>
            <span className="font-mono text-slate-900 dark:text-slate-100">{email.providerMessageId || '—'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
            <span className="text-slate-500">Created At</span>
            <span className="text-slate-900 dark:text-slate-100">{formatDate(email.createdAt)}</span>
          </div>
          {email.sentAt && (
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
              <span className="text-slate-500">Delivered At</span>
              <span className="text-slate-900 dark:text-slate-100">{formatDate(email.sentAt)}</span>
            </div>
          )}
          {email.lastErrorCode && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/40 rounded border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 font-mono text-[11px] break-all">
              {email.lastErrorCode}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#282828] hover:bg-[#383838] text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
