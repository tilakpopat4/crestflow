import React from 'react';
import { Check, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { PaymentSessionResult } from '../../lib/youpiService';

interface PaymentQrStepProps {
  session: PaymentSessionResult;
  merchantVpa: string;
  remainingSeconds: number;
  copiedVpa: boolean;
  onCopyVpa: () => void;
  formatTimer: (seconds: number) => string;
  onCancel: () => void;
}

export const PaymentQrStep: React.FC<PaymentQrStepProps> = ({
  session,
  merchantVpa,
  remainingSeconds,
  copiedVpa,
  onCopyVpa,
  formatTimer,
  onCancel
}) => {
  return (
    <div className="space-y-4">
      {/* Queue Allocation & Countdown Header */}
      <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-600" />
          <span className="font-medium text-slate-800 dark:text-slate-200">
            Queue Slot #1 Allocated
          </span>
        </div>
        <div className="font-mono text-xs">
          {remainingSeconds > 0 ? (
            <span className="text-slate-600 dark:text-slate-400">
              Slot active for{' '}
              <strong className="font-semibold text-slate-900 dark:text-white">
                {formatTimer(remainingSeconds)}
              </strong>
            </span>
          ) : (
            <span className="text-red-600 dark:text-red-400 font-semibold">Session Expired</span>
          )}
        </div>
      </div>

      {/* QR and Payment Details */}
      <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
        {/* QR Code Container */}
        <div className="p-3 bg-white rounded-lg border border-slate-200 shrink-0 shadow-xs">
          <QRCodeSVG
            value={session.upiIntentUrl}
            size={150}
            level="M"
            includeMargin={false}
          />
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2.5">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Subscription Fee
            </span>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              ₹{session.amount} <span className="text-xs font-normal text-slate-500">/ month</span>
            </p>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Order: {session.orderId}
            </p>
          </div>

          {/* UPI VPA Copy */}
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <span className="text-xs text-slate-600 dark:text-slate-300 font-mono bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
              {merchantVpa}
            </span>
            <button
              type="button"
              onClick={onCopyVpa}
              className="px-2 py-1 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer"
            >
              {copiedVpa ? <Check size={12} /> : <Copy size={12} />}
              <span>{copiedVpa ? 'Copied' : 'Copy UPI'}</span>
            </button>
          </div>

          {/* Direct App Link */}
          <div className="pt-0.5">
            <a
              href={session.upiIntentUrl}
              className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              <ExternalLink size={12} />
              <span>Open in GPay / PhonePe / Paytm / Cred</span>
            </a>
          </div>
        </div>
      </div>

      {/* Zero-Touch Bank Observer Scanning Card */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <RefreshCw size={14} className="animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-xs font-medium text-slate-900 dark:text-white">
              Scanning bank rails in real-time...
            </span>
          </div>
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
            Auto-Verifying
          </span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pl-6">
          Complete the transfer in any UPI app. Our bank observer automatically matches the incoming credit and activates your Pro subscription instantly—no reference ID or receipt entry needed.
        </p>
      </div>

      {/* Actions: Back and Cancel */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
        >
          &larr; Back to Plans
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer font-medium"
        >
          Cancel &amp; Release Slot
        </button>
      </div>
    </div>
  );
};
