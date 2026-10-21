import React from 'react';
import { Film, Calendar, FileText } from 'lucide-react';
import Logo from '../Logo';
import Footer from '../Footer';

interface SignInScreenProps {
  isAdminRoute: boolean;
  isSigningIn: boolean;
  onLogin: () => void;
  onSupportingNavigate: (route: 'privacy' | 'terms' | 'contact') => void;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({
  isAdminRoute,
  isSigningIn,
  onLogin,
  onSupportingNavigate
}) => {
  return (
    <div
      className="min-h-screen w-full flex flex-col justify-between font-sans relative overflow-x-hidden selection:bg-indigo-500 selection:text-white bg-cover bg-center bg-no-repeat bg-slate-900"
      style={{ backgroundImage: 'url(/onboarding-bg.webp)' }}
    >
      {/* Content Area */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 lg:p-12 relative z-10 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          {/* Left Column: Context for Creators */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900/80 text-white border border-slate-700/80 text-xs font-mono uppercase tracking-wider mb-3">
                <Film size={12} className="text-white" />
                Built for Video Editors &amp; Creators
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight drop-shadow-xs">
                Manage your clients, deliverables, and invoices in one calm workspace.
              </h1>
              <p className="mt-3 text-sm md:text-base text-blue-100/90 leading-relaxed max-w-xl">
                CrestFlow replaces messy spreadsheets and WhatsApp threads with a purpose-built system for creative freelancers.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-lg border border-white/20 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-sm">
                <div className="p-1.5 w-fit rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mb-2">
                  <Film size={15} />
                </div>
                <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100">Deliverables</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                  Reels, longform edits &amp; Drive links.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-white/20 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-sm">
                <div className="p-1.5 w-fit rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mb-2">
                  <Calendar size={15} />
                </div>
                <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100">Retainers</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                  30-day recurring payment cycles.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-white/20 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-sm">
                <div className="p-1.5 w-fit rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mb-2">
                  <FileText size={15} />
                </div>
                <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100">Invoicing</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                  One-click PDFs via connected Gmail.
                </p>
              </div>
            </div>

            {/* Sample Deliverable Workspace Preview */}
            <div className="rounded-xl border border-white/20 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-4 text-xs space-y-3 shadow-md">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Active Deliverables</span>
                  <span className="text-[11px] text-slate-400">Sample project view</span>
                </div>
                <span className="text-[11px] font-medium text-slate-500">Monthly Retainer</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                  <div className="space-y-0.5">
                    <p className="font-medium text-slate-700 dark:text-slate-300">YouTube Longform - Ep 14 (Rough Cut)</p>
                    <p className="text-[11px] text-slate-400">DaVinci Resolve • 4K DCI • Turnaround: 2 days</p>
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium text-[13px]">Invoiced</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                  <div className="space-y-0.5">
                    <p className="font-medium text-slate-700 dark:text-slate-300">Instagram Reels Batch (3 Videos)</p>
                    <p className="text-[11px] text-slate-400">Premiere Pro • 9:16 Vertical • Client approved</p>
                  </div>
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium text-[13px]">Paid</span>
                </div>
              </div>
            </div>

            {/* Workflow Tags */}
            <div className="pt-1 flex flex-wrap items-center gap-2 text-xs text-white/90">
              <span className="font-mono text-[11px] uppercase tracking-wider text-blue-100/80">Workflow:</span>
              {['Premiere Pro', 'DaVinci Resolve', 'After Effects', 'Final Cut Pro'].map((app) => (
                <span
                  key={app}
                  className="px-2 py-0.5 rounded bg-slate-900/80 text-white text-[11px] font-medium border border-slate-700/60"
                >
                  {app}
                </span>
              ))}
            </div>
          </div>

          {/* Right Column: Sign In Card */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto">
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 text-center">
              <div className="flex items-center justify-center gap-2.5 mb-5">
                <Logo className="w-10 h-10 shadow-xs" />
                <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">CrestFlow</span>
              </div>

              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                {isAdminRoute ? 'Admin Portal' : 'Creator Sign In'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6 text-xs sm:text-sm leading-relaxed">
                {isAdminRoute 
                  ? 'Please sign in with Google to authenticate and load the Admin database console.' 
                  : 'Sign in with your Google account to access your freelancing workspace, clients, and active deliverables.'}
              </p>

              <button 
                type="button"
                onClick={onLogin}
                disabled={isSigningIn}
                className="w-full flex items-center justify-center gap-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-colors cursor-pointer disabled:cursor-not-allowed shadow-sm border-none"
              >
                {isSigningIn ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                  </svg>
                )}
                <span>{isSigningIn ? 'Signing In...' : (isAdminRoute ? 'Admin Sign In' : 'Sign in with Google')}</span>
              </button>

              {isAdminRoute && (
                <button
                  type="button"
                  onClick={() => { window.location.href = '/'; }}
                  className="mt-4 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors border-none bg-transparent cursor-pointer"
                >
                  Back to Main Website
                </button>
              )}

              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Need assistance?{' '}
                  <a
                    href="/contact"
                    onClick={(e) => {
                      e.preventDefault();
                      onSupportingNavigate('contact');
                    }}
                    className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 underline"
                  >
                    Contact support
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer variant="minimal" transparent onNavigate={onSupportingNavigate} />
    </div>
  );
};
