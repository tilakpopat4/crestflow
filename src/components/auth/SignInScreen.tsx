import React, { useRef, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { SignInCard } from './SignInCard';
import { CenteredProductHero } from '../promo/CenteredProductHero';
import Footer from '../Footer';
import Logo from '../Logo';
import { useHeroConfig } from '../../lib/heroConfig';
import { siteConfig } from '../../config/site';

// Palette compliance reference: text-accent (#e1002d) for headline highlight & active brand accents
interface SignInScreenProps {
  isAdminRoute: boolean;
  isSigningIn: boolean;
  onLogin: () => void;
  onEmailSignUp?: (email: string, pass: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  onEmailSignIn?: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  onSupportingNavigate: (route: 'privacy' | 'terms' | 'contact' | 'refund' | 'pricing' | 'dashboard' | 'work' | 'reviews' | any) => void;
  initialMode?: 'promo' | 'auth';
}

export const SignInScreen: React.FC<SignInScreenProps> = ({
  isAdminRoute,
  isSigningIn,
  onLogin,
  onEmailSignUp,
  onEmailSignIn,
  onSupportingNavigate,
  initialMode = 'promo',
}) => {
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
    if (loadedAfterPaint && !shouldSuppressAutoplay && hasVideoSource && videoRef.current) {
      const v = videoRef.current;
      v.muted = true;
      v.defaultMuted = true;
      v.playsInline = true;
      v.play().catch(() => {});
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

  const isImage = config.backgroundType === 'image' && Boolean(config.backgroundImageUrl?.trim());

  return (
    <div
      style={{ backgroundColor: !isImage ? (config.backgroundColor || '#141414') : 'transparent' }}
      className={`min-h-screen w-full flex flex-col justify-between font-sans relative overflow-x-hidden select-none text-slate-100 ${isImage ? '!bg-transparent' : ''}`}
    >
      {/* Background Media: Image or Self-Hosted Video */}
      {isImage ? (
        <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 select-none">
          <div className="absolute inset-0 w-full h-full bg-cover bg-center" style={{ backgroundImage: `url("${config.backgroundImageUrl}")` }} />
          <div className="absolute inset-0 bg-[#1A1A1A] pointer-events-none" style={{ opacity: config.backgroundOverlayOpacity }} />
        </div>
      ) : (
        <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 select-none bg-[#141414]">
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

          {(videoFailed || shouldSuppressAutoplay || !hasVideoSource) && (
            <div
              className="absolute inset-0 w-full h-full bg-cover bg-center z-[5]"
              style={{
                backgroundImage: `url("${posterSrc}")`,
                backgroundColor: config.backgroundColor || '#141414',
              }}
            />
          )}

          <div
            className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-black/60 to-black/80"
            style={{ backgroundColor: '#141414', opacity: config.backgroundOverlayOpacity || 0.75 }}
            aria-hidden="true"
          />
        </div>
      )}

      {/* Top Header Navbar */}
      <header className="relative z-30 w-full border-b border-white/10 bg-black/40 backdrop-blur-md px-4 sm:px-8 py-3.5">
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
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer border-none bg-transparent"
            >
              Compare Plans
            </button>
            {authView === 'promo' ? (
              <>
                <button
                  type="button"
                  onClick={() => { setAuthCardInitialMode('signin'); setAuthView('auth'); }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer border-none bg-transparent"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthCardInitialMode('signup'); setAuthView('auth'); }}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors cursor-pointer border-none"
                >
                  Start 7-Day Trial
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setAuthView('promo')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer border-none bg-[#242424] rounded-lg"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Overview</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area: Promo Hero & Dashboard Preview vs Auth Card */}
      <main className="!bg-transparent flex-1 flex flex-col items-center justify-center relative z-30 w-full">
        {authView === 'promo' ? (
          <motion.div
            key="promo"
            initial={{ opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
            className="w-full"
          >
            <CenteredProductHero
              onStartTrial={() => {
                setAuthCardInitialMode('signup');
                setAuthView('auth');
              }}
              onComparePlans={() => onSupportingNavigate('pricing')}
            />
          </motion.div>
        ) : (
          <motion.div
            key="auth"
            initial={{ opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
            className="w-full max-w-md mx-auto p-4 sm:p-6 my-auto"
          >
            <SignInCard
              isAdminRoute={false}
              initialMode={authCardInitialMode}
              isSigningIn={isSigningIn}
              onLogin={onLogin}
              onEmailSignUp={onEmailSignUp}
              onEmailSignIn={onEmailSignIn}
              onSupportingNavigate={onSupportingNavigate}
            />
          </motion.div>
        )}
      </main>

      {/* Minimal Footer */}
      <div className="relative z-30 w-full mt-auto">
        <Footer variant="minimal" transparent={true} onNavigate={onSupportingNavigate} className="!bg-transparent border-t border-white/10" />
      </div>
    </div>
  );
};

export default SignInScreen;
