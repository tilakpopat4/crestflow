import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { SignInCard } from './SignInCard';
import { WorkflowIllustration } from './WorkflowIllustration';
import Footer from '../Footer';

interface SignInScreenProps {
  isAdminRoute: boolean;
  isSigningIn: boolean;
  onLogin: () => void;
  onSupportingNavigate: (route: 'privacy' | 'terms' | 'contact' | 'refund' | 'pricing' | 'dashboard' | 'work' | 'reviews' | any) => void;
}

/**
 * SignInScreen renders the editorial landing and sign-in view for CrestFlow:
 * - Solid studio grey background across entire main content screen (#333333), eliminating side highlighting/darkening
 * - Desktop: Left column (Headline, subtitle, workflow diagram) + Right column (SignInCard)
 * - Mobile (/adapt): Clean stacked hierarchy (Headline -> SignInCard -> Workflow illustration)
 * - Website standard Footer: Kept distinct as before with its own footer styling (#282828)
 */
export const SignInScreen: React.FC<SignInScreenProps> = ({
  isAdminRoute,
  isSigningIn,
  onLogin,
  onSupportingNavigate,
}) => {
  const shouldReduceMotion = useReducedMotion();

  // If admin route, display the focused admin sign-in card
  if (isAdminRoute) {
    return (
      <div className="min-h-screen w-full flex flex-col justify-between font-sans relative select-none text-slate-100 bg-[#333333]">
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10 max-w-md mx-auto w-full">
          <SignInCard
            isAdminRoute={isAdminRoute}
            isSigningIn={isSigningIn}
            onLogin={onLogin}
            onSupportingNavigate={onSupportingNavigate}
          />
        </main>
        <Footer onNavigate={onSupportingNavigate} />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-between font-sans relative overflow-x-hidden select-none text-slate-100 bg-[#333333]">
      {/* Main Hero & Placement Section (fullscreen-responsive) */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-8 md:px-12 lg:px-16 xl:px-20 lg:py-16 relative z-10 max-w-7xl 2xl:max-w-[1440px] mx-auto w-full">
        <motion.div
          initial={{ opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center w-full"
        >
          {/* Left Column: Heading, Subtitle & Workflow Illustration */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-4 sm:space-y-6">
            <div>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl xl:text-[62px] font-black italic tracking-tight text-white leading-[1.08]">
                Invoice. Scan. <span className="text-[#6366f1]">Get Paid.</span>
              </h1>
              <p className="text-xs sm:text-sm lg:text-base text-slate-300 sm:text-slate-400 mt-3 sm:mt-4 leading-relaxed max-w-xl">
                Clients, deliverables, invoices and reminders for Indian freelancers. Invoices carry a UPI QR, and money goes straight to your bank with zero fees.
              </p>
            </div>

            {/* Desktop Workflow Diagram Illustration (placed directly beneath subtitle) */}
            <div className="hidden lg:block pt-3 xl:pt-6">
              <WorkflowIllustration className="w-full max-w-xl xl:max-w-2xl" />
            </div>
          </div>

          {/* Right Column: Sign-In Card */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center w-full">
            <SignInCard
              isAdminRoute={isAdminRoute}
              isSigningIn={isSigningIn}
              onLogin={onLogin}
              onSupportingNavigate={onSupportingNavigate}
            />

            {/* Mobile / Tablet Workflow Diagram (adaptive: placed under card on mobile phones) */}
            <div className="block lg:hidden mt-8 sm:mt-10 w-full max-w-sm sm:max-w-md mx-auto">
              <WorkflowIllustration className="w-full" />
            </div>
          </div>
        </motion.div>
      </main>

      {/* Full Website Footer (Identical on all pages) */}
      <Footer onNavigate={onSupportingNavigate} />
    </div>
  );
};
