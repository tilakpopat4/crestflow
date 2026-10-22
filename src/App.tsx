/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import GlobalHeader from './components/GlobalHeader';
import { useAuthSession } from './hooks/useAuthSession';
import { useSubscription } from './hooks/useSubscription';
import { useUserProfile } from './hooks/useUserProfile';
import { useAppRouter } from './hooks/useAppRouter';
import { useSidebarCollapse } from './hooks/useSidebarCollapse';
import { useAnniversaryCheck } from './hooks/useAnniversaryCheck';
import { AppRoute } from './lib/router';
import { BlockedUserScreen } from './components/auth/BlockedUserScreen';
import { SignInScreen } from './components/auth/SignInScreen';
import { AppRouterView } from './components/layout/AppRouterView';
import { SidebarSwipeReveal } from './components/layout/SidebarSwipeReveal';
import { MembershipBanner } from './components/subscription/MembershipBanner';
import Footer from './components/Footer';
import { lazyWithRetry } from './lib/lazyWithRetry';

const ClientPortal = lazyWithRetry(() => import('./components/ClientPortal'));
const AdminTab = lazyWithRetry(() => import('./components/AdminTab'));
const PublicFreelancerProfile = lazyWithRetry(() => import('./components/PublicFreelancerProfile'));
const ClientFeedbackForm = lazyWithRetry(() => import('./components/ClientFeedbackForm'));
const SubscriptionModal = lazyWithRetry(() => import('./components/SubscriptionModal'));
const AnniversaryModal = lazyWithRetry(() => import('./components/AnniversaryModal'));
const UserOnboardingModal = lazyWithRetry(
  () => import('./components/onboarding/UserOnboardingModal'),
  (m) => ({ default: m.UserOnboardingModal })
);

const ViewLoadingFallback = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[360px] animate-in fade-in duration-150 select-none">
    <div className="relative flex items-center justify-center mb-3.5">
      <div className="w-9 h-9 rounded-full border-2 border-indigo-100 dark:border-indigo-950/60" />
      <div className="absolute w-9 h-9 rounded-full border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent animate-spin" />
    </div>
    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 tracking-wide">Loading workspace...</span>
  </div>
);

export type Tab = 'dashboard' | 'clients' | 'work' | 'invoice' | 'reviews' | 'onboarding' | 'admin' | 'profile';

export default function App() {
  const { currentRoute, params, isSpecialMode, navigate } = useAppRouter();
  const { user, loading, isSigningIn, isBlocked, handleLogin, handleLogout } = useAuthSession();

  const [isClientPortalMode, setIsClientPortalMode] = useState(isSpecialMode === 'client_portal');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [selectedClientIdFromSearch, setSelectedClientIdFromSearch] = useState<string | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);

  const {
    isCollapsed: isSidebarCollapsed,
    toggleSidebar,
    collapseSidebar,
    expandSidebar,
  } = useSidebarCollapse();

  const { profile, profilesLoading, handleSaveProfile } = useUserProfile(user);
  const subscriptionState = useSubscription(user?.uid, profile, user?.email || undefined);
  const {
    journey,
    isAnniversaryModalOpen,
    openAnniversaryModal,
    closeAnniversaryModal,
  } = useAnniversaryCheck(user, profile?.freelanceStartDate);

  // Prompt onboarding if profile setup is incomplete
  useEffect(() => {
    if (user && profile && !profilesLoading) {
      const hasCompleted = localStorage.getItem(`crestflow_onboarded_${user.uid}`) || profile.upiId;
      if (!hasCompleted) {
        setIsOnboardingModalOpen(true);
      }
    }
  }, [user, profile, profilesLoading]);

  if (isSpecialMode === 'feedback') {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <ClientFeedbackForm />
      </Suspense>
    );
  }

  if (isSpecialMode === 'freelancer_profile' && params.freelancerId) {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <PublicFreelancerProfile freelancerId={params.freelancerId} />
      </Suspense>
    );
  }

  if (loading || (user && (profilesLoading || isBlocked === null))) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400" />
      </div>
    );
  }

  if (user && isBlocked === true) {
    return <BlockedUserScreen user={user} onLogout={handleLogout} />;
  }

  if (!user) {
    return (
      <SignInScreen
        isAdminRoute={currentRoute === 'admin'}
        isSigningIn={isSigningIn}
        onLogin={handleLogin}
        onSupportingNavigate={(r) => navigate(r)}
      />
    );
  }

  if (isClientPortalMode) {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <ClientPortal user={user} onLogout={handleLogout} onSwitchToFreelancer={() => setIsClientPortalMode(false)} />
      </Suspense>
    );
  }

  if (currentRoute === 'admin') {
    return (
      <div className="h-screen w-full bg-slate-50 dark:bg-slate-950 overflow-y-auto flex flex-col">
        <div className="flex-1">
          <Suspense fallback={<ViewLoadingFallback />}>
            <AdminTab user={user} onNavigateBack={() => navigate('dashboard')} />
          </Suspense>
        </div>
        <Footer onNavigate={(r) => navigate(r)} />
      </div>
    );
  }

  const isSupportingRoute = currentRoute === 'privacy' || currentRoute === 'terms' || currentRoute === 'contact' || currentRoute === 'refund';
  const sidebarTab = currentRoute === 'invoices' ? 'invoice' : currentRoute;

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] max-h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-150 relative">
      <SidebarSwipeReveal
        isCollapsed={isSidebarCollapsed}
        onExpand={expandSidebar}
      />

      <Sidebar
        activeTab={isSupportingRoute ? ('' as any) : sidebarTab}
        setActiveTab={(tab) => {
          const target = tab === 'invoice' ? 'invoices' : (tab as AppRoute);
          navigate(target);
        }}
        user={user}
        onLogout={handleLogout}
        profile={profile}
        onEditProfile={() => navigate('profile')}
        onSwitchToClient={() => setIsClientPortalMode(true)}
        subscriptionState={subscriptionState}
        onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
        isCollapsed={isSidebarCollapsed}
        onCollapse={collapseSidebar}
      />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative pb-16 md:pb-0 transition-all duration-200">
        <GlobalHeader
          user={user}
          activeTab={isSupportingRoute ? ('' as any) : sidebarTab}
          setActiveTab={(tab, query) => {
            if (query !== undefined) setGlobalSearchQuery(query);
            const target = tab === 'invoice' ? 'invoices' : (tab as AppRoute);
            navigate(target);
          }}
          onSearchSelect={(type, id, query) => {
            if (query !== undefined) setGlobalSearchQuery(query);
            if (type === 'client') {
              setSelectedClientIdFromSearch(id);
              navigate('clients', { id });
            } else if (type === 'work') {
              navigate('work');
            } else if (type === 'invoice') {
              navigate('invoices');
            }
          }}
          globalQuery={globalSearchQuery}
          setGlobalQuery={setGlobalSearchQuery}
          profile={profile}
          onEditProfile={() => navigate('profile')}
          onOpenAnniversaryModal={openAnniversaryModal}
          onLogout={handleLogout}
          subscriptionState={subscriptionState}
          onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        />

        <MembershipBanner
          subscriptionState={subscriptionState}
          onOpenPricing={() => navigate('pricing')}
          onOpenBilling={() => navigate('billing')}
        />

        <AppRouterView
          currentRoute={currentRoute}
          user={user}
          profile={profile}
          subscriptionState={subscriptionState}
          globalSearchQuery={globalSearchQuery}
          selectedClientId={selectedClientIdFromSearch || params.id || null}
          onNavigate={(r) => navigate(r)}
          onSaveProfile={handleSaveProfile}
          onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
        />
      </main>

      {user && isSubscriptionModalOpen && subscriptionState.isSubscriptionFeatureEnabled && (
        <Suspense fallback={null}>
          <SubscriptionModal
            isOpen={isSubscriptionModalOpen}
            onClose={() => setIsSubscriptionModalOpen(false)}
            user={user}
            profile={profile}
            onSubscriptionUpdated={async () => {
              await subscriptionState.refreshSubscription();
            }}
            isMandatory={!subscriptionState.hasAccess}
            onLogout={handleLogout}
          />
        </Suspense>
      )}

      {user && isOnboardingModalOpen && (
        <Suspense fallback={null}>
          <UserOnboardingModal
            user={user}
            profile={profile}
            isOpen={isOnboardingModalOpen}
            onComplete={() => {
              localStorage.setItem(`crestflow_onboarded_${user.uid}`, 'true');
              setIsOnboardingModalOpen(false);
            }}
          />
        </Suspense>
      )}

      {user && isAnniversaryModalOpen && (
        <Suspense fallback={null}>
          <AnniversaryModal
            isOpen={isAnniversaryModalOpen}
            onClose={closeAnniversaryModal}
            milestone={journey?.currentAnniversary || null}
            stats={journey}
            freelancerName={profile?.name || user.displayName || undefined}
          />
        </Suspense>
      )}
    </div>
  );
}
