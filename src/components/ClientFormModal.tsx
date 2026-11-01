import React from 'react';
import { X, CheckCircle2, Film, Calendar, Mail } from 'lucide-react';

export interface ClientFormData {
  name: string;
  phone: string;
  email: string;
  logoUrl: string;
  instagram: string;
  clientFrom: string;
  workExperience: string;
  paymentBasis: 'per_reel' | 'monthly_retainer';
  monthlyRetainerAmount: string;
  defaultRate: string;
  onSiteShootRate: string;
  websiteMakingRate: string;
  lastPaymentDate: string;
  emailRemindersEnabled: boolean;
}

interface ClientFormModalProps {
  isOpen: boolean;
  isEditing: string | null;
  formData: ClientFormData;
  setFormData: React.Dispatch<React.SetStateAction<ClientFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

const inputCls =
  'w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-600';

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  isOpen,
  isEditing,
  formData,
  setFormData,
  onSubmit,
  onClose,
}) => {
  if (!isOpen) return null;

  const update = (key: keyof ClientFormData, val: any) =>
    setFormData((prev) => ({ ...prev, [key]: val }));

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-2xl w-full p-5 sm:p-6 space-y-5 animate-in fade-in zoom-in-95 cursor-default max-h-[92vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
            {isEditing ? 'Edit Client Profile' : 'Add New Client Profile'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Client Name *</label>
            <input required type="text" value={formData.name} onChange={(e) => update('name', e.target.value)} className={inputCls} placeholder="e.g. Acme Media Studio" />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Phone Number *</label>
            <input required type="tel" value={formData.phone} onChange={(e) => update('phone', e.target.value)} className={inputCls} placeholder="+91 98765 43210" />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address (Optional)</label>
            <input type="email" value={formData.email} onChange={(e) => update('email', e.target.value)} className={inputCls} placeholder="client@example.com" />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Logo URL (Optional)</label>
            <input type="url" value={formData.logoUrl} onChange={(e) => update('logoUrl', e.target.value)} className={inputCls} placeholder="https://example.com/logo.png" />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Instagram (Optional)</label>
            <input type="text" value={formData.instagram} onChange={(e) => update('instagram', e.target.value)} className={inputCls} placeholder="@username or link" />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Acquisition Source</label>
            <input type="text" value={formData.clientFrom} onChange={(e) => update('clientFrom', e.target.value)} className={inputCls} placeholder="e.g. LinkedIn, Referral" />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Work Experience (Optional)</label>
            <input type="text" value={formData.workExperience} onChange={(e) => update('workExperience', e.target.value)} className={inputCls} placeholder="e.g. 6 months, 20+ videos" />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Last Payment Received Date *</label>
            <input required type="date" value={formData.lastPaymentDate} onChange={(e) => update('lastPaymentDate', e.target.value)} className={inputCls} />
          </div>

          {/* Payment Basis */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Basis / Billing Type *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => update('paymentBasis', 'per_reel')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  formData.paymentBasis === 'per_reel'
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${formData.paymentBasis === 'per_reel' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>
                  <Film size={14} />
                </div>
                <div>
                  <div className="text-xs font-bold">Per Reel / Deliverable</div>
                  <div className="text-[11px] opacity-75 mt-0.5">Calculated per deliverable item</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => update('paymentBasis', 'monthly_retainer')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  formData.paymentBasis === 'monthly_retainer'
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${formData.paymentBasis === 'monthly_retainer' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>
                  <Calendar size={14} />
                </div>
                <div>
                  <div className="text-xs font-bold">Monthly Retainer (Fixed)</div>
                  <div className="text-[11px] opacity-75 mt-0.5">Fixed monthly fee, no per-reel math</div>
                </div>
              </button>
            </div>
          </div>

          {formData.paymentBasis === 'monthly_retainer' ? (
            <div className="space-y-1.5 md:col-span-2 p-3.5 bg-indigo-50/40 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl">
              <label className="block text-xs font-semibold text-indigo-950 dark:text-indigo-200">Fixed Monthly Retainer (₹) *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                <input
                  required
                  type="number"
                  min="0"
                  value={formData.monthlyRetainerAmount || formData.defaultRate}
                  onChange={(e) => setFormData((p) => ({ ...p, monthlyRetainerAmount: e.target.value, defaultRate: e.target.value }))}
                  className="w-full border border-indigo-200 dark:border-indigo-800 rounded-xl pl-8 pr-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600"
                  placeholder="25000"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Default Rate per Reel (₹) *</label>
              <input required type="number" min="0" value={formData.defaultRate} onChange={(e) => update('defaultRate', e.target.value)} className={inputCls} placeholder="1500" />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">On Site Shoot Rate (₹)</label>
            <input type="number" min="0" value={formData.onSiteShootRate} onChange={(e) => update('onSiteShootRate', e.target.value)} className={inputCls} placeholder="5000" />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Website Making Rate (₹)</label>
            <input type="number" min="0" value={formData.websiteMakingRate} onChange={(e) => update('websiteMakingRate', e.target.value)} className={inputCls} placeholder="15000" />
          </div>

          <div className="md:col-span-2 p-3 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Mail size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <label htmlFor="emailRemindersModalToggle" className="text-xs font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                  Enable Overdue Payment Email Reminders
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Automatically draft email reminders and alerts when payment is due.
                </p>
              </div>
            </div>
            <input
              id="emailRemindersModalToggle"
              type="checkbox"
              checked={formData.emailRemindersEnabled}
              onChange={(e) => update('emailRemindersEnabled', e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500 cursor-pointer shrink-0"
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
            >
              <CheckCircle2 size={16} />
              {isEditing ? 'Save Changes' : 'Save Client Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientFormModal;
