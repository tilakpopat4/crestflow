import React from 'react';
import { User } from 'firebase/auth';
import { AppRoute } from '../../lib/router';
import PrivacyPolicyPage from '../PrivacyPolicyPage';
import TermsOfServicePage from '../TermsOfServicePage';
import RefundPolicyPage from '../RefundPolicyPage';
import ContactPage from '../ContactPage';
import PricingPage from '../subscription/PricingPage';
import Footer from '../Footer';
import Logo from '../Logo';

interface PublicPageViewProps {
  currentRoute: AppRoute;
  user: User | null;
  onNavigate: (route: AppRoute) => void;
}

export default function PublicPageView({
  currentRoute,
  user,
  onNavigate,
}: PublicPageViewProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between">
      {/* Public Top Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 sm:px-8 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 cursor-pointer border-none bg-transparent"
          >
            <Logo className="w-7 h-7" />
            <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight">CrestFlow</span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => onNavigate('pricing')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer border-none ${
                currentRoute === 'pricing'
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-transparent'
              }`}
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#282828] text-white hover:bg-[#383838] transition-colors cursor-pointer border-none"
            >
              {user ? 'Open Workspace' : 'Sign In'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {currentRoute === 'privacy' && <PrivacyPolicyPage onNavigate={onNavigate} />}
        {currentRoute === 'terms' && <TermsOfServicePage onNavigate={onNavigate} />}
        {currentRoute === 'refund' && <RefundPolicyPage onNavigate={onNavigate} />}
        {currentRoute === 'contact' && <ContactPage />}
        {currentRoute === 'pricing' && (
          <PricingPage
            user={user}
            onNavigateToDashboard={() => onNavigate('dashboard')}
            onNavigateToAuth={() => onNavigate('dashboard')}
          />
        )}
      </main>

      {/* Unified Footer */}
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
