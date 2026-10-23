import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { UserProfile } from '../../types';
import { db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { generateUUID } from '../../lib/utils';

interface UserOnboardingModalProps {
  user: User;
  profile?: UserProfile | null;
  isOpen: boolean;
  onComplete: () => void;
}

/**
 * UserOnboardingModal provides a polished 3-step setup:
 * 1. Profile Setup (Display Name, Specialty)
 * 2. First Client (Name, Rate)
 * 3. UPI ID Configuration (VPA for Direct QR Payments)
 * Strictly adheres to GEMINI.md design standards: flat, restrained SaaS aesthetic.
 */
export const UserOnboardingModal: React.FC<UserOnboardingModalProps> = ({
  user,
  profile,
  isOpen,
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Profile
  const [displayName, setDisplayName] = useState(profile?.name || user.displayName || '');
  const [title, setTitle] = useState(profile?.professionalTitle || 'Video Editor');
  const [phone, setPhone] = useState(profile?.phone || '');

  // Step 2: First Client
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientRate, setClientRate] = useState('');

  // Step 3: UPI ID
  const [upiId, setUpiId] = useState(profile?.upiId || '');

  if (!isOpen) return null;

  const handleFinish = async () => {
    setSaving(true);
    setError(null);

    try {
      // 1. Save or Update Freelancer Profile in /profiles/{uid}
      const profileRef = doc(db, 'profiles', user.uid);
      await setDoc(
        profileRef,
        {
          name: displayName.trim(),
          professionalTitle: title.trim(),
          phone: phone.trim(),
          upiId: upiId.trim(),
          email: user.email || '',
        },
        { merge: true }
      );

      // 2. Add First Client if provided
      if (clientName.trim()) {
        try {
          const clientId = generateUUID();
          const clientPayload: Record<string, any> = {
            id: clientId,
            userId: user.uid,
            name: clientName.trim(),
            currency: 'INR',
            rate: Number(clientRate) || 0,
            status: 'active',
            createdAt: Date.now(),
          };
          if (clientEmail.trim()) {
            clientPayload.email = clientEmail.trim().toLowerCase();
          }
          await setDoc(doc(db, 'clients', clientId), clientPayload);
        } catch (clientErr) {
          console.warn('[UserOnboardingModal] Initial client creation deferred (subscription or permission check):', clientErr);
        }
      }

      onComplete();
    } catch (err: any) {
      console.error('[UserOnboardingModal] Save error:', err);
      setError(err.message || 'Failed to save setup. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 select-none">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xl">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Workspace Setup
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              ({step}/3)
            </span>
          </div>

          <div className="flex items-center gap-1.5" aria-label={`Step ${step} of 3`}>
            {[1, 2, 3].map((s) => (
              <span
                key={s}
                className={`h-1.5 rounded-full transition-all duration-120 ${
                  s === step
                    ? 'w-6 bg-indigo-600 dark:bg-indigo-400'
                    : s < step
                    ? 'w-3 bg-indigo-200 dark:bg-indigo-900/60'
                    : 'w-3 bg-slate-200 dark:bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs border border-red-200 dark:border-red-900">
            {error}
          </div>
        )}

        {/* Step 1: Profile */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Your Freelancer Profile
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                This appears on your invoices and client delivery portal.
              </p>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., Tilak Popat"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-colors duration-120"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Primary Specialty / Role
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Senior Video Editor & Motion Designer"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-colors duration-120"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Phone / WhatsApp (Optional)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-colors duration-120"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep(2);
                }}
                disabled={!displayName.trim()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors duration-120 cursor-pointer border-0 disabled:opacity-50"
              >
                Next: Add First Client
              </button>
            </div>
          </div>
        )}

        {/* Step 2: First Client */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Add Your First Client
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                You can organize projects, sub-clients, and invoice schedules for this client.
              </p>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Client Name / Channel
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g., Acme Studios or Ali Abdaal"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-colors duration-120"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Client Contact Email (Optional)
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-colors duration-120"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Default Rate or Monthly Retainer (INR)
                </label>
                <input
                  type="number"
                  value={clientRate}
                  onChange={(e) => setClientRate(e.target.value)}
                  placeholder="e.g., 25000"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-colors duration-120"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep(1);
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors duration-120 cursor-pointer border-0"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep(3);
                }}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors duration-120 cursor-pointer border-0"
              >
                Next: Direct UPI Setup
              </button>
            </div>
          </div>
        )}

        {/* Step 3: UPI ID */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Configure Direct UPI Settlement
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Invoices embed your direct UPI QR code so clients pay 100% directly to your bank account with zero platform fees.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Your UPI VPA
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g., username@okaxis or creator@okhdfcbank"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-colors duration-120 font-mono text-xs"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 block leading-normal">
                Standard UPI handles supported (GPay, PhonePe, Paytm, BHIM).
              </span>
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep(2);
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors duration-120 cursor-pointer border-0"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleFinish}
                disabled={saving}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors duration-120 cursor-pointer border-0 disabled:opacity-50"
              >
                {saving ? 'Completing Setup...' : 'Complete Workspace Setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserOnboardingModal;
