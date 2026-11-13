import React, { useState } from 'react';
import { X, FileText, Users, Briefcase, User, RefreshCw, CreditCard } from 'lucide-react';
import { AdminUserUnified } from '../../hooks/useAdminUsersAndHistory';
import { useFetchUserHistory } from '../../hooks/useFetchUserHistory';
import AdminUserPaymentsTab from './AdminUserPaymentsTab';
import AdminUserInvoicesTab from './AdminUserInvoicesTab';

interface AdminUserHistoryModalProps {
  user: AdminUserUnified | null;
  isOpen: boolean;
  onClose: () => void;
}

type HistoryTab = 'payments' | 'invoices' | 'clients' | 'work' | 'profile';

/**
 * AdminUserHistoryModal: Comprehensive inspection modal displaying all historical
 * records (payment/subscription details, invoices, clients, work items, and profile metadata).
 * Adheres strictly to GEMINI.md: restrained typography, text statuses with dots, no pastel pills.
 */
export default function AdminUserHistoryModal({ user, isOpen, onClose }: AdminUserHistoryModalProps) {
  const [activeTab, setActiveTab] = useState<HistoryTab>('payments');

  // Actively query Firestore for this specific user's subscription, invoices, clients, work items, and profile
  const {
    invoices,
    clients,
    workItems,
    profile,
    subscription,
    invoicesCount,
    totalBilled,
    clientsCount,
    workItemsCount,
    loading,
    error,
  } = useFetchUserHistory(isOpen ? user?.id : null, isOpen ? user?.email : null);

  if (!isOpen || !user) return null;

  const now = Date.now();
  const subData = subscription || {};
  const status = subData.status || user.subscription_status || 'free';
  const cycle = subData.billingCycle || user.billing_cycle || (status === 'trialing' ? 'trial' : 'monthly');
  const expiryDate = subData.accessUntil ? new Date(subData.accessUntil) : user.current_period_end ? new Date(user.current_period_end) : null;
  const isSubActive = (status === 'active' || status === 'trialing') && (!expiryDate || expiryDate.getTime() > now);

  const paymentAmount = subData.lastPaymentAmount ?? user.last_payment_amount ?? (
    status === 'trialing' || cycle === 'trial'
      ? 1
      : cycle === 'yearly'
      ? 899
      : cycle === 'half'
      ? 449
      : cycle === 'quarterly'
      ? 199
      : status === 'active'
      ? 79
      : 0
  );

  const displayUser = {
    name: profile?.name || user.name || 'Anonymous User',
    email: profile?.email || user.email,
    phone: profile?.phone || user.phone,
    upiId: profile?.upiId || user.upi_id,
    professionalTitle: profile?.professionalTitle || user.professional_title,
    bio: profile?.workExperienceBio || profile?.servicesDescription,
    createdAt: profile?.createdAt || user.created_at,
    updatedAt: profile?.updatedAt || user.updated_at,
    photoURL: profile?.photoURL || user.photo_url,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {displayUser.photoURL ? (
              <img
                src={displayUser.photoURL}
                alt={displayUser.name}
                className="w-11 h-11 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold shrink-0">
                {(displayUser.name || displayUser.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold truncate">{displayUser.name}</h3>
                {isSubActive ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    {status === 'trialing' ? '7-Day Trial' : 'Active Pro'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    {status === 'expired' ? 'Expired' : 'Free Account'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{displayUser.email}</p>
              <p className="text-[11px] font-mono text-slate-400 select-all truncate mt-0.5">
                UID: {user.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border-0 cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-4 border-b border-slate-200 dark:border-slate-800 text-center divide-x divide-slate-200 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-xs py-3">
          <div>
            <div className="text-slate-500">Plan & Cycle</div>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5 capitalize truncate px-2">
              {loading ? '…' : cycle === 'trial' ? '7-Day Trial' : `Pro ${cycle}`}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Amount Paid</div>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
              {loading ? '…' : paymentAmount > 0 ? `₹${paymentAmount.toLocaleString('en-IN')}` : 'Free'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Invoices</div>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
              {loading ? '…' : invoicesCount}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Total Billed</div>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
              {loading ? '…' : `₹${totalBilled.toLocaleString()}`}
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 gap-2 pt-2 bg-white dark:bg-slate-900 overflow-x-auto">
          {[
            { id: 'payments' as const, label: 'Payment Details', icon: CreditCard },
            { id: 'invoices' as const, label: `Invoices (${loading ? '…' : invoicesCount})`, icon: FileText },
            { id: 'clients' as const, label: `Clients (${loading ? '…' : clientsCount})`, icon: Users },
            { id: 'work' as const, label: `Work Items (${loading ? '…' : workItemsCount})`, icon: Briefcase },
            { id: 'profile' as const, label: 'Profile Metadata', icon: User },
          ].map((t) => {
            const Icon = t.icon;
            const isSel = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`pb-2.5 px-3 text-xs font-semibold inline-flex items-center gap-1.5 border-0 border-b-2 transition-colors duration-120 cursor-pointer shrink-0 ${
                  isSel
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body Content */}
        <div className="flex-1 overflow-y-auto p-5 text-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 gap-2 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Fetching history and details from Firebase...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          ) : activeTab === 'payments' ? (
            <AdminUserPaymentsTab user={user} subscription={subscription} />
          ) : activeTab === 'invoices' ? (
            <AdminUserInvoicesTab invoices={invoices} />
          ) : activeTab === 'clients' ? (
            <div>
              {clients.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">No clients added yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                        <th className="pb-2">Client Name</th>
                        <th className="pb-2">Company / Phone</th>
                        <th className="pb-2">Email</th>
                        <th className="pb-2">Rate</th>
                        <th className="pb-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {clients.map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 font-semibold text-slate-900 dark:text-slate-100">{c.name}</td>
                          <td className="py-2.5 text-slate-600 dark:text-slate-300">{c.company || c.phone || '—'}</td>
                          <td className="py-2.5 font-mono text-slate-500">{c.email || '—'}</td>
                          <td className="py-2.5 font-semibold">{c.currency || '₹'} {c.rate || 0}</td>
                          <td className="py-2.5 text-right font-medium text-slate-600">{c.isClosed ? 'Closed' : c.status || 'Active'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : activeTab === 'work' ? (
            <div>
              {workItems.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">No work logs recorded yet.</div>
              ) : (
                <div className="space-y-2">
                  {workItems.map((w: any) => (
                    <div
                      key={w.id}
                      className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{w.title}</div>
                        {w.clientEmail && <div className="text-[11px] text-slate-400 mt-0.5">{w.clientEmail}</div>}
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-slate-600 dark:text-slate-300 capitalize">{w.status || 'in progress'}</span>
                        <div className="text-[11px] text-slate-400 mt-0.5">{w.createdAt ? new Date(w.createdAt).toLocaleDateString() : '—'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold uppercase">Phone Number</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">{displayUser.phone || '—'}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold uppercase">UPI ID</span>
                <p className="font-mono text-slate-800 dark:text-slate-200">{displayUser.upiId || '—'}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold uppercase">Professional Title</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">{displayUser.professionalTitle || '—'}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold uppercase">Registered Date</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {displayUser.createdAt ? new Date(displayUser.createdAt).toLocaleString() : '—'}
                </p>
              </div>
              {displayUser.bio && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1 col-span-2">
                  <span className="text-slate-400 font-semibold uppercase">Services & Experience Bio</span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{displayUser.bio}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
