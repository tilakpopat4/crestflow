import React from 'react';
import { ArrowRight, Layers } from 'lucide-react';
import { DashboardPreviewMock } from './DashboardPreviewMock';

interface CenteredProductHeroProps {
  onStartTrial: () => void;
  onComparePlans: () => void;
}

/**
 * CenteredProductHero showcases CrestFlow's client CRM and invoicing workspace.
 * Normalized to match CrestFlow design standards (GEMINI.md):
 * - Flat, restrained SaaS typography with accent red highlight
 * - Slate-400 studio subtitle
 * - Standardized CTA buttons (8px radius, 120ms transition, no translate lift)
 * - Immersive dashboard preview touching flush towards page bottom
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
        {/* Main Headline */}
        <h1
          id="hero-product-title"
          className="font-hero-condensed text-5xl sm:text-6xl lg:text-[72px] font-normal tracking-[0.015em] text-white leading-[1.02]"
        >
          Invoice. Scan. <span className="text-[#e1002d]">Get Paid.</span>
        </h1>

        {/* Subtitle - Simplified & Punchy */}
        <p className="mt-3 sm:mt-4 max-w-xl mx-auto text-sm sm:text-base text-slate-400 leading-relaxed font-normal">
          Client management, deliverable tracking, and automated invoicing built for digital studios.
        </p>

        {/* Action Buttons: Primary Start 7-Day Trial & Secondary Compare Plans */}
        <div className="mt-6 sm:mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
          <button
            type="button"
            onClick={onStartTrial}
            className="inline-flex h-10 sm:h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#e1002d] hover:bg-[#c80028] px-5 sm:px-6 text-sm font-medium whitespace-nowrap text-white transition-colors duration-120 border-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span>Start 7-Day Trial</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0 text-white" />
          </button>

          <button
            type="button"
            onClick={onComparePlans}
            className="inline-flex h-10 sm:h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#242424] hover:bg-[#2e2e2e] px-4 sm:px-5 text-sm font-medium whitespace-nowrap text-slate-300 hover:text-white transition-colors duration-120 border-none"
          >
            <Layers className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span>Compare Plans</span>
          </button>
        </div>
      </div>

      {/* Normalized Dashboard Preview Mock touching flush to bottom */}
      <DashboardPreviewMock />
    </section>
  );
};

export default CenteredProductHero;
