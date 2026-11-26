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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-sm select-none"
      onClick={onClose}
    >
      <div
        className="bg-surface-700 border border-surface-400 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-text-primary"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-surface-400/80 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {displayUser.photoURL ? (
              <img
                src={displayUser.photoURL}
                alt={displayUser.name}
                className="w-11 h-11 rounded-full object-cover shrink-0 border border-[#2A2A33] dark:border-[#2A2A33]"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#131318] dark:bg-[#1B1B22] flex items-center justify-center text-[#A1A1AA] dark:text-[#F7F7F8] font-bold shrink-0">
                {(displayUser.name || displayUser.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold truncate">{displayUser.name}</h3>
                {isSubActive ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF2D4A] dark:text-[#FF2D4A]">
                    <span className="w-2 h-2 rounded-full bg-[#E0002B]" />
                    {status === 'trialing' ? '7-Day Trial' : 'Active Pro'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A1A1AA]">
                    <span className="w-2 h-2 rounded-full bg-[#2A2A33]" />
                    {status === 'expired' ? 'Expired' : 'Free Account'}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#A1A1AA] dark:text-[#A1A1AA] truncate">{displayUser.email}</p>
              <p className="text-[11px] font-mono text-[#A1A1AA] select-all truncate mt-0.5">
                UID: {user.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#A1A1AA] hover:text-[#A1A1AA] dark:hover:text-[#F7F7F8] rounded-lg hover:bg-[#131318] dark:hover:bg-[#1B1B22] border-0 cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-4 border-b border-[#2A2A33] dark:border-[#2A2A33] text-center divide-x divide-[#2A2A33] dark:divide-[#2A2A33] bg-[#131318]/50 dark:bg-[#0B0B0E]/50 text-xs py-3">
          <div>
            <div className="text-[#A1A1AA]">Plan & Cycle</div>
            <div className="font-bold text-[#F7F7F8] dark:text-[#F7F7F8] text-sm mt-0.5 capitalize truncate px-2">
              {loading ? '…' : cycle === 'trial' ? '7-Day Trial' : `Pro ${cycle}`}
            </div>
          </div>
          <div>
            <div className="text-[#A1A1AA]">Amount Paid</div>
            <div className="font-bold text-[#F7F7F8] dark:text-[#F7F7F8] text-sm mt-0.5">
              {loading ? '…' : paymentAmount > 0 ? `₹${paymentAmount.toLocaleString('en-IN')}` : 'Free'}
            </div>
          </div>
          <div>
            <div className="text-[#A1A1AA]">Invoices</div>
            <div className="font-bold text-[#F7F7F8] dark:text-[#F7F7F8] text-sm mt-0.5">
              {loading ? '…' : invoicesCount}
            </div>
          </div>
          <div>
            <div className="text-[#A1A1AA]">Total Billed</div>
            <div className="font-bold text-[#F7F7F8] dark:text-[#F7F7F8] text-sm mt-0.5">
              {loading ? '…' : `₹${totalBilled.toLocaleString()}`}
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-surface-400/80 px-5 gap-2 pt-2 bg-surface-700 overflow-x-auto">
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
                    ? 'border-indigo-600 text-[#FF2D4A] dark:text-[#FF2D4A]'
                    : 'border-transparent text-[#A1A1AA] hover:text-[#F7F7F8] dark:hover:text-[#F7F7F8]'
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
            <div className="flex items-center justify-center py-16 text-[#A1A1AA] gap-2 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-[#FF2D4A]" />
              <span>Fetching history and details from Firebase...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-[#131318] dark:bg-[#0B0B0E] border border-[#2A2A33] dark:border-[#2A2A33] rounded-lg text-xs text-[#E0002B] dark:text-[#F0607A]">
              {error}
            </div>
          ) : activeTab === 'payments' ? (
            <AdminUserPaymentsTab user={user} subscription={subscription} />
          ) : activeTab === 'invoices' ? (
            <AdminUserInvoicesTab invoices={invoices} />
          ) : activeTab === 'clients' ? (
            <div>
              {clients.length === 0 ? (
                <div className="text-center py-12 text-[#A1A1AA] text-xs">No clients added yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#2A2A33] dark:border-[#2A2A33] text-[#A1A1AA] uppercase font-semibold">
                        <th className="pb-2">Client Name</th>
                        <th className="pb-2">Company / Phone</th>
                        <th className="pb-2">Email</th>
                        <th className="pb-2">Rate</th>
                        <th className="pb-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A2A33] dark:divide-[#2A2A33]/60">
                      {clients.map((c: any) => (
                        <tr key={c.id} className="hover:bg-[#131318] dark:hover:bg-[#1B1B22]">
                          <td className="py-2.5 font-semibold text-[#F7F7F8] dark:text-[#F7F7F8]">{c.name}</td>
                          <td className="py-2.5 text-[#A1A1AA] dark:text-[#A1A1AA]">{c.company || c.phone || '—'}</td>
                          <td className="py-2.5 font-mono text-[#A1A1AA]">{c.email || '—'}</td>
                          <td className="py-2.5 font-semibold">{c.currency || '₹'} {c.rate || 0}</td>
                          <td className="py-2.5 text-right font-medium text-[#A1A1AA]">{c.isClosed ? 'Closed' : c.status || 'Active'}</td>
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
                <div className="text-center py-12 text-[#A1A1AA] text-xs">No work logs recorded yet.</div>
              ) : (
                <div className="space-y-2">
                  {workItems.map((w: any) => (
                    <div
                      key={w.id}
                      className="p-3 bg-[#131318] dark:bg-[#0B0B0E] border border-[#2A2A33] dark:border-[#2A2A33] rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-[#F7F7F8] dark:text-[#F7F7F8]">{w.title}</div>
                        {w.clientEmail && <div className="text-[11px] text-[#A1A1AA] mt-0.5">{w.clientEmail}</div>}
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-[#A1A1AA] dark:text-[#A1A1AA] capitalize">{w.status || 'in progress'}</span>
                        <div className="text-[11px] text-[#A1A1AA] mt-0.5">{w.createdAt ? new Date(w.createdAt).toLocaleDateString() : '—'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-[#131318] dark:bg-[#0B0B0E] rounded-lg border border-[#2A2A33] dark:border-[#2A2A33] space-y-1">
                <span className="text-[#A1A1AA] font-semibold uppercase">Phone Number</span>
                <p className="font-medium text-[#F7F7F8] dark:text-[#F7F7F8]">{displayUser.phone || '—'}</p>
              </div>
              <div className="p-3 bg-[#131318] dark:bg-[#0B0B0E] rounded-lg border border-[#2A2A33] dark:border-[#2A2A33] space-y-1">
                <span className="text-[#A1A1AA] font-semibold uppercase">UPI ID</span>
                <p className="font-mono text-[#F7F7F8] dark:text-[#F7F7F8]">{displayUser.upiId || '—'}</p>
              </div>
              <div className="p-3 bg-[#131318] dark:bg-[#0B0B0E] rounded-lg border border-[#2A2A33] dark:border-[#2A2A33] space-y-1">
                <span className="text-[#A1A1AA] font-semibold uppercase">Professional Title</span>
                <p className="font-medium text-[#F7F7F8] dark:text-[#F7F7F8]">{displayUser.professionalTitle || '—'}</p>
              </div>
              <div className="p-3 bg-[#131318] dark:bg-[#0B0B0E] rounded-lg border border-[#2A2A33] dark:border-[#2A2A33] space-y-1">
                <span className="text-[#A1A1AA] font-semibold uppercase">Registered Date</span>
                <p className="font-medium text-[#F7F7F8] dark:text-[#F7F7F8]">
                  {displayUser.createdAt ? new Date(displayUser.createdAt).toLocaleString() : '—'}
                </p>
              </div>
              {displayUser.bio && (
                <div className="p-3 bg-[#131318] dark:bg-[#0B0B0E] rounded-lg border border-[#2A2A33] dark:border-[#2A2A33] space-y-1 col-span-2">
                  <span className="text-[#A1A1AA] font-semibold uppercase">Services & Experience Bio</span>
                  <p className="text-[#A1A1AA] dark:text-[#A1A1AA] leading-relaxed whitespace-pre-wrap">{displayUser.bio}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
