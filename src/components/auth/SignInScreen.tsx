import React, { useRef, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { SignInCard } from './SignInCard';
import { WorkflowIllustration } from './WorkflowIllustration';
import Footer from '../Footer';
import { useHeroConfig } from '../../lib/heroConfig';
import { siteConfig } from '../../config/site';

interface SignInScreenProps {
  isAdminRoute: boolean;
  isSigningIn: boolean;
  onLogin: () => void;
  onEmailSignUp?: (email: string, pass: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  onEmailSignIn?: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  onSupportingNavigate: (route: 'privacy' | 'terms' | 'contact' | 'refund' | 'pricing' | 'dashboard' | 'work' | 'reviews' | any) => void;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({
  isAdminRoute,
  isSigningIn,
  onLogin,
  onEmailSignUp,
  onEmailSignIn,
  onSupportingNavigate,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const { config } = useHeroConfig();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const [loadedAfterPaint, setLoadedAfterPaint] = useState(false);

  const connection = typeof navigator !== 'undefined' ? (navigator as any).connection : null;
  const isDataSaver = Boolean(connection?.saveData);
  const isSlowNetwork = connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g';
  const isReducedMotion = shouldReduceMotion || (typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches));

  const webmUrl = siteConfig.heroVideo.webm && !siteConfig.heroVideo.webm.includes('REPLACE_ME') ? siteConfig.heroVideo.webm.trim() : '';
  const mp4Url = siteConfig.heroVideo.mp4 && !siteConfig.heroVideo.mp4.includes('REPLACE_ME')
    ? siteConfig.heroVideo.mp4.trim()
    : config.backgroundVideoUrl && !config.backgroundVideoUrl.includes('youtube') && !config.backgroundVideoUrl.includes('youtu.be')
    ? config.backgroundVideoUrl.trim()
    : '';
  const hasVideoSource = Boolean(webmUrl || mp4Url);
  const posterSrc = siteConfig.heroVideo.poster || '/hero-v1-poster.jpg';
  const shouldSuppressAutoplay = isReducedMotion || isDataSaver || isSlowNetwork || (!config.showOnMobile && isMobileScreen);

  useEffect(() => {
    const checkMobile = () => setIsMobileScreen(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Delay media streaming until after initial layout and first paint for optimal LCP
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setLoadedAfterPaint(true));
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (loadedAfterPaint && !shouldSuppressAutoplay && hasVideoSource && videoRef.current) {
      const v = videoRef.current;
      v.muted = true;
      v.defaultMuted = true;
      v.playsInline = true;
      v.play().catch(() => {
        // If browser blocks autoplay, keep the poster visible gracefully
      });
    }
  }, [loadedAfterPaint, shouldSuppressAutoplay, hasVideoSource, webmUrl, mp4Url]);

  useEffect(() => {
    const handleVisibility = () => {
      if (!videoRef.current) return;
      if (document.hidden) {
        videoRef.current.pause();
      } else if (!shouldSuppressAutoplay && !videoFailed) {
        videoRef.current.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [shouldSuppressAutoplay, videoFailed]);

  if (isAdminRoute) {
    return (
      <div className="min-h-screen w-full flex flex-col justify-between font-sans relative select-none text-slate-100 bg-[#333333]">
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10 max-w-md mx-auto w-full">
          <SignInCard isAdminRoute={isAdminRoute} isSigningIn={isSigningIn} onLogin={onLogin} onEmailSignUp={onEmailSignUp} onEmailSignIn={onEmailSignIn} onSupportingNavigate={onSupportingNavigate} />
        </main>
        <Footer onNavigate={onSupportingNavigate} />
      </div>
    );
  }

  const renderHeadline = () => {
    if (!config.headlineHighlight || !config.headline.includes(config.headlineHighlight)) return config.headline;
    const [before, after] = config.headline.split(config.headlineHighlight);
    return <>{before}<span className="text-accent">{config.headlineHighlight}</span>{after}</>;
  };

  const heroContent = (
    <div className={`flex flex-col justify-center space-y-4 sm:space-y-6 ${config.cardAlignment === 'center' ? 'items-center text-center' : ''}`}>
      <div>
        <h1 className="text-3xl sm:text-5xl lg:text-6xl xl:text-[62px] font-black italic tracking-tight text-white leading-[1.08]">
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

  const authCard = (
    <div className="flex flex-col items-center justify-center w-full">
      <SignInCard isAdminRoute={isAdminRoute} isSigningIn={isSigningIn} onLogin={onLogin} onEmailSignUp={onEmailSignUp} onEmailSignIn={onEmailSignIn} onSupportingNavigate={onSupportingNavigate} />
      {config.showWorkflowIllustration && (
        <div className="block lg:hidden mt-8 sm:mt-10 w-full max-w-sm sm:max-w-md mx-auto">
          <WorkflowIllustration className="w-full" />
        </div>
      )}
    </div>
  );

  const isImage = config.backgroundType === 'image' && Boolean(config.backgroundImageUrl?.trim());

  return (
    <div
      style={{ backgroundColor: !isImage ? (config.backgroundColor || '#1E1E1E') : 'transparent' }}
      className={`min-h-screen w-full flex flex-col justify-between font-sans relative overflow-x-hidden select-none text-slate-100 ${isImage ? '!bg-transparent' : ''}`}
    >
      {/* Static Image Background Mode */}
      {isImage && (
        <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 select-none">
          <div className="absolute inset-0 w-full h-full bg-cover bg-center" style={{ backgroundImage: `url("${config.backgroundImageUrl}")` }} />
          <div className="absolute inset-0 bg-[#1A1A1A] pointer-events-none" style={{ opacity: config.backgroundOverlayOpacity }} />
        </div>
      )}

      {/* Self-Hosted Background Video with Zero Player UI */}
      {!isImage && (
        <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 select-none bg-[#1E1E1E]">
          <video
            ref={videoRef}
            autoPlay={!shouldSuppressAutoplay}
            muted
            loop
            playsInline
            preload="metadata"
            disablePictureInPicture
            controlsList="nodownload noremoteplayback"
            tabIndex={-1}
            aria-hidden="true"
            poster={posterSrc}
            onError={() => setVideoFailed(true)}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ aspectRatio: '16/9' }}
          >
            {loadedAfterPaint && !shouldSuppressAutoplay && !videoFailed && (
              <>
                {webmUrl && <source src={webmUrl} type="video/webm" />}
                {mp4Url && <source src={mp4Url} type="video/mp4" />}
              </>
            )}
          </video>

          {/* Fallback poster displayed when video fails, motion is reduced, or on data saver */}
          {(videoFailed || shouldSuppressAutoplay || !hasVideoSource) && (
            <div
              className="absolute inset-0 w-full h-full bg-cover bg-center z-[5]"
              style={{
                backgroundImage: `url("${posterSrc}")`,
                backgroundColor: config.backgroundColor || '#1E1E1E',
              }}
            />
          )}

          {/* Dark gradient overlay (from-black/60 to-black/80 with surface-900 / #1A1A1A) for AA contrast */}
          <div
            className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-black/60 to-black/80"
            style={{ backgroundColor: '#1A1A1A', opacity: config.backgroundOverlayOpacity || 0.65 }}
            aria-hidden="true"
          />
        </div>
      )}

      {/* Main Hero & Content Section */}
      <main
        style={{ backgroundColor: 'transparent' }}
        className="!bg-transparent flex-1 flex items-center justify-center px-4 py-8 sm:px-8 md:px-12 lg:px-16 xl:px-20 lg:py-16 relative z-30 max-w-7xl 2xl:max-w-[1440px] mx-auto w-full"
      >
        <motion.div
          initial={{ opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
          className="w-full"
        >
          {config.cardAlignment === 'center' ? (
            <div className="flex flex-col items-center space-y-8 max-w-4xl mx-auto w-full">
              {heroContent}
              <div className="w-full max-w-md mx-auto pt-2">{authCard}</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center w-full">
              <div className={`lg:col-span-7 ${config.cardAlignment === 'left' ? 'order-1 lg:order-2' : ''}`}>{heroContent}</div>
              <div className={`lg:col-span-5 ${config.cardAlignment === 'left' ? 'order-2 lg:order-1' : ''}`}>{authCard}</div>
            </div>
          )}
        </motion.div>
      </main>

      {/* Minimal transparent footer */}
      <div className="relative z-30 w-full mt-auto">
        <Footer variant="minimal" transparent={true} onNavigate={onSupportingNavigate} className="!bg-transparent border-t border-white/10" />
      </div>
    </div>
  );
};
