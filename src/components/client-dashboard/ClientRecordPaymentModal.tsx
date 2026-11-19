import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { DateInput } from '../DateInput';
import { Client } from '../../types';
import { formatCurrencyAmount } from '../../lib/currencyUtils';
import { formatLocalDateToYMD } from '../../lib/dateUtils';

interface ClientRecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  pendingInvoicesCount: number;
  pendingInvoiceTotal: number;
  onSave: (paymentDate: string, markPaid: boolean) => Promise<void>;
}

/**
 * Modal to record when a client last paid and update the 30-day payment cycle.
 */
export function ClientRecordPaymentModal({
  isOpen,
  onClose,
  client,
  pendingInvoicesCount,
  pendingInvoiceTotal,
  onSave,
}: ClientRecordPaymentModalProps) {
  const [paymentDate, setPaymentDate] = useState<string>(
    formatLocalDateToYMD(new Date())
  );
  const [markPendingAsPaid, setMarkPendingAsPaid] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(paymentDate, markPendingAsPaid);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Previous Payment Date"
      description="Recording the date when this client last paid updates the 30-day payment cycle. The next due date will automatically shift 30 days after this date."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-secondary">
            Payment Received Date *
          </label>
          <DateInput
            required
            value={paymentDate}
            onChange={(val) => setPaymentDate(val)}
            className="border border-surface-400 rounded-lg p-2.5 text-sm bg-surface-800 text-text-primary outline-none focus:border-surface-300 font-mono"
          />
        </div>

        {pendingInvoicesCount > 0 && (
          <div className="p-3 bg-surface-800 rounded-lg border border-surface-400 flex items-start gap-2.5 text-xs text-text-secondary">
            <input
              type="checkbox"
              id="markPaidCheckbox"
              checked={markPendingAsPaid}
              onChange={(e) => setMarkPendingAsPaid(e.target.checked)}
              className="mt-0.5 rounded border-surface-400 accent-accent cursor-pointer"
            />
            <label htmlFor="markPaidCheckbox" className="cursor-pointer font-medium leading-relaxed">
              Also mark all <span className="font-mono">{pendingInvoicesCount}</span> pending invoice(s) (
              <span className="font-mono tabular-nums text-text-primary font-semibold">
                {formatCurrencyAmount(pendingInvoiceTotal, client.currency)}
              </span>
              ) as Paid
            </label>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-400/60">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save & Update Cycle'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default ClientRecordPaymentModal;
