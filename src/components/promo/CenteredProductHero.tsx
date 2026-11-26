import React from 'react';
import { ArrowRight, Layers } from 'lucide-react';
import { TRIAL_PROMISE_COPY } from '../../shared/pricing';
import { DashboardPreviewMock } from './DashboardPreviewMock';

interface CenteredProductHeroProps {
  onStartTrial: () => void;
  onComparePlans: () => void;
}

/**
 * CenteredProductHero showcases CrestFlow on canvas #0B0B0E with soft radial ember glow
 * and clean Anton headline typography per Section 9.
 */
export const CenteredProductHero: React.FC<CenteredProductHeroProps> = ({
  onStartTrial,
  onComparePlans,
}) => {
  return (
    <section
      aria-labelledby="hero-product-title"
      className="relative isolate overflow-hidden px-3 sm:px-6 md:px-8 pt-6 sm:pt-10 pb-0 max-w-7xl mx-auto w-full text-center flex-1 flex flex-col items-center justify-between min-h-0"
    >
      <div className="mx-auto max-w-4xl">
        <h1
          id="hero-product-title"
          className="font-hero-condensed text-5xl sm:text-6xl lg:text-[72px] font-normal tracking-wide text-[#F7F7F8] leading-[1.02]"
        >
          Invoice. Scan. <span className="text-[#E0002B]">Get Paid.</span>
        </h1>

        <p className="mt-3 sm:mt-4 max-w-xl mx-auto text-sm sm:text-base text-[#A1A1AA] leading-relaxed font-normal">
          Client directory, work log, and instant UPI QR invoicing built for independent studios.{' '}
          <span className="text-[#F7F7F8]">{TRIAL_PROMISE_COPY}</span>
        </p>

        <div className="mt-6 sm:mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
          <button
            type="button"
            onClick={onStartTrial}
            className="inline-flex h-10 sm:h-11 cursor-pointer items-center justify-center gap-2 rounded-lg cf-btn-primary px-5 sm:px-6 text-sm font-semibold whitespace-nowrap text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F7F7F8]"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0 text-white" />
          </button>

          <button
            type="button"
            onClick={onComparePlans}
            className="inline-flex h-10 sm:h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#1B1B22] hover:bg-[#22222B] border border-[#2A2A33] px-4 sm:px-5 text-sm font-medium whitespace-nowrap text-[#F7F7F8]"
          >
            <Layers className="w-3.5 h-3.5 shrink-0 text-[#A1A1AA]" />
            <span>Compare Plans</span>
          </button>
        </div>
      </div>

      <DashboardPreviewMock />
    </section>
  );
};

export default CenteredProductHero;
