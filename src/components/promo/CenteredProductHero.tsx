import React from 'react';
import { ArrowRight, Layers } from 'lucide-react';
import { DashboardPreviewMock } from './DashboardPreviewMock';

interface CenteredProductHeroProps {
  onStartTrial: () => void;
  onComparePlans: () => void;
}

/**
 * CenteredProductHero showcases CrestFlow's client CRM and invoicing workspace.
 * Minimalist, high-impact layout matching the screenshot:
 * - Headline with accent highlight
 * - Studio-focused subtitle
 * - Dual action buttons: 'Start 7-Day Trial' (auth) & 'Compare Plans' (/pricing)
 * - Dashboard preview touching flush till the end of the page
 */
export const CenteredProductHero: React.FC<CenteredProductHeroProps> = ({
  onStartTrial,
  onComparePlans,
}) => {
  return (
    <section
      aria-labelledby="hero-product-title"
      className="relative isolate overflow-hidden px-3 sm:px-6 md:px-8 pt-8 sm:pt-14 pb-0 max-w-7xl mx-auto w-full text-center flex flex-col items-center"
    >
      <div className="mx-auto max-w-4xl">
        {/* Main Headline */}
        <h1
          id="hero-product-title"
          className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-white leading-[1.08]"
        >
          Invoice. Scan. <span className="text-accent">Get Paid.</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-4 sm:mt-5 max-w-2xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
          The all-in-one client CRM, deliverable tracker, and automated invoicing workspace
          <br className="hidden sm:inline" /> built specifically for Indian freelancers and digital studios.
        </p>

        {/* Action Buttons: Start 7-Day Trial & Compare Plans */}
        <div className="mt-7 sm:mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
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
            className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#282828] hover:bg-[#333333] border border-[#383838] px-6 text-[15px] font-medium whitespace-nowrap text-white transition-colors duration-120"
          >
            <Layers className="size-4 shrink-0 text-slate-400" />
            <span>Compare Plans</span>
          </button>
        </div>
      </div>

      {/* Dashboard Preview Touching Till Bottom of Page */}
      <DashboardPreviewMock />
    </section>
  );
};

export default CenteredProductHero;
