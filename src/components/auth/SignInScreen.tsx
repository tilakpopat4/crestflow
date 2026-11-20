import React, { useRef, useEffect, useMemo } from 'react';
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

/**
 * SignInScreen renders the editorial landing and sign-in view for CrestFlow:
 * - Fully configurable text, benefits, custom photo/video background, and card alignment.
 * - Managed in real-time from the Admin Command Center.
 */
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
  const parsedVideo = useMemo(() => parseVideoSource(config.backgroundVideoUrl), [config.backgroundVideoUrl]);

  useEffect(() => {
    if (config.backgroundType === 'video' && parsedVideo.type === 'direct' && videoRef.current) {
      const v = videoRef.current;
      v.muted = true;
      v.defaultMuted = true;
      v.playsInline = true;
      v.play().catch(() => {
        v.muted = true;
        v.play().catch(() => {});
      });
    }
  }, [config.backgroundType, parsedVideo.type, parsedVideo.directUrl]);

  // If admin route, display the focused admin sign-in card
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
        <span className="text-[#6366f1]">{config.headlineHighlight}</span>
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

  const containerBgStyle = {
    backgroundColor: config.backgroundType === 'color' ? (config.backgroundColor || '#333333') : '#121212',
  };

  return (
    <div
      style={containerBgStyle}
      className="min-h-screen w-full flex flex-col justify-between font-sans relative overflow-x-hidden select-none text-slate-100"
    >
      {/* Edge-to-Edge Fullscreen Background Media */}
      {config.backgroundType === 'image' && config.backgroundImageUrl && (
        <>
          <div
            className="fixed inset-0 w-full h-full bg-cover bg-center pointer-events-none -z-10 select-none"
            style={{ backgroundImage: `url("${config.backgroundImageUrl}")` }}
          />
          <div
            className="fixed inset-0 bg-black pointer-events-none -z-10"
            style={{ opacity: config.backgroundOverlayOpacity }}
          />
        </>
      )}

      {config.backgroundType === 'video' && config.backgroundVideoUrl && (
        <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none -z-10 select-none bg-black">
          {parsedVideo.type === 'direct' && (
            <video
              ref={videoRef}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full w-auto h-auto object-cover max-w-none"
              autoPlay
              loop
              muted
              playsInline
              src={parsedVideo.directUrl}
            />
          )}

          {(parsedVideo.type === 'youtube' || parsedVideo.type === 'vimeo' || parsedVideo.type === 'drive') && (
            <iframe
              title="CrestFlow Hero Background Video"
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[115vw] h-[115vh] min-w-[100vw] min-h-[100vh] pointer-events-none border-0"
              src={parsedVideo.embedUrl}
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              tabIndex={-1}
            />
          )}

          <div
            className="absolute inset-0 bg-black pointer-events-none z-0"
            style={{ opacity: config.backgroundOverlayOpacity }}
          />
        </div>
      )}

      {/* Main Hero & Placement Section (fullscreen-responsive) */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-8 md:px-12 lg:px-16 xl:px-20 lg:py-16 relative z-10 max-w-7xl 2xl:max-w-[1440px] mx-auto w-full">
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
