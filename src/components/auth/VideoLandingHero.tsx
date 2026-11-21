import React from 'react';
import { WorkflowIllustration } from './WorkflowIllustration';
import { HeroConfig } from '../../lib/heroConfig';

interface VideoLandingHeroProps {
  config: HeroConfig;
}

/**
 * VideoLandingHero renders the left hero content on the authentic landing page
 * with the self-hosted video playing in the background:
 * - High-impact headline with accent highlight
 * - Freelancer/studio value proposition & subtitle
 * - Benefit feature cards
 * - Workflow process diagram illustration
 */
export const VideoLandingHero: React.FC<VideoLandingHeroProps> = ({ config }) => {
  const renderHeadline = () => {
    if (!config.headlineHighlight || !config.headline.includes(config.headlineHighlight)) {
      return (
        <>
          Invoice. Scan. <span className="text-accent">Get Paid.</span>
        </>
      );
    }
    const [before, after] = config.headline.split(config.headlineHighlight);
    return (
      <>
        {before}
        <span className="text-accent">{config.headlineHighlight}</span>
        {after}
      </>
    );
  };

  return (
    <div className={`flex flex-col justify-center space-y-4 sm:space-y-6 ${config.cardAlignment === 'center' ? 'items-center text-center' : ''}`}>
      <div>
        <h1 className="text-3xl sm:text-5xl lg:text-6xl xl:text-[58px] font-black italic tracking-tight text-white leading-[1.08]">
          {renderHeadline()}
        </h1>
        <p className={`text-xs sm:text-sm lg:text-base text-slate-300 sm:text-slate-400 mt-3 sm:mt-4 leading-relaxed ${config.cardAlignment === 'center' ? 'max-w-2xl mx-auto' : 'max-w-xl'}`}>
          {config.subtitle}
        </p>
      </div>

      {config.showBenefits !== false && config.benefits.length > 0 && (
        <div className={`grid gap-3 pt-2 w-full ${config.benefits.length === 1 ? 'grid-cols-1 max-w-md' : config.benefits.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
          {config.benefits.map((b) => (
            <div key={b.id} className="bg-[#282828]/90 border border-[#383838] p-3 rounded-lg text-left backdrop-blur-xs">
              <p className="text-xs font-semibold text-white">{b.title}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{b.description}</p>
            </div>
          ))}
        </div>
      )}

      {config.showWorkflowIllustration && (
        <div className={`hidden lg:block pt-3 xl:pt-4 ${config.cardAlignment === 'center' ? 'max-w-2xl mx-auto' : ''}`}>
          <WorkflowIllustration className="w-full max-w-xl xl:max-w-2xl" />
        </div>
      )}
    </div>
  );
};

export default VideoLandingHero;
