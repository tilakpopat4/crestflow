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
    <div className="min-h-screen bg-[#0B0B0E] text-[#F7F7F8] flex flex-col justify-between">
      {/* Public Top Header */}
      <header className="border-b border-[#2A2A33] bg-[#131318] px-4 sm:px-8 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 cursor-pointer border-none bg-transparent"
          >
            <Logo className="w-7 h-7" />
            <span className="font-bold text-[#F7F7F8] text-base tracking-tight">CrestFlow</span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => onNavigate('pricing')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer border-none ${
                currentRoute === 'pricing'
                  ? 'bg-[#1B1B22] text-[#F7F7F8]'
                  : 'text-[#A1A1AA] hover:text-[#F7F7F8] bg-transparent'
              }`}
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg cf-btn-primary transition-colors cursor-pointer"
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
