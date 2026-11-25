import React, { useState, useEffect } from 'react';
import { db, auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { query, where, getDocs, collection } from 'firebase/firestore';
import { UserProfile, Client } from '../types';
import Logo from './Logo';
import Footer from './Footer';
import SupportingInfoModal, { SupportingRoute } from './SupportingInfoModal';
import FreelancerExperienceAndClients from './FreelancerExperienceAndClients';
import PublicFreelancerProfileCard from './PublicFreelancerProfileCard';
import PublicOnboardingForm from './PublicOnboardingForm';
import PublicFreelancerProfileSubmitted from './PublicFreelancerProfileSubmitted';
import SampleVideoLibrary from './onboarding/SampleVideoLibrary';
import OnboardingViewTabs from './onboarding/OnboardingViewTabs';
import { lookupPublicProfile } from '../lib/profileLookup';
import { submitOnboardingServiceRequest } from '../lib/onboardingLead';
import PublicProfileNotFound from './onboarding/PublicProfileNotFound';
import { PublicProfileSkeleton } from './skeletons';

interface PublicFreelancerProfileProps {
  freelancerId: string;
}

export default function PublicFreelancerProfile({ freelancerId }: PublicFreelancerProfileProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);

  // Form State
  const [clientName, setClientName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [projectDetails, setProjectDetails] = useState('');
  const [instagram, setInstagram] = useState('');
  const [proposedRate, setProposedRate] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedWhatsAppUrl, setSubmittedWhatsAppUrl] = useState<string | null>(null);
  const [supportingRoute, setSupportingRoute] = useState<SupportingRoute | null>(null);
  const [activeView, setActiveView] = useState<'intake' | 'samples'>(() => {
    if (typeof window !== 'undefined' && (window.location.search.includes('view=samples') || window.location.search.includes('tab=samples'))) {
      return 'samples';
    }
    return 'intake';
  });

  useEffect(() => {
    const prevTitle = document.title;
    if (profile?.name) {
      const heading = `Claim The Service of ${profile.name}`;
      document.title = `${heading} - Client Onboarding | CrestFlow`;

      const updateMeta = (prop: string, val: string) => {
        const el = document.querySelector(`meta[property="${prop}"]`) || document.querySelector(`meta[name="${prop}"]`);
        if (el) {
          el.setAttribute('content', val);
        }
      };

      updateMeta('og:title', heading);
      updateMeta('twitter:title', heading);
      if (profile.photoURL) {
        updateMeta('og:image', profile.photoURL);
        updateMeta('twitter:image', profile.photoURL);
      }
    } else {
      document.title = 'Client Onboarding | CrestFlow';
    }
    return () => {
      document.title = prevTitle;
    };
  }, [profile?.name, profile?.photoURL]);

  const handleClearForm = () => {
    setClientName('');
    setContactName('');
    setContactPhone('');
    setContactEmail('');
    setProjectDetails('');
    setInstagram('');
    setProposedRate('');
  };

  useEffect(() => {
    async function fetchFreelancerData() {
      try {
        setLoading(true);
        setError(null);

        const foundProfile = await lookupPublicProfile(freelancerId);
        if (foundProfile) {
          setProfile(foundProfile);
          const targetUid = foundProfile.userId || foundProfile.id;

          try {
            setClientsLoading(true);
            const q = query(collection(db, 'clients'), where('userId', '==', targetUid));
            const clientsSnap = await getDocs(q);
            const clientList: Client[] = [];
            clientsSnap.forEach((cSnap) => {
              clientList.push({ id: cSnap.id, ...cSnap.data() } as Client);
            });
            setClients(clientList);
          } catch (clientErr) {
            console.warn('[PublicProfile] Could not load clients for profile:', clientErr);
          } finally {
            setClientsLoading(false);
          }
        } else {
          setError('Freelancer profile not found. Please verify the URL handle.');
        }
      } catch (err: any) {
        console.error(err);
        setError('Failed to load freelancer profile. Please check your internet connection.');
      } finally {
        setLoading(false);
      }
    }

    if (freelancerId) {
      fetchFreelancerData();
    }
  }, [freelancerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    let currentUser = auth.currentUser;
    if (!currentUser) {
      try {
        const cred = await signInWithPopup(auth, googleProvider);
        currentUser = cred.user;
        if (!contactEmail && currentUser.email) {
          setContactEmail(currentUser.email);
        }
        if (!contactName && currentUser.displayName) {
          setContactName(currentUser.displayName);
        }
      } catch (authErr: any) {
        if (authErr?.code !== 'auth/popup-closed-by-user') {
          alert('Sign in with Google is required to submit an onboarding request.');
        }
        return;
      }
    }

    if (!currentUser) return;

    setIsSubmitting(true);
    try {
      const result = await submitOnboardingServiceRequest({
        profile,
        clientName,
        contactName,
        contactPhone,
        contactEmail: contactEmail.trim() || currentUser.email || '',
        instagram,
        proposedRate,
        projectDetails,
        currentUser: { uid: currentUser.uid, email: currentUser.email },
      });

      if (result.waUrl) {
        setSubmittedWhatsAppUrl(result.waUrl);
        window.open(result.waUrl, '_blank', 'noopener,noreferrer');
      }

      setIsSubmitted(true);
    } catch (err) {
      console.error(err);
      alert('Failed to submit onboarding request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <PublicProfileSkeleton />;
  }

  if (error || !profile) {
    return <PublicProfileNotFound error={error} />;
  }

  if (isSubmitted) {
    return (
      <PublicFreelancerProfileSubmitted
        profile={profile}
        clientName={clientName}
        contactEmail={contactEmail}
        submittedWhatsAppUrl={submittedWhatsAppUrl}
        onReset={() => {
          setIsSubmitted(false);
          handleClearForm();
          setSubmittedWhatsAppUrl(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100 transition-colors duration-150">
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Logo className="w-7 h-7 rounded-lg" />
            <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight">CrestFlow</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Onboarding
          </span>
        </div>

        {/* Main 2-column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Side: Profile Info + Work Experience */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <PublicFreelancerProfileCard
              profile={profile}
              freelancerId={freelancerId}
              onViewSamples={() => setActiveView('samples')}
              samplesCount={profile.sampleWorks?.length || 0}
            />

            <div className="flex-1">
              <FreelancerExperienceAndClients profile={profile} clients={clients} loading={clientsLoading} />
            </div>
          </div>

          {/* Right Side: Intake Form or Video Library */}
          <div className="lg:col-span-7 flex flex-col">
            <OnboardingViewTabs
              activeView={activeView}
              samplesCount={profile.sampleWorks?.length || 0}
              onSelectView={setActiveView}
            />

            {activeView === 'samples' ? (
              <SampleVideoLibrary
                samples={profile.sampleWorks || []}
                freelancerName={profile.name}
                onOpenIntake={() => setActiveView('intake')}
              />
            ) : (
              <PublicOnboardingForm
                profile={profile}
                clientName={clientName}
                setClientName={setClientName}
                contactName={contactName}
                setContactName={setContactName}
                contactPhone={contactPhone}
                setContactPhone={setContactPhone}
                contactEmail={contactEmail}
                setContactEmail={setContactEmail}
                instagram={instagram}
                setInstagram={setInstagram}
                proposedRate={proposedRate}
                setProposedRate={setProposedRate}
                projectDetails={projectDetails}
                setProjectDetails={setProjectDetails}
                isSubmitting={isSubmitting}
                onSubmit={handleSubmit}
                onClear={handleClearForm}
              />
            )}
          </div>
        </div>
      </main>

      <Footer variant="minimal" onNavigate={(r) => setSupportingRoute(r)} />
      <SupportingInfoModal
        route={supportingRoute}
        onClose={() => setSupportingRoute(null)}
        onNavigate={(r) => setSupportingRoute(r)}
      />
    </div>
  );
}
