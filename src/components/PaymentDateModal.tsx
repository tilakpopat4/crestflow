import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';

interface PaymentDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: number) => void;
  defaultDate?: number;
  invoiceNumber?: string;
}

export default function PaymentDateModal({
  isOpen,
  onClose,
  onConfirm,
  defaultDate,
  invoiceNumber
}: PaymentDateModalProps) {
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const d = defaultDate ? new Date(defaultDate) : new Date();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setDateStr(`${d.getFullYear()}-${month}-${day}`);
    }
  }, [isOpen, defaultDate]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (dateStr) {
      // Use local timezone to parse the date string (YYYY-MM-DD)
      const parts = dateStr.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
      onConfirm(d.getTime());
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div 
        className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <Calendar size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Payment Date
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          Select the exact date you received the payment{invoiceNumber ? ` for Invoice #${invoiceNumber}` : ''}. This will be used for your monthly earning calculations.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Payment Received On
            </label>
            <input
              type="date"
              value={dateStr}
              onChange={e => setDateStr(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              Confirm Paid
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
