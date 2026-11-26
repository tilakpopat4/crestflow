import React, { useRef, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { SignInCard } from './SignInCard';
import { VideoLandingHero } from './VideoLandingHero';
import { WorkflowIllustration } from './WorkflowIllustration';
import { CenteredProductHero } from '../promo/CenteredProductHero';
import Footer from '../Footer';
import Logo from '../Logo';
import { useHeroConfig } from '../../lib/heroConfig';
import { siteConfig } from '../../config/site';
import { auth } from '../../firebase';

// Palette compliance reference: text-accent (#E0002B) for headline highlight & active brand accents
interface SignInScreenProps {
  user?: any;
  isAdminRoute: boolean;
  isSigningIn: boolean;
  onLogin: () => void;
  onEmailSignUp?: (email: string, pass: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  onEmailSignIn?: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  onSupportingNavigate: (route: 'privacy' | 'terms' | 'contact' | 'refund' | 'pricing' | 'dashboard' | 'work' | 'reviews' | any) => void;
  initialMode?: 'promo' | 'auth';
}

export const SignInScreen: React.FC<SignInScreenProps> = ({
  user,
  isAdminRoute,
  isSigningIn,
  onLogin,
  onEmailSignUp,
  onEmailSignIn,
  onSupportingNavigate,
  initialMode = 'promo',
}) => {
  // Conditional Logic: If any user is already logged in, never display landing/promo page
  useEffect(() => {
    if (user || auth.currentUser) onSupportingNavigate('dashboard');
  }, [user, onSupportingNavigate]);

  if (user || auth.currentUser) return null;
  const shouldReduceMotion = useReducedMotion();
  const { config } = useHeroConfig();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const [loadedAfterPaint, setLoadedAfterPaint] = useState(false);
  const [authView, setAuthView] = useState<'promo' | 'auth'>(isAdminRoute ? 'auth' : initialMode);
  const [authCardInitialMode, setAuthCardInitialMode] = useState<'signup' | 'signin'>('signup');

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

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setLoadedAfterPaint(true));
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (loadedAfterPaint && !shouldSuppressAutoplay && hasVideoSource && videoRef.current && authView === 'auth') {
      const v = videoRef.current;
      v.muted = true;
      v.defaultMuted = true;
      v.playsInline = true;
      v.play().catch(() => {});
    }
  }, [loadedAfterPaint, shouldSuppressAutoplay, hasVideoSource, webmUrl, mp4Url, authView]);

  useEffect(() => {
    const handleVisibility = () => {
      if (!videoRef.current) return;
      if (document.hidden) {
        videoRef.current.pause();
      } else if (!shouldSuppressAutoplay && !videoFailed && authView === 'auth') {
        videoRef.current.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [shouldSuppressAutoplay, videoFailed, authView]);

  if (isAdminRoute) {
    return (
      <div className="min-h-screen w-full flex flex-col justify-between font-sans relative select-none text-[#F7F7F8] bg-[#0B0B0E]">
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10 max-w-md mx-auto w-full">
          <SignInCard isAdminRoute={isAdminRoute} isSigningIn={isSigningIn} onLogin={onLogin} onEmailSignUp={onEmailSignUp} onEmailSignIn={onEmailSignIn} onSupportingNavigate={onSupportingNavigate} />
        </main>
        <Footer onNavigate={onSupportingNavigate} />
      </div>
    );
  }

  const isImage = config.backgroundType === 'image' || Boolean(config.backgroundImageUrl?.trim());

  return (
    <div
      style={{ backgroundColor: '#0B0B0E' }}
      className="min-h-screen w-full flex flex-col justify-between font-sans relative overflow-x-hidden select-none text-[#F7F7F8] bg-[#0B0B0E]"
    >
      {/* Background Engine: Obsidian canvas + hairline grid + permitted radial ember glow */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 select-none bg-[#0B0B0E]">
        <div className="absolute inset-0 landing-grid-pattern opacity-65" aria-hidden="true" />
        <div className="absolute inset-0 hero-radial-glow" aria-hidden="true" />
        {authView === 'auth' && isImage && config.backgroundImageUrl?.trim() && (
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url("${config.backgroundImageUrl.trim()}")` }}
          />
        )}
        {authView === 'auth' && !isImage && (
          <video
            ref={videoRef} autoPlay={!shouldSuppressAutoplay} muted loop playsInline preload="metadata"
            disablePictureInPicture controlsList="nodownload noremoteplayback" tabIndex={-1} aria-hidden="true"
            poster={posterSrc} onError={() => setVideoFailed(true)}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-25" style={{ aspectRatio: '16/9' }}
          >
            {loadedAfterPaint && !shouldSuppressAutoplay && !videoFailed && (
              <>
                {webmUrl && <source src={webmUrl} type="video/webm" />}
                {mp4Url && <source src={mp4Url} type="video/mp4" />}
              </>
            )}
          </video>
        )}
      </div>

      {/* Top Header Navbar - 100% transparent */}
      <header
        style={{ backgroundColor: 'transparent' }}
        className="relative z-30 w-full !bg-transparent bg-transparent px-4 sm:px-8 py-3.5 sm:py-4"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => setAuthView('promo')}
            className="flex items-center gap-2.5 cursor-pointer border-none bg-transparent"
          >
            <Logo className="w-7 h-7" />
            <span className="font-bold text-white text-base tracking-tight">CrestFlow</span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => onSupportingNavigate('pricing')}
              className="text-xs font-medium px-3 py-1.5 rounded-lg text-[#A1A1AA] hover:text-white transition-colors duration-120 cursor-pointer border-none bg-transparent"
            >
              Compare Plans
            </button>
            {authView === 'promo' ? (
              <>
                <button
                  type="button"
                  onClick={() => { setAuthCardInitialMode('signin'); setAuthView('auth'); }}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg text-[#A1A1AA] hover:text-white transition-colors duration-120 cursor-pointer border-none bg-transparent"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthCardInitialMode('signup'); setAuthView('auth'); }}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors duration-120 cursor-pointer border-none"
                >
                  Start 7-Day Trial
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setAuthView('promo')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#A1A1AA] hover:text-white transition-colors duration-120 cursor-pointer border-none bg-[#1B1B22] rounded-lg"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Overview</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {authView === 'promo' ? (
        <main className="!bg-transparent flex-1 flex flex-col items-center justify-start relative z-30 w-full min-h-0">
          <motion.div
            key="promo"
            initial={{ opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            className="w-full flex-1 flex flex-col justify-between"
          >
            <CenteredProductHero
              onStartTrial={() => {
                setAuthCardInitialMode('signup');
                setAuthView('auth');
              }}
              onComparePlans={() => onSupportingNavigate('pricing')}
            />
          </motion.div>
        </main>
      ) : (
        <main
          style={{ backgroundColor: 'transparent' }}
          className="!bg-transparent flex-1 flex items-center justify-center px-4 py-8 sm:px-8 md:px-12 lg:px-16 xl:px-20 lg:py-16 relative z-30 max-w-7xl 2xl:max-w-[1440px] mx-auto w-full"
        >
          <motion.div
            key="auth-landing"
            initial={{ opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
            className="w-full"
          >
            {config.cardAlignment === 'center' ? (
              <div className="flex flex-col items-center space-y-8 max-w-4xl mx-auto w-full">
                <VideoLandingHero config={config} />
                <div className="w-full max-w-md mx-auto pt-2">
                  <SignInCard
                    isAdminRoute={false} initialMode={authCardInitialMode} isSigningIn={isSigningIn}
                    onLogin={onLogin} onEmailSignUp={onEmailSignUp} onEmailSignIn={onEmailSignIn}
                    onSupportingNavigate={onSupportingNavigate}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center w-full">
                <div className={`lg:col-span-7 ${config.cardAlignment === 'left' ? 'order-1 lg:order-2' : ''}`}>
                  <VideoLandingHero config={config} />
                </div>
                <div className={`lg:col-span-5 ${config.cardAlignment === 'left' ? 'order-2 lg:order-1' : ''}`}>
                  <div className="flex flex-col items-center justify-center w-full">
                    <SignInCard
                      isAdminRoute={false} initialMode={authCardInitialMode} isSigningIn={isSigningIn}
                      onLogin={onLogin} onEmailSignUp={onEmailSignUp} onEmailSignIn={onEmailSignIn}
                      onSupportingNavigate={onSupportingNavigate}
                    />
                    {config.showWorkflowIllustration && (
                      <div className="block lg:hidden mt-8 sm:mt-10 w-full max-w-sm sm:max-w-md mx-auto">
                        <WorkflowIllustration className="w-full" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </main>
      )}

      {/* Slight Black Fade From Bottom, Behind The Footer */}
      <div
        className="pointer-events-none absolute bottom-0 inset-x-0 h-40 sm:h-56 bg-gradient-to-t from-black via-black/80 to-transparent z-20"
        aria-hidden="true"
      />

      {/* Minimal Footer */}
      <div className="relative z-30 w-full mt-auto">
        <Footer variant="minimal" transparent={true} onNavigate={onSupportingNavigate} className="!bg-transparent border-none" />
        {/* Slight black fade from bottom, below the footer */}
        <div className="w-full h-4 sm:h-6 bg-gradient-to-t from-black to-transparent pointer-events-none" aria-hidden="true" />
      </div>
    </div>
  );
};

export default SignInScreen;
