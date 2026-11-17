import React, { useState } from 'react';
import Logo from '../Logo';
import { Eye, EyeOff } from 'lucide-react';

interface SignInCardProps {
  isAdminRoute: boolean;
  isSigningIn: boolean;
  onLogin: () => void;
  onEmailSignUp?: (email: string, pass: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  onEmailSignIn?: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  onSupportingNavigate: (route: 'privacy' | 'terms' | 'contact') => void;
  initialMode?: 'signin' | 'signup';
}

export const SignInCard: React.FC<SignInCardProps> = ({
  isAdminRoute,
  isSigningIn,
  onLogin,
  onEmailSignUp,
  onEmailSignIn,
  onSupportingNavigate,
  initialMode = 'signup',
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(isAdminRoute ? 'signin' : initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (authMode === 'signup' && !name.trim()) {
      setFormError('Please enter your name.');
      return;
    }

    if (!email.trim()) {
      setFormError('Please enter your email address.');
      return;
    }

    if (!password) {
      setFormError('Please enter your password.');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (authMode === 'signup' && onEmailSignUp) {
        const res = await onEmailSignUp(email, password, name);
        if (!res.success) {
          setFormError(res.error || 'Failed to create account.');
        }
      } else if (onEmailSignIn) {
        const res = await onEmailSignIn(email, password);
        if (!res.success) {
          setFormError(res.error || 'Failed to sign in.');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Authentication error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto">
      <div className="bg-[#181818] border border-[#2b2b2b] p-6 sm:p-8 rounded-xl shadow-xl text-left">
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Logo className="w-6 h-6" />
            <span className="text-sm font-bold text-white tracking-tight">CrestFlow</span>
          </div>
          {!isAdminRoute && (
            <div className="flex items-center bg-[#242424] p-0.5 rounded-lg border border-[#333]">
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setFormError(null); }}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors border-none cursor-pointer ${
                  authMode === 'signup' ? 'bg-[#383838] text-white' : 'text-slate-400 hover:text-white bg-transparent'
                }`}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setFormError(null); }}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors border-none cursor-pointer ${
                  authMode === 'signin' ? 'bg-[#383838] text-white' : 'text-slate-400 hover:text-white bg-transparent'
                }`}
              >
                Sign In
              </button>
            </div>
          )}
        </div>

        <h2 className="text-lg font-bold text-white mb-1">
          {isAdminRoute
            ? 'Admin Portal'
            : authMode === 'signup'
            ? 'Create Your Workspace'
            : 'Welcome Back'}
        </h2>
        <p className="text-slate-400 mb-5 text-xs leading-relaxed">
          {isAdminRoute
            ? 'Sign in with your authorized admin Google account.'
            : authMode === 'signup'
            ? 'Start your 7-day free trial. No payment method required.'
            : 'Sign in to access your clients, work items, and invoices.'}
        </p>

        {formError && (
          <div className="mb-4 p-2.5 rounded bg-red-950/40 border border-red-900/60 text-xs text-red-400">
            {formError}
          </div>
        )}

        {/* Primary Google Button */}
        <button
          type="button"
          onClick={onLogin}
          disabled={isSigningIn || isSubmitting}
          className="w-full min-h-[42px] flex items-center justify-center gap-2.5 bg-[#282828] hover:bg-[#333333] active:bg-[#3d3d3d] border-none disabled:opacity-50 text-white py-2.5 px-4 rounded-lg font-medium text-xs transition-colors cursor-pointer"
        >
          {isSigningIn ? (
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
          ) : (
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
              />
            </svg>
          )}
          <span>{isSigningIn ? 'Connecting...' : `Continue with Google`}</span>
        </button>

        {!isAdminRoute && (
          <>
            <div className="relative my-4 flex items-center justify-center">
              <div className="border-t border-[#2e2e2e] w-full" />
              <span className="bg-[#181818] px-2 text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                or email
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Your Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tilak Popat"
                    className="w-full bg-[#121212] border-none rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:outline-none focus:ring-0"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@creativestudio.com"
                  className="w-full bg-[#121212] border-none rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:outline-none focus:ring-0"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#121212] border-none rounded-lg pl-3 pr-9 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:outline-none focus:ring-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 bg-transparent border-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isSigningIn}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium text-xs transition-colors cursor-pointer border-none mt-1"
              >
                {isSubmitting ? 'Please wait...' : authMode === 'signup' ? 'Create Account & Start Free Trial' : 'Sign In'}
              </button>
            </form>
          </>
        )}

        {/* Footer info & links */}
        <div className="mt-5 pt-3 border-t border-[#242424] text-center space-y-1">
          {!isAdminRoute && (
            <p className="text-[11px] text-slate-400">
              {authMode === 'signup'
                ? 'Already have an account? '
                : "Don't have an account yet? "}
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'signup' ? 'signin' : 'signup');
                  setFormError(null);
                }}
                className="text-indigo-400 hover:text-indigo-300 font-medium underline border-none bg-transparent cursor-pointer p-0"
              >
                {authMode === 'signup' ? 'Sign in' : 'Create one free'}
              </button>
            </p>
          )}

          <p className="text-[10px] text-slate-500 pt-1">
            By continuing, you agree to our{' '}
            <a
              href="/terms"
              onClick={(e) => { e.preventDefault(); onSupportingNavigate('terms'); }}
              className="text-slate-400 hover:text-white underline"
            >
              Terms
            </a>{' '}
            and{' '}
            <a
              href="/privacy"
              onClick={(e) => { e.preventDefault(); onSupportingNavigate('privacy'); }}
              className="text-slate-400 hover:text-white underline"
            >
              Privacy Policy
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
};
