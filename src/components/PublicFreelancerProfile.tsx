import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, collection, setDoc } from 'firebase/firestore';
import { UserProfile, ServiceRequest } from '../types';
import Logo from './Logo';
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
  ArrowRight
} from 'lucide-react';

interface PublicFreelancerProfileProps {
  freelancerId: string;
  onClose?: () => void;
}

export default function PublicFreelancerProfile({ freelancerId, onClose }: PublicFreelancerProfileProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    async function fetchProfile() {
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
      } catch (err: any) {
        console.error(err);
        setError("Failed to load freelancer profile. Please check your internet connection.");
      } finally {
        setLoading(false);
      }
    }

    if (freelancerId) {
      fetchProfile();
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Oops! Something went wrong</h1>
        <p className="text-slate-500 text-sm max-w-md mb-6">{error}</p>
        {onClose && (
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors shadow"
          >
            Go to Homepage
          </button>
        )}
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Inquiry Submitted!</h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              Your service request has been sent to <strong>{profile.name}</strong>. They will review your project requirements and get in touch with you shortly.
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-2 text-xs text-slate-600">
            <div className="flex justify-between"><span className="text-slate-400">Freelancer:</span> <span className="font-semibold text-slate-950">{profile.name}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Client / Company:</span> <span className="font-semibold text-slate-950">{clientName}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Contact Email:</span> <span className="font-semibold text-slate-950">{contactEmail}</span></div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow active:scale-98"
            >
              Back to CrestFlow
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12 relative overflow-hidden font-sans text-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* Decorative background grids and blobs */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-60 z-0"></div>
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-indigo-200/20 rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute bottom-0 right-1/4 w-[350px] h-[350px] bg-purple-200/20 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
        
        {/* Left Side: Freelancer Profile Info */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="flex items-center gap-2.5">
            <Logo className="w-8 h-8 rounded-xl shadow-xs" />
            <span className="text-lg font-bold text-slate-900 tracking-tight">CrestFlow</span>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden">
            {/* Header info */}
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold rounded-full mb-4">
                <Briefcase className="w-3.5 h-3.5" /> Open for Bookings
              </span>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{profile.name}</h1>
              <p className="text-indigo-600 font-bold text-sm tracking-wide uppercase mt-1">{profile.professionalTitle}</p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Services Provided
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line bg-slate-50 border border-slate-100/60 p-4 rounded-2xl">
                {profile.servicesDescription}
              </p>
            </div>

            {/* Contact Info */}
            <div className="pt-5 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <div className="w-8 h-8 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-slate-500" />
                </div>
                <span>{profile.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <div className="w-8 h-8 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-slate-500" />
                </div>
                <span>Contact via referral form</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Claim Form */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Claim / Inquiry Form</h2>
              <p className="text-slate-500 text-xs mt-1">Submit your project details to request services from this freelancer.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Company / Client Name *</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Acme Studio"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 outline-none transition-colors focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Contact Person Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Jane Smith"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 outline-none transition-colors focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Phone Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="tel" 
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 outline-none transition-colors focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="email" 
                      required
                      placeholder="e.g. client@example.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 outline-none transition-colors focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Instagram / Website Link</label>
                  <div className="relative">
                    <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="url" 
                      placeholder="e.g. https://instagram.com/brand"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 outline-none transition-colors focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Proposed Rate (₹ per reel / Optional)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="number" 
                      placeholder={`e.g. 2000 (Default: ₹${profile.defaultRate || 1500})`}
                      value={proposedRate}
                      onChange={(e) => setProposedRate(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 outline-none transition-colors focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Project / Requirements Details *</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Describe your editing needs, video style, frequency, and other guidelines..."
                  value={projectDetails}
                  onChange={(e) => setProjectDetails(e.target.value)}
                  className="w-full p-3.5 text-sm border border-slate-200 rounded-xl bg-slate-50 outline-none transition-colors focus:border-indigo-500 focus:bg-white resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                )}
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 disabled:opacity-50 flex-1 md:flex-none cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Submitting Request...
                    </>
                  ) : (
                    <>
                      Submit Service Request
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
