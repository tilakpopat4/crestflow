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
    <div className="w-full max-w-[390px] mx-auto">
      <div className="bg-[#181818] border border-[#2b2b2b] p-6 sm:p-7 rounded-2xl shadow-2xl text-center">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <Logo className="w-7 h-7" />
          <span className="text-base font-bold text-white tracking-tight">CrestFlow</span>
        </div>

        <h2 className="text-lg sm:text-xl font-bold text-white mb-1.5">
          {isAdminRoute ? 'Admin Database Portal' : 'Welcome to CrestFlow'}
        </h2>
        <p className="text-slate-400 mb-6 text-xs leading-relaxed max-w-[280px] mx-auto">
          {isAdminRoute
            ? 'Sign in with your authorized Google account to load the Admin console.'
            : 'Sign in to access your dashboard, automated invoicing, and client portals.'}
        </p>

        {/* Primary Google Sign-in Button */}
        <button
          type="button"
          onClick={onLogin}
          disabled={isSigningIn}
          className="w-full min-h-[44px] flex items-center justify-center gap-2.5 bg-[#5468ff] hover:bg-[#4355e8] active:bg-[#3d4ec7] disabled:opacity-50 text-white py-3 px-4 rounded-xl font-semibold text-sm transition-colors cursor-pointer disabled:cursor-not-allowed shadow-sm border-none outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#181818] focus-visible:ring-indigo-400"
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
        <div className="mt-6 pt-4 text-center space-y-1.5">
          {!isAdminRoute && (
            <p className="text-[11px] text-slate-400 font-normal">
              Start with 7 days full access for ₹1 • Cancel anytime
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
              className="text-slate-400 hover:text-white underline underline-offset-2"
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
              className="text-slate-400 hover:text-white underline underline-offset-2"
            >
              Privacy Policy
            </a>
            .
          </p>

          <p className="text-[11px] text-slate-500 pt-0.5">
            Questions?{' '}
            <a
              href="/contact"
              onClick={(e) => {
                e.preventDefault();
                onSupportingNavigate('contact');
              }}
              className="text-slate-400 hover:text-white underline underline-offset-2"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
