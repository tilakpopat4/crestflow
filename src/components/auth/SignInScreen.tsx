import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { TrustSignalsBar } from './TrustSignalsBar';
import { HeroProductMock } from './HeroProductMock';
import { BentoFeaturesGrid } from './BentoFeaturesGrid';
import { SignInCard } from './SignInCard';
import Footer from '../Footer';

interface SignInScreenProps {
  isAdminRoute: boolean;
  isSigningIn: boolean;
  onLogin: () => void;
  onSupportingNavigate: (route: 'privacy' | 'terms' | 'contact') => void;
}

/**
 * SignInScreen provides the editorial studio dark landing view for CrestFlow.
 * Presents a focused headline, truthful trust signals, an interactive product
 * preview, bento feature tiles, and a glass-style authentication card.
 */
export const SignInScreen: React.FC<SignInScreenProps> = ({
  isAdminRoute,
  isSigningIn,
  onLogin,
  onSupportingNavigate,
}) => {
  const shouldReduceMotion = useReducedMotion();

  // If admin route, display ONLY the focused sign-in card without marketing hero
  if (isAdminRoute) {
    return (
      <div className="min-h-screen w-full flex flex-col justify-between font-sans relative overflow-x-hidden selection:bg-[#333333] selection:text-white bg-[#0f0f0f] text-slate-100">
        <div className="absolute inset-0 landing-grid-pattern pointer-events-none opacity-40" />
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10 max-w-md mx-auto w-full">
          <SignInCard
            isAdminRoute={isAdminRoute}
            isSigningIn={isSigningIn}
            onLogin={onLogin}
            onSupportingNavigate={onSupportingNavigate}
          />
        </main>
        <Footer variant="minimal" transparent={true} onNavigate={onSupportingNavigate} />
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: shouldReduceMotion ? 1 : 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.08,
        duration: shouldReduceMotion ? 0 : 0.35,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0 : 0.35, ease: 'easeOut' },
    },
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between font-sans relative overflow-x-hidden selection:bg-[#333333] selection:text-white bg-[#0f0f0f] text-slate-100">
      {/* Background Grid & Subtle Ambient Indigo Glow */}
      <div className="absolute inset-0 landing-grid-pattern pointer-events-none opacity-40" />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[420px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(99, 102, 241, 0.12), transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16 relative z-10 max-w-7xl mx-auto w-full">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start w-full"
        >
          {/* Left Column on Desktop / Flow on Mobile */}
          <div className="lg:col-span-7 space-y-8 flex flex-col">
            <motion.div variants={itemVariants}>
              <TrustSignalsBar />
            </motion.div>

            <motion.div variants={itemVariants}>
              <HeroProductMock />
            </motion.div>

            {/* Mobile-only Sign-In Card: placed right below hero so mobile users don't have to scroll through features */}
            <div className="block lg:hidden pt-2">
              <SignInCard
                isAdminRoute={isAdminRoute}
                isSigningIn={isSigningIn}
                onLogin={onLogin}
                onSupportingNavigate={onSupportingNavigate}
              />
            </div>

            <motion.div variants={itemVariants}>
              <BentoFeaturesGrid />
            </motion.div>
          </div>

          {/* Right Column: Desktop Sign-In Card (Sticky) */}
          <motion.div
            variants={itemVariants}
            className="hidden lg:flex lg:col-span-5 lg:sticky lg:top-12 flex-col justify-center items-center h-full pt-4"
          >
            <SignInCard
              isAdminRoute={isAdminRoute}
              isSigningIn={isSigningIn}
              onLogin={onLogin}
              onSupportingNavigate={onSupportingNavigate}
            />
          </motion.div>
        </motion.div>
      </main>

      {/* Minimal Landing Footer */}
      <Footer variant="minimal" transparent={true} onNavigate={onSupportingNavigate} />
    </div>
  );
};
