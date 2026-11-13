import React from 'react';
import { ShieldCheck, Lock, Percent } from 'lucide-react';

/**
 * TrustSignalsBar renders the headline, subline, and factual trust signals
 * for the CrestFlow landing and sign-in view.
 */
export const TrustSignalsBar: React.FC = () => {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.12]">
          Log the work.{' '}
          <span className="text-accent-indigo">Get paid on UPI.</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
          Clients, deliverables, invoices and reminders for Indian freelancers. Invoices carry a UPI QR, and money goes straight to your bank with zero fees.
        </p>
      </div>

      {/* Real Trust Signals */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs text-slate-300">
        <div className="inline-flex items-center gap-1.5 font-medium">
          <ShieldCheck className="w-4 h-4 text-accent-indigo shrink-0" />
          <span>Try it for ₹1</span>
        </div>
        <span className="text-slate-600 hidden sm:inline" aria-hidden="true">•</span>
        <div className="inline-flex items-center gap-1.5 font-medium">
          <Lock className="w-4 h-4 text-accent-indigo shrink-0" />
          <span>Your data stays isolated &amp; private</span>
        </div>
        <span className="text-slate-600 hidden sm:inline" aria-hidden="true">•</span>
        <div className="inline-flex items-center gap-1.5 font-medium">
          <Percent className="w-4 h-4 text-accent-indigo shrink-0" />
          <span>0% commission</span>
        </div>
      </div>
    </div>
  );
};
