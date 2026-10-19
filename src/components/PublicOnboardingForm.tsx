import React from 'react';
import { UserProfile } from '../types';
import { 
  Briefcase, 
  User, 
  Phone, 
  Mail, 
  Instagram, 
  DollarSign, 
  Loader2, 
  ArrowRight 
} from 'lucide-react';

interface PublicOnboardingFormProps {
  profile: UserProfile;
  clientName: string;
  setClientName: (val: string) => void;
  contactName: string;
  setContactName: (val: string) => void;
  contactPhone: string;
  setContactPhone: (val: string) => void;
  contactEmail: string;
  setContactEmail: (val: string) => void;
  instagram: string;
  setInstagram: (val: string) => void;
  proposedRate: string;
  setProposedRate: (val: string) => void;
  projectDetails: string;
  setProjectDetails: (val: string) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClear: () => void;
}

/**
 * PublicOnboardingForm handles intake of client details, contact info,
 * project scopes, and proposed rates for onboarding.
 */
export default function PublicOnboardingForm({
  profile,
  clientName,
  setClientName,
  contactName,
  setContactName,
  contactPhone,
  setContactPhone,
  contactEmail,
  setContactEmail,
  instagram,
  setInstagram,
  proposedRate,
  setProposedRate,
  projectDetails,
  setProjectDetails,
  isSubmitting,
  onSubmit,
  onClear,
}: PublicOnboardingFormProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 md:p-8 shadow-xs flex-1 flex flex-col justify-between">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">Client Onboarding</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Submit your project details and requirements to get onboarded.</p>
      </div>

      <form onSubmit={onSubmit} className="flex-1 flex flex-col justify-between space-y-4 pt-4">
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
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-colors duration-120 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
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
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-colors duration-120 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
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
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-colors duration-120 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
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
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-colors duration-120 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
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
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-colors duration-120 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
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
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-colors duration-120 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
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
            onClick={onClear}
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
  );
}
