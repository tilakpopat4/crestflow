/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import Sidebar from './components/Sidebar';
import GlobalHeader from './components/GlobalHeader';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, onAuthStateChanged, User, signOut, GoogleAuthProvider } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirestore, safeStringify } from './hooks/useFirestore';
import { UserProfile } from './types';
import Logo from './components/Logo';
import { ShieldAlert, LogOut, Film, Calendar, FileText } from 'lucide-react';
import { setGmailAccessToken } from './lib/gmailService';
import { setDriveAccessToken } from './lib/driveService';
import { calculateWorkJourney, isAnniversaryDismissed, dismissAnniversary } from './lib/anniversary';

import Footer from './components/Footer';

const DashboardTab = lazy(() => import('./components/DashboardTab'));
const ClientsTab = lazy(() => import('./components/ClientsTab'));
const InvoiceTab = lazy(() => import('./components/InvoiceTab'));
const WorkLogTab = lazy(() => import('./components/WorkLogTab').then(m => ({ default: m.WorkLogTab })));
const ReviewsTab = lazy(() => import('./components/ReviewsTab'));
const AdminTab = lazy(() => import('./components/AdminTab'));
const ClientPortal = lazy(() => import('./components/ClientPortal'));
const PublicFreelancerProfile = lazy(() => import('./components/PublicFreelancerProfile'));
const ClientFeedbackForm = lazy(() => import('./components/ClientFeedbackForm'));
const ProfileModal = lazy(() => import('./components/ProfileModal'));
const AnniversaryModal = lazy(() => import('./components/AnniversaryModal'));
const PrivacyPolicyPage = lazy(() => import('./components/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('./components/TermsOfServicePage'));
const ContactPage = lazy(() => import('./components/ContactPage'));

const ViewLoadingFallback = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[360px] animate-in fade-in duration-150 select-none">
    <div className="relative flex items-center justify-center mb-3.5">
      <div className="w-9 h-9 rounded-full border-2 border-indigo-100 dark:border-indigo-950/60" />
      <div className="absolute w-9 h-9 rounded-full border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent animate-spin" />
    </div>
    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 tracking-wide">Loading workspace...</span>
  </div>
);

export type Tab = 'dashboard' | 'clients' | 'work' | 'invoice' | 'reviews' | 'admin';

export default function App() {
  const [freelancerId, setFreelancerId] = useState<string | null>(() => {
    return new URLSearchParams(window.location.search).get('freelancerId');
  });
  const [isClientPortalMode, setIsClientPortalMode] = useState(() => {
    return window.location.search.includes('portal=client') || window.location.hash.includes('portal');
  });
  const [isSigningIn, setIsSigningIn] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState<boolean | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [selectedClientIdFromSearch, setSelectedClientIdFromSearch] = useState<string | null>(null);
  const [isAnniversaryModalOpen, setIsAnniversaryModalOpen] = useState(false);
  const checkSupportingRoute = (): 'privacy' | 'terms' | 'contact' | null => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    if (path === '/privacy' || hash === '#/privacy' || hash === '#privacy') return 'privacy';
    if (path === '/terms' || hash === '#/terms' || hash === '#terms') return 'terms';
    if (path === '/contact' || hash === '#/contact' || hash === '#contact') return 'contact';
    return null;
  };

  const checkIsAdminRoute = () => {
    return (
      window.location.pathname === '/admin' ||
      window.location.hash === '#/admin' ||
      window.location.hash === '#admin' ||
      window.location.search.includes('admin=true')
    );
  };

  const [isAdminRoute, setIsAdminRoute] = useState(checkIsAdminRoute());
  const [supportingRoute, setSupportingRoute] = useState<'privacy' | 'terms' | 'contact' | null>(checkSupportingRoute());

  // Handle browser back/forward buttons or direct path modifications
  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdminRoute(checkIsAdminRoute());
      setSupportingRoute(checkSupportingRoute());
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const handleSupportingNavigate = (route: 'privacy' | 'terms' | 'contact') => {
    setSupportingRoute(route);
  };

  const handleTabChange = (tab: Tab, query?: string) => {
    if (supportingRoute) {
      setSupportingRoute(null);
      window.history.pushState({}, '', '/');
    }
    if (query !== undefined) {
      setGlobalSearchQuery(query);
    }
    setActiveTab(tab);
  };

  // Load user profile from profiles collection in Firestore
  const { data: profiles, loading: profilesLoading, addOrUpdateItem: firestoreSaveProfile } = useFirestore<UserProfile>('profiles', user?.uid);
  
  const [cachedProfile, setCachedProfile] = useState<UserProfile | null>(() => {
    if (user?.uid) {
      try {
        const saved = localStorage.getItem(`crestflow_profile_${user.uid}`);
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  // Sync profile cache whenever user or Firestore profile changes
  useEffect(() => {
    if (!user) {
      setCachedProfile(null);
      return;
    }
    try {
      const saved = localStorage.getItem(`crestflow_profile_${user.uid}`);
      if (saved) {
        setCachedProfile(JSON.parse(saved));
      }
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useEffect(() => {
    if (user && profiles.length > 0) {
      const firestoreProf = profiles[0];
      setCachedProfile(firestoreProf);
      try {
        localStorage.setItem(`crestflow_profile_${user.uid}`, safeStringify(firestoreProf));
        localStorage.setItem(`crestflow_profile_completed_${user.uid}`, 'true');
      } catch (err) {
        console.error(err);
      }
    }
  }, [user, profiles]);

  const profile = profiles[0] || cachedProfile;

  const handleSaveProfile = async (updatedProfile: UserProfile) => {
    if (!user) return;
    setCachedProfile(updatedProfile);
    try {
      localStorage.setItem(`crestflow_profile_${user.uid}`, safeStringify(updatedProfile));
      localStorage.setItem(`crestflow_profile_completed_${user.uid}`, 'true');
    } catch (err) {
      console.error(err);
    }
    await firestoreSaveProfile(updatedProfile);
  };

  const handleCloseProfileModal = () => {
    if (user) {
      try {
        localStorage.setItem(`crestflow_profile_dismissed_${user.uid}`, 'true');
      } catch (err) {
        console.error(err);
      }
    }
    setIsProfileModalOpen(false);
  };

  const journey = calculateWorkJourney(profile?.freelanceStartDate);

  // Check and notify on career anniversaries (1 mo, 6 mos, 1 yr, etc.)
  useEffect(() => {
    if (!user || !profile?.freelanceStartDate) return;
    const stats = calculateWorkJourney(profile.freelanceStartDate);
    if (stats?.currentAnniversary) {
      const alreadyDismissed = isAnniversaryDismissed(user.uid, stats.currentAnniversary.id);
      if (!alreadyDismissed) {
        setIsAnniversaryModalOpen(true);
      }
    }
  }, [user?.uid, profile?.freelanceStartDate]);

  const handleCloseAnniversaryModal = () => {
    if (user && journey?.currentAnniversary) {
      dismissAnniversary(user.uid, journey.currentAnniversary.id);
    }
    setIsAnniversaryModalOpen(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listen to blocked status in real-time
  useEffect(() => {
    if (!user) {
      setIsBlocked(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'blocked_users', user.uid),
      (docSnap) => {
        setIsBlocked(docSnap.exists());
      },
      (error) => {
        console.error("Error checking block list:", error);
        setIsBlocked(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Open profile modal ONLY IF user is signed in, profile is empty, and user hasn't completed or dismissed it on this device
  useEffect(() => {
    if (user && !profilesLoading && isBlocked === false && !isClientPortalMode) {
      const isCompleted = localStorage.getItem(`crestflow_profile_completed_${user.uid}`) === 'true';
      const isDismissed = localStorage.getItem(`crestflow_profile_dismissed_${user.uid}`) === 'true';
      if (!profile && !isCompleted && !isDismissed) {
        setIsProfileModalOpen(true);
      }
    }
  }, [user, profilesLoading, profile, isBlocked, isClientPortalMode]);

  const handleLogin = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      googleProvider.addScope('https://www.googleapis.com/auth/gmail.send');
      googleProvider.addScope('https://www.googleapis.com/auth/gmail.compose');
      googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
      const res = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(res);
      if (credential?.accessToken) {
        setGmailAccessToken(credential.accessToken);
        setDriveAccessToken(credential.accessToken);
      }
    } catch (error: any) {
      console.error(error);
      if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
        return;
      }
      alert(`Sign in failed. This is often because the app is running in a preview window (iframe). Please open the app in a new tab using the arrow icon in the top right, and try again.\n\nError: ${error.message}`);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
    }
  };

  const isFeedbackRoute = window.location.search.includes('feedback=true');

  if (isFeedbackRoute) {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <ClientFeedbackForm />
      </Suspense>
    );
  }

  if (freelancerId) {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <PublicFreelancerProfile 
          freelancerId={freelancerId} 
          onClose={() => {
            const url = new URL(window.location.href);
            url.searchParams.delete('freelancerId');
            window.history.replaceState({}, '', url.pathname + url.search);
            setFreelancerId(null);
          }}
        />
      </Suspense>
    );
  }


    if (loading || (user && (profilesLoading || isBlocked === null))) {
      return (
        <div className="flex items-center justify-center h-screen w-full bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  // Render blocked user screen if they are blocked
  if (user && isBlocked === true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 dark:bg-slate-950 p-4 relative overflow-hidden font-sans text-slate-100">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20"></div>
        
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl relative z-10 text-center space-y-6">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Access Restricted</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Your account has been deactivated or blocked by the platform administrator. You no longer have permission to use this application.
            </p>
          </div>

          <div className="bg-slate-900/50 rounded-xl p-4 text-xs text-slate-500 leading-relaxed text-left border border-slate-700/50">
            <span className="font-semibold text-slate-400">Account details:</span>
            <div className="mt-1 font-mono break-all text-slate-400">UID: {user.uid}</div>
            <div className="font-mono mt-0.5 text-slate-400">Email: {user.email}</div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-xs"
            >
              <LogOut className="w-4 h-4" />
              Sign Out & Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (supportingRoute && !user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-150">
        <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 md:px-8 transition-colors">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                setSupportingRoute(null);
                window.history.pushState({}, '', '/');
              }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Logo className="w-6 h-6 md:w-7 md:h-7" />
              <span className="font-extrabold text-slate-900 dark:text-white tracking-tight text-sm md:text-base">
                CrestFlow
              </span>
            </a>
            <button
              type="button"
              onClick={() => {
                setSupportingRoute(null);
                window.history.pushState({}, '', '/');
              }}
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </header>
        <main className="flex-1 flex flex-col">
          <Suspense fallback={<ViewLoadingFallback />}>
            {supportingRoute === 'privacy' && <PrivacyPolicyPage onNavigate={handleSupportingNavigate} />}
            {supportingRoute === 'terms' && <TermsOfServicePage onNavigate={handleSupportingNavigate} />}
            {supportingRoute === 'contact' && <ContactPage />}
          </Suspense>
        </main>
        <Footer onNavigate={handleSupportingNavigate} />
      </div>
    );
  }

  if (!user) {
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
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-white/15 text-white border border-white/20 text-xs font-mono uppercase tracking-wider mb-3 backdrop-blur-xs">
                  <Film size={12} className="text-white" />
                  Built for Video Editors & Creators
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
                    Reels, longform edits & Drive links.
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
                    className="px-2 py-0.5 rounded bg-white/20 text-white text-[11px] font-medium backdrop-blur-xs"
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
                  onClick={handleLogin}
                  disabled={isSigningIn}
                  className="w-full flex items-center justify-center gap-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-colors cursor-pointer disabled:cursor-not-allowed shadow-sm border-none"
                >
                  {isSigningIn ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                    </svg>
                  )}
                  <span>{isSigningIn ? 'Signing In...' : (isAdminRoute ? 'Admin Sign In' : 'Sign in with Google')}</span>
                </button>

                {isAdminRoute && (
                  <button
                    onClick={() => { window.location.href = '/' }}
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
                        handleSupportingNavigate('contact');
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

        <Footer variant="minimal" transparent onNavigate={handleSupportingNavigate} />
      </div>
    );
  }

  if (isAdminRoute) {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <AdminTab />
      </Suspense>
    );
  }

  // Render Client Portal if user is in client mode
  if (isClientPortalMode) {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <ClientPortal 
          user={user} 
          onLogout={handleLogout} 
          onSwitchToFreelancer={() => setIsClientPortalMode(false)} 
        />
      </Suspense>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-150">
      <Sidebar 
        activeTab={supportingRoute ? ('' as any) : activeTab} 
        setActiveTab={handleTabChange} 
        user={user} 
        onLogout={handleLogout} 
        profile={profile}
        onEditProfile={() => setIsProfileModalOpen(true)}
        onSwitchToClient={() => setIsClientPortalMode(true)}
      />
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative pb-20 md:pb-0">
        <GlobalHeader
          user={user}
          activeTab={supportingRoute ? ('' as any) : activeTab}
          setActiveTab={handleTabChange}
          onSearchSelect={(type, id, query) => {
            if (supportingRoute) {
              setSupportingRoute(null);
              window.history.pushState({}, '', '/');
            }
            if (query !== undefined) setGlobalSearchQuery(query);
            if (type === 'client') {
              setSelectedClientIdFromSearch(id);
              setActiveTab('clients');
            } else if (type === 'work') {
              setActiveTab('work');
            } else if (type === 'invoice') {
              setActiveTab('invoice');
            }
          }}
          globalQuery={globalSearchQuery}
          setGlobalQuery={setGlobalSearchQuery}
          profile={profile}
          onEditProfile={() => setIsProfileModalOpen(true)}
          onOpenAnniversaryModal={() => setIsAnniversaryModalOpen(true)}
        />
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col">
          <div className="flex-1 flex flex-col">
            <Suspense fallback={<ViewLoadingFallback />}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={supportingRoute || activeTab}
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -5 }}
                  transition={{
                    duration: shouldReduceMotion ? 0.01 : 0.18,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex-1 w-full flex flex-col"
                >
                  {supportingRoute === 'privacy' && <PrivacyPolicyPage onNavigate={handleSupportingNavigate} />}
                  {supportingRoute === 'terms' && <TermsOfServicePage onNavigate={handleSupportingNavigate} />}
                  {supportingRoute === 'contact' && <ContactPage />}
                  {!supportingRoute && activeTab === 'dashboard' && <DashboardTab user={user} profile={profile} onNavigateToClients={() => setActiveTab('clients')} />}
                  {!supportingRoute && activeTab === 'clients' && <ClientsTab user={user} initialSearchQuery={globalSearchQuery} initialSelectedClientId={selectedClientIdFromSearch} />}
                  {!supportingRoute && activeTab === 'work' && <WorkLogTab user={user} initialSearchQuery={globalSearchQuery} />}
                  {!supportingRoute && activeTab === 'invoice' && <InvoiceTab user={user} profile={profile} initialSearchQuery={globalSearchQuery} />}
                  {!supportingRoute && activeTab === 'reviews' && <ReviewsTab user={user} profile={profile} />}
                  {!supportingRoute && activeTab === 'admin' && <AdminTab />}
                </motion.div>
              </AnimatePresence>
            </Suspense>
          </div>
          <Footer onNavigate={handleSupportingNavigate} />
        </div>
      </main>

      {user && isProfileModalOpen && (
        <Suspense fallback={null}>
          <ProfileModal 
            isOpen={isProfileModalOpen}
            onClose={handleCloseProfileModal}
            user={user}
            initialProfile={profile}
            onSave={handleSaveProfile}
            isMandatory={!profile && !localStorage.getItem(`crestflow_profile_completed_${user.uid}`)}
          />
        </Suspense>
      )}

      {user && isAnniversaryModalOpen && (
        <Suspense fallback={null}>
          <AnniversaryModal
            isOpen={isAnniversaryModalOpen}
            onClose={handleCloseAnniversaryModal}
            milestone={journey?.currentAnniversary || null}
            stats={journey}
            freelancerName={profile?.name || user.displayName || undefined}
          />
        </Suspense>
      )}
    </div>
  );
}
