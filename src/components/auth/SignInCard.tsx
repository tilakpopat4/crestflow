import React from 'react';
import Logo from '../Logo';

interface SignInCardProps {
  isAdminRoute: boolean;
  isSigningIn: boolean;
  onLogin: () => void;
  onSupportingNavigate: (route: 'privacy' | 'terms' | 'contact') => void;
}

/**
 * SignInCard renders the focused glassmorphism authentication card.
 * Handles both standard freelancer sign-in and restricted admin authentication.
 */
export const SignInCard: React.FC<SignInCardProps> = ({
  isAdminRoute,
  isSigningIn,
  onLogin,
  onSupportingNavigate,
}) => {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-[#1c1c1c]/90 backdrop-blur-md p-6 sm:p-8 rounded-2xl shadow-2xl border border-white/10 text-center transition-all duration-150 focus-within:border-accent-indigo focus-within:ring-1 focus-within:ring-accent-indigo">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2.5 mb-5">
          <Logo className="w-10 h-10 shadow-xs" />
          <span className="text-xl font-bold text-white tracking-tight">CrestFlow</span>
        </div>

        <h2 className="text-xl font-bold text-white mb-1.5">
          {isAdminRoute ? 'Admin Database Portal' : 'Welcome to CrestFlow'}
        </h2>
        <p className="text-slate-400 mb-6 text-xs sm:text-sm leading-relaxed">
          {isAdminRoute
            ? 'Sign in with your authorized Google account to load the Admin console.'
            : 'Sign in to access your dashboard, automated invoicing, and client portals.'}
        </p>

        {/* Primary Google Sign-in Button */}
        <button
          type="button"
          onClick={onLogin}
          disabled={isSigningIn}
          className="w-full flex items-center justify-center gap-3 bg-accent-indigo hover:bg-accent-indigo-hover disabled:opacity-50 text-white py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-150 cursor-pointer disabled:cursor-not-allowed shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1c1c1c] focus-visible:ring-indigo-400"
        >
          {isSigningIn ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          ) : (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
              />
            </svg>
          )}
          <span>{isSigningIn ? 'Signing In...' : isAdminRoute ? 'Admin Sign In' : 'Continue with Google'}</span>
        </button>

        {/* Admin Navigation Escape */}
        {isAdminRoute && (
          <button
            type="button"
            onClick={() => {
              window.location.href = '/';
            }}
            className="mt-4 text-xs text-slate-400 hover:text-white font-medium transition-colors border-none bg-transparent cursor-pointer"
          >
            ← Back to Main Website
          </button>
        )}

        {/* Terms, Privacy & Trust Disclosures */}
        <div className="mt-6 pt-4 border-t border-[#2a2a2a] text-center space-y-2">
          {!isAdminRoute && (
            <p className="text-[11px] font-medium text-slate-400">
              Start with 7 days full access for ₹1 · Cancel anytime
            </p>
          )}

          <p className="text-[11px] text-slate-500 leading-normal">
            By signing in, you agree to our{' '}
            <a
              href="/terms"
              onClick={(e) => {
                e.preventDefault();
                onSupportingNavigate('terms');
              }}
              className="text-slate-400 hover:text-white underline"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="/privacy"
              onClick={(e) => {
                e.preventDefault();
                onSupportingNavigate('privacy');
              }}
              className="text-slate-400 hover:text-white underline"
            >
              Privacy Policy
            </a>
            .
          </p>

          <p className="text-[11px] text-slate-500 pt-1">
            Questions?{' '}
            <a
              href="/contact"
              onClick={(e) => {
                e.preventDefault();
                onSupportingNavigate('contact');
              }}
              className="text-slate-400 hover:text-white underline"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
