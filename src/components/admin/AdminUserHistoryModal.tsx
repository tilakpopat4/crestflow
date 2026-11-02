import React, { useState } from 'react';
import { X, FileText, Users, Briefcase, User, ExternalLink } from 'lucide-react';
import { AdminUserUnified } from '../../hooks/useAdminUsersAndHistory';

interface AdminUserHistoryModalProps {
  user: AdminUserUnified | null;
  isOpen: boolean;
  onClose: () => void;
}

type HistoryTab = 'invoices' | 'clients' | 'work' | 'profile';

/**
 * AdminUserHistoryModal: Comprehensive inspection modal displaying all historical
 * records (invoices, clients, work items, and profile metadata) for a selected user.
 * Adheres strictly to GEMINI.md: restrained typography, text statuses with dots, no pastel pills.
 */
export default function AdminUserHistoryModal({ user, isOpen, onClose }: AdminUserHistoryModalProps) {
  const [activeTab, setActiveTab] = useState<HistoryTab>('invoices');

  if (!isOpen || !user) return null;

  const now = Date.now();
  const expiryDate = user.current_period_end ? new Date(user.current_period_end) : null;
  const isSubActive =
    user.subscription_status === 'active' && (!expiryDate || expiryDate.getTime() > now);

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
            {user.photo_url ? (
              <img
                src={user.photo_url}
                alt={user.name}
                className="w-11 h-11 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold shrink-0">
                {(user.name || user.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold truncate">{user.name || 'Anonymous User'}</h3>
                {isSubActive ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    Active Pro
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    Free Account
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
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
            <div className="text-slate-500">Invoices</div>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
              {user.invoicesCount}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Total Billed</div>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
              ₹{user.totalBilled.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Clients</div>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
              {user.clientsCount}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Work Logs</div>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
              {user.workItemsCount}
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 gap-2 pt-2 bg-white dark:bg-slate-900">
          {[
            { id: 'invoices' as const, label: `Invoices (${user.invoicesCount})`, icon: FileText },
            { id: 'clients' as const, label: `Clients (${user.clientsCount})`, icon: Users },
            { id: 'work' as const, label: `Work Items (${user.workItemsCount})`, icon: Briefcase },
            { id: 'profile' as const, label: 'Profile Metadata', icon: User },
          ].map((t) => {
            const Icon = t.icon;
            const isSel = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`pb-2.5 px-3 text-xs font-semibold inline-flex items-center gap-1.5 border-0 border-b-2 transition-colors duration-120 cursor-pointer ${
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
          {activeTab === 'invoices' && (
            <div>
              {user.invoices.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">No invoices created yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                        <th className="pb-2">Invoice #</th>
                        <th className="pb-2">Client</th>
                        <th className="pb-2">Amount</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {user.invoices.map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 font-mono text-slate-700 dark:text-slate-300">
                            {inv.invoiceNumber || inv.id.slice(0, 8)}
                          </td>
                          <td className="py-2.5">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {inv.clientName || 'Unnamed'}
                            </div>
                            {inv.clientEmail && (
                              <div className="text-[11px] text-slate-400">{inv.clientEmail}</div>
                            )}
                          </td>
                          <td className="py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                            {inv.currency || '₹'} {Number(inv.totalAmount || 0).toLocaleString()}
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`font-medium ${
                                inv.status === 'paid'
                                  ? 'text-indigo-600 dark:text-indigo-400'
                                  : inv.status === 'overdue'
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {inv.status || 'draft'}
                            </span>
                          </td>
                          <td className="py-2.5 text-right text-slate-400">
                            {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'clients' && (
            <div>
              {user.clients.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">No clients added yet.</div>
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
                      {user.clients.map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                            {c.name}
                          </td>
                          <td className="py-2.5 text-slate-600 dark:text-slate-300">
                            {c.company || c.phone || '—'}
                          </td>
                          <td className="py-2.5 font-mono text-slate-500">{c.email || '—'}</td>
                          <td className="py-2.5 font-semibold">
                            {c.currency || '₹'} {c.rate || 0}
                          </td>
                          <td className="py-2.5 text-right font-medium text-slate-600">
                            {c.isClosed ? 'Closed' : c.status || 'Active'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'work' && (
            <div>
              {user.workItems.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">No work logs recorded yet.</div>
              ) : (
                <div className="space-y-2">
                  {user.workItems.map((w: any) => (
                    <div
                      key={w.id}
                      className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {w.title}
                        </div>
                        {w.clientEmail && (
                          <div className="text-[11px] text-slate-400 mt-0.5">{w.clientEmail}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-slate-600 dark:text-slate-300 capitalize">
                          {w.status || 'in progress'}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {w.createdAt ? new Date(w.createdAt).toLocaleDateString() : '—'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold uppercase">Phone Number</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">{user.phone || '—'}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold uppercase">UPI ID</span>
                <p className="font-mono text-slate-800 dark:text-slate-200">{user.upi_id || '—'}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold uppercase">Professional Title</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {user.professional_title || '—'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold uppercase">Registered Date</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {new Date(user.created_at).toLocaleString()}
                </p>
              </div>
              {user.updated_at && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1 col-span-2">
                  <span className="text-slate-400 font-semibold uppercase">Last Profile Update</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {new Date(user.updated_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
