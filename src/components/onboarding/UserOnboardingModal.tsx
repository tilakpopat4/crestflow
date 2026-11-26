import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { UserProfile } from '../../types';
import { db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { generateUUID } from '../../lib/utils';
import { isValidUpiId } from '../../lib/upiQr';
import { AppRoute } from '../../lib/router';
import { TRIAL_PROMISE_COPY } from '../../shared/pricing';

interface UserOnboardingModalProps {
  user: User;
  profile?: UserProfile | null;
  isOpen: boolean;
  onSaveProfile?: (updated: UserProfile) => Promise<void>;
  onComplete: (nextRoute?: AppRoute) => void;
  onLogout?: () => void;
}

const POPULAR_SPECIALTIES = [
  'Video Editor',
  'UI/UX Designer',
  'Web Developer',
  'Graphic Designer',
  'Content Writer',
  'Consultant',
  'Photographer',
  'Freelancer',
];

const INPUT_CLS =
  'w-full px-3.5 py-2 text-xs rounded-lg border border-[#2A2A33] bg-[#1B1B22] text-[#F7F7F8] placeholder:text-[#8E8E98] focus:border-[#F7F7F8] outline-none transition-colors';
const LBL_CLS = 'block text-xs font-semibold text-[#F7F7F8] mb-1.5';

/**
 * Trial-start onboarding wizard leading the user straight into creating their first invoice.
 */
export const UserOnboardingModal: React.FC<UserOnboardingModalProps> = ({
  user,
  profile,
  isOpen,
  onComplete,
  onLogout,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(profile?.name || user.displayName || '');
  const [title, setTitle] = useState(profile?.professionalTitle || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [upiId, setUpiId] = useState(profile?.upiId || '');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientRate, setClientRate] = useState('2500');

  if (!isOpen) return null;

  const isProfileValid = Boolean(displayName.trim() && title.trim());

  const handleFinish = async (targetRoute: AppRoute) => {
    if (!isProfileValid) {
      setError('Name and specialty are required to set up your profile.');
      setStep(1);
      return;
    }
    const cleanUpi = upiId.trim();
    if (cleanUpi && !isValidUpiId(cleanUpi)) {
      setError('Please enter a valid UPI ID (e.g. yourname@okicici) or clear it for now.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const resolvedTitle = title.trim();
      await setDoc(
        doc(db, 'profiles', user.uid),
        {
          userId: user.uid,
          name: displayName.trim(),
          professionalTitle: resolvedTitle,
          servicesDescription: profile?.servicesDescription || `${resolvedTitle} Services`,
          phone: phone.trim(),
          upiId: cleanUpi,
          email: user.email || '',
          updatedAt: Date.now(),
        },
        { merge: true },
      );

      if (clientName.trim()) {
        const clientId = generateUUID();
        const parsedRate = Number(clientRate) || 0;
        await setDoc(doc(db, 'clients', clientId), {
          id: clientId,
          userId: user.uid,
          name: clientName.trim(),
          phone: '',
          email: clientEmail.trim().toLowerCase(),
          currency: 'INR',
          paymentBasis: 'per_reel',
          defaultRate: parsedRate,
          createdAt: Date.now(),
        });
      }

      onComplete(targetRoute);
    } catch (err: any) {
      setError(err?.message || 'Failed to save workspace setup. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0B0B0E] text-[#F7F7F8] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg rounded-xl bg-[#131318] border border-[#2A2A33] p-6 sm:p-7 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#FFC145]">
              Step {step} of 3 · 7-Day Trial Active
            </span>
            <h1 className="text-xl font-bold text-[#F7F7F8]">
              {step === 1
                ? 'Set up your creator identity'
                : step === 2
                ? 'Add your first client'
                : 'Add UPI ID for instant invoices'}
            </h1>
            <p className="text-xs text-[#A1A1AA]">
              {TRIAL_PROMISE_COPY}
            </p>
          </div>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="text-xs text-[#A1A1AA] hover:text-[#F7F7F8] bg-transparent border-0 cursor-pointer"
            >
              Sign out
            </button>
          )}
        </div>

        {/* Step 1: Identity */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="onboard-name" className={LBL_CLS}>Full name *</label>
              <input id="onboard-name" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Aarav Mehta" className={INPUT_CLS} />
            </div>
            <div>
              <label htmlFor="onboard-title" className={LBL_CLS}>Primary service / role *</label>
              <input id="onboard-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Video Editor" className={INPUT_CLS} />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {POPULAR_SPECIALTIES.map((spec) => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => setTitle(spec)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border cursor-pointer ${
                      title === spec ? 'bg-[#E0002B] border-[#FF2D4A] text-white' : 'bg-[#1B1B22] border-[#2A2A33] text-[#A1A1AA] hover:text-[#F7F7F8]'
                    }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="onboard-phone" className={LBL_CLS}>Phone number (optional)</label>
              <input id="onboard-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +91 98765 43210" className={INPUT_CLS} />
            </div>
          </div>
        )}

        {/* Step 2: First Client */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="onboard-client" className={LBL_CLS}>Client or brand name</label>
              <input
                id="onboard-client"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Studio Craft Media"
                className={INPUT_CLS}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="onboard-cemail" className={LBL_CLS}>Client email</label>
                <input
                  id="onboard-cemail"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="billing@client.com"
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label htmlFor="onboard-rate" className={LBL_CLS}>Default rate (INR)</label>
                <input
                  id="onboard-rate"
                  type="number"
                  min="0"
                  value={clientRate}
                  onChange={(e) => setClientRate(e.target.value)}
                  placeholder="2500"
                  className={INPUT_CLS}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: UPI ID & Create First Invoice */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="onboard-upi" className={LBL_CLS}>
                UPI ID / VPA <span className="text-[#FFC145]">(required to generate invoices)</span>
              </label>
              <input
                id="onboard-upi"
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. yourname@okicici"
                className={INPUT_CLS}
              />
              <p className="mt-1.5 text-[11px] text-[#A1A1AA]">
                Clients scan this embedded UPI QR code directly on every invoice with 0% platform commission.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-[#1B1B22] border border-[#F0607A]/50 text-xs text-[#F0607A]">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#2A2A33]">
          {step > 1 ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setError(null);
                setStep((s) => (s === 3 ? 2 : 1));
              }}
              className="px-3.5 py-2 rounded-lg bg-[#1B1B22] hover:bg-[#2A2A33] border border-[#2A2A33] text-xs font-semibold text-[#F7F7F8] cursor-pointer"
            >
              Back
            </button>
          ) : (
            <span className="text-[11px] text-[#A1A1AA]">Takes under 30 seconds</span>
          )}

          <div className="flex items-center gap-2">
            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  if (step === 1 && !isProfileValid) return setError('Name and role are required.');
                  setStep((s) => (s === 1 ? 2 : 3));
                }}
                className="px-4 py-2 rounded-lg cf-btn-primary text-xs font-semibold cursor-pointer"
              >
                Continue
              </button>
            ) : (
              <>
                <button type="button" disabled={saving} onClick={() => void handleFinish('dashboard')} className="px-3.5 py-2 rounded-lg bg-[#1B1B22] hover:bg-[#2A2A33] border border-[#2A2A33] text-xs font-semibold text-[#A1A1AA] hover:text-[#F7F7F8] cursor-pointer">
                  Open Dashboard
                </button>
                <button type="button" disabled={saving} onClick={() => void handleFinish('invoices')} className="px-4 py-2 rounded-lg cf-btn-primary text-xs font-semibold cursor-pointer disabled:opacity-50">
                  {saving ? 'Saving...' : 'Create First Invoice'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserOnboardingModal;
