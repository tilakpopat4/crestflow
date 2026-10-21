/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { ChevronRight } from 'lucide-react';
import Sidebar from './components/Sidebar';
import GlobalHeader from './components/GlobalHeader';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { calculateWorkJourney, isAnniversaryDismissed, dismissAnniversary } from './lib/anniversary';
import { useSubscription } from './hooks/useSubscription';
import { useUserProfile } from './hooks/useUserProfile';
import { useAppRouter } from './hooks/useAppRouter';
import { useSidebarCollapse } from './hooks/useSidebarCollapse';
import { AppRoute } from './lib/router';
import { BlockedUserScreen } from './components/auth/BlockedUserScreen';
import { SignInScreen } from './components/auth/SignInScreen';
import { AppRouterView } from './components/layout/AppRouterView';
import { SidebarSwipeReveal } from './components/layout/SidebarSwipeReveal';
import Footer from './components/Footer';

const ClientPortal = lazy(() => import('./components/ClientPortal'));
const AdminTab = lazy(() => import('./components/AdminTab'));
const PublicFreelancerProfile = lazy(() => import('./components/PublicFreelancerProfile'));
const ClientFeedbackForm = lazy(() => import('./components/ClientFeedbackForm'));
const SubscriptionModal = lazy(() => import('./components/SubscriptionModal'));
const AnniversaryModal = lazy(() => import('./components/AnniversaryModal'));

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

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isBlocked, setIsBlocked] = useState<boolean | null>(null);
  const [isClientPortalMode, setIsClientPortalMode] = useState(isSpecialMode === 'client_portal');

  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [selectedClientIdFromSearch, setSelectedClientIdFromSearch] = useState<string | null>(null);
  const [isAnniversaryModalOpen, setIsAnniversaryModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  // Sidebar collapse and swipe interaction state
  const {
    isCollapsed: isSidebarCollapsed,
    toggleSidebar,
    collapseSidebar,
    expandSidebar,
  } = useSidebarCollapse();

  // Profile data & Firestore persistence via hook
  const { profile, profilesLoading, handleSaveProfile } = useUserProfile(user);
  const subscriptionState = useSubscription(user?.uid, profile, user?.email || undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listen to blocked status
  useEffect(() => {
    if (!user) {
      setIsBlocked(false);
      return;
    }
    const unsub = onSnapshot(doc(db, 'blocked_users', user.uid), (snap) => {
      setIsBlocked(snap.exists());
    }, () => setIsBlocked(false));
    return () => unsub();
  }, [user]);

  const journey = calculateWorkJourney(profile?.freelanceStartDate);

  // Check career anniversary milestone
  useEffect(() => {
    if (!user || !profile?.freelanceStartDate) return;
    const stats = calculateWorkJourney(profile.freelanceStartDate);
    if (stats?.currentAnniversary && !isAnniversaryDismissed(user.uid, stats.currentAnniversary.id)) {
      setIsAnniversaryModalOpen(true);
    }
  }, [user?.uid, profile?.freelanceStartDate]);

  const handleLogin = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        alert(`Sign in error: ${err.message}`);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }
  };

  // Special public routes
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

  // Admin Portal: Standalone full-page view without left panel (Sidebar) and without search bar (GlobalHeader)
  if (currentRoute === 'admin') {
    return (
      <div className="h-screen w-full bg-slate-50 dark:bg-slate-950 overflow-y-auto flex flex-col">
        <div className="flex-1">
          <Suspense fallback={<ViewLoadingFallback />}>
            <AdminTab onNavigateBack={() => navigate('dashboard')} />
          </Suspense>
        </div>
        <Footer onNavigate={(r) => navigate(r)} />
      </div>
    );
  }

  const isSupportingRoute = currentRoute === 'privacy' || currentRoute === 'terms' || currentRoute === 'contact' || currentRoute === 'refund';
  const sidebarTab = currentRoute === 'invoices' ? 'invoice' : currentRoute;

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-150 relative">
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

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative pb-20 md:pb-0 transition-all duration-200">
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
          onOpenAnniversaryModal={() => setIsAnniversaryModalOpen(true)}
          onLogout={handleLogout}
          subscriptionState={subscriptionState}
          onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        />

        {!subscriptionState.hasAccess && subscriptionState.isSubscriptionFeatureEnabled && (
          <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2.5 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400" />
              <span>Subscription required: ₹49/month to manage clients, log work, and generate invoices.</span>
            </div>
            <button
              type="button"
              onClick={() => setIsSubscriptionModalOpen(true)}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition-colors cursor-pointer border-none"
            >
              Subscribe ₹49/mo
            </button>
          </div>
        )}

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

      {user && isAnniversaryModalOpen && (
        <Suspense fallback={null}>
          <AnniversaryModal
            isOpen={isAnniversaryModalOpen}
            onClose={() => {
              if (user && journey?.currentAnniversary) {
                dismissAnniversary(user.uid, journey.currentAnniversary.id);
              }
              setIsAnniversaryModalOpen(false);
            }}
            milestone={journey?.currentAnniversary || null}
            stats={journey}
            freelancerName={profile?.name || user.displayName || undefined}
          />
        </Suspense>
      )}
    </div>
  );
}
