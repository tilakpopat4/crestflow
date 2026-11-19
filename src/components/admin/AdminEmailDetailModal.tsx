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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-sm select-none">
      <div className="bg-surface-700 rounded-xl p-6 max-w-lg w-full space-y-4 border border-surface-400 shadow-xl text-text-primary">
        <div className="flex items-center justify-between border-b border-surface-400/80 pb-3">
          <h4 className="font-semibold text-sm text-text-primary">
            Email Dispatch Details
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary p-1 rounded-lg hover:bg-surface-600 transition-colors cursor-pointer border-0 bg-transparent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5 text-xs text-text-primary">
          <div className="flex justify-between py-1 border-b border-surface-400/50">
            <span className="text-text-secondary">Job ID</span>
            <span className="font-mono text-text-primary">{email.jobId}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-surface-400/50">
            <span className="text-text-secondary">Recipient</span>
            <span className="font-mono text-text-primary">{email.recipient}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-surface-400/50">
            <span className="text-text-secondary">Subject</span>
            <span className="text-text-primary">{email.subject || '—'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-surface-400/50">
            <span className="text-text-secondary">Event Trigger</span>
            <span className="font-mono text-text-primary">{email.eventType}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-surface-400/50">
            <span className="text-text-secondary">Delivery Status</span>
            <span className="font-medium capitalize text-text-primary">{email.status}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-surface-400/50">
            <span className="text-text-secondary">Provider Message ID</span>
            <span className="font-mono text-text-primary">{email.providerMessageId || '—'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-surface-400/50">
            <span className="text-text-secondary">Created At</span>
            <span className="text-text-primary">{formatDate(email.createdAt)}</span>
          </div>
          {email.sentAt && (
            <div className="flex justify-between py-1 border-b border-surface-400/50">
              <span className="text-text-secondary">Delivered At</span>
              <span className="text-text-primary">{formatDate(email.sentAt)}</span>
            </div>
          )}
          {email.lastErrorCode && (
            <div className="p-2.5 bg-surface-800 rounded border border-accent/40 text-accent font-mono text-[11px] break-all">
              {email.lastErrorCode}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#4870aa] hover:bg-[#3b5e90] text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors border-0"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

