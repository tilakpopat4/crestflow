import React from 'react';
import { ArrowRight, Layers, Star } from 'lucide-react';
import { DashboardPreviewMock } from './DashboardPreviewMock';

interface CenteredProductHeroProps {
  onStartTrial: () => void;
  onComparePlans: () => void;
}

/**
 * CenteredProductHero showcases CrestFlow's client CRM and invoicing workspace.
 * Features:
 * - Studio highlight badge & value proposition
 * - Two primary action buttons: 'Start 7-Day Trial' (auth) & 'Compare Plans' (/pricing)
 * - Trust rating & social proof
 * - Embedded high-fidelity DashboardPreviewMock
 */
export const CenteredProductHero: React.FC<CenteredProductHeroProps> = ({
  onStartTrial,
  onComparePlans,
}) => {
  return (
    <section aria-labelledby="hero-product-title" className="relative isolate overflow-hidden px-4 pt-10 sm:pt-16 pb-12 md:px-8 max-w-7xl mx-auto w-full text-center">
      {/* Subtle grid pattern backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 select-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] [mask-image:radial-gradient(70%_80%_at_top,black_20%,transparent_100%)] bg-[size:40px_40px] text-white opacity-20"></div>
      </div>

      <div className="mx-auto max-w-5xl">
        {/* Top Product Announcement Chip */}
        <div className="inline-flex">
          <button
            type="button"
            onClick={onStartTrial}
            className="group inline-flex max-w-full items-center gap-2 rounded-full bg-[#1e1e1e] border border-[#333333] py-1 pr-3.5 pl-1 text-xs font-medium text-slate-200 transition-colors hover:border-[#555555] cursor-pointer"
          >
            <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-white text-[11px] font-semibold">
              New
            </span>
            <span className="truncate text-slate-300">
              Automated Invoicing & Deliverable Tracker for Indian Studios
            </span>
            <ArrowRight className="size-3.5 shrink-0 text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Main Headline */}
        <h1
          id="hero-product-title"
          className="mx-auto mt-6 max-w-4xl text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-white leading-[1.08]"
        >
          Invoice. Scan. <span className="text-accent">Get Paid.</span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
          The all-in-one client CRM, deliverable tracker, and automated invoicing workspace built specifically for Indian freelancers and digital studios.
        </p>

        {/* Action Buttons: Start 7-Day Trial & Compare Plans */}
        <div className="mt-8 sm:mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
          <button
            type="button"
            onClick={onStartTrial}
            className="group inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent hover:bg-accent-hover px-6 text-[15px] font-medium whitespace-nowrap text-white transition-colors duration-120 border-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span>Start 7-Day Trial</span>
            <ArrowRight className="size-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" />
          </button>

          <button
            type="button"
            onClick={onComparePlans}
            className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#282828] hover:bg-[#333333] px-6 text-[15px] font-medium whitespace-nowrap text-white transition-colors duration-120 border-none"
          >
            <Layers className="size-4 shrink-0 text-slate-400" />
            <span>Compare Plans</span>
          </button>
        </div>

        {/* Social Proof / Rating */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs sm:text-sm text-slate-400">
          <span className="flex items-center gap-0.5 text-amber-400" aria-hidden="true">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="size-3.5 fill-current" />
            ))}
          </span>
          <span>
            <strong className="font-semibold text-white">4.9 out of 5</strong> from 1,200+ Indian freelancers and studios
          </span>
        </div>

        {/* Embedded CrestFlow Dashboard Preview */}
        <DashboardPreviewMock />
      </div>
    </section>
  );
};

export default CenteredProductHero;
