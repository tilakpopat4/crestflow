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
  onLogout?: () => void;
}

const POPULAR_SPECIALTIES = ['Video Editor', 'UI/UX Designer', 'Web Developer', 'Graphic Designer', 'Content Writer', 'Consultant', 'Photographer', 'Freelancer'];
const INPUT_CLS = "w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-600 outline-none transition-colors duration-120";
const LBL_CLS = "block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5";
const BTN_PRI = "px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors duration-120 cursor-pointer border-0 disabled:opacity-50";
const BTN_SEC = "px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors duration-120 cursor-pointer border-0 disabled:opacity-50";

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

  // Form State
  const [displayName, setDisplayName] = useState(profile?.name || user.displayName || '');
  const [title, setTitle] = useState(profile?.professionalTitle || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientRate, setClientRate] = useState('');
  const [upiId, setUpiId] = useState(profile?.upiId || '');

  if (!isOpen) return null;

  const isProfileValid = Boolean(displayName.trim() && title.trim());

  const handleFinish = async () => {
    if (!isProfileValid) {
      setError('Name and Role are compulsory to set up your profile.');
      setStep(1);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const resolvedTitle = title.trim();
      await setDoc(doc(db, 'profiles', user.uid), {
        name: displayName.trim(),
        professionalTitle: resolvedTitle,
        servicesDescription: profile?.servicesDescription || `${resolvedTitle} Services`,
        phone: phone.trim(),
        upiId: upiId.trim(),
        email: user.email || '',
      }, { merge: true });

      if (clientName.trim()) {
        try {
          const clientId = generateUUID();
          await setDoc(doc(db, 'clients', clientId), {
            id: clientId,
            userId: user.uid,
            name: clientName.trim(),
            currency: 'INR',
            rate: Number(clientRate) || 0,
            status: 'active',
            createdAt: Date.now(),
            ...(clientEmail.trim() ? { email: clientEmail.trim().toLowerCase() } : {}),
          });
        } catch (clientErr) {
          console.warn('[UserOnboardingModal] Initial client creation deferred:', clientErr);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 select-none">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xl">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">Workspace Setup</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">({step}/3)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" aria-label={`Step ${step} of 3`}>
              {[1, 2, 3].map((s) => (
                <span
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-120 ${
                    s === step ? 'w-6 bg-indigo-600 dark:bg-indigo-400' : s < step ? 'w-3 bg-indigo-200 dark:bg-indigo-900/60' : 'w-3 bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              ))}
            </div>
            {onLogout && (
              <button type="button" onClick={onLogout} className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer bg-transparent border-0">
                Sign Out
              </button>
            )}
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
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">Your Freelancer Profile</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Name and Role are compulsory. They appear on your client invoices and project delivery portals.
              </p>
            </div>
            <div className="space-y-3.5">
              <div>
                <label className={LBL_CLS}>Display Name <span className="text-red-500">*</span></label>
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g., Tilak Popat" className={INPUT_CLS} required />
              </div>
              <div>
                <label className={LBL_CLS}>Primary Specialty / Role <span className="text-red-500">*</span></label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., UI/UX Designer, Web Developer, Video Editor" className={INPUT_CLS} required />
                <div className="flex flex-wrap gap-1 mt-2">
                  {POPULAR_SPECIALTIES.map((spec) => (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => setTitle(spec)}
                      className={`px-2 py-0.5 text-[10px] rounded transition-colors border-none cursor-pointer ${
                        title === spec
                          ? 'bg-[#282828] text-white font-medium'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {spec}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={LBL_CLS}>Phone / WhatsApp (Optional)</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className={INPUT_CLS} />
              </div>
            </div>
            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={handleFinish} disabled={!isProfileValid || saving} className={BTN_SEC}>
                Skip to Finish
              </button>
              <button type="button" onClick={() => { setError(null); setStep(2); }} disabled={!isProfileValid} className={BTN_PRI}>
                Next: Add First Client
              </button>
            </div>
          </div>
        )}

        {/* Step 2: First Client */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">Add Your First Client</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Organize projects, milestones, deliverables, and automated invoices for this client.
              </p>
            </div>
            <div className="space-y-3.5">
              <div>
                <label className={LBL_CLS}>Client Name or Company</label>
                <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g., Acme Corp or Alex Rivera" className={INPUT_CLS} />
              </div>
              <div>
                <label className={LBL_CLS}>Client Contact Email (Optional)</label>
                <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@example.com" className={INPUT_CLS} />
              </div>
              <div>
                <label className={LBL_CLS}>Default Rate or Retainer (INR)</label>
                <input type="number" value={clientRate} onChange={(e) => setClientRate(e.target.value)} placeholder="e.g., 25000" className={INPUT_CLS} />
              </div>
            </div>
            <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => { setError(null); setStep(1); }} className={BTN_SEC}>Back</button>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { setError(null); setStep(3); }} className={BTN_SEC}>
                  Skip
                </button>
                <button type="button" onClick={() => { setError(null); setStep(3); }} className={BTN_PRI}>
                  Next: Direct UPI Setup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: UPI ID */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">Configure Direct UPI Settlement</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Invoices embed your direct UPI QR code so clients pay 100% directly to your bank account with zero platform fees.
              </p>
            </div>
            <div>
              <label className={LBL_CLS}>Your UPI VPA</label>
              <input type="text" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="e.g., username@okaxis or creator@okhdfcbank" className={`${INPUT_CLS} font-mono text-xs`} />
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 block leading-normal">
                Standard UPI handles supported (GPay, PhonePe, Paytm, BHIM).
              </span>
            </div>
            <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => { setError(null); setStep(2); }} className={BTN_SEC}>Back</button>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { setUpiId(''); handleFinish(); }} disabled={saving} className={BTN_SEC}>
                  Skip
                </button>
                <button type="button" onClick={handleFinish} disabled={saving} className={BTN_PRI}>
                  {saving ? 'Completing Setup...' : 'Complete Workspace Setup'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserOnboardingModal;
