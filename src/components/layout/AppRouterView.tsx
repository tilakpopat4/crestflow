import React, { lazy, Suspense } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { User } from 'firebase/auth';
import { UserProfile } from '../../types';
import { SubscriptionState } from '../../hooks/useSubscription';
import { AppRoute } from '../../lib/router';
import ErrorBoundary from '../ErrorBoundary';
import Footer from '../Footer';

const DashboardTab = lazy(() => import('../DashboardTab'));
const ClientsTab = lazy(() => import('../ClientsTab'));
const InvoiceTab = lazy(() => import('../InvoiceTab'));
const WorkLogTab = lazy(() => import('../WorkLogTab').then(m => ({ default: m.WorkLogTab })));
const ReviewsTab = lazy(() => import('../ReviewsTab'));
const ClientOnboardingTab = lazy(() => import('../ClientOnboardingTab'));
const AdminTab = lazy(() => import('../AdminTab'));
const ProfilePage = lazy(() => import('../ProfilePage'));
const PrivacyPolicyPage = lazy(() => import('../PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('../TermsOfServicePage'));
const ContactPage = lazy(() => import('../ContactPage'));
const RefundPolicyPage = lazy(() => import('../RefundPolicyPage'));

const ViewLoadingFallback = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[360px] animate-in fade-in duration-150 select-none">
    <div className="relative flex items-center justify-center mb-3.5">
      <div className="w-9 h-9 rounded-full border-2 border-indigo-100 dark:border-indigo-950/60" />
      <div className="absolute w-9 h-9 rounded-full border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent animate-spin" />
    </div>
    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 tracking-wide">Loading workspace...</span>
  </div>
);

interface AppRouterViewProps {
  currentRoute: AppRoute;
  user: User;
  profile: UserProfile | null;
  subscriptionState: SubscriptionState;
  globalSearchQuery: string;
  selectedClientId: string | null;
  onNavigate: (route: AppRoute) => void;
  onSaveProfile: (profile: UserProfile) => Promise<void>;
  onOpenSubscriptionModal: () => void;
}

export const AppRouterView: React.FC<AppRouterViewProps> = ({
  currentRoute,
  user,
  profile,
  subscriptionState,
  globalSearchQuery,
  selectedClientId,
  onNavigate,
  onSaveProfile,
  onOpenSubscriptionModal
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col">
      <div className="flex-1 flex flex-col">
        <ErrorBoundary fallbackTitle="Unable to display this view">
          <Suspense fallback={<ViewLoadingFallback />}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentRoute}
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 7 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -5 }}
                transition={{ duration: shouldReduceMotion ? 0.01 : 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="flex-1 w-full flex flex-col"
              >
                {currentRoute === 'privacy' && <PrivacyPolicyPage onNavigate={(r) => onNavigate(r)} />}
                {currentRoute === 'terms' && <TermsOfServicePage onNavigate={(r) => onNavigate(r)} />}
                {currentRoute === 'contact' && <ContactPage />}
                {currentRoute === 'refund' && <RefundPolicyPage onNavigate={(r) => onNavigate(r)} />}

                {currentRoute === 'dashboard' && (
                  <DashboardTab
                    user={user}
                    profile={profile}
                    onNavigateToClients={() => onNavigate('clients')}
                    onNavigateToWork={() => onNavigate('work')}
                    onNavigateToInvoices={() => onNavigate('invoices')}
                    onEditProfile={() => onNavigate('profile')}
                  />
                )}

                {currentRoute === 'clients' && (
                  <ClientsTab
                    user={user}
                    initialSearchQuery={globalSearchQuery}
                    initialSelectedClientId={selectedClientId}
                    subscriptionState={subscriptionState}
                    onOpenSubscriptionModal={onOpenSubscriptionModal}
                  />
                )}

                {currentRoute === 'work' && (
                  <WorkLogTab
                    user={user}
                    initialSearchQuery={globalSearchQuery}
                    onNavigateToClients={() => onNavigate('clients')}
                  />
                )}

                {currentRoute === 'invoices' && (
                  <InvoiceTab
                    user={user}
                    profile={profile}
                    initialSearchQuery={globalSearchQuery}
                    onNavigateToClients={() => onNavigate('clients')}
                    subscriptionState={subscriptionState}
                    onOpenSubscriptionModal={onOpenSubscriptionModal}
                  />
                )}

                {currentRoute === 'reviews' && <ReviewsTab user={user} profile={profile} />}

                {currentRoute === 'onboarding' && (
                  <ClientOnboardingTab
                    user={user}
                    profile={profile}
                    onNavigateToClients={() => onNavigate('clients')}
                  />
                )}

                {currentRoute === 'profile' && (
                  <ProfilePage
                    user={user}
                    profile={profile}
                    onSave={onSaveProfile}
                    subscriptionState={subscriptionState}
                    onOpenSubscriptionModal={onOpenSubscriptionModal}
                  />
                )}

                {currentRoute === 'admin' && <AdminTab />}
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </ErrorBoundary>
      </div>
      <Footer onNavigate={(r) => onNavigate(r)} />
    </div>
  );
};
