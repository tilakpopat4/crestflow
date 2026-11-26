import React, { useState, useEffect } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
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
import { lookupPublicProfileWithStatus } from '../lib/profileLookup';
import { submitOnboardingServiceRequest } from '../lib/onboardingLead';
import PublicProfileNotFound from './onboarding/PublicProfileNotFound';
import { PublicProfileSkeleton } from './skeletons';

interface PublicFreelancerProfileProps {
  freelancerId: string;
}

export default function PublicFreelancerProfile({ freelancerId }: PublicFreelancerProfileProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [acceptingRequests, setAcceptingRequests] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);

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

        const result = await lookupPublicProfileWithStatus(freelancerId);
        if (result) {
          setProfile(result.profile);
          setAcceptingRequests(result.acceptingRequests);
          if (result.stats?.clientsCount) {
            const synthetic = Array.from({ length: result.stats.clientsCount }, (_, idx) => ({
              id: `stat-${idx}`,
              name: '',
              phone: '',
              email: '',
              defaultRate: 0,
              createdAt: 0,
            }));
            setClients(synthetic);
          }
        } else {
          setError('Freelancer profile not found. Please verify the URL handle.');
        }
      } catch (err: any) {
        console.error(err);
        setError('Failed to load freelancer profile. Please check your internet connection.');
      } finally {
        setLoading(false);
        setClientsLoading(false);
      }
    }

    if (freelancerId) {
      void fetchFreelancerData();
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
    <div className="min-h-screen bg-[#0B0B0E] flex flex-col font-sans text-[#F7F7F8]">
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Logo className="w-7 h-7 rounded-lg" />
            <span className="text-base font-bold text-[#F7F7F8] tracking-tight">CrestFlow</span>
          </div>
          <span className="text-xs text-[#A1A1AA] font-medium">
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
            ) : !acceptingRequests ? (
              <div className="rounded-xl bg-[#131318] border border-[#2A2A33] p-6 sm:p-8 space-y-2 text-center my-auto">
                <h2 className="text-base font-semibold text-[#F7F7F8]">
                  Not accepting new requests right now
                </h2>
                <p className="text-xs text-[#A1A1AA] leading-relaxed max-w-md mx-auto">
                  {profile.name} is not accepting new client onboarding requests right now. Check back later or explore existing portfolio samples.
                </p>
              </div>
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
