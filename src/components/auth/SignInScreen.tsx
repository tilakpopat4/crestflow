import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { SignInCard } from './SignInCard';
import { WorkflowIllustration } from './WorkflowIllustration';
import Footer from '../Footer';

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
 * - Solid studio grey background across entire main content screen (#333333)
 * - Desktop: Left column (Headline, 3 key benefits, workflow diagram) + Right column (SignInCard)
 * - Mobile (/adapt): Clean stacked hierarchy
 * - Website standard Footer: (#282828)
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
          {/* Left Column: Heading, 3 Key Benefits & Workflow Illustration */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-4 sm:space-y-6">
            <div>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl xl:text-[62px] font-black italic tracking-tight text-white leading-[1.08]">
                Invoice. Scan. <span className="text-[#6366f1]">Get Paid.</span>
              </h1>
              <p className="text-xs sm:text-sm lg:text-base text-slate-300 sm:text-slate-400 mt-3 sm:mt-4 leading-relaxed max-w-xl">
                The all-in-one client CRM, deliverable tracker, and automated invoicing workspace built specifically for Indian freelancers and digital studios.
              </p>
            </div>

            {/* 3 Core Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-[#282828] border border-[#383838] p-3 rounded-lg">
                <p className="text-xs font-semibold text-white">Direct UPI Payments</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Zero gateway commissions. 100% money goes directly to your bank.</p>
              </div>
              <div className="bg-[#282828] border border-[#383838] p-3 rounded-lg">
                <p className="text-xs font-semibold text-white">Deliverable Tracking</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Log edits, revisions, and status updates seamlessly for every client.</p>
              </div>
              <div className="bg-[#282828] border border-[#383838] p-3 rounded-lg">
                <p className="text-xs font-semibold text-white">Automated Delivery</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Scheduled WhatsApp-ready and email invoices at 6:00 AM sharp.</p>
              </div>
            </div>

            {/* Desktop Workflow Diagram Illustration */}
            <div className="hidden lg:block pt-3 xl:pt-4">
              <WorkflowIllustration className="w-full max-w-xl xl:max-w-2xl" />
            </div>
          </div>

          {/* Right Column: Sign-In Card */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center w-full">
            <SignInCard
              isAdminRoute={isAdminRoute}
              isSigningIn={isSigningIn}
              onLogin={onLogin}
              onEmailSignUp={onEmailSignUp}
              onEmailSignIn={onEmailSignIn}
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
