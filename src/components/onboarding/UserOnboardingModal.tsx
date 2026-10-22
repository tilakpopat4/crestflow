import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { UserProfile } from '../../types';
import { db } from '../../firebase';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';

interface UserOnboardingModalProps {
  user: User;
  profile?: UserProfile | null;
  isOpen: boolean;
  onComplete: () => void;
}

/**
 * 3-Step Guided Freelancer Onboarding:
 * 1. Profile Setup (Display Name, Title)
 * 2. First Client (Name, Rate)
 * 3. UPI ID Configuration (VPA for Direct QR Payments)
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
  const [title, setTitle] = useState(profile?.title || 'Video Editor');
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
      // 1. Save or Update Freelancer Profile
      const profileRef = doc(db, 'freelancer_profiles', user.uid);
      await setDoc(
        profileRef,
        {
          name: displayName.trim(),
          title: title.trim(),
          phone: phone.trim(),
          upiId: upiId.trim(),
          email: user.email || '',
          updatedAt: Date.now(),
        },
        { merge: true }
      );

      // 2. Add First Client if provided
      if (clientName.trim()) {
        const clientsRef = collection(db, 'clients');
        await addDoc(clientsRef, {
          userId: user.uid,
          name: clientName.trim(),
          email: clientEmail.trim(),
          rate: Number(clientRate) || 0,
          currency: 'INR',
          createdAt: Date.now(),
          status: 'active',
        });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800 text-xs">
          <div className="font-semibold text-slate-900 dark:text-white">
            Workspace Setup ({step}/3)
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <span
                key={s}
                className={`w-6 h-1 rounded-full ${
                  s <= step ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-slate-200 dark:bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs border border-red-200 dark:border-red-900">
            {error}
          </div>
        )}

        {/* Step 1: Profile */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                Your Freelancer Profile
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This appears on your invoices and client delivery portal.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., Tilak Popat"
                className="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Primary Specialty / Role
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Senior Video Editor & Motion Designer"
                className="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Phone / WhatsApp (Optional)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!displayName.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition-colors cursor-pointer border-none disabled:opacity-50"
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
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                Add Your First Client
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You can organize projects, sub-clients, and invoice schedules for this client.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Client Name / Channel
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g., Acme Studios or Ali Abdaal"
                className="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Client Contact Email (Optional)
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Default Rate or Monthly Retainer (INR)
              </label>
              <input
                type="number"
                value={clientRate}
                onChange={(e) => setClientRate(e.target.value)}
                placeholder="e.g., 25000"
                className="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-2 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs cursor-pointer border-none"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition-colors cursor-pointer border-none"
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
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                Configure Direct UPI Settlement
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Invoices embed your direct UPI QR code so clients pay 100% directly to your bank account with zero platform fees.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Your UPI VPA
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g., username@okaxis or creator@okhdfcbank"
                className="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                Standard UPI handles supported (GPay, PhonePe, Paytm, BHIM).
              </span>
            </div>

            <div className="pt-2 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs cursor-pointer border-none"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleFinish}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition-colors cursor-pointer border-none disabled:opacity-50"
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
