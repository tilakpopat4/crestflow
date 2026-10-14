import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, collection, setDoc, query, where, getDocs } from 'firebase/firestore';
import { UserProfile, ServiceRequest, Client } from '../types';
import Logo from './Logo';
import Footer from './Footer';
import SupportingInfoModal, { SupportingRoute } from './SupportingInfoModal';
import FreelancerExperienceAndClients from './FreelancerExperienceAndClients';
import { 
  Sparkles, 
  CheckCircle2, 
  Phone, 
  Mail, 
  AlertCircle, 
  Loader2, 
  Instagram, 
  Briefcase, 
  DollarSign, 
  User, 
  ArrowRight,
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

  useEffect(() => {
    async function fetchFreelancerData() {
      try {
        setLoading(true);
        setError(null);
        const docRef = doc(db, 'profiles', freelancerId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
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
      // Create auto-generated doc reference in serviceRequests
      const reqRef = doc(collection(db, 'serviceRequests'));
      
      const newRequest: ServiceRequest = {
        id: reqRef.id,
        userId: freelancerId, // Freelancer's UID
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

      // Build WhatsApp draft URL and redirect
      if (profile.phone) {
        const cleanPhone = profile.phone.replace(/[^0-9]/g, '');
        const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const msg = `Hi ${profile.name},\n\nI've submitted my Onboarding Request for *${clientName.trim()}*.\n\n*Contact:* ${contactName.trim()} (${contactPhone.trim()})\n*Email:* ${contactEmail.trim()}${proposedRate ? `\n*Proposed Rate:* ₹${proposedRate}/reel` : ''}\n\n*Project Details:*\n${projectDetails.trim()}\n\nLooking forward to working with you!`;
        const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
        setSubmittedWhatsAppUrl(waUrl);

        // Open WhatsApp in a new tab
        window.open(waUrl, '_blank');
      }

      setIsSubmitted(true);
    } catch (err: any) {
      console.error(err);
      alert(`Submission failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-slate-500 text-sm mt-3 font-semibold">Loading Profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 text-center text-slate-800 dark:text-slate-200 transition-colors duration-150">
        <div className="w-16 h-16 bg-red-50 dark:bg-rose-950/40 text-red-500 dark:text-rose-400 border border-red-100 dark:border-rose-900/50 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Oops! Something went wrong</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md">{error}</p>
      </div>
    );
  }

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
            <div className="flex justify-between"><span className="text-slate-400 dark:text-slate-500">Freelancer:</span> <span className="font-semibold text-slate-950 dark:text-slate-100">{profile.name}</span></div>
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
                setClientName('');
                setContactName('');
                setContactPhone('');
                setContactEmail('');
                setProjectDetails('');
                setInstagram('');
                setProposedRate('');
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-10 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-150">
      <div className="max-w-5xl mx-auto space-y-5">
        
        {/* Brand Header */}
        <div className="flex items-center gap-2.5">
          <Logo className="w-7 h-7 rounded-lg" />
          <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight">CrestFlow</span>
        </div>

        {/* Main 2-column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Side: 2 Blocks (Profile Info + Work Experience) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            {/* Block 1: Profile Info Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
              {/* Header info */}
              <div>
                <div className="mb-2">
                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                    Open for Bookings
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{profile.name}</h1>
                <p className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs tracking-wider uppercase mt-0.5">{profile.professionalTitle}</p>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> Services Provided
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3.5 rounded-lg">
                  {profile.servicesDescription}
                </p>
              </div>

              {/* Contact Info */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="w-7 h-7 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg flex items-center justify-center shrink-0">
                    <Phone className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  </div>
                  <span>{profile.phone}</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="w-7 h-7 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg flex items-center justify-center shrink-0">
                    <Mail className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  </div>
                  <span>Contact via onboarding form</span>
                </div>
              </div>
            </div>

            {/* Block 2: Work Experience Showcase */}
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
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 md:p-8 shadow-xs flex-1 flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Client Onboarding</h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Submit your project details and requirements to get onboarded.</p>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between space-y-4 pt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Company / Client Name *</label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. Acme Studio"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-colors duration-120 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Contact Person Name *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. Jane Smith"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-colors duration-120 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Phone Number *</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
                        <input 
                          type="tel" 
                          required
                          placeholder="e.g. +91 98765 43210"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-colors duration-120 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Email Address *</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
                        <input 
                          type="email" 
                          required
                          placeholder="e.g. client@example.com"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-colors duration-120 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Instagram / Website Link</label>
                      <div className="relative">
                        <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
                        <input 
                          type="url" 
                          placeholder="e.g. https://instagram.com/brand"
                          value={instagram}
                          onChange={(e) => setInstagram(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-colors duration-120 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Proposed Rate (₹ per reel / Optional)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
                        <input 
                          type="number" 
                          placeholder={`e.g. 2000 (Default: ₹${profile.defaultRate || 1500})`}
                          value={proposedRate}
                          onChange={(e) => setProposedRate(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-colors duration-120 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Project / Requirements Details *</label>
                    <textarea 
                      required
                      rows={4}
                      placeholder="Describe your editing needs, video style, frequency, and other guidelines..."
                      value={projectDetails}
                      onChange={(e) => setProjectDetails(e.target.value)}
                      className="w-full p-3 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-colors duration-120 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 resize-none leading-relaxed flex-1 min-h-[96px]"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 mt-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setClientName('');
                      setContactName('');
                      setContactPhone('');
                      setContactEmail('');
                      setProjectDetails('');
                      setInstagram('');
                      setProposedRate('');
                    }}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors duration-120 cursor-pointer border-0"
                  >
                    Clear Form
                  </button>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors duration-120 shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer border-0"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Submitting Onboarding...
                      </>
                    ) : (
                      <>
                        Submit Onboarding Request
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <Footer 
          variant="minimal" 
          className="mt-8" 
          onNavigate={handleNavigateSupporting}
        />
        <SupportingInfoModal
          route={supportingRoute}
          onClose={handleCloseSupportingModal}
          onNavigate={handleNavigateSupporting}
        />
      </div>
    </div>
  );
}
