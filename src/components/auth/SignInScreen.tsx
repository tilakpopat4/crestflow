import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { SignInCard } from './SignInCard';
import { WorkflowIllustration } from './WorkflowIllustration';
import { Instagram, Github, Linkedin, Youtube } from 'lucide-react';

interface SignInScreenProps {
  isAdminRoute: boolean;
  isSigningIn: boolean;
  onLogin: () => void;
  onSupportingNavigate: (route: 'privacy' | 'terms' | 'contact') => void;
}

/**
 * SignInScreen renders the exact landing / sign-in screen:
 * - Moody studio grey radial vignette (lighter grey center, dark charcoal/black corners)
 * - Left column: Italic bold "Invoice. Scan. Get Paid." heading, subtext, and workflow diagram
 * - Right column: Elevated dark SignInCard
 * - Bottom bar: Version copyright & social media links
 */
export const SignInScreen: React.FC<SignInScreenProps> = ({
  isAdminRoute,
  isSigningIn,
  onLogin,
  onSupportingNavigate,
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className="min-h-screen w-full flex flex-col justify-between font-sans relative overflow-x-hidden select-none text-slate-100"
      style={{
        background: 'radial-gradient(ellipse 90% 90% at 50% 48%, #2e2e2e 0%, #1c1c1c 55%, #0e0e0e 100%)',
      }}
    >
      {/* Main Hero & Placement Section */}
      <main className="flex-1 flex items-center justify-center px-6 py-8 sm:px-10 lg:px-16 relative z-10 max-w-7xl mx-auto w-full">
        <motion.div
          initial={{ opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center w-full"
        >
          {/* Left Column: Heading, Subtitle & Workflow Illustration */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-4 sm:space-y-5">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black italic tracking-tight text-white leading-[1.08]">
                Invoice. Scan. <span className="text-[#6366f1]">Get Paid.</span>
              </h1>
              <p className="text-xs sm:text-[13px] text-slate-400 mt-3 sm:mt-4 leading-relaxed max-w-lg">
                Clients, deliverables, invoices and reminders for Indian freelancers. Invoices carry a UPI QR, and money goes straight to your bank with zero fees.
              </p>
            </div>

            {/* Workflow Diagram Illustration */}
            <div className="pt-2 sm:pt-4 flex justify-start">
              <WorkflowIllustration className="w-full max-w-[500px]" />
            </div>
          </div>

          {/* Right Column: Sign-In Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end items-center w-full">
            <SignInCard
              isAdminRoute={isAdminRoute}
              isSigningIn={isSigningIn}
              onLogin={onLogin}
              onSupportingNavigate={onSupportingNavigate}
            />
          </div>
        </motion.div>
      </main>

      {/* Bottom Bar: Copyright & Social Links */}
      <footer className="border-t border-[#262626] px-6 py-3.5 sm:px-10 lg:px-16 w-full">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            <span>© 2026 CrestFlow Inc. • Version 1.1.0</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              title="Instagram"
              aria-label="Instagram"
            >
              <Instagram size={15} />
            </a>
            <a
              href="https://github.com/tilakpopat4/crestflow"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              title="GitHub"
              aria-label="GitHub"
            >
              <Github size={15} />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              title="LinkedIn"
              aria-label="LinkedIn"
            >
              <Linkedin size={15} />
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              title="YouTube"
              aria-label="YouTube"
            >
              <Youtube size={15} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
