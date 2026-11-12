import React from 'react';
import { Briefcase, Calendar, FileText, Layers } from 'lucide-react';
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
      className="min-h-screen w-full flex flex-col justify-between font-sans relative overflow-x-hidden selection:bg-[#333333] selection:text-white bg-[#0f0f0f] text-slate-100"
    >
      {/* Content Area */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 lg:p-12 relative z-10 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          {/* Left Column: Context for Creators */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#212121] text-slate-200 border border-[#333333] text-xs font-mono uppercase tracking-wider mb-3">
                <Briefcase size={12} className="text-slate-300" />
                Built for Freelancers &amp; Creators
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
                Manage your clients, deliverables, and invoices in one calm workspace.
              </h1>
              <p className="mt-3 text-sm md:text-base text-slate-400 leading-relaxed max-w-xl">
                CrestFlow replaces messy spreadsheets and WhatsApp threads with a purpose-built system for independent freelancers and creative professionals.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 rounded-lg border border-[#333333] bg-[#212121] shadow-xs">
                <div className="p-1.5 w-fit rounded bg-[#282828] text-slate-300 mb-2">
                  <Layers size={15} />
                </div>
                <h2 className="text-xs font-semibold text-white">Deliverables</h2>
                <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                  Design, code, video &amp; client assets.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-[#333333] bg-[#212121] shadow-xs">
                <div className="p-1.5 w-fit rounded bg-[#282828] text-slate-300 mb-2">
                  <Calendar size={15} />
                </div>
                <h2 className="text-xs font-semibold text-white">Retainers</h2>
                <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                  30-day recurring payment cycles.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-[#333333] bg-[#212121] shadow-xs">
                <div className="p-1.5 w-fit rounded bg-[#282828] text-slate-300 mb-2">
                  <FileText size={15} />
                </div>
                <h2 className="text-xs font-semibold text-white">Invoicing</h2>
                <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                  One-click PDFs via connected Gmail.
                </p>
              </div>
            </div>

            {/* Sample Deliverable Workspace Preview */}
            <div className="rounded-xl border border-[#333333] bg-[#212121] p-4 text-xs space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#2a2a2a]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200">Active Deliverables</span>
                  <span className="text-[11px] text-slate-400">Sample project view</span>
                </div>
                <span className="text-[11px] font-medium text-slate-400">Monthly Retainer</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded bg-[#282828]">
                  <div className="space-y-0.5">
                    <p className="font-medium text-slate-200">Brand Identity &amp; Design System</p>
                    <p className="text-[11px] text-slate-400">Figma • Vector Assets • Turnaround: 3 days</p>
                  </div>
                  <span className="text-slate-300 font-medium text-[13px]">Invoiced</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[#282828]">
                  <div className="space-y-0.5">
                    <p className="font-medium text-slate-200">Web App Frontend &amp; Deliverables Batch</p>
                    <p className="text-[11px] text-slate-400">React • Clean Architecture • Client approved</p>
                  </div>
                  <span className="text-slate-300 font-medium text-[13px]">Paid</span>
                </div>
              </div>
            </div>

            {/* Workflow Tags */}
            <div className="pt-1 flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">Workflow:</span>
              {['Figma', 'VS Code', 'Premiere Pro', 'Notion', 'DaVinci Resolve', 'Drive'].map((app) => (
                <span
                  key={app}
                  className="px-2 py-0.5 rounded bg-[#212121] text-slate-300 text-[11px] font-medium border border-[#333333]"
                >
                  {app}
                </span>
              ))}
            </div>
          </div>

          {/* Right Column: Sign In Card */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto">
            <div className="bg-[#212121] p-6 sm:p-8 rounded-xl shadow-xs border border-[#333333] text-center">
              <div className="flex items-center justify-center gap-2.5 mb-5">
                <Logo className="w-10 h-10 shadow-xs" />
                <span className="text-xl font-bold text-white tracking-tight">CrestFlow</span>
              </div>

              <h2 className="text-xl font-bold text-white mb-1">
                {isAdminRoute ? 'Admin Portal' : 'Freelancer Sign In'}
              </h2>
              <p className="text-slate-400 mb-6 text-xs sm:text-sm leading-relaxed">
                {isAdminRoute 
                  ? 'Please sign in with Google to authenticate and load the Admin database console.' 
                  : 'Sign in with your Google account to access your workspace, clients, and active deliverables.'}
              </p>

              <button 
                type="button"
                onClick={onLogin}
                disabled={isSigningIn}
                className="w-full flex items-center justify-center gap-2.5 bg-[#282828] hover:bg-[#383838] disabled:opacity-50 text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-colors cursor-pointer disabled:cursor-not-allowed shadow-xs border border-[#3a3a3a]"
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
                  className="mt-4 text-xs text-slate-300 hover:text-white font-medium transition-colors border-none bg-transparent cursor-pointer"
                >
                  Back to Main Website
                </button>
              )}

              <div className="mt-6 pt-5 border-t border-[#2a2a2a] text-center">
                <p className="text-[11px] text-slate-400">
                  Need assistance?{' '}
                  <a
                    href="/contact"
                    onClick={(e) => {
                      e.preventDefault();
                      onSupportingNavigate('contact');
                    }}
                    className="text-slate-300 hover:text-white underline"
                  >
                    Contact support
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer variant="minimal" onNavigate={onSupportingNavigate} />
    </div>
  );
};
