import React, { useRef, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { SignInCard } from './SignInCard';
import { WorkflowIllustration } from './WorkflowIllustration';
import Footer from '../Footer';
import { useHeroConfig, parseVideoSource } from '../../lib/heroConfig';

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
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  const isDataSaver = typeof navigator !== 'undefined' && Boolean((navigator as any).connection?.saveData);
  const isReducedMotion = shouldReduceMotion || (typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches));
  const parsedVideo = useMemo(() => parseVideoSource(config.backgroundVideoUrl), [config.backgroundVideoUrl]);
  const isVideoConfigured = config.backgroundType === 'video' && Boolean(config.backgroundVideoUrl?.trim());
  const canPlayVideo = isVideoConfigured && config.videoEnabled !== false && !isReducedMotion && !isDataSaver && (!isMobileScreen || config.showOnMobile === true) && !videoFailed;
  const effectivePosterUrl = config.posterUrl || (parsedVideo.type === 'youtube' ? parsedVideo.posterUrl : '');

  useEffect(() => {
    const checkMobile = () => setIsMobileScreen(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (canPlayVideo && parsedVideo.type === 'direct' && videoRef.current) {
      const v = videoRef.current;
      v.muted = true;
      v.defaultMuted = true;
      v.playsInline = true;
      v.play().catch(() => {
        v.muted = true;
        v.play().catch(() => setVideoFailed(true));
      });
    }
  }, [canPlayVideo, parsedVideo.type, parsedVideo.directUrl]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        if (videoRef.current) videoRef.current.pause();
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        }
      } else if (canPlayVideo) {
        if (videoRef.current) videoRef.current.play().catch(() => {});
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [canPlayVideo]);

  if (isAdminRoute) {
    return (
      <div className="min-h-screen w-full flex flex-col justify-between font-sans relative select-none text-slate-100 bg-[#333333]">
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10 max-w-md mx-auto w-full">
          <SignInCard
            isAdminRoute={isAdminRoute}
            isSigningIn={isSigningIn}
            onLogin={onLogin}
            onEmailSignUp={onEmailSignUp}
            onEmailSignIn={onEmailSignIn}
            onSupportingNavigate={onSupportingNavigate}
          />
        </main>
        <Footer onNavigate={onSupportingNavigate} />
      </div>
    );
  }

  const renderHeadline = () => {
    if (!config.headlineHighlight || !config.headline.includes(config.headlineHighlight)) {
      return config.headline;
    }
    const idx = config.headline.indexOf(config.headlineHighlight);
    const before = config.headline.slice(0, idx);
    const after = config.headline.slice(idx + config.headlineHighlight.length);
    return (
      <>
        {before}
        <span className="text-accent">{config.headlineHighlight}</span>
        {after}
      </>
    );
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

      {/* Dynamic Benefits Chips */}
      {config.benefits.length > 0 && (
        <div className={`grid gap-3 pt-2 w-full ${config.benefits.length === 1 ? 'grid-cols-1 max-w-md' : config.benefits.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
          {config.benefits.map((b) => (
            <div key={b.id} className="bg-[#282828]/90 border border-[#383838] p-3 rounded-lg text-left backdrop-blur-xs">
              <p className="text-xs font-semibold text-white">{b.title}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{b.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Desktop Workflow Diagram Illustration */}
      {config.showWorkflowIllustration && (
        <div className={`hidden lg:block pt-3 xl:pt-4 ${config.cardAlignment === 'center' ? 'max-w-2xl mx-auto' : ''}`}>
          <WorkflowIllustration className="w-full max-w-xl xl:max-w-2xl" />
        </div>
      )}
    </div>
  );

  const authCard = (
    <div className="flex flex-col items-center justify-center w-full">
      <SignInCard
        isAdminRoute={isAdminRoute}
        isSigningIn={isSigningIn}
        onLogin={onLogin}
        onEmailSignUp={onEmailSignUp}
        onEmailSignIn={onEmailSignIn}
        onSupportingNavigate={onSupportingNavigate}
      />

      {/* Mobile / Tablet Workflow Diagram */}
      {config.showWorkflowIllustration && (
        <div className="block lg:hidden mt-8 sm:mt-10 w-full max-w-sm sm:max-w-md mx-auto">
          <WorkflowIllustration className="w-full" />
        </div>
      )}
    </div>
  );

  const isVideo = isVideoConfigured && config.videoEnabled !== false;
  const isImage = config.backgroundType === 'image' && Boolean(config.backgroundImageUrl?.trim());

  const containerBgStyle = {
    backgroundColor: isVideo || isImage ? 'transparent' : (config.backgroundColor || '#1E1E1E'),
  };

  return (
    <div
      style={containerBgStyle}
      className={`min-h-screen w-full flex flex-col justify-between font-sans relative overflow-x-hidden select-none text-slate-100 ${isVideo || isImage ? '!bg-transparent' : ''}`}
    >
      {/* Edge-to-Edge Fullscreen Background Media */}
      {isImage && (
        <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 select-none">
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url("${config.backgroundImageUrl}")` }}
          />
          <div
            className="absolute inset-0 bg-[#1A1A1A] pointer-events-none"
            style={{ opacity: config.backgroundOverlayOpacity }}
          />
        </div>
      )}

      {isVideo && (
        <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 select-none bg-[#1E1E1E]">
          {/* Poster or solid fallback displayed first / when video paused / mobile / reduced motion */}
          {(!canPlayVideo || effectivePosterUrl) && (
            <div
              className={`absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-300 ${canPlayVideo ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              style={{
                backgroundImage: effectivePosterUrl ? `url("${effectivePosterUrl}")` : undefined,
                backgroundColor: !effectivePosterUrl ? (config.backgroundColor || '#1E1E1E') : undefined,
              }}
            />
          )}

          {canPlayVideo && parsedVideo.type === 'direct' && (
            <video
              ref={videoRef}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full w-auto h-auto object-cover max-w-none"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              poster={effectivePosterUrl || undefined}
              onError={() => setVideoFailed(true)}
              src={parsedVideo.directUrl}
            />
          )}

          {canPlayVideo && (parsedVideo.type === 'youtube' || parsedVideo.type === 'vimeo' || parsedVideo.type === 'drive') && (
            <iframe
              ref={iframeRef}
              title="CrestFlow Hero Background Video"
              className="absolute top-1/2 left-1/2 pointer-events-none border-0"
              style={{
                width: '100vw',
                height: '56.25vw',
                minHeight: '100vh',
                minWidth: '177.78vh',
                transform: 'translate(-50%, -50%) scale(1.35)',
              }}
              src={parsedVideo.embedUrl}
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              tabIndex={-1}
            />
          )}

          {/* Dark scrim between video and content using surface-900 (#1A1A1A) */}
          <div
            className="absolute inset-0 bg-[#1A1A1A] pointer-events-none"
            style={{ opacity: config.backgroundOverlayOpacity || 0.65 }}
          />
        </div>
      )}

      {/* Main Hero & Placement Section (fullscreen-responsive) */}
      <main
        style={{ backgroundColor: 'transparent' }}
        className="!bg-transparent flex-1 flex items-center justify-center px-4 py-8 sm:px-8 md:px-12 lg:px-16 xl:px-20 lg:py-16 relative z-10 max-w-7xl 2xl:max-w-[1440px] mx-auto w-full"
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
              <div className="w-full max-w-md mx-auto pt-2">
                {authCard}
              </div>
            </div>
          ) : config.cardAlignment === 'left' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center w-full">
              <div className="lg:col-span-5 order-2 lg:order-1">
                {authCard}
              </div>
              <div className="lg:col-span-7 order-1 lg:order-2">
                {heroContent}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center w-full">
              <div className="lg:col-span-7">
                {heroContent}
              </div>
              <div className="lg:col-span-5">
                {authCard}
              </div>
            </div>
          )}
        </motion.div>
      </main>

      {/* Full Website Footer - Minimal transparent variant so background media flows under */}
      <div className="relative z-10 w-full mt-auto">
        <Footer
          variant="minimal"
          transparent={true}
          onNavigate={onSupportingNavigate}
          className="!bg-transparent border-t border-white/10"
        />
      </div>
    </div>
  );
};
