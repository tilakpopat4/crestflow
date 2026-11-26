import React from 'react';
import { UserProfile } from '../types';
import { auth } from '../firebase';
import { Loader2 } from 'lucide-react';

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
    <div className="bg-[#131318] dark:bg-[#131318] border-0 rounded-xl p-6 md:p-8 flex-1 flex flex-col justify-between">
      <h2 className="text-xl md:text-2xl font-bold text-[#F7F7F8] dark:text-white tracking-tight">
        Project Brief
      </h2>

      <form onSubmit={onSubmit} className="flex-1 flex flex-col justify-between space-y-4 pt-5">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1 uppercase tracking-wider">
                Company / Client *
              </label>
              <input
                type="text"
                required
                placeholder="Acme Studio"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#2A2A33] rounded-lg bg-[#1B1B22] text-[#F7F7F8] placeholder-slate-500 outline-none transition-colors duration-120 focus:border-[#2A2A33]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1 uppercase tracking-wider">
                Contact Name *
              </label>
              <input
                type="text"
                required
                placeholder="Jane Smith"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#2A2A33] rounded-lg bg-[#1B1B22] text-[#F7F7F8] placeholder-slate-500 outline-none transition-colors duration-120 focus:border-[#2A2A33]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1 uppercase tracking-wider">
                Phone *
              </label>
              <input
                type="tel"
                required
                placeholder="+91 98765 43210"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#2A2A33] rounded-lg bg-[#1B1B22] text-[#F7F7F8] placeholder-slate-500 outline-none transition-colors duration-120 focus:border-[#2A2A33]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1 uppercase tracking-wider">
                Email *
              </label>
              <input
                type="email"
                required
                placeholder="client@example.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#2A2A33] rounded-lg bg-[#1B1B22] text-[#F7F7F8] placeholder-slate-500 outline-none transition-colors duration-120 focus:border-[#2A2A33]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1 uppercase tracking-wider">
                Instagram / Website
              </label>
              <input
                type="url"
                placeholder="https://instagram.com/brand"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#2A2A33] rounded-lg bg-[#1B1B22] text-[#F7F7F8] placeholder-slate-500 outline-none transition-colors duration-120 focus:border-[#2A2A33]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1 uppercase tracking-wider">
                Rate (₹/reel)
              </label>
              <input
                type="number"
                placeholder={String(profile.defaultRate || 1500)}
                value={proposedRate}
                onChange={(e) => setProposedRate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#2A2A33] rounded-lg bg-[#1B1B22] text-[#F7F7F8] placeholder-slate-500 outline-none transition-colors duration-120 focus:border-[#2A2A33]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1 uppercase tracking-wider">
              Details *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Editing needs, style, frequency..."
              value={projectDetails}
              onChange={(e) => setProjectDetails(e.target.value)}
              className="w-full p-3 text-sm border border-[#2A2A33] rounded-lg bg-[#1B1B22] text-[#F7F7F8] placeholder-slate-500 outline-none transition-colors duration-120 focus:border-[#2A2A33] resize-none leading-relaxed flex-1 min-h-[96px]"
            />
          </div>
        </div>

        <div className="pt-3 flex items-center justify-between gap-4 mt-auto">
          <button
            type="button"
            onClick={onClear}
            className="px-3.5 py-2 bg-surface-500 hover:bg-surface-400 text-text-primary rounded-lg text-xs font-medium transition-colors duration-120 cursor-pointer border-0"
          >
            Clear
          </button>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            {!auth.currentUser && (
              <span className="text-[11px] text-[#A1A1AA]">
                Sign-in required
              </span>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-semibold transition-colors duration-120 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer border-0"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <span>{auth.currentUser ? 'Submit' : 'Sign in & Submit'}</span>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
