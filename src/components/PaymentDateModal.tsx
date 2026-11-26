import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { DateInput } from './DateInput';
import { formatLocalDateToYMD, parseYMDToTimestamp } from '../lib/dateUtils';

interface PaymentDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (date: number) => void;
  onConfirmPayment?: (invoiceId: string, timestamp: number) => Promise<void> | void;
  invoiceId?: string;
  onUnmark?: () => void;
  defaultDate?: number;
  invoiceNumber?: string;
  isAlreadyPaid?: boolean;
}

export default function PaymentDateModal({
  isOpen,
  onClose,
  onConfirm,
  onConfirmPayment,
  invoiceId,
  onUnmark,
  defaultDate,
  invoiceNumber,
  isAlreadyPaid
}: PaymentDateModalProps) {
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setDateStr(formatLocalDateToYMD(defaultDate || new Date()));
    }
  }, [isOpen, defaultDate]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (dateStr) {
      const ts = parseYMDToTimestamp(dateStr);
      if (onConfirmPayment && invoiceId) {
        onConfirmPayment(invoiceId, ts);
      } else if (onConfirm) {
        onConfirm(ts);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/25 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in select-none">
      <div 
        className="bg-[#131318] rounded-xl w-full max-w-sm p-6 shadow-2xl border border-[#2A2A33] text-white"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#1B1B22] text-white rounded-lg border border-[#2A2A33]">
              <Calendar size={20} />
            </div>
            <h3 className="text-lg font-bold text-white">
              Payment Date
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-[#A1A1AA] hover:text-white p-1.5 rounded-lg bg-[#1B1B22] hover:bg-[#2A2A33] border border-[#2A2A33] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-[#A1A1AA] mb-5 leading-relaxed">
          Select the exact date you received the payment{invoiceNumber ? ` for Invoice #${invoiceNumber}` : ''}. This will be used for your monthly earning calculations.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#A1A1AA] block">
              Payment Received On
            </label>
            <DateInput
              value={dateStr}
              onChange={val => setDateStr(val)}
              required
              className="px-3 py-2.5 bg-[#1B1B22] border border-[#2A2A33] rounded-xl text-sm font-medium text-white outline-none focus:border-[#2A2A33] transition-colors"
            />
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-[#A1A1AA] hover:text-white bg-[#1B1B22] hover:bg-[#2A2A33] border border-[#2A2A33] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-[#1B1B22] hover:bg-[#2A2A33] text-white border border-[#2A2A33] rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                {isAlreadyPaid ? 'Update Date' : 'Confirm Paid'}
              </button>
            </div>
            {isAlreadyPaid && onUnmark && (
              <button
                type="button"
                onClick={onUnmark}
                className="w-full px-4 py-2 text-sm font-semibold text-[#A1A1AA] dark:text-[#A1A1AA] hover:bg-[#131318] dark:hover:bg-[#1B1B22] rounded-xl transition-colors border border-[#2A2A33] dark:border-[#2A2A33] cursor-pointer"
              >
                Mark as Pending (Unpaid)
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
