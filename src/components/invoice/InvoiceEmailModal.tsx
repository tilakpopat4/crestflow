import React from 'react';
import { Mail, Copy, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';

interface InvoiceEmailModalProps {
  data: {
    isOpen: boolean;
    clientName: string;
    clientEmail: string;
    subject: string;
    body: string;
    mailtoLink: string;
    invoiceNo: string;
    totalAmount: number;
    pdfBlob?: Blob;
    pdfFilename?: string;
    gmailStatus?: { sending: boolean; success?: boolean; error?: string; messageId?: string };
  } | null;
  onClose: () => void;
  onSendGmail: () => Promise<void>;
  isSendingGmail: boolean;
}

/**
 * Modal to preview and dispatch invoice emails with attached PDF via Gmail.
 */
export function InvoiceEmailModal({
  data,
  onClose,
  onSendGmail,
  isSendingGmail,
}: InvoiceEmailModalProps) {
  if (!data || !data.isOpen) return null;

  const handleCopyBody = () => {
    navigator.clipboard.writeText(`Subject: ${data.subject}\n\n${data.body}`);
    alert('Email subject and body copied to clipboard!');
  };

  return (
    <Modal
      isOpen={data.isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-text-secondary" />
          <span>Send Invoice #{data.invoiceNo}</span>
        </span>
      }
      description={`Recipient: ${data.clientName} (${data.clientEmail || 'No email specified'})`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {data.gmailStatus?.success && (
          <div className="p-3 bg-surface-800 border border-surface-400 rounded-lg flex items-center gap-2 text-xs text-text-primary">
            <CheckCircle2 size={16} className="text-text-secondary shrink-0" />
            <span>Email with invoice PDF attachment successfully sent via Gmail!</span>
          </div>
        )}

        {data.gmailStatus?.error && (
          <div className="p-3 bg-surface-800 border border-accent/60 rounded-lg flex items-start gap-2 text-xs text-accent">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="font-semibold block">Failed to send via Gmail:</span>
              <span>{data.gmailStatus.error}</span>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-semibold text-text-secondary">Subject</label>
          <div className="p-2.5 bg-surface-800 border border-surface-400 rounded-lg text-xs font-mono text-text-primary">
            {data.subject}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-text-secondary">Message Body</label>
          <div className="p-3 bg-surface-800 border border-surface-400 rounded-lg text-xs text-text-secondary font-mono whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
            {data.body}
          </div>
        </div>

        {data.pdfFilename && (
          <div className="p-2.5 bg-surface-800 border border-surface-400 rounded-lg flex items-center justify-between text-xs text-text-secondary">
            <span>Attachment: <strong className="text-text-primary font-mono">{data.pdfFilename}</strong></span>
            <span className="text-[11px] text-text-muted font-mono">PDF Ready</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-400/70">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyBody}
            className="gap-1.5"
          >
            <Copy size={13} />
            <span>Copy Text</span>
          </Button>

          <div className="flex items-center gap-2">
            <a
              href={data.mailtoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-500 hover:bg-surface-400 text-text-primary rounded-lg text-xs font-semibold transition-colors border border-surface-400"
            >
              <Mail size={13} />
              <span>Mail App</span>
            </a>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onSendGmail}
              disabled={isSendingGmail || !data.clientEmail}
              className="gap-1.5"
            >
              {isSendingGmail ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send size={13} />
                  <span>Send via Gmail</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default InvoiceEmailModal;
