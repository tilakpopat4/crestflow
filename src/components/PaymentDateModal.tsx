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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 dark:border-slate-700"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Calendar size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Payment Date
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
          Select the exact date you received the payment{invoiceNumber ? ` for Invoice #${invoiceNumber}` : ''}. This will be used for your monthly earning calculations.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Payment Received On
            </label>
            <DateInput
              value={dateStr}
              onChange={val => setDateStr(val)}
              required
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow"
            />
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer"
              >
                {isAlreadyPaid ? 'Update Date' : 'Confirm Paid'}
              </button>
            </div>
            {isAlreadyPaid && onUnmark && (
              <button
                type="button"
                onClick={onUnmark}
                className="w-full px-4 py-2 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition-colors border border-amber-200 dark:border-amber-800 cursor-pointer"
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
