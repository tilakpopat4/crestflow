import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, collection, setDoc, query, where, getDocs } from 'firebase/firestore';
import { UserProfile, ServiceRequest, Client } from '../types';
import Logo from './Logo';
import Footer from './Footer';
import SupportingInfoModal, { SupportingRoute } from './SupportingInfoModal';
import FreelancerExperienceAndClients from './FreelancerExperienceAndClients';
import PublicFreelancerProfileCard from './PublicFreelancerProfileCard';
import PublicOnboardingForm from './PublicOnboardingForm';
import { 
  CheckCircle2, 
  AlertCircle, 
  MessageCircle 
} from 'lucide-react';

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

  useEffect(() => {
    const prevTitle = document.title;
    if (profile?.name) {
      document.title = `${profile.name} - Client Onboarding | CrestFlow`;
    } else {
      document.title = 'Client Onboarding | CrestFlow';
    }
    return () => {
      document.title = prevTitle;
    };
  }, [profile?.name]);

  const handleNavigateSupporting = (route: SupportingRoute) => {
    setSupportingRoute(route);
  };

  const handleCloseSupportingModal = () => {
    setSupportingRoute(null);
  };

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
        const docRef = doc(db, 'profiles', freelancerId);
        const docSnap = await getDoc(docRef);
        let foundProfile: UserProfile | null = null;
        if (docSnap.exists()) {
          foundProfile = { id: docSnap.id, ...docSnap.data() } as UserProfile;
        } else {
          // Fallback: try querying where userId == freelancerId in case doc ID differs
          try {
            const q = query(collection(db, 'profiles'), where('userId', '==', freelancerId));
            const querySnap = await getDocs(q);
            if (!querySnap.empty) {
              foundProfile = { id: querySnap.docs[0].id, ...querySnap.docs[0].data() } as UserProfile;
            }
          } catch (queryErr) {
            console.warn("Could not query profiles collection fallback:", queryErr);
          }
        }

        if (foundProfile) {
          setProfile(foundProfile);
        } else {
          setError("Freelancer profile not found. Please verify the link.");
        }

        // Fetch clients for this freelancer
        try {
          setClientsLoading(true);
          const q = query(collection(db, 'clients'), where('userId', '==', freelancerId));
          const clientsSnap = await getDocs(q);
          const clientList: Client[] = [];
          clientsSnap.forEach((cSnap) => {
            clientList.push({ id: cSnap.id, ...cSnap.data() } as Client);
          });
          setClients(clientList);
        } catch (clientErr) {
          console.warn("Could not load clients for profile:", clientErr);
        } finally {
          setClientsLoading(false);
        }
      } catch (err: any) {
        console.error(err);
        setError("Failed to load freelancer profile. Please check your internet connection.");
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
      const reqRef = doc(collection(db, 'serviceRequests'));
      
      const newRequest: ServiceRequest = {
        id: reqRef.id,
        userId: freelancerId,
        clientName: clientName.trim(),
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim(),
        projectDetails: projectDetails.trim(),
        status: 'pending',
        createdAt: Date.now()
      };

      if (instagram.trim()) {
        newRequest.instagram = instagram.trim();
      }
      if (proposedRate && !isNaN(Number(proposedRate))) {
        newRequest.proposedRate = Number(proposedRate);
      }

      await setDoc(reqRef, newRequest);

      // Automated lead email notification to the freelancer
      fetch('/api/notify/new-client-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          freelancerId,
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
        const msg = `Hi ${profile.name},\n\nI've submitted my Onboarding Request for *${clientName.trim()}*.\n\n*Contact:* ${contactName.trim()} (${contactPhone.trim()})\n*Email:* ${contactEmail.trim()}${proposedRate ? `\n*Proposed Rate:* ₹${proposedRate}/reel` : ''}\n\n*Project Details:*\n${projectDetails.trim()}\n\nLooking forward to working with you!`;
        const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
        setSubmittedWhatsAppUrl(waUrl);

        window.open(waUrl, '_blank', 'noopener,noreferrer');
      }

      setIsSubmitted(true);
    } catch (err) {
      console.error(err);
      alert("Failed to submit onboarding request. Please try again.");
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
        <div className="w-16 h-16 bg-red-50 dark:bg-rose-950/40 text-red-500 dark:rose-400 border border-red-100 dark:border-rose-900/50 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Oops! Something went wrong</h1>
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

  const profilePic = profile.photoURL || (auth.currentUser?.uid === freelancerId ? auth.currentUser?.photoURL : null);

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 text-center transition-colors duration-150">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 md:p-8 max-w-md w-full shadow-xs space-y-5">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Onboarding Submitted!</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
              Your onboarding details have been sent to <strong>{profile.name}</strong>. Redirecting to WhatsApp to send a confirmation...
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-lg p-3.5 text-left space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 dark:text-slate-500">Freelancer:</span>
              <div className="flex items-center gap-2">
                {profilePic ? (
                  <img src={profilePic} alt={profile.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
                ) : null}
                <span className="font-semibold text-slate-950 dark:text-slate-100">{profile.name}</span>
              </div>
            </div>
            <div className="flex justify-between"><span className="text-slate-400 dark:text-slate-500">Client / Company:</span> <span className="font-semibold text-slate-950 dark:text-slate-100">{clientName}</span></div>
            <div className="flex justify-between"><span className="text-slate-400 dark:text-slate-500">Contact Email:</span> <span className="font-semibold text-slate-950 dark:text-slate-100">{contactEmail}</span></div>
          </div>
          
          <div className="space-y-2 pt-1">
            {submittedWhatsAppUrl && (
              <a
                href={submittedWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Open WhatsApp Chat
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                setIsSubmitted(false);
                handleClearForm();
                setSubmittedWhatsAppUrl(null);
              }}
              className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer border-0"
            >
              Submit Another Response
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100 transition-colors duration-150">
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        
        {/* Brand Header */}
        <div className="flex items-center gap-2.5">
          <Logo className="w-7 h-7 rounded-lg" />
          <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight">CrestFlow</span>
        </div>

        {/* Main 2-column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Side: 2 Blocks (Profile Info + Work Experience) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <PublicFreelancerProfileCard 
              profile={profile} 
              freelancerId={freelancerId} 
            />

            <div className="flex-1">
              <FreelancerExperienceAndClients 
                profile={profile} 
                clients={clients} 
                loading={clientsLoading} 
              />
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

      <Footer 
        variant="minimal" 
        onNavigate={handleNavigateSupporting}
      />
      <SupportingInfoModal
        route={supportingRoute}
        onClose={handleCloseSupportingModal}
        onNavigate={handleNavigateSupporting}
      />
    </div>
  );
}
