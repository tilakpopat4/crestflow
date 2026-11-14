import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { DateInput } from './DateInput';
import { formatLocalDateToYMD, parseYMDToTimestamp } from '../lib/dateUtils';

interface PaymentDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: number) => void;
  onUnmark?: () => void;
  defaultDate?: number;
  invoiceNumber?: string;
  isAlreadyPaid?: boolean;
}

export default function PaymentDateModal({
  isOpen,
  onClose,
  onConfirm,
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
      onConfirm(parseYMDToTimestamp(dateStr));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 animate-in fade-in select-none">
      <div 
        className="bg-[#212121] rounded-xl w-full max-w-sm p-6 shadow-2xl border border-[#333333] text-white"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#282828] text-white rounded-lg border border-[#383838]">
              <Calendar size={20} />
            </div>
            <h3 className="text-lg font-bold text-white">
              Payment Date
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-[#aaaaaa] hover:text-white p-1.5 rounded-lg bg-[#282828] hover:bg-[#333333] border border-[#383838] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-[#aaaaaa] mb-5 leading-relaxed">
          Select the exact date you received the payment{invoiceNumber ? ` for Invoice #${invoiceNumber}` : ''}. This will be used for your monthly earning calculations.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#cccccc] block">
              Payment Received On
            </label>
            <DateInput
              value={dateStr}
              onChange={val => setDateStr(val)}
              required
              className="px-3 py-2.5 bg-[#282828] border border-[#383838] rounded-xl text-sm font-medium text-white outline-none focus:border-slate-500 transition-colors"
            />
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-[#aaaaaa] hover:text-white bg-[#282828] hover:bg-[#333333] border border-[#383838] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-[#282828] hover:bg-[#333333] text-white border border-[#444444] rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                {isAlreadyPaid ? 'Update Date' : 'Confirm Paid'}
              </button>
            </div>
            {isAlreadyPaid && onUnmark && (
              <button
                type="button"
                onClick={onUnmark}
                className="w-full px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
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
