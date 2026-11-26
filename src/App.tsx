/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, Suspense } from 'react';
import { User } from 'firebase/auth';
import Sidebar from './components/Sidebar';
import GlobalHeader from './components/GlobalHeader';
import { useAuthSession } from './hooks/useAuthSession';
import { AccessProvider } from './context/AccessContext';
import { useAccess } from './hooks/useAccess';
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
import { UpgradeSheet } from './components/access/UpgradeSheet';
import { PwaInstallPrompt } from './components/pwa/PwaInstallPrompt';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import { lazyWithRetry } from './lib/lazyWithRetry';
import { WorkspaceShellSkeleton } from './components/skeletons';
import PublicPageView from './components/layout/PublicPageView';
import { updatePageMeta } from './lib/seoMeta';

const AdminTab = lazyWithRetry(() => import('./components/AdminTab'));
const PublicFreelancerProfile = lazyWithRetry(() => import('./components/PublicFreelancerProfile'));
const ClientFeedbackForm = lazyWithRetry(() => import('./components/ClientFeedbackForm'));
const PublicInvoicePage = lazyWithRetry(() => import('./components/invoice/PublicInvoicePage'));
const AnniversaryModal = lazyWithRetry(() => import('./components/AnniversaryModal'));
const NotFoundScreen = lazyWithRetry(() => import('./components/NotFoundScreen'));
const UserOnboardingModal: React.ComponentType<any> = lazyWithRetry(
  () => import('./components/onboarding/UserOnboardingModal'),
  (m) => ({ default: m.default || m.UserOnboardingModal }),
);

const ViewLoadingFallback = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[360px] bg-[#0B0B0E] select-none">
    <div className="w-8 h-8 rounded-full border-2 border-[#2A2A33] border-t-[#E0002B] animate-spin mb-3" />
    <span className="text-xs font-medium text-[#A1A1AA] tracking-wide">Loading workspace...</span>
  </div>
);

export type Tab = 'dashboard' | 'clients' | 'work' | 'invoice' | 'reviews' | 'onboarding' | 'admin' | 'profile';

interface AppWorkspaceProps {
  user: User | null;
  authLoading: boolean;
  isSigningIn: boolean;
  isBlocked: boolean | null;
  handleLogin: () => Promise<void>;
  handleEmailSignUp: (email: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  handleEmailSignIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  handleLogout: () => Promise<void>;
}

function AppWorkspace({
  user,
  authLoading,
  isSigningIn,
  isBlocked,
  handleLogin,
  handleEmailSignUp,
  handleEmailSignIn,
  handleLogout,
}: AppWorkspaceProps) {
  const { currentRoute, params, isSpecialMode, navigate } = useAppRouter();
  const access = useAccess();
  const subscriptionState = useSubscription(user?.uid, user?.email || undefined);
  const { isCollapsed: isSidebarCollapsed, toggleSidebar, collapseSidebar, expandSidebar } = useSidebarCollapse();
  const { profile, profilesLoading, handleSaveProfile } = useUserProfile(user);
  const { journey, isAnniversaryModalOpen, openAnniversaryModal, closeAnniversaryModal } = useAnniversaryCheck(
    user,
    profile?.freelanceStartDate,
  );

  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [selectedClientIdFromSearch, setSelectedClientIdFromSearch] = useState<string | null>(null);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(false);

  useEffect(() => {
    updatePageMeta(currentRoute);
  }, [currentRoute]);

  useEffect(() => {
    if (user && (isSpecialMode === 'auth' || isSpecialMode === 'promo')) {
      navigate('dashboard', undefined, true);
    }
  }, [user, isSpecialMode, navigate]);

  if (isSpecialMode === 'public_invoice' && params.invoiceId) {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <PublicInvoicePage invoiceId={params.invoiceId} token={params.t || ''} />
      </Suspense>
    );
  }

  if (isSpecialMode === 'feedback') {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <ClientFeedbackForm />
      </Suspense>
    );
  }

  if (isSpecialMode === 'freelancer_profile' && (params.freelancerId || params.username)) {
    const targetHandle = params.username || params.freelancerId;
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <PublicFreelancerProfile freelancerId={targetHandle} />
      </Suspense>
    );
  }

  if (currentRoute === 'not_found') {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <NotFoundScreen onBack={() => navigate('dashboard')} />
      </Suspense>
    );
  }

  // Flicker-free initialization: never render a paywall or partial screen while auth or access resolves
  if (authLoading || (user && (profilesLoading || access.isLoading))) {
    return <WorkspaceShellSkeleton />;
  }

  if (user && isBlocked === true) {
    return <BlockedUserScreen user={user} onLogout={handleLogout} />;
  }

  if (['privacy', 'terms', 'refund', 'contact', 'pricing'].includes(currentRoute)) {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <PublicPageView
          currentRoute={currentRoute}
          user={user}
          onNavigate={(r) => navigate(r)}
        />
      </Suspense>
    );
  }

  if (!user) {
    return (
      <SignInScreen
        user={user}
        isAdminRoute={currentRoute === 'admin'}
        isSigningIn={isSigningIn}
        onLogin={handleLogin}
        onEmailSignUp={handleEmailSignUp}
        onEmailSignIn={handleEmailSignIn}
        onSupportingNavigate={(r) => navigate(r)}
        initialMode={isSpecialMode === 'auth' ? 'auth' : 'promo'}
      />
    );
  }

  if (currentRoute === 'admin') {
    return (
      <div className="h-screen w-full bg-[#0B0B0E] text-[#F7F7F8] overflow-y-auto flex flex-col">
        <div className="flex-1">
          <Suspense fallback={<ViewLoadingFallback />}>
            <AdminTab user={user} onNavigateBack={() => navigate('dashboard')} />
          </Suspense>
        </div>
        <Footer onNavigate={(r) => navigate(r)} />
      </div>
    );
  }

  const isSupportingRoute = ['privacy', 'terms', 'contact', 'refund', 'pricing'].includes(currentRoute);
  const hasCompletedProfile = Boolean(
    isOnboardingCompleted || localStorage.getItem(`crestflow_onboarded_${user.uid}`) || (profile?.upiId && profile?.name),
  );

  // Starting a trial enters onboarding wizard directly
  if (access.state === 'trialing' && !isSupportingRoute && (access.justStartedTrial || !hasCompletedProfile)) {
    return (
      <div className="h-screen w-full bg-[#0B0B0E] text-[#F7F7F8] overflow-y-auto flex flex-col justify-between">
        <ErrorBoundary fallbackTitle="Workspace Setup">
          <Suspense fallback={<ViewLoadingFallback />}>
            <UserOnboardingModal
              user={user}
              profile={profile}
              isOpen={true}
              onSaveProfile={handleSaveProfile}
              onLogout={handleLogout}
              onComplete={(nextRoute?: AppRoute) => {
                localStorage.setItem(`crestflow_onboarded_${user.uid}`, 'true');
                setIsOnboardingCompleted(true);
                access.clearJustStartedTrial();
                if (nextRoute) navigate(nextRoute);
              }}
            />
          </Suspense>
        </ErrorBoundary>
        <Footer onNavigate={(r) => navigate(r)} />
      </div>
    );
  }

  const openUpgrade = () =>
    access.openUpgradeSheet({
      action: 'upgrade',
      benefit: 'Choose a CrestFlow Pro plan for uninterrupted client & UPI invoice management.',
    });

  const sidebarTab = currentRoute === 'invoices' ? 'invoice' : currentRoute;

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] max-h-[100dvh] w-full bg-[#0B0B0E] text-[#F7F7F8] overflow-hidden font-sans relative">
      <SidebarSwipeReveal isCollapsed={isSidebarCollapsed} onExpand={expandSidebar} />

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
        subscriptionState={subscriptionState}
        onOpenSubscriptionModal={openUpgrade}
        isCollapsed={isSidebarCollapsed}
        onCollapse={collapseSidebar}
      />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative pb-16 md:pb-0 bg-[#0B0B0E]">
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
          onOpenSubscriptionModal={openUpgrade}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        />

        <MembershipBanner subscriptionState={subscriptionState} profile={profile} onOpenPricing={() => navigate('pricing')} onOpenBilling={() => navigate('billing')} />
        <AppRouterView
          currentRoute={currentRoute} user={user} profile={profile} subscriptionState={subscriptionState}
          globalSearchQuery={globalSearchQuery} selectedClientId={selectedClientIdFromSearch || params.id || null}
          onNavigate={(r) => navigate(r)} onSaveProfile={handleSaveProfile} onOpenSubscriptionModal={openUpgrade}
        />
      </main>
      {user && isAnniversaryModalOpen && (
        <Suspense fallback={null}>
          <AnniversaryModal isOpen={isAnniversaryModalOpen} onClose={closeAnniversaryModal} milestone={journey?.currentAnniversary || null} stats={journey} freelancerName={profile?.name || user.displayName || undefined} />
        </Suspense>
      )}
      <PwaInstallPrompt />
    </div>
  );
}

export default function App() {
  const { user, loading, isSigningIn, isBlocked, handleLogin, handleEmailSignUp, handleEmailSignIn, handleLogout } = useAuthSession();
  return (
    <AccessProvider user={user} authLoading={loading}>
      <AppWorkspace
        user={user} authLoading={loading} isSigningIn={isSigningIn} isBlocked={isBlocked}
        handleLogin={handleLogin} handleEmailSignUp={handleEmailSignUp} handleEmailSignIn={handleEmailSignIn} handleLogout={handleLogout}
      />
      <UpgradeSheet />
    </AccessProvider>
  );
}
