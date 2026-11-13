import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, collection, setDoc, query, where, getDocs } from 'firebase/firestore';
import { UserProfile, ServiceRequest, Client } from '../types';
import Logo from './Logo';
import Footer from './Footer';
import SupportingInfoModal, { SupportingRoute } from './SupportingInfoModal';
import FreelancerExperienceAndClients from './FreelancerExperienceAndClients';
import PublicFreelancerProfileCard from './PublicFreelancerProfileCard';
import PublicOnboardingForm from './PublicOnboardingForm';
import PublicFreelancerProfileSubmitted from './PublicFreelancerProfileSubmitted';
import { lookupPublicProfile } from '../lib/profileLookup';
import { AlertCircle } from 'lucide-react';

interface PublicFreelancerProfileProps {
  freelancerId: string;
  mode?: 'onboarding' | 'profile';
}

export default function PublicFreelancerProfile({ freelancerId, mode = 'onboarding' }: PublicFreelancerProfileProps) {
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

  useEffect(() => {
    const prevTitle = document.title;
    if (profile?.name) {
      document.title =
        mode === 'profile'
          ? `${profile.name} - Freelancer Portfolio | CrestFlow`
          : `${profile.name} - Client Onboarding | CrestFlow`;
    } else {
      document.title = mode === 'profile' ? 'Freelancer Portfolio | CrestFlow' : 'Client Onboarding | CrestFlow';
    }
    return () => {
      document.title = prevTitle;
    };
  }, [profile?.name, mode]);

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

    setIsSubmitting(true);
    try {
      const targetUid = profile.userId || profile.id;
      const reqRef = doc(collection(db, 'serviceRequests'));

      const newRequest: ServiceRequest = {
        id: reqRef.id,
        userId: targetUid,
        clientName: clientName.trim(),
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim(),
        projectDetails: projectDetails.trim(),
        status: 'pending',
        createdAt: Date.now(),
      };

      if (instagram.trim()) newRequest.instagram = instagram.trim();
      if (proposedRate && !isNaN(Number(proposedRate))) {
        newRequest.proposedRate = Number(proposedRate);
      }

      await setDoc(reqRef, newRequest);

      // Automated lead email notification to the freelancer
      fetch('/api/notify/new-client-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          freelancerId: targetUid,
          requestId: reqRef.id,
          clientName: clientName.trim(),
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
          instagram: instagram.trim() || undefined,
          proposedRate: proposedRate && !isNaN(Number(proposedRate)) ? Number(proposedRate) : undefined,
          projectDetails: projectDetails.trim(),
        }),
      }).catch((notifyErr) => console.warn('Automated lead email notification failed:', notifyErr));

      // Build WhatsApp draft URL and redirect
      if (profile.phone) {
        const cleanPhone = profile.phone.replace(/[^0-9]/g, '');
        const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const msg = `Hi ${profile.name},\n\nI've submitted my Onboarding Request for *${clientName.trim()}*.\n\n*Contact:* ${contactName.trim()} (${contactPhone.trim()})\n*Email:* ${contactEmail.trim()}${
          proposedRate ? `\n*Proposed Rate:* ₹${proposedRate}/reel` : ''
        }\n\n*Project Details:*\n${projectDetails.trim()}\n\nLooking forward to working with you!`;
        const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
        setSubmittedWhatsAppUrl(waUrl);
        window.open(waUrl, '_blank', 'noopener,noreferrer');
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
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-150">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">Loading creator profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 text-center text-slate-800 dark:text-slate-200 transition-colors duration-150">
        <div className="w-16 h-16 bg-red-50 dark:bg-rose-950/40 text-red-500 dark:text-rose-400 border border-red-100 dark:border-rose-900/50 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Profile Not Found</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md">{error}</p>
        <a
          href="/"
          className="mt-5 inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
        >
          Return to CrestFlow
        </a>
      </div>
    );
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
            {mode === 'profile' ? 'Public Portfolio' : 'Client Onboarding Portal'}
          </span>
        </div>

        {/* Main 2-column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Side: Profile Info + Work Experience */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <PublicFreelancerProfileCard profile={profile} freelancerId={freelancerId} />

            <div className="flex-1">
              <FreelancerExperienceAndClients profile={profile} clients={clients} loading={clientsLoading} />
            </div>
          </div>

          {/* Right Side: Onboarding Form Card */}
          <div className="lg:col-span-7 flex flex-col">
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
