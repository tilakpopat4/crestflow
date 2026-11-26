import React from 'react';
import { WorkflowIllustration } from './WorkflowIllustration';
import { HeroConfig } from '../../lib/heroConfig';
import { TRIAL_PROMISE_COPY } from '../../shared/pricing';

interface VideoLandingHeroProps {
  config: HeroConfig;
}

/**
 * VideoLandingHero renders the left hero content on the sign-in screen
 * matching Section 9 obsidian surfaces, Anton condensed headline, and calm card contrast.
 */
export const VideoLandingHero: React.FC<VideoLandingHeroProps> = ({ config }) => {
  const renderHeadline = () => {
    if (!config.headlineHighlight || !config.headline.includes(config.headlineHighlight)) {
      return (
        <>
          Invoice. Scan. <span className="text-[#E0002B]">Get Paid.</span>
        </>
      );
    }
    const [before, after] = config.headline.split(config.headlineHighlight);
    return (
      <>
        {before}
        <span className="text-[#E0002B]">{config.headlineHighlight}</span>
        {after}
      </>
    );
  };

  return (
    <div
      className={`flex flex-col justify-center space-y-4 sm:space-y-6 ${
        config.cardAlignment === 'center' ? 'items-center text-center' : ''
      }`}
    >
      <div>
        <h1 className="font-hero-condensed text-4xl sm:text-5xl lg:text-6xl xl:text-[64px] font-normal tracking-wide text-[#F7F7F8] leading-[1.04]">
          {renderHeadline()}
        </h1>
        <p
          className={`text-xs sm:text-sm lg:text-base text-[#A1A1AA] mt-3 sm:mt-4 leading-relaxed ${
            config.cardAlignment === 'center' ? 'max-w-2xl mx-auto' : 'max-w-xl'
          }`}
        >
          {config.subtitle || TRIAL_PROMISE_COPY}
        </p>
      </div>

      {config.showBenefits !== false && config.benefits.length > 0 && (
        <div
          className={`grid gap-3 pt-2 w-full ${
            config.benefits.length === 1
              ? 'grid-cols-1 max-w-md'
              : config.benefits.length === 2
              ? 'grid-cols-1 sm:grid-cols-2'
              : 'grid-cols-1 sm:grid-cols-3'
          }`}
        >
          {config.benefits.map((b) => (
            <div key={b.id} className="bg-[#131318] border border-[#2A2A33] p-3.5 rounded-xl text-left">
              <p className="text-xs font-semibold text-[#F7F7F8]">{b.title}</p>
              <p className="text-[11px] text-[#A1A1AA] mt-0.5 leading-relaxed">{b.description}</p>
            </div>
          ))}
        </div>
      )}

      {config.showWorkflowIllustration && (
        <div
          className={`hidden lg:block pt-3 xl:pt-4 ${
            config.cardAlignment === 'center' ? 'max-w-2xl mx-auto' : ''
          }`}
        >
          <WorkflowIllustration className="w-full max-w-xl xl:max-w-2xl" />
        </div>
      )}
    </div>
  );
};

export default VideoLandingHero;
